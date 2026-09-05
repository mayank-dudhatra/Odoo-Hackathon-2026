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
} = require("../controllers/organization.controller");

const router = express.Router();

router.use(authenticate, loadCompanyContext);

router.get("/company/me", requirePermission("COMPANY", "READ"), currentCompany);
router.put("/company/me", requirePermission("COMPANY", "UPDATE"), validateRequest({ body: companyUpdateSchema }), updateCompanyDetails);

router.get("/departments", requirePermission("DEPARTMENTS", "READ"), listDepartments);
router.get("/departments/:id", requirePermission("DEPARTMENTS", "READ"), validateRequest({ params: idParam }), getDepartment);
router.post("/departments", requirePermission("DEPARTMENTS", "CREATE"), validateRequest({ body: departmentSchema }), createDepartment);
router.patch("/departments/:id", requirePermission("DEPARTMENTS", "UPDATE"), validateRequest({ params: idParam, body: departmentSchema.partial() }), updateDepartment);
router.patch("/departments/:id/deactivate", requirePermission("DEPARTMENTS", "DELETE"), validateRequest({ params: idParam }), deactivateDepartment);

router.get("/positions", requirePermission("POSITIONS", "READ"), listPositions);
router.get("/positions/:id", requirePermission("POSITIONS", "READ"), validateRequest({ params: idParam }), getPosition);
router.post("/positions", requirePermission("POSITIONS", "CREATE"), validateRequest({ body: positionSchema }), createPosition);
router.patch("/positions/:id", requirePermission("POSITIONS", "UPDATE"), validateRequest({ params: idParam, body: positionSchema.partial() }), updatePosition);
router.patch("/positions/:id/deactivate", requirePermission("POSITIONS", "DELETE"), validateRequest({ params: idParam }), deactivatePosition);

router.get("/employee-types", requirePermission("EMPLOYEE_TYPES", "READ"), listEmployeeTypes);
router.get("/employee-types/:id", requirePermission("EMPLOYEE_TYPES", "READ"), validateRequest({ params: idParam }), getEmployeeType);
router.post("/employee-types", requirePermission("EMPLOYEE_TYPES", "CREATE"), validateRequest({ body: employeeTypeSchema }), createEmployeeType);
router.patch("/employee-types/:id", requirePermission("EMPLOYEE_TYPES", "UPDATE"), validateRequest({ params: idParam, body: employeeTypeSchema.partial() }), updateEmployeeType);
router.patch("/employee-types/:id/status", requirePermission("EMPLOYEE_TYPES", "DELETE"), validateRequest({ params: idParam, body: employeeTypeSchema.pick({ is_active: true }) }), setEmployeeTypeStatus);

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
  listEmployees
);
router.get("/employees/me", requirePermission("EMPLOYEES", "READ", { ownResolver: () => true }), myEmployee);
router.get("/employees/:id", requirePermission("EMPLOYEES", "READ", { ownResolver: (req) => Number(req.params.id) === Number(req.auth.employee_id) }), validateRequest({ params: idParam }), getEmployee);
router.post("/employees", requirePermission("EMPLOYEES", "CREATE"), validateRequest({ body: employeeSchema }), createEmployee);
router.patch("/employees/:id", requirePermission("EMPLOYEES", "UPDATE"), validateRequest({ params: idParam, body: employeeSchema.partial() }), updateEmployee);
router.patch("/employees/:id/status", requirePermission("EMPLOYEES", "UPDATE_STATUS"), validateRequest({ params: idParam, body: employeeStatusSchema }), changeEmployeeStatus);

module.exports = router;
