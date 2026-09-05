const { withTransaction, query } = require("../db");
const { AppError } = require("../utils/http");
const { createAuditLog } = require("./audit.service");
const { getDepartmentById, getPositionById, getEmployeeById } = require("../repositories/organization.repository");
const { getWorkingScheduleById } = require("../repositories/schedule.repository");
const {
  listContracts,
  getContractById,
  createContract,
  updateContract,
  setContractStatus,
} = require("../repositories/contract.repository");
const { resolveEffectiveSchedule } = require("./schedule.resolver.service");
const { resolveEffectiveContract } = require("./contract.resolver.service");

function normalizeDateStr(val) {
  if (!val) return null;
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

async function ensureCompanySchedule(companyId, scheduleId) {
  if (!scheduleId) return null;
  const schedule = await getWorkingScheduleById(companyId, scheduleId);
  if (!schedule) {
    throw new AppError(400, "Schedule must belong to the same company", "CROSS_COMPANY_REFERENCE");
  }
  if (!schedule.is_active) {
    throw new AppError(400, "Cannot assign an inactive schedule to a contract", "INACTIVE_SCHEDULE");
  }
  return schedule;
}

async function ensureCompanySalaryStructure(companyId, salaryStructureId) {
  const result = await query(
    `SELECT salary_structure_id, is_active FROM salary_structures WHERE company_id = $1 AND salary_structure_id = $2 LIMIT 1`,
    [companyId, salaryStructureId]
  );
  if (!result.rows[0]) {
    throw new AppError(400, "Salary structure must belong to the same company", "CROSS_COMPANY_REFERENCE");
  }
  if (!result.rows[0].is_active) {
    throw new AppError(400, "Cannot assign an inactive salary structure to a contract", "INACTIVE_SALARY_STRUCTURE");
  }
}

async function ensureCompanyEmployee(companyId, employeeId) {
  const employee = await getEmployeeById(companyId, employeeId);
  if (!employee) {
    throw new AppError(400, "Employee must belong to the same company", "CROSS_COMPANY_REFERENCE");
  }
  return employee;
}

async function ensureCompanyDepartment(companyId, departmentId) {
  if (!departmentId) return null;
  const department = await getDepartmentById(companyId, departmentId);
  if (!department) {
    throw new AppError(400, "Department must belong to the same company", "CROSS_COMPANY_REFERENCE");
  }
  return department;
}

async function ensureCompanyPosition(companyId, positionId) {
  if (!positionId) return null;
  const position = await getPositionById(companyId, positionId);
  if (!position) {
    throw new AppError(400, "Position must belong to the same company", "CROSS_COMPANY_REFERENCE");
  }
  return position;
}

async function lockEmployeeContractScope(client, companyId, employeeId) {
  await client.query(`SELECT pg_advisory_xact_lock($1, $2)`, [companyId, employeeId]);
}

async function checkOverlap(companyId, employeeId, startDate, endDate, ignoreContractId = null, client = null) {
  const executor = client || { query };
  const sDate = normalizeDateStr(startDate);
  const eDate = normalizeDateStr(endDate);

  const result = await executor.query(
    `
      SELECT contract_id
      FROM contracts
      WHERE company_id = $1
        AND employee_id = $2
        AND status = 'ACTIVE'
        AND daterange(start_date, COALESCE(end_date, 'infinity'::date), '[]') && daterange($3::date, COALESCE($4::date, 'infinity'::date), '[]')
        AND ($5::int IS NULL OR contract_id <> $5)
      LIMIT 1
    `,
    [companyId, employeeId, sDate, eDate || null, ignoreContractId]
  );

  if (result.rows[0]) {
    throw new AppError(400, "Active contract overlaps an existing contract period for this employee", "CONTRACT_OVERLAP");
  }
}

async function maybeActivateEmployeeSchedule(companyId, employeeId, scheduleId, startDate, status, client) {
  if (status !== "ACTIVE" || !scheduleId) return;
  const sDate = normalizeDateStr(startDate);
  const today = new Date().toISOString().slice(0, 10);
  if (sDate <= today) {
    await client.query(
      `UPDATE employees SET schedule_id = $1, updated_at = NOW() WHERE company_id = $2 AND employee_id = $3`,
      [scheduleId, companyId, employeeId]
    );
  }
}

async function listCompanyContracts(auth, filters) {
  return listContracts(auth.company_id, filters);
}

async function getCompanyContract(auth, contractId) {
  const contract = await getContractById(auth.company_id, contractId);
  if (!contract) {
    throw new AppError(404, "Contract not found", "CONTRACT_NOT_FOUND");
  }
  return contract;
}

async function createCompanyContract(auth, payload) {
  return withTransaction(async (client) => {
    const startDate = normalizeDateStr(payload.start_date);
    const endDate = normalizeDateStr(payload.end_date);

    if (!startDate) {
      throw new AppError(400, "Start date is required", "INVALID_CONTRACT_DATES");
    }

    if (endDate && endDate < startDate) {
      throw new AppError(400, "End date must be on or after start date", "INVALID_CONTRACT_DATES");
    }

    await lockEmployeeContractScope(client, auth.company_id, payload.employee_id);
    const employee = await ensureCompanyEmployee(auth.company_id, payload.employee_id);
    await ensureCompanyDepartment(auth.company_id, payload.department_id || null);
    await ensureCompanyPosition(auth.company_id, payload.position_id || null);
    await ensureCompanySchedule(auth.company_id, payload.schedule_id || null);
    await ensureCompanySalaryStructure(auth.company_id, payload.salary_structure_id);

    const status = payload.status || "DRAFT";
    if (status === "ACTIVE") {
      await checkOverlap(auth.company_id, payload.employee_id, startDate, endDate, null, client);
    }

    const contractId = await createContract(
      auth.company_id,
      {
        ...payload,
        start_date: startDate,
        end_date: endDate || null,
        status,
        created_by: auth.user_id,
      },
      client
    );

    await maybeActivateEmployeeSchedule(
      auth.company_id,
      payload.employee_id,
      payload.schedule_id || employee.schedule_id || null,
      startDate,
      status,
      client
    );

    await createAuditLog({
      companyId: auth.company_id,
      userId: auth.user_id,
      module: "CONTRACTS",
      action: "CREATE",
      recordId: contractId,
      details: {
        employee_id: payload.employee_id,
        start_date: startDate,
        status,
      },
    });

    return getContractById(auth.company_id, contractId, client);
  });
}

async function updateCompanyContract(auth, contractId, payload) {
  return withTransaction(async (client) => {
    const current = await getContractById(auth.company_id, contractId, client);
    if (!current) {
      throw new AppError(404, "Contract not found", "CONTRACT_NOT_FOUND");
    }

    await lockEmployeeContractScope(client, auth.company_id, current.employee_id);

    const nextEmployeeId = current.employee_id;
    await ensureCompanyEmployee(auth.company_id, nextEmployeeId);

    if (payload.department_id !== undefined) await ensureCompanyDepartment(auth.company_id, payload.department_id || null);
    if (payload.position_id !== undefined) await ensureCompanyPosition(auth.company_id, payload.position_id || null);
    if (payload.schedule_id !== undefined) await ensureCompanySchedule(auth.company_id, payload.schedule_id || null);
    if (payload.salary_structure_id !== undefined) await ensureCompanySalaryStructure(auth.company_id, payload.salary_structure_id);

    const nextStartDate = payload.start_date !== undefined ? normalizeDateStr(payload.start_date) : current.start_date;
    const nextEndDate = payload.end_date !== undefined ? normalizeDateStr(payload.end_date) : current.end_date;

    if (nextEndDate && nextEndDate < nextStartDate) {
      throw new AppError(400, "End date must be on or after start date", "INVALID_CONTRACT_DATES");
    }

    const nextStatus = payload.status || current.status;
    if (nextStatus === "ACTIVE") {
      await checkOverlap(auth.company_id, nextEmployeeId, nextStartDate, nextEndDate, contractId, client);
    }

    const updatePayload = {
      ...payload,
      start_date: nextStartDate,
      end_date: nextEndDate,
      status: nextStatus,
    };

    await updateContract(auth.company_id, contractId, updatePayload, client);
    await maybeActivateEmployeeSchedule(
      auth.company_id,
      nextEmployeeId,
      payload.schedule_id || current.schedule_id || null,
      nextStartDate,
      nextStatus,
      client
    );

    await createAuditLog({
      companyId: auth.company_id,
      userId: auth.user_id,
      module: "CONTRACTS",
      action: "UPDATE",
      recordId: contractId,
      details: payload,
    });

    return getContractById(auth.company_id, contractId, client);
  });
}

async function terminateCompanyContract(auth, contractId) {
  return withTransaction(async (client) => {
    const current = await getContractById(auth.company_id, contractId, client);
    if (!current) {
      throw new AppError(404, "Contract not found", "CONTRACT_NOT_FOUND");
    }

    const terminated = await setContractStatus(auth.company_id, contractId, "TERMINATED", client);
    await client.query(
      `
        UPDATE contracts
        SET end_date = CASE
          WHEN end_date IS NULL OR end_date > CURRENT_DATE THEN CURRENT_DATE
          ELSE end_date
        END,
        updated_at = NOW()
        WHERE company_id = $1 AND contract_id = $2
      `,
      [auth.company_id, contractId]
    );

    await createAuditLog({
      companyId: auth.company_id,
      userId: auth.user_id,
      module: "CONTRACTS",
      action: "TERMINATE",
      recordId: contractId,
      details: { status: terminated.status },
    });

    return getContractById(auth.company_id, contractId, client);
  });
}


async function resolveContract(auth, employeeId, targetDate) {
  return resolveEffectiveContract(auth.company_id, employeeId, targetDate);
}

async function resolveSchedule(auth, employeeId, targetDate) {
  return resolveEffectiveSchedule(auth.company_id, employeeId, targetDate);
}

module.exports = {
  listCompanyContracts,
  getCompanyContract,
  createCompanyContract,
  updateCompanyContract,
  terminateCompanyContract,
  resolveContract,
  resolveSchedule,
};

