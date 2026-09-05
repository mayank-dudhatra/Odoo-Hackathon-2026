const {
  getCurrentCompany,
  updateCurrentCompany,
  listCompanyDepartments,
  getCompanyDepartment,
  createCompanyDepartment,
  updateCompanyDepartment,
  deactivateCompanyDepartment,
  listCompanyPositions,
  getCompanyPosition,
  createCompanyPosition,
  updateCompanyPosition,
  deactivateCompanyPosition,
  listCompanyEmployeeTypes,
  getCompanyEmployeeType,
  createCompanyEmployeeType,
  updateCompanyEmployeeType,
  setCompanyEmployeeTypeActive,
  createEmployeeRecord,
  listEmployeeRecords,
  getEmployeeRecord,
  updateEmployeeRecord,
  changeEmployeeStatusRecord,
  getMyEmployeeRecord,
} = require("../services/organization.service");
const { success } = require("../utils/response");

async function currentCompany(req, res) {
  return success(res, await getCurrentCompany(req.auth), "Company fetched");
}

async function updateCompanyDetails(req, res) {
  return success(res, await updateCurrentCompany(req.auth, req.body), "Company updated");
}

async function listDepartments(req, res) {
  return success(res, await listCompanyDepartments(req.auth), "Departments fetched");
}

async function getDepartment(req, res) {
  return success(res, await getCompanyDepartment(req.auth, req.params.id), "Department fetched");
}

async function createDepartment(req, res) {
  return success(res, await createCompanyDepartment(req.auth, req.body), "Department created", 201);
}

async function updateDepartment(req, res) {
  return success(res, await updateCompanyDepartment(req.auth, req.params.id, req.body), "Department updated");
}

async function deactivateDepartment(req, res) {
  return success(res, await deactivateCompanyDepartment(req.auth, req.params.id), "Department deactivated");
}

async function listPositions(req, res) {
  return success(res, await listCompanyPositions(req.auth), "Positions fetched");
}

async function getPosition(req, res) {
  return success(res, await getCompanyPosition(req.auth, req.params.id), "Position fetched");
}

async function createPosition(req, res) {
  return success(res, await createCompanyPosition(req.auth, req.body), "Position created", 201);
}

async function updatePosition(req, res) {
  return success(res, await updateCompanyPosition(req.auth, req.params.id, req.body), "Position updated");
}

async function deactivatePosition(req, res) {
  return success(res, await deactivateCompanyPosition(req.auth, req.params.id), "Position deactivated");
}

async function listEmployeeTypes(req, res) {
  return success(res, await listCompanyEmployeeTypes(req.auth), "Employee types fetched");
}

async function getEmployeeType(req, res) {
  return success(res, await getCompanyEmployeeType(req.auth, req.params.id), "Employee type fetched");
}

async function createEmployeeType(req, res) {
  return success(res, await createCompanyEmployeeType(req.auth, req.body), "Employee type created", 201);
}

async function updateEmployeeType(req, res) {
  return success(res, await updateCompanyEmployeeType(req.auth, req.params.id, req.body), "Employee type updated");
}

async function setEmployeeTypeStatus(req, res) {
  return success(res, await setCompanyEmployeeTypeActive(req.auth, req.params.id, req.body.is_active), "Employee type updated");
}

async function listEmployees(req, res) {
  return success(res, await listEmployeeRecords(req.auth, req.query, { page: req.query.page, limit: req.query.limit }, { column: req.query.sortBy, order: req.query.sortOrder }), "Employees fetched");
}

async function getEmployee(req, res) {
  return success(res, await getEmployeeRecord(req.auth, req.params.id), "Employee fetched");
}

async function myEmployee(req, res) {
  return success(res, await getMyEmployeeRecord(req.auth), "Employee profile fetched");
}

async function createEmployee(req, res) {
  return success(res, await createEmployeeRecord(req.auth, req.body), "Employee created", 201);
}

async function updateEmployee(req, res) {
  return success(res, await updateEmployeeRecord(req.auth, req.params.id, req.body), "Employee updated");
}

async function changeEmployeeStatus(req, res) {
  return success(res, await changeEmployeeStatusRecord(req.auth, req.params.id, req.body.status), "Employee status updated");
}

module.exports = {
  currentCompany,
  updateCompanyDetails,
  listDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deactivateDepartment,
  listPositions,
  getPosition,
  createPosition,
  updatePosition,
  deactivatePosition,
  listEmployeeTypes,
  getEmployeeType,
  createEmployeeType,
  updateEmployeeType,
  setEmployeeTypeStatus,
  listEmployees,
  getEmployee,
  myEmployee,
  createEmployee,
  updateEmployee,
  changeEmployeeStatus,
};
