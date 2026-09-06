const { AppError } = require("../utils/http");
const { getWorkingScheduleById, getScheduleByEmployee, listWorkingSchedules } = require("../repositories/schedule.repository");
const { resolveEffectiveContract } = require("./contract.resolver.service");

function normalizeDateStr(val) {
  if (!val) return new Date().toISOString().slice(0, 10);
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
}

async function resolveEffectiveSchedule(companyId, employeeId, targetDate) {
  const dateStr = normalizeDateStr(targetDate);
  const contract = await resolveEffectiveContract(companyId, employeeId, dateStr).catch(() => null);

  let schedule = null;
  let source = null;

  if (contract && contract.schedule_id) {
    const candSchedule = await getWorkingScheduleById(companyId, contract.schedule_id);
    if (candSchedule && candSchedule.is_active) {
      schedule = candSchedule;
      source = {
        source_type: "CONTRACT",
        contract_id: contract.contract_id,
        contract_start_date: contract.start_date,
        contract_end_date: contract.end_date,
      };
    }
  }

  if (!schedule) {
    const employeeSchedule = await getScheduleByEmployee(companyId, employeeId);
    if (employeeSchedule && employeeSchedule.schedule_id) {
      const candSchedule = await getWorkingScheduleById(companyId, employeeSchedule.schedule_id);
      if (candSchedule && candSchedule.is_active) {
        schedule = candSchedule;
        source = {
          source_type: "EMPLOYEE",
          contract_id: contract?.contract_id || null,
        };
      }
    }
  }

  if (!schedule) {
    const companySchedules = await listWorkingSchedules(companyId, { is_active: true });
    if (companySchedules && companySchedules.length > 0) {
      schedule = companySchedules[0];
      source = {
        source_type: "COMPANY_DEFAULT",
        contract_id: contract?.contract_id || null,
      };
    }
  }

  if (!schedule) {
    throw new AppError(404, `No effective active schedule found for employee on date ${dateStr}`, "EFFECTIVE_SCHEDULE_NOT_FOUND");
  }

  return {
    ...schedule,
    target_date: dateStr,
    source,
  };
}

module.exports = { resolveEffectiveSchedule };

