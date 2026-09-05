const { withTransaction, query } = require("../db");
const { AppError } = require("../utils/http");
const { createAuditLog } = require("./audit.service");
const {
  listAttendancePolicies,
  getAttendancePolicyById,
  createAttendancePolicy,
  updateAttendancePolicy,
  setAttendancePolicyActive,
} = require("../repositories/attendance-policy.repository");

async function listCompanyAttendancePolicies(auth, filters = {}) {
  return listAttendancePolicies(auth.company_id, filters);
}

async function getCompanyAttendancePolicy(auth, policyId) {
  const policy = await getAttendancePolicyById(auth.company_id, policyId);
  if (!policy) {
    throw new AppError(404, "Attendance policy not found", "ATTENDANCE_POLICY_NOT_FOUND");
  }
  return policy;
}

async function createCompanyAttendancePolicy(auth, payload) {
  return withTransaction(async (client) => {
    const existing = await client.query(
      `SELECT policy_id FROM attendance_policies WHERE company_id = $1 AND name = $2 LIMIT 1`,
      [auth.company_id, payload.name]
    );

    if (existing.rows[0]) {
      throw new AppError(409, "Attendance policy name already exists for this company", "DUPLICATE_RECORD");
    }

    const policy = await createAttendancePolicy(auth.company_id, payload, client);

    await createAuditLog({
      companyId: auth.company_id,
      userId: auth.user_id,
      module: "ATTENDANCE_POLICIES",
      action: "CREATE",
      recordId: policy.policy_id,
      details: { name: policy.name },
    });

    return policy;
  });
}

async function updateCompanyAttendancePolicy(auth, policyId, payload) {
  return withTransaction(async (client) => {
    const current = await getAttendancePolicyById(auth.company_id, policyId, client);
    if (!current) {
      throw new AppError(404, "Attendance policy not found", "ATTENDANCE_POLICY_NOT_FOUND");
    }

    if (payload.name && payload.name !== current.name) {
      const existing = await client.query(
        `SELECT policy_id FROM attendance_policies WHERE company_id = $1 AND name = $2 AND policy_id <> $3 LIMIT 1`,
        [auth.company_id, payload.name, policyId]
      );
      if (existing.rows[0]) {
        throw new AppError(409, "Attendance policy name already exists for this company", "DUPLICATE_RECORD");
      }
    }

    const updated = await updateAttendancePolicy(auth.company_id, policyId, payload, client);

    await createAuditLog({
      companyId: auth.company_id,
      userId: auth.user_id,
      module: "ATTENDANCE_POLICIES",
      action: "UPDATE",
      recordId: policyId,
      details: payload,
    });

    return updated;
  });
}

async function deactivateCompanyAttendancePolicy(auth, policyId) {
  return withTransaction(async (client) => {
    const current = await getAttendancePolicyById(auth.company_id, policyId, client);
    if (!current) {
      throw new AppError(404, "Attendance policy not found", "ATTENDANCE_POLICY_NOT_FOUND");
    }

    const schedRes = await client.query(
      `SELECT 1 FROM working_schedules WHERE company_id = $1 AND attendance_policy_id = $2 LIMIT 1`,
      [auth.company_id, policyId]
    );

    if (schedRes.rows.length > 0) {
      const deactivated = await setAttendancePolicyActive(auth.company_id, policyId, false, client);
      await createAuditLog({
        companyId: auth.company_id,
        userId: auth.user_id,
        module: "ATTENDANCE_POLICIES",
        action: "DEACTIVATE",
        recordId: policyId,
      });
      return deactivated;
    } else {
      await client.query(`DELETE FROM attendance_policies WHERE company_id = $1 AND policy_id = $2`, [
        auth.company_id,
        policyId,
      ]);
      await createAuditLog({
        companyId: auth.company_id,
        userId: auth.user_id,
        module: "ATTENDANCE_POLICIES",
        action: "DELETE",
        recordId: policyId,
      });
      return { policy_id: Number(policyId), deleted: true };
    }
  });
}

module.exports = {
  listCompanyAttendancePolicies,
  getCompanyAttendancePolicy,
  createCompanyAttendancePolicy,
  updateCompanyAttendancePolicy,
  deactivateCompanyAttendancePolicy,
};
