const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const { requirePermission } = require("../middleware/rbac.middleware");
const { validateRequest } = require("../middleware/validate.middleware");
const { z } = require("zod");
const {
  generatePayrunPayslips,
  listPayslips,
  getOwnPayslips,
  getPayslipById,
  getPayslipPdf,
  getEmployeePayslips,
  bulkEmailPayrunPayslips,
  sendSinglePayslipEmail,
  retryFailedPayslipEmail,
} = require("../controllers/payslip.controller");

const router = express.Router();

router.use(authenticate);
router.use((req, res, next) => {
  if (!req.user && req.auth) req.user = req.auth;
  next();
});

// --- BULK GENERATION ---
router.post(
  "/payruns/:payrunId/payslips/generate",
  requirePermission("PAYSLIPS", "CREATE"),
  validateRequest({ params: z.object({ payrunId: z.coerce.number().int().positive() }) }),
  generatePayrunPayslips
);

// --- LIST & MY PAYSLIPS ---
router.get(
  "/payslips",
  requirePermission("PAYSLIPS", "READ"),
  listPayslips
);

router.get("/payslips/my", getOwnPayslips);

// --- GET PAYSLIP BY ID & PDF ---
router.get(
  "/payslips/:id",
  validateRequest({ params: z.object({ id: z.coerce.number().int().positive() }) }),
  getPayslipById
);

router.get(
  "/payslips/:id/pdf",
  validateRequest({ params: z.object({ id: z.coerce.number().int().positive() }) }),
  getPayslipPdf
);

// --- EMPLOYEE PAYSLIPS HISTORY ---
router.get(
  "/employees/:employeeId/payslips",
  validateRequest({ params: z.object({ employeeId: z.coerce.number().int().positive() }) }),
  getEmployeePayslips
);

// --- EMAIL DELIVERY & RETRIES ---
router.post(
  "/payruns/:payrunId/payslips/email",
  requirePermission("PAYSLIPS", "PROCESS"),
  validateRequest({ params: z.object({ payrunId: z.coerce.number().int().positive() }) }),
  bulkEmailPayrunPayslips
);

router.post(
  "/payslips/:id/email",
  requirePermission("PAYSLIPS", "PROCESS"),
  validateRequest({ params: z.object({ id: z.coerce.number().int().positive() }) }),
  sendSinglePayslipEmail
);

router.post(
  "/payslips/:id/email/retry",
  requirePermission("PAYSLIPS", "PROCESS"),
  validateRequest({ params: z.object({ id: z.coerce.number().int().positive() }) }),
  retryFailedPayslipEmail
);

module.exports = router;
