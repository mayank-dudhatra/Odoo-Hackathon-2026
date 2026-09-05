const {
  getEmployeeReport,
  getPayrollReport,
  getSalaryCostReport,
  getAttendanceReport,
  getLeaveReport,
  getPayslipReport,
} = require("../repositories/report.repository");
const { getContractAttentionWarnings } = require("../repositories/warning.repository");
const { createAuditLog } = require("./audit.service");
const { AppError } = require("../utils/http");

function assertReportAccess(actorUser, permissionModule = "REPORTS") {
  if (actorUser.role_name === "Employee") {
    throw new AppError(403, "Access denied. Employees are not authorized to view management reports.", "ACCESS_DENIED");
  }
}

async function getEmployeeReportService(companyId, filters, pagination, actorUser) {
  assertReportAccess(actorUser);
  const report = await getEmployeeReport(companyId, filters, pagination);

  await createAuditLog({
    companyId,
    userId: actorUser.user_id,
    module: "REPORTS",
    action: "REPORT_ACCESSED",
    details: { report_type: "EMPLOYEE", filters },
  });

  return report;
}

async function getPayrollReportService(companyId, filters, pagination, actorUser) {
  assertReportAccess(actorUser);
  const report = await getPayrollReport(companyId, filters, pagination);

  await createAuditLog({
    companyId,
    userId: actorUser.user_id,
    module: "REPORTS",
    action: "REPORT_ACCESSED",
    details: { report_type: "PAYROLL", filters },
  });

  return report;
}

async function getSalaryCostReportService(companyId, filters, actorUser) {
  assertReportAccess(actorUser);
  const report = await getSalaryCostReport(companyId, filters);

  await createAuditLog({
    companyId,
    userId: actorUser.user_id,
    module: "REPORTS",
    action: "REPORT_ACCESSED",
    details: { report_type: "SALARY_COST", filters },
  });

  return report;
}

async function getAttendanceReportService(companyId, filters, pagination, actorUser) {
  assertReportAccess(actorUser);
  const report = await getAttendanceReport(companyId, filters, pagination);

  await createAuditLog({
    companyId,
    userId: actorUser.user_id,
    module: "REPORTS",
    action: "REPORT_ACCESSED",
    details: { report_type: "ATTENDANCE", filters },
  });

  return report;
}

async function getLeaveReportService(companyId, filters, pagination, actorUser) {
  assertReportAccess(actorUser);
  const report = await getLeaveReport(companyId, filters, pagination);

  await createAuditLog({
    companyId,
    userId: actorUser.user_id,
    module: "REPORTS",
    action: "REPORT_ACCESSED",
    details: { report_type: "TIME_OFF", filters },
  });

  return report;
}

async function getPayslipReportService(companyId, filters, pagination, actorUser) {
  assertReportAccess(actorUser);
  const report = await getPayslipReport(companyId, filters, pagination);

  await createAuditLog({
    companyId,
    userId: actorUser.user_id,
    module: "REPORTS",
    action: "REPORT_ACCESSED",
    details: { report_type: "PAYSLIP", filters },
  });

  return report;
}

async function getDepartmentSalaryReportService(companyId, filters, actorUser) {
  assertReportAccess(actorUser);
  const report = await getSalaryCostReport(companyId, filters);

  await createAuditLog({
    companyId,
    userId: actorUser.user_id,
    module: "REPORTS",
    action: "REPORT_ACCESSED",
    details: { report_type: "DEPARTMENT_SALARY", filters },
  });

  return report.by_department;
}

async function getContractAttentionReportService(companyId, filters, actorUser) {
  assertReportAccess(actorUser);
  const report = await getContractAttentionWarnings(companyId);

  await createAuditLog({
    companyId,
    userId: actorUser.user_id,
    module: "REPORTS",
    action: "REPORT_ACCESSED",
    details: { report_type: "CONTRACT_ATTENTION", filters },
  });

  return report;
}

module.exports = {
  getEmployeeReportService,
  getPayrollReportService,
  getSalaryCostReportService,
  getAttendanceReportService,
  getLeaveReportService,
  getPayslipReportService,
  getDepartmentSalaryReportService,
  getContractAttentionReportService,
};
