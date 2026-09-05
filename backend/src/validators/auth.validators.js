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

module.exports = { initialSetupSchema };
