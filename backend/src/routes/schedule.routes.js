const express = require("express");
const { z } = require("zod");
const { authenticate } = require("../middleware/auth.middleware");
const { loadCompanyContext } = require("../middleware/companyContext.middleware");
const { requirePermission } = require("../middleware/rbac.middleware");
const { validateRequest } = require("../middleware/validate.middleware");
const { idParam } = require("../validators/common.validators");
const { scheduleSchema, scheduleUpdateSchema, assignScheduleSchema } = require("../validators/schedule.validators");
const {
  listWorkingSchedules,
  getWorkingSchedule,
  createWorkingScheduleHandler,
  updateWorkingScheduleHandler,
  deactivateWorkingScheduleHandler,
  assignEmployeeScheduleHandler,
} = require("../controllers/schedule.controller");

const router = express.Router();

router.use(authenticate, loadCompanyContext);

const { cacheResponse, invalidateCache } = require("../middleware/cache.middleware");

router.get("/", requirePermission("WORKING_SCHEDULES", "READ"), cacheResponse(120, "schedules"), listWorkingSchedules);
router.get("/:id", requirePermission("WORKING_SCHEDULES", "READ"), validateRequest({ params: idParam }), getWorkingSchedule);
router.post("/", requirePermission("WORKING_SCHEDULES", "CREATE"), invalidateCache(["schedules", "dashboard"]), validateRequest({ body: scheduleSchema }), createWorkingScheduleHandler);
router.patch("/:id", requirePermission("WORKING_SCHEDULES", "UPDATE"), invalidateCache(["schedules", "dashboard"]), validateRequest({ params: idParam, body: scheduleUpdateSchema }), updateWorkingScheduleHandler);
router.delete("/:id", requirePermission("WORKING_SCHEDULES", "DELETE"), invalidateCache(["schedules", "dashboard"]), validateRequest({ params: idParam }), deactivateWorkingScheduleHandler);

router.patch(
  "/employees/:employeeId/assign",
  requirePermission("WORKING_SCHEDULES", "UPDATE"),
  validateRequest({ params: z.object({ employeeId: z.coerce.number().int().positive() }), body: assignScheduleSchema }),
  assignEmployeeScheduleHandler
);
router.post(
  "/:id/assign",
  requirePermission("WORKING_SCHEDULES", "UPDATE"),
  validateRequest({ params: idParam, body: assignScheduleSchema }),
  assignEmployeeScheduleHandler
);
router.patch(
  "/:id/assign",
  requirePermission("WORKING_SCHEDULES", "UPDATE"),
  validateRequest({ params: idParam, body: assignScheduleSchema }),
  assignEmployeeScheduleHandler
);

module.exports = router;

