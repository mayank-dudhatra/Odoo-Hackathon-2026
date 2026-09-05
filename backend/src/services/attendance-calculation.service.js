const penaltyWeights = {
  NONE: 0,
  HALF_DAY: 0.5,
  FULL_DAY: 1.0,
};

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const parts = String(timeStr).split(":");
  const h = Number(parts[0]) || 0;
  const m = Number(parts[1]) || 0;
  return h * 60 + m;
}

function parseTimestampToWorkDayMinutes(timestampStr, timezone = "UTC") {
  if (!timestampStr) return null;
  const strVal = String(timestampStr).trim();
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(strVal)) {
    return parseTimeToMinutes(strVal);
  }

  const dateObj = new Date(strVal);
  if (Number.isNaN(dateObj.getTime())) return null;

  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone || "UTC",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    });
    const parts = formatter.formatToParts(dateObj);
    let h = 0;
    let m = 0;
    for (const p of parts) {
      if (p.type === "hour") h = parseInt(p.value, 10) % 24;
      if (p.type === "minute") m = parseInt(p.value, 10);
    }
    return h * 60 + m;
  } catch (err) {
    return dateObj.getUTCHours() * 60 + dateObj.getUTCMinutes();
  }
}

function calculateAttendanceMetrics({
  checkIn,
  checkOut,
  workDate,
  scheduleDay,
  policy,
  timezone = "UTC",
  currentMonthlyGraceCount = 0,
}) {
  const isWorkingDay = Boolean(scheduleDay?.is_working_day);
  const startTimeStr = scheduleDay?.start_time || null;
  const endTimeStr = scheduleDay?.end_time || null;
  const breakMinutes = Number(scheduleDay?.break_minutes || 0);

  // Calculate worked hours
  let hoursWorked = 0;
  if (checkIn && checkOut) {
    const inTime = new Date(checkIn).getTime();
    const outTime = new Date(checkOut).getTime();

    let totalMins = 0;
    if (!Number.isNaN(inTime) && !Number.isNaN(outTime) && outTime > inTime) {
      totalMins = (outTime - inTime) / 60000;
    } else {
      const inMins = parseTimestampToWorkDayMinutes(checkIn, timezone);
      const outMins = parseTimestampToWorkDayMinutes(checkOut, timezone);
      if (inMins !== null && outMins !== null) {
        if (outMins >= inMins) {
          totalMins = outMins - inMins;
        } else {
          totalMins = (outMins + 1440) - inMins;
        }
      }
    }

    if (totalMins > 0) {
      const netMins = Math.max(0, totalMins - breakMinutes);
      hoursWorked = Number((netMins / 60).toFixed(2));
    }
  }

  // 1. Non-working day calculation
  if (!isWorkingDay) {
    return {
      scheduled_start_time: null,
      scheduled_end_time: null,
      scheduled_break_minutes: 0,
      hours_worked: hoursWorked,
      late_minutes: 0,
      early_leave_minutes: 0,
      late_status: "ON_TIME",
      grace_occurrence_no: null,
      deduction_type: "NONE",
      deduction_days: 0,
      status: checkIn ? "PRESENT" : "ABSENT",
      inc_grace_late: 0,
      inc_early_leave: 0,
      inc_half_day: 0,
      inc_full_day: 0,
    };
  }

  // 2. Working day calculation
  const startMins = parseTimeToMinutes(startTimeStr);
  const endMins = parseTimeToMinutes(endTimeStr);

  // Late calculation
  let lateMinutes = 0;
  let lateStatus = "ON_TIME";
  let graceOccurrenceNo = null;
  let latePenalty = "NONE";
  let incGraceLate = 0;

  if (checkIn) {
    const checkInMins = parseTimestampToWorkDayMinutes(checkIn, timezone);
    if (checkInMins !== null && checkInMins > startMins) {
      lateMinutes = checkInMins - startMins;

      const graceMins = Number(policy?.grace_period_minutes || 0);
      const allowedOccurrences = Number(policy?.grace_occurrences_allowed || 0);

      if (lateMinutes <= graceMins) {
        if (currentMonthlyGraceCount < allowedOccurrences) {
          lateStatus = "WITHIN_GRACE";
          graceOccurrenceNo = currentMonthlyGraceCount + 1;
          latePenalty = policy?.grace_period_penalty || "NONE";
          incGraceLate = 1;
        } else {
          lateStatus = "BEYOND_GRACE";
          graceOccurrenceNo = null;
          latePenalty = policy?.beyond_grace_penalty || "NONE";
          incGraceLate = 0;
        }
      } else {
        lateStatus = "BEYOND_GRACE";
        latePenalty = policy?.beyond_grace_penalty || "NONE";
        incGraceLate = 0;
      }
    }
  } else {
    lateStatus = null;
  }

  // Early leave calculation
  let earlyLeaveMinutes = 0;
  let earlyPenalty = "NONE";
  let incEarlyLeave = 0;

  if (checkOut) {
    const checkOutMins = parseTimestampToWorkDayMinutes(checkOut, timezone);
    if (checkOutMins !== null && checkOutMins < endMins) {
      const minsBefore = endMins - checkOutMins;
      const earlyGraceMins = Number(policy?.early_leave_grace_minutes || 0);

      if (minsBefore <= earlyGraceMins) {
        earlyLeaveMinutes = minsBefore;
        earlyPenalty = "NONE";
        incEarlyLeave = 0;
      } else {
        earlyLeaveMinutes = minsBefore;
        earlyPenalty = policy?.early_leave_penalty || "NONE";
        incEarlyLeave = 1;
      }
    }
  }

  // Deduction calculation
  const lateWeight = penaltyWeights[latePenalty] || 0;
  const earlyWeight = penaltyWeights[earlyPenalty] || 0;
  const stackDeductions = Boolean(policy?.stack_deductions);

  let rawDeduction = 0;
  if (stackDeductions) {
    rawDeduction = Math.min(1.0, lateWeight + earlyWeight);
  } else {
    rawDeduction = Math.max(lateWeight, earlyWeight);
  }

  let deductionType = "NONE";
  let deductionDays = 0;
  if (rawDeduction >= 1.0) {
    deductionType = "FULL_DAY";
    deductionDays = 1.0;
  } else if (rawDeduction >= 0.5) {
    deductionType = "HALF_DAY";
    deductionDays = 0.5;
  }

  const incHalfDay = deductionType === "HALF_DAY" ? 1 : 0;
  const incFullDay = deductionType === "FULL_DAY" ? 1 : 0;

  // Status determination
  let status = "ABSENT";
  if (checkIn) {
    if (deductionType === "HALF_DAY") {
      status = "HALF_DAY";
    } else if (lateStatus === "BEYOND_GRACE" || lateMinutes > 0) {
      status = "LATE";
    } else {
      status = "PRESENT";
    }
  }

  return {
    scheduled_start_time: startTimeStr,
    scheduled_end_time: endTimeStr,
    scheduled_break_minutes: breakMinutes,
    hours_worked: hoursWorked,
    late_minutes: lateMinutes,
    early_leave_minutes: earlyLeaveMinutes,
    late_status: lateStatus,
    grace_occurrence_no: graceOccurrenceNo,
    deduction_type: deductionType,
    deduction_days: deductionDays,
    status,
    inc_grace_late: incGraceLate,
    inc_early_leave: incEarlyLeave,
    inc_half_day: incHalfDay,
    inc_full_day: incFullDay,
  };
}

module.exports = {
  calculateAttendanceMetrics,
  parseTimeToMinutes,
  parseTimestampToWorkDayMinutes,
};
