const { query: defaultQuery } = require("../db");

async function createLeaveType(executor = defaultQuery, {
  company_id,
  name,
  unit = "DAYS",
  requires_allocation = true,
  is_paid = true,
  default_days_year = 0,
  approval_required = true,
  payroll_integration = true,
  is_active = true,
}) {
  const db = executor.query ? executor : defaultQuery;
  const result = await db.query(
    `
      INSERT INTO leave_types (
        company_id,
        name,
        unit,
        requires_allocation,
        is_paid,
        default_days_year,
        approval_required,
        payroll_integration,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `,
    [
      company_id,
      name,
      unit,
      requires_allocation,
      is_paid,
      default_days_year,
      approval_required,
      payroll_integration,
      is_active,
    ]
  );
  return result.rows[0];
}

async function findLeaveTypeById(executor = defaultQuery, companyId, leaveTypeId) {
  const db = executor.query ? executor : defaultQuery;
  const result = await db.query(
    `
      SELECT *
      FROM leave_types
      WHERE company_id = $1 AND leave_type_id = $2
      LIMIT 1
    `,
    [companyId, leaveTypeId]
  );
  return result.rows[0] || null;
}

async function findLeaveTypeByName(executor = defaultQuery, companyId, name) {
  const db = executor.query ? executor : defaultQuery;
  const result = await db.query(
    `
      SELECT *
      FROM leave_types
      WHERE company_id = $1 AND LOWER(name) = LOWER($2)
      LIMIT 1
    `,
    [companyId, name]
  );
  return result.rows[0] || null;
}

async function listLeaveTypes(executor = defaultQuery, companyId, { is_active = null } = {}) {
  const db = executor.query ? executor : defaultQuery;
  const params = [companyId];
  let sql = `SELECT * FROM leave_types WHERE company_id = $1`;

  if (is_active !== null && is_active !== undefined) {
    params.push(Boolean(is_active));
    sql += ` AND is_active = $${params.length}`;
  }

  sql += ` ORDER BY name ASC`;
  const result = await db.query(sql, params);
  return result.rows;
}

async function updateLeaveType(executor = defaultQuery, companyId, leaveTypeId, fields) {
  const db = executor.query ? executor : defaultQuery;
  const allowed = [
    "name",
    "unit",
    "requires_allocation",
    "is_paid",
    "default_days_year",
    "approval_required",
    "payroll_integration",
    "is_active",
  ];

  const setClauses = [];
  const params = [companyId, leaveTypeId];

  for (const [key, value] of Object.entries(fields)) {
    if (allowed.includes(key) && value !== undefined) {
      params.push(value);
      setClauses.push(`${key} = $${params.length}`);
    }
  }

  if (setClauses.length === 0) {
    return findLeaveTypeById(executor, companyId, leaveTypeId);
  }

  setClauses.push(`updated_at = NOW()`);

  const sql = `
    UPDATE leave_types
    SET ${setClauses.join(", ")}
    WHERE company_id = $1 AND leave_type_id = $2
    RETURNING *
  `;

  const result = await db.query(sql, params);
  return result.rows[0] || null;
}

async function deactivateLeaveType(executor = defaultQuery, companyId, leaveTypeId) {
  const db = executor.query ? executor : defaultQuery;
  const result = await db.query(
    `
      UPDATE leave_types
      SET is_active = FALSE, updated_at = NOW()
      WHERE company_id = $1 AND leave_type_id = $2
      RETURNING *
    `,
    [companyId, leaveTypeId]
  );
  return result.rows[0] || null;
}

module.exports = {
  createLeaveType,
  findLeaveTypeById,
  findLeaveTypeByName,
  listLeaveTypes,
  updateLeaveType,
  deactivateLeaveType,
};
