const { Pool } = require("pg");

const connectionString =
  process.env.DATABASE_URL ||
  process.env.DB_CONNECTION_STRING ||
  process.env.POSTGRES_URL;

if (!connectionString) {
  throw new Error(
    "Missing database connection string. Set DATABASE_URL (or DB_CONNECTION_STRING/POSTGRES_URL) in .env."
  );
}

const sslMode = (process.env.PG_SSLMODE || "").toLowerCase();
const pool = new Pool({
  connectionString,
  ssl:
    sslMode === "require" || process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

module.exports = { pool };
