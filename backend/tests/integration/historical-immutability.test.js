const assert = require("assert");
const { query } = require("../../src/db");
const { getPayslipById, createPayslip, createPayslipLine } = require("../../src/repositories/payslip.repository");

async function runHistoricalImmutabilityIntegrationTests() {
  console.log("\n--- Testing Historical Immutability of Finalized Payslips ---");

  const timeStr = Date.now().toString().slice(-6);

  // Create test company, employee, contract, structure, payrun, payslip
  const compRes = await query(
    `INSERT INTO companies (name, email) VALUES ($1, $2) RETURNING company_id`,
    [`Immutability Comp ${timeStr}`, `imm_${timeStr}@test.com`]
  );
  const companyId = compRes.rows[0].company_id;

  const empRes = await query(
    `INSERT INTO employees (company_id, employee_code, first_name, last_name, email, hire_date)
     VALUES ($1, $2, 'ImmutableEmp', 'Original', $3, '2026-01-01') RETURNING employee_id`,
    [companyId, `EMP_IMM_${timeStr}`, `original_${timeStr}@test.com`]
  );
  const employeeId = empRes.rows[0].employee_id;

  const structRes = await query(
    `INSERT INTO salary_structures (company_id, name) VALUES ($1, $2) RETURNING salary_structure_id`,
    [companyId, `Structure Imm ${timeStr}`]
  );
  const structureId = structRes.rows[0].salary_structure_id;

  const contractRes = await query(
    `INSERT INTO contracts (company_id, employee_id, salary_structure_id, wage, wage_type, start_date, status)
     VALUES ($1, $2, $3, 30000, 'MONTHLY', '2026-01-01', 'ACTIVE') RETURNING contract_id`,
    [companyId, employeeId, structureId]
  );
  const contractId = contractRes.rows[0].contract_id;

  const payrunRes = await query(
    `INSERT INTO payruns (company_id, name, salary_structure_id, period_start, period_end, status)
     VALUES ($1, $2, $3, '2026-06-01', '2026-06-30', 'PAID') RETURNING payrun_id`,
    [companyId, `Payrun Imm ${timeStr}`, structureId]
  );
  const payrunId = payrunRes.rows[0].payrun_id;

  const snapshotData = {
    company: { name: "Immutability Comp", currency_code: "INR" },
    employee: { employee_id: employeeId, code: `EMP_IMM_${timeStr}`, name: "ImmutableEmp Original", email: `original_${timeStr}@test.com` },
    contract: { contract_id: contractId, wage: 30000, wage_type: "MONTHLY" },
    structure: { salary_structure_id: structureId, name: `Structure Imm ${timeStr}` },
    summary: { worked_days: 30, gross_pay: 30000, total_deductions: 5000, net_pay: 25000 },
  };

  // Create Payslip Header & Line
  const payslip = await createPayslip(null, {
    company_id: companyId,
    payrun_id: payrunId,
    employee_id: employeeId,
    contract_id: contractId,
    salary_structure_id: structureId,
    employee_name_snapshot: "ImmutableEmp Original",
    employee_code_snapshot: `EMP_IMM_${timeStr}`,
    structure_name_snapshot: `Structure Imm ${timeStr}`,
    period_start: "2026-06-01",
    period_end: "2026-06-30",
    worked_days: 30,
    gross_pay: 30000,
    total_deductions: 5000,
    net_pay: 25000,
    status: "PAID",
    snapshot_data: snapshotData,
  });

  await createPayslipLine(null, {
    payslip_id: payslip.payslip_id,
    rule_code_snapshot: "BASIC",
    label: "Basic Salary",
    category: "BASIC",
    sequence: 1,
    amount: 30000,
  });

  // MUTATION PHASE: Modify live employee, contract, and salary structure records!
  await query(
    `UPDATE employees SET first_name = 'CHANGED_NAME', last_name = 'NEW_LAST', email = 'changed@test.com' WHERE employee_id = $1`,
    [employeeId]
  );
  await query(
    `UPDATE contracts SET wage = 60000 WHERE contract_id = $1`,
    [contractId]
  );

  // FETCH PHASE: Retrieve historical payslip
  const historicalPayslip = await getPayslipById(null, companyId, payslip.payslip_id);

  assert.strictEqual(historicalPayslip.employee_name_snapshot, "ImmutableEmp Original", "Historical employee_name_snapshot was mutated!");
  assert.strictEqual(Number(historicalPayslip.gross_pay), 30000, "Historical gross_pay was mutated!");
  assert.strictEqual(Number(historicalPayslip.net_pay), 25000, "Historical net_pay was mutated!");
  assert.strictEqual(historicalPayslip.lines[0].amount, "30000.00", "Historical payslip line amount was mutated!");
  assert.strictEqual(historicalPayslip.snapshot_data.employee.name, "ImmutableEmp Original", "Historical snapshot_data JSON was mutated!");

  // Cleanup
  await query(`DELETE FROM payslip_lines WHERE payslip_id = $1`, [payslip.payslip_id]);
  await query(`DELETE FROM payslips WHERE payslip_id = $1`, [payslip.payslip_id]);
  await query(`DELETE FROM payruns WHERE payrun_id = $1`, [payrunId]);
  await query(`DELETE FROM contracts WHERE contract_id = $1`, [contractId]);
  await query(`DELETE FROM salary_structures WHERE salary_structure_id = $1`, [structureId]);
  await query(`DELETE FROM employees WHERE employee_id = $1`, [employeeId]);
  await query(`DELETE FROM companies WHERE company_id = $1`, [companyId]);

  console.log("✔ Historical Immutability tests passed (5/5)");
}

if (require.main === module) {
  runHistoricalImmutabilityIntegrationTests().catch((err) => {
    console.error("❌ Historical Immutability Test Failed:", err);
    process.exit(1);
  });
}

module.exports = { runHistoricalImmutabilityIntegrationTests };
