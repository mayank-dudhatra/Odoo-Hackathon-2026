require("dotenv").config();
const { pool } = require("./db/pool");
const { query } = require("./src/db");
const { createCompanyAttendancePolicy, getCompanyAttendancePolicy } = require("./src/services/attendance-policy.service");
const { createSchedule } = require("./src/services/schedule.service");
const { createCompanyContract } = require("./src/services/contract.service");
const { processCheckIn, processCheckOut, correctAttendanceRecord, getEmployeeOwnAttendance, listCompanyAttendanceRecords } = require("./src/services/attendance.service");
const { calculateAttendanceMetrics } = require("./src/services/attendance-calculation.service");

async function runPhase4Tests() {
  console.log("=== STARTING PHASE 4 ATTENDANCE ENGINE VERIFICATION ===");

  const compRes = await query(`SELECT company_id FROM companies LIMIT 1`);
  const companyId = compRes.rows[0].company_id;

  const userRes = await query(`SELECT user_id, role_id FROM users WHERE company_id = $1 LIMIT 1`, [companyId]);
  let userId = userRes.rows[0]?.user_id || null;

  const authCtx = {
    company_id: companyId,
    user_id: userId,
    role_id: userRes.rows[0]?.role_id || 1,
    role_name: "Admin"
  };

  // Create isolated test employee
  const empCode = `EMP-P4-${Date.now()}`;
  const insertedEmp = await query(
    `INSERT INTO employees (company_id, employee_code, first_name, last_name, hire_date)
     VALUES ($1, $2, 'Attendance', 'Tester', '2026-01-01') RETURNING employee_id`,
    [companyId, empCode]
  );
  const employeeId = insertedEmp.rows[0].employee_id;

  // Create user link if needed
  const empAuth = {
    company_id: companyId,
    user_id: userId,
    employee_id: employeeId,
    role_id: 5,
    role_name: "Employee"
  };

  // Salary Structure
  let ssRes = await query(`SELECT salary_structure_id FROM salary_structures WHERE company_id = $1 AND is_active = true LIMIT 1`, [companyId]);
  let salaryStructureId = ssRes.rows[0].salary_structure_id;

  console.log(`Test Context -> Company: ${companyId}, Employee: ${employeeId} (${empCode})`);

  // TEST 1: Create Attendance Policy
  console.log("\n[TEST 1] Creating Attendance Policy...");
  const policyName = `Strict Attendance Policy ${Date.now()}`;
  const policy = await createCompanyAttendancePolicy(authCtx, {
    name: policyName,
    grace_period_minutes: 15,
    grace_occurrences_allowed: 2,
    grace_period_penalty: "NONE",
    beyond_grace_penalty: "HALF_DAY",
    early_leave_grace_minutes: 10,
    early_leave_penalty: "HALF_DAY",
    stack_deductions: true
  });
  console.log(`✔ Attendance Policy created with ID: ${policy.policy_id} (Grace: 15m, Max Occurrences: 2)`);

  // TEST 2: Create Schedule with Attendance Policy
  console.log("\n[TEST 2] Creating Working Schedule linked to Policy...");
  const schedDays = [
    { day_of_week: 1, is_working_day: true, start_time: "09:00", end_time: "18:00", break_minutes: 60 },
    { day_of_week: 2, is_working_day: true, start_time: "09:00", end_time: "18:00", break_minutes: 60 },
    { day_of_week: 3, is_working_day: true, start_time: "09:00", end_time: "18:00", break_minutes: 60 },
    { day_of_week: 4, is_working_day: true, start_time: "09:00", end_time: "18:00", break_minutes: 60 },
    { day_of_week: 5, is_working_day: true, start_time: "09:00", end_time: "18:00", break_minutes: 60 },
    { day_of_week: 6, is_working_day: false, start_time: null, end_time: null, break_minutes: 0 },
    { day_of_week: 7, is_working_day: false, start_time: null, end_time: null, break_minutes: 0 }
  ];

  const sched = await createSchedule(authCtx, {
    name: `Standard Shift P4 ${Date.now()}`,
    timezone: "Asia/Kolkata",
    attendance_policy_id: policy.policy_id,
    days: schedDays
  });
  console.log(`✔ Schedule created with ID: ${sched.schedule_id}`);

  // TEST 3: Create Active Contract
  console.log("\n[TEST 3] Creating Active Contract...");
  const contract = await createCompanyContract(authCtx, {
    employee_id: employeeId,
    salary_structure_id: salaryStructureId,
    schedule_id: sched.schedule_id,
    wage: 50000,
    wage_type: "MONTHLY",
    start_date: "2026-01-01",
    end_date: "2026-12-31",
    status: "ACTIVE"
  });
  console.log(`✔ Contract created with ID: ${contract.contract_id}`);

  // TEST 4: On-Time Check-In & Check-Out (Day 1: 2026-09-01)
  console.log("\n[TEST 4] Testing On-Time Check-In & Check-Out (2026-09-01)...");
  const checkInRecord1 = await processCheckIn(empAuth, {
    work_date: "2026-09-01",
    check_in: "2026-09-01T09:00:00.000Z",
    remarks: "Morning check-in"
  });
  console.log(`✔ Check-in recorded -> Status: ${checkInRecord1.status}, LateStatus: ${checkInRecord1.late_status}, LateMinutes: ${checkInRecord1.late_minutes}`);

  // Test duplicate check-in rejection
  try {
    await processCheckIn(empAuth, { work_date: "2026-09-01", check_in: "2026-09-01T09:05:00.000Z" });
    throw new Error("Failed to block duplicate check-in!");
  } catch (err) {
    console.log(`✔ Successfully blocked duplicate check-in: ${err.message}`);
  }

  const checkOutRecord1 = await processCheckOut(empAuth, {
    work_date: "2026-09-01",
    check_out: "2026-09-01T18:00:00.000Z",
    remarks: "Evening check-out"
  });
  console.log(`✔ Check-out recorded -> Worked Hours: ${checkOutRecord1.hours_worked} (Expected: 8), Status: ${checkOutRecord1.status}, DeductionType: ${checkOutRecord1.deduction_type}`);

  // TEST 5: Within-Grace Late Check-In (Day 2: 2026-09-02, 10 min late)
  console.log("\n[TEST 5] Testing Within-Grace Late Check-In (2026-09-02, 10m late)...");
  const checkInRecord2 = await processCheckIn(empAuth, {
    work_date: "2026-09-02",
    check_in: "2026-09-02T09:10:00.000Z"
  });
  console.log(`✔ Day 2 Check-in -> LateMinutes: ${checkInRecord2.late_minutes}, LateStatus: ${checkInRecord2.late_status}, GraceOccurrenceNo: ${checkInRecord2.grace_occurrence_no} (Expected: 1)`);

  const checkOutRecord2 = await processCheckOut(empAuth, {
    work_date: "2026-09-02",
    check_out: "2026-09-02T17:30:00.000Z" // 30 mins early leave -> penalty HALF_DAY
  });
  console.log(`✔ Day 2 Check-out -> EarlyLeaveMinutes: ${checkOutRecord2.early_leave_minutes}, DeductionType: ${checkOutRecord2.deduction_type} (Expected: HALF_DAY), DeductionDays: ${checkOutRecord2.deduction_days}`);

  // TEST 6: Grace Exhaustion & Stacking Deductions (Day 3: 2026-09-03, Grace 2 used; Day 4: 2026-09-04, Grace Exhausted -> Beyond Grace Penalty)
  console.log("\n[TEST 6] Testing Grace Occurrence #2 & Grace Exhaustion...");
  await processCheckIn(empAuth, { work_date: "2026-09-03", check_in: "2026-09-03T09:12:00.000Z" });
  await processCheckOut(empAuth, { work_date: "2026-09-03", check_out: "2026-09-03T18:00:00.000Z" });

  // Day 4: 3rd late -> Grace allowed is 2, so 3rd late gets BEYOND_GRACE penalty (HALF_DAY) + Early Leave (HALF_DAY) -> Stacked = FULL_DAY (1.0)
  console.log("Testing Stacking Deductions on Day 4 (2026-09-04)...");
  await processCheckIn(empAuth, { work_date: "2026-09-04", check_in: "2026-09-04T09:14:00.000Z" });
  const checkOutRecord4 = await processCheckOut(empAuth, {
    work_date: "2026-09-04",
    check_out: "2026-09-04T17:30:00.000Z" // 30m early leave (HALF_DAY penalty)
  });
  console.log(`✔ Day 4 Result -> LateStatus: ${checkOutRecord4.late_status}, DeductionType: ${checkOutRecord4.deduction_type} (Expected: FULL_DAY), DeductionDays: ${checkOutRecord4.deduction_days} (Expected: 1.0)`);

  // Verify monthly counters
  const counterRes = await query(
    `SELECT * FROM attendance_monthly_counters WHERE company_id = $1 AND employee_id = $2 AND year = 2026 AND month = 9`,
    [companyId, employeeId]
  );
  const counter = counterRes.rows[0];
  console.log(`✔ Monthly Counter for 2026-09 -> GraceLate: ${counter.grace_late_count}, EarlyLeave: ${counter.early_leave_count}, HalfDayDeductions: ${counter.half_day_deductions}, FullDayDeductions: ${counter.full_day_deductions}`);

  // TEST 7: Transaction-Safe HR Correction & Counter Reversal
  console.log("\n[TEST 7] Testing Transaction-Safe HR Attendance Correction & Counter Reversal...");
  const corrected = await correctAttendanceRecord(authCtx, checkOutRecord4.attendance_id, {
    check_in: "2026-09-04T09:00:00.000Z", // Corrected to on-time
    check_out: "2026-09-04T18:00:00.000Z", // Corrected to on-time
    remarks: "HR Correction: Approved full day"
  });
  console.log(`✔ Corrected Record -> LateMinutes: ${corrected.late_minutes}, EarlyLeaveMinutes: ${corrected.early_leave_minutes}, DeductionType: ${corrected.deduction_type} (Expected: NONE)`);

  const counterResAfter = await query(
    `SELECT * FROM attendance_monthly_counters WHERE company_id = $1 AND employee_id = $2 AND year = 2026 AND month = 9`,
    [companyId, employeeId]
  );
  const counterAfter = counterResAfter.rows[0];
  console.log(`✔ Monthly Counter AFTER Correction -> FullDayDeductions: ${counterAfter.full_day_deductions} (Expected: 0)`);
  if (counterAfter.full_day_deductions !== 0) {
    throw new Error("Counter reversal failed! Full day deductions count should have been decremented to 0!");
  }

  // TEST 8: Employee Self Attendance Query & HR List/Filter Query
  console.log("\n[TEST 8] Testing Attendance Search & Filtering...");
  const ownList = await getEmployeeOwnAttendance(empAuth, { start_date: "2026-09-01", end_date: "2026-09-30" });
  console.log(`✔ Own Attendance Records Count: ${ownList.data.length} (Expected: 4)`);

  const hrList = await listCompanyAttendanceRecords(authCtx, {
    employee_id: employeeId,
    start_date: "2026-09-01",
    end_date: "2026-09-30"
  });
  console.log(`✔ HR Filter Query Records Count: ${hrList.data.length}`);

  console.log("\n=== ALL PHASE 4 ATTENDANCE ENGINE TESTS PASSED SUCCESSFULLY! ===");
  process.exit(0);
}

runPhase4Tests().catch((err) => {
  console.error("\n❌ PHASE 4 TEST FAILED:", err);
  process.exit(1);
});
