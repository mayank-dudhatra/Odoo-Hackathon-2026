const { withTransaction, query } = require("../db");
const { AppError } = require("../utils/http");
const { createAuditLog } = require("./audit.service");
const {
  listWorkingSchedules,
  getWorkingScheduleById,
  createWorkingSchedule,
  updateWorkingSchedule,
  setWorkingScheduleActive,
  replaceScheduleDays,
  assignEmployeeSchedule,
} = require("../repositories/schedule.repository");
const { getEmployeeById } = require("../repositories/organization.repository");

function validateAndNormalizeDays(days) {
  if (!Array.isArray(days) || days.length === 0) {
    throw new AppError(400, "Schedule days array is required", "INVALID_SCHEDULE_DAYS");
  }

  const seen = new Set();
  const normalized = [];

  for (const day of days) {
    if (seen.has(day.day_of_week)) {
      throw new AppError(400, "Duplicate weekday in schedule days", "DUPLICATE_SCHEDULE_DAY");
    }
    seen.add(day.day_of_week);

    const isWorking = Boolean(day.is_working_day);
    const startTime = day.start_time ?? null;
    const endTime = day.end_time ?? null;
    const breakMinutes = Number(day.break_minutes || 0);

    if (isWorking) {
      if (!startTime || !endTime) {
        throw new AppError(400, "Working days require start and end times", "INVALID_SCHEDULE_DAY");
      }
      if (startTime >= endTime) {
        throw new AppError(400, "Start time must be earlier than end time", "INVALID_SCHEDULE_DAY_TIME");
      }
      const [startHour, startMinute] = startTime.split(":").map(Number);
      const [endHour, endMinute] = endTime.split(":").map(Number);
      const startTotal = startHour * 60 + startMinute;
      const endTotal = endHour * 60 + endMinute;
      const shiftDuration = endTotal - startTotal;

      if (breakMinutes >= shiftDuration) {
        throw new AppError(400, "Break duration cannot equal or exceed total working hours", "INVALID_SCHEDULE_BREAK_TIME");
      }
    } else if (startTime || endTime || breakMinutes !== 0) {
      throw new AppError(400, "Non-working days cannot contain working times or break minutes", "INVALID_NON_WORKING_DAY");
    }

    normalized.push({
      day_of_week: day.day_of_week,
      is_working_day: isWorking,
      start_time: startTime,
      end_time: endTime,
      break_minutes: isWorking ? breakMinutes : 0,
    });
  }

  const complete = [];
  for (let weekday = 1; weekday <= 7; weekday += 1) {
    const found = normalized.find((item) => item.day_of_week === weekday);
    if (found) {
      complete.push(found);
    } else {
      complete.push({
        day_of_week: weekday,
        is_working_day: false,
        start_time: null,
        end_time: null,
        break_minutes: 0,
      });
    }
  }

  const hoursPerWeek = complete.reduce((sum, day) => {
    if (!day.is_working_day) {
      return sum;
    }
    const [startHour, startMinute] = day.start_time.split(":").map(Number);
    const [endHour, endMinute] = day.end_time.split(":").map(Number);
    const startTotal = startHour * 60 + startMinute;
    const endTotal = endHour * 60 + endMinute;
    return sum + Math.max(0, (endTotal - startTotal - day.break_minutes) / 60);
  }, 0);

  return {
    days: complete,
    hours_per_week: Number(hoursPerWeek.toFixed(2)),
  };
}

async function ensureCompanyAttendancePolicy(companyId, attendancePolicyId) {
  if (!attendancePolicyId) return;
  const result = await query(
    `SELECT policy_id, is_active FROM attendance_policies WHERE company_id = $1 AND policy_id = $2 LIMIT 1`,
    [companyId, attendancePolicyId]
  );
  if (!result.rows[0]) {
    throw new AppError(400, "Attendance policy must belong to the same company", "CROSS_COMPANY_REFERENCE");
  }
  if (!result.rows[0].is_active) {
    throw new AppError(400, "Cannot assign an inactive attendance policy", "INACTIVE_ATTENDANCE_POLICY");
  }
}

async function ensureCompanyEmployee(companyId, employeeId) {
  if (!employeeId) return null;
  const employee = await getEmployeeById(companyId, employeeId);
  if (!employee) {
    throw new AppError(400, "Employee must belong to the same company", "CROSS_COMPANY_REFERENCE");
  }
  return employee;
}

async function ensureCompanySchedule(companyId, scheduleId) {
  if (!scheduleId) return null;
  const schedule = await getWorkingScheduleById(companyId, scheduleId);
  if (!schedule) {
    throw new AppError(400, "Schedule must belong to the same company", "CROSS_COMPANY_REFERENCE");
  }
  if (!schedule.is_active) {
    throw new AppError(400, "Cannot assign an inactive schedule", "INACTIVE_SCHEDULE");
  }
  return schedule;
}

async function listSchedules(auth, filters = {}) {
  const rows = await listWorkingSchedules(auth.company_id, filters);
  return rows.map((row) => ({
    schedule_id: row.schedule_id,
    company_id: row.company_id,
    name: row.name,
    timezone: row.timezone,
    hours_per_week: row.hours_per_week,
    attendance_policy_id: row.attendance_policy_id,
    attendance_policy_name: row.attendance_policy_name,
    is_active: row.is_active,
    days: row.days,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

async function getSchedule(auth, scheduleId) {
  const schedule = await getWorkingScheduleById(auth.company_id, scheduleId);
  if (!schedule) {
    throw new AppError(404, "Schedule not found", "SCHEDULE_NOT_FOUND");
  }
  return schedule;
}

async function createSchedule(auth, payload) {
  return withTransaction(async (client) => {
    await ensureCompanyAttendancePolicy(auth.company_id, payload.attendance_policy_id || null);
    const normalized = validateAndNormalizeDays(payload.days);

    const duplicate = await client.query(
      `SELECT schedule_id FROM working_schedules WHERE company_id = $1 AND name = $2 LIMIT 1`,
      [auth.company_id, payload.name]
    );
    if (duplicate.rows[0]) {
      throw new AppError(409, "Schedule name already exists", "DUPLICATE_RECORD");
    }

    const schedule = await createWorkingSchedule(
      auth.company_id,
      {
        name: payload.name,
        timezone: payload.timezone,
        hours_per_week: normalized.hours_per_week,
        attendance_policy_id: payload.attendance_policy_id || null,
        is_active: payload.is_active ?? true,
      },
      client
    );

    await replaceScheduleDays(schedule.schedule_id, normalized.days, client);

    await createAuditLog({
      companyId: auth.company_id,
      userId: auth.user_id,
      module: "WORKING_SCHEDULES",
      action: "CREATE",
      recordId: schedule.schedule_id,
      details: { name: schedule.name, hours_per_week: normalized.hours_per_week },
    });

    return getWorkingScheduleById(auth.company_id, schedule.schedule_id, client);
  });
}

async function updateSchedule(auth, scheduleId, payload) {
  return withTransaction(async (client) => {
    const current = await getWorkingScheduleById(auth.company_id, scheduleId, client);
    if (!current) {
      throw new AppError(404, "Schedule not found", "SCHEDULE_NOT_FOUND");
    }

    if (payload.attendance_policy_id !== undefined) {
      await ensureCompanyAttendancePolicy(auth.company_id, payload.attendance_policy_id);
    }

    if (payload.name && payload.name !== current.name) {
      const duplicate = await client.query(
        `SELECT schedule_id FROM working_schedules WHERE company_id = $1 AND name = $2 AND schedule_id <> $3 LIMIT 1`,
        [auth.company_id, payload.name, scheduleId]
      );
      if (duplicate.rows[0]) {
        throw new AppError(409, "Schedule name already exists", "DUPLICATE_RECORD");
      }
    }

    let normalized = null;
    if (payload.days) {
      normalized = validateAndNormalizeDays(payload.days);
    }

    await updateWorkingSchedule(
      auth.company_id,
      scheduleId,
      {
        name: payload.name ?? current.name,
        timezone: payload.timezone ?? current.timezone,
        attendance_policy_id: payload.attendance_policy_id ?? current.attendance_policy_id,
        hours_per_week: normalized ? normalized.hours_per_week : current.hours_per_week,
        is_active: payload.is_active ?? current.is_active,
      },
      client
    );

    if (normalized) {
      await replaceScheduleDays(scheduleId, normalized.days, client);
    }

    await createAuditLog({
      companyId: auth.company_id,
      userId: auth.user_id,
      module: "WORKING_SCHEDULES",
      action: "UPDATE",
      recordId: scheduleId,
      details: payload,
    });

    return getWorkingScheduleById(auth.company_id, scheduleId, client);
  });
}

async function deactivateSchedule(auth, scheduleId) {
  return withTransaction(async (client) => {
    const current = await getWorkingScheduleById(auth.company_id, scheduleId, client);
    if (!current) {
      throw new AppError(404, "Schedule not found", "SCHEDULE_NOT_FOUND");
    }

    const empRes = await client.query(
      `SELECT 1 FROM employees WHERE company_id = $1 AND schedule_id = $2 LIMIT 1`,
      [auth.company_id, scheduleId]
    );
    const contractRes = await client.query(
      `SELECT 1 FROM contracts WHERE company_id = $1 AND schedule_id = $2 LIMIT 1`,
      [auth.company_id, scheduleId]
    );

    const isReferenced = empRes.rows.length > 0 || contractRes.rows.length > 0;

    if (isReferenced) {
      const schedule = await setWorkingScheduleActive(auth.company_id, scheduleId, false, client);
      await createAuditLog({
        companyId: auth.company_id,
        userId: auth.user_id,
        module: "WORKING_SCHEDULES",
        action: "DEACTIVATE",
        recordId: scheduleId,
      });
      return getWorkingScheduleById(auth.company_id, scheduleId, client);
    } else {
      await client.query(`DELETE FROM schedule_days WHERE schedule_id = $1`, [scheduleId]);
      await client.query(`DELETE FROM working_schedules WHERE company_id = $1 AND schedule_id = $2`, [
        auth.company_id,
        scheduleId,
      ]);
      await createAuditLog({
        companyId: auth.company_id,
        userId: auth.user_id,
        module: "WORKING_SCHEDULES",
        action: "DELETE",
        recordId: scheduleId,
      });
      return { schedule_id: Number(scheduleId), deleted: true };
    }
  });
}


async function assignScheduleToEmployee(auth, employeeId, scheduleId) {
  return withTransaction(async (client) => {
    await ensureCompanyEmployee(auth.company_id, employeeId);
    await ensureCompanySchedule(auth.company_id, scheduleId);

    const updated = await assignEmployeeSchedule(auth.company_id, employeeId, scheduleId, client);
    await createAuditLog({
      companyId: auth.company_id,
      userId: auth.user_id,
      module: "EMPLOYEES",
      action: "ASSIGN_SCHEDULE",
      recordId: employeeId,
      details: { schedule_id: scheduleId },
    });

    return updated;
  });
}

module.exports = {
  listSchedules,
  getSchedule,
  createSchedule,
  updateSchedule,
  deactivateSchedule,
  assignScheduleToEmployee,
  validateAndNormalizeDays,
};

