const {
  getEmployeeReportService,
  getPayrollReportService,
  getSalaryCostReportService,
  getAttendanceReportService,
  getLeaveReportService,
  getPayslipReportService,
  getDepartmentSalaryReportService,
  getContractAttentionReportService,
} = require("../services/report.service");

function extractParams(req) {
  const filters = {
    start_date: req.query.start_date || undefined,
    end_date: req.query.end_date || undefined,
    department_id: req.query.department_id ? Number(req.query.department_id) : undefined,
    employee_type_id: req.query.employee_type_id ? Number(req.query.employee_type_id) : undefined,
    employee_id: req.query.employee_id ? Number(req.query.employee_id) : undefined,
    payrun_id: req.query.payrun_id ? Number(req.query.payrun_id) : undefined,
    status: req.query.status || undefined,
    email_status: req.query.email_status || undefined,
  };

  const pagination = {
    page: req.query.page ? Number(req.query.page) : 1,
    limit: req.query.limit ? Number(req.query.limit) : 20,
  };

  return { filters, pagination };
}

async function getEmployeeReport(req, res, next) {
  try {
    const companyId = req.user.company_id;
    const { filters, pagination } = extractParams(req);

    const result = await getEmployeeReportService(companyId, filters, pagination, req.user);
    return res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getPayrollReport(req, res, next) {
  try {
    const companyId = req.user.company_id;
    const { filters, pagination } = extractParams(req);

    const result = await getPayrollReportService(companyId, filters, pagination, req.user);
    return res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getSalaryCostReport(req, res, next) {
  try {
    const companyId = req.user.company_id;
    const { filters } = extractParams(req);

    const result = await getSalaryCostReportService(companyId, filters, req.user);
    return res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getAttendanceReport(req, res, next) {
  try {
    const companyId = req.user.company_id;
    const { filters, pagination } = extractParams(req);

    const result = await getAttendanceReportService(companyId, filters, pagination, req.user);
    return res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getLeaveReport(req, res, next) {
  try {
    const companyId = req.user.company_id;
    const { filters, pagination } = extractParams(req);

    const result = await getLeaveReportService(companyId, filters, pagination, req.user);
    return res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getPayslipReport(req, res, next) {
  try {
    const companyId = req.user.company_id;
    const { filters, pagination } = extractParams(req);

    const result = await getPayslipReportService(companyId, filters, pagination, req.user);
    return res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getDepartmentSalaryReport(req, res, next) {
  try {
    const companyId = req.user.company_id;
    const { filters } = extractParams(req);

    const result = await getDepartmentSalaryReportService(companyId, filters, req.user);
    return res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getContractAttentionReport(req, res, next) {
  try {
    const companyId = req.user.company_id;
    const { filters } = extractParams(req);

    const result = await getContractAttentionReportService(companyId, filters, req.user);
    return res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getEmployeeReport,
  getPayrollReport,
  getSalaryCostReport,
  getAttendanceReport,
  getLeaveReport,
  getPayslipReport,
  getDepartmentSalaryReport,
  getContractAttentionReport,
};
