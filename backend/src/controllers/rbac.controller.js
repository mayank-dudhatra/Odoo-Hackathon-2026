const {
  listRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  listPermissions,
  getRolePermissions,
  replaceRolePermissions,
} = require("../services/rbac.service");
const { success } = require("../utils/response");

async function listRolesHandler(req, res, next) {
  try {
    const roles = await listRoles();
    return success(res, roles, "Roles fetched successfully");
  } catch (error) {
    next(error);
  }
}

async function getRoleHandler(req, res, next) {
  try {
    const role = await getRoleById(Number(req.params.id));
    if (!role) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Role not found" },
      });
    }
    return success(res, role, "Role fetched successfully");
  } catch (error) {
    next(error);
  }
}

async function createRoleHandler(req, res, next) {
  try {
    const { role_name, description } = req.body;
    const role = await createRole(role_name, description);
    return success(res, role, "Role created successfully", 201);
  } catch (error) {
    next(error);
  }
}

async function updateRoleHandler(req, res, next) {
  try {
    const role = await updateRole(Number(req.params.id), req.body);
    if (!role) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Role not found" },
      });
    }
    return success(res, role, "Role updated successfully");
  } catch (error) {
    next(error);
  }
}

async function deleteRoleHandler(req, res, next) {
  try {
    await deleteRole(Number(req.params.id));
    return success(res, { success: true }, "Role deleted successfully");
  } catch (error) {
    next(error);
  }
}

async function getRolePermissionsHandler(req, res, next) {
  try {
    const perms = await getRolePermissions(Number(req.params.id));
    return success(res, perms, "Role permissions fetched successfully");
  } catch (error) {
    next(error);
  }
}

async function updateRolePermissionsHandler(req, res, next) {
  try {
    const permissions = req.body.permissions || [];
    const perms = await replaceRolePermissions(Number(req.params.id), permissions);
    return success(res, perms, "Role permissions updated successfully");
  } catch (error) {
    next(error);
  }
}

async function listPermissionsHandler(req, res, next) {
  try {
    const perms = await listPermissions();
    return success(res, perms, "Permissions fetched successfully");
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listRolesHandler,
  getRoleHandler,
  createRoleHandler,
  updateRoleHandler,
  deleteRoleHandler,
  getRolePermissionsHandler,
  updateRolePermissionsHandler,
  listPermissionsHandler,
};
