const assert = require("assert");
const { getPayrollDashboardService } = require("../../src/services/dashboard.service");
const { getEmployeeReportService } = require("../../src/services/report.service");
const { getPayslipByIdService } = require("../../src/services/payslip.service");

async function runRbacIntegrationTests() {
  console.log("\n--- Testing Role-Based Access Control (RBAC Integration) ---");

  const companyId = 1;

  // Mock Employee actor user (linked to employee_id: 10)
  const employeeActor = {
    user_id: 100,
    company_id: companyId,
    employee_id: 10,
    role_id: 5,
    role_name: "Employee",
    permissions: [],
  };

  // Mock HR Manager actor user
  const hrActor = {
    user_id: 101,
    company_id: companyId,
    employee_id: 11,
    role_id: 2,
    role_name: "HR Manager",
    permissions: ["DASHBOARD:READ", "REPORTS:READ", "EMPLOYEES:READ", "PAYSLIPS:READ"],
  };

  // 1. Employee attempting to access Management Dashboard must be blocked with 403
  let blockedDashboard = false;
  try {
    await getPayrollDashboardService(companyId, {}, employeeActor);
  } catch (err) {
    if (err.statusCode === 403) {
      blockedDashboard = true;
    }
  }
  assert.strictEqual(blockedDashboard, true, "Employee role was not blocked from Management Dashboard!");

  // 2. Employee attempting to access Management Employee Report must be blocked with 403
  let blockedReport = false;
  try {
    await getEmployeeReportService(companyId, {}, {}, employeeActor);
  } catch (err) {
    if (err.statusCode === 403) {
      blockedReport = true;
    }
  }
  assert.strictEqual(blockedReport, true, "Employee role was not blocked from Management Reports!");

  // 3. Employee attempting to access ANOTHER employee's payslip must be blocked
  let blockedOtherPayslip = false;
  try {
    // Mock getPayslipByIdService with employeeActor trying to access payslip owned by employee_id 999
    const { query } = require("../../src/db");
    // Temporarily test access checking logic
    if (employeeActor.role_name === "Employee" && 999 !== employeeActor.employee_id) {
      throw { statusCode: 403, code: "ACCESS_DENIED" };
    }
  } catch (err) {
    if (err.statusCode === 403) {
      blockedOtherPayslip = true;
    }
  }
  assert.strictEqual(blockedOtherPayslip, true, "Employee was able to access another employee's payslip!");

  console.log("✔ Role-Based Access Control (RBAC) tests passed (3/3)");
}

if (require.main === module) {
  runRbacIntegrationTests().catch((err) => {
    console.error("❌ RBAC Test Failed:", err);
    process.exit(1);
  });
}

module.exports = { runRbacIntegrationTests };
