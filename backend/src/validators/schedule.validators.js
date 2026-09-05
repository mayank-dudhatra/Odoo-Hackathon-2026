const { z } = require("zod");

const scheduleDaySchema = z.object({
  day_of_week: z.coerce.number().int().min(1).max(7),
  is_working_day: z.boolean(),
  start_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
    .nullable()
    .optional(),
  end_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
    .nullable()
    .optional(),
  break_minutes: z.coerce.number().int().min(0).max(1440).default(0),
});

const scheduleSchema = z.object({
  name: z.string().min(2).max(100),
  timezone: z.string().min(2).max(50).default("UTC"),
  attendance_policy_id: z.coerce.number().int().positive().nullable().optional(),
  is_active: z.boolean().optional(),
  days: z.array(scheduleDaySchema).min(1),
});

const scheduleUpdateSchema = scheduleSchema.partial().extend({
  days: z.array(scheduleDaySchema).optional(),
});

const assignScheduleSchema = z.object({
  schedule_id: z.coerce.number().int().positive().optional(),
  employee_id: z.coerce.number().int().positive().optional(),
});

module.exports = {
  scheduleDaySchema,
  scheduleSchema,
  scheduleUpdateSchema,
  assignScheduleSchema,
};

