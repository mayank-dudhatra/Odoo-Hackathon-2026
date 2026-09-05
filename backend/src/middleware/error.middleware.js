const { AppError } = require("../utils/http");

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: "Resource not found",
    },
  });
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  if (error && error.code && typeof error.code === "string") {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        error: {
          code: "DUPLICATE_RECORD",
          message: "A record with the same unique value already exists",
        },
      });
    }

    if (error.code === "23503") {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_REFERENCE",
          message: "One or more references are invalid",
        },
      });
    }

    if (error.code === "23514" || error.code === "23P01" || error.code === "P0001") {
      return res.status(400).json({
        success: false,
        error: {
          code: "CONSTRAINT_VIOLATION",
          message: error.message,
        },
      });
    }
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details || undefined,
      },
    });
  }

  console.error(error);
  return res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong",
    },
  });
}

module.exports = { notFoundHandler, errorHandler };
