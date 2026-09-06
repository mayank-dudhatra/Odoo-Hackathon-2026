const {
  getPayrollDashboardMetrics,
  getHrDashboardMetrics,
  getTimeDashboardMetrics,
  getCostDashboardMetrics,
} = require("../repositories/dashboard.repository");
const { getAllDashboardWarningsService } = require("./warning.service");
const { createAuditLog } = require("./audit.service");
const { AppError } = require("../utils/http");
const { dashboardCache } = require("../utils/cache");

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

  const cacheKey = `dashboard:overall:${companyId}:${JSON.stringify(filters)}`;
  const cached = dashboardCache.get(cacheKey);
  if (cached) return cached;

  const [payroll, hr, time, costs, warnings] = await Promise.all([
    getPayrollDashboardMetrics(companyId, filters),
    getHrDashboardMetrics(companyId, filters),
    getTimeDashboardMetrics(companyId, filters),
    getCostDashboardMetrics(companyId, filters),
    getAllDashboardWarningsService(companyId, actorUser),
  ]);

  // Non-blocking audit log
  createAuditLog({
    companyId,
    userId: actorUser.user_id,
    module: "DASHBOARD",
    action: "DASHBOARD_ACCESSED",
    details: { dashboard_type: "OVERALL_MANAGEMENT", filters },
  }).catch(() => {});

  const data = {
    payroll,
    hr,
    time_off: time.time_off,
    attendance_health: time.attendance_health,
    costs,
    warnings,
  };

  dashboardCache.set(cacheKey, data, 20);
  return data;
}

module.exports = {
  getPayrollDashboardService,
  getHrDashboardService,
  getAttendanceDashboardService,
  getTimeOffDashboardService,
  getOverallManagementDashboardService,
};
