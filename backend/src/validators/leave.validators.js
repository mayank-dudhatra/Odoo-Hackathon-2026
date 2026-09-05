const { z } = require("zod");

const createLeaveTypeSchema = z.object({
  name: z.string().min(2).max(50),
  unit: z.enum(["DAYS", "HOURS"]).default("DAYS"),
  requires_allocation: z.boolean().default(true),
  is_paid: z.boolean().default(true),
  default_days_year: z.coerce.number().min(0).default(0),
  approval_required: z.boolean().default(true),
  payroll_integration: z.boolean().default(true),
  is_active: z.boolean().default(true),
});

const updateLeaveTypeSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  unit: z.enum(["DAYS", "HOURS"]).optional(),
  requires_allocation: z.boolean().optional(),
  is_paid: z.boolean().optional(),
  default_days_year: z.coerce.number().min(0).optional(),
  approval_required: z.boolean().optional(),
  payroll_integration: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

const createAllocationSchema = z.object({
  employee_id: z.coerce.number().int().positive(),
  leave_type_id: z.coerce.number().int().positive(),
  year: z.coerce.number().int().min(1900).max(2100),
  allocated_days: z.coerce.number().positive(),
  valid_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format YYYY-MM-DD").nullable().optional(),
  valid_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format YYYY-MM-DD").nullable().optional(),
  status: z.enum(["DRAFT", "APPROVED", "EXPIRED", "CANCELLED"]).default("APPROVED"),
});

const createLeaveRequestSchema = z
  .object({
    leave_type_id: z.coerce.number().int().positive(),
    employee_id: z.coerce.number().int().positive().nullable().optional(),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid start_date format YYYY-MM-DD"),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid end_date format YYYY-MM-DD"),
    days_requested: z.coerce.number().positive("days_requested must be greater than 0"),
    reason: z.string().max(2000).nullable().optional(),
  })
  .refine((data) => new Date(data.start_date) <= new Date(data.end_date), {
    message: "end_date must be greater than or equal to start_date",
    path: ["end_date"],
  });

const approveRefuseRequestSchema = z.object({
  remarks: z.string().max(1000).nullable().optional(),
});

module.exports = {
  createLeaveTypeSchema,
  updateLeaveTypeSchema,
  createAllocationSchema,
  createLeaveRequestSchema,
  approveRefuseRequestSchema,
};
