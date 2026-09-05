const { z } = require("zod");

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const checkInSchema = z.object({
  work_date: z.string().regex(dateRegex).optional(),
  check_in: z.string().optional(),
  remarks: z.string().max(500).optional(),
});

const checkOutSchema = z.object({
  work_date: z.string().regex(dateRegex).optional(),
  check_out: z.string().optional(),
  remarks: z.string().max(500).optional(),
});

const attendanceCorrectionSchema = z.object({
  check_in: z.string().nullable().optional(),
  check_out: z.string().nullable().optional(),
  status: z.enum(["PRESENT", "ABSENT", "HALF_DAY", "LATE", "ON_LEAVE", "OVERTIME"]).optional(),
  deduction_type: z.enum(["NONE", "HALF_DAY", "FULL_DAY"]).optional(),
  remarks: z.string().max(500).optional(),
});

const attendanceQuerySchema = z.object({
  employee_id: z.coerce.number().int().positive().optional(),
  work_date: z.string().regex(dateRegex).optional(),
  start_date: z.string().regex(dateRegex).optional(),
  end_date: z.string().regex(dateRegex).optional(),
  department_id: z.coerce.number().int().positive().optional(),
  position_id: z.coerce.number().int().positive().optional(),
  status: z.enum(["PRESENT", "ABSENT", "HALF_DAY", "LATE", "ON_LEAVE", "OVERTIME"]).optional(),
  late_status: z.enum(["ON_TIME", "WITHIN_GRACE", "BEYOND_GRACE"]).optional(),
  deduction_type: z.enum(["NONE", "HALF_DAY", "FULL_DAY"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

module.exports = {
  checkInSchema,
  checkOutSchema,
  attendanceCorrectionSchema,
  attendanceQuerySchema,
};
