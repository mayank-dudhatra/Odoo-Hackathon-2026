const {
  createPayrunService,
  listPayrunsService,
  getPayrunByIdService,
  computePayrunService,
  validatePayrunService,
  payPayrunService,
  getPayslipsForPayrunService,
  getPayslipByIdService,
  getEmployeePayslipsService,
} = require("../services/payrun.service");
const { success } = require("../utils/response");
const { AppError } = require("../utils/http");

async function createPayrun(req, res) {
  const result = await createPayrunService(req.auth.company_id, req.body, req.auth.user_id);
  return success(res, result, "Payrun created successfully", 201);
}

async function listPayruns(req, res) {
  const filters = {
    status: req.query.status || null,
    salary_structure_id: req.query.salary_structure_id ? Number(req.query.salary_structure_id) : null,
    start_date: req.query.start_date || null,
    end_date: req.query.end_date || null,
  };
  const result = await listPayrunsService(req.auth.company_id, filters);
  return success(res, result, "Payruns fetched successfully");
}

async function getPayrunById(req, res) {
  const result = await getPayrunByIdService(req.auth.company_id, Number(req.params.id));
  return success(res, result, "Payrun fetched successfully");
}

async function computePayrun(req, res) {
  const result = await computePayrunService({
    actor: req.auth,
    payrunId: Number(req.params.id),
  });
  return success(res, result, "Payrun computed successfully");
}

async function validatePayrun(req, res) {
  const result = await validatePayrunService({
    actor: req.auth,
    payrunId: Number(req.params.id),
  });
  return success(res, result, "Payrun validated successfully");
}

async function payPayrun(req, res) {
  const result = await payPayrunService({
    actor: req.auth,
    payrunId: Number(req.params.id),
  });
  return success(res, result, "Payrun marked as paid successfully");
}

async function getPayslipsForPayrun(req, res) {
  const result = await getPayslipsForPayrunService(req.auth.company_id, Number(req.params.id));
  return success(res, result, "Payrun payslips fetched successfully");
}

async function getPayslipById(req, res) {
  const result = await getPayslipByIdService(req.auth.company_id, Number(req.params.id));
  return success(res, result, "Payslip details fetched successfully");
}

async function getEmployeePayslips(req, res) {
  const result = await getEmployeePayslipsService(req.auth.company_id, Number(req.params.employeeId));
  return success(res, result, "Employee payslips fetched successfully");
}

async function getOwnPayslips(req, res) {
  if (!req.auth.employee_id) {
    throw new AppError(400, "Authenticated user is not linked to an employee record", "EMPLOYEE_NOT_LINKED");
  }
  const result = await getEmployeePayslipsService(req.auth.company_id, req.auth.employee_id);
  return success(res, result, "Your payslips fetched successfully");
}

module.exports = {
  createPayrun,
  listPayruns,
  getPayrunById,
  computePayrun,
  validatePayrun,
  payPayrun,
  getPayslipsForPayrun,
  getPayslipById,
  getEmployeePayslips,
  getOwnPayslips,
};
