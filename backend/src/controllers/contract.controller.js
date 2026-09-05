const {
  listCompanyContracts,
  getCompanyContract,
  createCompanyContract,
  updateCompanyContract,
  terminateCompanyContract,
  resolveContract,
  resolveSchedule,
} = require("../services/contract.service");
const { success } = require("../utils/response");

async function listContracts(req, res) {
  return success(res, await listCompanyContracts(req.auth, req.query), "Contracts fetched");
}

async function getContract(req, res) {
  return success(res, await getCompanyContract(req.auth, req.params.id), "Contract fetched");
}

async function createContractHandler(req, res) {
  return success(res, await createCompanyContract(req.auth, req.body), "Contract created", 201);
}

async function updateContractHandler(req, res) {
  return success(res, await updateCompanyContract(req.auth, req.params.id, req.body), "Contract updated");
}

async function terminateContractHandler(req, res) {
  return success(res, await terminateCompanyContract(req.auth, req.params.id), "Contract terminated");
}

async function effectiveContractHandler(req, res) {
  return success(res, await resolveContract(req.auth, req.params.employeeId, req.query.date), "Effective contract fetched");
}

async function effectiveScheduleHandler(req, res) {
  return success(res, await resolveSchedule(req.auth, req.params.employeeId, req.query.date), "Effective schedule fetched");
}

module.exports = {
  listContracts,
  getContract,
  createContractHandler,
  updateContractHandler,
  terminateContractHandler,
  effectiveContractHandler,
  effectiveScheduleHandler,
};
