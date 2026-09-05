const { query } = require("../db");

async function listAttendancePolicies(companyId, filters = {}, client = null) {
  const executor = client || { query };
  const where = ["company_id = $1"];
  const values = [companyId];

  if (filters.is_active !== undefined && filters.is_active !== "all" && filters.is_active !== "any") {
    const isActive = filters.is_active === true || filters.is_active === "true";
    where.push(`is_active = $${values.length + 1}`);
    values.push(isActive);
  } else if (filters.is_active === undefined) {
    where.push(`is_active = TRUE`);
  }

  const result = await executor.query(
    `
      SELECT
        policy_id,
        company_id,
        name,
        grace_period_minutes,
        grace_occurrences_allowed,
        grace_period_penalty,
        beyond_grace_penalty,
        early_leave_grace_minutes,
        early_leave_penalty,
        stack_deductions,
        paid_leave_days_count,
        sick_leave_days_count,
        casual_leave_days_count,
        max_unexcused_absences,
        leave_type_quotas,
        is_active,
        created_at,
        updated_at
      FROM attendance_policies
      WHERE ${where.join(" AND ")}
      ORDER BY created_at DESC
    `,
    values
  );
  return result.rows;
}

async function getAttendancePolicyById(companyId, policyId, client = null) {
  const executor = client || { query };
  const result = await executor.query(
    `
      SELECT
        policy_id,
        company_id,
        name,
        grace_period_minutes,
        grace_occurrences_allowed,
        grace_period_penalty,
        beyond_grace_penalty,
        early_leave_grace_minutes,
        early_leave_penalty,
        stack_deductions,
        paid_leave_days_count,
        sick_leave_days_count,
        casual_leave_days_count,
        max_unexcused_absences,
        leave_type_quotas,
        is_active,
        created_at,
        updated_at
      FROM attendance_policies
      WHERE company_id = $1 AND policy_id = $2
      LIMIT 1
    `,
    [companyId, policyId]
  );
  return result.rows[0] || null;
}

async function getDefaultAttendancePolicy(companyId, client = null) {
  const executor = client || { query };
  const result = await executor.query(
    `
      SELECT
        policy_id,
        company_id,
        name,
        grace_period_minutes,
        grace_occurrences_allowed,
        grace_period_penalty,
        beyond_grace_penalty,
        early_leave_grace_minutes,
        early_leave_penalty,
        stack_deductions,
        paid_leave_days_count,
        sick_leave_days_count,
        casual_leave_days_count,
        max_unexcused_absences,
        leave_type_quotas,
        is_active,
        created_at,
        updated_at
      FROM attendance_policies
      WHERE company_id = $1 AND is_active = true
      ORDER BY policy_id ASC
      LIMIT 1
    `,
    [companyId]
  );
  return result.rows[0] || null;
}

async function createAttendancePolicy(companyId, payload, client = null) {
  const executor = client || { query };
  const result = await executor.query(
    `
      INSERT INTO attendance_policies (
        company_id,
        name,
        grace_period_minutes,
        grace_occurrences_allowed,
        grace_period_penalty,
        beyond_grace_penalty,
        early_leave_grace_minutes,
        early_leave_penalty,
        stack_deductions,
        paid_leave_days_count,
        sick_leave_days_count,
        casual_leave_days_count,
        max_unexcused_absences,
        leave_type_quotas,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, COALESCE($15, true))
      RETURNING *
    `,
    [
      companyId,
      payload.name,
      payload.grace_period_minutes ?? 0,
      payload.grace_occurrences_allowed ?? 0,
      payload.grace_period_penalty || "NONE",
      payload.beyond_grace_penalty || "NONE",
      payload.early_leave_grace_minutes ?? 0,
      payload.early_leave_penalty || "NONE",
      payload.stack_deductions ?? false,
      payload.paid_leave_days_count ?? 20,
      payload.sick_leave_days_count ?? 10,
      payload.casual_leave_days_count ?? 7,
      payload.max_unexcused_absences ?? 3,
      JSON.stringify(payload.leave_type_quotas || {}),
      payload.is_active,
    ]
  );
  return result.rows[0] || null;
}

async function updateAttendancePolicy(companyId, policyId, payload, client = null) {
  const executor = client || { query };
  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(payload)) {
    fields.push(`${key} = $${values.length + 1}`);
    values.push(key === "leave_type_quotas" && typeof value === "object" && value !== null ? JSON.stringify(value) : value);
  }

  if (!fields.length) {
    return getAttendancePolicyById(companyId, policyId, executor);
  }

  values.push(companyId, policyId);
  const result = await executor.query(
    `
      UPDATE attendance_policies
      SET ${fields.join(", ")}, updated_at = NOW()
      WHERE company_id = $${values.length - 1} AND policy_id = $${values.length}
      RETURNING *
    `,
    values
  );
  return result.rows[0] || null;
}

async function setAttendancePolicyActive(companyId, policyId, isActive, client = null) {
  const executor = client || { query };
  const result = await executor.query(
    `
      UPDATE attendance_policies
      SET is_active = $1, updated_at = NOW()
      WHERE company_id = $2 AND policy_id = $3
      RETURNING *
    `,
    [isActive, companyId, policyId]
  );
  return result.rows[0] || null;
}

module.exports = {
  listAttendancePolicies,
  getAttendancePolicyById,
  getDefaultAttendancePolicy,
  createAttendancePolicy,
  updateAttendancePolicy,
  setAttendancePolicyActive,
};
