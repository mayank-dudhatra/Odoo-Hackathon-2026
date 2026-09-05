const {
  listSchedules,
  getSchedule,
  createSchedule,
  updateSchedule,
  deactivateSchedule,
  assignScheduleToEmployee,
} = require("../services/schedule.service");
const { success } = require("../utils/response");

async function listWorkingSchedules(req, res) {
  return success(res, await listSchedules(req.auth), "Working schedules fetched");
}

async function getWorkingSchedule(req, res) {
  return success(res, await getSchedule(req.auth, req.params.id), "Working schedule fetched");
}

async function createWorkingScheduleHandler(req, res) {
  return success(res, await createSchedule(req.auth, req.body), "Working schedule created", 201);
}

async function updateWorkingScheduleHandler(req, res) {
  return success(res, await updateSchedule(req.auth, req.params.id, req.body), "Working schedule updated");
}

async function deactivateWorkingScheduleHandler(req, res) {
  return success(res, await deactivateSchedule(req.auth, req.params.id), "Working schedule deactivated");
}

async function assignEmployeeScheduleHandler(req, res) {
  const employeeId = req.params.employeeId || req.body.employee_id;
  const scheduleId = req.params.id || req.body.schedule_id;
  return success(res, await assignScheduleToEmployee(req.auth, employeeId, scheduleId), "Employee schedule assigned");
}

module.exports = {
  listWorkingSchedules,
  getWorkingSchedule,
  createWorkingScheduleHandler,
  updateWorkingScheduleHandler,
  deactivateWorkingScheduleHandler,
  assignEmployeeScheduleHandler,
};

