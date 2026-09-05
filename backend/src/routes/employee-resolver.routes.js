const express = require("express");
const { z } = require("zod");
const { authenticate } = require("../middleware/auth.middleware");
const { loadCompanyContext } = require("../middleware/companyContext.middleware");
const { requirePermission } = require("../middleware/rbac.middleware");
const { validateRequest } = require("../middleware/validate.middleware");
const { effectiveContractQuerySchema } = require("../validators/contract.validators");
const { effectiveContractHandler, effectiveScheduleHandler } = require("../controllers/contract.controller");

const router = express.Router();

router.use(authenticate, loadCompanyContext);

router.get(
  "/:employeeId/effective-contract",
  requirePermission("CONTRACTS", "READ", { ownResolver: (req) => Number(req.params.employeeId) === Number(req.auth.employee_id) }),
  validateRequest({ params: z.object({ employeeId: z.coerce.number().int().positive() }), query: effectiveContractQuerySchema }),
  effectiveContractHandler
);

router.get(
  "/:employeeId/effective-schedule",
  requirePermission("WORKING_SCHEDULES", "READ", { ownResolver: (req) => Number(req.params.employeeId) === Number(req.auth.employee_id) }),
  validateRequest({ params: z.object({ employeeId: z.coerce.number().int().positive() }), query: effectiveContractQuerySchema }),
  effectiveScheduleHandler
);

module.exports = router;

