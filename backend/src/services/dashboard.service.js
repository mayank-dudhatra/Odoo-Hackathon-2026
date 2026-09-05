const {
  getPayrollDashboardMetrics,
  getHrDashboardMetrics,
  getTimeDashboardMetrics,
  getCostDashboardMetrics,
} = require("../repositories/dashboard.repository");
const { getAllDashboardWarningsService } = require("./warning.service");
const { createAuditLog } = require("./audit.service");
const { AppError } = require("../utils/http");

function assertManagementRole(actorUser) {
  if (actorUser.role_name === "Employee") {
    throw new AppError(403, "Access denied. Employees cannot access management dashboard analytics.", "ACCESS_DENIED");
  }
}

async function getPayrollDashboardService(companyId, filters, actorUser) {
  assertManagementRole(actorUser);
  const metrics = await getPayrollDashboardMetrics(companyId, filters);

  await createAuditLog({
    companyId,
    userId: actorUser.user_id,
    module: "DASHBOARD",
    action: "DASHBOARD_ACCESSED",
    details: { dashboard_type: "PAYROLL", filters },
  });

  return metrics;
}

async function getHrDashboardService(companyId, filters, actorUser) {
  assertManagementRole(actorUser);
  const metrics = await getHrDashboardMetrics(companyId, filters);

  await createAuditLog({
    companyId,
    userId: actorUser.user_id,
    module: "DASHBOARD",
    action: "DASHBOARD_ACCESSED",
    details: { dashboard_type: "HR", filters },
  });

  return metrics;
}

async function getAttendanceDashboardService(companyId, filters, actorUser) {
  assertManagementRole(actorUser);
  const metrics = await getTimeDashboardMetrics(companyId, filters);

  await createAuditLog({
    companyId,
    userId: actorUser.user_id,
    module: "DASHBOARD",
    action: "DASHBOARD_ACCESSED",
    details: { dashboard_type: "ATTENDANCE", filters },
  });

  return metrics.attendance_health;
}

async function getTimeOffDashboardService(companyId, filters, actorUser) {
  assertManagementRole(actorUser);
  const metrics = await getTimeDashboardMetrics(companyId, filters);

  await createAuditLog({
    companyId,
    userId: actorUser.user_id,
    module: "DASHBOARD",
    action: "DASHBOARD_ACCESSED",
    details: { dashboard_type: "TIME_OFF", filters },
  });

  return metrics.time_off;
}

async function getOverallManagementDashboardService(companyId, filters, actorUser) {
  assertManagementRole(actorUser);

  const payroll = await getPayrollDashboardMetrics(companyId, filters);
  const hr = await getHrDashboardMetrics(companyId, filters);
  const time = await getTimeDashboardMetrics(companyId, filters);
  const costs = await getCostDashboardMetrics(companyId, filters);
  const warnings = await getAllDashboardWarningsService(companyId, actorUser);

  await createAuditLog({
    companyId,
    userId: actorUser.user_id,
    module: "DASHBOARD",
    action: "DASHBOARD_ACCESSED",
    details: { dashboard_type: "OVERALL_MANAGEMENT", filters },
  });

  return {
    payroll,
    hr,
    time_off: time.time_off,
    attendance_health: time.attendance_health,
    costs,
    warnings,
  };
}

module.exports = {
  getPayrollDashboardService,
  getHrDashboardService,
  getAttendanceDashboardService,
  getTimeOffDashboardService,
  getOverallManagementDashboardService,
};
