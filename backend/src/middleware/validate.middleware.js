const { AppError } = require("../utils/http");

function validateRequest({ body, params, query } = {}) {
  return (req, res, next) => {
    try {
      if (body) {
        req.body = body.parse(req.body);
      }
      if (params) {
        req.params = params.parse(req.params);
      }
      if (query) {
        req.query = query.parse(req.query);
      }
      next();
    } catch (error) {
      if (error.name === "ZodError") {
        return next(new AppError(400, "Validation failed", "VALIDATION_ERROR", error.flatten()));
      }
      return next(error);
    }
  };
}

module.exports = { validateRequest };
