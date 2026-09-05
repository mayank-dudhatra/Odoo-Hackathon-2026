const {
  getPayrollDashboardService,
  getHrDashboardService,
  getAttendanceDashboardService,
  getTimeOffDashboardService,
  getOverallManagementDashboardService,
} = require("../services/dashboard.service");
const { getAllDashboardWarningsService } = require("../services/warning.service");

function extractFilters(req) {
  return {
    start_date: req.query.start_date || undefined,
    end_date: req.query.end_date || undefined,
    department_id: req.query.department_id ? Number(req.query.department_id) : undefined,
    employee_type_id: req.query.employee_type_id ? Number(req.query.employee_type_id) : undefined,
    employee_id: req.query.employee_id ? Number(req.query.employee_id) : undefined,
    status: req.query.status || undefined,
  };
}

async function getOverallDashboard(req, res, next) {
  try {
    const companyId = req.user.company_id;
    const filters = extractFilters(req);

    const result = await getOverallManagementDashboardService(companyId, filters, req.user);
    return res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getPayrollDashboard(req, res, next) {
  try {
    const companyId = req.user.company_id;
    const filters = extractFilters(req);

    const result = await getPayrollDashboardService(companyId, filters, req.user);
    return res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getHrDashboard(req, res, next) {
  try {
    const companyId = req.user.company_id;
    const filters = extractFilters(req);

    const result = await getHrDashboardService(companyId, filters, req.user);
    return res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getAttendanceDashboard(req, res, next) {
  try {
    const companyId = req.user.company_id;
    const filters = extractFilters(req);

    const result = await getAttendanceDashboardService(companyId, filters, req.user);
    return res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getTimeOffDashboard(req, res, next) {
  try {
    const companyId = req.user.company_id;
    const filters = extractFilters(req);

    const result = await getTimeOffDashboardService(companyId, filters, req.user);
    return res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getWarningsDashboard(req, res, next) {
  try {
    const companyId = req.user.company_id;
    const result = await getAllDashboardWarningsService(companyId, req.user);
    return res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getOverallDashboard,
  getPayrollDashboard,
  getHrDashboard,
  getAttendanceDashboard,
  getTimeOffDashboard,
  getWarningsDashboard,
};
