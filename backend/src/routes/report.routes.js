const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const { requirePermission } = require("../middleware/rbac.middleware");
const {
  getEmployeeReport,
  getPayrollReport,
  getSalaryCostReport,
  getAttendanceReport,
  getLeaveReport,
  getPayslipReport,
  getDepartmentSalaryReport,
  getContractAttentionReport,
} = require("../controllers/report.controller");

const router = express.Router();

router.use(authenticate);

router.get("/employees", requirePermission("REPORTS", "READ"), getEmployeeReport);
router.get("/payroll", requirePermission("REPORTS", "READ"), getPayrollReport);
router.get("/salary", requirePermission("REPORTS", "READ"), getSalaryCostReport);
router.get("/attendance", requirePermission("REPORTS", "READ"), getAttendanceReport);
router.get("/time-off", requirePermission("REPORTS", "READ"), getLeaveReport);
router.get("/payslips", requirePermission("REPORTS", "READ"), getPayslipReport);
router.get("/departments", requirePermission("REPORTS", "READ"), getDepartmentSalaryReport);
router.get("/contract-attention", requirePermission("REPORTS", "READ"), getContractAttentionReport);

module.exports = router;
