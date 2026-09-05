const fs = require("fs");
const {
  generatePayrunPayslipsService,
  listPayslipsService,
  getPayslipByIdService,
  getPayslipPdfService,
  getEmployeePayslipsService,
  bulkEmailPayrunPayslipsService,
  sendPayslipEmailServiceWrapper,
  retryFailedPayslipEmailService,
} = require("../services/payslip.service");

async function generatePayrunPayslips(req, res, next) {
  try {
    const companyId = req.user.company_id;
    const payrunId = Number(req.params.payrunId);
    const actorUserId = req.user.user_id;

    const result = await generatePayrunPayslipsService({ companyId, payrunId, actorUserId });
    return res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function listPayslips(req, res, next) {
  try {
    const companyId = req.user.company_id;
    const filters = {
      payrun_id: req.query.payrun_id ? Number(req.query.payrun_id) : undefined,
      employee_id: req.query.employee_id ? Number(req.query.employee_id) : undefined,
      status: req.query.status || undefined,
      email_status: req.query.email_status || undefined,
    };

    const payslips = await listPayslipsService(companyId, filters);
    return res.status(200).json({
      status: "success",
      data: payslips,
    });
  } catch (error) {
    next(error);
  }
}

async function getOwnPayslips(req, res, next) {
  try {
    const companyId = req.user.company_id;
    const employeeId = req.user.employee_id;

    if (!employeeId) {
      return res.status(400).json({
        status: "error",
        message: "No employee profile associated with your user account",
        code: "NO_EMPLOYEE_PROFILE",
      });
    }

    const payslips = await getEmployeePayslipsService(companyId, employeeId, req.user);
    return res.status(200).json({
      status: "success",
      data: payslips,
    });
  } catch (error) {
    next(error);
  }
}

async function getPayslipById(req, res, next) {
  try {
    const companyId = req.user.company_id;
    const payslipId = Number(req.params.id);

    const payslip = await getPayslipByIdService(companyId, payslipId, req.user);
    return res.status(200).json({
      status: "success",
      data: payslip,
    });
  } catch (error) {
    next(error);
  }
}

async function getPayslipPdf(req, res, next) {
  try {
    const companyId = req.user.company_id;
    const payslipId = Number(req.params.id);

    const { filePath, payslip } = await getPayslipPdfService(companyId, payslipId, req.user);

    const filename = `payslip_${payslip.employee_code_snapshot || payslipId}_${payslip.period_start}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    next(error);
  }
}

async function getEmployeePayslips(req, res, next) {
  try {
    const companyId = req.user.company_id;
    const targetEmployeeId = Number(req.params.employeeId);

    const payslips = await getEmployeePayslipsService(companyId, targetEmployeeId, req.user);
    return res.status(200).json({
      status: "success",
      data: payslips,
    });
  } catch (error) {
    next(error);
  }
}

async function bulkEmailPayrunPayslips(req, res, next) {
  try {
    const companyId = req.user.company_id;
    const payrunId = Number(req.params.payrunId);
    const actorUserId = req.user.user_id;

    const result = await bulkEmailPayrunPayslipsService({ companyId, payrunId, actorUserId });
    return res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function sendSinglePayslipEmail(req, res, next) {
  try {
    const companyId = req.user.company_id;
    const payslipId = Number(req.params.id);
    const actorUserId = req.user.user_id;

    const result = await sendPayslipEmailServiceWrapper({ companyId, payslipId, actorUserId });
    return res.status(200).json({
      status: "success",
      message: "Payslip email sent successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function retryFailedPayslipEmail(req, res, next) {
  try {
    const companyId = req.user.company_id;
    const payslipId = Number(req.params.id);
    const actorUserId = req.user.user_id;

    const result = await retryFailedPayslipEmailService({ companyId, payslipId, actorUserId });
    return res.status(200).json({
      status: "success",
      message: "Payslip email retry executed successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  generatePayrunPayslips,
  listPayslips,
  getOwnPayslips,
  getPayslipById,
  getPayslipPdf,
  getEmployeePayslips,
  bulkEmailPayrunPayslips,
  sendSinglePayslipEmail,
  retryFailedPayslipEmail,
};
