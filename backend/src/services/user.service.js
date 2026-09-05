const { query } = require("../db");
const { AppError, sanitizeUser } = require("../utils/http");
const { createAuditLog } = require("./audit.service");
const { getRoleByName } = require("./rbac.service");

async function ensureEmployeeBelongsToCompany(companyId, employeeId) {
  if (!employeeId) {
    return;
  }

  const result = await query(
    `SELECT employee_id FROM employees WHERE employee_id = $1 AND company_id = $2 LIMIT 1`,
    [employeeId, companyId]
  );

  if (!result.rows[0]) {
    throw new AppError(400, "Invalid employee mapping", "INVALID_EMPLOYEE");
  }
}

function sanitizeUserRow(row) {
  return sanitizeUser(row);
}

async function listCompanyUsers(companyId) {
  const result = await query(
    `
      SELECT
        u.user_id,
        u.company_id,
        u.employee_id,
        e.employee_code,
        e.first_name,
        e.last_name,
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
      LEFT JOIN employees e ON e.employee_id = u.employee_id
      WHERE u.company_id = $1
      ORDER BY u.created_at DESC
    `,
    [companyId]
  );

  return result.rows.map(sanitizeUserRow);
}

async function getCompanyUserById(companyId, userId) {
  const result = await query(
    `
      SELECT
        u.user_id,
        u.company_id,
        u.employee_id,
        e.employee_code,
        e.first_name,
        e.last_name,
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
      LEFT JOIN employees e ON e.employee_id = u.employee_id
      WHERE u.company_id = $1 AND u.user_id = $2
      LIMIT 1
    `,
    [companyId, userId]
  );

  return sanitizeUserRow(result.rows[0] || null);
}

async function setUserStatus({ actor, userId, status }) {
  if (!["ACTIVE", "DISABLED"].includes(status)) {
    throw new AppError(400, "Invalid status transition", "INVALID_STATUS");
  }

  if (actor.user_id === userId && status === "DISABLED") {
    throw new AppError(400, "Cannot disable your own account", "SELF_DISABLE_BLOCKED");
  }

  const result = await query(
    `
      UPDATE users
      SET status = $1,
          updated_at = NOW()
      WHERE user_id = $2 AND company_id = $3
      RETURNING user_id, company_id, employee_id, username, email, role_id, status, invitation_expires_at, email_verified_at, last_login_at, created_at, updated_at
    `,
    [status, userId, actor.company_id]
  );

  if (!result.rows[0]) {
    throw new AppError(404, "User not found", "USER_NOT_FOUND");
  }

  if (status === "DISABLED") {
    await query(
      `
        UPDATE user_sessions
        SET revoked_at = NOW(), updated_at = NOW()
        WHERE user_id = $1 AND revoked_at IS NULL
      `,
      [userId]
    );
  }

  await createAuditLog({
    companyId: actor.company_id,
    userId: actor.user_id,
    module: "USERS",
    action: status === "ACTIVE" ? "ENABLE" : "DISABLE",
    recordId: userId,
    details: { status },
  });

  const roleResult = await query(`SELECT role_name FROM roles WHERE role_id = $1`, [result.rows[0].role_id]);

  return sanitizeUserRow({
    ...result.rows[0],
    role_name: roleResult.rows[0]?.role_name || null,
  });
}

async function changeUserRole({ actor, userId, roleName }) {
  const role = await getRoleByName(roleName);
  if (!role) {
    throw new AppError(400, "Invalid role", "INVALID_ROLE");
  }

  const currentResult = await query(
    `
      SELECT u.user_id, u.company_id, u.role_id, r.role_name
      FROM users u
      JOIN roles r ON r.role_id = u.role_id
      WHERE u.user_id = $1 AND u.company_id = $2
      LIMIT 1
    `,
    [userId, actor.company_id]
  );

  const current = currentResult.rows[0];
  if (!current) {
    throw new AppError(404, "User not found", "USER_NOT_FOUND");
  }

  const updateResult = await query(
    `
      UPDATE users
      SET role_id = $1,
          updated_at = NOW()
      WHERE user_id = $2 AND company_id = $3
      RETURNING user_id, company_id, employee_id, username, email, role_id, status, invitation_expires_at, email_verified_at, last_login_at, created_at, updated_at
    `,
    [role.role_id, userId, actor.company_id]
  );

  await createAuditLog({
    companyId: actor.company_id,
    userId: actor.user_id,
    module: "USERS",
    action: "ROLE_CHANGED",
    recordId: userId,
    details: {
      previous_role: current.role_name,
      new_role: role.role_name,
    },
  });

  return sanitizeUserRow({
    ...updateResult.rows[0],
    role_name: role.role_name,
  });
}

async function relinkUserEmployee({ actor, userId, employeeId }) {
  await ensureEmployeeBelongsToCompany(actor.company_id, employeeId);

  const result = await query(
    `
      UPDATE users
      SET employee_id = $1,
          updated_at = NOW()
      WHERE user_id = $2 AND company_id = $3
      RETURNING user_id, company_id, employee_id, username, email, role_id, status, invitation_expires_at, email_verified_at, last_login_at, created_at, updated_at
    `,
    [employeeId || null, userId, actor.company_id]
  );

  if (!result.rows[0]) {
    throw new AppError(404, "User not found", "USER_NOT_FOUND");
  }

  await createAuditLog({
    companyId: actor.company_id,
    userId: actor.user_id,
    module: "USERS",
    action: "EMPLOYEE_LINK_CHANGED",
    recordId: userId,
    details: { employee_id: employeeId || null },
  });

  const roleResult = await query(`SELECT role_name FROM roles WHERE role_id = $1`, [result.rows[0].role_id]);

  return sanitizeUserRow({
    ...result.rows[0],
    role_name: roleResult.rows[0]?.role_name || null,
  });
}

module.exports = {
  ensureEmployeeBelongsToCompany,
  listCompanyUsers,
  getCompanyUserById,
  setUserStatus,
  changeUserRole,
  relinkUserEmployee,
};
