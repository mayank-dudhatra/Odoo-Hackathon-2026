const express = require("express");
const { z } = require("zod");
const { authenticate } = require("../middleware/auth.middleware");
const { loadCompanyContext } = require("../middleware/companyContext.middleware");
const { requirePermission } = require("../middleware/rbac.middleware");
const { validateRequest } = require("../middleware/validate.middleware");
const { idParam } = require("../validators/common.validators");
const {
  checkInSchema,
  checkOutSchema,
  attendanceCorrectionSchema,
  attendanceQuerySchema,
} = require("../validators/attendance.validators");
const {
  checkInHandler,
  checkOutHandler,
  getOwnAttendanceHandler,
  getOwnAttendanceByDateHandler,
  listAttendanceHandler,
  getAttendanceHandler,
  correctAttendanceHandler,
} = require("../controllers/attendance.controller");

const router = express.Router();

router.use(authenticate, loadCompanyContext);

// Employee Self-Attendance Routes
router.post(
  "/check-in",
  requirePermission("ATTENDANCE", "CREATE", { ownResolver: () => true }),
  validateRequest({ body: checkInSchema }),
  checkInHandler
);

router.post(
  "/check-out",
  requirePermission("ATTENDANCE", "CREATE", { ownResolver: () => true }),
  validateRequest({ body: checkOutSchema }),
  checkOutHandler
);

router.get(
  "/me",
  requirePermission("ATTENDANCE", "READ", { ownResolver: () => true }),
  validateRequest({ query: attendanceQuerySchema }),
  getOwnAttendanceHandler
);

router.get(
  "/me/:date",
  requirePermission("ATTENDANCE", "READ", { ownResolver: () => true }),
  validateRequest({ params: z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }) }),
  getOwnAttendanceByDateHandler
);

// HR Attendance Management Routes
router.get(
  "/",
  requirePermission("ATTENDANCE", "READ"),
  validateRequest({ query: attendanceQuerySchema }),
  listAttendanceHandler
);

router.get(
  "/:id",
  requirePermission("ATTENDANCE", "READ"),
  validateRequest({ params: idParam }),
  getAttendanceHandler
);

router.patch(
  "/:id",
  requirePermission("ATTENDANCE", "UPDATE"),
  validateRequest({ params: idParam, body: attendanceCorrectionSchema }),
  correctAttendanceHandler
);

module.exports = router;
