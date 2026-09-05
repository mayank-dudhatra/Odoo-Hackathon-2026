const { getPermissionScope } = require("../services/rbac.service");
const { AppError } = require("../utils/http");

function requirePermission(moduleName, actionName, options = {}) {
  return async (req, res, next) => {
    try {
      if (!req.auth) {
        throw new AppError(401, "Authentication required", "AUTH_REQUIRED");
      }

      const scope = await getPermissionScope(req.auth.role_id, moduleName, actionName);
      if (!scope) {
        throw new AppError(403, "Forbidden", "PERMISSION_DENIED");
      }

      req.permission = {
        module: moduleName,
        action: actionName,
        scope,
      };

      if (scope === "ALL") {
        return next();
      }

      if (scope === "OWN" && typeof options.ownResolver === "function") {
        const allowed = await options.ownResolver(req);
        if (!allowed) {
          throw new AppError(403, "Forbidden", "OWN_SCOPE_REQUIRED");
        }
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
}

function requireAdmin(req, res, next) {
  if (!req.auth) {
    return next(new AppError(401, "Authentication required", "AUTH_REQUIRED"));
  }

  if (req.auth.role_name !== "Admin") {
    return next(new AppError(403, "Admin access required", "ADMIN_REQUIRED"));
  }

  return next();
}

module.exports = { requirePermission, requireAdmin };
