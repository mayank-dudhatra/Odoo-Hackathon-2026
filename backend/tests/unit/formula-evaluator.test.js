const assert = require("assert");
const { evaluateFormula, detectCircularDependencies } = require("../../src/utils/formula-evaluator");

function runFormulaEvaluatorTests() {
  console.log("\n--- Testing Formula Evaluator (Unit) ---");

  // 1. Basic Arithmetic
  const res1 = evaluateFormula("1000 + 500 * 2", {});
  assert.strictEqual(res1, 2000, "Basic arithmetic evaluation failed");

  // 2. Variable Substitution
  const context = { BASIC: 30000, HRA: 5000, DAYS: 30 };
  const res2 = evaluateFormula("BASIC * 0.4 + HRA", context);
  assert.strictEqual(res2, 17000, "Variable substitution evaluation failed");

  // 3. Formula with Parentheses
  const res3 = evaluateFormula("(BASIC + HRA) / 30 * DAYS", context);
  assert.strictEqual(res3, 35000, "Parentheses evaluation failed");

  // 4. Undefined variable defaults to 0 safely
  const res4 = evaluateFormula("BASIC + UNKNOWN_VAR", context);
  assert.strictEqual(res4, 30000, "Undefined variable handling failed");

  // 5. Circular Dependency Detection
  const rules = [
    { code: "BASIC", computation_type: "FIXED", formula: "" },
    { code: "HRA", computation_type: "FORMULA", formula: "GROSS * 0.2" },
    { code: "GROSS", computation_type: "FORMULA", formula: "BASIC + HRA" },
  ];

  let hasCycle = false;
  try {
    detectCircularDependencies(rules);
  } catch (err) {
    if (err.code === "CIRCULAR_RULE_DEPENDENCY") {
      hasCycle = true;
    }
  }
  assert.strictEqual(hasCycle, true, "Circular dependency detection failed to identify cycle");

  const linearRules = [
    { code: "BASIC", computation_type: "FIXED", formula: "" },
    { code: "HRA", computation_type: "FORMULA", formula: "BASIC * 0.2" },
    { code: "GROSS", computation_type: "FORMULA", formula: "BASIC + HRA" },
  ];
  let hasNoCycle = true;
  try {
    detectCircularDependencies(linearRules);
  } catch (err) {
    hasNoCycle = false;
  }
  assert.strictEqual(hasNoCycle, true, "Linear rules incorrectly flagged as circular");

  console.log("✔ Formula Evaluator tests passed (5/5)");
}

if (require.main === module) {
  runFormulaEvaluatorTests();
}

module.exports = { runFormulaEvaluatorTests };
