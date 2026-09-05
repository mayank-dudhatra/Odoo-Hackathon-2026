const { query: defaultQuery } = require("../db");

function getDb(executor) {
  return (executor && executor.query) ? executor : defaultQuery;
}

async function createAllocation(executor = defaultQuery, {
  company_id,
  employee_id,
  leave_type_id,
  year,
  allocated_days,
  valid_from = null,
  valid_to = null,
  status = "APPROVED",
  approved_by = null,
}) {
  const db = getDb(executor);
  const result = await db.query(
    `
      INSERT INTO leave_allocations (
        company_id,
        employee_id,
        leave_type_id,
        year,
        allocated_days,
        used_days,
        valid_from,
        valid_to,
        status,
        approved_by,
        approved_at
      )
      VALUES ($1, $2, $3, $4, $5, 0, $6, $7, $8, $9, CASE WHEN $8 = 'APPROVED' THEN NOW() ELSE NULL END)
      RETURNING *
    `,
    [
      company_id,
      employee_id,
      leave_type_id,
      year,
      allocated_days,
      valid_from,
      valid_to,
      status,
      approved_by,
    ]
  );
  return result.rows[0];
}

async function findAllocationById(executor = defaultQuery, companyId, allocationId) {
  const db = getDb(executor);
  const result = await db.query(
    `
      SELECT
        la.*,
        lt.name AS leave_type_name,
        lt.unit AS leave_type_unit,
        lt.requires_allocation,
        lt.is_paid,
        lt.payroll_integration,
        e.employee_code,
        (e.first_name || ' ' || e.last_name) AS employee_name
      FROM leave_allocations la
      JOIN leave_types lt ON lt.leave_type_id = la.leave_type_id
      JOIN employees e ON e.employee_id = la.employee_id
      WHERE la.company_id = $1 AND la.allocation_id = $2
      LIMIT 1
    `,
    [companyId, allocationId]
  );
  return result.rows[0] || null;
}

async function findAllocationForUpdate(executor, companyId, allocationId) {
  const db = getDb(executor);
  const result = await db.query(
    `
      SELECT *
      FROM leave_allocations
      WHERE company_id = $1 AND allocation_id = $2
      FOR UPDATE
    `,
    [companyId, allocationId]
  );
  return result.rows[0] || null;
}

async function findActiveAllocation(executor = defaultQuery, companyId, employeeId, leaveTypeId, year) {
  const db = getDb(executor);
  const result = await db.query(
    `
      SELECT *
      FROM leave_allocations
      WHERE company_id = $1
        AND employee_id = $2
        AND leave_type_id = $3
        AND year = $4
        AND status = 'APPROVED'
      LIMIT 1
    `,
    [companyId, employeeId, leaveTypeId, year]
  );
  return result.rows[0] || null;
}

async function listAllocations(executor = defaultQuery, companyId, {
  employee_id = null,
  leave_type_id = null,
  year = null,
  status = null,
} = {}) {
  const db = getDb(executor);
  const params = [companyId];
  let sql = `
    SELECT
      la.*,
      lt.name AS leave_type_name,
      lt.unit AS leave_type_unit,
      lt.requires_allocation,
      lt.is_paid,
      lt.payroll_integration,
      e.employee_code,
      (e.first_name || ' ' || e.last_name) AS employee_name
    FROM leave_allocations la
    JOIN leave_types lt ON lt.leave_type_id = la.leave_type_id
    JOIN employees e ON e.employee_id = la.employee_id
    WHERE la.company_id = $1
  `;

  if (employee_id) {
    params.push(employee_id);
    sql += ` AND la.employee_id = $${params.length}`;
  }

  if (leave_type_id) {
    params.push(leave_type_id);
    sql += ` AND la.leave_type_id = $${params.length}`;
  }

  if (year) {
    params.push(year);
    sql += ` AND la.year = $${params.length}`;
  }

  if (status) {
    params.push(status);
    sql += ` AND la.status = $${params.length}`;
  }

  sql += ` ORDER BY la.year DESC, e.last_name ASC, lt.name ASC`;
  const result = await db.query(sql, params);
  return result.rows;
}

async function updateAllocationUsedDays(executor, allocationId, deltaDays) {
  const db = getDb(executor);
  const result = await db.query(
    `
      UPDATE leave_allocations
      SET used_days = used_days + $1,
          updated_at = NOW()
      WHERE allocation_id = $2
      RETURNING *
    `,
    [deltaDays, allocationId]
  );
  return result.rows[0] || null;
}

async function updateAllocationStatus(executor = defaultQuery, companyId, allocationId, status, approvedBy = null) {
  const db = getDb(executor);
  const result = await db.query(
    `
      UPDATE leave_allocations
      SET status = $1::varchar,
          approved_by = $2,
          approved_at = CASE WHEN $1::varchar = 'APPROVED' THEN NOW() ELSE approved_at END,
          updated_at = NOW()
      WHERE company_id = $3 AND allocation_id = $4
      RETURNING *
    `,
    [status, approvedBy, companyId, allocationId]
  );
  return result.rows[0] || null;
}

module.exports = {
  createAllocation,
  findAllocationById,
  findAllocationForUpdate,
  findActiveAllocation,
  listAllocations,
  updateAllocationUsedDays,
  updateAllocationStatus,
};
