const { z } = require("zod");

const createPayrunSchema = z
  .object({
    name: z.string().min(2).max(100),
    salary_structure_id: z.coerce.number().int().positive(),
    period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid period_start format YYYY-MM-DD"),
    period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid period_end format YYYY-MM-DD"),
  })
  .refine((data) => new Date(data.period_start) <= new Date(data.period_end), {
    message: "period_end must be greater than or equal to period_start",
    path: ["period_end"],
  });

const updatePayrunSchema = z
  .object({
    name: z.string().min(2).max(100).optional(),
    salary_structure_id: z.coerce.number().int().positive().optional(),
    period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })
  .refine(
    (data) => {
      if (data.period_start && data.period_end) {
        return new Date(data.period_start) <= new Date(data.period_end);
      }
      return true;
    },
    { message: "period_end must be greater than or equal to period_start", path: ["period_end"] }
  );

module.exports = {
  createPayrunSchema,
  updatePayrunSchema,
};
