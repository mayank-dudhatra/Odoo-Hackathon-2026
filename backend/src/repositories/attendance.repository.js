const { query } = require("../db");

async function getAttendanceByEmployeeAndDate(companyId, employeeId, workDate, client = null) {
  const executor = client || { query };
  const result = await executor.query(
    `
      SELECT
        a.*,
        CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
        e.employee_code
      FROM attendance a
      JOIN employees e ON e.employee_id = a.employee_id
      WHERE a.company_id = $1 AND a.employee_id = $2 AND a.work_date = $3
      LIMIT 1
    `,
    [companyId, employeeId, workDate]
  );
  return result.rows[0] || null;
}

async function getAttendanceById(companyId, attendanceId, client = null) {
  const executor = client || { query };
  const result = await executor.query(
    `
      SELECT
        a.*,
        CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
        e.employee_code,
        e.department_id,
        d.name AS department_name,
        e.position_id,
        p.title AS position_name
      FROM attendance a
      JOIN employees e ON e.employee_id = a.employee_id
      LEFT JOIN departments d ON d.department_id = e.department_id
      LEFT JOIN positions p ON p.position_id = e.position_id
      WHERE a.company_id = $1 AND a.attendance_id = $2
      LIMIT 1
    `,
    [companyId, attendanceId]
  );
  return result.rows[0] || null;
}

async function createAttendanceRecord(companyId, payload, client = null) {
  const executor = client || { query };
  const result = await executor.query(
    `
      INSERT INTO attendance (
        company_id,
        employee_id,
        work_date,
        check_in,
        check_out,
        hours_worked,
        status,
        scheduled_start_time,
        scheduled_end_time,
        scheduled_break_minutes,
        late_minutes,
        early_leave_minutes,
        late_status,
        grace_occurrence_no,
        deduction_type,
        deduction_days,
        remarks,
        created_by
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
      )
      RETURNING *
    `,
    [
      companyId,
      payload.employee_id,
      payload.work_date,
      payload.check_in || null,
      payload.check_out || null,
      payload.hours_worked ?? 0,
      payload.status,
      payload.scheduled_start_time || null,
      payload.scheduled_end_time || null,
      payload.scheduled_break_minutes ?? 0,
      payload.late_minutes ?? 0,
      payload.early_leave_minutes ?? 0,
      payload.late_status || null,
      payload.grace_occurrence_no || null,
      payload.deduction_type || "NONE",
      payload.deduction_days ?? 0,
      payload.remarks || null,
      payload.created_by || null,
    ]
  );
  return result.rows[0] || null;
}

async function updateAttendanceRecord(companyId, attendanceId, payload, client = null) {
  const executor = client || { query };
  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(payload)) {
    fields.push(`${key} = $${values.length + 1}`);
    values.push(value);
  }

  if (!fields.length) {
    return getAttendanceById(companyId, attendanceId, executor);
  }

  values.push(companyId, attendanceId);
  const result = await executor.query(
    `
      UPDATE attendance
      SET ${fields.join(", ")}, updated_at = NOW()
      WHERE company_id = $${values.length - 1} AND attendance_id = $${values.length}
      RETURNING *
    `,
    values
  );
  return result.rows[0] || null;
}

async function listAttendanceRecords(companyId, filters = {}, client = null) {
  const executor = client || { query };
  const where = ["a.company_id = $1"];
  const values = [companyId];

  if (filters.employee_id) {
    values.push(filters.employee_id);
    where.push(`a.employee_id = $${values.length}`);
  }

  if (filters.work_date) {
    values.push(filters.work_date);
    where.push(`a.work_date = $${values.length}`);
  }

  if (filters.start_date) {
    values.push(filters.start_date);
    where.push(`a.work_date >= $${values.length}`);
  }

  if (filters.end_date) {
    values.push(filters.end_date);
    where.push(`a.work_date <= $${values.length}`);
  }

  if (filters.department_id) {
    values.push(filters.department_id);
    where.push(`e.department_id = $${values.length}`);
  }

  if (filters.position_id) {
    values.push(filters.position_id);
    where.push(`e.position_id = $${values.length}`);
  }

  if (filters.status) {
    values.push(filters.status);
    where.push(`a.status = $${values.length}`);
  }

  if (filters.late_status) {
    values.push(filters.late_status);
    where.push(`a.late_status = $${values.length}`);
  }

  if (filters.deduction_type) {
    values.push(filters.deduction_type);
    where.push(`a.deduction_type = $${values.length}`);
  }

  const page = Math.max(1, Number(filters.page || 1));
  const limit = Math.min(100, Math.max(1, Number(filters.limit || 20)));
  const offset = (page - 1) * limit;

  const countResult = await executor.query(
    `
      SELECT COUNT(*)::int AS total
      FROM attendance a
      JOIN employees e ON e.employee_id = a.employee_id
      WHERE ${where.join(" AND ")}
    `,
    values
  );

  const totalRecords = countResult.rows[0]?.total || 0;
  const totalPages = Math.ceil(totalRecords / limit) || 1;

  values.push(limit, offset);
  const dataResult = await executor.query(
    `
      SELECT
        a.*,
        CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
        e.employee_code,
        e.department_id,
        d.name AS department_name,
        e.position_id,
        p.title AS position_name
      FROM attendance a
      JOIN employees e ON e.employee_id = a.employee_id
      LEFT JOIN departments d ON d.department_id = e.department_id
      LEFT JOIN positions p ON p.position_id = e.position_id
      WHERE ${where.join(" AND ")}
      ORDER BY a.work_date DESC, a.created_at DESC
      LIMIT $${values.length - 1} OFFSET $${values.length}
    `,
    values
  );

  return {
    data: dataResult.rows,
    pagination: {
      total: totalRecords,
      page,
      limit,
      total_pages: totalPages,
    },
  };
}

async function lockAndGetMonthlyCounter(companyId, employeeId, year, month, client) {
  // Transactional lock and fetch of monthly counter
  let result = await client.query(
    `
      SELECT *
      FROM attendance_monthly_counters
      WHERE company_id = $1 AND employee_id = $2 AND year = $3 AND month = $4
      FOR UPDATE
    `,
    [companyId, employeeId, year, month]
  );

  if (!result.rows[0]) {
    await client.query(
      `
        INSERT INTO attendance_monthly_counters (company_id, employee_id, year, month, grace_late_count, half_day_deductions, full_day_deductions, early_leave_count)
        VALUES ($1, $2, $3, $4, 0, 0, 0, 0)
        ON CONFLICT (company_id, employee_id, year, month) DO NOTHING
      `,
      [companyId, employeeId, year, month]
    );

    result = await client.query(
      `
        SELECT *
        FROM attendance_monthly_counters
        WHERE company_id = $1 AND employee_id = $2 AND year = $3 AND month = $4
        FOR UPDATE
      `,
      [companyId, employeeId, year, month]
    );
  }

  return result.rows[0];
}

async function adjustMonthlyCounter(companyId, employeeId, year, month, diffs, client) {
  // Ensure row exists and is locked
  const counter = await lockAndGetMonthlyCounter(companyId, employeeId, year, month, client);

  const deltaGraceLate = diffs.grace_late || 0;
  const deltaEarlyLeave = diffs.early_leave || 0;
  const deltaHalfDay = diffs.half_day || 0;
  const deltaFullDay = diffs.full_day || 0;

  const newGraceLate = Math.max(0, (counter.grace_late_count || 0) + deltaGraceLate);
  const newEarlyLeave = Math.max(0, (counter.early_leave_count || 0) + deltaEarlyLeave);
  const newHalfDay = Math.max(0, (counter.half_day_deductions || 0) + deltaHalfDay);
  const newFullDay = Math.max(0, (counter.full_day_deductions || 0) + deltaFullDay);

  const result = await client.query(
    `
      UPDATE attendance_monthly_counters
      SET
        grace_late_count = $1,
        early_leave_count = $2,
        half_day_deductions = $3,
        full_day_deductions = $4,
        updated_at = NOW()
      WHERE counter_id = $5
      RETURNING *
    `,
    [newGraceLate, newEarlyLeave, newHalfDay, newFullDay, counter.counter_id]
  );

  return result.rows[0];
}

module.exports = {
  getAttendanceByEmployeeAndDate,
  getAttendanceById,
  createAttendanceRecord,
  updateAttendanceRecord,
  listAttendanceRecords,
  lockAndGetMonthlyCounter,
  adjustMonthlyCounter,
};
