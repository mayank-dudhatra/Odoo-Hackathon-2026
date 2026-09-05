const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const { requirePermission } = require("../middleware/rbac.middleware");
const { validateRequest } = require("../middleware/validate.middleware");
const { z } = require("zod");
const {
  createLeaveTypeSchema,
  updateLeaveTypeSchema,
  createAllocationSchema,
  createLeaveRequestSchema,
  approveRefuseRequestSchema,
} = require("../validators/leave.validators");
const {
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
} = require("../controllers/leave.controller");

const router = express.Router();

// Require authentication for all leave routes
router.use(authenticate);

// --- LEAVE TYPES ---
router.post(
  "/leave-types",
  requirePermission("LEAVE_TYPES", "CREATE"),
  validateRequest({ body: createLeaveTypeSchema }),
  createLeaveType
);
router.get(
  "/leave-types",
  requirePermission("LEAVE_TYPES", "READ"),
  listLeaveTypes
);
router.get(
  "/leave-types/:id",
  requirePermission("LEAVE_TYPES", "READ"),
  validateRequest({ params: z.object({ id: z.coerce.number().int().positive() }) }),
  getLeaveTypeById
);
router.patch(
  "/leave-types/:id",
  requirePermission("LEAVE_TYPES", "UPDATE"),
  validateRequest({
    params: z.object({ id: z.coerce.number().int().positive() }),
    body: updateLeaveTypeSchema,
  }),
  updateLeaveType
);
router.delete(
  "/leave-types/:id",
  requirePermission("LEAVE_TYPES", "DELETE"),
  validateRequest({ params: z.object({ id: z.coerce.number().int().positive() }) }),
  deactivateLeaveType
);

// --- LEAVE ALLOCATIONS ---
router.post(
  "/leave-allocations",
  requirePermission("LEAVE_ALLOCATIONS", "CREATE"),
  validateRequest({ body: createAllocationSchema }),
  createAllocation
);
router.get(
  "/leave-allocations",
  requirePermission("LEAVE_ALLOCATIONS", "READ"),
  listAllocations
);
router.get(
  "/leave-allocations/:id",
  requirePermission("LEAVE_ALLOCATIONS", "READ"),
  validateRequest({ params: z.object({ id: z.coerce.number().int().positive() }) }),
  getAllocationById
);

// --- LEAVE BALANCES ---
router.get("/leave-balances/my", getOwnLeaveBalances);
router.get(
  "/employees/:employeeId/leave-balances",
  requirePermission("LEAVE_ALLOCATIONS", "READ"),
  validateRequest({ params: z.object({ employeeId: z.coerce.number().int().positive() }) }),
  getEmployeeLeaveBalances
);

// --- LEAVE REQUESTS ---
router.post(
  "/leave-requests",
  requirePermission("LEAVE_REQUESTS", "CREATE"),
  validateRequest({ body: createLeaveRequestSchema }),
  createLeaveRequest
);
router.get(
  "/leave-requests/my",
  getOwnLeaveRequests
);
router.get(
  "/leave-requests/payroll-summary",
  requirePermission("LEAVE_REQUESTS", "READ"),
  getPayrollApprovedLeaves
);
router.get(
  "/leave-requests",
  requirePermission("LEAVE_REQUESTS", "READ"),
  listLeaveRequests
);
router.get(
  "/leave-requests/:id",
  requirePermission("LEAVE_REQUESTS", "READ"),
  validateRequest({ params: z.object({ id: z.coerce.number().int().positive() }) }),
  getLeaveRequestById
);
router.patch(
  "/leave-requests/:id/cancel",
  validateRequest({ params: z.object({ id: z.coerce.number().int().positive() }) }),
  cancelLeaveRequest
);
router.patch(
  "/leave-requests/:id/approve",
  requirePermission("LEAVE_REQUESTS", "APPROVE"),
  validateRequest({
    params: z.object({ id: z.coerce.number().int().positive() }),
    body: approveRefuseRequestSchema.optional(),
  }),
  approveLeaveRequest
);
router.patch(
  "/leave-requests/:id/refuse",
  requirePermission("LEAVE_REQUESTS", "REFUSE"),
  validateRequest({
    params: z.object({ id: z.coerce.number().int().positive() }),
    body: approveRefuseRequestSchema.optional(),
  }),
  refuseLeaveRequest
);

module.exports = router;
