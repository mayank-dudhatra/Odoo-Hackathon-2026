const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const { loadCompanyContext } = require("../middleware/companyContext.middleware");
const { requirePermission } = require("../middleware/rbac.middleware");
const { validateRequest } = require("../middleware/validate.middleware");
const { idParam } = require("../validators/common.validators");
const { contractSchema, contractUpdateSchema } = require("../validators/contract.validators");
const {
  listContracts,
  getContract,
  createContractHandler,
  updateContractHandler,
  terminateContractHandler,
} = require("../controllers/contract.controller");

const router = express.Router();

router.use(authenticate, loadCompanyContext);

router.get("/", requirePermission("CONTRACTS", "READ"), listContracts);
router.get("/:id", requirePermission("CONTRACTS", "READ"), validateRequest({ params: idParam }), getContract);
router.post("/", requirePermission("CONTRACTS", "CREATE"), validateRequest({ body: contractSchema }), createContractHandler);
router.patch("/:id", requirePermission("CONTRACTS", "UPDATE"), validateRequest({ params: idParam, body: contractUpdateSchema }), updateContractHandler);
router.delete("/:id", requirePermission("CONTRACTS", "DELETE"), validateRequest({ params: idParam }), terminateContractHandler);

module.exports = router;
