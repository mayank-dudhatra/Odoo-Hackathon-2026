const { z } = require("zod");

const companyUpdateSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  email: z.string().email().max(150).nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  address: z.string().max(4000).nullable().optional(),
  timezone: z.string().max(50).optional(),
  currency_code: z.string().length(3).transform((value) => value.toUpperCase()).optional(),
  is_active: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: "At least one field is required",
});

const departmentSchema = z.object({
  name: z.string().min(2).max(100),
  parent_department_id: z.coerce.number().int().positive().nullable().optional(),
  manager_id: z.coerce.number().int().positive().nullable().optional(),
  is_active: z.boolean().optional(),
});

const positionSchema = z.object({
  title: z.string().min(2).max(100),
  department_id: z.coerce.number().int().positive().nullable().optional(),
  is_active: z.boolean().optional(),
});

const employeeTypeSchema = z.object({
  name: z.string().min(2).max(50),
  is_active: z.boolean().optional(),
});

const employeeSchema = z.object({
  employee_code: z.string().min(2).max(20),
  first_name: z.string().min(1).max(50),
  last_name: z.string().min(1).max(50),
  email: z.string().email().max(150).nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  date_of_birth: z.coerce.date().nullable().optional(),
  gender: z.string().max(20).nullable().optional(),
  address: z.string().max(4000).nullable().optional(),
  hire_date: z.coerce.date(),
  department_id: z.coerce.number().int().positive().nullable().optional(),
  position_id: z.coerce.number().int().positive().nullable().optional(),
  employee_type_id: z.coerce.number().int().positive().nullable().optional(),
  schedule_id: z.coerce.number().int().positive().nullable().optional(),
  manager_id: z.coerce.number().int().positive().nullable().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "TERMINATED"]).optional(),
  create_user_account: z.boolean().optional(),
});

const employeeStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "TERMINATED"]),
});

const employeeQuerySchema = z.object({
  search: z.string().optional(),
  department_id: z.coerce.number().int().positive().optional(),
  position_id: z.coerce.number().int().positive().optional(),
  employee_type_id: z.coerce.number().int().positive().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "TERMINATED"]).optional(),
  manager_id: z.coerce.number().int().positive().optional(),
  employee_id: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["employee_code", "first_name", "last_name", "email", "hire_date", "status", "created_at", "updated_at"]).default("created_at"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

module.exports = {
  companyUpdateSchema,
  departmentSchema,
  positionSchema,
  employeeTypeSchema,
  employeeSchema,
  employeeStatusSchema,
  employeeQuerySchema,
};
