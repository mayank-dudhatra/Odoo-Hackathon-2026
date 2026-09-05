const assert = require("assert");
const { calculateProration } = require("../../src/services/proration.service");

async function runProrationUnitTests() {
  console.log("\n--- Testing Proration Service (Unit) ---");

  // Mock database client returning no unpaid leave and no attendance deductions
  const mockDbNoDeductions = {
    query: async (text) => {
      if (text.includes("FROM leave_requests")) {
        return { rows: [{ unpaid_leave_days: 0 }] };
      }
      if (text.includes("FROM attendance")) {
        return { rows: [{ attendance_deduction_days: 0 }] };
      }
      return { rows: [] };
    },
  };

  const fullMonthContract = {
    contract_id: 101,
    wage: 30000,
    wage_type: "MONTHLY",
    start_date: "2026-06-01",
    end_date: null,
  };

  // 1. Full Month calculation
  const res1 = await calculateProration(mockDbNoDeductions, {
    companyId: 1,
    employeeId: 1,
    periodStart: "2026-06-01",
    periodEnd: "2026-06-30",
    contract: fullMonthContract,
  });

  assert.strictEqual(res1.calendarDays, 30, "June calendar days calculation failed");
  assert.strictEqual(res1.payableDays, 30, "Full month payable days failed");
  assert.strictEqual(res1.proratedWage, 30000, "Full month prorated wage failed");

  // 2. Mid-month start contract (Joined June 16, 15 days active)
  const midMonthContract = {
    contract_id: 102,
    wage: 30000,
    wage_type: "MONTHLY",
    start_date: "2026-06-16",
    end_date: null,
  };

  const res2 = await calculateProration(mockDbNoDeductions, {
    companyId: 1,
    employeeId: 1,
    periodStart: "2026-06-01",
    periodEnd: "2026-06-30",
    contract: midMonthContract,
  });

  assert.strictEqual(res2.contractActiveDays, 15, "Mid-month active days failed");
  assert.strictEqual(res2.payableDays, 15, "Mid-month payable days failed");
  assert.strictEqual(res2.proratedWage, 15000, "Mid-month prorated wage failed");

  // 3. Unpaid leave impact (3 days unpaid leave in full month)
  const mockDbUnpaidLeave = {
    query: async (text) => {
      if (text.includes("FROM leave_requests")) {
        return { rows: [{ unpaid_leave_days: 3 }] };
      }
      return { rows: [{ attendance_deduction_days: 0 }] };
    },
  };

  const res3 = await calculateProration(mockDbUnpaidLeave, {
    companyId: 1,
    employeeId: 1,
    periodStart: "2026-06-01",
    periodEnd: "2026-06-30",
    contract: fullMonthContract,
  });

  assert.strictEqual(res3.unpaidLeaveDays, 3, "Unpaid leave days parsing failed");
  assert.strictEqual(res3.payableDays, 27, "Payable days after unpaid leave failed");
  assert.strictEqual(res3.proratedWage, 27000, "Prorated wage after unpaid leave failed");

  console.log("✔ Proration Service tests passed (3/3)");
}

if (require.main === module) {
  runProrationUnitTests();
}

module.exports = { runProrationUnitTests };
