const {
  createLeaveTypeService,
  listLeaveTypesService,
  getLeaveTypeByIdService,
  updateLeaveTypeService,
  deactivateLeaveTypeService,
  createAllocationService,
  listAllocationsService,
  getAllocationByIdService,
  getEmployeeLeaveBalancesService,
  createLeaveRequestService,
  listLeaveRequestsService,
  getLeaveRequestByIdService,
  approveLeaveRequestService,
  refuseLeaveRequestService,
  cancelLeaveRequestService,
  getPayrollApprovedLeavesService,
} = require("../services/leave.service");
const { success } = require("../utils/response");
const { AppError } = require("../utils/http");

async function createLeaveType(req, res) {
  const result = await createLeaveTypeService(req.auth.company_id, req.body, req.auth.user_id);
  return success(res, result, "Leave type created successfully", 201);
}

async function listLeaveTypes(req, res) {
  const is_active = req.query.is_active !== undefined ? req.query.is_active === "true" : null;
  const result = await listLeaveTypesService(req.auth.company_id, { is_active });
  return success(res, result, "Leave types fetched successfully");
}

async function getLeaveTypeById(req, res) {
  const result = await getLeaveTypeByIdService(req.auth.company_id, Number(req.params.id));
  return success(res, result, "Leave type fetched successfully");
}

async function updateLeaveType(req, res) {
  const result = await updateLeaveTypeService(req.auth.company_id, Number(req.params.id), req.body, req.auth.user_id);
  return success(res, result, "Leave type updated successfully");
}

async function deactivateLeaveType(req, res) {
  const result = await deactivateLeaveTypeService(req.auth.company_id, Number(req.params.id), req.auth.user_id);
  return success(res, result, "Leave type deactivated successfully");
}

async function createAllocation(req, res) {
  const result = await createAllocationService(req.auth.company_id, req.body, req.auth.user_id);
  return success(res, result, "Leave allocation created successfully", 201);
}

async function listAllocations(req, res) {
  const filters = {
    employee_id: req.query.employee_id ? Number(req.query.employee_id) : null,
    leave_type_id: req.query.leave_type_id ? Number(req.query.leave_type_id) : null,
    year: req.query.year ? Number(req.query.year) : null,
    status: req.query.status || null,
  };
  const result = await listAllocationsService(req.auth.company_id, filters);
  return success(res, result, "Leave allocations fetched successfully");
}

async function getAllocationById(req, res) {
  const result = await getAllocationByIdService(req.auth.company_id, Number(req.params.id));
  return success(res, result, "Leave allocation fetched successfully");
}

async function getEmployeeLeaveBalances(req, res) {
  const employeeId = Number(req.params.employeeId);
  const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
  const result = await getEmployeeLeaveBalancesService(req.auth.company_id, employeeId, year);
  return success(res, result, "Leave balances fetched successfully");
}

async function getOwnLeaveBalances(req, res) {
  if (!req.auth.employee_id) {
    throw new AppError(400, "Authenticated user is not linked to an employee record", "EMPLOYEE_NOT_LINKED");
  }
  const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
  const result = await getEmployeeLeaveBalancesService(req.auth.company_id, req.auth.employee_id, year);
  return success(res, result, "Your leave balances fetched successfully");
}

async function createLeaveRequest(req, res) {
  const result = await createLeaveRequestService({
    actor: req.auth,
    payload: req.body,
  });
  return success(res, result, "Leave request submitted successfully", 201);
}

async function listLeaveRequests(req, res) {
  const filters = {
    employee_id: req.query.employee_id ? Number(req.query.employee_id) : null,
    leave_type_id: req.query.leave_type_id ? Number(req.query.leave_type_id) : null,
    status: req.query.status || null,
    start_date: req.query.start_date || null,
    end_date: req.query.end_date || null,
  };
  const result = await listLeaveRequestsService({
    actor: req.auth,
    filters,
  });
  return success(res, result, "Leave requests fetched successfully");
}

async function getOwnLeaveRequests(req, res) {
  if (!req.auth.employee_id) {
    throw new AppError(400, "Authenticated user is not linked to an employee record", "EMPLOYEE_NOT_LINKED");
  }
  const filters = {
    employee_id: req.auth.employee_id,
    leave_type_id: req.query.leave_type_id ? Number(req.query.leave_type_id) : null,
    status: req.query.status || null,
    start_date: req.query.start_date || null,
    end_date: req.query.end_date || null,
  };
  const result = await listLeaveRequestsService({
    actor: req.auth,
    filters,
  });
  return success(res, result, "Your leave requests fetched successfully");
}

async function getLeaveRequestById(req, res) {
  const result = await getLeaveRequestByIdService({
    actor: req.auth,
    requestId: Number(req.params.id),
  });
  return success(res, result, "Leave request fetched successfully");
}

async function approveLeaveRequest(req, res) {
  const result = await approveLeaveRequestService({
    actor: req.auth,
    requestId: Number(req.params.id),
  });
  return success(res, result, "Leave request approved successfully");
}

async function refuseLeaveRequest(req, res) {
  const result = await refuseLeaveRequestService({
    actor: req.auth,
    requestId: Number(req.params.id),
  });
  return success(res, result, "Leave request refused successfully");
}

async function cancelLeaveRequest(req, res) {
  const result = await cancelLeaveRequestService({
    actor: req.auth,
    requestId: Number(req.params.id),
  });
  return success(res, result, "Leave request cancelled successfully");
}

async function getPayrollApprovedLeaves(req, res) {
  const periodStart = req.query.period_start;
  const periodEnd = req.query.period_end;
  const employeeId = req.query.employee_id ? Number(req.query.employee_id) : null;
  const result = await getPayrollApprovedLeavesService({
    companyId: req.auth.company_id,
    periodStart,
    periodEnd,
    employeeId,
  });
  return success(res, result, "Approved leave data for payroll integration fetched successfully");
}

module.exports = {
  createLeaveType,
  listLeaveTypes,
  getLeaveTypeById,
  updateLeaveType,
  deactivateLeaveType,
  createAllocation,
  listAllocations,
  getAllocationById,
  getEmployeeLeaveBalances,
  getOwnLeaveBalances,
  createLeaveRequest,
  listLeaveRequests,
  getOwnLeaveRequests,
  getLeaveRequestById,
  approveLeaveRequest,
  refuseLeaveRequest,
  cancelLeaveRequest,
  getPayrollApprovedLeaves,
};
