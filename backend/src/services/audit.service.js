const { query } = require("../db");

async function createAuditLog({
  companyId = null,
  userId = null,
  module,
  action,
  recordId = null,
  details = null,
}) {
  await query(
    `
      INSERT INTO audit_logs (company_id, user_id, module, action, record_id, details)
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [companyId, userId, module, action, recordId, details]
  );
}

module.exports = { createAuditLog };
