const assert = require("assert");
const fs = require("fs");
const { query } = require("../../src/db");
const { hashPassword } = require("../../src/utils/password");

// Services
const { computePayrunService, validatePayrunService, payPayrunService } = require("../../src/services/payrun.service");
const { generatePayrunPayslipsService, getPayslipPdfService } = require("../../src/services/payslip.service");
const { getOverallManagementDashboardService } = require("../../src/services/dashboard.service");
const { getEmployeeReportService, getPayrollReportService } = require("../../src/services/report.service");

async function runFullPayrollE2ETests() {
  console.log("\n--- Testing Full End-to-End Payroll Engine Integration (E2E) ---");

  const timeStr = Date.now().toString().slice(-6);
  const passHash = await hashPassword("AdminPass123!");

  // Step 1: Create Company
  const compRes = await query(
    `INSERT INTO companies (name, email, phone, address, currency_code)
     VALUES ($1, $2, '+91-9999999999', 'E2E Tech Park, India', 'INR') RETURNING company_id`,
    [`E2E Enterprise ${timeStr}`, `admin_e2e_${timeStr}@e2e.test`]
  );
  const companyId = compRes.rows[0].company_id;

  // Step 2: Create Admin User
  const roleAdminRes = await query(`SELECT role_id FROM roles WHERE role_name = 'Admin' LIMIT 1`);
  const adminRoleId = roleAdminRes.rows[0].role_id;

  const userRes = await query(
    `INSERT INTO users (company_id, username, email, password_hash, role_id, status)
     VALUES ($1, $2, $3, $4, $5, 'ACTIVE') RETURNING user_id`,
    [companyId, `admin_${timeStr}`, `admin_e2e_${timeStr}@e2e.test`, passHash, adminRoleId]
  );
  const adminUserId = userRes.rows[0].user_id;

  const actorAdmin = {
    user_id: adminUserId,
    company_id: companyId,
    role_name: "Admin",
    permissions: ["PAYRUNS:CREATE", "PAYRUNS:PROCESS", "PAYRUNS:VALIDATE", "PAYRUNS:PAY", "PAYSLIPS:CREATE", "PAYSLIPS:READ", "DASHBOARD:READ", "REPORTS:READ"],
  };

  // Step 3: Create Department & Position & Employee Type
  const deptRes = await query(`INSERT INTO departments (company_id, name) VALUES ($1, $2) RETURNING department_id`, [companyId, `Engineering ${timeStr}`]);
  const deptId = deptRes.rows[0].department_id;

  const posRes = await query(`INSERT INTO positions (company_id, title, department_id) VALUES ($1, $2, $3) RETURNING position_id`, [companyId, `Senior Dev ${timeStr}`, deptId]);
  const posId = posRes.rows[0].position_id;

  const typeRes = await query(`INSERT INTO employee_types (company_id, name) VALUES ($1, $2) RETURNING employee_type_id`, [companyId, `Full-Time ${timeStr}`]);
  const typeId = typeRes.rows[0].employee_type_id;

  // Step 4: Create Working Schedule & Days
  const schedRes = await query(
    `INSERT INTO working_schedules (company_id, name, hours_per_week) VALUES ($1, $2, 40) RETURNING schedule_id`,
    [companyId, `Sched ${timeStr}`]
  );
  const schedId = schedRes.rows[0].schedule_id;

  for (let day = 1; day <= 5; day++) {
    await query(
      `INSERT INTO schedule_days (schedule_id, day_of_week, is_working_day, start_time, end_time)
       VALUES ($1, $2, TRUE, '09:00:00', '18:00:00')`,
      [schedId, day]
    );
  }

  // Step 5: Create Employee
  const empRes = await query(
    `INSERT INTO employees (company_id, employee_code, first_name, last_name, email, department_id, position_id, employee_type_id, schedule_id, hire_date, status)
     VALUES ($1, $2, 'Jane', 'Doe', $3, $4, $5, $6, $7, '2026-01-01', 'ACTIVE') RETURNING employee_id`,
    [companyId, `E2E_${timeStr}`, `jane_${timeStr}@e2e.test`, deptId, posId, typeId, schedId]
  );
  const employeeId = empRes.rows[0].employee_id;

  // Step 6: Create Salary Structure & Rules
  const structRes = await query(
    `INSERT INTO salary_structures (company_id, name) VALUES ($1, $2) RETURNING salary_structure_id`,
    [companyId, `Structure ${timeStr}`]
  );
  const structureId = structRes.rows[0].salary_structure_id;

  // Basic Rule
  const ruleBasicRes = await query(
    `INSERT INTO salary_rules (company_id, name, code, category, computation_type, amount)
     VALUES ($1, 'Basic Salary', 'BASIC', 'BASIC', 'FIXED', 30000) RETURNING salary_rule_id`,
    [companyId]
  );
  const ruleBasicId = ruleBasicRes.rows[0].salary_rule_id;

  // HRA Rule (Percentage of BASIC)
  const ruleHraRes = await query(
    `INSERT INTO salary_rules (company_id, name, code, category, computation_type, percentage_of, percentage_value)
     VALUES ($1, 'House Rent Allowance', 'HRA', 'ALLOWANCE', 'PERCENTAGE', 'BASIC', 40) RETURNING salary_rule_id`,
    [companyId]
  );
  const ruleHraId = ruleHraRes.rows[0].salary_rule_id;

  // Tax Rule (Percentage of BASIC)
  const ruleTaxRes = await query(
    `INSERT INTO salary_rules (company_id, name, code, category, computation_type, percentage_of, percentage_value)
     VALUES ($1, 'Professional Tax', 'TAX', 'TAX', 'PERCENTAGE', 'BASIC', 10) RETURNING salary_rule_id`,
    [companyId]
  );
  const ruleTaxId = ruleTaxRes.rows[0].salary_rule_id;

  // Attach Rules to Structure
  await query(`INSERT INTO salary_structure_rules (salary_structure_id, salary_rule_id, sequence) VALUES ($1, $2, 1)`, [structureId, ruleBasicId]);
  await query(`INSERT INTO salary_structure_rules (salary_structure_id, salary_rule_id, sequence) VALUES ($1, $2, 2)`, [structureId, ruleHraId]);
  await query(`INSERT INTO salary_structure_rules (salary_structure_id, salary_rule_id, sequence) VALUES ($1, $2, 3)`, [structureId, ruleTaxId]);

  // Step 7: Create Contract
  const contractRes = await query(
    `INSERT INTO contracts (company_id, employee_id, position_id, department_id, schedule_id, salary_structure_id, wage, wage_type, start_date, status)
     VALUES ($1, $2, $3, $4, $5, $6, 30000, 'MONTHLY', '2026-01-01', 'ACTIVE') RETURNING contract_id`,
    [companyId, employeeId, posId, deptId, schedId, structureId]
  );
  const contractId = contractRes.rows[0].contract_id;

  // Step 8: Attendance Records
  await query(
    `INSERT INTO attendance (company_id, employee_id, work_date, check_in, check_out, hours_worked, status)
     VALUES ($1, $2, '2026-06-01', '2026-06-01 09:00:00', '2026-06-01 18:00:00', 8, 'PRESENT')`,
    [companyId, employeeId]
  );

  // Step 9: Leave Request & Approval
  const ltRes = await query(
    `INSERT INTO leave_types (company_id, name, unit, requires_allocation, is_paid) VALUES ($1, $2, 'DAYS', FALSE, TRUE) RETURNING leave_type_id`,
    [companyId, `Casual Leave ${timeStr}`]
  );
  const leaveTypeId = ltRes.rows[0].leave_type_id;

  await query(
    `INSERT INTO leave_requests (company_id, employee_id, leave_type_id, start_date, end_date, days_requested, status)
     VALUES ($1, $2, $3, '2026-06-05', '2026-06-05', 1, 'APPROVED')`,
    [companyId, employeeId, leaveTypeId]
  );

  // Step 10: Create Payrun for June 2026
  const payrunRes = await query(
    `INSERT INTO payruns (company_id, name, salary_structure_id, period_start, period_end, status)
     VALUES ($1, $2, $3, '2026-06-01', '2026-06-30', 'DRAFT') RETURNING payrun_id`,
    [companyId, `June Payrun ${timeStr}`, structureId]
  );
  const payrunId = payrunRes.rows[0].payrun_id;

  // Step 11: Compute Payrun
  const compResult = await computePayrunService({ actor: actorAdmin, payrunId });
  assert.strictEqual(compResult.payrun.status, "COMPUTED", "Payrun status should be COMPUTED");
  assert.strictEqual(compResult.payslips.length, 1, "Exactly 1 payslip should be computed");

  const payslip = compResult.payslips[0];
  assert.strictEqual(Number(payslip.gross_pay), 42000, "Gross salary calculation failed (BASIC 30000 + HRA 12000)");
  assert.strictEqual(Number(payslip.total_deductions), 3000, "Tax calculation failed (TAX 3000)");
  assert.strictEqual(Number(payslip.net_pay), 39000, "Net salary calculation failed (Gross 42000 - Tax 3000)");

  // Step 12: Validate Payrun
  const valResult = await validatePayrunService({ actor: actorAdmin, payrunId });
  assert.strictEqual(valResult.status, "VALIDATED", "Payrun status should be VALIDATED");

  // Step 13: Mark Payrun as PAID
  const paidResult = await payPayrunService({ actor: actorAdmin, payrunId });
  assert.strictEqual(paidResult.status, "PAID", "Payrun status should be PAID");

  // Step 14: Generate Payslips & PDF
  const genResult = await generatePayrunPayslipsService({ companyId, payrunId, actorUserId: adminUserId });
  assert.strictEqual(genResult.generated_count, 1, "Payslip PDF generation count failed");

  // Step 15: Stream & verify PDF exists on disk
  const pdfInfo = await getPayslipPdfService(companyId, payslip.payslip_id, actorAdmin);
  assert.strictEqual(fs.existsSync(pdfInfo.filePath), true, "Generated PDF file does not exist on disk!");

  // Step 16: Verify Dashboard Analytics
  const dashboard = await getOverallManagementDashboardService(companyId, {}, actorAdmin);
  assert.strictEqual(Number(dashboard.payroll.total_net_paid), 39000, "Dashboard Net Paid metric mismatch!");
  assert.strictEqual(dashboard.hr.active_employees, 1, "Dashboard HR active employees mismatch!");

  // Step 17: Verify Reports
  const empReport = await getEmployeeReportService(companyId, {}, {}, actorAdmin);
  assert.strictEqual(empReport.total, 1, "Employee master report count failed");

  const payrollReport = await getPayrollReportService(companyId, {}, {}, actorAdmin);
  assert.strictEqual(payrollReport.total, 1, "Payroll report count failed");

  // Cleanup E2E artifacts
  await query(`DELETE FROM payslip_lines WHERE payslip_id = $1`, [payslip.payslip_id]);
  await query(`DELETE FROM payslips WHERE payslip_id = $1`, [payslip.payslip_id]);
  await query(`DELETE FROM payrun_employees WHERE payrun_id = $1`, [payrunId]);
  await query(`DELETE FROM payruns WHERE payrun_id = $1`, [payrunId]);
  await query(`DELETE FROM leave_requests WHERE employee_id = $1`, [employeeId]);
  await query(`DELETE FROM leave_types WHERE leave_type_id = $1`, [leaveTypeId]);
  await query(`DELETE FROM attendance WHERE employee_id = $1`, [employeeId]);
  await query(`DELETE FROM contracts WHERE contract_id = $1`, [contractId]);
  await query(`DELETE FROM salary_structure_rules WHERE salary_structure_id = $1`, [structureId]);
  await query(`DELETE FROM salary_rules WHERE salary_rule_id IN ($1, $2, $3)`, [ruleBasicId, ruleHraId, ruleTaxId]);
  await query(`DELETE FROM salary_structures WHERE salary_structure_id = $1`, [structureId]);
  await query(`DELETE FROM employees WHERE employee_id = $1`, [employeeId]);
  await query(`DELETE FROM schedule_days WHERE schedule_id = $1`, [schedId]);
  await query(`DELETE FROM working_schedules WHERE schedule_id = $1`, [schedId]);
  await query(`DELETE FROM employee_types WHERE employee_type_id = $1`, [typeId]);
  await query(`DELETE FROM positions WHERE position_id = $1`, [posId]);
  await query(`DELETE FROM departments WHERE department_id = $1`, [deptId]);
  await query(`DELETE FROM users WHERE user_id = $1`, [adminUserId]);
  await query(`DELETE FROM companies WHERE company_id = $1`, [companyId]);

  if (fs.existsSync(pdfInfo.filePath)) {
    fs.unlinkSync(pdfInfo.filePath);
  }

  console.log("✔ Full End-to-End Payroll Engine Integration (E2E) tests passed (17/17 sub-verifications)");
}

if (require.main === module) {
  runFullPayrollE2ETests().catch((err) => {
    console.error("❌ E2E Integration Test Failed:", err);
    process.exit(1);
  });
}

module.exports = { runFullPayrollE2ETests };
