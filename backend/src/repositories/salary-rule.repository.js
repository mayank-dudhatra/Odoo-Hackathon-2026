const { query: defaultQuery } = require("../db");

async function createSalaryRule(executor = defaultQuery, {
  company_id,
  name,
  code,
  category,
  computation_type,
  amount = null,
  percentage_of = null,
  percentage_value = null,
  formula = null,
  is_active = true,
}) {
  const db = executor.query ? executor : defaultQuery;
  const result = await db.query(
    `
      INSERT INTO salary_rules (
        company_id,
        name,
        code,
        category,
        computation_type,
        amount,
        percentage_of,
        percentage_value,
        formula,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `,
    [
      company_id,
      name,
      code.toUpperCase(),
      category,
      computation_type,
      amount,
      percentage_of ? percentage_of.toUpperCase() : null,
      percentage_value,
      formula,
      is_active,
    ]
  );
  return result.rows[0];
}

async function findSalaryRuleById(executor = defaultQuery, companyId, ruleId) {
  const db = executor.query ? executor : defaultQuery;
  const result = await db.query(
    `
      SELECT *
      FROM salary_rules
      WHERE company_id = $1 AND salary_rule_id = $2
      LIMIT 1
    `,
    [companyId, ruleId]
  );
  return result.rows[0] || null;
}

async function findSalaryRuleByCode(executor = defaultQuery, companyId, code) {
  const db = executor.query ? executor : defaultQuery;
  const result = await db.query(
    `
      SELECT *
      FROM salary_rules
      WHERE company_id = $1 AND UPPER(code) = UPPER($2)
      LIMIT 1
    `,
    [companyId, code]
  );
  return result.rows[0] || null;
}

async function listSalaryRules(executor = defaultQuery, companyId, {
  category = null,
  computation_type = null,
  is_active = null,
} = {}) {
  const db = executor.query ? executor : defaultQuery;
  const params = [companyId];
  let sql = `SELECT * FROM salary_rules WHERE company_id = $1`;

  if (category) {
    params.push(category);
    sql += ` AND category = $${params.length}`;
  }

  if (computation_type) {
    params.push(computation_type);
    sql += ` AND computation_type = $${params.length}`;
  }

  if (is_active !== null && is_active !== undefined) {
    params.push(Boolean(is_active));
    sql += ` AND is_active = $${params.length}`;
  }

  sql += ` ORDER BY code ASC`;
  const result = await db.query(sql, params);
  return result.rows;
}

async function updateSalaryRule(executor = defaultQuery, companyId, ruleId, fields) {
  const db = executor.query ? executor : defaultQuery;
  const allowed = [
    "name",
    "code",
    "category",
    "computation_type",
    "amount",
    "percentage_of",
    "percentage_value",
    "formula",
    "is_active",
  ];

  const setClauses = [];
  const params = [companyId, ruleId];

  for (const [key, rawVal] of Object.entries(fields)) {
    if (allowed.includes(key) && rawVal !== undefined) {
      let value = rawVal;
      if (key === "code" && typeof value === "string") value = value.toUpperCase();
      if (key === "percentage_of" && typeof value === "string") value = value.toUpperCase();

      params.push(value);
      setClauses.push(`${key} = $${params.length}`);
    }
  }

  if (setClauses.length === 0) {
    return findSalaryRuleById(executor, companyId, ruleId);
  }

  setClauses.push(`updated_at = NOW()`);

  const sql = `
    UPDATE salary_rules
    SET ${setClauses.join(", ")}
    WHERE company_id = $1 AND salary_rule_id = $2
    RETURNING *
  `;

  const result = await db.query(sql, params);
  return result.rows[0] || null;
}

async function deactivateSalaryRule(executor = defaultQuery, companyId, ruleId) {
  const db = executor.query ? executor : defaultQuery;
  const result = await db.query(
    `
      UPDATE salary_rules
      SET is_active = FALSE, updated_at = NOW()
      WHERE company_id = $1 AND salary_rule_id = $2
      RETURNING *
    `,
    [companyId, ruleId]
  );
  return result.rows[0] || null;
}

module.exports = {
  createSalaryRule,
  findSalaryRuleById,
  findSalaryRuleByCode,
  listSalaryRules,
  updateSalaryRule,
  deactivateSalaryRule,
};
