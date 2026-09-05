const { query, withTransaction } = require("../db");

async function getRoleByName(roleName) {
  const result = await query(
    `SELECT role_id, role_name FROM roles WHERE role_name = $1`,
    [roleName]
  );
  return result.rows[0] || null;
}

async function getPermissionScope(roleId, moduleName, actionName) {
  const result = await query(
    `
      SELECT rp.scope
      FROM role_permissions rp
      JOIN permissions p ON p.permission_id = rp.permission_id
      WHERE rp.role_id = $1
        AND p.module = $2
        AND p.action = $3
      LIMIT 1
    `,
    [roleId, moduleName, actionName]
  );

  return result.rows[0]?.scope || null;
}

async function listRoles() {
  const result = await query(
    `SELECT role_id, role_name, description, created_at FROM roles ORDER BY role_name ASC`
  );
  return result.rows;
}

async function listPermissions() {
  const result = await query(
    `SELECT permission_id, module, action FROM permissions ORDER BY module, action`
  );
  return result.rows;
}

async function getRolePermissions(roleId) {
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

    return getRolePermissions(roleId);
  });
}

module.exports = {
  getRoleByName,
  getPermissionScope,
  listRoles,
  listPermissions,
  getRolePermissions,
  replaceRolePermissions,
};
