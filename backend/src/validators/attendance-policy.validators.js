const { z } = require("zod");

const penaltyEnum = z.enum(["NONE", "HALF_DAY", "FULL_DAY"]);

const attendancePolicySchema = z.object({
  name: z.string().min(2).max(100),
  grace_period_minutes: z.coerce.number().int().min(0).max(1440).default(0),
  grace_occurrences_allowed: z.coerce.number().int().min(0).max(31).default(0),
  grace_period_penalty: penaltyEnum.default("NONE"),
  beyond_grace_penalty: penaltyEnum.default("NONE"),
  early_leave_grace_minutes: z.coerce.number().int().min(0).max(1440).default(0),
  early_leave_penalty: penaltyEnum.default("NONE"),
  stack_deductions: z.boolean().default(false),
  is_active: z.boolean().optional(),
});

const attendancePolicyUpdateSchema = attendancePolicySchema.partial();

module.exports = {
  attendancePolicySchema,
  attendancePolicyUpdateSchema,
};
