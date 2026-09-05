const { z } = require("zod");

const dateStringSchema = z.preprocess((val) => {
  if (typeof val === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    const d = new Date(val);
    if (!Number.isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
  } else if (val instanceof Date && !Number.isNaN(val.getTime())) {
    return val.toISOString().slice(0, 10);
  }
  return val;
}, z.string().regex(/^\d{4}-\d{2}-\d{2}$/));

const contractSchema = z.object({
  employee_id: z.coerce.number().int().positive(),
  position_id: z.coerce.number().int().positive().nullable().optional(),
  department_id: z.coerce.number().int().positive().nullable().optional(),
  schedule_id: z.coerce.number().int().positive().nullable().optional(),
  salary_structure_id: z.coerce.number().int().positive(),
  wage: z.coerce.number().positive(),
  wage_type: z.enum(["MONTHLY", "HOURLY", "ANNUAL"]),
  start_date: dateStringSchema,
  end_date: dateStringSchema.nullable().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "EXPIRED", "TERMINATED"]).optional(),
});

const contractUpdateSchema = contractSchema.partial().omit({ employee_id: true });

const contractStatusSchema = z.object({
  status: z.enum(["DRAFT", "ACTIVE", "EXPIRED", "TERMINATED"]),
});

const effectiveContractQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

module.exports = {
  contractSchema,
  contractUpdateSchema,
  contractStatusSchema,
  effectiveContractQuerySchema,
};

