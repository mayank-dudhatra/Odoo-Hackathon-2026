const { query, withTransaction } = require("../db");
const { rbacCache } = require("../utils/cache");

async function getRoleByName(roleName) {
  const cacheKey = `role:name:${roleName}`;
  const cached = rbacCache.get(cacheKey);
  if (cached) return cached;

  const result = await query(
    `SELECT role_id, role_name FROM roles WHERE role_name = $1`,
    [roleName]
  );
  const row = result.rows[0] || null;
  if (row) rbacCache.set(cacheKey, row, 300);
  return row;
}

async function getPermissionScope(roleId, moduleName, actionName) {
  const perms = await getRolePermissions(roleId);
  const match = perms.find((p) => p.module === moduleName && p.action === actionName);
  return match?.scope || null;
}

async function listRoles() {
  const cached = rbacCache.get("roles:all");
  if (cached) return cached;

  const result = await query(
    `SELECT role_id, role_name, description, created_at FROM roles ORDER BY role_name ASC`
  );
  rbacCache.set("roles:all", result.rows, 120);
  return result.rows;
}

async function listPermissions() {
  const cached = rbacCache.get("permissions:all");
  if (cached) return cached;

  const result = await query(
    `SELECT permission_id, module, action FROM permissions ORDER BY module, action`
  );
  rbacCache.set("permissions:all", result.rows, 300);
  return result.rows;
}

async function getRolePermissions(roleId) {
  const cacheKey = `role_perms:${roleId}`;
  const cached = rbacCache.get(cacheKey);
  if (cached) return cached;

  const result = await query(
    `
      SELECT p.permission_id, p.module, p.action, rp.scope
      FROM role_permissions rp
      JOIN permissions p ON p.permission_id = rp.permission_id
      WHERE rp.role_id = $1
      ORDER BY p.module, p.action
    `,
    [roleId]
  );

  rbacCache.set(cacheKey, result.rows, 300);
  return result.rows;
}

async function replaceRolePermissions(roleId, permissions) {
  return withTransaction(async (client) => {
    await client.query(`DELETE FROM role_permissions WHERE role_id = $1`, [roleId]);

    for (const permission of permissions) {
      await client.query(
        `
          INSERT INTO role_permissions (role_id, permission_id, scope)
          VALUES ($1, $2, $3)
        `,
        [roleId, permission.permission_id, permission.scope]
      );
    }

    rbacCache.del(`role_perms:${roleId}`);
    return getRolePermissions(roleId);
  });
}

async function getRoleById(roleId) {
  const result = await query(
    `SELECT role_id, role_name, description, created_at FROM roles WHERE role_id = $1`,
    [roleId]
  );
  return result.rows[0] || null;
}

async function createRole(roleName, description = null) {
  const result = await query(
    `INSERT INTO roles (role_name, description) VALUES ($1, $2) RETURNING role_id, role_name, description, created_at`,
    [roleName, description]
  );
  return result.rows[0];
}

async function updateRole(roleId, fields = {}) {
  const result = await query(
    `UPDATE roles SET role_name = COALESCE($1, role_name), description = COALESCE($2, description) WHERE role_id = $3 RETURNING role_id, role_name, description, created_at`,
    [fields.role_name || null, fields.description !== undefined ? fields.description : null, roleId]
  );
  return result.rows[0] || null;
}

async function deleteRole(roleId) {
  await query(`DELETE FROM roles WHERE role_id = $1`, [roleId]);
  return { success: true };
}

module.exports = {
  getRoleByName,
  getRoleById,
  getPermissionScope,
  listRoles,
  createRole,
  updateRole,
  deleteRole,
  listPermissions,
  getRolePermissions,
  replaceRolePermissions,
};
