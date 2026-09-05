const { z } = require("zod");

const createSalaryStructureSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(1000).nullable().optional(),
  is_active: z.boolean().default(true),
});

const updateSalaryStructureSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(1000).nullable().optional(),
  is_active: z.boolean().optional(),
});

const createSalaryRuleSchema = z
  .object({
    name: z.string().min(2).max(100),
    code: z.string().min(2).max(30).regex(/^[A-Za-z0-9_]+$/, "Code can only contain letters, numbers and underscores"),
    category: z.enum([
      "BASIC",
      "ALLOWANCE",
      "GROSS",
      "DEDUCTION",
      "TAX",
      "CONTRIBUTION",
      "NET",
      "REIMBURSEMENT",
    ]),
    computation_type: z.enum(["FIXED", "PERCENTAGE", "FORMULA"]),
    amount: z.coerce.number().optional().nullable(),
    percentage_of: z.string().max(30).optional().nullable(),
    percentage_value: z.coerce.number().optional().nullable(),
    formula: z.string().max(1000).optional().nullable(),
    is_active: z.boolean().default(true),
  })
  .refine(
    (data) => {
      if (data.computation_type === "FIXED") {
        return data.amount !== undefined && data.amount !== null;
      }
      return true;
    },
    { message: "Amount is required for FIXED computation type", path: ["amount"] }
  )
  .refine(
    (data) => {
      if (data.computation_type === "PERCENTAGE") {
        return (
          data.percentage_of &&
          data.percentage_value !== undefined &&
          data.percentage_value !== null
        );
      }
      return true;
    },
    { message: "percentage_of and percentage_value are required for PERCENTAGE computation type", path: ["percentage_value"] }
  )
  .refine(
    (data) => {
      if (data.computation_type === "FORMULA") {
        return Boolean(data.formula && data.formula.trim().length > 0);
      }
      return true;
    },
    { message: "Formula string is required for FORMULA computation type", path: ["formula"] }
  );

const updateSalaryRuleSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  code: z.string().min(2).max(30).regex(/^[A-Za-z0-9_]+$/).optional(),
  category: z
    .enum([
      "BASIC",
      "ALLOWANCE",
      "GROSS",
      "DEDUCTION",
      "TAX",
      "CONTRIBUTION",
      "NET",
      "REIMBURSEMENT",
    ])
    .optional(),
  computation_type: z.enum(["FIXED", "PERCENTAGE", "FORMULA"]).optional(),
  amount: z.coerce.number().optional().nullable(),
  percentage_of: z.string().max(30).optional().nullable(),
  percentage_value: z.coerce.number().optional().nullable(),
  formula: z.string().max(1000).optional().nullable(),
  is_active: z.boolean().optional(),
});

const addStructureRuleSchema = z.object({
  rule_id: z.coerce.number().int().positive(),
  sequence: z.coerce.number().int().min(1),
  is_active: z.boolean().default(true),
});

const updateStructureRuleSchema = z.object({
  sequence: z.coerce.number().int().min(1).optional(),
  is_active: z.boolean().optional(),
});

const previewCalculationSchema = z.object({
  employee_id: z.coerce.number().int().positive(),
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format YYYY-MM-DD").optional(),
  salary_structure_id: z.coerce.number().int().positive().optional(),
  wage: z.coerce.number().positive().optional(),
});

module.exports = {
  createSalaryStructureSchema,
  updateSalaryStructureSchema,
  createSalaryRuleSchema,
  updateSalaryRuleSchema,
  addStructureRuleSchema,
  updateStructureRuleSchema,
  previewCalculationSchema,
};
