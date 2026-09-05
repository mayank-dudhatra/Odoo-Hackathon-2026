const { query: defaultQuery } = require("../db");

function parseArgs(first, second, ...rest) {
  if (first && typeof first.query === "function") {
    return { db: first, companyId: second, args: rest };
  }
  if (rest.length > 0) {
    return { db: defaultQuery, companyId: second, args: rest };
  }
  return { db: defaultQuery, companyId: first, args: [second, ...rest] };
}

async function createPayrun(executorOrData, dataIfExecutor) {
  let db = defaultQuery;
  let payload = executorOrData;
  if (executorOrData && typeof executorOrData.query === "function") {
    db = executorOrData;
    payload = dataIfExecutor;
  }

  const {
    company_id,
    name,
    salary_structure_id,
    period_start,
    period_end,
    status = "DRAFT",
    created_by = null,
  } = payload;

  const result = await db.query(
    `
      INSERT INTO payruns (
        company_id,
        name,
        salary_structure_id,
        period_start,
        period_end,
        status,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `,
    [
      company_id,
      name,
      salary_structure_id,
      period_start,
      period_end,
      status,
      created_by,
    ]
  );
  return result.rows[0];
}

async function findPayrunById(arg1, arg2, arg3) {
  const { db, companyId, args } = parseArgs(arg1, arg2, arg3);
  const payrunId = args[0];

  const result = await db.query(
    `
      SELECT
        pr.*,
        ss.name AS salary_structure_name,
        (u1.username) AS created_by_username,
        (u2.username) AS validated_by_username,
        (u3.username) AS paid_by_username,
        (SELECT COUNT(*)::int FROM payslips p WHERE p.payrun_id = pr.payrun_id) AS total_employees,
        (SELECT COALESCE(SUM(p.gross_pay), 0)::numeric FROM payslips p WHERE p.payrun_id = pr.payrun_id) AS total_gross,
        (SELECT COALESCE(SUM(p.total_deductions), 0)::numeric FROM payslips p WHERE p.payrun_id = pr.payrun_id) AS total_deductions,
        (SELECT COALESCE(SUM(p.net_pay), 0)::numeric FROM payslips p WHERE p.payrun_id = pr.payrun_id) AS total_net
      FROM payruns pr
      JOIN salary_structures ss ON ss.salary_structure_id = pr.salary_structure_id
      LEFT JOIN users u1 ON u1.user_id = pr.created_by
      LEFT JOIN users u2 ON u2.user_id = pr.validated_by
      LEFT JOIN users u3 ON u3.user_id = pr.paid_by
      WHERE pr.company_id = $1 AND pr.payrun_id = $2
      LIMIT 1
    `,
    [companyId, payrunId]
  );
  return result.rows[0] || null;
}

async function findPayrunForUpdate(arg1, arg2, arg3) {
  const { db, companyId, args } = parseArgs(arg1, arg2, arg3);
  const payrunId = args[0];

  const result = await db.query(
    `
      SELECT *
      FROM payruns
      WHERE company_id = $1 AND payrun_id = $2
      FOR UPDATE
    `,
    [companyId, payrunId]
  );
  return result.rows[0] || null;
}

async function listPayruns(arg1, arg2, arg3) {
  const { db, companyId, args } = parseArgs(arg1, arg2, arg3);
  const {
    status = null,
    salary_structure_id = null,
    start_date = null,
    end_date = null,
  } = args[0] || {};

  const params = [companyId];
  let sql = `
    SELECT
      pr.*,
      ss.name AS salary_structure_name,
      (SELECT COUNT(*)::int FROM payslips p WHERE p.payrun_id = pr.payrun_id) AS total_employees,
      (SELECT COALESCE(SUM(p.gross_pay), 0)::numeric FROM payslips p WHERE p.payrun_id = pr.payrun_id) AS total_gross,
      (SELECT COALESCE(SUM(p.total_deductions), 0)::numeric FROM payslips p WHERE p.payrun_id = pr.payrun_id) AS total_deductions,
      (SELECT COALESCE(SUM(p.net_pay), 0)::numeric FROM payslips p WHERE p.payrun_id = pr.payrun_id) AS total_net
    FROM payruns pr
    JOIN salary_structures ss ON ss.salary_structure_id = pr.salary_structure_id
    WHERE pr.company_id = $1
  `;

  if (status) {
    params.push(status);
    sql += ` AND pr.status = $${params.length}`;
  }

  if (salary_structure_id) {
    params.push(salary_structure_id);
    sql += ` AND pr.salary_structure_id = $${params.length}`;
  }

  if (start_date) {
    params.push(start_date);
    sql += ` AND pr.period_end >= $${params.length}`;
  }

  if (end_date) {
    params.push(end_date);
    sql += ` AND pr.period_start <= $${params.length}`;
  }

  sql += ` ORDER BY pr.period_start DESC, pr.created_at DESC`;
  const result = await db.query(sql, params);
  return result.rows;
}

async function updatePayrunStatus(arg1, arg2, arg3, arg4, arg5) {
  const { db, companyId, args } = parseArgs(arg1, arg2, arg3, arg4, arg5);
  const payrunId = args[0];
  const status = args[1];
  const actorUserId = args[2] || null;

  let extraUpdate = "";
  const params = [status, companyId, payrunId];

  if (status === "VALIDATED") {
    params.push(actorUserId);
    extraUpdate = `, validated_by = $${params.length}, validated_at = NOW()`;
  } else if (status === "PAID") {
    params.push(actorUserId);
    extraUpdate = `, paid_by = $${params.length}, paid_at = NOW()`;
  }

  const sql = `
    UPDATE payruns
    SET status = $1,
        updated_at = NOW()
        ${extraUpdate}
    WHERE company_id = $2 AND payrun_id = $3
    RETURNING *
  `;

  const result = await db.query(sql, params);
  return result.rows[0] || null;
}

async function updatePayrunDetails(arg1, arg2, arg3, arg4) {
  const { db, companyId, args } = parseArgs(arg1, arg2, arg3, arg4);
  const payrunId = args[0];
  const fields = args[1] || {};

  const allowed = ["name", "salary_structure_id", "period_start", "period_end"];
  const setClauses = [];
  const params = [companyId, payrunId];

  for (const [key, value] of Object.entries(fields)) {
    if (allowed.includes(key) && value !== undefined) {
      params.push(value);
      setClauses.push(`${key} = $${params.length}`);
    }
  }

  if (setClauses.length === 0) {
    return findPayrunById(db, companyId, payrunId);
  }

  setClauses.push(`updated_at = NOW()`);

  const sql = `
    UPDATE payruns
    SET ${setClauses.join(", ")}
    WHERE company_id = $1 AND payrun_id = $2
    RETURNING *
  `;

  const result = await db.query(sql, params);
  return result.rows[0] || null;
}

async function findOverlappingPayruns(arg1, arg2, arg3, arg4, arg5, arg6) {
  const { db, companyId, args } = parseArgs(arg1, arg2, arg3, arg4, arg5, arg6);
  const structureId = args[0];
  const periodStart = args[1];
  const periodEnd = args[2];
  const excludePayrunId = args[3] || null;

  const params = [companyId, structureId, periodStart, periodEnd];
  let sql = `
    SELECT payrun_id
    FROM payruns
    WHERE company_id = $1
      AND salary_structure_id = $2
      AND status <> 'CANCELLED'
      AND daterange(period_start, period_end, '[]') && daterange($3::date, $4::date, '[]')
  `;

  if (excludePayrunId) {
    params.push(excludePayrunId);
    sql += ` AND payrun_id <> $${params.length}`;
  }

  sql += ` LIMIT 1`;
  const result = await db.query(sql, params);
  return result.rows.length > 0;
}

module.exports = {
  createPayrun,
  findPayrunById,
  findPayrunForUpdate,
  listPayruns,
  updatePayrunStatus,
  updatePayrunDetails,
  findOverlappingPayruns,
};
