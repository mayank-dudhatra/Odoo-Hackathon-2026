const fs = require("fs");
const path = require("path");
const { pool } = require("./pool");

async function initSchema() {
  try {
    const check = await pool.query(
      `SELECT 1 FROM information_schema.tables WHERE table_name = 'users' LIMIT 1`
    );
    if (check.rows.length > 0) {
      await pool.query(`
        ALTER TABLE payruns DROP CONSTRAINT IF EXISTS chk_payruns_status;
        ALTER TABLE payruns ADD CONSTRAINT chk_payruns_status CHECK (status IN ('DRAFT', 'PROCESSING', 'COMPUTED', 'VALIDATED', 'PAID', 'CANCELLED'));
        ALTER TABLE payslips DROP CONSTRAINT IF EXISTS chk_payslips_status;
        ALTER TABLE payslips ADD CONSTRAINT chk_payslips_status CHECK (status IN ('DRAFT', 'COMPUTED', 'VALIDATED', 'PAID', 'GENERATED', 'SENT', 'FAILED', 'CANCELLED'));
      `).catch(() => {});
      return;
    }

    const schemaPath = path.join(__dirname, "schema.sql");
    const ddl = fs.readFileSync(schemaPath, "utf8");

    await pool.query(ddl);
  } catch (err) {
    console.warn("[initSchema] Warning during schema check/initialization:", err.message);
  }
}

module.exports = { initSchema };
