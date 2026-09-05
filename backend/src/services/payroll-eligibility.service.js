const { query } = require("../db");
const { getEffectiveContract } = require("../repositories/contract.repository");

async function findEligibleEmployeesForPayrun(executor, companyId, salaryStructureId, periodStart, periodEnd) {
  const db = executor.query ? executor : { query };

  // Fetch active employees belonging to company
  const empResult = await db.query(
    `
      SELECT
        e.employee_id,
        e.company_id,
        e.employee_code,
        e.first_name,
        e.last_name,
        e.email,
        e.status
      FROM employees e
      WHERE e.company_id = $1 AND e.status = 'ACTIVE'
      ORDER BY e.employee_code ASC
    `,
    [companyId]
  );

  const employees = empResult.rows;
  const eligibleList = [];
  const ineligibleList = [];

  for (const emp of employees) {
    // Resolve effective contract for period end date (or during period)
    const contract = await getEffectiveContract(companyId, emp.employee_id, periodEnd);

    if (!contract) {
      ineligibleList.push({
        employee: emp,
        reason: `No effective contract found on ${periodEnd}`,
      });
      continue;
    }

    if (contract.status !== "ACTIVE") {
      ineligibleList.push({
        employee: emp,
        reason: `Effective contract is in status '${contract.status}'`,
      });
      continue;
    }

    if (Number(contract.wage) <= 0) {
      ineligibleList.push({
        employee: emp,
        reason: `Contract wage is 0 or invalid (${contract.wage})`,
      });
      continue;
    }

    if (salaryStructureId && Number(contract.salary_structure_id) !== Number(salaryStructureId)) {
      ineligibleList.push({
        employee: emp,
        reason: `Contract salary structure ID (${contract.salary_structure_id}) does not match payrun structure ID (${salaryStructureId})`,
      });
      continue;
    }

    eligibleList.push({
      employee: emp,
      contract,
    });
  }

  return {
    eligible: eligibleList,
    ineligible: ineligibleList,
  };
}

module.exports = { findEligibleEmployeesForPayrun };
