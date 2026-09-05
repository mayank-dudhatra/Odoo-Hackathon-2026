const {
  listCompanyUsers,
  getCompanyUsersSummary,
  getCompanyUserById,
  setUserStatus,
  changeUserRole,
  relinkUserEmployee,
} = require("../services/user.service");
const { success } = require("../utils/response");

async function listUsers(req, res) {
  const users = await listCompanyUsers(req.auth.company_id, req.query);
  return success(res, users, "Users fetched");
}

async function getUsersSummary(req, res) {
  const summary = await getCompanyUsersSummary(req.auth.company_id);
  return success(res, summary, "Users summary fetched");
}

async function getUser(req, res) {
  const user = await getCompanyUserById(req.auth.company_id, req.params.id);
  return success(res, user, "User fetched");
}

async function disableUser(req, res) {
  const user = await setUserStatus({
    actor: req.auth,
    userId: req.params.id,
    status: "DISABLED",
  });
  return success(res, user, "User disabled");
}

async function enableUser(req, res) {
  const user = await setUserStatus({
    actor: req.auth,
    userId: req.params.id,
    status: "ACTIVE",
  });
  return success(res, user, "User enabled");
}

async function updateRole(req, res) {
  const user = await changeUserRole({
    actor: req.auth,
    userId: req.params.id,
    roleName: req.body.role_name,
  });
  return success(res, user, "Role updated");
}

async function linkEmployee(req, res) {
  const user = await relinkUserEmployee({
    actor: req.auth,
    userId: req.params.id,
    employeeId: req.body.employee_id,
  });
  return success(res, user, "Employee linked");
}

module.exports = {
  listUsers,
  getUsersSummary,
  getUser,
  disableUser,
  enableUser,
  updateRole,
  linkEmployee,
};
