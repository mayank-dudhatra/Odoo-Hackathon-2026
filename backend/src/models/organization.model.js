function mapCompany(row) {
  if (!row) return null;
  return {
    company_id: row.company_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    timezone: row.timezone,
    currency_code: row.currency_code,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapDepartment(row) {
  if (!row) return null;
  return {
    department_id: row.department_id,
    company_id: row.company_id,
    name: row.name,
    parent_department_id: row.parent_department_id,
    parent_department_name: row.parent_department_name || null,
    manager_id: row.manager_id,
    manager_name: row.manager_name || null,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapPosition(row) {
  if (!row) return null;
  return {
    position_id: row.position_id,
    company_id: row.company_id,
    title: row.title,
    department_id: row.department_id,
    department_name: row.department_name || null,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapEmployeeType(row) {
  if (!row) return null;
  return {
    employee_type_id: row.employee_type_id,
    company_id: row.company_id,
    name: row.name,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapEmployee(row) {
  if (!row) return null;
  return {
    employee_id: row.employee_id,
    company_id: row.company_id,
    employee_code: row.employee_code,
    first_name: row.first_name,
    last_name: row.last_name,
    full_name: row.full_name || `${row.first_name} ${row.last_name}`.trim(),
    email: row.email,
    phone: row.phone,
    date_of_birth: row.date_of_birth,
    gender: row.gender,
    address: row.address,
    hire_date: row.hire_date,
    department_id: row.department_id,
    department_name: row.department_name || null,
    position_id: row.position_id,
    position_name: row.position_name || null,
    employee_type_id: row.employee_type_id,
    employee_type_name: row.employee_type_name || null,
    schedule_id: row.schedule_id,
    schedule_name: row.schedule_name || null,
    manager_id: row.manager_id,
    manager_name: row.manager_name || null,
    status: row.status,
    created_by: row.created_by,
    created_by_username: row.created_by_username || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    user_id: row.user_id || null,
    role_id: row.role_id || null,
    role_name: row.role_name || null,
    account_status: row.account_status || null,
  };
}

module.exports = {
  mapCompany,
  mapDepartment,
  mapPosition,
  mapEmployeeType,
  mapEmployee,
};
