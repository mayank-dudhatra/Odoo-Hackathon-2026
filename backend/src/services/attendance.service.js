const { withTransaction, query } = require("../db");
const { AppError } = require("../utils/http");
const { createAuditLog } = require("./audit.service");
const { resolveEffectiveSchedule } = require("./schedule.resolver.service");
const { getDefaultAttendancePolicy, getAttendancePolicyById } = require("../repositories/attendance-policy.repository");
const {
  getAttendanceByEmployeeAndDate,
  getAttendanceById,
  createAttendanceRecord,
  updateAttendanceRecord,
  listAttendanceRecords,
  lockAndGetMonthlyCounter,
  adjustMonthlyCounter,
} = require("../repositories/attendance.repository");
const { calculateAttendanceMetrics } = require("./attendance-calculation.service");

function getWeekdayNumber(dateStr) {
  // ISO-8601 day of week: Monday = 1, ..., Sunday = 7
  const day = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

function getYearAndMonth(dateStr) {
  const parts = dateStr.split("-");
  return {
    year: Number(parts[0]),
    month: Number(parts[1]),
  };
}

async function resolvePolicyForSchedule(companyId, effectiveSchedule, client = null) {
  if (effectiveSchedule && effectiveSchedule.attendance_policy_id) {
    const policy = await getAttendancePolicyById(companyId, effectiveSchedule.attendance_policy_id, client);
    if (policy && policy.is_active) {
      return policy;
    }
  }

  const defaultPolicy = await getDefaultAttendancePolicy(companyId, client);
  return defaultPolicy || {
    grace_period_minutes: 0,
    grace_occurrences_allowed: 0,
    grace_period_penalty: "NONE",
    beyond_grace_penalty: "NONE",
    early_leave_grace_minutes: 0,
    early_leave_penalty: "NONE",
    stack_deductions: false,
  };
}

async function processCheckIn(auth, payload) {
  const employeeId = auth.employee_id || payload.employee_id;
  if (!employeeId) {
    throw new AppError(400, "Employee ID is required for check-in", "MISSING_EMPLOYEE_ID");
  }

  const workDate = payload.work_date || new Date().toISOString().slice(0, 10);
  const checkInTimestamp = payload.check_in || new Date().toISOString();

  return withTransaction(async (client) => {
    const existing = await getAttendanceByEmployeeAndDate(auth.company_id, employeeId, workDate, client);
    if (existing && existing.check_in) {
      throw new AppError(400, "Check-in record already exists for this working date", "DUPLICATE_CHECK_IN");
    }

    const effectiveSchedule = await resolveEffectiveSchedule(auth.company_id, employeeId, workDate);
    const dayOfWeek = getWeekdayNumber(workDate);
    const scheduleDay = (effectiveSchedule.days || []).find((d) => d.day_of_week === dayOfWeek);

    const policy = await resolvePolicyForSchedule(auth.company_id, effectiveSchedule, client);

    const { year, month } = getYearAndMonth(workDate);
    const counter = await lockAndGetMonthlyCounter(auth.company_id, employeeId, year, month, client);

    const metrics = calculateAttendanceMetrics({
      checkIn: checkInTimestamp,
      checkOut: null,
      workDate,
      scheduleDay,
      policy,
      currentMonthlyGraceCount: counter.grace_late_count || 0,
    });

    let record;
    if (existing) {
      record = await updateAttendanceRecord(
        auth.company_id,
        existing.attendance_id,
        {
          check_in: checkInTimestamp,
          hours_worked: metrics.hours_worked,
          status: metrics.status,
          scheduled_start_time: metrics.scheduled_start_time,
          scheduled_end_time: metrics.scheduled_end_time,
          scheduled_break_minutes: metrics.scheduled_break_minutes,
          late_minutes: metrics.late_minutes,
          early_leave_minutes: metrics.early_leave_minutes,
          late_status: metrics.late_status,
          grace_occurrence_no: metrics.grace_occurrence_no,
          deduction_type: metrics.deduction_type,
          deduction_days: metrics.deduction_days,
          remarks: payload.remarks || existing.remarks,
        },
        client
      );
    } else {
      record = await createAttendanceRecord(
        auth.company_id,
        {
          employee_id: employeeId,
          work_date: workDate,
          check_in: checkInTimestamp,
          check_out: null,
          hours_worked: metrics.hours_worked,
          status: metrics.status,
          scheduled_start_time: metrics.scheduled_start_time,
          scheduled_end_time: metrics.scheduled_end_time,
          scheduled_break_minutes: metrics.scheduled_break_minutes,
          late_minutes: metrics.late_minutes,
          early_leave_minutes: metrics.early_leave_minutes,
          late_status: metrics.late_status,
          grace_occurrence_no: metrics.grace_occurrence_no,
          deduction_type: metrics.deduction_type,
          deduction_days: metrics.deduction_days,
          remarks: payload.remarks || null,
          created_by: auth.user_id,
        },
        client
      );
    }

    await adjustMonthlyCounter(
      auth.company_id,
      employeeId,
      year,
      month,
      {
        grace_late: metrics.inc_grace_late,
        early_leave: metrics.inc_early_leave,
        half_day: metrics.inc_half_day,
        full_day: metrics.inc_full_day,
      },
      client
    );

    await createAuditLog({
      companyId: auth.company_id,
      userId: auth.user_id,
      module: "ATTENDANCE",
      action: "CHECK_IN",
      recordId: record.attendance_id,
      details: { work_date: workDate, check_in: checkInTimestamp },
    });

    return getAttendanceById(auth.company_id, record.attendance_id, client);
  });
}

async function processCheckOut(auth, payload) {
  const employeeId = auth.employee_id || payload.employee_id;
  if (!employeeId) {
    throw new AppError(400, "Employee ID is required for check-out", "MISSING_EMPLOYEE_ID");
  }

  const workDate = payload.work_date || new Date().toISOString().slice(0, 10);
  const checkOutTimestamp = payload.check_out || new Date().toISOString();

  return withTransaction(async (client) => {
    const existing = await getAttendanceByEmployeeAndDate(auth.company_id, employeeId, workDate, client);
    if (!existing || !existing.check_in) {
      throw new AppError(400, "Check-in record required before check-out", "CHECK_IN_REQUIRED");
    }

    if (new Date(checkOutTimestamp) <= new Date(existing.check_in)) {
      throw new AppError(400, "Check-out time must be after check-in time", "INVALID_CHECK_OUT_TIME");
    }

    const effectiveSchedule = await resolveEffectiveSchedule(auth.company_id, employeeId, workDate);
    const dayOfWeek = getWeekdayNumber(workDate);
    const scheduleDay = (effectiveSchedule.days || []).find((d) => d.day_of_week === dayOfWeek);

    const policy = await resolvePolicyForSchedule(auth.company_id, effectiveSchedule, client);

    const { year, month } = getYearAndMonth(workDate);
    const counter = await lockAndGetMonthlyCounter(auth.company_id, employeeId, year, month, client);

    // Old counter contributions
    const oldGraceLate = (existing.late_status === "WITHIN_GRACE" && existing.grace_occurrence_no !== null) ? 1 : 0;
    const oldEarlyLeave = existing.early_leave_minutes > 0 ? 1 : 0;
    const oldHalfDay = existing.deduction_type === "HALF_DAY" ? 1 : 0;
    const oldFullDay = existing.deduction_type === "FULL_DAY" ? 1 : 0;

    // Recalculate metrics with check-in + check-out
    const metrics = calculateAttendanceMetrics({
      checkIn: existing.check_in,
      checkOut: checkOutTimestamp,
      workDate,
      scheduleDay,
      policy,
      currentMonthlyGraceCount: Math.max(0, (counter.grace_late_count || 0) - oldGraceLate),
    });

    const updated = await updateAttendanceRecord(
      auth.company_id,
      existing.attendance_id,
      {
        check_out: checkOutTimestamp,
        hours_worked: metrics.hours_worked,
        status: metrics.status,
        scheduled_start_time: metrics.scheduled_start_time,
        scheduled_end_time: metrics.scheduled_end_time,
        scheduled_break_minutes: metrics.scheduled_break_minutes,
        late_minutes: metrics.late_minutes,
        early_leave_minutes: metrics.early_leave_minutes,
        late_status: metrics.late_status,
        grace_occurrence_no: metrics.grace_occurrence_no,
        deduction_type: metrics.deduction_type,
        deduction_days: metrics.deduction_days,
        remarks: payload.remarks || existing.remarks,
      },
      client
    );

    // Adjust monthly counter (subtract old effect, add new effect)
    await adjustMonthlyCounter(
      auth.company_id,
      employeeId,
      year,
      month,
      {
        grace_late: metrics.inc_grace_late - oldGraceLate,
        early_leave: metrics.inc_early_leave - oldEarlyLeave,
        half_day: metrics.inc_half_day - oldHalfDay,
        full_day: metrics.inc_full_day - oldFullDay,
      },
      client
    );

    await createAuditLog({
      companyId: auth.company_id,
      userId: auth.user_id,
      module: "ATTENDANCE",
      action: "CHECK_OUT",
      recordId: existing.attendance_id,
      details: { work_date: workDate, check_out: checkOutTimestamp },
    });

    return getAttendanceById(auth.company_id, existing.attendance_id, client);
  });
}

async function correctAttendanceRecord(auth, attendanceId, payload) {
  return withTransaction(async (client) => {
    const current = await getAttendanceById(auth.company_id, attendanceId, client);
    if (!current) {
      throw new AppError(404, "Attendance record not found", "ATTENDANCE_NOT_FOUND");
    }

    const workDate = current.work_date;
    const newCheckIn = payload.check_in !== undefined ? payload.check_in : current.check_in;
    const newCheckOut = payload.check_out !== undefined ? payload.check_out : current.check_out;

    if (newCheckIn && newCheckOut && new Date(newCheckOut) <= new Date(newCheckIn)) {
      throw new AppError(400, "Check-out time must be after check-in time", "INVALID_CHECK_OUT_TIME");
    }

    const effectiveSchedule = await resolveEffectiveSchedule(auth.company_id, current.employee_id, workDate);
    const dayOfWeek = getWeekdayNumber(workDate);
    const scheduleDay = (effectiveSchedule.days || []).find((d) => d.day_of_week === dayOfWeek);

    const policy = await resolvePolicyForSchedule(auth.company_id, effectiveSchedule, client);

    const { year, month } = getYearAndMonth(workDate);
    const counter = await lockAndGetMonthlyCounter(auth.company_id, current.employee_id, year, month, client);

    // Old counter effect
    const oldGraceLate = (current.late_status === "WITHIN_GRACE" && current.grace_occurrence_no !== null) ? 1 : 0;
    const oldEarlyLeave = current.early_leave_minutes > 0 ? 1 : 0;
    const oldHalfDay = current.deduction_type === "HALF_DAY" ? 1 : 0;
    const oldFullDay = current.deduction_type === "FULL_DAY" ? 1 : 0;

    // Recalculate metrics
    const metrics = calculateAttendanceMetrics({
      checkIn: newCheckIn,
      checkOut: newCheckOut,
      workDate,
      scheduleDay,
      policy,
      currentMonthlyGraceCount: Math.max(0, (counter.grace_late_count || 0) - oldGraceLate),
    });

    const finalStatus = payload.status || metrics.status;
    const finalDeductionType = payload.deduction_type || metrics.deduction_type;
    const finalDeductionDays = payload.deduction_type
      ? (payload.deduction_type === "FULL_DAY" ? 1.0 : payload.deduction_type === "HALF_DAY" ? 0.5 : 0)
      : metrics.deduction_days;

    const newHalfDay = finalDeductionType === "HALF_DAY" ? 1 : 0;
    const newFullDay = finalDeductionType === "FULL_DAY" ? 1 : 0;

    const updated = await updateAttendanceRecord(
      auth.company_id,
      attendanceId,
      {
        check_in: newCheckIn,
        check_out: newCheckOut,
        hours_worked: metrics.hours_worked,
        status: finalStatus,
        scheduled_start_time: metrics.scheduled_start_time,
        scheduled_end_time: metrics.scheduled_end_time,
        scheduled_break_minutes: metrics.scheduled_break_minutes,
        late_minutes: metrics.late_minutes,
        early_leave_minutes: metrics.early_leave_minutes,
        late_status: metrics.late_status,
        grace_occurrence_no: metrics.grace_occurrence_no,
        deduction_type: finalDeductionType,
        deduction_days: finalDeductionDays,
        remarks: payload.remarks !== undefined ? payload.remarks : current.remarks,
      },
      client
    );

    // Adjust monthly counter
    await adjustMonthlyCounter(
      auth.company_id,
      current.employee_id,
      year,
      month,
      {
        grace_late: metrics.inc_grace_late - oldGraceLate,
        early_leave: metrics.inc_early_leave - oldEarlyLeave,
        half_day: newHalfDay - oldHalfDay,
        full_day: newFullDay - oldFullDay,
      },
      client
    );

    await createAuditLog({
      companyId: auth.company_id,
      userId: auth.user_id,
      module: "ATTENDANCE",
      action: "CORRECT_ATTENDANCE",
      recordId: attendanceId,
      details: payload,
    });

    return getAttendanceById(auth.company_id, attendanceId, client);
  });
}

async function getEmployeeOwnAttendance(auth, filters) {
  if (!auth.employee_id) {
    throw new AppError(400, "User is not linked to an employee record", "NO_LINKED_EMPLOYEE");
  }
  return listAttendanceRecords(auth.company_id, {
    ...filters,
    employee_id: auth.employee_id,
  });
}

async function getEmployeeOwnAttendanceByDate(auth, dateStr) {
  if (!auth.employee_id) {
    throw new AppError(400, "User is not linked to an employee record", "NO_LINKED_EMPLOYEE");
  }
  const record = await getAttendanceByEmployeeAndDate(auth.company_id, auth.employee_id, dateStr);
  if (!record) {
    throw new AppError(404, `No attendance record found for date ${dateStr}`, "ATTENDANCE_NOT_FOUND");
  }
  return record;
}

async function listCompanyAttendanceRecords(auth, filters) {
  return listAttendanceRecords(auth.company_id, filters);
}

async function getCompanyAttendanceRecord(auth, attendanceId) {
  const record = await getAttendanceById(auth.company_id, attendanceId);
  if (!record) {
    throw new AppError(404, "Attendance record not found", "ATTENDANCE_NOT_FOUND");
  }
  return record;
}

module.exports = {
  processCheckIn,
  processCheckOut,
  correctAttendanceRecord,
  getEmployeeOwnAttendance,
  getEmployeeOwnAttendanceByDate,
  listCompanyAttendanceRecords,
  getCompanyAttendanceRecord,
};
