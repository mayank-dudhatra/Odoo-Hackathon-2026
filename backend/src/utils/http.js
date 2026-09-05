class AppError extends Error {
  constructor(statusCode, message, code = "APP_ERROR", details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

function asyncHandler(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  const {
    password_hash,
    invitation_token_hash,
    refresh_token_hash,
    ...safe
  } = user;

  return safe;
}

module.exports = { AppError, asyncHandler, sanitizeUser };
