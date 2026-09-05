const express = require("express");
const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const organizationRoutes = require("./organization.routes");
const scheduleRoutes = require("./schedule.routes");
const contractRoutes = require("./contract.routes");
const employeeResolverRoutes = require("./employee-resolver.routes");
const attendancePolicyRoutes = require("./attendance-policy.routes");
const attendanceRoutes = require("./attendance.routes");
const leaveRoutes = require("./leave.routes");
const salaryRoutes = require("./salary.routes");
const payrunRoutes = require("./payrun.routes");
const payslipRoutes = require("./payslip.routes");
const dashboardRoutes = require("./dashboard.routes");
const reportRoutes = require("./report.routes");
const roleRoutes = require("./role.routes");
const permissionRoutes = require("./permission.routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/roles", roleRoutes);
router.use("/permissions", permissionRoutes);
router.use("/org", organizationRoutes);
router.use("/working-schedules", scheduleRoutes);
router.use("/contracts", contractRoutes);
router.use("/employees", employeeResolverRoutes);
router.use("/attendance-policies", attendancePolicyRoutes);
router.use("/attendance", attendanceRoutes);
router.use("/", leaveRoutes);
router.use("/", salaryRoutes);
router.use("/", payrunRoutes);
router.use("/", payslipRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/reports", reportRoutes);

module.exports = router;

