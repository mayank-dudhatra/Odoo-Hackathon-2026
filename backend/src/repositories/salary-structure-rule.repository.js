const { query: defaultQuery } = require("../db");

function getDb(executor) {
  return (executor && executor.query) ? executor : defaultQuery;
}

async function addRuleToStructure(executor = defaultQuery, structureId, ruleId, sequence, is_active = true) {
  const db = getDb(executor);
  const result = await db.query(
    `
      INSERT INTO salary_structure_rules (
        salary_structure_id,
        salary_rule_id,
        sequence,
        is_active
      )
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (salary_structure_id, salary_rule_id)
      DO UPDATE SET sequence = EXCLUDED.sequence, is_active = EXCLUDED.is_active, updated_at = NOW()
      RETURNING *
    `,
    [structureId, ruleId, sequence, is_active]
  );
  return result.rows[0];
}

async function findStructureRule(executor = defaultQuery, structureId, ruleId) {
  const db = getDb(executor);
  const result = await db.query(
    `
      SELECT *
      FROM salary_structure_rules
      WHERE salary_structure_id = $1 AND salary_rule_id = $2
      LIMIT 1
    `,
    [structureId, ruleId]
  );
  return result.rows[0] || null;
}

async function updateStructureRule(executor = defaultQuery, structureId, ruleId, fields) {
  const db = getDb(executor);
  const setClauses = [];
  const params = [structureId, ruleId];

  if (fields.sequence !== undefined) {
    params.push(fields.sequence);
    setClauses.push(`sequence = $${params.length}`);
  }

  if (fields.is_active !== undefined) {
    params.push(fields.is_active);
    setClauses.push(`is_active = $${params.length}`);
  }

  if (setClauses.length === 0) {
    return findStructureRule(executor, structureId, ruleId);
  }

  setClauses.push(`updated_at = NOW()`);

  const sql = `
    UPDATE salary_structure_rules
    SET ${setClauses.join(", ")}
    WHERE salary_structure_id = $1 AND salary_rule_id = $2
    RETURNING *
  `;

  const result = await db.query(sql, params);
  return result.rows[0] || null;
}

async function removeRuleFromStructure(executor = defaultQuery, structureId, ruleId) {
  const db = getDb(executor);
  const result = await db.query(
    `
      DELETE FROM salary_structure_rules
      WHERE salary_structure_id = $1 AND salary_rule_id = $2
      RETURNING *
    `,
    [structureId, ruleId]
  );
  return result.rows[0] || null;
}

async function getStructureRules(executor = defaultQuery, companyId, structureId, { onlyActive = true } = {}) {
  const db = getDb(executor);
  const params = [companyId, structureId];
  let sql = `
    SELECT
      sr.salary_rule_id,
      sr.company_id,
      sr.name,
      sr.code,
      sr.category,
      sr.computation_type,
      sr.amount,
      sr.percentage_of,
      sr.percentage_value,
      sr.formula,
      ssr.sequence,
      (ssr.is_active AND sr.is_active) AS is_active
    FROM salary_structure_rules ssr
    JOIN salary_rules sr ON sr.salary_rule_id = ssr.salary_rule_id
    JOIN salary_structures ss ON ss.salary_structure_id = ssr.salary_structure_id
    WHERE ss.company_id = $1 AND ssr.salary_structure_id = $2
  `;

  if (onlyActive) {
    sql += ` AND ssr.is_active = TRUE AND sr.is_active = TRUE`;
  }

  sql += ` ORDER BY ssr.sequence ASC, sr.code ASC`;
  const result = await db.query(sql, params);
  return result.rows;
}

module.exports = {
  addRuleToStructure,
  findStructureRule,
  updateStructureRule,
  removeRuleFromStructure,
  getStructureRules,
};
