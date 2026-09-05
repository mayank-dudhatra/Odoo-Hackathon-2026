const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const { requirePermission } = require("../middleware/rbac.middleware");
const { validateRequest } = require("../middleware/validate.middleware");
const { z } = require("zod");
const { idParam } = require("../validators/common.validators");
const { changeUserRoleSchema, linkEmployeeSchema, userStatusSchema } = require("../validators/user.validators");
const { listUsers, getUsersSummary, getUser, disableUser, enableUser, updateRole, linkEmployee } = require("../controllers/user.controller");

const router = express.Router();

router.use(authenticate);

router.get("/", requirePermission("USERS", "READ"), listUsers);
router.get("/summary", requirePermission("USERS", "READ"), getUsersSummary);
router.get("/:id", requirePermission("USERS", "READ"), validateRequest({ params: idParam }), getUser);
router.patch("/:id/disable", requirePermission("USERS", "UPDATE"), validateRequest({ params: idParam, body: userStatusSchema }), disableUser);
router.patch("/:id/enable", requirePermission("USERS", "UPDATE"), validateRequest({ params: idParam, body: userStatusSchema }), enableUser);
router.patch("/:id/role", requirePermission("USERS", "UPDATE"), validateRequest({ params: idParam, body: changeUserRoleSchema }), updateRole);
router.patch("/:id/link-employee", requirePermission("USERS", "UPDATE"), validateRequest({ params: idParam, body: linkEmployeeSchema }), linkEmployee);

module.exports = router;
