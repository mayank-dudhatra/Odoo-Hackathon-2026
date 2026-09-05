const { query, withTransaction } = require("../db");
const { AppError, sanitizeUser } = require("../utils/http");
const { hashPassword, verifyPassword } = require("../utils/password");
const { generateRandomToken, hashToken } = require("../utils/crypto");
const { signAccessToken, generateRefreshToken } = require("../utils/tokens");
const { env } = require("../config/env");
const { createAuditLog } = require("./audit.service");
const { getRoleByName } = require("./rbac.service");

function buildPublicUser(row) {
  return sanitizeUser({
    user_id: row.user_id,
    company_id: row.company_id,
    employee_id: row.employee_id,
    username: row.username,
    email: row.email,
    role_id: row.role_id,
    role_name: row.role_name,
    status: row.status,
    invitation_expires_at: row.invitation_expires_at,
    email_verified_at: row.email_verified_at,
    last_login_at: row.last_login_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });
}

async function setupInitialCompany(payload) {
  return withTransaction(async (client) => {
    const existingCompanyCount = await client.query(
      `SELECT COUNT(*)::int AS count FROM companies`
    );

    if (existingCompanyCount.rows[0].count > 0) {
      throw new AppError(409, "Initial setup already completed", "SETUP_ALREADY_DONE");
    }

    const companyResult = await client.query(
      `
        INSERT INTO companies (name, email, phone, address, timezone, currency_code, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, TRUE)
        RETURNING company_id, name, email, timezone, currency_code, created_at
      `,
      [
        payload.company_name,
        payload.company_email || null,
        payload.company_phone || null,
        payload.company_address || null,
        payload.timezone,
        payload.currency_code,
      ]
    );

    const adminRole = await getRoleByName("Admin");
    if (!adminRole) {
      throw new AppError(500, "Admin role not found", "ROLE_NOT_FOUND");
    }

    const passwordHash = await hashPassword(payload.password);

    const userResult = await client.query(
      `
        INSERT INTO users (
          company_id,
          username,
          email,
          password_hash,
          role_id,
          status,
          email_verified_at
        )
        VALUES ($1, $2, $3, $4, $5, 'ACTIVE', NOW())
        RETURNING user_id, company_id, employee_id, username, email, role_id, status, created_at, updated_at
      `,
      [
        companyResult.rows[0].company_id,
        payload.admin_username,
        payload.admin_email,
        passwordHash,
        adminRole.role_id,
      ]
    );

    await createAuditLog({
      companyId: companyResult.rows[0].company_id,
      userId: userResult.rows[0].user_id,
      module: "AUTH",
      action: "INITIAL_SETUP",
      recordId: userResult.rows[0].user_id,
      details: {
        company_name: companyResult.rows[0].name,
        admin_username: payload.admin_username,
      },
    });

    return {
      company: companyResult.rows[0],
      admin: buildPublicUser({
        ...userResult.rows[0],
        role_name: "Admin",
      }),
    };
  });
}

async function login({ identifier, password, ipAddress, userAgent }) {
  const result = await query(
    `
      SELECT
        u.user_id,
        u.company_id,
        u.employee_id,
        u.username,
        u.email,
        u.password_hash,
        u.role_id,
        r.role_name,
        u.status,
        u.invitation_expires_at,
        u.email_verified_at,
        u.last_login_at,
        u.created_at,
        u.updated_at,
        c.is_active AS company_active
      FROM users u
      JOIN roles r ON r.role_id = u.role_id
      JOIN companies c ON c.company_id = u.company_id
      WHERE LOWER(u.username) = LOWER($1) OR LOWER(u.email) = LOWER($1)
      LIMIT 1
    `,
    [identifier]
  );

  const user = result.rows[0];

  if (!user || !user.password_hash) {
    await createAuditLog({
      module: "AUTH",
      action: "LOGIN_FAILED",
      details: { identifier, reason: "invalid_credentials" },
    });
    throw new AppError(401, "Invalid credentials", "INVALID_CREDENTIALS");
  }

  const validPassword = await verifyPassword(password, user.password_hash);
  if (!validPassword) {
    await createAuditLog({
      companyId: user.company_id,
      userId: user.user_id,
      module: "AUTH",
      action: "LOGIN_FAILED",
      details: { identifier, reason: "invalid_credentials" },
    });
    throw new AppError(401, "Invalid credentials", "INVALID_CREDENTIALS");
  }

  if (!user.company_active) {
    throw new AppError(403, "Account unavailable", "COMPANY_INACTIVE");
  }

  if (user.status === "INVITED") {
    throw new AppError(403, "Account not activated", "ACCOUNT_NOT_ACTIVATED");
  }

  if (user.status === "DISABLED") {
    throw new AppError(403, "Account disabled", "ACCOUNT_DISABLED");
  }

  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);

  const sessionResult = await query(
    `
      INSERT INTO user_sessions (
        user_id,
        company_id,
        refresh_token_hash,
        user_agent,
        ip_address,
        expires_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        NOW() + ($6::int * INTERVAL '1 day')
      )
      RETURNING session_id, expires_at
    `,
    [
      user.user_id,
      user.company_id,
      refreshTokenHash,
      userAgent || null,
      ipAddress || null,
      env.refreshTokenTtlDays,
    ]
  );

  await query(
    `UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE user_id = $1`,
    [user.user_id]
  );

  const accessToken = signAccessToken({
    sub: user.user_id,
    company_id: user.company_id,
    role_id: user.role_id,
    role_name: user.role_name,
    sid: sessionResult.rows[0].session_id,
  });

  await createAuditLog({
    companyId: user.company_id,
    userId: user.user_id,
    module: "AUTH",
    action: "LOGIN_SUCCESS",
    recordId: user.user_id,
    details: { session_id: sessionResult.rows[0].session_id },
  });

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    refresh_expires_at: sessionResult.rows[0].expires_at,
    user: buildPublicUser(user),
  };
}

async function refreshSession({ refreshToken, ipAddress, userAgent }) {
  const refreshTokenHash = hashToken(refreshToken);

  const sessionResult = await query(
    `
      SELECT
        s.session_id,
        s.user_id,
        s.company_id,
        s.expires_at,
        s.revoked_at,
        u.role_id,
        r.role_name,
        u.status
      FROM user_sessions s
      JOIN users u ON u.user_id = s.user_id
      JOIN roles r ON r.role_id = u.role_id
      WHERE s.refresh_token_hash = $1
      LIMIT 1
    `,
    [refreshTokenHash]
  );

  const session = sessionResult.rows[0];

  if (!session || session.revoked_at || new Date(session.expires_at) <= new Date()) {
    throw new AppError(401, "Invalid session", "INVALID_SESSION");
  }

  if (session.status !== "ACTIVE") {
    throw new AppError(403, "Account unavailable", "ACCOUNT_NOT_ACTIVE");
  }

  const newRefreshToken = generateRefreshToken();
  const newRefreshTokenHash = hashToken(newRefreshToken);

  await query(
    `
      UPDATE user_sessions
      SET refresh_token_hash = $1,
          user_agent = $2,
          ip_address = $3,
          expires_at = NOW() + ($4::int * INTERVAL '1 day'),
          updated_at = NOW()
      WHERE session_id = $5
    `,
    [
      newRefreshTokenHash,
      userAgent || null,
      ipAddress || null,
      env.refreshTokenTtlDays,
      session.session_id,
    ]
  );

  const accessToken = signAccessToken({
    sub: session.user_id,
    company_id: session.company_id,
    role_id: session.role_id,
    role_name: session.role_name,
    sid: session.session_id,
  });

  return {
    access_token: accessToken,
    refresh_token: newRefreshToken,
  };
}

async function logout({ userId, sessionId, refreshToken = null }) {
  if (refreshToken) {
    await query(
      `
        UPDATE user_sessions
        SET revoked_at = NOW(), updated_at = NOW()
        WHERE user_id = $1
          AND refresh_token_hash = $2
          AND revoked_at IS NULL
      `,
      [userId, hashToken(refreshToken)]
    );
  } else if (sessionId) {
    await query(
      `
        UPDATE user_sessions
        SET revoked_at = NOW(), updated_at = NOW()
        WHERE user_id = $1
          AND session_id = $2
          AND revoked_at IS NULL
      `,
      [userId, sessionId]
    );
  }

  await createAuditLog({
    userId,
    module: "AUTH",
    action: "LOGOUT",
    details: { session_id: sessionId || null },
  });
}

async function logoutAllSessions({ userId, companyId }) {
  await query(
    `
      UPDATE user_sessions
      SET revoked_at = NOW(), updated_at = NOW()
      WHERE user_id = $1
        AND company_id = $2
        AND revoked_at IS NULL
    `,
    [userId, companyId]
  );

  await createAuditLog({
    companyId,
    userId,
    module: "AUTH",
    action: "LOGOUT_ALL",
  });
}

async function activateInvitation({ token, password }) {
  const invitationTokenHash = hashToken(token);

  const userResult = await query(
    `
      SELECT user_id, company_id, role_id, status, invitation_expires_at
      FROM users
      WHERE invitation_token_hash = $1
      LIMIT 1
    `,
    [invitationTokenHash]
  );

  const user = userResult.rows[0];

  if (!user) {
    throw new AppError(400, "Invalid invitation token", "INVALID_INVITATION");
  }

  if (user.status !== "INVITED") {
    throw new AppError(400, "Invitation is no longer valid", "INVITATION_NOT_ACTIVE");
  }

  if (!user.invitation_expires_at || new Date(user.invitation_expires_at) <= new Date()) {
    throw new AppError(400, "Invitation expired", "INVITATION_EXPIRED");
  }

  const passwordHash = await hashPassword(password);

  await query(
    `
      UPDATE users
      SET password_hash = $1,
          status = 'ACTIVE',
          invitation_token_hash = NULL,
          invitation_expires_at = NULL,
          email_verified_at = NOW(),
          updated_at = NOW()
      WHERE user_id = $2
    `,
    [passwordHash, user.user_id]
  );

  await createAuditLog({
    companyId: user.company_id,
    userId: user.user_id,
    module: "AUTH",
    action: "INVITATION_ACCEPTED",
    recordId: user.user_id,
  });
}

async function changePassword({ userId, companyId, currentPassword, newPassword }) {
  const result = await query(
    `
      SELECT user_id, password_hash
      FROM users
      WHERE user_id = $1 AND company_id = $2
      LIMIT 1
    `,
    [userId, companyId]
  );

  const user = result.rows[0];

  if (!user || !user.password_hash) {
    throw new AppError(404, "User not found", "USER_NOT_FOUND");
  }

  const isMatch = await verifyPassword(currentPassword, user.password_hash);
  if (!isMatch) {
    throw new AppError(401, "Invalid credentials", "INVALID_CREDENTIALS");
  }

  const newHash = await hashPassword(newPassword);
  await query(
    `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE user_id = $2`,
    [newHash, userId]
  );

  await query(
    `
      UPDATE user_sessions
      SET revoked_at = NOW(), updated_at = NOW()
      WHERE user_id = $1 AND revoked_at IS NULL
    `,
    [userId]
  );

  await createAuditLog({
    companyId,
    userId,
    module: "AUTH",
    action: "PASSWORD_CHANGED",
    recordId: userId,
  });
}

async function createInvitationForUser({ actor, payload }) {
  const role = await getRoleByName(payload.role_name);
  if (!role) {
    throw new AppError(400, "Invalid role", "INVALID_ROLE");
  }

  const invitationToken = generateRandomToken(64);
  const invitationTokenHash = hashToken(invitationToken);

  const result = await query(
    `
      INSERT INTO users (
        company_id,
        employee_id,
        username,
        email,
        password_hash,
        role_id,
        status,
        invitation_token_hash,
        invitation_expires_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        NULL,
        $5,
        'INVITED',
        $6,
        NOW() + ($7::int * INTERVAL '1 hour')
      )
      RETURNING user_id, company_id, employee_id, username, email, role_id, status, invitation_expires_at, created_at, updated_at
    `,
    [
      actor.company_id,
      payload.employee_id || null,
      payload.username,
      payload.email,
      role.role_id,
      invitationTokenHash,
      env.invitationTtlHours,
    ]
  );

  await createAuditLog({
    companyId: actor.company_id,
    userId: actor.user_id,
    module: "AUTH",
    action: "INVITATION_SENT",
    recordId: result.rows[0].user_id,
    details: {
      invited_user_email: payload.email,
      role_name: payload.role_name,
    },
  });

  return {
    user: buildPublicUser({
      ...result.rows[0],
      role_name: role.role_name,
    }),
    invitation: {
      expires_at: result.rows[0].invitation_expires_at,
      activation_token: env.nodeEnv === "production" ? undefined : invitationToken,
      activation_url:
        env.nodeEnv === "production"
          ? undefined
          : `${env.frontendBaseUrl.replace(/\/$/, "")}/activate?token=${invitationToken}`,
    },
  };
}

async function resendInvitation({ actor, targetUserId }) {
  const targetResult = await query(
    `
      SELECT u.user_id, u.company_id, u.username, u.email, u.status, r.role_name
      FROM users u
      JOIN roles r ON r.role_id = u.role_id
      WHERE u.user_id = $1 AND u.company_id = $2
      LIMIT 1
    `,
    [targetUserId, actor.company_id]
  );

  const targetUser = targetResult.rows[0];
  if (!targetUser) {
    throw new AppError(404, "User not found", "USER_NOT_FOUND");
  }

  if (targetUser.status !== "INVITED") {
    throw new AppError(400, "User is not in invited state", "USER_NOT_INVITED");
  }

  const invitationToken = generateRandomToken(64);
  const invitationTokenHash = hashToken(invitationToken);

  const updateResult = await query(
    `
      UPDATE users
      SET invitation_token_hash = $1,
          invitation_expires_at = NOW() + ($2::int * INTERVAL '1 hour'),
          updated_at = NOW()
      WHERE user_id = $3
      RETURNING invitation_expires_at
    `,
    [invitationTokenHash, env.invitationTtlHours, targetUserId]
  );

  await createAuditLog({
    companyId: actor.company_id,
    userId: actor.user_id,
    module: "AUTH",
    action: "INVITATION_RESENT",
    recordId: targetUserId,
  });

  return {
    user_id: targetUserId,
    status: "INVITED",
    invitation_expires_at: updateResult.rows[0].invitation_expires_at,
    activation_token: env.nodeEnv === "production" ? undefined : invitationToken,
    activation_url:
      env.nodeEnv === "production"
        ? undefined
        : `${env.frontendBaseUrl.replace(/\/$/, "")}/activate?token=${invitationToken}`,
  };
}

async function getCurrentUserProfile(userId, companyId) {
  const result = await query(
    `
      SELECT
        u.user_id,
        u.company_id,
        u.employee_id,
        u.username,
        u.email,
        u.role_id,
        r.role_name,
        u.status,
        u.invitation_expires_at,
        u.email_verified_at,
        u.last_login_at,
        u.created_at,
        u.updated_at
      FROM users u
      JOIN roles r ON r.role_id = u.role_id
      WHERE u.user_id = $1 AND u.company_id = $2
      LIMIT 1
    `,
    [userId, companyId]
  );

  return buildPublicUser(result.rows[0] || null);
}

module.exports = {
  setupInitialCompany,
  login,
  refreshSession,
  logout,
  logoutAllSessions,
  activateInvitation,
  changePassword,
  createInvitationForUser,
  resendInvitation,
  getCurrentUserProfile,
};
