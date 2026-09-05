const penaltyWeights = {
  NONE: 0,
  HALF_DAY: 0.5,
  FULL_DAY: 1.0,
};

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

function parseTimestampToWorkDayMinutes(timestampStr, workDateStr) {
  if (!timestampStr) return null;
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(timestampStr)) {
    return parseTimeToMinutes(timestampStr);
  }
  const dateObj = new Date(timestampStr);
  if (Number.isNaN(dateObj.getTime())) return null;

  if (typeof timestampStr === "string" && (timestampStr.endsWith("Z") || timestampStr.includes("+") || /T\d{2}:\d{2}:\d{2}/.test(timestampStr))) {
    return dateObj.getUTCHours() * 60 + dateObj.getUTCMinutes();
  }
  return dateObj.getHours() * 60 + dateObj.getMinutes();
}


function calculateAttendanceMetrics({
  checkIn,
  checkOut,
  workDate,
  scheduleDay,
  policy,
  currentMonthlyGraceCount = 0,
}) {
  const isWorkingDay = Boolean(scheduleDay?.is_working_day);
  const startTimeStr = scheduleDay?.start_time || null;
  const endTimeStr = scheduleDay?.end_time || null;
  const breakMinutes = Number(scheduleDay?.break_minutes || 0);

  // 1. Non-working day calculation
  if (!isWorkingDay) {
    let hoursWorked = 0;
    if (checkIn && checkOut) {
      const inTime = new Date(checkIn).getTime();
      const outTime = new Date(checkOut).getTime();
      if (outTime > inTime) {
        const totalMins = (outTime - inTime) / 60000;
        const netMins = Math.max(0, totalMins - breakMinutes);
        hoursWorked = Number((netMins / 60).toFixed(2));
      }
    }

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

  // Worked hours calculation
  let hoursWorked = 0;
  if (checkIn && checkOut) {
    const inTime = new Date(checkIn).getTime();
    const outTime = new Date(checkOut).getTime();
    if (outTime > inTime) {
      const totalMins = (outTime - inTime) / 60000;
      const netMins = Math.max(0, totalMins - breakMinutes);
      hoursWorked = Number((netMins / 60).toFixed(2));
    }
  }

  // Late calculation
  let lateMinutes = 0;
  let lateStatus = "ON_TIME";
  let graceOccurrenceNo = null;
  let latePenalty = "NONE";
  let incGraceLate = 0;

  if (checkIn) {
    const checkInMins = parseTimestampToWorkDayMinutes(checkIn, workDate);
    if (checkInMins !== null && checkInMins > startMins) {
      lateMinutes = checkInMins - startMins;

      const graceMins = Number(policy?.grace_period_minutes || 0);
      const allowedOccurrences = Number(policy?.grace_occurrences_allowed || 0);

      if (lateMinutes <= graceMins) {
        lateStatus = "WITHIN_GRACE";
        if (currentMonthlyGraceCount < allowedOccurrences) {
          graceOccurrenceNo = currentMonthlyGraceCount + 1;
          latePenalty = policy?.grace_period_penalty || "NONE";
          incGraceLate = 1;
        } else {
          graceOccurrenceNo = null;
          latePenalty = policy?.beyond_grace_penalty || "NONE";
        }
      } else {
        lateStatus = "BEYOND_GRACE";
        latePenalty = policy?.beyond_grace_penalty || "NONE";
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
    const checkOutMins = parseTimestampToWorkDayMinutes(checkOut, workDate);
    if (checkOutMins !== null && checkOutMins < endMins) {
      earlyLeaveMinutes = endMins - checkOutMins;

      const earlyGraceMins = Number(policy?.early_leave_grace_minutes || 0);
      if (earlyLeaveMinutes <= earlyGraceMins) {
        earlyPenalty = "NONE";
      } else {
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
};
