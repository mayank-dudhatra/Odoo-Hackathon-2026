const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const { requirePermission } = require("../middleware/rbac.middleware");
const {
  getOverallDashboard,
  getPayrollDashboard,
  getHrDashboard,
  getAttendanceDashboard,
  getTimeOffDashboard,
  getWarningsDashboard,
} = require("../controllers/dashboard.controller");

const router = express.Router();

router.use(authenticate);

router.get("/overall", requirePermission("DASHBOARD", "READ"), getOverallDashboard);
router.get("/payroll", requirePermission("DASHBOARD", "READ"), getPayrollDashboard);
router.get("/hr", requirePermission("DASHBOARD", "READ"), getHrDashboard);
router.get("/attendance", requirePermission("DASHBOARD", "READ"), getAttendanceDashboard);
router.get("/time-off", requirePermission("DASHBOARD", "READ"), getTimeOffDashboard);
router.get("/warnings", requirePermission("DASHBOARD", "READ"), getWarningsDashboard);

module.exports = router;
