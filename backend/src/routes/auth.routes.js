const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const { authLimiter, loginLimiter, passwordResetLimiter } = require("../middleware/rateLimit.middleware");
const { validateRequest } = require("../middleware/validate.middleware");
const { requirePermission } = require("../middleware/rbac.middleware");
const { initialSetupSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema } = require("../validators/auth.validators");
const { inviteUserSchema } = require("../validators/user.validators");
const { z } = require("zod");
const {
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
} = require("../controllers/auth.controller");

const router = express.Router();

router.post("/setup", authLimiter, validateRequest({ body: initialSetupSchema }), initialSetup);
router.post("/login", loginLimiter, validateRequest({ body: z.object({ identifier: z.string().min(3), password: z.string().min(8) }) }), signIn);
router.post("/forgot-password", passwordResetLimiter, validateRequest({ body: forgotPasswordSchema }), forgotPassword);
router.post("/reset-password", passwordResetLimiter, validateRequest({ body: resetPasswordSchema }), resetPasswordHandler);
const { cacheResponse, invalidateCache } = require("../middleware/cache.middleware");

router.post("/refresh", authLimiter, validateRequest({ body: z.object({ refresh_token: z.string().min(10) }) }), refresh);
router.post("/activate", authLimiter, validateRequest({ body: z.object({ token: z.string().min(20), password: z.string().min(8) }) }), activate);
router.post("/logout", authenticate, authLimiter, invalidateCache(["auth_me"]), validateRequest({ body: z.object({ refresh_token: z.string().min(10).optional() }) }), signOut);
router.post("/logout-all", authenticate, authLimiter, invalidateCache(["auth_me"]), signOutAll);
router.get("/me", authenticate, cacheResponse(60, "auth_me"), me);
router.post(
  "/change-password",
  authenticate,
  authLimiter,
  validateRequest({ body: changePasswordSchema }),
  changeOwnPassword
);
router.post(
  "/password",
  authenticate,
  authLimiter,
  validateRequest({ body: changePasswordSchema }),
  changeOwnPassword
);
router.post(
  "/invitations",
  authenticate,
  requirePermission("USERS", "CREATE"),
  validateRequest({ body: inviteUserSchema }),
  inviteUser
);
router.post(
  "/invitations/:id/resend",
  authenticate,
  requirePermission("USERS", "UPDATE"),
  validateRequest({ params: z.object({ id: z.coerce.number().int().positive() }) }),
  resendUserInvitation
);

module.exports = router;

