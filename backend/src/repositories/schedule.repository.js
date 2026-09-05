const { query } = require("../db");

async function listWorkingSchedules(companyId, filters = {}, client = null) {
  const executor = client || { query };
  const where = ["s.company_id = $1"];
  const values = [companyId];

  if (filters.is_active !== undefined && filters.is_active !== "all" && filters.is_active !== "any") {
    const isActive = filters.is_active === true || filters.is_active === "true";
    where.push(`s.is_active = $${values.length + 1}`);
    values.push(isActive);
  } else if (filters.is_active === undefined) {
    where.push(`s.is_active = TRUE`);
  }

  const result = await executor.query(
    `
      SELECT
        s.schedule_id,
        s.company_id,
        s.name,
        s.timezone,
        s.hours_per_week,
        s.attendance_policy_id,
        ap.name AS attendance_policy_name,
        s.is_active,
        s.created_at,
        s.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'schedule_day_id', d.schedule_day_id,
              'day_of_week', d.day_of_week,
              'is_working_day', d.is_working_day,
              'start_time', d.start_time,
              'end_time', d.end_time,
              'break_minutes', d.break_minutes
            ) ORDER BY d.day_of_week
          ) FILTER (WHERE d.schedule_day_id IS NOT NULL),
          '[]'::json
        ) AS days
      FROM working_schedules s
      LEFT JOIN attendance_policies ap ON ap.policy_id = s.attendance_policy_id
      LEFT JOIN schedule_days d ON d.schedule_id = s.schedule_id
      WHERE ${where.join(" AND ")}
      GROUP BY s.schedule_id, ap.name
      ORDER BY s.created_at DESC
    `,
    values
  );

  return result.rows;
}

async function getWorkingScheduleById(companyId, scheduleId, client = null) {
  const executor = client || { query };
  const result = await executor.query(
    `
      SELECT
        s.schedule_id,
        s.company_id,
        s.name,
        s.timezone,
        s.hours_per_week,
        s.attendance_policy_id,
        ap.name AS attendance_policy_name,
        s.is_active,
        s.created_at,
        s.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'schedule_day_id', d.schedule_day_id,
              'day_of_week', d.day_of_week,
              'is_working_day', d.is_working_day,
              'start_time', d.start_time,
              'end_time', d.end_time,
              'break_minutes', d.break_minutes
            ) ORDER BY d.day_of_week
          ) FILTER (WHERE d.schedule_day_id IS NOT NULL),
          '[]'::json
        ) AS days
      FROM working_schedules s
      LEFT JOIN attendance_policies ap ON ap.policy_id = s.attendance_policy_id
      LEFT JOIN schedule_days d ON d.schedule_id = s.schedule_id
      WHERE s.company_id = $1 AND s.schedule_id = $2
      GROUP BY s.schedule_id, ap.name
      LIMIT 1
    `,
    [companyId, scheduleId]
  );

  return result.rows[0] || null;
}

async function createWorkingSchedule(companyId, payload, client = null) {
  const executor = client || { query };
  const result = await executor.query(
    `
      INSERT INTO working_schedules (
        company_id,
        name,
        timezone,
        hours_per_week,
        attendance_policy_id,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5, COALESCE($6, TRUE))
      RETURNING schedule_id, company_id, name, timezone, hours_per_week, attendance_policy_id, is_active, created_at, updated_at
    `,
    [companyId, payload.name, payload.timezone, payload.hours_per_week, payload.attendance_policy_id || null, payload.is_active]
  );

  return result.rows[0] || null;
}

async function updateWorkingSchedule(companyId, scheduleId, payload, client = null) {
  const executor = client || { query };
  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(payload)) {
    if (key === "days") continue;
    fields.push(`${key} = $${values.length + 1}`);
    values.push(value);
  }

  if (!fields.length) {
    return getWorkingScheduleById(companyId, scheduleId, executor);
  }

  values.push(companyId, scheduleId);
  const result = await executor.query(
    `
      UPDATE working_schedules
      SET ${fields.join(", ")}, updated_at = NOW()
      WHERE company_id = $${values.length - 1}
        AND schedule_id = $${values.length}
      RETURNING schedule_id, company_id, name, timezone, hours_per_week, attendance_policy_id, is_active, created_at, updated_at
    `,
    values
  );

  return result.rows[0] || null;
}

async function setWorkingScheduleActive(companyId, scheduleId, isActive, client = null) {
  const executor = client || { query };
  const result = await executor.query(
    `
      UPDATE working_schedules
      SET is_active = $1, updated_at = NOW()
      WHERE company_id = $2 AND schedule_id = $3
      RETURNING schedule_id, company_id, name, timezone, hours_per_week, attendance_policy_id, is_active, created_at, updated_at
    `,
    [isActive, companyId, scheduleId]
  );

  return result.rows[0] || null;
}

async function replaceScheduleDays(scheduleId, days, client = null) {
  const executor = client || { query };
  await executor.query(`DELETE FROM schedule_days WHERE schedule_id = $1`, [scheduleId]);

  for (const day of days) {
    await executor.query(
      `
        INSERT INTO schedule_days (
          schedule_id,
          day_of_week,
          is_working_day,
          start_time,
          end_time,
          break_minutes
        )
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        scheduleId,
        day.day_of_week,
        day.is_working_day,
        day.start_time,
        day.end_time,
        day.break_minutes,
      ]
    );
  }
}

async function getScheduleByEmployee(companyId, employeeId, client = null) {
  const executor = client || { query };
  const result = await executor.query(
    `
      SELECT e.employee_id, e.company_id, e.schedule_id, s.name AS schedule_name, s.timezone, s.hours_per_week, s.attendance_policy_id, s.is_active
      FROM employees e
      LEFT JOIN working_schedules s ON s.schedule_id = e.schedule_id
      WHERE e.company_id = $1 AND e.employee_id = $2
      LIMIT 1
    `,
    [companyId, employeeId]
  );

  return result.rows[0] || null;
}

async function assignEmployeeSchedule(companyId, employeeId, scheduleId, client = null) {
  const executor = client || { query };
  const result = await executor.query(
    `
      UPDATE employees
      SET schedule_id = $1, updated_at = NOW()
      WHERE company_id = $2 AND employee_id = $3
      RETURNING employee_id, company_id, schedule_id
    `,
    [scheduleId, companyId, employeeId]
  );

  return result.rows[0] || null;
}

module.exports = {
  listWorkingSchedules,
  getWorkingScheduleById,
  createWorkingSchedule,
  updateWorkingSchedule,
  setWorkingScheduleActive,
  replaceScheduleDays,
  getScheduleByEmployee,
  assignEmployeeSchedule,
};

