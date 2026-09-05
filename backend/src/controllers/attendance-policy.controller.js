const {
  listCompanyAttendancePolicies,
  getCompanyAttendancePolicy,
  createCompanyAttendancePolicy,
  updateCompanyAttendancePolicy,
  deactivateCompanyAttendancePolicy,
} = require("../services/attendance-policy.service");
const { success } = require("../utils/response");

async function listAttendancePoliciesHandler(req, res) {
  return success(res, await listCompanyAttendancePolicies(req.auth, req.query), "Attendance policies fetched");
}

async function getAttendancePolicyHandler(req, res) {
  return success(res, await getCompanyAttendancePolicy(req.auth, req.params.id), "Attendance policy fetched");
}

async function createAttendancePolicyHandler(req, res) {
  return success(res, await createCompanyAttendancePolicy(req.auth, req.body), "Attendance policy created", 201);
}

async function updateAttendancePolicyHandler(req, res) {
  return success(res, await updateCompanyAttendancePolicy(req.auth, req.params.id, req.body), "Attendance policy updated");
}

async function deactivateAttendancePolicyHandler(req, res) {
  return success(res, await deactivateCompanyAttendancePolicy(req.auth, req.params.id), "Attendance policy deactivated");
}

module.exports = {
  listAttendancePoliciesHandler,
  getAttendancePolicyHandler,
  createAttendancePolicyHandler,
  updateAttendancePolicyHandler,
  deactivateAttendancePolicyHandler,
};
