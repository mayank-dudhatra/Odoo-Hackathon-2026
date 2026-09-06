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

const { cacheResponse, invalidateCache } = require("../middleware/cache.middleware");

router.get("/", cacheResponse(120, "attendance-policies"), listAttendancePoliciesHandler);
router.get("/:id", validateRequest({ params: idParam }), getAttendancePolicyHandler);
router.post("/", requirePermission("ATTENDANCE_POLICIES", "CREATE"), invalidateCache(["attendance-policies", "dashboard"]), validateRequest({ body: attendancePolicySchema }), createAttendancePolicyHandler);
router.patch("/:id", requirePermission("ATTENDANCE_POLICIES", "UPDATE"), invalidateCache(["attendance-policies", "dashboard"]), validateRequest({ params: idParam, body: attendancePolicyUpdateSchema }), updateAttendancePolicyHandler);
router.delete("/:id", requirePermission("ATTENDANCE_POLICIES", "DELETE"), invalidateCache(["attendance-policies", "dashboard"]), validateRequest({ params: idParam }), deactivateAttendancePolicyHandler);

module.exports = router;
