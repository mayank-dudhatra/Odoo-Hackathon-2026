const { query: defaultQuery } = require("../db");

async function createLeaveRequest(executor = defaultQuery, {
  company_id,
  employee_id,
  leave_type_id,
  start_date,
  end_date,
  days_requested,
  reason = null,
  status = "PENDING",
}) {
  const db = executor.query ? executor : defaultQuery;
  const result = await db.query(
    `
      INSERT INTO leave_requests (
        company_id,
        employee_id,
        leave_type_id,
        start_date,
        end_date,
        days_requested,
        reason,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `,
    [
      company_id,
      employee_id,
      leave_type_id,
      start_date,
      end_date,
      days_requested,
      reason,
      status,
    ]
  );
  return result.rows[0];
}

async function findLeaveRequestById(executor = defaultQuery, companyId, requestId) {
  const db = executor.query ? executor : defaultQuery;
  const result = await db.query(
    `
      SELECT
        lr.*,
        lt.name AS leave_type_name,
        lt.unit AS leave_type_unit,
        lt.requires_allocation,
        lt.is_paid,
        lt.payroll_integration,
        e.employee_code,
        (e.first_name || ' ' || e.last_name) AS employee_name,
        (u.username) AS approved_by_username
      FROM leave_requests lr
      JOIN leave_types lt ON lt.leave_type_id = lr.leave_type_id
      JOIN employees e ON e.employee_id = lr.employee_id
      LEFT JOIN users u ON u.user_id = lr.approved_by
      WHERE lr.company_id = $1 AND lr.leave_request_id = $2
      LIMIT 1
    `,
    [companyId, requestId]
  );
  return result.rows[0] || null;
}

async function findLeaveRequestForUpdate(executor, companyId, requestId) {
  const db = executor.query ? executor : defaultQuery;
  const result = await db.query(
    `
      SELECT
        lr.*,
        lt.name AS leave_type_name,
        lt.unit AS leave_type_unit,
        lt.requires_allocation,
        lt.is_paid,
        lt.payroll_integration
      FROM leave_requests lr
      JOIN leave_types lt ON lt.leave_type_id = lr.leave_type_id
      WHERE lr.company_id = $1 AND lr.leave_request_id = $2
      FOR UPDATE OF lr
    `,
    [companyId, requestId]
  );
  return result.rows[0] || null;
}

async function listLeaveRequests(executor = defaultQuery, companyId, {
  employee_id = null,
  leave_type_id = null,
  status = null,
  start_date = null,
  end_date = null,
} = {}) {
  const db = executor.query ? executor : defaultQuery;
  const params = [companyId];
  let sql = `
    SELECT
      lr.*,
      lt.name AS leave_type_name,
      lt.unit AS leave_type_unit,
      lt.requires_allocation,
      lt.is_paid,
      lt.payroll_integration,
      e.employee_code,
      (e.first_name || ' ' || e.last_name) AS employee_name
    FROM leave_requests lr
    JOIN leave_types lt ON lt.leave_type_id = lr.leave_type_id
    JOIN employees e ON e.employee_id = lr.employee_id
    WHERE lr.company_id = $1
  `;

  if (employee_id) {
    params.push(employee_id);
    sql += ` AND lr.employee_id = $${params.length}`;
  }

  if (leave_type_id) {
    params.push(leave_type_id);
    sql += ` AND lr.leave_type_id = $${params.length}`;
  }

  if (status) {
    params.push(status);
    sql += ` AND lr.status = $${params.length}`;
  }

  if (start_date) {
    params.push(start_date);
    sql += ` AND lr.end_date >= $${params.length}`;
  }

  if (end_date) {
    params.push(end_date);
    sql += ` AND lr.start_date <= $${params.length}`;
  }

  sql += ` ORDER BY lr.start_date DESC, lr.created_at DESC`;
  const result = await db.query(sql, params);
  return result.rows;
}

async function updateLeaveRequestStatus(executor = defaultQuery, companyId, requestId, status, approvedBy = null) {
  const db = executor.query ? executor : defaultQuery;
  const result = await db.query(
    `
      UPDATE leave_requests
      SET status = $1,
          approved_by = $2,
          approved_at = CASE WHEN $1 IN ('APPROVED', 'REFUSED') THEN NOW() ELSE approved_at END,
          updated_at = NOW()
      WHERE company_id = $3 AND leave_request_id = $4
      RETURNING *
    `,
    [status, approvedBy, companyId, requestId]
  );
  return result.rows[0] || null;
}

async function checkOverlappingLeaveRequest(executor = defaultQuery, companyId, employeeId, startDate, endDate, excludeRequestId = null) {
  const db = executor.query ? executor : defaultQuery;
  const params = [companyId, employeeId, startDate, endDate];
  let sql = `
    SELECT leave_request_id
    FROM leave_requests
    WHERE company_id = $1
      AND employee_id = $2
      AND status IN ('PENDING', 'APPROVED')
      AND daterange(start_date, end_date, '[]') && daterange($3::date, $4::date, '[]')
  `;

  if (excludeRequestId) {
    params.push(excludeRequestId);
    sql += ` AND leave_request_id <> $${params.length}`;
  }

  sql += ` LIMIT 1`;
  const result = await db.query(sql, params);
  return result.rows.length > 0;
}

async function getApprovedLeavesForPayroll(executor = defaultQuery, companyId, periodStart, periodEnd, employeeId = null) {
  const db = executor.query ? executor : defaultQuery;
  const params = [companyId, periodStart, periodEnd];
  let sql = `
    SELECT
      lr.leave_request_id,
      lr.company_id,
      lr.employee_id,
      e.employee_code,
      (e.first_name || ' ' || e.last_name) AS employee_name,
      lr.leave_type_id,
      lt.name AS leave_type_name,
      lt.unit AS leave_type_unit,
      lt.is_paid,
      lt.payroll_integration,
      lr.start_date,
      lr.end_date,
      lr.days_requested,
      lr.status
    FROM leave_requests lr
    JOIN leave_types lt ON lt.leave_type_id = lr.leave_type_id
    JOIN employees e ON e.employee_id = lr.employee_id
    WHERE lr.company_id = $1
      AND lr.status = 'APPROVED'
      AND lr.end_date >= $2::date
      AND lr.start_date <= $3::date
  `;

  if (employeeId) {
    params.push(employeeId);
    sql += ` AND lr.employee_id = $${params.length}`;
  }

  sql += ` ORDER BY e.employee_code ASC, lr.start_date ASC`;
  const result = await db.query(sql, params);
  return result.rows;
}

module.exports = {
  createLeaveRequest,
  findLeaveRequestById,
  findLeaveRequestForUpdate,
  listLeaveRequests,
  updateLeaveRequestStatus,
  checkOverlappingLeaveRequest,
  getApprovedLeavesForPayroll,
};
