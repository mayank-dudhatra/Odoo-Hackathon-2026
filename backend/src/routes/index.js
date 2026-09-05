const express = require("express");
const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const organizationRoutes = require("./organization.routes");
const scheduleRoutes = require("./schedule.routes");
const contractRoutes = require("./contract.routes");
const employeeResolverRoutes = require("./employee-resolver.routes");
const attendancePolicyRoutes = require("./attendance-policy.routes");
const attendanceRoutes = require("./attendance.routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/org", organizationRoutes);
router.use("/working-schedules", scheduleRoutes);
router.use("/contracts", contractRoutes);
router.use("/employees", employeeResolverRoutes);
router.use("/attendance-policies", attendancePolicyRoutes);
router.use("/attendance", attendanceRoutes);

module.exports = router;

