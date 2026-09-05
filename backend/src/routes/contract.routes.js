const express = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const { loadCompanyContext } = require("../middleware/companyContext.middleware");
const { requirePermission } = require("../middleware/rbac.middleware");
const { validateRequest } = require("../middleware/validate.middleware");
const { idParam } = require("../validators/common.validators");
const { contractSchema, contractUpdateSchema } = require("../validators/contract.validators");
const { getContractById } = require("../repositories/contract.repository");
const {
  listContracts,
  getContract,
  createContractHandler,
  updateContractHandler,
  terminateContractHandler,
} = require("../controllers/contract.controller");

const router = express.Router();

router.use(authenticate, loadCompanyContext);

router.get(
  "/",
  requirePermission("CONTRACTS", "READ"),
  (req, res, next) => {
    if (req.permission && req.permission.scope === "OWN") {
      req.query.employee_id = req.auth.employee_id || -1;
    }
    next();
  },
  listContracts
);
router.get(
  "/:id",
  requirePermission("CONTRACTS", "READ", {
    ownResolver: async (req) => {
      const contract = await getContractById(req.auth.company_id, req.params.id);
      return Boolean(contract && Number(contract.employee_id) === Number(req.auth.employee_id));
    },
  }),
  validateRequest({ params: idParam }),
  getContract
);
router.post("/", requirePermission("CONTRACTS", "CREATE"), validateRequest({ body: contractSchema }), createContractHandler);
router.patch("/:id", requirePermission("CONTRACTS", "UPDATE"), validateRequest({ params: idParam, body: contractUpdateSchema }), updateContractHandler);
router.delete("/:id", requirePermission("CONTRACTS", "DELETE"), validateRequest({ params: idParam }), terminateContractHandler);

module.exports = router;
