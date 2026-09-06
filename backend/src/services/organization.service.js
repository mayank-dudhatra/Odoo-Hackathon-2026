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
  hardDeleteDepartment,
  listPositions,
  getPositionById,
  createPosition,
  updatePosition,
  setPositionActive,
  hardDeletePosition,
  listEmployeeTypes,
  getEmployeeTypeById,
  createEmployeeType,
  updateEmployeeType,
  setEmployeeTypeActive,
  hardDeleteEmployeeType,
  getEmployeeById,
  listEmployees,
  createEmployee,
  updateEmployee,
  updateEmployeeStatus,
  hardDeleteEmployee,
  findEmployeeById,
  listManagerChain,
} = require("../repositories/organization.repository");
const { createAuditLog } = require("./audit.service");
const { hashPassword, generateTemporaryPassword } = require("../utils/password");
const { sendUserInvitationEmail } = require("./email.service");
const { env } = require("../config/env");

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

async function listCompanyDepartments(auth, filters = {}) {
  return listDepartments(auth.company_id, filters).then((rows) => rows.map(mapDepartment));
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
  const current = await getDepartmentById(auth.company_id, departmentId);
  if (!current) {
    throw new AppError(404, "Department not found", "DEPARTMENT_NOT_FOUND");
  }

  const childDepRes = await query(
    `SELECT 1 FROM departments WHERE company_id = $1 AND parent_department_id = $2 LIMIT 1`,
    [auth.company_id, departmentId]
  );
  const posRes = await query(
    `SELECT 1 FROM positions WHERE company_id = $1 AND department_id = $2 LIMIT 1`,
    [auth.company_id, departmentId]
  );
  const empRes = await query(
    `SELECT 1 FROM employees WHERE company_id = $1 AND department_id = $2 LIMIT 1`,
    [auth.company_id, departmentId]
  );

  const isReferenced = childDepRes.rows.length > 0 || posRes.rows.length > 0 || empRes.rows.length > 0;

  if (isReferenced) {
    const department = await setDepartmentActive(auth.company_id, departmentId, false);
    await createAuditLog({
      companyId: auth.company_id,
      userId: auth.user_id,
      module: "DEPARTMENTS",
      action: "DEACTIVATE",
      recordId: departmentId,
    });
    return mapDepartment(department);
  } else {
    await hardDeleteDepartment(auth.company_id, departmentId);
    await createAuditLog({
      companyId: auth.company_id,
      userId: auth.user_id,
      module: "DEPARTMENTS",
      action: "DELETE",
      recordId: departmentId,
    });
    return { department_id: Number(departmentId), deleted: true };
  }
}

async function listCompanyPositions(auth, filters = {}) {
  return listPositions(auth.company_id, filters).then((rows) => rows.map(mapPosition));
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
  const current = await getPositionById(auth.company_id, positionId);
  if (!current) {
    throw new AppError(404, "Position not found", "POSITION_NOT_FOUND");
  }

  const empRes = await query(
    `SELECT 1 FROM employees WHERE company_id = $1 AND position_id = $2 LIMIT 1`,
    [auth.company_id, positionId]
  );

  if (empRes.rows.length > 0) {
    const position = await setPositionActive(auth.company_id, positionId, false);
    await createAuditLog({
      companyId: auth.company_id,
      userId: auth.user_id,
      module: "POSITIONS",
      action: "DEACTIVATE",
      recordId: positionId,
    });
    return mapPosition(position);
  } else {
    await hardDeletePosition(auth.company_id, positionId);
    await createAuditLog({
      companyId: auth.company_id,
      userId: auth.user_id,
      module: "POSITIONS",
      action: "DELETE",
      recordId: positionId,
    });
    return { position_id: Number(positionId), deleted: true };
  }
}

async function listCompanyEmployeeTypes(auth, filters = {}) {
  return listEmployeeTypes(auth.company_id, filters).then((rows) => rows.map(mapEmployeeType));
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
  const current = await getEmployeeTypeById(auth.company_id, employeeTypeId);
  if (!current) {
    throw new AppError(404, "Employee type not found", "EMPLOYEE_TYPE_NOT_FOUND");
  }

  if (isActive === false) {
    const empRes = await query(
      `SELECT 1 FROM employees WHERE company_id = $1 AND employee_type_id = $2 LIMIT 1`,
      [auth.company_id, employeeTypeId]
    );
    if (empRes.rows.length === 0) {
      await hardDeleteEmployeeType(auth.company_id, employeeTypeId);
      await createAuditLog({
        companyId: auth.company_id,
        userId: auth.user_id,
        module: "EMPLOYEE_TYPES",
        action: "DELETE",
        recordId: employeeTypeId,
      });
      return { employee_type_id: Number(employeeTypeId), deleted: true };
    }
  }

  const employeeType = await setEmployeeTypeActive(auth.company_id, employeeTypeId, isActive);

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
      `SELECT schedule_id, is_active FROM working_schedules WHERE company_id = $1 AND schedule_id = $2 LIMIT 1`,
      [auth.company_id, payload.schedule_id]
    );
    if (!scheduleResult.rows[0]) {
      throw new AppError(400, "Employee schedule must belong to the same company", "CROSS_COMPANY_REFERENCE");
    }
    if (!scheduleResult.rows[0].is_active) {
      throw new AppError(400, "Cannot assign an inactive schedule to an employee", "INACTIVE_SCHEDULE");
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

  // Automatically create user account & email credentials if employee has an email
  if (employee && employee.email && payload.create_user_account !== false) {
    try {
      const existingUser = await query(
        `SELECT user_id, employee_id FROM users WHERE company_id = $1 AND (LOWER(email) = LOWER($2) OR employee_id = $3) LIMIT 1`,
        [auth.company_id, employee.email.trim(), employeeId]
      );

      if (existingUser.rows[0]) {
        const targetUserId = existingUser.rows[0].user_id;
        if (!existingUser.rows[0].employee_id) {
          await query(
            `UPDATE users SET employee_id = $1, updated_at = NOW() WHERE user_id = $2 AND employee_id IS NULL`,
            [employeeId, targetUserId]
          );
        }
        await query(
          `UPDATE employees SET user_id = $1, updated_at = NOW() WHERE employee_id = $2`,
          [targetUserId, employeeId]
        );
        console.log(`[OrganizationService] Linked existing user (ID: ${targetUserId}) to employee ID ${employeeId}`);
      } else {
        const cleanFirst = (employee.first_name || "emp").toLowerCase().replace(/[^a-z0-9]/g, "");
        const cleanLast = (employee.last_name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        let baseUsername = cleanLast ? `${cleanFirst}.${cleanLast}` : cleanFirst;
        if (baseUsername.length < 3) baseUsername = `${baseUsername}100`;

        let chosenUsername = baseUsername;
        const userCheck = await query(
          `SELECT user_id FROM users WHERE company_id = $1 AND LOWER(username) = LOWER($2) LIMIT 1`,
          [auth.company_id, chosenUsername]
        );
        if (userCheck.rows[0]) {
          const codeSuffix = employee.employee_code ? employee.employee_code.toLowerCase().replace(/[^a-z0-9]/g, "") : String(employeeId);
          chosenUsername = `${baseUsername}.${codeSuffix}`;
        }

        const tempPassword = generateTemporaryPassword(12);
        const passwordHash = await hashPassword(tempPassword);

        const roleResult = await query(
          `SELECT role_id FROM roles WHERE role_name = 'Employee' LIMIT 1`
        );
        const employeeRoleId = roleResult.rows[0]?.role_id || 5;

        const userInsert = await query(
          `
            INSERT INTO users (
              company_id,
              employee_id,
              username,
              email,
              password_hash,
              role_id,
              status,
              must_change_password,
              email_verified_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE', TRUE, NOW())
            RETURNING user_id, username, email
          `,
          [
            auth.company_id,
            employeeId,
            chosenUsername,
            employee.email.trim(),
            passwordHash,
            employeeRoleId,
          ]
        );

        const newUser = userInsert.rows[0];

        await query(
          `UPDATE employees SET user_id = $1, updated_at = NOW() WHERE employee_id = $2`,
          [newUser.user_id, employeeId]
        );

        const companyResult = await query(
          `SELECT name FROM companies WHERE company_id = $1 LIMIT 1`,
          [auth.company_id]
        );
        const companyName = companyResult.rows[0]?.name || "PeoplePay360";

        try {
          await sendUserInvitationEmail({
            to: employee.email.trim(),
            userName: `${employee.first_name} ${employee.last_name || ''}`.trim(),
            emailOrUsername: employee.email.trim(),
            tempPassword,
            loginUrl: `${env.frontendBaseUrl.replace(/\/$/, "")}/login`,
            companyName,
            employeeCode: employee.employee_code,
            roleName: "Employee",
          });
          console.log(`[OrganizationService] Sent credentials email to new employee ${employee.email} (Username: ${chosenUsername})`);
        } catch (emailErr) {
          console.error(`[OrganizationService] Failed to send credentials email to ${employee.email}:`, emailErr.message);
        }

        await createAuditLog({
          companyId: auth.company_id,
          userId: auth.user_id,
          module: "AUTH",
          action: "USER_CREATED",
          recordId: newUser.user_id,
          details: {
            employee_id: employeeId,
            email: employee.email,
            username: chosenUsername,
            role_name: "Employee",
          },
        });

        await createAuditLog({
          companyId: auth.company_id,
          userId: auth.user_id,
          module: "AUTH",
          action: "INVITATION_SENT",
          recordId: newUser.user_id,
          details: {
            employee_id: employeeId,
            email: employee.email,
          },
        });
      }
    } catch (err) {
      console.error("[OrganizationService] Error auto-creating user account for employee:", err.message);
    }
  }

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
  const isEmployeeRole = auth.role_name === "Employee" || auth.permission_scope === "OWN";
  if (isEmployeeRole) {
    if (!auth.employee_id || Number(employeeId) !== Number(auth.employee_id)) {
      throw new AppError(403, "You can only update your own employee profile", "FORBIDDEN");
    }

    const protectedFields = [
      "company_id",
      "employee_code",
      "hire_date",
      "department_id",
      "position_id",
      "employee_type_id",
      "schedule_id",
      "manager_id",
      "status",
      "created_by",
    ];

    const attemptedProtected = protectedFields.filter((f) => payload[f] !== undefined && payload[f] !== null);
    if (attemptedProtected.length > 0) {
      throw new AppError(400, `Employees cannot modify administrative or employment fields: ${attemptedProtected.join(", ")}`, "PROTECTED_FIELDS_NOT_ALLOWED");
    }
  }

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
  if (payload.schedule_id !== undefined && payload.schedule_id !== null) {
    const scheduleResult = await query(
      `SELECT schedule_id, is_active FROM working_schedules WHERE company_id = $1 AND schedule_id = $2 LIMIT 1`,
      [auth.company_id, payload.schedule_id]
    );
    if (!scheduleResult.rows[0]) {
      throw new AppError(400, "Employee schedule must belong to the same company", "CROSS_COMPANY_REFERENCE");
    }
    if (!scheduleResult.rows[0].is_active) {
      throw new AppError(400, "Cannot assign an inactive schedule to an employee", "INACTIVE_SCHEDULE");
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

  if (employee && employee.email) {
    await query(
      `UPDATE users SET employee_id = $1, updated_at = NOW() WHERE company_id = $2 AND LOWER(email) = LOWER($3) AND employee_id IS NULL`,
      [employeeId, auth.company_id, employee.email.trim()]
    );
  }

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

async function deleteEmployeeRecord(auth, employeeId) {
  const current = await getEmployeeById(auth.company_id, employeeId);
  if (!current) {
    throw new AppError(404, "Employee not found", "EMPLOYEE_NOT_FOUND");
  }

  const userCheck = await query(`SELECT 1 FROM users WHERE company_id = $1 AND employee_id = $2 LIMIT 1`, [auth.company_id, employeeId]);
  const attCheck = await query(`SELECT 1 FROM attendance_logs WHERE company_id = $1 AND employee_id = $2 LIMIT 1`, [auth.company_id, employeeId]);
  const leaveReqCheck = await query(`SELECT 1 FROM leave_requests WHERE company_id = $1 AND employee_id = $2 LIMIT 1`, [auth.company_id, employeeId]);
  const leaveAllocCheck = await query(`SELECT 1 FROM leave_allocations WHERE company_id = $1 AND employee_id = $2 LIMIT 1`, [auth.company_id, employeeId]);
  const contractCheck = await query(`SELECT 1 FROM contracts WHERE company_id = $1 AND employee_id = $2 LIMIT 1`, [auth.company_id, employeeId]);
  const payslipCheck = await query(`SELECT 1 FROM payslips WHERE company_id = $1 AND employee_id = $2 LIMIT 1`, [auth.company_id, employeeId]);
  const deptMgrCheck = await query(`SELECT 1 FROM departments WHERE company_id = $1 AND manager_id = $2 LIMIT 1`, [auth.company_id, employeeId]);
  const empMgrCheck = await query(`SELECT 1 FROM employees WHERE company_id = $1 AND manager_id = $2 LIMIT 1`, [auth.company_id, employeeId]);

  const isReferenced =
    userCheck.rows.length > 0 ||
    attCheck.rows.length > 0 ||
    leaveReqCheck.rows.length > 0 ||
    leaveAllocCheck.rows.length > 0 ||
    contractCheck.rows.length > 0 ||
    payslipCheck.rows.length > 0 ||
    deptMgrCheck.rows.length > 0 ||
    empMgrCheck.rows.length > 0;

  if (isReferenced) {
    return changeEmployeeStatusRecord(auth, employeeId, "INACTIVE");
  } else {
    await hardDeleteEmployee(auth.company_id, employeeId);
    await createAuditLog({
      companyId: auth.company_id,
      userId: auth.user_id,
      module: "EMPLOYEES",
      action: "DELETE",
      recordId: employeeId,
    });
    return { employee_id: Number(employeeId), deleted: true };
  }
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
  deleteEmployeeRecord,
  getMyEmployeeRecord,
};
