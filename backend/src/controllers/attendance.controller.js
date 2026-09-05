const {
  processCheckIn,
  processCheckOut,
  correctAttendanceRecord,
  getEmployeeOwnAttendance,
  getEmployeeOwnAttendanceByDate,
  listCompanyAttendanceRecords,
  getCompanyAttendanceRecord,
} = require("../services/attendance.service");
const { success } = require("../utils/response");

async function checkInHandler(req, res) {
  return success(res, await processCheckIn(req.auth, req.body), "Check-in successful", 201);
}

async function checkOutHandler(req, res) {
  return success(res, await processCheckOut(req.auth, req.body), "Check-out successful");
}

async function getOwnAttendanceHandler(req, res) {
  return success(res, await getEmployeeOwnAttendance(req.auth, req.query), "Own attendance records fetched");
}

async function getOwnAttendanceByDateHandler(req, res) {
  return success(res, await getEmployeeOwnAttendanceByDate(req.auth, req.params.date), "Own attendance record fetched");
}

async function listAttendanceHandler(req, res) {
  return success(res, await listCompanyAttendanceRecords(req.auth, req.query), "Attendance records fetched");
}

async function getAttendanceHandler(req, res) {
  return success(res, await getCompanyAttendanceRecord(req.auth, req.params.id), "Attendance record fetched");
}

async function correctAttendanceHandler(req, res) {
  return success(res, await correctAttendanceRecord(req.auth, req.params.id, req.body), "Attendance record corrected");
}

module.exports = {
  checkInHandler,
  checkOutHandler,
  getOwnAttendanceHandler,
  getOwnAttendanceByDateHandler,
  listAttendanceHandler,
  getAttendanceHandler,
  correctAttendanceHandler,
};
