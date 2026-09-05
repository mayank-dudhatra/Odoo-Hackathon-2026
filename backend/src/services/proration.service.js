const { query } = require("../db");

/**
 * Calculates calendar days between two YYYY-MM-DD date strings (inclusive).
 */
function getCalendarDays(startDateStr, endDateStr) {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const diffTime = Math.abs(end - start);
  return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Calculates active contract days overlapping with [periodStart, periodEnd].
 */
function getContractActiveDays(contract, periodStart, periodEnd) {
  const pStart = new Date(periodStart);
  const pEnd = new Date(periodEnd);

  const cStart = new Date(contract.start_date);
  const cEnd = contract.end_date ? new Date(contract.end_date) : pEnd;

  const overlapStart = cStart > pStart ? cStart : pStart;
  const overlapEnd = cEnd < pEnd ? cEnd : pEnd;

  if (overlapStart > overlapEnd) {
    return 0;
  }

  const diffTime = overlapEnd - overlapStart;
  return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Dedicated Proration Service for Payroll.
 * Integrates Contract, Attendance, and Time Off modules to calculate payable days and prorated wage.
 */
async function calculateProration(executor, { companyId, employeeId, periodStart, periodEnd, contract }) {
  const db = executor.query ? executor : { query };

  const calendarDays = getCalendarDays(periodStart, periodEnd);
  const contractActiveDays = getContractActiveDays(contract, periodStart, periodEnd);

  // Collect unpaid leave days (is_paid = false, payroll_integration = true)
  const leaveResult = await db.query(
    `
      SELECT COALESCE(SUM(lr.days_requested), 0)::numeric AS unpaid_leave_days
      FROM leave_requests lr
      JOIN leave_types lt ON lt.leave_type_id = lr.leave_type_id
      WHERE lr.company_id = $1
        AND lr.employee_id = $2
        AND lr.status = 'APPROVED'
        AND lt.is_paid = FALSE
        AND lt.payroll_integration = TRUE
        AND lr.end_date >= $3::date
        AND lr.start_date <= $4::date
    `,
    [companyId, employeeId, periodStart, periodEnd]
  );
  const unpaidLeaveDays = Number(leaveResult.rows[0]?.unpaid_leave_days) || 0;

  // Collect attendance deduction days (half-day, full-day, unpaid absence)
  const attendanceResult = await db.query(
    `
      SELECT COALESCE(SUM(deduction_days), 0)::numeric AS attendance_deduction_days
      FROM attendance
      WHERE company_id = $1
        AND employee_id = $2
        AND work_date >= $3::date
        AND work_date <= $4::date
    `,
    [companyId, employeeId, periodStart, periodEnd]
  );
  const attendanceDeductionDays = Number(attendanceResult.rows[0]?.attendance_deduction_days) || 0;

  const totalDeductions = unpaidLeaveDays + attendanceDeductionDays;
  const payableDays = Math.max(0, contractActiveDays - totalDeductions);
  const prorationRatio = calendarDays > 0 ? Math.min(1, Math.max(0, payableDays / calendarDays)) : 0;
  const wage = Number(contract.wage) || 0;
  const proratedWage = Math.round((wage * prorationRatio + Number.EPSILON) * 100) / 100;

  return {
    calendarDays,
    contractActiveDays,
    unpaidLeaveDays,
    attendanceDeductionDays,
    payableDays,
    prorationRatio,
    contractWage: wage,
    proratedWage,
  };
}

module.exports = {
  getCalendarDays,
  getContractActiveDays,
  calculateProration,
};
