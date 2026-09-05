const { query } = require("../db");

async function listContracts(companyId, filters = {}, client = null) {
  const executor = client || { query };
  const where = ["c.company_id = $1"];
  const values = [companyId];
  let index = 2;

  if (filters.employee_id) {
    where.push(`c.employee_id = $${index}`);
    values.push(filters.employee_id);
    index += 1;
  }

  if (filters.status) {
    where.push(`c.status = $${index}`);
    values.push(filters.status);
    index += 1;
  }

  const result = await executor.query(
    `
      SELECT
        c.contract_id,
        c.company_id,
        c.employee_id,
        CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
        e.employee_code,
        c.position_id,
        p.title AS position_name,
        c.department_id,
        d.name AS department_name,
        c.schedule_id,
        s.name AS schedule_name,
        c.salary_structure_id,
        ss.name AS salary_structure_name,
        c.wage,
        c.wage_type,
        c.start_date,
        c.end_date,
        c.status,
        c.created_by,
        c.created_at,
        c.updated_at
      FROM contracts c
      JOIN employees e ON e.employee_id = c.employee_id
      LEFT JOIN positions p ON p.position_id = c.position_id
      LEFT JOIN departments d ON d.department_id = c.department_id
      LEFT JOIN working_schedules s ON s.schedule_id = c.schedule_id
      LEFT JOIN salary_structures ss ON ss.salary_structure_id = c.salary_structure_id
      WHERE ${where.join(" AND ")}
      ORDER BY c.start_date DESC, c.created_at DESC
    `,
    values
  );

  return result.rows;
}

async function getContractById(companyId, contractId, client = null) {
  const executor = client || { query };
  const result = await executor.query(
    `
      SELECT
        c.contract_id,
        c.company_id,
        c.employee_id,
        CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
        e.employee_code,
        c.position_id,
        p.title AS position_name,
        c.department_id,
        d.name AS department_name,
        c.schedule_id,
        s.name AS schedule_name,
        c.salary_structure_id,
        ss.name AS salary_structure_name,
        c.wage,
        c.wage_type,
        c.start_date,
        c.end_date,
        c.status,
        c.created_by,
        c.created_at,
        c.updated_at
      FROM contracts c
      JOIN employees e ON e.employee_id = c.employee_id
      LEFT JOIN positions p ON p.position_id = c.position_id
      LEFT JOIN departments d ON d.department_id = c.department_id
      LEFT JOIN working_schedules s ON s.schedule_id = c.schedule_id
      LEFT JOIN salary_structures ss ON ss.salary_structure_id = c.salary_structure_id
      WHERE c.company_id = $1 AND c.contract_id = $2
      LIMIT 1
    `,
    [companyId, contractId]
  );

  return result.rows[0] || null;
}

async function createContract(companyId, payload, client = null) {
  const executor = client || { query };
  const result = await executor.query(
    `
      INSERT INTO contracts (
        company_id,
        employee_id,
        position_id,
        department_id,
        schedule_id,
        salary_structure_id,
        wage,
        wage_type,
        start_date,
        end_date,
        status,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING contract_id
    `,
    [
      companyId,
      payload.employee_id,
      payload.position_id || null,
      payload.department_id || null,
      payload.schedule_id || null,
      payload.salary_structure_id,
      payload.wage,
      payload.wage_type,
      payload.start_date,
      payload.end_date || null,
      payload.status,
      payload.created_by,
    ]
  );

  return result.rows[0]?.contract_id || null;
}

async function updateContract(companyId, contractId, payload, client = null) {
  const executor = client || { query };
  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(payload)) {
    if (key === "employee_id" || key === "created_by") continue;
    fields.push(`${key} = $${values.length + 1}`);
    values.push(value);
  }

  if (!fields.length) {
    return getContractById(companyId, contractId, executor);
  }

  values.push(companyId, contractId);
  const result = await executor.query(
    `
      UPDATE contracts
      SET ${fields.join(", ")}, updated_at = NOW()
      WHERE company_id = $${values.length - 1}
        AND contract_id = $${values.length}
      RETURNING contract_id
    `,
    values
  );

  return result.rows[0]?.contract_id || null;
}

async function setContractStatus(companyId, contractId, status, client = null) {
  const executor = client || { query };
  const result = await executor.query(
    `
      UPDATE contracts
      SET status = $1, updated_at = NOW()
      WHERE company_id = $2 AND contract_id = $3
      RETURNING contract_id, employee_id, schedule_id, start_date, end_date, status
    `,
    [status, companyId, contractId]
  );

  return result.rows[0] || null;
}

async function getEffectiveContract(companyId, employeeId, targetDate, client = null) {
  const executor = client || { query };
  const result = await executor.query(
    `
      SELECT
        c.contract_id,
        c.company_id,
        c.employee_id,
        CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
        e.employee_code,
        c.position_id,
        p.title AS position_name,
        c.department_id,
        d.name AS department_name,
        c.schedule_id,
        s.name AS schedule_name,
        c.salary_structure_id,
        ss.name AS salary_structure_name,
        c.wage,
        c.wage_type,
        c.start_date,
        c.end_date,
        c.status,
        c.created_by,
        c.created_at,
        c.updated_at
      FROM contracts c
      JOIN employees e ON e.employee_id = c.employee_id
      LEFT JOIN positions p ON p.position_id = c.position_id
      LEFT JOIN departments d ON d.department_id = c.department_id
      LEFT JOIN working_schedules s ON s.schedule_id = c.schedule_id
      LEFT JOIN salary_structures ss ON ss.salary_structure_id = c.salary_structure_id
      WHERE c.company_id = $1
        AND c.employee_id = $2
        AND c.status = 'ACTIVE'
        AND c.start_date <= $3
        AND (c.end_date IS NULL OR c.end_date >= $3)
      ORDER BY c.start_date DESC, c.contract_id DESC
      LIMIT 1
    `,
    [companyId, employeeId, targetDate]
  );

  return result.rows[0] || null;
}

async function getEmployeeActiveContractCount(companyId, employeeId, targetDate, client = null) {
  const executor = client || { query };
  const result = await executor.query(
    `
      SELECT COUNT(*)::int AS count
      FROM contracts
      WHERE company_id = $1
        AND employee_id = $2
        AND status = 'ACTIVE'
        AND daterange(start_date, COALESCE(end_date, 'infinity'::date), '[]') && daterange($3::date, $3::date, '[]')
    `,
    [companyId, employeeId, targetDate]
  );

  return result.rows[0].count;
}

module.exports = {
  listContracts,
  getContractById,
  createContract,
  updateContract,
  setContractStatus,
  getEffectiveContract,
  getEmployeeActiveContractCount,
};

