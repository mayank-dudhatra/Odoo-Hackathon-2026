const assert = require("assert");
const { query, withTransaction } = require("../../src/db");
const { hashPassword } = require("../../src/utils/password");
const { signAccessToken } = require("../../src/utils/tokens");

async function runCompanyIsolationIntegrationTests() {
  console.log("\n--- Testing Company Isolation & Cross-Tenant Boundaries (Integration) ---");

  // Create isolated temporary companies & users in DB transaction or test setup
  const time = Date.now();
  const passHash = await hashPassword("AdminPassword123!");

  // Company A
  const compARes = await query(
    `INSERT INTO companies (name, email) VALUES ($1, $2) RETURNING company_id`,
    [`Company Isolation A ${time}`, `adminA_${time}@test.com`]
  );
  const companyAId = compARes.rows[0].company_id;

  const roleAdminRes = await query(`SELECT role_id FROM roles WHERE role_name = 'Admin' LIMIT 1`);
  const adminRoleId = roleAdminRes.rows[0].role_id;

  const userARes = await query(
    `INSERT INTO users (company_id, username, email, password_hash, role_id, status)
     VALUES ($1, $2, $3, $4, $5, 'ACTIVE') RETURNING user_id`,
    [companyAId, `adminA_${time}`, `adminA_${time}@test.com`, passHash, adminRoleId]
  );
  const userAId = userARes.rows[0].user_id;

  // Company B
  const compBRes = await query(
    `INSERT INTO companies (name, email) VALUES ($1, $2) RETURNING company_id`,
    [`Company Isolation B ${time}`, `adminB_${time}@test.com`]
  );
  const companyBId = compBRes.rows[0].company_id;

  const userBRes = await query(
    `INSERT INTO users (company_id, username, email, password_hash, role_id, status)
     VALUES ($1, $2, $3, $4, $5, 'ACTIVE') RETURNING user_id`,
    [companyBId, `adminB_${time}`, `adminB_${time}@test.com`, passHash, adminRoleId]
  );
  const userBId = userBRes.rows[0].user_id;

  // Create Employee & Contract in Company B
  const empBRes = await query(
    `INSERT INTO employees (company_id, employee_code, first_name, last_name, email, hire_date, status)
     VALUES ($1, $2, $3, $4, $5, '2026-01-01', 'ACTIVE') RETURNING employee_id`,
    [companyBId, `EMPB_${time}`, "EmployeeB", "Test", `empB_${time}@test.com`]
  );
  const employeeBId = empBRes.rows[0].employee_id;

  const structBRes = await query(
    `INSERT INTO salary_structures (company_id, name) VALUES ($1, $2) RETURNING salary_structure_id`,
    [companyBId, `Structure B ${time}`]
  );
  const structureBId = structBRes.rows[0].salary_structure_id;

  const contractBRes = await query(
    `INSERT INTO contracts (company_id, employee_id, salary_structure_id, wage, wage_type, start_date, status)
     VALUES ($1, $2, $3, 40000, 'MONTHLY', '2026-01-01', 'ACTIVE') RETURNING contract_id`,
    [companyBId, employeeBId, structureBId]
  );
  const contractBId = contractBRes.rows[0].contract_id;

  // 1. Verify repository queries scoped to Company A cannot see Company B records
  const { getContractById } = require("../../src/repositories/contract.repository");
  const contractForCompA = await getContractById(companyAId, contractBId);
  assert.strictEqual(contractForCompA, null, "Company A user was able to fetch Company B contract via repository!");

  // 2. Verify Payslips of Company B cannot be fetched by Company A
  const { getPayslipsForEmployee } = require("../../src/repositories/payslip.repository");
  const payslipsForCompA = await getPayslipsForEmployee(companyAId, employeeBId);
  assert.strictEqual(payslipsForCompA.length, 0, "Company A user received Company B payslips!");

  // 3. Verify Payruns of Company B cannot be viewed by Company A
  const { findPayrunById } = require("../../src/repositories/payrun.repository");
  const payrunBRes = await query(
    `INSERT INTO payruns (company_id, name, salary_structure_id, period_start, period_end, status)
     VALUES ($1, $2, $3, '2026-06-01', '2026-06-30', 'DRAFT') RETURNING payrun_id`,
    [companyBId, `Payrun B ${time}`, structureBId]
  );
  const payrunBId = payrunBRes.rows[0].payrun_id;

  const payrunForCompA = await findPayrunById(null, companyAId, payrunBId);
  assert.strictEqual(payrunForCompA, null, "Company A user was able to fetch Company B payrun!");

  // Clean up temporary test data
  await query(`DELETE FROM payruns WHERE payrun_id = $1`, [payrunBId]);
  await query(`DELETE FROM contracts WHERE contract_id = $1`, [contractBId]);
  await query(`DELETE FROM salary_structures WHERE salary_structure_id = $1`, [structureBId]);
  await query(`DELETE FROM employees WHERE employee_id = $1`, [employeeBId]);
  await query(`DELETE FROM users WHERE user_id IN ($1, $2)`, [userAId, userBId]);
  await query(`DELETE FROM companies WHERE company_id IN ($1, $2)`, [companyAId, companyBId]);

  console.log("✔ Company Isolation & Cross-Tenant Boundary tests passed (3/3)");
}

if (require.main === module) {
  runCompanyIsolationIntegrationTests().catch((err) => {
    console.error("❌ Company Isolation Test Failed:", err);
    process.exit(1);
  });
}

module.exports = { runCompanyIsolationIntegrationTests };
