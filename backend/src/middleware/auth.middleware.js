const { query } = require("../db");
const { verifyAccessToken } = require("../utils/tokens");
const { AppError } = require("../utils/http");

function getBearerToken(req) {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice(7).trim();
}

async function authenticate(req, res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      throw new AppError(401, "Authentication required", "AUTH_REQUIRED");
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (err) {
      if (err && err.name === "TokenExpiredError") {
        throw new AppError(401, "Token has expired", "TOKEN_EXPIRED");
      }
      throw new AppError(401, "Invalid authentication token", "INVALID_TOKEN");
    }

    const result = await query(
      `
        SELECT u.user_id, u.company_id, u.employee_id, u.role_id, r.role_name, u.status, u.must_change_password,
               s.session_id, s.revoked_at, s.expires_at
        FROM users u
        JOIN roles r ON r.role_id = u.role_id
        LEFT JOIN user_sessions s ON s.session_id = $2 AND s.user_id = u.user_id
        WHERE u.user_id = $1
        LIMIT 1
      `,
      [payload.sub, payload.sid || null]
    );

    const user = result.rows[0];
    if (!user) {
      throw new AppError(401, "Invalid authentication", "INVALID_AUTH");
    }

    // Resolve employee_id for authenticated user (users.id -> employees.user_id -> employees.id)
    const empResult = await query(
      `SELECT employee_id FROM employees WHERE company_id = $1 AND (user_id = $2 OR employee_id = $3 OR LOWER(email) = (SELECT LOWER(email) FROM users WHERE user_id = $2)) ORDER BY (CASE WHEN user_id = $2 THEN 1 WHEN employee_id = $3 THEN 2 ELSE 3 END) ASC LIMIT 1`,
      [user.company_id, user.user_id, user.employee_id || -1]
    );

    let resolvedEmpId = empResult.rows[0]?.employee_id;

    if (!resolvedEmpId) {
      // Auto-provision an employee record for this user if missing
      const uRes = await query(`SELECT username, email FROM users WHERE user_id = $1`, [user.user_id]);
      const uData = uRes.rows[0];
      if (uData) {
        const rawName = uData.username || uData.email.split('@')[0];
        const nameParts = rawName.trim().split(/[\s._-]+/);
        const firstName = nameParts[0] ? nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1) : 'Staff';
        const lastName = nameParts.slice(1).join(' ') ? nameParts.slice(1).join(' ') : 'User';
        const empCode = `EMP-U${user.user_id}`;

        const newEmpRes = await query(
          `INSERT INTO employees (company_id, user_id, employee_code, first_name, last_name, email, status, hire_date)
           VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE', CURRENT_DATE)
           RETURNING employee_id`,
          [user.company_id, user.user_id, empCode, firstName, lastName, uData.email]
        );
        if (newEmpRes.rows[0]) {
          resolvedEmpId = newEmpRes.rows[0].employee_id;
        }
      }
    }

    if (resolvedEmpId) {
      user.employee_id = resolvedEmpId;

      // Synchronize bidirectional link
      await query(
        `UPDATE employees SET user_id = $1, updated_at = NOW() WHERE employee_id = $2 AND (user_id IS NULL OR user_id = $1)`,
        [user.user_id, resolvedEmpId]
      );
      await query(
        `UPDATE users SET employee_id = $1, updated_at = NOW() WHERE user_id = $2 AND (employee_id IS NULL OR employee_id = $1)`,
        [resolvedEmpId, user.user_id]
      );
    }

    if (user.status !== "ACTIVE") {
      throw new AppError(403, "Account unavailable", "ACCOUNT_UNAVAILABLE");
    }

    if (payload.sid) {
      if (!user.session_id || user.revoked_at || new Date(user.expires_at) <= new Date()) {
        throw new AppError(401, "Session expired", "SESSION_EXPIRED");
      }
    }

    req.auth = {
      user_id: user.user_id,
      company_id: user.company_id,
      employee_id: user.employee_id,
      role_id: user.role_id,
      role_name: user.role_name,
      must_change_password: Boolean(user.must_change_password),
      session_id: user.session_id,
      token_payload: payload,
    };
    req.user = req.auth;

    // If user must change password, restrict access to non-auth routes
    if (req.auth.must_change_password) {
      const allowedPaths = [
        "/api/auth/change-password",
        "/api/auth/password",
        "/api/auth/me",
        "/api/auth/logout",
        "/api/auth/logout-all",
      ];
      const currentPath = req.originalUrl.split("?")[0];
      if (!allowedPaths.includes(currentPath)) {
        throw new AppError(
          403,
          "You must change your temporary password before accessing dashboard features",
          "MUST_CHANGE_PASSWORD"
        );
      }
    }

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = { authenticate };
