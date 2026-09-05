const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const { requirePermission } = require("../middleware/rbac.middleware");
const { validateRequest } = require("../middleware/validate.middleware");
const { z } = require("zod");
const {
  createPayrunSchema,
  updatePayrunSchema,
} = require("../validators/payrun.validators");
const {
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
} = require("../controllers/payrun.controller");

const router = express.Router();

router.use(authenticate);

// --- PAYRUN ENDPOINTS ---
router.post(
  "/payruns",
  requirePermission("PAYRUNS", "CREATE"),
  validateRequest({ body: createPayrunSchema }),
  createPayrun
);
router.get(
  "/payruns",
  requirePermission("PAYRUNS", "READ"),
  listPayruns
);
router.get(
  "/payruns/:id",
  requirePermission("PAYRUNS", "READ"),
  validateRequest({ params: z.object({ id: z.coerce.number().int().positive() }) }),
  getPayrunById
);
router.post(
  "/payruns/:id/compute",
  requirePermission("PAYRUNS", "PROCESS"),
  validateRequest({ params: z.object({ id: z.coerce.number().int().positive() }) }),
  computePayrun
);
router.post(
  "/payruns/:id/validate",
  requirePermission("PAYRUNS", "VALIDATE"),
  validateRequest({ params: z.object({ id: z.coerce.number().int().positive() }) }),
  validatePayrun
);
router.post(
  "/payruns/:id/pay",
  requirePermission("PAYRUNS", "PAY"),
  validateRequest({ params: z.object({ id: z.coerce.number().int().positive() }) }),
  payPayrun
);

// --- PAYSLIP ENDPOINTS ---
router.get(
  "/payruns/:id/payslips",
  requirePermission("PAYSLIPS", "READ"),
  validateRequest({ params: z.object({ id: z.coerce.number().int().positive() }) }),
  getPayslipsForPayrun
);

router.get("/payslips/my", getOwnPayslips);

router.get(
  "/payslips/:id",
  requirePermission("PAYSLIPS", "READ"),
  validateRequest({ params: z.object({ id: z.coerce.number().int().positive() }) }),
  getPayslipById
);

router.get(
  "/employees/:employeeId/payslips",
  requirePermission("PAYSLIPS", "READ"),
  validateRequest({ params: z.object({ employeeId: z.coerce.number().int().positive() }) }),
  getEmployeePayslips
);

module.exports = router;
