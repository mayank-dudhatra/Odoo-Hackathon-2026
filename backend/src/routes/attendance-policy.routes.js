const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const { loadCompanyContext } = require("../middleware/companyContext.middleware");
const { requirePermission } = require("../middleware/rbac.middleware");
const { validateRequest } = require("../middleware/validate.middleware");
const { idParam } = require("../validators/common.validators");
const { attendancePolicySchema, attendancePolicyUpdateSchema } = require("../validators/attendance-policy.validators");
const {
  listAttendancePoliciesHandler,
  getAttendancePolicyHandler,
  createAttendancePolicyHandler,
  updateAttendancePolicyHandler,
  deactivateAttendancePolicyHandler,
} = require("../controllers/attendance-policy.controller");

const router = express.Router();

router.use(authenticate, loadCompanyContext);

router.get("/", requirePermission("ATTENDANCE_POLICIES", "READ"), listAttendancePoliciesHandler);
router.get("/:id", requirePermission("ATTENDANCE_POLICIES", "READ"), validateRequest({ params: idParam }), getAttendancePolicyHandler);
router.post("/", requirePermission("ATTENDANCE_POLICIES", "CREATE"), validateRequest({ body: attendancePolicySchema }), createAttendancePolicyHandler);
router.patch("/:id", requirePermission("ATTENDANCE_POLICIES", "UPDATE"), validateRequest({ params: idParam, body: attendancePolicyUpdateSchema }), updateAttendancePolicyHandler);
router.delete("/:id", requirePermission("ATTENDANCE_POLICIES", "DELETE"), validateRequest({ params: idParam }), deactivateAttendancePolicyHandler);

module.exports = router;
