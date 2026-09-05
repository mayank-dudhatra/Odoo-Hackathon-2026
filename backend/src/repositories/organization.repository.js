const { query, withTransaction } = require("../db");

async function getCompanyById(companyId) {
  const result = await query(
    `
      SELECT company_id, name, email, phone, address, timezone, currency_code, is_active, created_at, updated_at
      FROM companies
      WHERE company_id = $1
      LIMIT 1
    `,
    [companyId]
  );

  return result.rows[0] || null;
}

async function updateCompany(companyId, payload) {
  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(payload)) {
    fields.push(`${key} = $${values.length + 1}`);
    values.push(value);
  }

  if (!fields.length) {
    return getCompanyById(companyId);
  }

  values.push(companyId);

  const result = await query(
    `
      UPDATE companies
      SET ${fields.join(", ")}, updated_at = NOW()
      WHERE company_id = $${values.length}
      RETURNING company_id, name, email, phone, address, timezone, currency_code, is_active, created_at, updated_at
    `,
    values
  );

  return result.rows[0] || null;
}

async function listDepartments(companyId) {
  const result = await query(
    `
      SELECT
        d.department_id,
        d.company_id,
        d.name,
        d.parent_department_id,
        parent.name AS parent_department_name,
        d.manager_id,
        CONCAT(m.first_name, ' ', m.last_name) AS manager_name,
        d.is_active,
        d.created_at,
        d.updated_at
      FROM departments d
      LEFT JOIN departments parent ON parent.department_id = d.parent_department_id
      LEFT JOIN employees m ON m.employee_id = d.manager_id
      WHERE d.company_id = $1
      ORDER BY d.created_at DESC
    `,
    [companyId]
  );

  return result.rows;
}

async function getDepartmentById(companyId, departmentId) {
  const result = await query(
    `
      SELECT
        d.department_id,
        d.company_id,
        d.name,
        d.parent_department_id,
        parent.name AS parent_department_name,
        d.manager_id,
        CONCAT(m.first_name, ' ', m.last_name) AS manager_name,
        d.is_active,
        d.created_at,
        d.updated_at
      FROM departments d
      LEFT JOIN departments parent ON parent.department_id = d.parent_department_id
      LEFT JOIN employees m ON m.employee_id = d.manager_id
      WHERE d.company_id = $1 AND d.department_id = $2
      LIMIT 1
    `,
    [companyId, departmentId]
  );

  return result.rows[0] || null;
}

async function createDepartment(companyId, payload) {
  const result = await query(
    `
      INSERT INTO departments (
        company_id,
        name,
        parent_department_id,
        manager_id,
        is_active
      )
      VALUES ($1, $2, $3, $4, COALESCE($5, TRUE))
      RETURNING department_id, company_id, name, parent_department_id, manager_id, is_active, created_at, updated_at
    `,
    [companyId, payload.name, payload.parent_department_id || null, payload.manager_id || null, payload.is_active]
  );

  return result.rows[0] || null;
}

async function updateDepartment(companyId, departmentId, payload) {
  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(payload)) {
    fields.push(`${key} = $${values.length + 1}`);
    values.push(value);
  }

  if (!fields.length) {
    return getDepartmentById(companyId, departmentId);
  }

  values.push(companyId, departmentId);
  const result = await query(
    `
      UPDATE departments
      SET ${fields.join(", ")}, updated_at = NOW()
      WHERE company_id = $${values.length - 1}
        AND department_id = $${values.length}
      RETURNING department_id, company_id, name, parent_department_id, manager_id, is_active, created_at, updated_at
    `,
    values
  );

  return result.rows[0] || null;
}

async function setDepartmentActive(companyId, departmentId, isActive) {
  const result = await query(
    `
      UPDATE departments
      SET is_active = $1, updated_at = NOW()
      WHERE company_id = $2 AND department_id = $3
      RETURNING department_id, company_id, name, parent_department_id, manager_id, is_active, created_at, updated_at
    `,
    [isActive, companyId, departmentId]
  );

  return result.rows[0] || null;
}

async function listPositions(companyId) {
  const result = await query(
    `
      SELECT
        p.position_id,
        p.company_id,
        p.title,
        p.department_id,
        d.name AS department_name,
        p.is_active,
        p.created_at,
        p.updated_at
      FROM positions p
      LEFT JOIN departments d ON d.department_id = p.department_id
      WHERE p.company_id = $1
      ORDER BY p.created_at DESC
    `,
    [companyId]
  );

  return result.rows;
}

async function getPositionById(companyId, positionId) {
  const result = await query(
    `
      SELECT
        p.position_id,
        p.company_id,
        p.title,
        p.department_id,
        d.name AS department_name,
        p.is_active,
        p.created_at,
        p.updated_at
      FROM positions p
      LEFT JOIN departments d ON d.department_id = p.department_id
      WHERE p.company_id = $1 AND p.position_id = $2
      LIMIT 1
    `,
    [companyId, positionId]
  );

  return result.rows[0] || null;
}

async function createPosition(companyId, payload) {
  const result = await query(
    `
      INSERT INTO positions (company_id, title, department_id, is_active)
      VALUES ($1, $2, $3, COALESCE($4, TRUE))
      RETURNING position_id, company_id, title, department_id, is_active, created_at, updated_at
    `,
    [companyId, payload.title, payload.department_id || null, payload.is_active]
  );

  return result.rows[0] || null;
}

async function updatePosition(companyId, positionId, payload) {
  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(payload)) {
    fields.push(`${key} = $${values.length + 1}`);
    values.push(value);
  }

  if (!fields.length) {
    return getPositionById(companyId, positionId);
  }

  values.push(companyId, positionId);
  const result = await query(
    `
      UPDATE positions
      SET ${fields.join(", ")}, updated_at = NOW()
      WHERE company_id = $${values.length - 1}
        AND position_id = $${values.length}
      RETURNING position_id, company_id, title, department_id, is_active, created_at, updated_at
    `,
    values
  );

  return result.rows[0] || null;
}

async function setPositionActive(companyId, positionId, isActive) {
  const result = await query(
    `
      UPDATE positions
      SET is_active = $1, updated_at = NOW()
      WHERE company_id = $2 AND position_id = $3
      RETURNING position_id, company_id, title, department_id, is_active, created_at, updated_at
    `,
    [isActive, companyId, positionId]
  );

  return result.rows[0] || null;
}

async function listEmployeeTypes(companyId) {
  const result = await query(
    `
      SELECT employee_type_id, company_id, name, is_active, created_at, updated_at
      FROM employee_types
      WHERE company_id = $1
      ORDER BY created_at DESC
    `,
    [companyId]
  );

  return result.rows;
}

async function getEmployeeTypeById(companyId, employeeTypeId) {
  const result = await query(
    `
      SELECT employee_type_id, company_id, name, is_active, created_at, updated_at
      FROM employee_types
      WHERE company_id = $1 AND employee_type_id = $2
      LIMIT 1
    `,
    [companyId, employeeTypeId]
  );

  return result.rows[0] || null;
}

async function createEmployeeType(companyId, payload) {
  const result = await query(
    `
      INSERT INTO employee_types (company_id, name, is_active)
      VALUES ($1, $2, COALESCE($3, TRUE))
      RETURNING employee_type_id, company_id, name, is_active, created_at, updated_at
    `,
    [companyId, payload.name, payload.is_active]
  );

  return result.rows[0] || null;
}

async function updateEmployeeType(companyId, employeeTypeId, payload) {
  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(payload)) {
    fields.push(`${key} = $${values.length + 1}`);
    values.push(value);
  }

  if (!fields.length) {
    return getEmployeeTypeById(companyId, employeeTypeId);
  }

  values.push(companyId, employeeTypeId);
  const result = await query(
    `
      UPDATE employee_types
      SET ${fields.join(", ")}, updated_at = NOW()
      WHERE company_id = $${values.length - 1}
        AND employee_type_id = $${values.length}
      RETURNING employee_type_id, company_id, name, is_active, created_at, updated_at
    `,
    values
  );

  return result.rows[0] || null;
}

async function setEmployeeTypeActive(companyId, employeeTypeId, isActive) {
  const result = await query(
    `
      UPDATE employee_types
      SET is_active = $1, updated_at = NOW()
      WHERE company_id = $2 AND employee_type_id = $3
      RETURNING employee_type_id, company_id, name, is_active, created_at, updated_at
    `,
    [isActive, companyId, employeeTypeId]
  );

  return result.rows[0] || null;
}

async function getEmployeeById(companyId, employeeId) {
  const result = await query(
    `
      SELECT
        e.employee_id,
        e.company_id,
        e.employee_code,
        e.first_name,
        e.last_name,
        CONCAT(e.first_name, ' ', e.last_name) AS full_name,
        e.email,
        e.phone,
        e.date_of_birth,
        e.gender,
        e.address,
        e.hire_date,
        e.department_id,
        d.name AS department_name,
        e.position_id,
        p.title AS position_name,
        e.employee_type_id,
        et.name AS employee_type_name,
        e.schedule_id,
        ws.name AS schedule_name,
        e.manager_id,
        CONCAT(m.first_name, ' ', m.last_name) AS manager_name,
        e.status,
        e.created_by,
        cu.username AS created_by_username,
        e.created_at,
        e.updated_at
      FROM employees e
      LEFT JOIN departments d ON d.department_id = e.department_id
      LEFT JOIN positions p ON p.position_id = e.position_id
      LEFT JOIN employee_types et ON et.employee_type_id = e.employee_type_id
      LEFT JOIN working_schedules ws ON ws.schedule_id = e.schedule_id
      LEFT JOIN employees m ON m.employee_id = e.manager_id
      LEFT JOIN users cu ON cu.user_id = e.created_by
      WHERE e.company_id = $1 AND e.employee_id = $2
      LIMIT 1
    `,
    [companyId, employeeId]
  );

  return result.rows[0] || null;
}

async function listEmployees(companyId, filters, pagination, sort) {
  const where = ["e.company_id = $1"];
  const values = [companyId];
  let index = 2;

  if (filters.search) {
    where.push(
      `(e.employee_code ILIKE $${index} OR e.first_name ILIKE $${index} OR e.last_name ILIKE $${index} OR e.email ILIKE $${index})`
    );
    values.push(`%${filters.search}%`);
    index += 1;
  }

  const filterMap = {
    department_id: "e.department_id",
    position_id: "e.position_id",
    employee_type_id: "e.employee_type_id",
    status: "e.status",
    manager_id: "e.manager_id",
  };

  for (const [key, column] of Object.entries(filterMap)) {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== "") {
      where.push(`${column} = $${index}`);
      values.push(filters[key]);
      index += 1;
    }
  }

  const offset = (pagination.page - 1) * pagination.limit;
  values.push(pagination.limit, offset);

  const result = await query(
    `
      SELECT
        e.employee_id,
        e.company_id,
        e.employee_code,
        e.first_name,
        e.last_name,
        CONCAT(e.first_name, ' ', e.last_name) AS full_name,
        e.email,
        e.phone,
        e.date_of_birth,
        e.gender,
        e.address,
        e.hire_date,
        e.department_id,
        d.name AS department_name,
        e.position_id,
        p.title AS position_name,
        e.employee_type_id,
        et.name AS employee_type_name,
        e.schedule_id,
        ws.name AS schedule_name,
        e.manager_id,
        CONCAT(m.first_name, ' ', m.last_name) AS manager_name,
        e.status,
        e.created_by,
        cu.username AS created_by_username,
        e.created_at,
        e.updated_at
      FROM employees e
      LEFT JOIN departments d ON d.department_id = e.department_id
      LEFT JOIN positions p ON p.position_id = e.position_id
      LEFT JOIN employee_types et ON et.employee_type_id = e.employee_type_id
      LEFT JOIN working_schedules ws ON ws.schedule_id = e.schedule_id
      LEFT JOIN employees m ON m.employee_id = e.manager_id
      LEFT JOIN users cu ON cu.user_id = e.created_by
      WHERE ${where.join(" AND ")}
      ORDER BY ${sort.column} ${sort.order.toUpperCase()}
      LIMIT $${index} OFFSET $${index + 1}
    `,
    values
  );

  const countResult = await query(
    `SELECT COUNT(*)::int AS total FROM employees e WHERE ${where.join(" AND ")}`,
    values.slice(0, values.length - 2)
  );

  return {
    rows: result.rows,
    total: countResult.rows[0].total,
  };
}

async function createEmployee(companyId, payload) {
  const result = await query(
    `
      INSERT INTO employees (
        company_id,
        employee_code,
        first_name,
        last_name,
        email,
        phone,
        date_of_birth,
        gender,
        address,
        hire_date,
        department_id,
        position_id,
        employee_type_id,
        schedule_id,
        manager_id,
        status,
        created_by
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, COALESCE($16, 'ACTIVE'), $17
      )
      RETURNING employee_id
    `,
    [
      companyId,
      payload.employee_code,
      payload.first_name,
      payload.last_name,
      payload.email || null,
      payload.phone || null,
      payload.date_of_birth || null,
      payload.gender || null,
      payload.address || null,
      payload.hire_date,
      payload.department_id || null,
      payload.position_id || null,
      payload.employee_type_id || null,
      payload.schedule_id || null,
      payload.manager_id || null,
      payload.status || null,
      payload.created_by,
    ]
  );

  return result.rows[0].employee_id;
}

async function updateEmployee(companyId, employeeId, payload) {
  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(payload)) {
    fields.push(`${key} = $${values.length + 1}`);
    values.push(value);
  }

  if (!fields.length) {
    return getEmployeeById(companyId, employeeId);
  }

  values.push(companyId, employeeId);
  const result = await query(
    `
      UPDATE employees
      SET ${fields.join(", ")}, updated_at = NOW()
      WHERE company_id = $${values.length - 1}
        AND employee_id = $${values.length}
      RETURNING employee_id
    `,
    values
  );

  return result.rows[0]?.employee_id || null;
}

async function updateEmployeeStatus(companyId, employeeId, status) {
  const result = await query(
    `
      UPDATE employees
      SET status = $1, updated_at = NOW()
      WHERE company_id = $2 AND employee_id = $3
      RETURNING employee_id, company_id, status
    `,
    [status, companyId, employeeId]
  );

  return result.rows[0] || null;
}

async function findEmployeeById(companyId, employeeId, client = null) {
  const executor = client || { query };
  const result = await executor.query(
    `SELECT employee_id, company_id, manager_id, first_name, last_name, employee_code FROM employees WHERE company_id = $1 AND employee_id = $2 LIMIT 1`,
    [companyId, employeeId]
  );
  return result.rows[0] || null;
}

async function listManagerChain(companyId, employeeId, client = null) {
  const executor = client || { query };
  const result = await executor.query(
    `
      WITH RECURSIVE chain AS (
        SELECT employee_id, manager_id, company_id
        FROM employees
        WHERE company_id = $1 AND employee_id = $2
        UNION ALL
        SELECT e.employee_id, e.manager_id, e.company_id
        FROM employees e
        JOIN chain c ON e.employee_id = c.manager_id
        WHERE e.company_id = $1
      )
      SELECT employee_id, manager_id, company_id
      FROM chain
    `,
    [companyId, employeeId]
  );
  return result.rows;
}

module.exports = {
  getCompanyById,
  updateCompany,
  listDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  setDepartmentActive,
  listPositions,
  getPositionById,
  createPosition,
  updatePosition,
  setPositionActive,
  listEmployeeTypes,
  getEmployeeTypeById,
  createEmployeeType,
  updateEmployeeType,
  setEmployeeTypeActive,
  getEmployeeById,
  listEmployees,
  createEmployee,
  updateEmployee,
  updateEmployeeStatus,
  findEmployeeById,
  listManagerChain,
  withTransaction,
};
