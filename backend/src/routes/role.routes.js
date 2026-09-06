const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const { requirePermission } = require("../middleware/rbac.middleware");
const {
  listRolesHandler,
  getRoleHandler,
  createRoleHandler,
  updateRoleHandler,
  deleteRoleHandler,
  getRolePermissionsHandler,
  updateRolePermissionsHandler,
} = require("../controllers/rbac.controller");

const router = express.Router();

router.use(authenticate);

const { cacheResponse, invalidateCache } = require("../middleware/cache.middleware");

router.get("/", requirePermission("ROLES", "READ"), cacheResponse(120, "roles"), listRolesHandler);
router.post("/", requirePermission("ROLES", "CREATE"), invalidateCache(["roles"]), createRoleHandler);
router.get("/:id", requirePermission("ROLES", "READ"), getRoleHandler);
router.put("/:id", requirePermission("ROLES", "UPDATE"), invalidateCache(["roles"]), updateRoleHandler);
router.delete("/:id", requirePermission("ROLES", "DELETE"), invalidateCache(["roles"]), deleteRoleHandler);

router.get(
  "/:id/permissions",
  (req, res, next) => {
    if (req.auth && req.auth.role_id === Number(req.params.id)) {
      return next();
    }
    return requirePermission("ROLES", "READ")(req, res, next);
  },
  getRolePermissionsHandler
);
router.put("/:id/permissions", requirePermission("ROLES", "UPDATE"), updateRolePermissionsHandler);

module.exports = router;
