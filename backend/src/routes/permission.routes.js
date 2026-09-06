const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const { requirePermission } = require("../middleware/rbac.middleware");
const { listPermissionsHandler } = require("../controllers/rbac.controller");

const router = express.Router();

router.use(authenticate);

const { cacheResponse } = require("../middleware/cache.middleware");

router.get("/", requirePermission("ROLES", "READ"), cacheResponse(300, "permissions"), listPermissionsHandler);

module.exports = router;
