const { query: defaultQuery } = require("../db");

function parseArgs(firstArg, secondArg, thirdArg) {
  if (firstArg && typeof firstArg.query === "function") {
    return {
      dbQuery: (sql, params) => firstArg.query(sql, params),
      companyId: secondArg,
      targetId: thirdArg,
    };
  }
  return {
    dbQuery: defaultQuery,
    companyId: firstArg,
    targetId: secondArg,
  };
}

async function createPayrunEmployee(executor = defaultQuery, {
  payrun_id,
  employee_id,
  contract_id = null,
  status = "SELECTED",
  error_message = null,
}) {
  const dbQuery = (executor && typeof executor.query === "function")
    ? (sql, params) => executor.query(sql, params)
    : defaultQuery;

  const result = await dbQuery(
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
  let dbQuery = defaultQuery;
  let targetId = payrunId;
  if (executor && typeof executor.query === "function") {
    dbQuery = (sql, params) => executor.query(sql, params);
  } else if (typeof executor === "number") {
    targetId = executor;
  }
  await dbQuery(`DELETE FROM payrun_employees WHERE payrun_id = $1`, [targetId]);
}

async function createPayslip(executor = defaultQuery, payload) {
  let dbQuery = defaultQuery;
  let p = payload;
  if (executor && typeof executor.query === "function") {
    dbQuery = (sql, params) => executor.query(sql, params);
  } else if (payload === undefined && typeof executor === "object") {
    p = executor;
  }

  const result = await dbQuery(
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
      p.company_id,
      p.payrun_id,
      p.employee_id,
      p.contract_id,
      p.salary_structure_id,
      p.employee_name_snapshot,
      p.employee_code_snapshot,
      p.structure_name_snapshot,
      p.period_start,
      p.period_end,
      p.worked_days || 0,
      p.gross_pay || 0,
      p.total_deductions || 0,
      p.net_pay || 0,
      p.status || "COMPUTED",
      p.snapshot_data ? JSON.stringify(p.snapshot_data) : null,
      p.pdf_file_path || null,
      p.email_status || "PENDING",
      p.created_by || null,
    ]
  );
  return result.rows[0];
}

async function createPayslipLine(executor = defaultQuery, payload) {
  let dbQuery = defaultQuery;
  let l = payload;
  if (executor && typeof executor.query === "function") {
    dbQuery = (sql, params) => executor.query(sql, params);
  } else if (payload === undefined && typeof executor === "object") {
    l = executor;
  }

  const result = await dbQuery(
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
      l.payslip_id,
      l.salary_rule_id || null,
      l.rule_code_snapshot,
      l.label,
      l.category,
      l.sequence,
      l.calculation_input || null,
      l.calculation_rate || null,
      l.amount,
    ]
  );
  return result.rows[0];
}

async function updatePayslipPdfPath(executor, companyId, payslipId, pdfFilePath, status = "GENERATED") {
  const { dbQuery, companyId: cId, targetId: pId } = parseArgs(executor, companyId, payslipId);
  const targetPdf = typeof executor === "number" ? pdfFilePath : pdfFilePath;
  const targetStatus = typeof executor === "number" ? status : status;

  const result = await dbQuery(
    `
      UPDATE payslips
      SET pdf_file_path = $1, status = $2, generated_at = NOW(), updated_at = NOW()
      WHERE company_id = $3 AND payslip_id = $4
      RETURNING *
    `,
    [targetPdf, targetStatus, cId, pId]
  );
  return result.rows[0] || null;
}

async function updatePayslipEmailStatus(executor, companyId, payslipId, options = {}) {
  const { dbQuery, companyId: cId, targetId: pId } = parseArgs(executor, companyId, payslipId);
  const opts = typeof executor === "number" ? payslipId : options;

  const updates = ["email_status = $1", "email_sent_at = $2", "email_error_message = $3", "updated_at = NOW()"];
  const params = [opts.email_status, opts.email_sent_at || null, opts.email_error_message || null];

  if (opts.status) {
    updates.push(`status = $${params.length + 1}`);
    params.push(opts.status);
  }

  params.push(cId, pId);

  const result = await dbQuery(
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

async function updatePayslipSnapshotData(executor, companyId, payslipId, snapshotData) {
  const { dbQuery, companyId: cId, targetId: pId } = parseArgs(executor, companyId, payslipId);
  const targetSnap = typeof executor === "number" ? payslipId : snapshotData;

  const result = await dbQuery(
    `
      UPDATE payslips
      SET snapshot_data = $1, updated_at = NOW()
      WHERE company_id = $2 AND payslip_id = $3
      RETURNING *
    `,
    [JSON.stringify(targetSnap), cId, pId]
  );
  return result.rows[0] || null;
}

async function deletePayslipsForPayrun(executor = defaultQuery, payrunId) {
  let dbQuery = defaultQuery;
  let targetId = payrunId;
  if (executor && typeof executor.query === "function") {
    dbQuery = (sql, params) => executor.query(sql, params);
  } else if (typeof executor === "number") {
    targetId = executor;
  }
  await dbQuery(`DELETE FROM payslips WHERE payrun_id = $1`, [targetId]);
}

async function getPayslipsForPayrun(executor, companyId, payrunId) {
  const { dbQuery, companyId: cId, targetId: prId } = parseArgs(executor, companyId, payrunId);

  const result = await dbQuery(
    `
      SELECT
        p.*,
        pr.name AS payrun_name
      FROM payslips p
      JOIN payruns pr ON pr.payrun_id = p.payrun_id
      WHERE p.company_id = $1 AND p.payrun_id = $2
      ORDER BY p.employee_code_snapshot ASC
    `,
    [cId, prId]
  );
  return result.rows;
}

async function listPayslips(executor, companyId, filters = {}) {
  const { dbQuery, companyId: cId, targetId: f } = parseArgs(executor, companyId, filters);
  const filterObj = f || {};

  const where = ["p.company_id = $1"];
  const params = [cId];

  if (filterObj.payrun_id) {
    params.push(filterObj.payrun_id);
    where.push(`p.payrun_id = $${params.length}`);
  }

  if (filterObj.employee_id) {
    params.push(filterObj.employee_id);
    where.push(`p.employee_id = $${params.length}`);
  }

  if (filterObj.status) {
    params.push(filterObj.status);
    where.push(`p.status = $${params.length}`);
  }

  if (filterObj.email_status) {
    params.push(filterObj.email_status);
    where.push(`p.email_status = $${params.length}`);
  }

  const result = await dbQuery(
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

async function getPayslipById(executor, companyId, payslipId) {
  const { dbQuery, companyId: cId, targetId: psId } = parseArgs(executor, companyId, payslipId);

  const headerResult = await dbQuery(
    `
      SELECT
        p.*,
        pr.name AS payrun_name
      FROM payslips p
      JOIN payruns pr ON pr.payrun_id = p.payrun_id
      WHERE p.company_id = $1 AND p.payslip_id = $2
      LIMIT 1
    `,
    [cId, psId]
  );

  const payslip = headerResult.rows[0];
  if (!payslip) return null;

  const linesResult = await dbQuery(
    `
      SELECT *
      FROM payslip_lines
      WHERE payslip_id = $1
      ORDER BY sequence ASC, payslip_line_id ASC
    `,
    [psId]
  );

  return {
    ...payslip,
    lines: linesResult.rows,
  };
}

async function getPayslipsForEmployee(executor, companyId, employeeId) {
  const { dbQuery, companyId: cId, targetId: empId } = parseArgs(executor, companyId, employeeId);

  const result = await dbQuery(
    `
      SELECT
        p.*,
        pr.name AS payrun_name
      FROM payslips p
      JOIN payruns pr ON pr.payrun_id = p.payrun_id
      WHERE p.company_id = $1 AND p.employee_id = $2
      ORDER BY p.period_start DESC, p.created_at DESC
    `,
    [cId, empId]
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
