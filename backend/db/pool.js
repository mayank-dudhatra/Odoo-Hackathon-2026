const { Pool, types } = require("pg");

// OID 1114: TIMESTAMP WITHOUT TIME ZONE
// Treat stored UTC timestamps as UTC ISO strings so node-postgres does not misapply local offset
types.setTypeParser(1114, (str) => (str ? new Date(str.replace(" ", "T") + "Z").toISOString() : null));

// OID 1082: DATE
// Return literal 'YYYY-MM-DD' string to avoid shifting dates across midnight in positive timezones
types.setTypeParser(1082, (str) => str);

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
