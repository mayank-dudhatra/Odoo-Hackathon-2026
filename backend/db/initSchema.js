const fs = require("fs");
const path = require("path");
const { pool } = require("./pool");

async function initSchema() {
  const schemaPath = path.join(__dirname, "schema.sql");
  const ddl = fs.readFileSync(schemaPath, "utf8");

  await pool.query(ddl);
}

module.exports = { initSchema };
