const { withTransaction, query } = require("../db");
const { AppError } = require("../utils/http");
const { createAuditLog } = require("./audit.service");
const {
  createPayrun,
  findPayrunById,
  findPayrunForUpdate,
  listPayruns,
  updatePayrunStatus,
  updatePayrunDetails,
  findOverlappingPayruns,
} = require("../repositories/payrun.repository");
const {
  createPayrunEmployee,
  deletePayrunEmployees,
  createPayslip,
  createPayslipLine,
  deletePayslipsForPayrun,
  getPayslipsForPayrun,
  getPayslipById,
  getPayslipsForEmployee,
} = require("../repositories/payslip.repository");
const { findSalaryStructureById } = require("../repositories/salary-structure.repository");
const { findEligibleEmployeesForPayrun } = require("./payroll-eligibility.service");
const { calculateProration } = require("./proration.service");
const { calculateSalary } = require("./salary-calculation.service");

// --- PAYRUN CREATION & MANAGEMENT ---

async function createPayrunService(companyId, payload, actorUserId) {
  const structure = await findSalaryStructureById(null, companyId, payload.salary_structure_id);
  if (!structure) {
    throw new AppError(404, "Salary structure not found", "SALARY_STRUCTURE_NOT_FOUND");
  }

  const hasOverlap = await findOverlappingPayruns(
    null,
    companyId,
    payload.salary_structure_id,
    payload.period_start,
    payload.period_end
  );
  if (hasOverlap) {
    throw new AppError(409, "A payrun for this salary structure and period already exists", "DUPLICATE_PAYRUN_PERIOD");
  }

  const payrun = await createPayrun(null, {
    company_id: companyId,
    ...payload,
    created_by: actorUserId,
  });

  await createAuditLog({
    companyId,
    userId: actorUserId,
    module: "PAYROLL",
    action: "PAYRUN_CREATED",
    recordId: payrun.payrun_id,
    details: {
      name: payrun.name,
      period_start: payrun.period_start,
      period_end: payrun.period_end,
    },
  });

  return findPayrunById(null, companyId, payrun.payrun_id);
}

async function listPayrunsService(companyId, filters) {
  return listPayruns(null, companyId, filters);
}

async function getPayrunByIdService(companyId, payrunId) {
  const payrun = await findPayrunById(null, companyId, payrunId);
  if (!payrun) {
    throw new AppError(404, "Payrun not found", "PAYRUN_NOT_FOUND");
  }
  return payrun;
}

// --- PAYRUN COMPUTATION ENGINE ---

async function computePayrunService({ actor, payrunId }) {
  const companyId = actor.company_id;

  return withTransaction(async (client) => {
    const payrun = await findPayrunForUpdate(client, companyId, payrunId);
    if (!payrun) {
      throw new AppError(404, "Payrun not found", "PAYRUN_NOT_FOUND");
    }

    if (["VALIDATED", "PAID"].includes(payrun.status)) {
      throw new AppError(400, `Cannot re-compute payrun in '${payrun.status}' status`, "PAYRUN_LOCKED");
    }

    // Set status to PROCESSING
    await updatePayrunStatus(client, companyId, payrunId, "PROCESSING");

    // Clear previous computed data if re-computing
    await deletePayslipsForPayrun(client, payrunId);
    await deletePayrunEmployees(client, payrunId);

    // 1. Determine eligible employees
    const eligibilityResult = await findEligibleEmployeesForPayrun(
      client,
      companyId,
      payrun.salary_structure_id,
      payrun.period_start,
      payrun.period_end
    );

    const warnings = [];
    const errors = [];

    // Track ineligible employees as ERROR records
    for (const inelig of eligibilityResult.ineligible) {
      await createPayrunEmployee(client, {
        payrun_id: payrunId,
        employee_id: inelig.employee.employee_id,
        contract_id: null,
        status: "ERROR",
        error_message: inelig.reason,
      });
      errors.push({
        employee_id: inelig.employee.employee_id,
        employee_code: inelig.employee.employee_code,
        message: inelig.reason,
      });
    }

    // 2. Compute payroll for each eligible employee
    for (const item of eligibilityResult.eligible) {
      const emp = item.employee;
      const contract = item.contract;

      try {
        // Calculate proration & payable time
        const proration = await calculateProration(client, {
          companyId,
          employeeId: emp.employee_id,
          periodStart: payrun.period_start,
          periodEnd: payrun.period_end,
          contract,
        });

        if (proration.unpaidLeaveDays > 0) {
          warnings.push({
            employee_id: emp.employee_id,
            employee_code: emp.employee_code,
            message: `Unpaid leave detected: ${proration.unpaidLeaveDays} days`,
          });
        }

        if (proration.attendanceDeductionDays > 0) {
          warnings.push({
            employee_id: emp.employee_id,
            employee_code: emp.employee_code,
            message: `Attendance deduction detected: ${proration.attendanceDeductionDays} days`,
          });
        }

        // Execute Independent Salary Calculation Engine
        const salaryResult = await calculateSalary({
          companyId,
          employeeId: emp.employee_id,
          targetDate: payrun.period_end,
          customStructureId: payrun.salary_structure_id,
          customWage: proration.proratedWage,
        });

        const empNameSnapshot = `${emp.first_name} ${emp.last_name}`;
        const totalDeductions = salaryResult.summary.total_deductions + salaryResult.summary.total_tax + salaryResult.summary.total_contributions;

        const snapshotData = {
          company: {
            company_id: companyId,
          },
          employee: {
            employee_id: emp.employee_id,
            code: emp.employee_code,
            name: empNameSnapshot,
            email: emp.email || null,
            department: contract.department_name || "General",
            position: contract.position_name || "Employee",
          },
          contract: {
            contract_id: contract.contract_id,
            wage: contract.wage,
            wage_type: contract.wage_type,
          },
          structure: {
            salary_structure_id: payrun.salary_structure_id,
            name: salaryResult.salary_structure.name,
          },
          period: {
            period_start: payrun.period_start,
            period_end: payrun.period_end,
            payrun_name: payrun.name,
          },
          summary: {
            worked_days: proration.payableDays,
            gross_pay: salaryResult.gross,
            total_deductions: totalDeductions,
            net_pay: salaryResult.net,
          },
        };

        // Create Payslip Header Snapshot
        const payslip = await createPayslip(client, {
          company_id: companyId,
          payrun_id: payrunId,
          employee_id: emp.employee_id,
          contract_id: contract.contract_id,
          salary_structure_id: payrun.salary_structure_id,
          employee_name_snapshot: empNameSnapshot,
          employee_code_snapshot: emp.employee_code,
          structure_name_snapshot: salaryResult.salary_structure.name,
          period_start: payrun.period_start,
          period_end: payrun.period_end,
          worked_days: proration.payableDays,
          gross_pay: salaryResult.gross,
          total_deductions: totalDeductions,
          net_pay: salaryResult.net,
          status: "COMPUTED",
          snapshot_data: snapshotData,
          created_by: actor.user_id,
        });

        // Create Payslip Line Snapshots
        for (const line of salaryResult.lines) {
          await createPayslipLine(client, {
            payslip_id: payslip.payslip_id,
            salary_rule_id: line.salary_rule_id,
            rule_code_snapshot: line.code,
            label: line.name,
            category: line.category,
            sequence: line.sequence,
            calculation_input: proration.proratedWage,
            calculation_rate: line.computation_type === "PERCENTAGE" ? line.percentage_value : null,
            amount: line.amount,
          });
        }

        // Record Payrun Employee as COMPUTED
        await createPayrunEmployee(client, {
          payrun_id: payrunId,
          employee_id: emp.employee_id,
          contract_id: contract.contract_id,
          status: "COMPUTED",
          error_message: null,
        });

      } catch (err) {
        await createPayrunEmployee(client, {
          payrun_id: payrunId,
          employee_id: emp.employee_id,
          contract_id: contract.contract_id,
          status: "ERROR",
          error_message: err.message,
        });
        errors.push({
          employee_id: emp.employee_id,
          employee_code: emp.employee_code,
          message: err.message,
        });
      }
    }

    // 3. Mark Payrun as COMPUTED
    await updatePayrunStatus(client, companyId, payrunId, "COMPUTED");

    await createAuditLog({
      companyId,
      userId: actor.user_id,
      module: "PAYROLL",
      action: "PAYRUN_COMPUTED",
      recordId: payrunId,
      details: {
        total_eligible: eligibilityResult.eligible.length,
        total_ineligible: eligibilityResult.ineligible.length,
        total_errors: errors.length,
      },
    }, client);

    const updatedPayrun = await findPayrunById(client, companyId, payrunId);
    const payslips = await getPayslipsForPayrun(client, companyId, payrunId);

    return {
      payrun: updatedPayrun,
      payslips,
      warnings,
      errors,
    };
  });
}

// --- PAYRUN VALIDATION ---

async function validatePayrunService({ actor, payrunId }) {
  const companyId = actor.company_id;

  return withTransaction(async (client) => {
    const payrun = await findPayrunForUpdate(client, companyId, payrunId);
    if (!payrun) {
      throw new AppError(404, "Payrun not found", "PAYRUN_NOT_FOUND");
    }

    if (payrun.status !== "COMPUTED") {
      throw new AppError(400, `Cannot validate payrun in status '${payrun.status}'. Payrun must be COMPUTED first`, "INVALID_PAYRUN_STATUS");
    }

    // Check for blocking errors in payrun_employees
    const errorCheck = await client.query(
      `SELECT COUNT(*)::int AS count FROM payrun_employees WHERE payrun_id = $1 AND status = 'ERROR'`,
      [payrunId]
    );

    if (errorCheck.rows[0].count > 0) {
      throw new AppError(400, `Cannot validate payrun containing ${errorCheck.rows[0].count} calculation error(s)`, "PAYRUN_HAS_ERRORS");
    }

    await updatePayrunStatus(client, companyId, payrunId, "VALIDATED", actor.user_id);

    // Update payslip statuses to VALIDATED
    await client.query(
      `UPDATE payslips SET status = 'VALIDATED', updated_at = NOW() WHERE payrun_id = $1`,
      [payrunId]
    );

    await createAuditLog({
      companyId,
      userId: actor.user_id,
      module: "PAYROLL",
      action: "PAYRUN_VALIDATED",
      recordId: payrunId,
    }, client);

    return findPayrunById(client, companyId, payrunId);
  });
}

// --- PAYRUN MARK AS PAID ---

async function payPayrunService({ actor, payrunId }) {
  const companyId = actor.company_id;

  return withTransaction(async (client) => {
    const payrun = await findPayrunForUpdate(client, companyId, payrunId);
    if (!payrun) {
      throw new AppError(404, "Payrun not found", "PAYRUN_NOT_FOUND");
    }

    if (payrun.status !== "VALIDATED") {
      throw new AppError(400, `Cannot mark payrun as paid from status '${payrun.status}'. Payrun must be VALIDATED first`, "INVALID_PAYRUN_STATUS");
    }

    await updatePayrunStatus(client, companyId, payrunId, "PAID", actor.user_id);

    // Update payslip statuses to PAID (immutable)
    await client.query(
      `UPDATE payslips SET status = 'PAID', updated_at = NOW() WHERE payrun_id = $1`,
      [payrunId]
    );

    await createAuditLog({
      companyId,
      userId: actor.user_id,
      module: "PAYROLL",
      action: "PAYRUN_PAID",
      recordId: payrunId,
    }, client);

    return findPayrunById(client, companyId, payrunId);
  });
}

// --- PAYSLIP QUERY SERVICES ---

async function getPayslipsForPayrunService(companyId, payrunId) {
  const payrun = await findPayrunById(null, companyId, payrunId);
  if (!payrun) {
    throw new AppError(404, "Payrun not found", "PAYRUN_NOT_FOUND");
  }
  return getPayslipsForPayrun(null, companyId, payrunId);
}

async function getPayslipByIdService(companyId, payslipId) {
  const payslip = await getPayslipById(null, companyId, payslipId);
  if (!payslip) {
    throw new AppError(404, "Payslip not found", "PAYSLIP_NOT_FOUND");
  }
  return payslip;
}

async function getEmployeePayslipsService(companyId, employeeId) {
  return getPayslipsForEmployee(null, companyId, employeeId);
}

async function updatePayrunService(companyId, payrunId, payload, actorUserId) {
  const payrun = await findPayrunById(null, companyId, payrunId);
  if (!payrun) {
    throw new AppError(404, "Payrun not found", "PAYRUN_NOT_FOUND");
  }

  if (["VALIDATED", "PAID"].includes(payrun.status)) {
    throw new AppError(400, `Cannot update payrun in '${payrun.status}' status`, "PAYRUN_LOCKED");
  }

  if (payload.period_start || payload.period_end || payload.salary_structure_id) {
    const structureId = payload.salary_structure_id || payrun.salary_structure_id;
    const start = payload.period_start || payrun.period_start;
    const end = payload.period_end || payrun.period_end;

    const hasOverlap = await findOverlappingPayruns(
      null,
      companyId,
      structureId,
      start,
      end,
      payrunId
    );
    if (hasOverlap) {
      throw new AppError(409, "A payrun for this salary structure and period already exists", "DUPLICATE_PAYRUN_PERIOD");
    }
  }

  await updatePayrunDetails(null, companyId, payrunId, payload);
  await createAuditLog({
    companyId,
    userId: actorUserId,
    module: "PAYROLL",
    action: "PAYRUN_UPDATED",
    recordId: payrunId,
    details: payload,
  });

  return findPayrunById(null, companyId, payrunId);
}

async function getPayrunEmployeesService(companyId, payrunId) {
  const payrun = await findPayrunById(null, companyId, payrunId);
  if (!payrun) {
    throw new AppError(404, "Payrun not found", "PAYRUN_NOT_FOUND");
  }

  const result = await query(
    `
      SELECT
        pe.*,
        e.employee_code,
        e.first_name,
        e.last_name,
        e.email,
        p.payslip_id,
        p.gross_pay,
        p.total_deductions,
        p.net_pay,
        p.status AS payslip_status
      FROM payrun_employees pe
      JOIN employees e ON e.employee_id = pe.employee_id
      LEFT JOIN payslips p ON p.payrun_id = pe.payrun_id AND p.employee_id = pe.employee_id
      WHERE pe.payrun_id = $1
      ORDER BY e.employee_code ASC
    `,
    [payrunId]
  );
  return result.rows;
}

async function getPayrunEmployeeByIdService(companyId, payrunId, employeeId) {
  const payrun = await findPayrunById(null, companyId, payrunId);
  if (!payrun) {
    throw new AppError(404, "Payrun not found", "PAYRUN_NOT_FOUND");
  }

  const peResult = await query(
    `
      SELECT
        pe.*,
        e.employee_code,
        e.first_name,
        e.last_name,
        e.email
      FROM payrun_employees pe
      JOIN employees e ON e.employee_id = pe.employee_id
      WHERE pe.payrun_id = $1 AND pe.employee_id = $2
      LIMIT 1
    `,
    [payrunId, employeeId]
  );

  const peRecord = peResult.rows[0];
  if (!peRecord) {
    throw new AppError(404, "Employee record not found in this payrun", "PAYRUN_EMPLOYEE_NOT_FOUND");
  }

  const payslipResult = await query(
    `SELECT payslip_id FROM payslips WHERE payrun_id = $1 AND employee_id = $2 LIMIT 1`,
    [payrunId, employeeId]
  );

  let payslipDetails = null;
  if (payslipResult.rows[0]) {
    payslipDetails = await getPayslipById(null, companyId, payslipResult.rows[0].payslip_id);
  }

  return {
    ...peRecord,
    payslip: payslipDetails,
  };
}

module.exports = {
  createPayrunService,
  listPayrunsService,
  getPayrunByIdService,
  updatePayrunService,
  computePayrunService,
  validatePayrunService,
  payPayrunService,
  getPayslipsForPayrunService,
  getPayslipByIdService,
  getEmployeePayslipsService,
  getPayrunEmployeesService,
  getPayrunEmployeeByIdService,
};
