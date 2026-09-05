const { AppError } = require("../utils/http");
const { getEffectiveContract } = require("../repositories/contract.repository");

function normalizeDateStr(val) {
  if (!val) return new Date().toISOString().slice(0, 10);
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
}

async function resolveEffectiveContract(companyId, employeeId, targetDate) {
  const dateStr = normalizeDateStr(targetDate);
  const contract = await getEffectiveContract(companyId, employeeId, dateStr);
  if (!contract) {
    throw new AppError(404, `No effective contract found for employee on date ${dateStr}`, "EFFECTIVE_CONTRACT_NOT_FOUND");
  }
  return contract;
}

module.exports = { resolveEffectiveContract };

