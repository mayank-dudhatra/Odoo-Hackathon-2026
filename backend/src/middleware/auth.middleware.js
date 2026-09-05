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

    const payload = verifyAccessToken(token);

    const result = await query(
      `
        SELECT u.user_id, u.company_id, u.employee_id, u.role_id, r.role_name, u.status,
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
      session_id: user.session_id,
      token_payload: payload,
    };

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = { authenticate };
