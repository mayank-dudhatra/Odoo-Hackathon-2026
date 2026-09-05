const { query: defaultQuery } = require("../db");

function getDb(executor) {
  return (executor && executor.query) ? executor : defaultQuery;
}

async function createSalaryStructure(executor = defaultQuery, {
  company_id,
  name,
  description = null,
  is_active = true,
  created_by = null,
}) {
  const db = getDb(executor);
  const result = await db.query(
    `
      INSERT INTO salary_structures (
        company_id,
        name,
        description,
        is_active,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
    [company_id, name, description, is_active, created_by]
  );
  return result.rows[0];
}

async function findSalaryStructureById(executor = defaultQuery, companyId, structureId) {
  const db = getDb(executor);
  const result = await db.query(
    `
      SELECT *
      FROM salary_structures
      WHERE company_id = $1 AND salary_structure_id = $2
      LIMIT 1
    `,
    [companyId, structureId]
  );
  return result.rows[0] || null;
}

async function findSalaryStructureByName(executor = defaultQuery, companyId, name) {
  const db = getDb(executor);
  const result = await db.query(
    `
      SELECT *
      FROM salary_structures
      WHERE company_id = $1 AND LOWER(name) = LOWER($2)
      LIMIT 1
    `,
    [companyId, name]
  );
  return result.rows[0] || null;
}

async function listSalaryStructures(executor = defaultQuery, companyId, { is_active = null } = {}) {
  const db = getDb(executor);
  const params = [companyId];
  let sql = `SELECT * FROM salary_structures WHERE company_id = $1`;

  if (is_active !== null && is_active !== undefined) {
    params.push(Boolean(is_active));
    sql += ` AND is_active = $${params.length}`;
  }

  sql += ` ORDER BY name ASC`;
  const result = await db.query(sql, params);
  return result.rows;
}

async function updateSalaryStructure(executor = defaultQuery, companyId, structureId, fields) {
  const db = getDb(executor);
  const allowed = ["name", "description", "is_active"];
  const setClauses = [];
  const params = [companyId, structureId];

  for (const [key, value] of Object.entries(fields)) {
    if (allowed.includes(key) && value !== undefined) {
      params.push(value);
      setClauses.push(`${key} = $${params.length}`);
    }
  }

  if (setClauses.length === 0) {
    return findSalaryStructureById(executor, companyId, structureId);
  }

  setClauses.push(`updated_at = NOW()`);

  const sql = `
    UPDATE salary_structures
    SET ${setClauses.join(", ")}
    WHERE company_id = $1 AND salary_structure_id = $2
    RETURNING *
  `;

  const result = await db.query(sql, params);
  return result.rows[0] || null;
}

async function deactivateSalaryStructure(executor = defaultQuery, companyId, structureId) {
  const db = getDb(executor);
  const result = await db.query(
    `
      UPDATE salary_structures
      SET is_active = FALSE, updated_at = NOW()
      WHERE company_id = $1 AND salary_structure_id = $2
      RETURNING *
    `,
    [companyId, structureId]
  );
  return result.rows[0] || null;
}

module.exports = {
  createSalaryStructure,
  findSalaryStructureById,
  findSalaryStructureByName,
  listSalaryStructures,
  updateSalaryStructure,
  deactivateSalaryStructure,
};
