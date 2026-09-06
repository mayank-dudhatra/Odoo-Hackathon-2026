const { query } = require("../db");

/**
 * Repository to detect missing data, contract attention, and duplicate payslips.
 */

async function getMissingDataWarnings(companyId) {
  const [noContractRes, noStructureRes, missingInfoRes, noScheduleRes] = await Promise.all([
    // Employees without active contract
    query(
      `
        SELECT e.employee_id, e.employee_code, CONCAT(e.first_name, ' ', e.last_name) AS employee_name
        FROM employees e
        WHERE e.company_id = $1 AND e.status = 'ACTIVE'
          AND NOT EXISTS (
            SELECT 1 FROM contracts c WHERE c.employee_id = e.employee_id AND c.status = 'ACTIVE'
          )
        ORDER BY e.employee_code ASC
      `,
      [companyId]
    ),
    // Employees without salary structure assigned via active contract
    query(
      `
        SELECT e.employee_id, e.employee_code, CONCAT(e.first_name, ' ', e.last_name) AS employee_name
        FROM employees e
        JOIN contracts c ON c.employee_id = e.employee_id AND c.status = 'ACTIVE'
        WHERE e.company_id = $1 AND e.status = 'ACTIVE'
          AND (c.salary_structure_id IS NULL)
        ORDER BY e.employee_code ASC
      `,
      [companyId]
    ),
    // Employees missing department, position, or email
    query(
      `
        SELECT e.employee_id, e.employee_code, CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
          ARRAY_REMOVE(ARRAY[
            CASE WHEN e.email IS NULL THEN 'email' END,
            CASE WHEN e.department_id IS NULL THEN 'department' END,
            CASE WHEN e.position_id IS NULL THEN 'position' END
          ], NULL) AS missing_fields
        FROM employees e
        WHERE e.company_id = $1 AND e.status = 'ACTIVE'
          AND (e.email IS NULL OR e.department_id IS NULL OR e.position_id IS NULL)
        ORDER BY e.employee_code ASC
      `,
      [companyId]
    ),
    // Employees without working schedule
    query(
      `
        SELECT e.employee_id, e.employee_code, CONCAT(e.first_name, ' ', e.last_name) AS employee_name
        FROM employees e
        WHERE e.company_id = $1 AND e.status = 'ACTIVE'
          AND e.schedule_id IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM contracts c WHERE c.employee_id = e.employee_id AND c.status = 'ACTIVE' AND c.schedule_id IS NOT NULL
          )
        ORDER BY e.employee_code ASC
      `,
      [companyId]
    ),
  ]);

  return {
    missing_contract: noContractRes.rows,
    missing_salary_structure: noStructureRes.rows,
    missing_employee_information: missingInfoRes.rows,
    missing_working_schedule: noScheduleRes.rows,
  };
}

async function getDuplicatePayslipWarnings(companyId) {
  const duplicatesRes = await query(
    `
      SELECT p.payrun_id, pr.name AS payrun_name, p.employee_id, p.employee_code_snapshot, COUNT(*)::int AS payslip_count
      FROM payslips p
      JOIN payruns pr ON pr.payrun_id = p.payrun_id
      WHERE p.company_id = $1
      GROUP BY p.payrun_id, pr.name, p.employee_id, p.employee_code_snapshot
      HAVING COUNT(*) > 1
      ORDER BY pr.name ASC
    `,
    [companyId]
  );

  return duplicatesRes.rows;
}

async function getContractAttentionWarnings(companyId) {
  const [expiringSoonRes, expiredActiveRes] = await Promise.all([
    // Contracts expiring within 30 days
    query(
      `
        SELECT c.contract_id, c.employee_id, CONCAT(e.first_name, ' ', e.last_name) AS employee_name, e.employee_code, c.start_date, c.end_date, c.wage
        FROM contracts c
        JOIN employees e ON e.employee_id = c.employee_id
        WHERE c.company_id = $1 AND c.status = 'ACTIVE'
          AND c.end_date IS NOT NULL
          AND c.end_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '30 days')
        ORDER BY c.end_date ASC
      `,
      [companyId]
    ),
    // Contracts expired but still marked ACTIVE
    query(
      `
        SELECT c.contract_id, c.employee_id, CONCAT(e.first_name, ' ', e.last_name) AS employee_name, e.employee_code, c.start_date, c.end_date, c.wage
        FROM contracts c
        JOIN employees e ON e.employee_id = c.employee_id
        WHERE c.company_id = $1 AND c.status = 'ACTIVE'
          AND c.end_date IS NOT NULL
          AND c.end_date < CURRENT_DATE
        ORDER BY c.end_date ASC
      `,
      [companyId]
    ),
  ]);

  return {
    contracts_expiring_soon: expiringSoonRes.rows,
    contracts_expired_active: expiredActiveRes.rows,
  };
}

module.exports = {
  getMissingDataWarnings,
  getDuplicatePayslipWarnings,
  getContractAttentionWarnings,
};
