const { AppError } = require("../utils/http");
const { resolveEffectiveContract } = require("./contract.resolver.service");
const { findSalaryStructureById } = require("../repositories/salary-structure.repository");
const { getStructureRules } = require("../repositories/salary-structure-rule.repository");
const { evaluateFormula, detectCircularDependencies } = require("../utils/formula-evaluator");

/**
 * Reusable Independent Salary Calculation Engine.
 * Evaluates salary structures and rules without creating or modifying Payruns or Payslips.
 */
async function calculateSalary({
  companyId,
  employeeId,
  targetDate = new Date().toISOString().slice(0, 10),
  customStructureId = null,
  customWage = null,
  inputs = {},
}) {
  if (!companyId || !employeeId) {
    throw new AppError(400, "companyId and employeeId are required for salary calculation", "MISSING_CALCULATION_PARAMS");
  }

  // 1. Resolve effective contract for target date
  const contract = await resolveEffectiveContract(companyId, employeeId, targetDate);

  const wage = customWage !== null && customWage !== undefined ? Number(customWage) : Number(contract.wage);
  const structureId = customStructureId || contract.salary_structure_id;

  if (!structureId) {
    throw new AppError(400, "No salary structure assigned to contract or specified in calculation", "NO_SALARY_STRUCTURE");
  }

  // 2. Fetch salary structure & attached active rules
  const structure = await findSalaryStructureById(null, companyId, structureId);
  if (!structure) {
    throw new AppError(404, "Salary structure not found", "SALARY_STRUCTURE_NOT_FOUND");
  }

  if (!structure.is_active) {
    throw new AppError(400, "Salary structure is inactive", "SALARY_STRUCTURE_INACTIVE");
  }

  const rules = await getStructureRules(null, companyId, structureId, { onlyActive: true });
  if (!rules || rules.length === 0) {
    throw new AppError(400, `No active salary rules found in structure '${structure.name}'`, "NO_STRUCTURE_RULES");
  }

  // 3. Cycle Detection
  detectCircularDependencies(rules);

  // 4. Sort rules by sequence ASC
  rules.sort((a, b) => (a.sequence || 0) - (b.sequence || 0));

  // 5. In-Memory Calculation Context
  const context = {
    CONTRACT_WAGE: wage,
    WAGE: wage,
    ...inputs,
  };

  const calculatedLines = [];
  const earnings = [];
  const deductions = [];
  const tax = [];
  const contributions = [];

  let explicitGross = null;
  let explicitNet = null;

  // 6. Evaluate each rule in sequence
  for (const rule of rules) {
    let ruleValue = 0;
    const code = rule.code.toUpperCase();

    if (rule.computation_type === "FIXED") {
      ruleValue = Number(rule.amount) || 0;
    } else if (rule.computation_type === "PERCENTAGE") {
      const baseCode = rule.percentage_of ? rule.percentage_of.toUpperCase() : "CONTRACT_WAGE";
      const baseValue = context[baseCode] !== undefined ? context[baseCode] : (baseCode === "CONTRACT_WAGE" ? wage : 0);
      const pct = Number(rule.percentage_value) || 0;
      ruleValue = baseValue * (pct / 100);
    } else if (rule.computation_type === "FORMULA") {
      ruleValue = evaluateFormula(rule.formula, context);
    }

    ruleValue = Math.round((ruleValue + Number.EPSILON) * 100) / 100;
    context[code] = ruleValue;

    const line = {
      salary_rule_id: rule.salary_rule_id,
      code: rule.code,
      name: rule.name,
      category: rule.category,
      computation_type: rule.computation_type,
      sequence: rule.sequence,
      amount: ruleValue,
    };

    calculatedLines.push(line);

    // Categorize
    switch (rule.category) {
      case "BASIC":
      case "ALLOWANCE":
      case "REIMBURSEMENT":
        earnings.push(line);
        break;
      case "GROSS":
        explicitGross = ruleValue;
        break;
      case "DEDUCTION":
        deductions.push(line);
        break;
      case "TAX":
        tax.push(line);
        break;
      case "CONTRIBUTION":
        contributions.push(line);
        break;
      case "NET":
        explicitNet = ruleValue;
        break;
      default:
        earnings.push(line);
        break;
    }
  }

  // Calculate totals
  const totalBasic = earnings
    .filter((l) => l.category === "BASIC")
    .reduce((sum, l) => sum + l.amount, 0);

  const totalAllowances = earnings
    .filter((l) => l.category === "ALLOWANCE" || l.category === "REIMBURSEMENT")
    .reduce((sum, l) => sum + l.amount, 0);

  const totalEarnings = earnings.reduce((sum, l) => sum + l.amount, 0);
  const calculatedGross = explicitGross !== null ? explicitGross : totalEarnings;

  const totalDeductions = deductions.reduce((sum, l) => sum + l.amount, 0);
  const totalTax = tax.reduce((sum, l) => sum + l.amount, 0);
  const totalContributions = contributions.reduce((sum, l) => sum + l.amount, 0);

  const calculatedNet = explicitNet !== null
    ? explicitNet
    : Math.round((calculatedGross - totalDeductions - totalTax - totalContributions + Number.EPSILON) * 100) / 100;

  return {
    contract: {
      contract_id: contract.contract_id,
      employee_id: contract.employee_id,
      wage: Number(contract.wage),
      wage_type: contract.wage_type,
      start_date: contract.start_date,
      end_date: contract.end_date,
    },
    salary_structure: {
      salary_structure_id: structure.salary_structure_id,
      name: structure.name,
      description: structure.description,
    },
    calculation_date: targetDate,
    wage_used: wage,
    lines: calculatedLines,
    earnings,
    gross: calculatedGross,
    deductions,
    tax,
    contributions,
    net: calculatedNet,
    summary: {
      total_basic: totalBasic,
      total_allowances: totalAllowances,
      gross: calculatedGross,
      total_deductions: totalDeductions,
      total_tax: totalTax,
      total_contributions: totalContributions,
      net: calculatedNet,
    },
  };
}

module.exports = { calculateSalary };
