const {
  createSalaryStructureService,
  listSalaryStructuresService,
  getSalaryStructureByIdService,
  updateSalaryStructureService,
  deactivateSalaryStructureService,
  createSalaryRuleService,
  listSalaryRulesService,
  getSalaryRuleByIdService,
  updateSalaryRuleService,
  deactivateSalaryRuleService,
  addRuleToStructureService,
  updateStructureRuleService,
  removeRuleFromStructureService,
  previewSalaryCalculationService,
} = require("../services/salary.service");
const { success } = require("../utils/response");

async function createSalaryStructure(req, res) {
  const result = await createSalaryStructureService(req.auth.company_id, req.body, req.auth.user_id);
  return success(res, result, "Salary structure created successfully", 201);
}

async function listSalaryStructures(req, res) {
  const is_active = req.query.is_active !== undefined ? req.query.is_active === "true" : null;
  const result = await listSalaryStructuresService(req.auth.company_id, { is_active });
  return success(res, result, "Salary structures fetched successfully");
}

async function getSalaryStructureById(req, res) {
  const result = await getSalaryStructureByIdService(req.auth.company_id, Number(req.params.id));
  return success(res, result, "Salary structure fetched successfully");
}

async function updateSalaryStructure(req, res) {
  const result = await updateSalaryStructureService(req.auth.company_id, Number(req.params.id), req.body, req.auth.user_id);
  return success(res, result, "Salary structure updated successfully");
}

async function deactivateSalaryStructure(req, res) {
  const result = await deactivateSalaryStructureService(req.auth.company_id, Number(req.params.id), req.auth.user_id);
  return success(res, result, "Salary structure deactivated successfully");
}

async function createSalaryRule(req, res) {
  const result = await createSalaryRuleService(req.auth.company_id, req.body, req.auth.user_id);
  return success(res, result, "Salary rule created successfully", 201);
}

async function listSalaryRules(req, res) {
  const filters = {
    category: req.query.category || null,
    computation_type: req.query.computation_type || null,
    is_active: req.query.is_active !== undefined ? req.query.is_active === "true" : null,
  };
  const result = await listSalaryRulesService(req.auth.company_id, filters);
  return success(res, result, "Salary rules fetched successfully");
}

async function getSalaryRuleById(req, res) {
  const result = await getSalaryRuleByIdService(req.auth.company_id, Number(req.params.id));
  return success(res, result, "Salary rule fetched successfully");
}

async function updateSalaryRule(req, res) {
  const result = await updateSalaryRuleService(req.auth.company_id, Number(req.params.id), req.body, req.auth.user_id);
  return success(res, result, "Salary rule updated successfully");
}

async function deactivateSalaryRule(req, res) {
  const result = await deactivateSalaryRuleService(req.auth.company_id, Number(req.params.id), req.auth.user_id);
  return success(res, result, "Salary rule deactivated successfully");
}

async function addRuleToStructure(req, res) {
  const result = await addRuleToStructureService(req.auth.company_id, Number(req.params.id), req.body, req.auth.user_id);
  return success(res, result, "Rule added to salary structure successfully", 201);
}

async function updateStructureRule(req, res) {
  const result = await updateStructureRuleService(
    req.auth.company_id,
    Number(req.params.id),
    Number(req.params.ruleId),
    req.body,
    req.auth.user_id
  );
  return success(res, result, "Structure rule sequence updated successfully");
}

async function removeRuleFromStructure(req, res) {
  const result = await removeRuleFromStructureService(
    req.auth.company_id,
    Number(req.params.id),
    Number(req.params.ruleId),
    req.auth.user_id
  );
  return success(res, result, "Rule removed from salary structure successfully");
}

async function previewSalaryCalculation(req, res) {
  const result = await previewSalaryCalculationService(req.auth.company_id, req.body);
  return success(res, result, "Salary calculation preview generated successfully");
}

module.exports = {
  createSalaryStructure,
  listSalaryStructures,
  getSalaryStructureById,
  updateSalaryStructure,
  deactivateSalaryStructure,
  createSalaryRule,
  listSalaryRules,
  getSalaryRuleById,
  updateSalaryRule,
  deactivateSalaryRule,
  addRuleToStructure,
  updateStructureRule,
  removeRuleFromStructure,
  previewSalaryCalculation,
};
