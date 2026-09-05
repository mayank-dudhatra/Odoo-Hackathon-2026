const { z } = require("zod");

const inviteUserSchema = z.object({
  username: z.string().min(3).max(100),
  email: z.string().email().max(150),
  role_name: z.enum(["Admin", "HR Manager", "Payroll Manager", "Payroll User", "Employee"]),
  employee_id: z.coerce.number().int().positive().nullable().optional(),
});

const changeUserRoleSchema = z.object({
  role_name: z.enum(["Admin", "HR Manager", "Payroll Manager", "Payroll User", "Employee"]),
});

const linkEmployeeSchema = z.object({
  employee_id: z.coerce.number().int().positive().nullable(),
});

const userStatusSchema = z.object({
  status: z.enum(["ACTIVE", "DISABLED"]),
});

module.exports = {
  inviteUserSchema,
  changeUserRoleSchema,
  linkEmployeeSchema,
  userStatusSchema,
};
