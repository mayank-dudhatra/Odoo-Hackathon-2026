const { query } = require("../db");

/**
 * Repository providing optimized database queries for management reporting APIs.
 */

function buildPaginationClause(pagination = {}) {
  const page = Math.max(1, Number(pagination.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(pagination.limit) || 20));
  const offset = (page - 1) * limit;
  return { limit, offset, sql: ` LIMIT ${limit} OFFSET ${offset}` };
}

async function getEmployeeReport(companyId, filters = {}, pagination = {}) {
  const where = ["e.company_id = $1"];
  const params = [companyId];

  if (filters.department_id) {
    params.push(filters.department_id);
    where.push(`e.department_id = $${params.length}`);
  }

  if (filters.employee_type_id) {
    params.push(filters.employee_type_id);
    where.push(`e.employee_type_id = $${params.length}`);
  }

  if (filters.status) {
    params.push(filters.status);
    where.push(`e.status = $${params.length}`);
  }

  const countRes = await query(
    `SELECT COUNT(*)::int AS total FROM employees e WHERE ${where.join(" AND ")}`,
    params
  );

  const pag = buildPaginationClause(pagination);

  const dataRes = await query(
    `
      SELECT
        e.employee_id,
        e.employee_code,
        CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
        e.email,
        e.phone,
        e.hire_date,
        e.status,
        d.name AS department_name,
        p.title AS position_name,
        et.name AS employee_type_name,
        c.wage AS current_wage,
        c.wage_type AS current_wage_type,
        c.status AS contract_status
      FROM employees e
      LEFT JOIN departments d ON d.department_id = e.department_id
      LEFT JOIN positions p ON p.position_id = e.position_id
      LEFT JOIN employee_types et ON et.employee_type_id = e.employee_type_id
      LEFT JOIN contracts c ON c.employee_id = e.employee_id AND c.status = 'ACTIVE'
      WHERE ${where.join(" AND ")}
      ORDER BY e.employee_code ASC
      ${pag.sql}
    `,
    params
  );

  return {
    total: countRes.rows[0].total,
    page: Math.max(1, Number(pagination.page) || 1),
    limit: pag.limit,
    data: dataRes.rows,
  };
}

async function getPayrollReport(companyId, filters = {}, pagination = {}) {
  const where = ["pr.company_id = $1"];
  const params = [companyId];

  if (filters.status) {
    params.push(filters.status);
    where.push(`pr.status = $${params.length}`);
  }

  if (filters.start_date) {
    params.push(filters.start_date);
    where.push(`pr.period_start >= $${params.length}`);
  }

  if (filters.end_date) {
    params.push(filters.end_date);
    where.push(`pr.period_end <= $${params.length}`);
  }

  const countRes = await query(
    `SELECT COUNT(*)::int AS total FROM payruns pr WHERE ${where.join(" AND ")}`,
    params
  );

  const pag = buildPaginationClause(pagination);

  const dataRes = await query(
    `
      SELECT
        pr.payrun_id,
        pr.name AS payrun_name,
        pr.period_start,
        pr.period_end,
        pr.status,
        ss.name AS salary_structure_name,
        (SELECT COUNT(*)::int FROM payslips p WHERE p.payrun_id = pr.payrun_id) AS total_payslips,
        (SELECT COALESCE(SUM(p.gross_pay), 0)::numeric FROM payslips p WHERE p.payrun_id = pr.payrun_id) AS total_gross,
        (SELECT COALESCE(SUM(p.total_deductions), 0)::numeric FROM payslips p WHERE p.payrun_id = pr.payrun_id) AS total_deductions,
        (SELECT COALESCE(SUM(p.net_pay), 0)::numeric FROM payslips p WHERE p.payrun_id = pr.payrun_id) AS total_net,
        pr.created_at,
        pr.validated_at,
        pr.paid_at
      FROM payruns pr
      JOIN salary_structures ss ON ss.salary_structure_id = pr.salary_structure_id
      WHERE ${where.join(" AND ")}
      ORDER BY pr.period_start DESC, pr.created_at DESC
      ${pag.sql}
    `,
    params
  );

  return {
    total: countRes.rows[0].total,
    page: Math.max(1, Number(pagination.page) || 1),
    limit: pag.limit,
    data: dataRes.rows,
  };
}

async function getSalaryCostReport(companyId, filters = {}) {
  const deptCost = await query(
    `
      SELECT
        d.department_id,
        d.name AS department_name,
        COUNT(DISTINCT p.employee_id)::int AS employee_count,
        COALESCE(SUM(p.gross_pay), 0)::numeric AS gross_salary,
        COALESCE(SUM(p.total_deductions), 0)::numeric AS deductions,
        COALESCE(SUM(p.net_pay), 0)::numeric AS net_salary
      FROM departments d
      LEFT JOIN employees e ON e.department_id = d.department_id AND e.company_id = $1
      LEFT JOIN payslips p ON p.employee_id = e.employee_id AND p.status IN ('PAID', 'VALIDATED', 'GENERATED', 'SENT')
      WHERE d.company_id = $1
      GROUP BY d.department_id, d.name
      ORDER BY net_salary DESC, d.name ASC
    `,
    [companyId]
  );

  const typeCost = await query(
    `
      SELECT
        et.employee_type_id,
        et.name AS type_name,
        COUNT(DISTINCT p.employee_id)::int AS employee_count,
        COALESCE(SUM(p.gross_pay), 0)::numeric AS gross_salary,
        COALESCE(SUM(p.total_deductions), 0)::numeric AS deductions,
        COALESCE(SUM(p.net_pay), 0)::numeric AS net_salary
      FROM employee_types et
      LEFT JOIN employees e ON e.employee_type_id = et.employee_type_id AND e.company_id = $1
      LEFT JOIN payslips p ON p.employee_id = e.employee_id AND p.status IN ('PAID', 'VALIDATED', 'GENERATED', 'SENT')
      WHERE et.company_id = $1
      GROUP BY et.employee_type_id, et.name
      ORDER BY net_salary DESC, et.name ASC
    `,
    [companyId]
  );

  return {
    by_department: deptCost.rows,
    by_employee_type: typeCost.rows,
  };
}

async function getAttendanceReport(companyId, filters = {}, pagination = {}) {
  const where = ["a.company_id = $1"];
  const params = [companyId];

  if (filters.start_date) {
    params.push(filters.start_date);
    where.push(`a.work_date >= $${params.length}`);
  }

  if (filters.end_date) {
    params.push(filters.end_date);
    where.push(`a.work_date <= $${params.length}`);
  }

  if (filters.department_id) {
    params.push(filters.department_id);
    where.push(`e.department_id = $${params.length}`);
  }

  if (filters.employee_id) {
    params.push(filters.employee_id);
    where.push(`a.employee_id = $${params.length}`);
  }

  if (filters.status) {
    params.push(filters.status);
    where.push(`a.status = $${params.length}`);
  }

  const countRes = await query(
    `SELECT COUNT(*)::int AS total FROM attendance a JOIN employees e ON e.employee_id = a.employee_id WHERE ${where.join(" AND ")}`,
    params
  );

  const pag = buildPaginationClause(pagination);

  const dataRes = await query(
    `
      SELECT
        a.attendance_id,
        a.work_date,
        a.employee_id,
        e.employee_code,
        CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
        d.name AS department_name,
        a.check_in,
        a.check_out,
        a.hours_worked,
        a.status,
        a.late_minutes,
        a.early_leave_minutes,
        a.late_status,
        a.deduction_type,
        a.deduction_days
      FROM attendance a
      JOIN employees e ON e.employee_id = a.employee_id
      LEFT JOIN departments d ON d.department_id = e.department_id
      WHERE ${where.join(" AND ")}
      ORDER BY a.work_date DESC, e.employee_code ASC
      ${pag.sql}
    `,
    params
  );

  return {
    total: countRes.rows[0].total,
    page: Math.max(1, Number(pagination.page) || 1),
    limit: pag.limit,
    data: dataRes.rows,
  };
}

async function getLeaveReport(companyId, filters = {}, pagination = {}) {
  const where = ["lr.company_id = $1"];
  const params = [companyId];

  if (filters.start_date) {
    params.push(filters.start_date);
    where.push(`lr.start_date >= $${params.length}`);
  }

  if (filters.end_date) {
    params.push(filters.end_date);
    where.push(`lr.end_date <= $${params.length}`);
  }

  if (filters.department_id) {
    params.push(filters.department_id);
    where.push(`e.department_id = $${params.length}`);
  }

  if (filters.status) {
    params.push(filters.status);
    where.push(`lr.status = $${params.length}`);
  }

  const countRes = await query(
    `SELECT COUNT(*)::int AS total FROM leave_requests lr JOIN employees e ON e.employee_id = lr.employee_id WHERE ${where.join(" AND ")}`,
    params
  );

  const pag = buildPaginationClause(pagination);

  const dataRes = await query(
    `
      SELECT
        lr.leave_request_id,
        lr.employee_id,
        e.employee_code,
        CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
        d.name AS department_name,
        lt.name AS leave_type_name,
        lt.is_paid,
        lr.start_date,
        lr.end_date,
        lr.days_requested,
        lr.reason,
        lr.status,
        lr.created_at
      FROM leave_requests lr
      JOIN employees e ON e.employee_id = lr.employee_id
      JOIN leave_types lt ON lt.leave_type_id = lr.leave_type_id
      LEFT JOIN departments d ON d.department_id = e.department_id
      WHERE ${where.join(" AND ")}
      ORDER BY lr.start_date DESC, lr.created_at DESC
      ${pag.sql}
    `,
    params
  );

  return {
    total: countRes.rows[0].total,
    page: Math.max(1, Number(pagination.page) || 1),
    limit: pag.limit,
    data: dataRes.rows,
  };
}

async function getPayslipReport(companyId, filters = {}, pagination = {}) {
  const where = ["p.company_id = $1"];
  const params = [companyId];

  if (filters.payrun_id) {
    params.push(filters.payrun_id);
    where.push(`p.payrun_id = $${params.length}`);
  }

  if (filters.employee_id) {
    params.push(filters.employee_id);
    where.push(`p.employee_id = $${params.length}`);
  }

  if (filters.status) {
    params.push(filters.status);
    where.push(`p.status = $${params.length}`);
  }

  if (filters.email_status) {
    params.push(filters.email_status);
    where.push(`p.email_status = $${params.length}`);
  }

  const countRes = await query(
    `SELECT COUNT(*)::int AS total FROM payslips p WHERE ${where.join(" AND ")}`,
    params
  );

  const pag = buildPaginationClause(pagination);

  const dataRes = await query(
    `
      SELECT
        p.payslip_id,
        p.payrun_id,
        pr.name AS payrun_name,
        p.employee_id,
        p.employee_code_snapshot,
        p.employee_name_snapshot,
        p.structure_name_snapshot,
        p.period_start,
        p.period_end,
        p.worked_days,
        p.gross_pay,
        p.total_deductions,
        p.net_pay,
        p.status,
        p.email_status,
        p.email_sent_at,
        p.pdf_file_path IS NOT NULL AS has_pdf
      FROM payslips p
      JOIN payruns pr ON pr.payrun_id = p.payrun_id
      WHERE ${where.join(" AND ")}
      ORDER BY p.period_start DESC, p.employee_code_snapshot ASC
      ${pag.sql}
    `,
    params
  );

  return {
    total: countRes.rows[0].total,
    page: Math.max(1, Number(pagination.page) || 1),
    limit: pag.limit,
    data: dataRes.rows,
  };
}

module.exports = {
  getEmployeeReport,
  getPayrollReport,
  getSalaryCostReport,
  getAttendanceReport,
  getLeaveReport,
  getPayslipReport,
};
