const { runFormulaEvaluatorTests } = require("./unit/formula-evaluator.test");
const { runProrationUnitTests } = require("./unit/proration.test");
const { runCompanyIsolationIntegrationTests } = require("./integration/company-isolation.test");
const { runRbacIntegrationTests } = require("./integration/rbac.test");
const { runLeaveConcurrencyIntegrationTests } = require("./integration/leave-concurrency.test");
const { runHistoricalImmutabilityIntegrationTests } = require("./integration/historical-immutability.test");
const { runFullPayrollE2ETests } = require("./e2e/full-payroll-flow.test");

async function executeMasterTestSuite() {
  console.log("=======================================================================");
  console.log("          PEOPLEPAY360 AUTOMATED TEST SUITE EXECUTION");
  console.log("=======================================================================");
  const startTime = Date.now();
  let passedCount = 0;
  let failedCount = 0;
  const suiteResults = [];

  async function executeStep(name, fn) {
    try {
      await fn();
      passedCount += 1;
      suiteResults.push({ name, status: "PASSED" });
    } catch (err) {
      failedCount += 1;
      suiteResults.push({ name, status: "FAILED", error: err.message });
      console.error(`❌ Test Suite '${name}' Failed:`, err);
    }
  }

  await executeStep("Formula Evaluator & Circular Dependencies (Unit)", runFormulaEvaluatorTests);
  await executeStep("Proration & Attendance Deductions (Unit)", runProrationUnitTests);
  await executeStep("Company Isolation & Cross-Tenant Boundaries (Integration)", runCompanyIsolationIntegrationTests);
  await executeStep("Role-Based Access Control & Self-Service Authorization (Integration)", runRbacIntegrationTests);
  await executeStep("Concurrency Protection & Atomic Balance Locking (Integration)", runLeaveConcurrencyIntegrationTests);
  await executeStep("Historical Snapshot Immutability (Integration)", runHistoricalImmutabilityIntegrationTests);
  await executeStep("End-to-End Payroll Engine Lifecycle (E2E)", runFullPayrollE2ETests);

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log("\n=======================================================================");
  console.log("                     TEST EXECUTION SUMMARY");
  console.log("=======================================================================");
  console.log(`Total Test Suites Executed : ${suiteResults.length}`);
  console.log(`Suites Passed              : ${passedCount}`);
  console.log(`Suites Failed              : ${failedCount}`);
  console.log(`Total Duration             : ${durationSec} seconds`);
  console.log("=======================================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  executeMasterTestSuite();
}

module.exports = { executeMasterTestSuite };
