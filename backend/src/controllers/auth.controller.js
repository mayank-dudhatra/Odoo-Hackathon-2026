const {
  setupInitialCompany,
  login,
  refreshSession,
  logout,
  logoutAllSessions,
  activateInvitation,
  changePassword,
  createInvitationForUser,
  resendInvitation,
  getCurrentUserProfile,
  requestPasswordReset,
  resetPassword,
} = require("../services/auth.service");
const { success } = require("../utils/response");

async function initialSetup(req, res) {
  const result = await setupInitialCompany(req.body);
  return success(res, result, "Company setup completed", 201);
}

async function signIn(req, res) {
  const result = await login({
    identifier: req.body.identifier,
    password: req.body.password,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });
  return success(res, result, "Login successful");
}

async function refresh(req, res) {
  const result = await refreshSession({
    refreshToken: req.body.refresh_token,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });
  return success(res, result, "Token refreshed");
}

async function signOut(req, res) {
  await logout({
    userId: req.auth.user_id,
    sessionId: req.auth.session_id,
    refreshToken: req.body.refresh_token || null,
  });
  return success(res, { logged_out: true }, "Logout successful");
}

async function signOutAll(req, res) {
  await logoutAllSessions({
    userId: req.auth.user_id,
    companyId: req.auth.company_id,
  });
  return success(res, { logged_out: true }, "All sessions revoked");
}

async function activate(req, res) {
  await activateInvitation({
    token: req.body.token,
    password: req.body.password,
  });
  return success(res, { activated: true }, "Account activated", 200);
}

async function changeOwnPassword(req, res) {
  const result = await changePassword({
    userId: req.auth.user_id,
    companyId: req.auth.company_id,
    currentPassword: req.body.current_password,
    newPassword: req.body.new_password,
    currentSessionId: req.auth.session_id,
  });
  return success(res, result, "Password changed successfully");
}

async function me(req, res) {
  const profile = await getCurrentUserProfile(req.auth.user_id, req.auth.company_id);
  return success(res, profile, "Current user profile");
}

async function inviteUser(req, res) {
  const result = await createInvitationForUser({
    actor: req.auth,
    payload: req.body,
  });
  return success(res, result, "Invitation created", 201);
}

async function resendUserInvitation(req, res) {
  const result = await resendInvitation({
    actor: req.auth,
    targetUserId: req.params.id,
  });
  return success(res, result, "Invitation resent");
}

async function forgotPassword(req, res) {
  const result = await requestPasswordReset({ email: req.body.email });
  return success(res, result, "Password reset request processed");
}

async function resetPasswordHandler(req, res) {
  const result = await resetPassword({
    token: req.body.token,
    newPassword: req.body.new_password,
  });
  return success(res, result, "Password reset successful");
}

module.exports = {
  initialSetup,
  signIn,
  refresh,
  signOut,
  signOutAll,
  activate,
  changeOwnPassword,
  me,
  inviteUser,
  resendUserInvitation,
  forgotPassword,
  resetPasswordHandler,
};

