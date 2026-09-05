function parseIntOrDefault(value, defaultValue) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseIntOrDefault(process.env.PORT, 5008),
  accessTokenSecret: process.env.ACCESS_TOKEN_SECRET || "",
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || "15m",
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET || "",
  refreshTokenTtlDays: parseIntOrDefault(process.env.REFRESH_TOKEN_TTL_DAYS, 7),
  invitationTtlHours: parseIntOrDefault(process.env.INVITATION_TTL_HOURS, 48),
  bcryptRounds: parseIntOrDefault(process.env.BCRYPT_ROUNDS, 12),
  frontendBaseUrl: process.env.FRONTEND_BASE_URL || "http://localhost:5173",
  smtp: {
    host: process.env.SMTP_HOST || (process.env.EMAIL_USER || process.env.GMAIL_USER || process.env.SMTP_USER ? "smtp.gmail.com" : ""),
    port: parseIntOrDefault(process.env.SMTP_PORT, 587),
    user: process.env.SMTP_USER || process.env.EMAIL_USER || process.env.GMAIL_USER || "",
    password: process.env.SMTP_PASSWORD || process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.GMAIL_PASS || process.env.GMAIL_PASSWORD || "",
    from: process.env.SMTP_FROM || process.env.SMTP_USER || process.env.EMAIL_USER || process.env.GMAIL_USER || "no-reply@peoplepay360.com",
  },
  passwordResetUrl: process.env.PASSWORD_RESET_URL || `${process.env.FRONTEND_BASE_URL || "http://localhost:5173"}/reset-password`,
  passwordResetTtlMinutes: parseIntOrDefault(process.env.PASSWORD_RESET_TTL_MINUTES, 30),
};

if (!env.accessTokenSecret || !env.refreshTokenSecret) {
  throw new Error(
    "Missing ACCESS_TOKEN_SECRET or REFRESH_TOKEN_SECRET in environment variables."
  );
}

module.exports = { env };

