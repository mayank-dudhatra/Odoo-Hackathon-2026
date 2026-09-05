const { withTransaction } = require("../db");
const { AppError } = require("../utils/http");
const { createAuditLog } = require("./audit.service");
const {
  createLeaveType,
  findLeaveTypeById,
  findLeaveTypeByName,
  listLeaveTypes,
  updateLeaveType,
  deactivateLeaveType,
} = require("../repositories/leave-type.repository");
const {
  createAllocation,
  findAllocationById,
  findAllocationForUpdate,
  findActiveAllocation,
  listAllocations,
  updateAllocationUsedDays,
  updateAllocationStatus,
} = require("../repositories/leave-allocation.repository");
const {
  createLeaveRequest,
  findLeaveRequestById,
  findLeaveRequestForUpdate,
  listLeaveRequests,
  updateLeaveRequestStatus,
  checkOverlappingLeaveRequest,
  getApprovedLeavesForPayroll,
} = require("../repositories/leave-request.repository");
const { query } = require("../db");

// --- LEAVE TYPES SERVICES ---

async function createLeaveTypeService(companyId, payload, actorUserId) {
  const existing = await findLeaveTypeByName(null, companyId, payload.name);
  if (existing) {
    throw new AppError(409, "A leave type with this name already exists for your company", "DUPLICATE_LEAVE_TYPE");
  }

  const leaveType = await createLeaveType(null, {
    company_id: companyId,
    ...payload,
  });

  await createAuditLog({
    companyId,
    userId: actorUserId,
    module: "LEAVE",
    action: "LEAVE_TYPE_CREATED",
    recordId: leaveType.leave_type_id,
    details: { name: leaveType.name, unit: leaveType.unit },
  });

  return leaveType;
}

async function listLeaveTypesService(companyId, filters) {
  return listLeaveTypes(null, companyId, filters);
}

async function getLeaveTypeByIdService(companyId, leaveTypeId) {
  const leaveType = await findLeaveTypeById(null, companyId, leaveTypeId);
  if (!leaveType) {
    throw new AppError(404, "Leave type not found", "LEAVE_TYPE_NOT_FOUND");
  }
  return leaveType;
}

async function updateLeaveTypeService(companyId, leaveTypeId, payload, actorUserId) {
  const leaveType = await findLeaveTypeById(null, companyId, leaveTypeId);
  if (!leaveType) {
    throw new AppError(404, "Leave type not found", "LEAVE_TYPE_NOT_FOUND");
  }

  if (payload.name && payload.name.toLowerCase() !== leaveType.name.toLowerCase()) {
    const existing = await findLeaveTypeByName(null, companyId, payload.name);
    if (existing && existing.leave_type_id !== leaveTypeId) {
      throw new AppError(409, "A leave type with this name already exists", "DUPLICATE_LEAVE_TYPE");
    }
  }

  const updated = await updateLeaveType(null, companyId, leaveTypeId, payload);

  await createAuditLog({
    companyId,
    userId: actorUserId,
    module: "LEAVE",
    action: "LEAVE_TYPE_UPDATED",
    recordId: leaveTypeId,
    details: payload,
  });

  return updated;
}

async function deactivateLeaveTypeService(companyId, leaveTypeId, actorUserId) {
  const leaveType = await findLeaveTypeById(null, companyId, leaveTypeId);
  if (!leaveType) {
    throw new AppError(404, "Leave type not found", "LEAVE_TYPE_NOT_FOUND");
  }

  const deactivated = await deactivateLeaveType(null, companyId, leaveTypeId);

  await createAuditLog({
    companyId,
    userId: actorUserId,
    module: "LEAVE",
    action: "LEAVE_TYPE_DEACTIVATED",
    recordId: leaveTypeId,
  });

  return deactivated;
}

// --- LEAVE ALLOCATION SERVICES ---

async function createAllocationService(companyId, payload, actorUserId) {
  const leaveType = await findLeaveTypeById(null, companyId, payload.leave_type_id);
  if (!leaveType) {
    throw new AppError(404, "Leave type not found", "LEAVE_TYPE_NOT_FOUND");
  }

  // Check employee belongs to company
  const empCheck = await query(
    `SELECT employee_id FROM employees WHERE company_id = $1 AND employee_id = $2 LIMIT 1`,
    [companyId, payload.employee_id]
  );
  if (empCheck.rows.length === 0) {
    throw new AppError(404, "Employee not found", "EMPLOYEE_NOT_FOUND");
  }

  const existingAlloc = await findActiveAllocation(
    null,
    companyId,
    payload.employee_id,
    payload.leave_type_id,
    payload.year
  );
  if (existingAlloc) {
    throw new AppError(409, "An allocation for this employee, leave type and year already exists", "DUPLICATE_ALLOCATION");
  }

  const allocation = await createAllocation(null, {
    company_id: companyId,
    ...payload,
    approved_by: actorUserId,
  });

  await createAuditLog({
    companyId,
    userId: actorUserId,
    module: "LEAVE",
    action: "LEAVE_ALLOCATION_CREATED",
    recordId: allocation.allocation_id,
    details: {
      employee_id: allocation.employee_id,
      leave_type_id: allocation.leave_type_id,
      year: allocation.year,
      allocated_days: allocation.allocated_days,
    },
  });

  return getAllocationByIdService(companyId, allocation.allocation_id);
}

async function listAllocationsService(companyId, filters) {
  return listAllocations(null, companyId, filters);
}

async function getAllocationByIdService(companyId, allocationId) {
  const allocation = await findAllocationById(null, companyId, allocationId);
  if (!allocation) {
    throw new AppError(404, "Leave allocation not found", "ALLOCATION_NOT_FOUND");
  }
  return allocation;
}

async function getEmployeeLeaveBalancesService(companyId, employeeId, year = new Date().getFullYear()) {
  // Verify employee exists in company
  const empResult = await query(
    `SELECT employee_id, first_name, last_name, employee_code FROM employees WHERE company_id = $1 AND employee_id = $2 LIMIT 1`,
    [companyId, employeeId]
  );
  if (empResult.rows.length === 0) {
    throw new AppError(404, "Employee not found", "EMPLOYEE_NOT_FOUND");
  }

  const leaveTypes = await listLeaveTypes(null, companyId, { is_active: true });
  const allocations = await listAllocations(null, companyId, { employee_id: employeeId, year: Number(year), status: "APPROVED" });

  const balances = leaveTypes.map((lt) => {
    const alloc = allocations.find((a) => a.leave_type_id === lt.leave_type_id);
    const allocated = alloc ? Number(alloc.allocated_days) : (lt.requires_allocation ? 0 : null);
    const used = alloc ? Number(alloc.used_days) : 0;
    const remaining = alloc ? (allocated - used) : (lt.requires_allocation ? 0 : null);

    return {
      leave_type_id: lt.leave_type_id,
      leave_type_name: lt.name,
      unit: lt.unit,
      requires_allocation: lt.requires_allocation,
      is_paid: lt.is_paid,
      payroll_integration: lt.payroll_integration,
      year: Number(year),
      allocated,
      used,
      remaining,
      allocation_status: alloc ? alloc.status : (lt.requires_allocation ? "NONE" : "NOT_REQUIRED"),
    };
  });

  return {
    employee: empResult.rows[0],
    year: Number(year),
    balances,
  };
}

// --- LEAVE REQUEST SERVICES ---

async function createLeaveRequestService({ actor, payload }) {
  const companyId = actor.company_id;
  let targetEmployeeId = payload.employee_id;

  if (actor.employee_id && (!targetEmployeeId || actor.role_name === "Employee")) {
    targetEmployeeId = actor.employee_id;
  }

  if (!targetEmployeeId) {
    throw new AppError(400, "Employee ID is required", "EMPLOYEE_ID_REQUIRED");
  }

  // Validate employee belongs to company
  const empResult = await query(
    `SELECT employee_id FROM employees WHERE company_id = $1 AND employee_id = $2 LIMIT 1`,
    [companyId, targetEmployeeId]
  );
  if (empResult.rows.length === 0) {
    throw new AppError(404, "Employee not found", "EMPLOYEE_NOT_FOUND");
  }

  const leaveType = await findLeaveTypeById(null, companyId, payload.leave_type_id);
  if (!leaveType) {
    throw new AppError(404, "Leave type not found", "LEAVE_TYPE_NOT_FOUND");
  }

  if (!leaveType.is_active) {
    throw new AppError(400, "Selected leave type is inactive", "LEAVE_TYPE_INACTIVE");
  }

  // Check overlapping leave requests
  const hasOverlap = await checkOverlappingLeaveRequest(
    null,
    companyId,
    targetEmployeeId,
    payload.start_date,
    payload.end_date
  );
  if (hasOverlap) {
    throw new AppError(409, "You already have a pending or approved leave request overlapping these dates", "OVERLAPPING_LEAVE_REQUEST");
  }

  const requestYear = new Date(payload.start_date).getFullYear();

  // If allocation required, check sufficient remaining balance
  if (leaveType.requires_allocation) {
    const alloc = await findActiveAllocation(null, companyId, targetEmployeeId, leaveType.leave_type_id, requestYear);
    if (!alloc) {
      throw new AppError(400, `No active leave allocation found for ${leaveType.name} in year ${requestYear}`, "NO_LEAVE_ALLOCATION");
    }

    const remaining = Number(alloc.allocated_days) - Number(alloc.used_days);
    if (Number(payload.days_requested) > remaining) {
      throw new AppError(400, `Insufficient ${leaveType.name} balance. Available: ${remaining} ${leaveType.unit.toLowerCase()}, Requested: ${payload.days_requested}`, "INSUFFICIENT_LEAVE_BALANCE");
    }
  }

  const request = await createLeaveRequest(null, {
    company_id: companyId,
    employee_id: targetEmployeeId,
    leave_type_id: payload.leave_type_id,
    start_date: payload.start_date,
    end_date: payload.end_date,
    days_requested: payload.days_requested,
    reason: payload.reason || null,
    status: "PENDING",
  });

  await createAuditLog({
    companyId,
    userId: actor.user_id,
    module: "LEAVE",
    action: "LEAVE_REQUEST_CREATED",
    recordId: request.leave_request_id,
    details: {
      employee_id: targetEmployeeId,
      leave_type_id: payload.leave_type_id,
      start_date: payload.start_date,
      end_date: payload.end_date,
      days_requested: payload.days_requested,
    },
  });

  return findLeaveRequestById(null, companyId, request.leave_request_id);
}

async function listLeaveRequestsService({ actor, filters }) {
  const companyId = actor.company_id;
  const cleanFilters = { ...filters };

  if (actor.role_name === "Employee" && actor.employee_id) {
    cleanFilters.employee_id = actor.employee_id;
  }

  return listLeaveRequests(null, companyId, cleanFilters);
}

async function getLeaveRequestByIdService({ actor, requestId }) {
  const companyId = actor.company_id;
  const request = await findLeaveRequestById(null, companyId, requestId);

  if (!request) {
    throw new AppError(404, "Leave request not found", "LEAVE_REQUEST_NOT_FOUND");
  }

  if (actor.role_name === "Employee" && actor.employee_id && request.employee_id !== actor.employee_id) {
    throw new AppError(403, "Access denied to other employees' leave requests", "ACCESS_DENIED");
  }

  return request;
}

async function approveLeaveRequestService({ actor, requestId }) {
  const companyId = actor.company_id;

  return withTransaction(async (client) => {
    const request = await findLeaveRequestForUpdate(client, companyId, requestId);
    if (!request) {
      throw new AppError(404, "Leave request not found", "LEAVE_REQUEST_NOT_FOUND");
    }

    if (request.status !== "PENDING") {
      throw new AppError(400, `Cannot approve request with status '${request.status}'`, "INVALID_REQUEST_STATUS");
    }

    const requestYear = new Date(request.start_date).getFullYear();

    if (request.requires_allocation) {
      const alloc = await findActiveAllocation(
        client,
        companyId,
        request.employee_id,
        request.leave_type_id,
        requestYear
      );

      if (!alloc) {
        throw new AppError(400, "No active leave allocation found for approval", "NO_LEAVE_ALLOCATION");
      }

      // Lock allocation record for update
      const lockedAlloc = await findAllocationForUpdate(client, companyId, alloc.allocation_id);
      const remaining = Number(lockedAlloc.allocated_days) - Number(lockedAlloc.used_days);

      if (Number(request.days_requested) > remaining) {
        throw new AppError(400, `Insufficient balance for approval. Available: ${remaining}, Requested: ${request.days_requested}`, "INSUFFICIENT_LEAVE_BALANCE");
      }

      await updateAllocationUsedDays(client, lockedAlloc.allocation_id, Number(request.days_requested));
    }

    await updateLeaveRequestStatus(client, companyId, requestId, "APPROVED", actor.user_id);

    await createAuditLog({
      companyId,
      userId: actor.user_id,
      module: "LEAVE",
      action: "LEAVE_REQUEST_APPROVED",
      recordId: requestId,
      details: {
        employee_id: request.employee_id,
        leave_type_name: request.leave_type_name,
        days_requested: request.days_requested,
      },
    }, client);

    return findLeaveRequestById(client, companyId, requestId);
  });
}

async function refuseLeaveRequestService({ actor, requestId }) {
  const companyId = actor.company_id;

  const request = await findLeaveRequestById(null, companyId, requestId);
  if (!request) {
    throw new AppError(404, "Leave request not found", "LEAVE_REQUEST_NOT_FOUND");
  }

  if (request.status !== "PENDING") {
    throw new AppError(400, `Cannot refuse request with status '${request.status}'`, "INVALID_REQUEST_STATUS");
  }

  await updateLeaveRequestStatus(null, companyId, requestId, "REFUSED", actor.user_id);

  await createAuditLog({
    companyId,
    userId: actor.user_id,
    module: "LEAVE",
    action: "LEAVE_REQUEST_REFUSED",
    recordId: requestId,
    details: { employee_id: request.employee_id },
  });

  return findLeaveRequestById(null, companyId, requestId);
}

async function cancelLeaveRequestService({ actor, requestId }) {
  const companyId = actor.company_id;

  return withTransaction(async (client) => {
    const request = await findLeaveRequestForUpdate(client, companyId, requestId);
    if (!request) {
      throw new AppError(404, "Leave request not found", "LEAVE_REQUEST_NOT_FOUND");
    }

    if (actor.role_name === "Employee" && actor.employee_id && request.employee_id !== actor.employee_id) {
      throw new AppError(403, "Access denied to cancel another employee's request", "ACCESS_DENIED");
    }

    if (!["PENDING", "APPROVED"].includes(request.status)) {
      throw new AppError(400, `Cannot cancel request with status '${request.status}'`, "INVALID_REQUEST_STATUS");
    }

    // If request was approved and required allocation, reverse used_days
    if (request.status === "APPROVED" && request.requires_allocation) {
      const requestYear = new Date(request.start_date).getFullYear();
      const alloc = await findActiveAllocation(
        client,
        companyId,
        request.employee_id,
        request.leave_type_id,
        requestYear
      );

      if (alloc) {
        const lockedAlloc = await findAllocationForUpdate(client, companyId, alloc.allocation_id);
        await updateAllocationUsedDays(client, lockedAlloc.allocation_id, -Number(request.days_requested));
      }
    }

    await updateLeaveRequestStatus(client, companyId, requestId, "CANCELLED", actor.user_id);

    await createAuditLog({
      companyId,
      userId: actor.user_id,
      module: "LEAVE",
      action: "LEAVE_REQUEST_CANCELLED",
      recordId: requestId,
      details: {
        employee_id: request.employee_id,
        previous_status: request.status,
        days_requested: request.days_requested,
      },
    }, client);

    return findLeaveRequestById(client, companyId, requestId);
  });
}

async function getPayrollApprovedLeavesService({ companyId, periodStart, periodEnd, employeeId = null }) {
  if (!periodStart || !periodEnd) {
    throw new AppError(400, "periodStart and periodEnd are required", "INVALID_PERIOD");
  }

  return getApprovedLeavesForPayroll(null, companyId, periodStart, periodEnd, employeeId);
}

module.exports = {
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
};
