const fs = require("fs");
const { query, withTransaction } = require("../db");
const { AppError } = require("../utils/http");
const { createAuditLog } = require("./audit.service");
const {
  getPayslipsForPayrun,
  getPayslipById,
  listPayslips,
  getPayslipsForEmployee,
  updatePayslipPdfPath,
  updatePayslipSnapshotData,
} = require("../repositories/payslip.repository");
const { findPayrunById } = require("../repositories/payrun.repository");
const { generatePayslipPDF } = require("./payslip-pdf.service");
const { sendSinglePayslipEmailService } = require("./payslip-email.service");

/**
 * Builds or verifies complete immutable snapshot data for a payslip.
 */
async function ensurePayslipSnapshot(companyId, payslip) {
  if (payslip.snapshot_data && Object.keys(payslip.snapshot_data).length > 0) {
    return payslip.snapshot_data;
  }

  // Fetch company details
  const companyRes = await query(
    `SELECT name, email, phone, address, currency_code, timezone FROM companies WHERE company_id = $1`,
    [companyId]
  );
  const company = companyRes.rows[0] || {};

  // Fetch employee details
  const empRes = await query(
    `
      SELECT e.employee_id, e.employee_code, e.first_name, e.last_name, e.email, d.name AS department_name, p.title AS position_name
      FROM employees e
      LEFT JOIN departments d ON d.department_id = e.department_id
      LEFT JOIN positions p ON p.position_id = e.position_id
      WHERE e.company_id = $1 AND e.employee_id = $2
    `,
    [companyId, payslip.employee_id]
  );
  const emp = empRes.rows[0] || {};

  // Fetch contract details
  const contractRes = await query(
    `SELECT contract_id, wage, wage_type, start_date, end_date FROM contracts WHERE company_id = $1 AND contract_id = $2`,
    [companyId, payslip.contract_id]
  );
  const contract = contractRes.rows[0] || {};

  // Fetch salary structure details
  const structureRes = await query(
    `SELECT salary_structure_id, name, description FROM salary_structures WHERE company_id = $1 AND salary_structure_id = $2`,
    [companyId, payslip.salary_structure_id]
  );
  const structure = structureRes.rows[0] || {};

  const snapshotData = {
    company: {
      company_id: companyId,
      name: company.name || "PeoplePay360 Demo Pvt Ltd",
      email: company.email || "contact@peoplepay360.com",
      phone: company.phone || "",
      address: company.address || "",
      currency_code: company.currency_code || "INR",
      timezone: company.timezone || "UTC",
    },
    employee: {
      employee_id: payslip.employee_id,
      code: payslip.employee_code_snapshot || emp.employee_code || "EMP",
      name: payslip.employee_name_snapshot || `${emp.first_name || ""} ${emp.last_name || ""}`.trim(),
      email: emp.email || null,
      department: emp.department_name || "General",
      position: emp.position_name || "Employee",
    },
    contract: {
      contract_id: payslip.contract_id,
      wage: contract.wage || 0,
      wage_type: contract.wage_type || "MONTHLY",
      start_date: contract.start_date || null,
    },
    structure: {
      salary_structure_id: payslip.salary_structure_id,
      name: payslip.structure_name_snapshot || structure.name || "Standard",
      description: structure.description || "",
    },
    period: {
      period_start: payslip.period_start,
      period_end: payslip.period_end,
      payrun_name: payslip.payrun_name || "Payrun",
    },
    summary: {
      worked_days: payslip.worked_days,
      gross_pay: payslip.gross_pay,
      total_deductions: payslip.total_deductions,
      net_pay: payslip.net_pay,
    },
  };

  await updatePayslipSnapshotData(null, companyId, payslip.payslip_id, snapshotData);
  return snapshotData;
}

// --- 1. BULK PAYSLIP GENERATION ---

async function generatePayrunPayslipsService({ companyId, payrunId, actorUserId }) {
  const payrun = await findPayrunById(null, companyId, payrunId);
  if (!payrun) {
    throw new AppError(404, "Payrun not found", "PAYRUN_NOT_FOUND");
  }

  if (!["VALIDATED", "PAID"].includes(payrun.status)) {
    throw new AppError(
      400,
      `Payslips can only be generated from a VALIDATED or PAID payrun. Current status: '${payrun.status}'`,
      "PAYRUN_NOT_VALIDATED"
    );
  }

  const rawPayslips = await getPayslipsForPayrun(null, companyId, payrunId);
  if (!rawPayslips || rawPayslips.length === 0) {
    throw new AppError(404, "No payslip records found for this payrun", "PAYSLIPS_NOT_FOUND");
  }

  const generatedPayslips = [];
  const errors = [];

  for (const rawP of rawPayslips) {
    try {
      const payslip = await getPayslipById(null, companyId, rawP.payslip_id);
      payslip.snapshot_data = await ensurePayslipSnapshot(companyId, payslip);

      // Generate PDF
      const pdfPath = await generatePayslipPDF(payslip);

      // Update payslip record with PDF path & status
      const updated = await updatePayslipPdfPath(
        null,
        companyId,
        payslip.payslip_id,
        pdfPath,
        "GENERATED"
      );

      await createAuditLog({
        companyId,
        userId: actorUserId,
        module: "PAYROLL",
        action: "PAYSLIP_GENERATED",
        recordId: payslip.payslip_id,
        details: { employee_code: payslip.employee_code_snapshot, pdf_path: pdfPath },
      });

      generatedPayslips.push(updated);
    } catch (err) {
      errors.push({
        payslip_id: rawP.payslip_id,
        employee_code: rawP.employee_code_snapshot,
        error: err.message,
      });
    }
  }

  return {
    message: "Payslip generation completed",
    total: rawPayslips.length,
    generated_count: generatedPayslips.length,
    failed_count: errors.length,
    generated_payslips: generatedPayslips,
    errors,
  };
}

// --- 2. QUERY & ACCESS SERVICES ---

async function listPayslipsService(companyId, filters) {
  return listPayslips(null, companyId, filters);
}

async function getPayslipByIdService(companyId, payslipId, actorUser) {
  const payslip = await getPayslipById(null, companyId, payslipId);
  if (!payslip) {
    throw new AppError(404, "Payslip not found", "PAYSLIP_NOT_FOUND");
  }

  // Employee Ownership Enforcer
  if (actorUser.role_name === "Employee" || (actorUser.employee_id && !actorUser.permissions?.includes("PAYSLIPS:READ_ALL"))) {
    if (Number(payslip.employee_id) !== Number(actorUser.employee_id)) {
      throw new AppError(403, "Access denied. You can only view your own payslips.", "ACCESS_DENIED");
    }
  }

  await createAuditLog({
    companyId,
    userId: actorUser.user_id,
    module: "PAYROLL",
    action: "PAYSLIP_VIEWED",
    recordId: payslipId,
  });

  return payslip;
}

async function getPayslipPdfService(companyId, payslipId, actorUser) {
  const payslip = await getPayslipById(null, companyId, payslipId);
  if (!payslip) {
    throw new AppError(404, "Payslip not found", "PAYSLIP_NOT_FOUND");
  }

  // Employee Ownership Enforcer
  if (actorUser.role_name === "Employee" || (actorUser.employee_id && !actorUser.permissions?.includes("PAYSLIPS:READ_ALL"))) {
    if (Number(payslip.employee_id) !== Number(actorUser.employee_id)) {
      throw new AppError(403, "Access denied. You can only access your own payslips.", "ACCESS_DENIED");
    }
  }

  payslip.snapshot_data = await ensurePayslipSnapshot(companyId, payslip);

  let pdfPath = payslip.pdf_file_path;
  if (!pdfPath || !fs.existsSync(pdfPath)) {
    pdfPath = await generatePayslipPDF(payslip);
    await updatePayslipPdfPath(null, companyId, payslipId, pdfPath, payslip.status === "DRAFT" ? "GENERATED" : payslip.status);
  }

  await createAuditLog({
    companyId,
    userId: actorUser.user_id,
    module: "PAYROLL",
    action: "PAYSLIP_DOWNLOADED",
    recordId: payslipId,
  });

  return { filePath: pdfPath, payslip };
}

async function getEmployeePayslipsService(companyId, targetEmployeeId, actorUser) {
  // Employee Ownership Enforcer
  if (actorUser.role_name === "Employee" || (actorUser.employee_id && !actorUser.permissions?.includes("PAYSLIPS:READ_ALL"))) {
    if (Number(actorUser.employee_id) !== Number(targetEmployeeId)) {
      throw new AppError(403, "Access denied. You can only view your own payslips.", "ACCESS_DENIED");
    }
  }

  return getPayslipsForEmployee(null, companyId, targetEmployeeId);
}

// --- 3. BULK & SINGLE EMAIL SERVICES ---

async function bulkEmailPayrunPayslipsService({ companyId, payrunId, actorUserId }) {
  const payrun = await findPayrunById(null, companyId, payrunId);
  if (!payrun) {
    throw new AppError(404, "Payrun not found", "PAYRUN_NOT_FOUND");
  }

  const payslips = await getPayslipsForPayrun(null, companyId, payrunId);
  if (!payslips || payslips.length === 0) {
    throw new AppError(404, "No payslips found for this payrun", "PAYSLIPS_NOT_FOUND");
  }

  let sentCount = 0;
  let failedCount = 0;
  const deliveryResults = [];

  for (const p of payslips) {
    try {
      const res = await sendSinglePayslipEmailService({
        companyId,
        payslipId: p.payslip_id,
        actorUserId,
      });
      sentCount += 1;
      deliveryResults.push({
        payslip_id: p.payslip_id,
        employee_code: p.employee_code_snapshot,
        status: "SENT",
      });
    } catch (err) {
      failedCount += 1;
      deliveryResults.push({
        payslip_id: p.payslip_id,
        employee_code: p.employee_code_snapshot,
        status: "FAILED",
        error: err.message,
      });
    }
  }

  await createAuditLog({
    companyId,
    userId: actorUserId,
    module: "PAYROLL",
    action: "PAYSLIPS_BULK_EMAILED",
    recordId: payrunId,
    details: { total: payslips.length, sent: sentCount, failed: failedCount },
  });

  return {
    payrun_id: payrunId,
    total: payslips.length,
    sent_count: sentCount,
    failed_count: failedCount,
    delivery_results: deliveryResults,
  };
}

async function sendPayslipEmailServiceWrapper({ companyId, payslipId, actorUserId }) {
  return sendSinglePayslipEmailService({ companyId, payslipId, actorUserId });
}

async function retryFailedPayslipEmailService({ companyId, payslipId, actorUserId }) {
  const payslip = await getPayslipById(null, companyId, payslipId);
  if (!payslip) {
    throw new AppError(404, "Payslip not found", "PAYSLIP_NOT_FOUND");
  }

  const result = await sendSinglePayslipEmailService({ companyId, payslipId, actorUserId });

  await createAuditLog({
    companyId,
    userId: actorUserId,
    module: "PAYROLL",
    action: "PAYSLIP_EMAIL_RETRIED",
    recordId: payslipId,
  });

  return result;
}

module.exports = {
  generatePayrunPayslipsService,
  listPayslipsService,
  getPayslipByIdService,
  getPayslipPdfService,
  getEmployeePayslipsService,
  bulkEmailPayrunPayslipsService,
  sendPayslipEmailServiceWrapper,
  retryFailedPayslipEmailService,
};
