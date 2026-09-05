const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const { requirePermission } = require("../middleware/rbac.middleware");
const { listPermissionsHandler } = require("../controllers/rbac.controller");

const router = express.Router();

router.use(authenticate);

router.get("/", requirePermission("ROLES", "READ"), listPermissionsHandler);

module.exports = router;
