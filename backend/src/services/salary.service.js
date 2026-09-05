const { AppError } = require("../utils/http");
const { createAuditLog } = require("./audit.service");
const {
  createSalaryStructure,
  findSalaryStructureById,
  findSalaryStructureByName,
  listSalaryStructures,
  updateSalaryStructure,
  deactivateSalaryStructure,
} = require("../repositories/salary-structure.repository");
const {
  createSalaryRule,
  findSalaryRuleById,
  findSalaryRuleByCode,
  listSalaryRules,
  updateSalaryRule,
  deactivateSalaryRule,
} = require("../repositories/salary-rule.repository");
const {
  addRuleToStructure,
  findStructureRule,
  updateStructureRule,
  removeRuleFromStructure,
  getStructureRules,
} = require("../repositories/salary-structure-rule.repository");
const { calculateSalary } = require("./salary-calculation.service");
const { detectCircularDependencies } = require("../utils/formula-evaluator");

// --- SALARY STRUCTURE SERVICES ---

async function createSalaryStructureService(companyId, payload, actorUserId) {
  const existing = await findSalaryStructureByName(null, companyId, payload.name);
  if (existing) {
    throw new AppError(409, "A salary structure with this name already exists", "DUPLICATE_SALARY_STRUCTURE");
  }

  const structure = await createSalaryStructure(null, {
    company_id: companyId,
    ...payload,
    created_by: actorUserId,
  });

  await createAuditLog({
    companyId,
    userId: actorUserId,
    module: "SALARY",
    action: "SALARY_STRUCTURE_CREATED",
    recordId: structure.salary_structure_id,
    details: { name: structure.name },
  });

  return structure;
}

async function listSalaryStructuresService(companyId, filters) {
  return listSalaryStructures(null, companyId, filters);
}

async function getSalaryStructureByIdService(companyId, structureId) {
  const structure = await findSalaryStructureById(null, companyId, structureId);
  if (!structure) {
    throw new AppError(404, "Salary structure not found", "SALARY_STRUCTURE_NOT_FOUND");
  }

  const rules = await getStructureRules(null, companyId, structureId, { onlyActive: false });
  return {
    ...structure,
    rules,
  };
}

async function updateSalaryStructureService(companyId, structureId, payload, actorUserId) {
  const structure = await findSalaryStructureById(null, companyId, structureId);
  if (!structure) {
    throw new AppError(404, "Salary structure not found", "SALARY_STRUCTURE_NOT_FOUND");
  }

  if (payload.name && payload.name.toLowerCase() !== structure.name.toLowerCase()) {
    const existing = await findSalaryStructureByName(null, companyId, payload.name);
    if (existing && existing.salary_structure_id !== structureId) {
      throw new AppError(409, "A salary structure with this name already exists", "DUPLICATE_SALARY_STRUCTURE");
    }
  }

  const updated = await updateSalaryStructure(null, companyId, structureId, payload);

  await createAuditLog({
    companyId,
    userId: actorUserId,
    module: "SALARY",
    action: "SALARY_STRUCTURE_UPDATED",
    recordId: structureId,
    details: payload,
  });

  return getSalaryStructureByIdService(companyId, structureId);
}

async function deactivateSalaryStructureService(companyId, structureId, actorUserId) {
  const structure = await findSalaryStructureById(null, companyId, structureId);
  if (!structure) {
    throw new AppError(404, "Salary structure not found", "SALARY_STRUCTURE_NOT_FOUND");
  }

  const deactivated = await deactivateSalaryStructure(null, companyId, structureId);

  await createAuditLog({
    companyId,
    userId: actorUserId,
    module: "SALARY",
    action: "SALARY_STRUCTURE_DEACTIVATED",
    recordId: structureId,
  });

  return deactivated;
}

// --- SALARY RULE SERVICES ---

async function createSalaryRuleService(companyId, payload, actorUserId) {
  const existing = await findSalaryRuleByCode(null, companyId, payload.code);
  if (existing) {
    throw new AppError(409, `A salary rule with code '${payload.code.toUpperCase()}' already exists`, "DUPLICATE_SALARY_RULE_CODE");
  }

  const rule = await createSalaryRule(null, {
    company_id: companyId,
    ...payload,
  });

  await createAuditLog({
    companyId,
    userId: actorUserId,
    module: "SALARY",
    action: "SALARY_RULE_CREATED",
    recordId: rule.salary_rule_id,
    details: { code: rule.code, category: rule.category, computation_type: rule.computation_type },
  });

  return rule;
}

async function listSalaryRulesService(companyId, filters) {
  return listSalaryRules(null, companyId, filters);
}

async function getSalaryRuleByIdService(companyId, ruleId) {
  const rule = await findSalaryRuleById(null, companyId, ruleId);
  if (!rule) {
    throw new AppError(404, "Salary rule not found", "SALARY_RULE_NOT_FOUND");
  }
  return rule;
}

async function updateSalaryRuleService(companyId, ruleId, payload, actorUserId) {
  const rule = await findSalaryRuleById(null, companyId, ruleId);
  if (!rule) {
    throw new AppError(404, "Salary rule not found", "SALARY_RULE_NOT_FOUND");
  }

  if (payload.code && payload.code.toUpperCase() !== rule.code.toUpperCase()) {
    const existing = await findSalaryRuleByCode(null, companyId, payload.code);
    if (existing && existing.salary_rule_id !== ruleId) {
      throw new AppError(409, `A salary rule with code '${payload.code.toUpperCase()}' already exists`, "DUPLICATE_SALARY_RULE_CODE");
    }
  }

  const updated = await updateSalaryRule(null, companyId, ruleId, payload);

  await createAuditLog({
    companyId,
    userId: actorUserId,
    module: "SALARY",
    action: "SALARY_RULE_UPDATED",
    recordId: ruleId,
    details: payload,
  });

  return updated;
}

async function deactivateSalaryRuleService(companyId, ruleId, actorUserId) {
  const rule = await findSalaryRuleById(null, companyId, ruleId);
  if (!rule) {
    throw new AppError(404, "Salary rule not found", "SALARY_RULE_NOT_FOUND");
  }

  const deactivated = await deactivateSalaryRule(null, companyId, ruleId);

  await createAuditLog({
    companyId,
    userId: actorUserId,
    module: "SALARY",
    action: "SALARY_RULE_DEACTIVATED",
    recordId: ruleId,
  });

  return deactivated;
}

// --- STRUCTURE-RULE MAPPING SERVICES ---

async function addRuleToStructureService(companyId, structureId, payload, actorUserId) {
  const structure = await findSalaryStructureById(null, companyId, structureId);
  if (!structure) {
    throw new AppError(404, "Salary structure not found", "SALARY_STRUCTURE_NOT_FOUND");
  }

  const rule = await findSalaryRuleById(null, companyId, payload.rule_id);
  if (!rule) {
    throw new AppError(404, "Salary rule not found", "SALARY_RULE_NOT_FOUND");
  }

  // Get current rules to test circular dependency
  const currentRules = await getStructureRules(null, companyId, structureId, { onlyActive: false });
  const updatedRules = [...currentRules.filter((r) => r.salary_rule_id !== payload.rule_id), { ...rule, sequence: payload.sequence }];

  detectCircularDependencies(updatedRules);

  const mapped = await addRuleToStructure(null, structureId, payload.rule_id, payload.sequence, payload.is_active ?? true);

  await createAuditLog({
    companyId,
    userId: actorUserId,
    module: "SALARY",
    action: "STRUCTURE_RULE_ADDED",
    recordId: structureId,
    details: { rule_id: payload.rule_id, sequence: payload.sequence },
  });

  return getSalaryStructureByIdService(companyId, structureId);
}

async function updateStructureRuleService(companyId, structureId, ruleId, payload, actorUserId) {
  const structure = await findSalaryStructureById(null, companyId, structureId);
  if (!structure) {
    throw new AppError(404, "Salary structure not found", "SALARY_STRUCTURE_NOT_FOUND");
  }

  const mapping = await findStructureRule(null, structureId, ruleId);
  if (!mapping) {
    throw new AppError(404, "Rule is not attached to this salary structure", "STRUCTURE_RULE_NOT_FOUND");
  }

  const updated = await updateStructureRule(null, structureId, ruleId, payload);

  await createAuditLog({
    companyId,
    userId: actorUserId,
    module: "SALARY",
    action: "STRUCTURE_RULE_UPDATED",
    recordId: structureId,
    details: { rule_id: ruleId, ...payload },
  });

  return getSalaryStructureByIdService(companyId, structureId);
}

async function removeRuleFromStructureService(companyId, structureId, ruleId, actorUserId) {
  const structure = await findSalaryStructureById(null, companyId, structureId);
  if (!structure) {
    throw new AppError(404, "Salary structure not found", "SALARY_STRUCTURE_NOT_FOUND");
  }

  const removed = await removeRuleFromStructure(null, structureId, ruleId);
  if (!removed) {
    throw new AppError(404, "Rule is not attached to this salary structure", "STRUCTURE_RULE_NOT_FOUND");
  }

  await createAuditLog({
    companyId,
    userId: actorUserId,
    module: "SALARY",
    action: "STRUCTURE_RULE_REMOVED",
    recordId: structureId,
    details: { rule_id: ruleId },
  });

  return getSalaryStructureByIdService(companyId, structureId);
}

async function previewSalaryCalculationService(companyId, payload) {
  return calculateSalary({
    companyId,
    employeeId: payload.employee_id,
    targetDate: payload.target_date,
    customStructureId: payload.salary_structure_id,
    customWage: payload.wage,
  });
}

module.exports = {
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
};
