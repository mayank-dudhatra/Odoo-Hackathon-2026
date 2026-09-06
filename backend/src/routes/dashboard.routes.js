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

const { cacheResponse } = require("../middleware/cache.middleware");

router.get("/overall", requirePermission("DASHBOARD", "READ"), cacheResponse(20, "dashboard"), getOverallDashboard);
router.get("/payroll", requirePermission("DASHBOARD", "READ"), cacheResponse(20, "dashboard"), getPayrollDashboard);
router.get("/hr", requirePermission("DASHBOARD", "READ"), cacheResponse(20, "dashboard"), getHrDashboard);
router.get("/attendance", requirePermission("DASHBOARD", "READ"), cacheResponse(20, "dashboard"), getAttendanceDashboard);
router.get("/time-off", requirePermission("DASHBOARD", "READ"), cacheResponse(20, "dashboard"), getTimeOffDashboard);
router.get("/warnings", requirePermission("DASHBOARD", "READ"), cacheResponse(20, "dashboard"), getWarningsDashboard);

module.exports = router;
