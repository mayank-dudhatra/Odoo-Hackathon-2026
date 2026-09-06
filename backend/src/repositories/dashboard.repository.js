const { query } = require("../db");

/**
 * Repository for Management HR & Payroll Dashboard analytics using aggregated SQL.
 */

async function getPayrollDashboardMetrics(companyId, filters = {}) {
  const where = ["p.company_id = $1"];
  const params = [companyId];

  if (filters.status) {
    params.push(filters.status);
    where.push(`p.status = $${params.length}`);
  } else {
    where.push(`p.status IN ('PAID', 'VALIDATED', 'GENERATED', 'SENT', 'COMPUTED')`);
  }

  if (filters.start_date) {
    params.push(filters.start_date);
    where.push(`p.period_start >= $${params.length}`);
  }

  if (filters.end_date) {
    params.push(filters.end_date);
    where.push(`p.period_end <= $${params.length}`);
  }

  if (filters.department_id) {
    params.push(filters.department_id);
    where.push(`e.department_id = $${params.length}`);
  }

  if (filters.employee_type_id) {
    params.push(filters.employee_type_id);
    where.push(`e.employee_type_id = $${params.length}`);
  }

  if (filters.employee_id) {
    params.push(filters.employee_id);
    where.push(`p.employee_id = $${params.length}`);
  }

  const result = await query(
    `
      SELECT
        COALESCE(SUM(p.net_pay), 0)::numeric AS total_net_paid,
        COALESCE(SUM(p.gross_pay), 0)::numeric AS total_gross,
        COALESCE(SUM(p.total_deductions), 0)::numeric AS total_deductions,
        COALESCE(SUM(
          (SELECT COALESCE(SUM(pl.amount), 0)
           FROM payslip_lines pl
           WHERE pl.payslip_id = p.payslip_id AND pl.category IN ('TAX', 'CONTRIBUTION'))
        ), 0)::numeric AS total_tax_contributions,
        COUNT(p.payslip_id)::int AS payslips_generated,
        COUNT(DISTINCT p.employee_id)::int AS payroll_employee_count
      FROM payslips p
      JOIN employees e ON e.employee_id = p.employee_id
      WHERE ${where.join(" AND ")}
    `,
    params
  );

  return result.rows[0];
}

async function getHrDashboardMetrics(companyId, filters = {}) {
  const empWhere = ["e.company_id = $1"];
  const empParams = [companyId];

  if (filters.department_id) {
    empParams.push(filters.department_id);
    empWhere.push(`e.department_id = $${empParams.length}`);
  }

  if (filters.employee_type_id) {
    empParams.push(filters.employee_type_id);
    empWhere.push(`e.employee_type_id = $${empParams.length}`);
  }

  const [totalsResult, deptResult, typeResult] = await Promise.all([
    query(
      `
        SELECT
          COUNT(e.employee_id)::int AS total_employees,
          COUNT(CASE WHEN e.status = 'ACTIVE' THEN 1 END)::int AS active_employees,
          COUNT(CASE WHEN e.status IN ('INACTIVE', 'TERMINATED') THEN 1 END)::int AS inactive_employees,
          COALESCE(AVG(
            (SELECT c.wage FROM contracts c WHERE c.company_id = e.company_id AND c.employee_id = e.employee_id AND c.status = 'ACTIVE' ORDER BY c.start_date DESC LIMIT 1)
          ), 0)::numeric AS average_salary
        FROM employees e
        WHERE ${empWhere.join(" AND ")}
      `,
      empParams
    ),
    // Employees by Department
    query(
      `
        SELECT
          d.department_id,
          d.name AS department_name,
          COUNT(e.employee_id)::int AS employee_count
        FROM departments d
        LEFT JOIN employees e ON e.department_id = d.department_id AND e.company_id = $1
        WHERE d.company_id = $1
        GROUP BY d.department_id, d.name
        ORDER BY employee_count DESC, d.name ASC
      `,
      [companyId]
    ),
    // Employees by Employee Type
    query(
      `
        SELECT
          et.employee_type_id,
          et.name AS type_name,
          COUNT(e.employee_id)::int AS employee_count
        FROM employee_types et
        LEFT JOIN employees e ON e.employee_type_id = et.employee_type_id AND e.company_id = $1
        WHERE et.company_id = $1
        GROUP BY et.employee_type_id, et.name
        ORDER BY employee_count DESC, et.name ASC
      `,
      [companyId]
    ),
  ]);

  return {
    ...totalsResult.rows[0],
    employees_by_department: deptResult.rows,
    employees_by_type: typeResult.rows,
  };
}

async function getTimeDashboardMetrics(companyId, filters = {}) {
  // 1. Leave Metrics
  const leaveWhere = ["lr.company_id = $1", "lr.status = 'APPROVED'"];
  const leaveParams = [companyId];

  if (filters.start_date) {
    leaveParams.push(filters.start_date);
    leaveWhere.push(`lr.start_date >= $${leaveParams.length}`);
  }

  if (filters.end_date) {
    leaveParams.push(filters.end_date);
    leaveWhere.push(`lr.end_date <= $${leaveParams.length}`);
  }

  if (filters.department_id) {
    leaveParams.push(filters.department_id);
    leaveWhere.push(`e.department_id = $${leaveParams.length}`);
  }

  // 2. Attendance Health Metrics
  const attWhere = ["a.company_id = $1"];
  const attParams = [companyId];

  if (filters.start_date) {
    attParams.push(filters.start_date);
    attWhere.push(`a.work_date >= $${attParams.length}`);
  }

  if (filters.end_date) {
    attParams.push(filters.end_date);
    attWhere.push(`a.work_date <= $${attParams.length}`);
  }

  if (filters.department_id) {
    attParams.push(filters.department_id);
    attWhere.push(`e.department_id = $${attParams.length}`);
  }

  const [leaveResult, attResult] = await Promise.all([
    query(
      `
        SELECT
          COUNT(lr.leave_request_id)::int AS approved_time_off_count,
          COALESCE(SUM(lr.days_requested), 0)::numeric AS total_approved_days,
          COALESCE(SUM(CASE WHEN lt.is_paid THEN lr.days_requested ELSE 0 END), 0)::numeric AS paid_leave_days,
          COALESCE(SUM(CASE WHEN NOT lt.is_paid THEN lr.days_requested ELSE 0 END), 0)::numeric AS unpaid_leave_days
        FROM leave_requests lr
        JOIN leave_types lt ON lt.leave_type_id = lr.leave_type_id
        JOIN employees e ON e.employee_id = lr.employee_id
        WHERE ${leaveWhere.join(" AND ")}
      `,
      leaveParams
    ),
    query(
      `
        SELECT
          COUNT(a.attendance_id)::int AS total_attendance_records,
          COUNT(CASE WHEN a.status = 'PRESENT' THEN 1 END)::int AS present_count,
          COUNT(CASE WHEN a.late_status = 'BEYOND_GRACE' THEN 1 END)::int AS late_count,
          COUNT(CASE WHEN a.early_leave_minutes > 0 THEN 1 END)::int AS early_leave_count,
          COUNT(CASE WHEN a.deduction_type <> 'NONE' THEN 1 END)::int AS attendance_deduction_count
        FROM attendance a
        JOIN employees e ON e.employee_id = a.employee_id
        WHERE ${attWhere.join(" AND ")}
      `,
      attParams
    ),
  ]);

  return {
    time_off: leaveResult.rows[0],
    attendance_health: attResult.rows[0],
  };
}

async function getCostDashboardMetrics(companyId, filters = {}) {
  const [deptCost, typeCost, monthlyTrend] = await Promise.all([
    // Salary cost by department
    query(
      `
        SELECT
          d.department_id,
          d.name AS department_name,
          COUNT(DISTINCT p.employee_id)::int AS employee_count,
          COALESCE(SUM(p.gross_pay), 0)::numeric AS total_gross,
          COALESCE(SUM(p.total_deductions), 0)::numeric AS total_deductions,
          COALESCE(SUM(p.net_pay), 0)::numeric AS total_net
        FROM departments d
        LEFT JOIN employees e ON e.department_id = d.department_id AND e.company_id = $1
        LEFT JOIN payslips p ON p.employee_id = e.employee_id AND p.status IN ('PAID', 'VALIDATED', 'GENERATED', 'SENT', 'COMPUTED')
        WHERE d.company_id = $1
        GROUP BY d.department_id, d.name
        ORDER BY total_net DESC, d.name ASC
      `,
      [companyId]
    ),
    // Salary cost by employee type
    query(
      `
        SELECT
          et.employee_type_id,
          et.name AS type_name,
          COUNT(DISTINCT p.employee_id)::int AS employee_count,
          COALESCE(SUM(p.gross_pay), 0)::numeric AS total_gross,
          COALESCE(SUM(p.total_deductions), 0)::numeric AS total_deductions,
          COALESCE(SUM(p.net_pay), 0)::numeric AS total_net
        FROM employee_types et
        LEFT JOIN employees e ON e.employee_type_id = et.employee_type_id AND e.company_id = $1
        LEFT JOIN payslips p ON p.employee_id = e.employee_id AND p.status IN ('PAID', 'VALIDATED', 'GENERATED', 'SENT', 'COMPUTED')
        WHERE et.company_id = $1
        GROUP BY et.employee_type_id, et.name
        ORDER BY total_net DESC, et.name ASC
      `,
      [companyId]
    ),
    // Monthly Net Salary Trend
    query(
      `
        SELECT
          TO_CHAR(p.period_start, 'YYYY-MM') AS month,
          COALESCE(SUM(p.net_pay), 0)::numeric AS total_net,
          COALESCE(SUM(p.gross_pay), 0)::numeric AS total_gross
        FROM payslips p
        WHERE p.company_id = $1 AND p.status IN ('PAID', 'VALIDATED', 'GENERATED', 'SENT', 'COMPUTED')
        GROUP BY TO_CHAR(p.period_start, 'YYYY-MM')
        ORDER BY month ASC
        LIMIT 12
      `,
      [companyId]
    ),
  ]);

  return {
    salary_cost_by_department: deptCost.rows,
    salary_cost_by_employee_type: typeCost.rows,
    monthly_net_salary_trend: monthlyTrend.rows,
  };
}

module.exports = {
  getPayrollDashboardMetrics,
  getHrDashboardMetrics,
  getTimeDashboardMetrics,
  getCostDashboardMetrics,
};
