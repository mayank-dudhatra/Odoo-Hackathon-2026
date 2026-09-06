const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const { requirePermission, requireAdmin } = require("../middleware/rbac.middleware");
const { loadCompanyContext } = require("../middleware/companyContext.middleware");
const { validateRequest } = require("../middleware/validate.middleware");
const { idParam } = require("../validators/common.validators");
const {
  companyUpdateSchema,
  departmentSchema,
  positionSchema,
  employeeTypeSchema,
  employeeSchema,
  employeeStatusSchema,
  employeeQuerySchema,
} = require("../validators/organization.validators");
const {
  currentCompany,
  updateCompanyDetails,
  listDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deactivateDepartment,
  listPositions,
  getPosition,
  createPosition,
  updatePosition,
  deactivatePosition,
  listEmployeeTypes,
  getEmployeeType,
  createEmployeeType,
  updateEmployeeType,
  setEmployeeTypeStatus,
  listEmployees,
  getEmployee,
  myEmployee,
  createEmployee,
  updateEmployee,
  changeEmployeeStatus,
  deleteEmployee,
} = require("../controllers/organization.controller");

const router = express.Router();

router.use(authenticate, loadCompanyContext);

router.get("/company/me", requirePermission("COMPANY", "READ"), currentCompany);
router.put("/company/me", requirePermission("COMPANY", "UPDATE"), validateRequest({ body: companyUpdateSchema }), updateCompanyDetails);

const { cacheResponse, invalidateCache } = require("../middleware/cache.middleware");

router.get("/departments", requirePermission("DEPARTMENTS", "READ"), cacheResponse(120, "departments"), listDepartments);
router.get("/departments/:id", requirePermission("DEPARTMENTS", "READ"), validateRequest({ params: idParam }), getDepartment);
router.post("/departments", requirePermission("DEPARTMENTS", "CREATE"), invalidateCache(["departments", "dashboard"]), validateRequest({ body: departmentSchema }), createDepartment);
router.patch("/departments/:id", requirePermission("DEPARTMENTS", "UPDATE"), invalidateCache(["departments", "dashboard"]), validateRequest({ params: idParam, body: departmentSchema.partial() }), updateDepartment);
router.delete("/departments/:id", requirePermission("DEPARTMENTS", "DELETE"), invalidateCache(["departments", "dashboard"]), validateRequest({ params: idParam }), deactivateDepartment);
router.patch("/departments/:id/deactivate", requirePermission("DEPARTMENTS", "DELETE"), invalidateCache(["departments", "dashboard"]), validateRequest({ params: idParam }), deactivateDepartment);

router.get("/positions", requirePermission("POSITIONS", "READ"), cacheResponse(120, "positions"), listPositions);
router.get("/positions/:id", requirePermission("POSITIONS", "READ"), validateRequest({ params: idParam }), getPosition);
router.post("/positions", requirePermission("POSITIONS", "CREATE"), invalidateCache(["positions", "dashboard"]), validateRequest({ body: positionSchema }), createPosition);
router.patch("/positions/:id", requirePermission("POSITIONS", "UPDATE"), invalidateCache(["positions", "dashboard"]), validateRequest({ params: idParam, body: positionSchema.partial() }), updatePosition);
router.delete("/positions/:id", requirePermission("POSITIONS", "DELETE"), invalidateCache(["positions", "dashboard"]), validateRequest({ params: idParam }), deactivatePosition);
router.patch("/positions/:id/deactivate", requirePermission("POSITIONS", "DELETE"), invalidateCache(["positions", "dashboard"]), validateRequest({ params: idParam }), deactivatePosition);

router.get("/employee-types", requirePermission("EMPLOYEE_TYPES", "READ"), cacheResponse(120, "employee-types"), listEmployeeTypes);
router.get("/employee-types/:id", requirePermission("EMPLOYEE_TYPES", "READ"), validateRequest({ params: idParam }), getEmployeeType);
router.post("/employee-types", requirePermission("EMPLOYEE_TYPES", "CREATE"), invalidateCache(["employee-types", "dashboard"]), validateRequest({ body: employeeTypeSchema }), createEmployeeType);
router.patch("/employee-types/:id", requirePermission("EMPLOYEE_TYPES", "UPDATE"), invalidateCache(["employee-types", "dashboard"]), validateRequest({ params: idParam, body: employeeTypeSchema.partial() }), updateEmployeeType);
router.delete("/employee-types/:id", requirePermission("EMPLOYEE_TYPES", "DELETE"), invalidateCache(["employee-types", "dashboard"]), validateRequest({ params: idParam }), (req, res, next) => {
  req.body = { is_active: false };
  return setEmployeeTypeStatus(req, res, next);
});
router.patch("/employee-types/:id/status", requirePermission("EMPLOYEE_TYPES", "DELETE"), invalidateCache(["employee-types", "dashboard"]), validateRequest({ params: idParam, body: employeeTypeSchema.pick({ is_active: true }) }), setEmployeeTypeStatus);

router.get(
  "/employees",
  requirePermission("EMPLOYEES", "READ"),
  (req, res, next) => {
    if (req.permission && req.permission.scope === "OWN") {
      req.query.employee_id = req.auth.employee_id || -1;
    }
    next();
  },
  validateRequest({ query: employeeQuerySchema }),
  cacheResponse(30, "employees"),
  listEmployees
);
router.get("/employees/me", requirePermission("EMPLOYEES", "READ", { ownResolver: () => true }), myEmployee);
router.get("/employees/:id", requirePermission("EMPLOYEES", "READ", { ownResolver: (req) => Number(req.params.id) === Number(req.auth.employee_id) }), validateRequest({ params: idParam }), getEmployee);
router.post("/employees", requirePermission("EMPLOYEES", "CREATE"), invalidateCache(["employees", "dashboard"]), validateRequest({ body: employeeSchema }), createEmployee);
router.patch(
  "/employees/:id",
  requirePermission("EMPLOYEES", "UPDATE"),
  invalidateCache(["employees", "dashboard"]),
  (req, res, next) => {
    if (req.auth?.role_name === "Employee") {
      throw new AppError(403, "Employees are not allowed to update employee details", "FORBIDDEN");
    }
    next();
  },
  validateRequest({ params: idParam, body: employeeSchema.partial() }),
  updateEmployee
);
router.patch(
  "/employees/:id/status",
  requirePermission("EMPLOYEES", "UPDATE_STATUS"),
  invalidateCache(["employees", "dashboard"]),
  (req, res, next) => {
    if (req.auth?.role_name === "Employee") {
      throw new AppError(403, "Employees are not allowed to change employment status", "FORBIDDEN");
    }
    next();
  },
  validateRequest({ params: idParam, body: employeeStatusSchema }),
  changeEmployeeStatus
);
router.delete("/employees/:id", requirePermission("EMPLOYEES", "DELETE"), invalidateCache(["employees", "dashboard"]), deleteEmployee);

module.exports = router;
