const { getCompanyById } = require("../repositories/organization.repository");
const { AppError } = require("../utils/http");

async function loadCompanyContext(req, res, next) {
  try {
    if (!req.auth?.company_id) {
      throw new AppError(401, "Authentication required", "AUTH_REQUIRED");
    }

    const company = await getCompanyById(req.auth.company_id);
    if (!company) {
      throw new AppError(404, "Company not found", "COMPANY_NOT_FOUND");
    }

    req.company = company;
    req.companyId = company.company_id;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = { loadCompanyContext };
