const {
  getMissingDataWarnings,
  getDuplicatePayslipWarnings,
  getContractAttentionWarnings,
} = require("../repositories/warning.repository");
const { createAuditLog } = require("./audit.service");
const { AppError } = require("../utils/http");

async function getAllDashboardWarningsService(companyId, actorUser) {
  if (actorUser.role_name === "Employee") {
    throw new AppError(403, "Employees are not authorized to view management dashboard warnings.", "ACCESS_DENIED");
  }

  const [missingData, duplicates, contractAttention] = await Promise.all([
    getMissingDataWarnings(companyId),
    getDuplicatePayslipWarnings(companyId),
    getContractAttentionWarnings(companyId),
  ]);

  const totalWarningsCount =
    missingData.missing_contract.length +
    missingData.missing_salary_structure.length +
    missingData.missing_employee_information.length +
    missingData.missing_working_schedule.length +
    duplicates.length +
    contractAttention.contracts_expiring_soon.length +
    contractAttention.contracts_expired_active.length;

  return {
    total_warnings_count: totalWarningsCount,
    missing_data_warnings: missingData,
    duplicate_payslip_warnings: duplicates,
    contract_attention_warnings: contractAttention,
  };
}

module.exports = {
  getAllDashboardWarningsService,
};
