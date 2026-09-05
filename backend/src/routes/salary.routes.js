const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const { requirePermission } = require("../middleware/rbac.middleware");
const { validateRequest } = require("../middleware/validate.middleware");
const { z } = require("zod");
const {
  createSalaryStructureSchema,
  updateSalaryStructureSchema,
  createSalaryRuleSchema,
  updateSalaryRuleSchema,
  addStructureRuleSchema,
  updateStructureRuleSchema,
  previewCalculationSchema,
} = require("../validators/salary.validators");
const {
  createSalaryStructure,
  listSalaryStructures,
  getSalaryStructureById,
  updateSalaryStructure,
  deactivateSalaryStructure,
  createSalaryRule,
  listSalaryRules,
  getSalaryRuleById,
  updateSalaryRule,
  deactivateSalaryRule,
  addRuleToStructure,
  updateStructureRule,
  removeRuleFromStructure,
  previewSalaryCalculation,
} = require("../controllers/salary.controller");

const router = express.Router();

router.use(authenticate);

// --- SALARY STRUCTURES ---
router.post(
  "/salary-structures",
  requirePermission("SALARY_STRUCTURES", "CREATE"),
  validateRequest({ body: createSalaryStructureSchema }),
  createSalaryStructure
);
router.get(
  "/salary-structures",
  requirePermission("SALARY_STRUCTURES", "READ"),
  listSalaryStructures
);
router.get(
  "/salary-structures/:id",
  requirePermission("SALARY_STRUCTURES", "READ"),
  validateRequest({ params: z.object({ id: z.coerce.number().int().positive() }) }),
  getSalaryStructureById
);
router.patch(
  "/salary-structures/:id",
  requirePermission("SALARY_STRUCTURES", "UPDATE"),
  validateRequest({
    params: z.object({ id: z.coerce.number().int().positive() }),
    body: updateSalaryStructureSchema,
  }),
  updateSalaryStructure
);
router.delete(
  "/salary-structures/:id",
  requirePermission("SALARY_STRUCTURES", "DELETE"),
  validateRequest({ params: z.object({ id: z.coerce.number().int().positive() }) }),
  deactivateSalaryStructure
);

// --- SALARY RULES ---
router.post(
  "/salary-rules",
  requirePermission("SALARY_RULES", "CREATE"),
  validateRequest({ body: createSalaryRuleSchema }),
  createSalaryRule
);
router.get(
  "/salary-rules",
  requirePermission("SALARY_RULES", "READ"),
  listSalaryRules
);
router.get(
  "/salary-rules/:id",
  requirePermission("SALARY_RULES", "READ"),
  validateRequest({ params: z.object({ id: z.coerce.number().int().positive() }) }),
  getSalaryRuleById
);
router.patch(
  "/salary-rules/:id",
  requirePermission("SALARY_RULES", "UPDATE"),
  validateRequest({
    params: z.object({ id: z.coerce.number().int().positive() }),
    body: updateSalaryRuleSchema,
  }),
  updateSalaryRule
);
router.delete(
  "/salary-rules/:id",
  requirePermission("SALARY_RULES", "DELETE"),
  validateRequest({ params: z.object({ id: z.coerce.number().int().positive() }) }),
  deactivateSalaryRule
);

// --- STRUCTURE-RULE MAPPINGS ---
router.post(
  "/salary-structures/:id/rules",
  requirePermission("SALARY_STRUCTURES", "UPDATE"),
  validateRequest({
    params: z.object({ id: z.coerce.number().int().positive() }),
    body: addStructureRuleSchema,
  }),
  addRuleToStructure
);
router.patch(
  "/salary-structures/:id/rules/:ruleId",
  requirePermission("SALARY_STRUCTURES", "UPDATE"),
  validateRequest({
    params: z.object({
      id: z.coerce.number().int().positive(),
      ruleId: z.coerce.number().int().positive(),
    }),
    body: updateStructureRuleSchema,
  }),
  updateStructureRule
);
router.delete(
  "/salary-structures/:id/rules/:ruleId",
  requirePermission("SALARY_STRUCTURES", "UPDATE"),
  validateRequest({
    params: z.object({
      id: z.coerce.number().int().positive(),
      ruleId: z.coerce.number().int().positive(),
    }),
  }),
  removeRuleFromStructure
);

// --- SALARY CALCULATION PREVIEW ---
router.post(
  "/salary-calculations/preview",
  requirePermission("SALARY_STRUCTURES", "READ"),
  validateRequest({ body: previewCalculationSchema }),
  previewSalaryCalculation
);

module.exports = router;
