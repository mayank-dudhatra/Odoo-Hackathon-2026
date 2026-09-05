const { query, withTransaction } = require("../db");
const { AppError, sanitizeUser } = require("../utils/http");
const { hashPassword, verifyPassword, generateTemporaryPassword } = require("../utils/password");
const { generateRandomToken, hashToken } = require("../utils/crypto");
const { signAccessToken, generateRefreshToken } = require("../utils/tokens");
const { env } = require("../config/env");
const { createAuditLog } = require("./audit.service");
const { getRoleByName, getRolePermissions } = require("./rbac.service");
const { sendPasswordResetEmail, sendUserInvitationEmail } = require("./email.service");

function buildPublicUser(row) {
  if (!row) return null;
  return sanitizeUser({
    user_id: row.user_id,
    company_id: row.company_id,
    employee_id: row.employee_id,
    username: row.username,
    email: row.email,
    role_id: row.role_id,
    role_name: row.role_name,
    status: row.status,
    must_change_password: Boolean(row.must_change_password),
    invitation_expires_at: row.invitation_expires_at,
    email_verified_at: row.email_verified_at,
    last_login_at: row.last_login_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    first_name: row.first_name || null,
    last_name: row.last_name || null,
    employee_code: row.employee_code || null,
  });
}

async function setupInitialCompany(payload) {
  return withTransaction(async (client) => {
    let companyId;
    let companyObj;

    const companyCheck = await client.query(
      `SELECT company_id, name, email, timezone, currency_code, created_at
       FROM companies
       WHERE LOWER(name) = LOWER($1) OR (email IS NOT NULL AND LOWER(email) = LOWER($2))
       LIMIT 1`,
      [payload.company_name, payload.company_email || '']
    );

    if (companyCheck.rows.length > 0) {
      companyObj = companyCheck.rows[0];
      companyId = companyObj.company_id;

      const adminRoleCheck = await client.query(
        `SELECT role_id FROM roles WHERE role_name = 'Admin' LIMIT 1`
      );
      if (adminRoleCheck.rows.length > 0) {
        const adminUserCheck = await client.query(
          `SELECT user_id FROM users WHERE company_id = $1 AND role_id = $2 LIMIT 1`,
          [companyId, adminRoleCheck.rows[0].role_id]
        );
        if (adminUserCheck.rows.length > 0) {
          throw new AppError(409, "Initial Admin account already exists for this company", "ADMIN_ALREADY_EXISTS");
        }
      }
    } else {
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
          payload.timezone || 'UTC',
          payload.currency_code || 'USD',
        ]
      );
      companyObj = companyResult.rows[0];
      companyId = companyObj.company_id;
    }

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
          must_change_password,
          email_verified_at
        )
        VALUES ($1, $2, $3, $4, $5, 'ACTIVE', FALSE, NOW())
        RETURNING user_id, company_id, employee_id, username, email, role_id, status, must_change_password, created_at, updated_at
      `,
      [
        companyId,
        payload.admin_username,
        payload.admin_email,
        passwordHash,
        adminRole.role_id,
      ]
    );

    await createAuditLog({
      companyId: companyId,
      userId: userResult.rows[0].user_id,
      module: "AUTH",
      action: "INITIAL_ADMIN_CREATED",
      recordId: userResult.rows[0].user_id,
      details: {
        company_name: companyObj.name,
        admin_username: payload.admin_username,
        admin_email: payload.admin_email,
      },
    });

    return {
      company: companyObj,
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
        u.must_change_password,
        u.invitation_expires_at,
        u.email_verified_at,
        u.last_login_at,
        u.created_at,
        u.updated_at,
        c.is_active AS company_active,
        e.first_name,
        e.last_name,
        e.employee_code
      FROM users u
      JOIN roles r ON r.role_id = u.role_id
      JOIN companies c ON c.company_id = u.company_id
      LEFT JOIN employees e ON e.employee_id = u.employee_id
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
    must_change_password: Boolean(user.must_change_password),
  });

  await createAuditLog({
    companyId: user.company_id,
    userId: user.user_id,
    module: "AUTH",
    action: "LOGIN_SUCCESS",
    recordId: user.user_id,
    details: { session_id: sessionResult.rows[0].session_id },
  });

  const permissions = await getRolePermissions(user.role_id);

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    refresh_expires_at: sessionResult.rows[0].expires_at,
    must_change_password: Boolean(user.must_change_password),
    user: buildPublicUser(user),
    permissions,
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
      SELECT user_id, password_hash, must_change_password
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
    throw new AppError(401, "Invalid current password", "INVALID_CREDENTIALS");
  }

  if (currentPassword === newPassword) {
    throw new AppError(400, "New password must be different from current password", "SAME_PASSWORD");
  }

  const isFirstPasswordChange = Boolean(user.must_change_password);
  const newHash = await hashPassword(newPassword);

  await query(
    `
      UPDATE users
      SET password_hash = $1,
          must_change_password = FALSE,
          updated_at = NOW()
      WHERE user_id = $2
    `,
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
    action: isFirstPasswordChange ? "FIRST_PASSWORD_CHANGED" : "PASSWORD_CHANGED",
    recordId: userId,
  });

  return {
    password_changed: true,
    must_change_password: false,
    message: "Password changed successfully. Please log in again with your new password.",
  };
}

async function createInvitationForUser({ actor, payload }) {
  const role = await getRoleByName(payload.role_name);
  if (!role) {
    throw new AppError(400, "Invalid role", "INVALID_ROLE");
  }

  const duplicateCheck = await query(
    `
      SELECT user_id FROM users
      WHERE company_id = $1 AND (LOWER(username) = LOWER($2) OR LOWER(email) = LOWER($3))
      LIMIT 1
    `,
    [actor.company_id, payload.username, payload.email]
  );

  if (duplicateCheck.rows.length > 0) {
    throw new AppError(409, "User with this username or email already exists for this company", "DUPLICATE_USER");
  }

  const tempPassword = generateTemporaryPassword(12);
  const passwordHash = await hashPassword(tempPassword);

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
        must_change_password,
        email_verified_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        'ACTIVE',
        TRUE,
        NOW()
      )
      RETURNING user_id, company_id, employee_id, username, email, role_id, status, must_change_password, created_at, updated_at
    `,
    [
      actor.company_id,
      payload.employee_id || null,
      payload.username,
      payload.email,
      passwordHash,
      role.role_id,
    ]
  );

  let employeeName = null;
  let employeeCode = null;
  if (payload.employee_id) {
    const empResult = await query(
      `SELECT first_name, last_name, employee_code, email FROM employees WHERE employee_id = $1 AND company_id = $2 LIMIT 1`,
      [payload.employee_id, actor.company_id]
    );
    if (empResult.rows[0]) {
      const emp = empResult.rows[0];
      employeeName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
      employeeCode = emp.employee_code;
    }
  }

  try {
    await sendUserInvitationEmail({
      to: newUser.email,
      userName: employeeName || newUser.username,
      emailOrUsername: newUser.email,
      tempPassword,
      loginUrl: `${env.frontendBaseUrl.replace(/\/$/, "")}/login`,
      companyName,
      employeeCode,
      roleName: role.role_name,
    });
  } catch (err) {
    console.error("[AuthService] Failed to send user invitation email:", err.message);
  }

  await createAuditLog({
    companyId: actor.company_id,
    userId: actor.user_id,
    module: "AUTH",
    action: "USER_CREATED",
    recordId: newUser.user_id,
    details: {
      invited_user_email: payload.email,
      role_name: payload.role_name,
      must_change_password: true,
    },
  });

  await createAuditLog({
    companyId: actor.company_id,
    userId: actor.user_id,
    module: "AUTH",
    action: "INVITATION_SENT",
    recordId: newUser.user_id,
    details: {
      invited_user_email: payload.email,
      role_name: payload.role_name,
    },
  });

  return {
    user: buildPublicUser({
      ...newUser,
      role_name: role.role_name,
    }),
    message: "User created successfully. Invitation email sent with temporary password.",
  };
}

async function resendInvitation({ actor, targetUserId }) {
  const targetResult = await query(
    `
      SELECT u.user_id, u.company_id, u.employee_id, u.username, u.email, u.status, r.role_name,
             e.first_name, e.last_name, e.employee_code
      FROM users u
      JOIN roles r ON r.role_id = u.role_id
      LEFT JOIN employees e ON e.employee_id = u.employee_id
      WHERE u.user_id = $1 AND u.company_id = $2
      LIMIT 1
    `,
    [targetUserId, actor.company_id]
  );

  const targetUser = targetResult.rows[0];
  if (!targetUser) {
    throw new AppError(404, "User not found", "USER_NOT_FOUND");
  }

  if (targetUser.status === "DISABLED") {
    throw new AppError(400, "Cannot resend credentials for disabled user", "USER_DISABLED");
  }

  const tempPassword = generateTemporaryPassword(12);
  const passwordHash = await hashPassword(tempPassword);

  await query(
    `
      UPDATE users
      SET password_hash = $1,
          must_change_password = TRUE,
          updated_at = NOW()
      WHERE user_id = $2 AND company_id = $3
    `,
    [passwordHash, targetUserId, actor.company_id]
  );

  const companyResult = await query(
    `SELECT name FROM companies WHERE company_id = $1 LIMIT 1`,
    [actor.company_id]
  );
  const companyName = companyResult.rows[0]?.name || "PeoplePay360";

  const employeeName = targetUser.first_name
    ? `${targetUser.first_name} ${targetUser.last_name || ''}`.trim()
    : targetUser.username;

  try {
    await sendUserInvitationEmail({
      to: targetUser.email,
      userName: employeeName,
      emailOrUsername: targetUser.email,
      tempPassword,
      loginUrl: `${env.frontendBaseUrl.replace(/\/$/, "")}/login`,
      companyName,
      employeeCode: targetUser.employee_code,
      roleName: targetUser.role_name,
    });
  } catch (err) {
    console.error("[AuthService] Failed to resend invitation email:", err.message);
    throw new AppError(500, `Failed to send credentials email: ${err.message}`, "EMAIL_SEND_FAILED");
  }

  await createAuditLog({
    companyId: actor.company_id,
    userId: actor.user_id,
    module: "AUTH",
    action: "INVITATION_RESENT",
    recordId: targetUserId,
    details: {
      user_email: targetUser.email,
      role_name: targetUser.role_name,
    },
  });

  return {
    user_id: targetUserId,
    message: `Credentials sent successfully to ${targetUser.email}`,
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
        u.updated_at,
        e.first_name,
        e.last_name,
        e.employee_code
      FROM users u
      JOIN roles r ON r.role_id = u.role_id
      LEFT JOIN employees e ON e.employee_id = u.employee_id
      WHERE u.user_id = $1 AND u.company_id = $2
      LIMIT 1
    `,
    [userId, companyId]
  );

  const user = buildPublicUser(result.rows[0] || null);
  if (!user) return null;

  const permissions = await getRolePermissions(user.role_id);
  return {
    user,
    permissions,
  };
}

async function requestPasswordReset({ email }) {
  const genericResponse = {
    message: "If an account with that email exists, a password reset link has been sent.",
  };

  if (!email) {
    return genericResponse;
  }

  const result = await query(
    `
      SELECT user_id, company_id, username, email, status
      FROM users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
    `,
    [email.trim()]
  );

  const user = result.rows[0];

  if (!user || user.status === "DISABLED") {
    return genericResponse;
  }

  const resetToken = generateRandomToken(64);
  const resetTokenHash = hashToken(resetToken);

  await query(
    `
      UPDATE users
      SET password_reset_token_hash = $1,
          password_reset_expires_at = NOW() + ($2::int * INTERVAL '1 minute'),
          updated_at = NOW()
      WHERE user_id = $3
    `,
    [resetTokenHash, env.passwordResetTtlMinutes, user.user_id]
  );

  const resetUrl = `${env.passwordResetUrl.replace(/\/$/, "")}?token=${resetToken}`;

  try {
    await sendPasswordResetEmail({
      to: user.email,
      resetUrl,
      userName: user.username,
    });
  } catch (err) {
    console.error("[AuthService] Failed to send password reset email:", err.message);
  }

  await createAuditLog({
    companyId: user.company_id,
    userId: user.user_id,
    module: "AUTH",
    action: "FORGOT_PASSWORD_REQUESTED",
    recordId: user.user_id,
    details: { email_domain: user.email.split("@")[1] || null },
  });

  return genericResponse;
}

async function resetPassword({ token, newPassword }) {
  const tokenHash = hashToken(token);

  const result = await query(
    `
      SELECT user_id, company_id, username, email, status, password_reset_expires_at
      FROM users
      WHERE password_reset_token_hash = $1
      LIMIT 1
    `,
    [tokenHash]
  );

  const user = result.rows[0];

  if (!user) {
    throw new AppError(400, "Invalid or expired password reset token", "INVALID_RESET_TOKEN");
  }

  if (user.status === "DISABLED") {
    throw new AppError(403, "Account disabled", "ACCOUNT_DISABLED");
  }

  if (!user.password_reset_expires_at || new Date(user.password_reset_expires_at) <= new Date()) {
    throw new AppError(400, "Password reset token has expired", "RESET_TOKEN_EXPIRED");
  }

  const newHash = await hashPassword(newPassword);

  await query(
    `
      UPDATE users
      SET password_hash = $1,
          password_reset_token_hash = NULL,
          password_reset_expires_at = NULL,
          must_change_password = FALSE,
          updated_at = NOW()
      WHERE user_id = $2
    `,
    [newHash, user.user_id]
  );

  // Invalidate all active sessions for this user
  await query(
    `
      UPDATE user_sessions
      SET revoked_at = NOW(), updated_at = NOW()
      WHERE user_id = $1 AND revoked_at IS NULL
    `,
    [user.user_id]
  );

  await createAuditLog({
    companyId: user.company_id,
    userId: user.user_id,
    module: "AUTH",
    action: "PASSWORD_RESET_COMPLETED",
    recordId: user.user_id,
  });

  return { password_reset: true };
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
  requestPasswordReset,
  resetPassword,
};

