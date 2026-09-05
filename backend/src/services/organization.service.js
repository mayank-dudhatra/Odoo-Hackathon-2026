const { query, withTransaction } = require("../db");
const { AppError } = require("../utils/http");
const {
  mapCompany,
  mapDepartment,
  mapPosition,
  mapEmployeeType,
  mapEmployee,
} = require("../models/organization.model");
const {
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
} = require("../repositories/organization.repository");
const { createAuditLog } = require("./audit.service");

async function ensureEmployeeBelongsToCompany(companyId, employeeId, label) {
  if (!employeeId) {
    return null;
  }

  const employee = await getEmployeeById(companyId, employeeId);
  if (!employee) {
    throw new AppError(400, `${label} must belong to the same company`, "CROSS_COMPANY_REFERENCE");
  }

  return employee;
}

async function ensureDepartmentBelongsToCompany(companyId, departmentId, label = "Department") {
  if (!departmentId) {
    return null;
  }

  const department = await getDepartmentById(companyId, departmentId);
  if (!department) {
    throw new AppError(400, `${label} must belong to the same company`, "CROSS_COMPANY_REFERENCE");
  }

  return department;
}

async function ensurePositionBelongsToCompany(companyId, positionId) {
  if (!positionId) {
    return null;
  }

  const position = await getPositionById(companyId, positionId);
  if (!position) {
    throw new AppError(400, "Position must belong to the same company", "CROSS_COMPANY_REFERENCE");
  }

  return position;
}

async function ensureEmployeeTypeBelongsToCompany(companyId, employeeTypeId) {
  if (!employeeTypeId) {
    return null;
  }

  const employeeType = await getEmployeeTypeById(companyId, employeeTypeId);
  if (!employeeType) {
    throw new AppError(400, "Employee type must belong to the same company", "CROSS_COMPANY_REFERENCE");
  }

  return employeeType;
}

async function ensureNoCircularReporting(companyId, employeeId, managerId) {
  if (!managerId) {
    return;
  }

  if (employeeId === managerId) {
    throw new AppError(400, "Employee cannot report to themselves", "SELF_MANAGER_NOT_ALLOWED");
  }

  const chain = await listManagerChain(companyId, managerId);
  const cycle = chain.find((item) => item.employee_id === employeeId);
  if (cycle) {
    throw new AppError(400, "Circular reporting hierarchy detected", "CYCLICAL_MANAGER_CHAIN");
  }
}

async function getCurrentCompany(auth) {
  const company = await getCompanyById(auth.company_id);
  if (!company) {
    throw new AppError(404, "Company not found", "COMPANY_NOT_FOUND");
  }

  return mapCompany(company);
}

async function updateCurrentCompany(auth, payload) {
  const updated = await updateCompany(auth.company_id, payload);
  if (!updated) {
    throw new AppError(404, "Company not found", "COMPANY_NOT_FOUND");
  }

  await createAuditLog({
    companyId: auth.company_id,
    userId: auth.user_id,
    module: "COMPANY",
    action: "UPDATE",
    recordId: auth.company_id,
    details: payload,
  });

  return mapCompany(updated);
}

async function listCompanyDepartments(auth) {
  return listDepartments(auth.company_id).then((rows) => rows.map(mapDepartment));
}

async function getCompanyDepartment(auth, departmentId) {
  const department = await getDepartmentById(auth.company_id, departmentId);
  if (!department) {
    throw new AppError(404, "Department not found", "DEPARTMENT_NOT_FOUND");
  }
  return mapDepartment(department);
}

async function createCompanyDepartment(auth, payload) {
  await ensureDepartmentBelongsToCompany(auth.company_id, payload.parent_department_id, "Parent department");
  await ensureEmployeeBelongsToCompany(auth.company_id, payload.manager_id, "Department manager");

  const department = await createDepartment(auth.company_id, {
    name: payload.name,
    parent_department_id: payload.parent_department_id || null,
    manager_id: payload.manager_id || null,
    is_active: payload.is_active ?? true,
  });

  await createAuditLog({
    companyId: auth.company_id,
    userId: auth.user_id,
    module: "DEPARTMENTS",
    action: "CREATE",
    recordId: department.department_id,
    details: department,
  });

  return mapDepartment({ ...department, parent_department_name: null, manager_name: null });
}

async function updateCompanyDepartment(auth, departmentId, payload) {
  const current = await getDepartmentById(auth.company_id, departmentId);
  if (!current) {
    throw new AppError(404, "Department not found", "DEPARTMENT_NOT_FOUND");
  }

  if (payload.parent_department_id !== undefined) {
    if (payload.parent_department_id === departmentId) {
      throw new AppError(400, "Department cannot be its own parent", "SELF_PARENT_NOT_ALLOWED");
    }
    await ensureDepartmentBelongsToCompany(auth.company_id, payload.parent_department_id, "Parent department");
  }

  if (payload.manager_id !== undefined) {
    await ensureEmployeeBelongsToCompany(auth.company_id, payload.manager_id, "Department manager");
  }

  const updated = await updateDepartment(auth.company_id, departmentId, {
    ...payload,
    parent_department_id: payload.parent_department_id ?? null,
    manager_id: payload.manager_id ?? null,
  });

  await createAuditLog({
    companyId: auth.company_id,
    userId: auth.user_id,
    module: "DEPARTMENTS",
    action: "UPDATE",
    recordId: departmentId,
    details: payload,
  });

  return mapDepartment(updated);
}

async function deactivateCompanyDepartment(auth, departmentId) {
  const department = await setDepartmentActive(auth.company_id, departmentId, false);
  if (!department) {
    throw new AppError(404, "Department not found", "DEPARTMENT_NOT_FOUND");
  }

  await createAuditLog({
    companyId: auth.company_id,
    userId: auth.user_id,
    module: "DEPARTMENTS",
    action: "DEACTIVATE",
    recordId: departmentId,
  });

  return mapDepartment(department);
}

async function listCompanyPositions(auth) {
  return listPositions(auth.company_id).then((rows) => rows.map(mapPosition));
}

async function getCompanyPosition(auth, positionId) {
  const position = await getPositionById(auth.company_id, positionId);
  if (!position) {
    throw new AppError(404, "Position not found", "POSITION_NOT_FOUND");
  }
  return mapPosition(position);
}

async function createCompanyPosition(auth, payload) {
  await ensureDepartmentBelongsToCompany(auth.company_id, payload.department_id, "Position department");

  const position = await createPosition(auth.company_id, {
    title: payload.title,
    department_id: payload.department_id || null,
    is_active: payload.is_active ?? true,
  });

  await createAuditLog({
    companyId: auth.company_id,
    userId: auth.user_id,
    module: "POSITIONS",
    action: "CREATE",
    recordId: position.position_id,
    details: position,
  });

  return mapPosition({ ...position, department_name: null });
}

async function updateCompanyPosition(auth, positionId, payload) {
  const current = await getPositionById(auth.company_id, positionId);
  if (!current) {
    throw new AppError(404, "Position not found", "POSITION_NOT_FOUND");
  }

  if (payload.department_id !== undefined) {
    await ensureDepartmentBelongsToCompany(auth.company_id, payload.department_id, "Position department");
  }

  const updated = await updatePosition(auth.company_id, positionId, {
    ...payload,
    department_id: payload.department_id ?? null,
  });

  await createAuditLog({
    companyId: auth.company_id,
    userId: auth.user_id,
    module: "POSITIONS",
    action: "UPDATE",
    recordId: positionId,
    details: payload,
  });

  return mapPosition(updated);
}

async function deactivateCompanyPosition(auth, positionId) {
  const position = await setPositionActive(auth.company_id, positionId, false);
  if (!position) {
    throw new AppError(404, "Position not found", "POSITION_NOT_FOUND");
  }

  await createAuditLog({
    companyId: auth.company_id,
    userId: auth.user_id,
    module: "POSITIONS",
    action: "DEACTIVATE",
    recordId: positionId,
  });

  return mapPosition(position);
}

async function listCompanyEmployeeTypes(auth) {
  return listEmployeeTypes(auth.company_id).then((rows) => rows.map(mapEmployeeType));
}

async function getCompanyEmployeeType(auth, employeeTypeId) {
  const employeeType = await getEmployeeTypeById(auth.company_id, employeeTypeId);
  if (!employeeType) {
    throw new AppError(404, "Employee type not found", "EMPLOYEE_TYPE_NOT_FOUND");
  }
  return mapEmployeeType(employeeType);
}

async function createCompanyEmployeeType(auth, payload) {
  const employeeType = await createEmployeeType(auth.company_id, {
    name: payload.name,
    is_active: payload.is_active ?? true,
  });

  await createAuditLog({
    companyId: auth.company_id,
    userId: auth.user_id,
    module: "EMPLOYEE_TYPES",
    action: "CREATE",
    recordId: employeeType.employee_type_id,
    details: employeeType,
  });

  return mapEmployeeType(employeeType);
}

async function updateCompanyEmployeeType(auth, employeeTypeId, payload) {
  const current = await getEmployeeTypeById(auth.company_id, employeeTypeId);
  if (!current) {
    throw new AppError(404, "Employee type not found", "EMPLOYEE_TYPE_NOT_FOUND");
  }

  const updated = await updateEmployeeType(auth.company_id, employeeTypeId, payload);

  await createAuditLog({
    companyId: auth.company_id,
    userId: auth.user_id,
    module: "EMPLOYEE_TYPES",
    action: "UPDATE",
    recordId: employeeTypeId,
    details: payload,
  });

  return mapEmployeeType(updated);
}

async function setCompanyEmployeeTypeActive(auth, employeeTypeId, isActive) {
  const employeeType = await setEmployeeTypeActive(auth.company_id, employeeTypeId, isActive);
  if (!employeeType) {
    throw new AppError(404, "Employee type not found", "EMPLOYEE_TYPE_NOT_FOUND");
  }

  await createAuditLog({
    companyId: auth.company_id,
    userId: auth.user_id,
    module: "EMPLOYEE_TYPES",
    action: isActive ? "ACTIVATE" : "DEACTIVATE",
    recordId: employeeTypeId,
  });

  return mapEmployeeType(employeeType);
}

async function createEmployeeRecord(auth, payload) {
  await ensureDepartmentBelongsToCompany(auth.company_id, payload.department_id, "Employee department");
  await ensurePositionBelongsToCompany(auth.company_id, payload.position_id);
  await ensureEmployeeTypeBelongsToCompany(auth.company_id, payload.employee_type_id);

  if (payload.schedule_id) {
    const scheduleResult = await query(
      `SELECT schedule_id FROM working_schedules WHERE company_id = $1 AND schedule_id = $2 LIMIT 1`,
      [auth.company_id, payload.schedule_id]
    );
    if (!scheduleResult.rows[0]) {
      throw new AppError(400, "Employee schedule must belong to the same company", "CROSS_COMPANY_REFERENCE");
    }
  }

  if (payload.manager_id) {
    await ensureEmployeeBelongsToCompany(auth.company_id, payload.manager_id, "Employee manager");
  }

  const employeeId = await createEmployee(auth.company_id, {
    ...payload,
    created_by: auth.user_id,
  });

  const employee = await getEmployeeById(auth.company_id, employeeId);

  await createAuditLog({
    companyId: auth.company_id,
    userId: auth.user_id,
    module: "EMPLOYEES",
    action: "CREATE",
    recordId: employeeId,
    details: employee,
  });

  return mapEmployee(employee);
}

async function listEmployeeRecords(auth, filters, pagination, sort) {
  const result = await listEmployees(auth.company_id, filters, pagination, sort);
  return {
    rows: result.rows.map(mapEmployee),
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: result.total,
      total_pages: Math.max(1, Math.ceil(result.total / pagination.limit)),
    },
  };
}

async function getEmployeeRecord(auth, employeeId) {
  const employee = await getEmployeeById(auth.company_id, employeeId);
  if (!employee) {
    throw new AppError(404, "Employee not found", "EMPLOYEE_NOT_FOUND");
  }
  return mapEmployee(employee);
}

async function updateEmployeeRecord(auth, employeeId, payload) {
  const current = await getEmployeeById(auth.company_id, employeeId);
  if (!current) {
    throw new AppError(404, "Employee not found", "EMPLOYEE_NOT_FOUND");
  }

  if (payload.department_id !== undefined) {
    await ensureDepartmentBelongsToCompany(auth.company_id, payload.department_id, "Employee department");
  }
  if (payload.position_id !== undefined) {
    await ensurePositionBelongsToCompany(auth.company_id, payload.position_id);
  }
  if (payload.employee_type_id !== undefined) {
    await ensureEmployeeTypeBelongsToCompany(auth.company_id, payload.employee_type_id);
  }
  if (payload.schedule_id !== undefined) {
    const scheduleResult = await query(
      `SELECT schedule_id FROM working_schedules WHERE company_id = $1 AND schedule_id = $2 LIMIT 1`,
      [auth.company_id, payload.schedule_id]
    );
    if (!scheduleResult.rows[0] && payload.schedule_id !== null) {
      throw new AppError(400, "Employee schedule must belong to the same company", "CROSS_COMPANY_REFERENCE");
    }
  }

  if (payload.manager_id !== undefined) {
    if (payload.manager_id === employeeId) {
      throw new AppError(400, "Employee cannot manage themselves", "SELF_MANAGER_NOT_ALLOWED");
    }
    await ensureEmployeeBelongsToCompany(auth.company_id, payload.manager_id, "Employee manager");
    await ensureNoCircularReporting(auth.company_id, employeeId, payload.manager_id);
  }

  const updatedId = await updateEmployee(auth.company_id, employeeId, payload);
  const employee = await getEmployeeById(auth.company_id, updatedId);

  await createAuditLog({
    companyId: auth.company_id,
    userId: auth.user_id,
    module: "EMPLOYEES",
    action: "UPDATE",
    recordId: employeeId,
    details: payload,
  });

  return mapEmployee(employee);
}

async function changeEmployeeStatusRecord(auth, employeeId, status) {
  return withTransaction(async (client) => {
    const current = await getEmployeeById(auth.company_id, employeeId);
    if (!current) {
      throw new AppError(404, "Employee not found", "EMPLOYEE_NOT_FOUND");
    }

    const updated = await updateEmployeeStatus(auth.company_id, employeeId, status);
    if (!updated) {
      throw new AppError(404, "Employee not found", "EMPLOYEE_NOT_FOUND");
    }

    if (status !== "ACTIVE") {
      await query(
        `
          UPDATE user_sessions
          SET revoked_at = NOW(), updated_at = NOW()
          WHERE user_id IN (
            SELECT user_id FROM users WHERE employee_id = $1 AND company_id = $2
          )
            AND revoked_at IS NULL
        `,
        [employeeId, auth.company_id]
      );
    }

    await createAuditLog({
      companyId: auth.company_id,
      userId: auth.user_id,
      module: "EMPLOYEES",
      action: "UPDATE_STATUS",
      recordId: employeeId,
      details: { status },
    });

    return mapEmployee(await getEmployeeById(auth.company_id, employeeId));
  });
}

async function getMyEmployeeRecord(auth) {
  if (!auth.employee_id) {
    throw new AppError(404, "Employee profile not linked", "EMPLOYEE_PROFILE_NOT_LINKED");
  }
  return getEmployeeRecord(auth, auth.employee_id);
}

module.exports = {
  getCurrentCompany,
  updateCurrentCompany,
  listCompanyDepartments,
  getCompanyDepartment,
  createCompanyDepartment,
  updateCompanyDepartment,
  deactivateCompanyDepartment,
  listCompanyPositions,
  getCompanyPosition,
  createCompanyPosition,
  updateCompanyPosition,
  deactivateCompanyPosition,
  listCompanyEmployeeTypes,
  getCompanyEmployeeType,
  createCompanyEmployeeType,
  updateCompanyEmployeeType,
  setCompanyEmployeeTypeActive,
  createEmployeeRecord,
  listEmployeeRecords,
  getEmployeeRecord,
  updateEmployeeRecord,
  changeEmployeeStatusRecord,
  getMyEmployeeRecord,
};
