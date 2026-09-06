const { query } = require("../db");
const { AppError, sanitizeUser } = require("../utils/http");
const { createAuditLog } = require("./audit.service");
const { getRoleByName, getRolePermissions } = require("./rbac.service");

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

async function listCompanyUsers(companyId, filters = {}) {
  const where = ["u.company_id = $1"];
  const values = [companyId];
  let index = 2;

  if (filters.search && filters.search.trim()) {
    const s = `%${filters.search.trim()}%`;
    where.push(`(
      u.username ILIKE $${index} OR
      u.email ILIKE $${index} OR
      e.employee_code ILIKE $${index} OR
      e.first_name ILIKE $${index} OR
      e.last_name ILIKE $${index} OR
      CONCAT(e.first_name, ' ', e.last_name) ILIKE $${index}
    )`);
    values.push(s);
    index += 1;
  }

  if (filters.role_id) {
    where.push(`u.role_id = $${index}`);
    values.push(filters.role_id);
    index += 1;
  }

  if (filters.status) {
    where.push(`u.status = $${index}`);
    values.push(filters.status);
    index += 1;
  }

  if (filters.is_verified !== undefined && filters.is_verified !== "") {
    const isVerified = String(filters.is_verified) === "true";
    if (isVerified) {
      where.push(`u.email_verified_at IS NOT NULL`);
    } else {
      where.push(`u.email_verified_at IS NULL`);
    }
  }

  if (filters.is_linked !== undefined && filters.is_linked !== "") {
    const isLinked = String(filters.is_linked) === "true";
    if (isLinked) {
      where.push(`u.employee_id IS NOT NULL`);
    } else {
      where.push(`u.employee_id IS NULL`);
    }
  }

  const result = await query(
    `
      SELECT
        u.user_id,
        u.company_id,
        u.employee_id,
        e.employee_code,
        e.first_name,
        e.last_name,
        CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
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
      WHERE ${where.join(" AND ")}
      ORDER BY u.created_at DESC
    `,
    values
  );

  return result.rows.map(sanitizeUserRow);
}

async function getCompanyUsersSummary(companyId) {
  const result = await query(
    `
      SELECT
        COUNT(*)::int AS total_users,
        COUNT(*) FILTER (WHERE status = 'ACTIVE')::int AS active_users,
        COUNT(*) FILTER (WHERE status = 'INVITED')::int AS invited_users,
        COUNT(*) FILTER (WHERE status = 'DISABLED')::int AS disabled_users
      FROM users
      WHERE company_id = $1
    `,
    [companyId]
  );

  return result.rows[0] || {
    total_users: 0,
    active_users: 0,
    invited_users: 0,
    disabled_users: 0,
  };
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
        CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
        d.name AS department_name,
        p.title AS position_name,
        et.name AS employee_type_name,
        e.status AS employee_status,
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
      LEFT JOIN departments d ON d.department_id = e.department_id
      LEFT JOIN positions p ON p.position_id = e.position_id
      LEFT JOIN employee_types et ON et.employee_type_id = e.employee_type_id
      WHERE u.company_id = $1 AND u.user_id = $2
      LIMIT 1
    `,
    [companyId, userId]
  );

  const user = sanitizeUserRow(result.rows[0] || null);
  if (user && user.role_id) {
    user.permissions = await getRolePermissions(user.role_id);
  }
  return user;
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

  await query(`UPDATE employees SET user_id = NULL, updated_at = NOW() WHERE user_id = $1 AND company_id = $2`, [userId, actor.company_id]);

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

  if (employeeId) {
    await query(`UPDATE employees SET user_id = $1, updated_at = NOW() WHERE employee_id = $2 AND company_id = $3`, [userId, employeeId, actor.company_id]);
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
  getCompanyUsersSummary,
  getCompanyUserById,
  setUserStatus,
  changeUserRole,
  relinkUserEmployee,
};
