const { AppError } = require("./http");

/**
 * Tokenizes a math formula string safely into numbers, operators, parentheses, and variable identifiers.
 */
function tokenize(expression) {
  if (!expression || typeof expression !== "string") {
    return [];
  }

  const tokens = [];
  let i = 0;

  while (i < expression.length) {
    const char = expression[i];

    // Skip whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // Operators and Parentheses
    if (["+", "-", "*", "/", "(", ")"].includes(char)) {
      tokens.push({ type: "OPERATOR", value: char });
      i++;
      continue;
    }

    // Numbers (integers or decimals)
    if (/[0-9.]/.test(char)) {
      let numStr = "";
      while (i < expression.length && /[0-9.]/.test(expression[i])) {
        numStr += expression[i];
        i++;
      }
      const parsed = parseFloat(numStr);
      if (isNaN(parsed)) {
        throw new AppError(400, `Invalid number format '${numStr}' in formula`, "INVALID_FORMULA");
      }
      tokens.push({ type: "NUMBER", value: parsed });
      continue;
    }

    // Identifiers / Variable Rule Codes (e.g. BASIC, HRA, CONTRACT_WAGE)
    if (/[A-Za-z_]/.test(char)) {
      let ident = "";
      while (i < expression.length && /[A-Za-z0-9_]/.test(expression[i])) {
        ident += expression[i];
        i++;
      }
      tokens.push({ type: "IDENTIFIER", value: ident.toUpperCase() });
      continue;
    }

    // If any illegal character encountered
    throw new AppError(400, `Invalid character '${char}' in formula '${expression}'`, "INVALID_FORMULA");
  }

  return tokens;
}

/**
 * Extracts unique rule code variable dependencies referenced in a formula.
 */
function extractFormulaDependencies(formulaStr) {
  if (!formulaStr) return [];
  const tokens = tokenize(formulaStr);
  const deps = new Set();

  for (const token of tokens) {
    if (token.type === "IDENTIFIER") {
      deps.add(token.value);
    }
  }

  return Array.from(deps);
}

/**
 * Evaluates an arithmetic expression using Shunting-Yard (Reverse Polish Notation).
 */
function evaluateFormula(formulaStr, contextMap = {}) {
  const tokens = tokenize(formulaStr);
  if (tokens.length === 0) return 0;

  const outputQueue = [];
  const operatorStack = [];

  const precedence = {
    "+": 1,
    "-": 1,
    "*": 2,
    "/": 2,
  };

  // Convert map keys to uppercase for case-insensitive lookup
  const upperContext = {};
  for (const [k, v] of Object.entries(contextMap)) {
    upperContext[k.toUpperCase()] = Number(v) || 0;
  }

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === "NUMBER") {
      outputQueue.push(token.value);
    } else if (token.type === "IDENTIFIER") {
      const val = upperContext[token.value] !== undefined ? upperContext[token.value] : 0;
      outputQueue.push(val);
    } else if (token.type === "OPERATOR") {
      const op = token.value;

      if (op === "(") {
        operatorStack.push(op);
      } else if (op === ")") {
        while (operatorStack.length > 0 && operatorStack[operatorStack.length - 1] !== "(") {
          outputQueue.push(operatorStack.pop());
        }
        if (operatorStack.length === 0) {
          throw new AppError(400, `Mismatched parentheses in formula '${formulaStr}'`, "INVALID_FORMULA");
        }
        operatorStack.pop(); // Pop '('
      } else {
        // Handle unary minus: if '-' appears at start or after an operator or '('
        const prevToken = i > 0 ? tokens[i - 1] : null;
        if (op === "-" && (!prevToken || (prevToken.type === "OPERATOR" && prevToken.value !== ")"))) {
          // Unary minus: push a 0 before minus
          outputQueue.push(0);
        }

        while (
          operatorStack.length > 0 &&
          operatorStack[operatorStack.length - 1] !== "(" &&
          precedence[operatorStack[operatorStack.length - 1]] >= precedence[op]
        ) {
          outputQueue.push(operatorStack.pop());
        }
        operatorStack.push(op);
      }
    }
  }

  while (operatorStack.length > 0) {
    const op = operatorStack.pop();
    if (op === "(" || op === ")") {
      throw new AppError(400, `Mismatched parentheses in formula '${formulaStr}'`, "INVALID_FORMULA");
    }
    outputQueue.push(op);
  }

  // Evaluate RPN queue
  const evalStack = [];
  for (const token of outputQueue) {
    if (typeof token === "number") {
      evalStack.push(token);
    } else {
      const b = evalStack.pop() ?? 0;
      const a = evalStack.pop() ?? 0;

      switch (token) {
        case "+":
          evalStack.push(a + b);
          break;
        case "-":
          evalStack.push(a - b);
          break;
        case "*":
          evalStack.push(a * b);
          break;
        case "/":
          evalStack.push(b === 0 ? 0 : a / b);
          break;
        default:
          throw new AppError(400, `Unknown operator '${token}'`, "INVALID_FORMULA");
      }
    }
  }

  const finalResult = evalStack.pop() || 0;
  return Math.round((finalResult + Number.EPSILON) * 100) / 100;
}

/**
 * Detects circular dependencies among a list of rule definitions using Depth First Search (DFS).
 */
function detectCircularDependencies(rules) {
  const graph = {};
  const codeToRule = {};

  for (const rule of rules) {
    const code = rule.code.toUpperCase();
    codeToRule[code] = rule;
    graph[code] = [];

    if (rule.computation_type === "PERCENTAGE" && rule.percentage_of) {
      graph[code].push(rule.percentage_of.toUpperCase());
    } else if (rule.computation_type === "FORMULA" && rule.formula) {
      const deps = extractFormulaDependencies(rule.formula);
      for (const dep of deps) {
        if (dep !== code) {
          graph[code].push(dep);
        }
      }
    }
  }

  const visited = new Set();
  const recStack = new Set();
  const cyclePath = [];

  function dfs(node, currentPath) {
    visited.add(node);
    recStack.add(node);
    currentPath.push(node);

    const neighbors = graph[node] || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor, currentPath)) {
          return true;
        }
      } else if (recStack.has(neighbor)) {
        currentPath.push(neighbor);
        cyclePath.push(...currentPath.slice(currentPath.indexOf(neighbor)));
        return true;
      }
    }

    recStack.delete(node);
    currentPath.pop();
    return false;
  }

  for (const node of Object.keys(graph)) {
    if (!visited.has(node)) {
      if (dfs(node, [])) {
        throw new AppError(
          400,
          `Circular dependency detected in salary rules: ${cyclePath.join(" -> ")}`,
          "CIRCULAR_RULE_DEPENDENCY"
        );
      }
    }
  }
}

module.exports = {
  tokenize,
  extractFormulaDependencies,
  evaluateFormula,
  detectCircularDependencies,
};
