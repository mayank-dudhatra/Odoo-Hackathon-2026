const { query: defaultQuery } = require("../db");

async function createPayrunEmployee(executor = defaultQuery, {
  payrun_id,
  employee_id,
  contract_id = null,
  status = "SELECTED",
  error_message = null,
}) {
  const db = executor.query ? executor : defaultQuery;
  const result = await db.query(
    `
      INSERT INTO payrun_employees (
        payrun_id,
        employee_id,
        contract_id,
        status,
        error_message
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (payrun_id, employee_id)
      DO UPDATE SET contract_id = EXCLUDED.contract_id, status = EXCLUDED.status, error_message = EXCLUDED.error_message, updated_at = NOW()
      RETURNING *
    `,
    [payrun_id, employee_id, contract_id, status, error_message]
  );
  return result.rows[0];
}

async function deletePayrunEmployees(executor = defaultQuery, payrunId) {
  const db = executor.query ? executor : defaultQuery;
  await db.query(`DELETE FROM payrun_employees WHERE payrun_id = $1`, [payrunId]);
}

async function createPayslip(executor = defaultQuery, {
  company_id,
  payrun_id,
  employee_id,
  contract_id,
  salary_structure_id,
  employee_name_snapshot,
  employee_code_snapshot,
  structure_name_snapshot,
  period_start,
  period_end,
  worked_days = 0,
  gross_pay = 0,
  total_deductions = 0,
  net_pay = 0,
  status = "COMPUTED",
  snapshot_data = null,
  pdf_file_path = null,
  email_status = "PENDING",
  created_by = null,
}) {
  const db = executor.query ? executor : defaultQuery;
  const result = await db.query(
    `
      INSERT INTO payslips (
        company_id,
        payrun_id,
        employee_id,
        contract_id,
        salary_structure_id,
        employee_name_snapshot,
        employee_code_snapshot,
        structure_name_snapshot,
        period_start,
        period_end,
        worked_days,
        gross_pay,
        total_deductions,
        net_pay,
        status,
        snapshot_data,
        pdf_file_path,
        email_status,
        generated_at,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), $19)
      RETURNING *
    `,
    [
      company_id,
      payrun_id,
      employee_id,
      contract_id,
      salary_structure_id,
      employee_name_snapshot,
      employee_code_snapshot,
      structure_name_snapshot,
      period_start,
      period_end,
      worked_days,
      gross_pay,
      total_deductions,
      net_pay,
      status,
      snapshot_data ? JSON.stringify(snapshot_data) : null,
      pdf_file_path,
      email_status,
      created_by,
    ]
  );
  return result.rows[0];
}

async function createPayslipLine(executor = defaultQuery, {
  payslip_id,
  salary_rule_id = null,
  rule_code_snapshot,
  label,
  category,
  sequence,
  calculation_input = null,
  calculation_rate = null,
  amount,
}) {
  const db = executor.query ? executor : defaultQuery;
  const result = await db.query(
    `
      INSERT INTO payslip_lines (
        payslip_id,
        salary_rule_id,
        rule_code_snapshot,
        label,
        category,
        sequence,
        calculation_input,
        calculation_rate,
        amount
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `,
    [
      payslip_id,
      salary_rule_id,
      rule_code_snapshot,
      label,
      category,
      sequence,
      calculation_input,
      calculation_rate,
      amount,
    ]
  );
  return result.rows[0];
}

async function updatePayslipPdfPath(executor = defaultQuery, companyId, payslipId, pdfFilePath, status = "GENERATED") {
  const db = executor.query ? executor : defaultQuery;
  const result = await db.query(
    `
      UPDATE payslips
      SET pdf_file_path = $1, status = $2, generated_at = NOW(), updated_at = NOW()
      WHERE company_id = $3 AND payslip_id = $4
      RETURNING *
    `,
    [pdfFilePath, status, companyId, payslipId]
  );
  return result.rows[0] || null;
}

async function updatePayslipEmailStatus(executor = defaultQuery, companyId, payslipId, { email_status, email_sent_at = null, email_error_message = null, status = null }) {
  const db = executor.query ? executor : defaultQuery;
  const updates = ["email_status = $1", "email_sent_at = $2", "email_error_message = $3", "updated_at = NOW()"];
  const params = [email_status, email_sent_at, email_error_message];

  if (status) {
    updates.push(`status = $${params.length + 1}`);
    params.push(status);
  }

  params.push(companyId, payslipId);

  const result = await db.query(
    `
      UPDATE payslips
      SET ${updates.join(", ")}
      WHERE company_id = $${params.length - 1} AND payslip_id = $${params.length}
      RETURNING *
    `,
    params
  );
  return result.rows[0] || null;
}

async function updatePayslipSnapshotData(executor = defaultQuery, companyId, payslipId, snapshotData) {
  const db = executor.query ? executor : defaultQuery;
  const result = await db.query(
    `
      UPDATE payslips
      SET snapshot_data = $1, updated_at = NOW()
      WHERE company_id = $2 AND payslip_id = $3
      RETURNING *
    `,
    [JSON.stringify(snapshotData), companyId, payslipId]
  );
  return result.rows[0] || null;
}

async function deletePayslipsForPayrun(executor = defaultQuery, payrunId) {
  const db = executor.query ? executor : defaultQuery;
  // Cascades to payslip_lines
  await db.query(`DELETE FROM payslips WHERE payrun_id = $1`, [payrunId]);
}

async function getPayslipsForPayrun(executor = defaultQuery, companyId, payrunId) {
  const db = executor.query ? executor : defaultQuery;
  const result = await db.query(
    `
      SELECT
        p.*,
        pr.name AS payrun_name
      FROM payslips p
      JOIN payruns pr ON pr.payrun_id = p.payrun_id
      WHERE p.company_id = $1 AND p.payrun_id = $2
      ORDER BY p.employee_code_snapshot ASC
    `,
    [companyId, payrunId]
  );
  return result.rows;
}

async function listPayslips(executor = defaultQuery, companyId, filters = {}) {
  const db = executor.query ? executor : defaultQuery;
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

  const result = await db.query(
    `
      SELECT
        p.*,
        pr.name AS payrun_name
      FROM payslips p
      JOIN payruns pr ON pr.payrun_id = p.payrun_id
      WHERE ${where.join(" AND ")}
      ORDER BY p.period_start DESC, p.employee_code_snapshot ASC
    `,
    params
  );
  return result.rows;
}

async function getPayslipById(executor = defaultQuery, companyId, payslipId) {
  const db = executor.query ? executor : defaultQuery;
  const headerResult = await db.query(
    `
      SELECT
        p.*,
        pr.name AS payrun_name
      FROM payslips p
      JOIN payruns pr ON pr.payrun_id = p.payrun_id
      WHERE p.company_id = $1 AND p.payslip_id = $2
      LIMIT 1
    `,
    [companyId, payslipId]
  );

  const payslip = headerResult.rows[0];
  if (!payslip) return null;

  const linesResult = await db.query(
    `
      SELECT *
      FROM payslip_lines
      WHERE payslip_id = $1
      ORDER BY sequence ASC, payslip_line_id ASC
    `,
    [payslipId]
  );

  return {
    ...payslip,
    lines: linesResult.rows,
  };
}

async function getPayslipsForEmployee(executor = defaultQuery, companyId, employeeId) {
  const db = executor.query ? executor : defaultQuery;
  const result = await db.query(
    `
      SELECT
        p.*,
        pr.name AS payrun_name
      FROM payslips p
      JOIN payruns pr ON pr.payrun_id = p.payrun_id
      WHERE p.company_id = $1 AND p.employee_id = $2
      ORDER BY p.period_start DESC, p.created_at DESC
    `,
    [companyId, employeeId]
  );
  return result.rows;
}

module.exports = {
  createPayrunEmployee,
  deletePayrunEmployees,
  createPayslip,
  createPayslipLine,
  updatePayslipPdfPath,
  updatePayslipEmailStatus,
  updatePayslipSnapshotData,
  deletePayslipsForPayrun,
  getPayslipsForPayrun,
  listPayslips,
  getPayslipById,
  getPayslipsForEmployee,
};
