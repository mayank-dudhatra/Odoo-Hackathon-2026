const { z } = require("zod");

const initialSetupSchema = z.object({
  company_name: z.string().min(2).max(150),
  company_email: z.string().email().max(150).nullable().optional(),
  company_phone: z.string().max(30).nullable().optional(),
  company_address: z.string().max(4000).nullable().optional(),
  timezone: z.string().max(50).default("UTC"),
  currency_code: z.string().length(3).transform((value) => value.toUpperCase()),
  admin_username: z.string().min(3).max(100),
  admin_email: z.string().email().max(150),
  password: z.string().min(8).max(200),
});

const forgotPasswordSchema = z.object({
  email: z.string().email().max(150),
});

const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Current password is required"),
    new_password: z.string().min(8, "New password must be at least 8 characters").max(200),
    confirm_password: z.string().min(8).optional(),
    confirm_new_password: z.string().min(8).optional(),
  })
  .refine(
    (data) => {
      const confirm = data.confirm_password || data.confirm_new_password;
      if (confirm !== undefined) {
        return data.new_password === confirm;
      }
      return true;
    },
    {
      message: "New password and confirm password do not match",
      path: ["confirm_password"],
    }
  )
  .refine(
    (data) => data.current_password !== data.new_password,
    {
      message: "New password must be different from current password",
      path: ["new_password"],
    }
  );

const resetPasswordSchema = z
  .object({
    token: z.string().min(10),
    new_password: z.string().min(8, "New password must be at least 8 characters").max(200),
    confirm_password: z.string().min(8).optional(),
    confirm_new_password: z.string().min(8).optional(),
  })
  .refine(
    (data) => {
      const confirm = data.confirm_password || data.confirm_new_password;
      if (confirm !== undefined) {
        return data.new_password === confirm;
      }
      return true;
    },
    {
      message: "New password and confirm password do not match",
      path: ["confirm_password"],
    }
  );

module.exports = {
  initialSetupSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
};

