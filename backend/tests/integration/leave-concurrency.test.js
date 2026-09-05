const assert = require("assert");
const { query } = require("../../src/db");
const { approveLeaveRequestService } = require("../../src/services/leave.service");

async function runLeaveConcurrencyIntegrationTests() {
  console.log("\n--- Testing Concurrency Protection & Atomic Leave Balance Locking ---");

  const timeStr = Date.now().toString().slice(-6);

  // Create test company, employee, leave_type (paid, requires allocation), leave_allocation (allocated: 2, used: 0)
  const compRes = await query(
    `INSERT INTO companies (name, email) VALUES ($1, $2) RETURNING company_id`,
    [`Concurrency Comp ${timeStr}`, `conc_${timeStr}@test.com`]
  );
  const companyId = compRes.rows[0].company_id;

  const empRes = await query(
    `INSERT INTO employees (company_id, employee_code, first_name, last_name, email, hire_date)
     VALUES ($1, $2, 'ConcEmp', 'Test', $3, '2026-01-01') RETURNING employee_id`,
    [companyId, `EMP_${timeStr}`, `conc_emp_${timeStr}@test.com`]
  );
  const employeeId = empRes.rows[0].employee_id;

  const ltRes = await query(
    `INSERT INTO leave_types (company_id, name, unit, requires_allocation, is_paid)
     VALUES ($1, $2, 'DAYS', TRUE, TRUE) RETURNING leave_type_id`,
    [companyId, `Annual Leave ${timeStr}`]
  );
  const leaveTypeId = ltRes.rows[0].leave_type_id;

  // Allocate 2 Days to Employee
  const allocRes = await query(
    `INSERT INTO leave_allocations (company_id, employee_id, leave_type_id, year, allocated_days, used_days, status)
     VALUES ($1, $2, $3, 2026, 2, 0, 'APPROVED') RETURNING allocation_id`,
    [companyId, employeeId, leaveTypeId]
  );
  const allocationId = allocRes.rows[0].allocation_id;

  // Create two separate pending leave requests for 2 days each
  const req1Res = await query(
    `INSERT INTO leave_requests (company_id, employee_id, leave_type_id, start_date, end_date, days_requested, status)
     VALUES ($1, $2, $3, '2026-06-01', '2026-06-02', 2, 'PENDING') RETURNING leave_request_id`,
    [companyId, employeeId, leaveTypeId]
  );
  const req1Id = req1Res.rows[0].leave_request_id;

  const req2Res = await query(
    `INSERT INTO leave_requests (company_id, employee_id, leave_type_id, start_date, end_date, days_requested, status)
     VALUES ($1, $2, $3, '2026-06-10', '2026-06-11', 2, 'PENDING') RETURNING leave_request_id`,
    [companyId, employeeId, leaveTypeId]
  );
  const req2Id = req2Res.rows[0].leave_request_id;

  const actor = { user_id: 1, company_id: companyId, role_name: "HR Manager" };

  // Trigger concurrent approval of both 2-day requests (Total requested = 4 days, Balance = 2 days)
  let successCount = 0;
  let failureCount = 0;

  const results = await Promise.allSettled([
    approveLeaveRequestService({ actor, requestId: req1Id }),
    approveLeaveRequestService({ actor, requestId: req2Id }),
  ]);

  results.forEach((r) => {
    if (r.status === "fulfilled") {
      successCount += 1;
    } else {
      failureCount += 1;
    }
  });

  assert.strictEqual(successCount, 1, `Expected exactly 1 request to be approved, but ${successCount} succeeded!`);
  assert.strictEqual(failureCount, 1, `Expected exactly 1 request to be rejected due to insufficient balance, but ${failureCount} failed!`);

  // Verify DB balance
  const checkAlloc = await query(`SELECT allocated_days, used_days FROM leave_allocations WHERE allocation_id = $1`, [allocationId]);
  const usedDays = Number(checkAlloc.rows[0].used_days);
  const remaining = Number(checkAlloc.rows[0].allocated_days) - usedDays;

  assert.strictEqual(usedDays, 2, "Used days in database must equal 2");
  assert.strictEqual(remaining, 0, "Remaining balance must equal 0 and never be negative!");

  // Cleanup
  await query(`DELETE FROM leave_requests WHERE leave_request_id IN ($1, $2)`, [req1Id, req2Id]);
  await query(`DELETE FROM leave_allocations WHERE allocation_id = $1`, [allocationId]);
  await query(`DELETE FROM leave_types WHERE leave_type_id = $1`, [leaveTypeId]);
  await query(`DELETE FROM employees WHERE employee_id = $1`, [employeeId]);
  await query(`DELETE FROM companies WHERE company_id = $1`, [companyId]);

  console.log("✔ Concurrency Protection & Atomic Leave Balance locking tests passed (3/3)");
}

if (require.main === module) {
  runLeaveConcurrencyIntegrationTests().catch((err) => {
    console.error("❌ Leave Concurrency Test Failed:", err);
    process.exit(1);
  });
}

module.exports = { runLeaveConcurrencyIntegrationTests };
