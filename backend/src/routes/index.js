const express = require("express");
const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const organizationRoutes = require("./organization.routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/org", organizationRoutes);

module.exports = router;
