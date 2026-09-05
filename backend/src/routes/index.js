const express = require("express");
const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const organizationRoutes = require("./organization.routes");
const scheduleRoutes = require("./schedule.routes");
const contractRoutes = require("./contract.routes");
const employeeResolverRoutes = require("./employee-resolver.routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/org", organizationRoutes);
router.use("/working-schedules", scheduleRoutes);
router.use("/contracts", contractRoutes);
router.use("/employees", employeeResolverRoutes);

module.exports = router;
