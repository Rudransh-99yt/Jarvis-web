// Purely deterministic, safe AST & RPN Mathematical Evaluator
// Zero eval, zero Function(), zero external dependencies, 100% immune to code injection.

export interface EvaluatorToken {
  type: 'NUMBER' | 'VARIABLE' | 'OPERATOR' | 'FUNCTION' | 'LPAREN' | 'RPAREN' | 'COMMA';
  value: string;
  precedence?: number;
  associativity?: 'left' | 'right';
}

export interface CurvePoint {
  x: number;
  y: number;
}

export interface FunctionAnalysis {
  expression: string;
  yIntercept?: { x: number; y: number };
  roots: Array<{ x: number; y: number }>;
  extrema: Array<{ x: number; y: number; type: 'min' | 'max' }>;
}

const OPERATORS: Record<string, { precedence: number; associativity: 'left' | 'right'; args: number }> = {
  '+': { precedence: 2, associativity: 'left', args: 2 },
  '-': { precedence: 2, associativity: 'left', args: 2 },
  '*': { precedence: 3, associativity: 'left', args: 2 },
  '/': { precedence: 3, associativity: 'left', args: 2 },
  '%': { precedence: 3, associativity: 'left', args: 2 },
  '^': { precedence: 4, associativity: 'right', args: 2 },
  'unary_neg': { precedence: 5, associativity: 'right', args: 1 }
};

const MATH_FUNCTIONS: Record<string, (a: number) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sqrt: Math.sqrt,
  cbrt: Math.cbrt,
  abs: Math.abs,
  log: Math.log10,
  log10: Math.log10,
  ln: Math.log,
  exp: Math.exp,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round
};

const CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  PI: Math.PI,
  e: Math.E,
  E: Math.E
};

export class MathEvaluator {
  /**
   * Sanitizes and checks if an expression is mathematically safe.
   */
  public static isSafeExpression(rawExpr: string): boolean {
    if (!rawExpr || typeof rawExpr !== 'string') return false;
    if (rawExpr.length > 500) return false;

    // Check for suspicious script injection or prototype pollution tokens
    const blacklist = [
      'process', 'require', 'import', 'eval', 'Function', 'window', 'document',
      'global', 'this', 'prototype', '__proto__', 'constructor', ';', '=>',
      'class', 'var', 'let', 'const', 'return', 'throw', '<script', 'fetch'
    ];

    const lower = rawExpr.toLowerCase();
    for (const word of blacklist) {
      if (lower.includes(word.toLowerCase())) {
        return false;
      }
    }

    return true;
  }

  /**
   * Normalizes an expression (e.g. removes "y =", "f(x) =", handles "2x" -> "2*x").
   */
  public static normalizeExpression(rawExpr: string): string {
    let expr = rawExpr.trim();

    // Strip "y =", "f(x) =", "g(x) =" prefix if present
    expr = expr.replace(/^(y|f\s*\(\s*x\s*\)|g\s*\(\s*x\s*\)|h\s*\(\s*x\s*\))\s*=\s*/i, '');

    // Replace LaTeX symbols
    expr = expr.replace(/\\cdot/g, '*');
    expr = expr.replace(/\\times/g, '*');
    expr = expr.replace(/\\pi/gi, 'pi');
    expr = expr.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)');
    expr = expr.replace(/\\sqrt\{([^}]+)\}/g, 'sqrt($1)');

    // Support implicit multiplication: 2x -> 2*x, 3sin(x) -> 3*sin(x), (x+1)(x-2) -> (x+1)*(x-2)
    expr = expr.replace(/(\d+)([a-zA-Z(])/g, '$1*$2');
    expr = expr.replace(/(\))(\d+|[a-zA-Z(])/g, '$1*$2');
    expr = expr.replace(/(x)([a-zA-Z(])/gi, '$1*$2');

    return expr;
  }

  /**
   * Tokenizes a mathematical expression into tokens.
   */
  public static tokenize(expr: string): EvaluatorToken[] {
    const tokens: EvaluatorToken[] = [];
    let i = 0;
    const len = expr.length;

    while (i < len) {
      const ch = expr[i];

      // Whitespace
      if (/\s/.test(ch)) {
        i++;
        continue;
      }

      // Numbers (integer, float)
      if (/\d/.test(ch) || (ch === '.' && i + 1 < len && /\d/.test(expr[i + 1]))) {
        let numStr = '';
        while (i < len && (/\d/.test(expr[i]) || expr[i] === '.')) {
          numStr += expr[i];
          i++;
        }
        tokens.push({ type: 'NUMBER', value: numStr });
        continue;
      }

      // Identifiers: variables, constants, functions
      if (/[a-zA-Z_]/.test(ch)) {
        let idStr = '';
        while (i < len && /[a-zA-Z0-9_]/.test(expr[i])) {
          idStr += expr[i];
          i++;
        }

        const idLower = idStr.toLowerCase();
        if (idLower in MATH_FUNCTIONS) {
          tokens.push({ type: 'FUNCTION', value: idLower });
        } else if (idLower in CONSTANTS) {
          tokens.push({ type: 'NUMBER', value: String(CONSTANTS[idLower]) });
        } else {
          tokens.push({ type: 'VARIABLE', value: idStr });
        }
        continue;
      }

      // Operators
      if (['+', '-', '*', '/', '^', '%'].includes(ch)) {
        // Distinguish unary minus from binary subtraction
        let isUnary = false;
        if (ch === '-') {
          const prev = tokens[tokens.length - 1];
          if (!prev || prev.type === 'OPERATOR' || prev.type === 'LPAREN' || prev.type === 'COMMA') {
            isUnary = true;
          }
        }

        if (isUnary) {
          tokens.push({
            type: 'OPERATOR',
            value: 'unary_neg',
            precedence: OPERATORS['unary_neg'].precedence,
            associativity: OPERATORS['unary_neg'].associativity
          });
        } else {
          tokens.push({
            type: 'OPERATOR',
            value: ch,
            precedence: OPERATORS[ch].precedence,
            associativity: OPERATORS[ch].associativity
          });
        }
        i++;
        continue;
      }

      // Parentheses & comma
      if (ch === '(') {
        tokens.push({ type: 'LPAREN', value: '(' });
        i++;
        continue;
      }
      if (ch === ')') {
        tokens.push({ type: 'RPAREN', value: ')' });
        i++;
        continue;
      }
      if (ch === ',') {
        tokens.push({ type: 'COMMA', value: ',' });
        i++;
        continue;
      }

      // Unknown character, skip safely
      i++;
    }

    return tokens;
  }

  /**
   * Shunting-yard algorithm to convert infix tokens to Reverse Polish Notation (RPN).
   */
  public static toRPN(tokens: EvaluatorToken[]): EvaluatorToken[] {
    const outputQueue: EvaluatorToken[] = [];
    const opStack: EvaluatorToken[] = [];

    for (const token of tokens) {
      if (token.type === 'NUMBER' || token.type === 'VARIABLE') {
        outputQueue.push(token);
      } else if (token.type === 'FUNCTION') {
        opStack.push(token);
      } else if (token.type === 'COMMA') {
        while (opStack.length > 0 && opStack[opStack.length - 1].type !== 'LPAREN') {
          outputQueue.push(opStack.pop()!);
        }
      } else if (token.type === 'OPERATOR') {
        const o1 = token;
        while (opStack.length > 0) {
          const o2 = opStack[opStack.length - 1];
          if (o2.type === 'OPERATOR') {
            const prec1 = o1.precedence || 0;
            const prec2 = o2.precedence || 0;
            if (
              (o1.associativity === 'left' && prec1 <= prec2) ||
              (o1.associativity === 'right' && prec1 < prec2)
            ) {
              outputQueue.push(opStack.pop()!);
              continue;
            }
          } else if (o2.type === 'FUNCTION') {
            outputQueue.push(opStack.pop()!);
            continue;
          }
          break;
        }
        opStack.push(o1);
      } else if (token.type === 'LPAREN') {
        opStack.push(token);
      } else if (token.type === 'RPAREN') {
        while (opStack.length > 0 && opStack[opStack.length - 1].type !== 'LPAREN') {
          outputQueue.push(opStack.pop()!);
        }
        if (opStack.length > 0 && opStack[opStack.length - 1].type === 'LPAREN') {
          opStack.pop(); // discard '('
        }
        if (opStack.length > 0 && opStack[opStack.length - 1].type === 'FUNCTION') {
          outputQueue.push(opStack.pop()!);
        }
      }
    }

    while (opStack.length > 0) {
      const top = opStack.pop()!;
      if (top.type !== 'LPAREN' && top.type !== 'RPAREN') {
        outputQueue.push(top);
      }
    }

    return outputQueue;
  }

  /**
   * Evaluates an RPN token stream with given variable bindings.
   */
  public static evaluateRPN(rpn: EvaluatorToken[], vars: Record<string, number>): number {
    const stack: number[] = [];

    for (const token of rpn) {
      if (token.type === 'NUMBER') {
        stack.push(parseFloat(token.value));
      } else if (token.type === 'VARIABLE') {
        const val = vars[token.value] ?? vars[token.value.toLowerCase()] ?? 0;
        stack.push(val);
      } else if (token.type === 'OPERATOR') {
        if (token.value === 'unary_neg') {
          const a = stack.pop() ?? 0;
          stack.push(-a);
        } else {
          const b = stack.pop() ?? 0;
          const a = stack.pop() ?? 0;

          switch (token.value) {
            case '+': stack.push(a + b); break;
            case '-': stack.push(a - b); break;
            case '*': stack.push(a * b); break;
            case '/': stack.push(b !== 0 ? a / b : NaN); break;
            case '%': stack.push(b !== 0 ? a % b : NaN); break;
            case '^': stack.push(Math.pow(a, b)); break;
            default: stack.push(0);
          }
        }
      } else if (token.type === 'FUNCTION') {
        const fn = MATH_FUNCTIONS[token.value];
        if (fn) {
          const a = stack.pop() ?? 0;
          stack.push(fn(a));
        }
      }
    }

    const res = stack.pop();
    return res !== undefined && !isNaN(res) ? res : NaN;
  }

  /**
   * Compiles an expression into a fast single-variable function f(x).
   */
  public static compile(rawExpr: string, variableName = 'x'): (x: number) => number {
    if (!this.isSafeExpression(rawExpr)) {
      throw new Error(`Unsafe or invalid mathematical expression: "${rawExpr}"`);
    }

    const normalized = this.normalizeExpression(rawExpr);
    const tokens = this.tokenize(normalized);
    const rpn = this.toRPN(tokens);

    return (x: number) => {
      return this.evaluateRPN(rpn, { [variableName]: x });
    };
  }

  /**
   * Evaluates single expression directly.
   */
  public static evaluate(rawExpr: string, xVal: number, variableName = 'x'): number {
    const fn = this.compile(rawExpr, variableName);
    return fn(xVal);
  }

  /**
   * Generates sample points for rendering curves over a domain [xMin, xMax].
   */
  public static generateCurvePoints(
    rawExpr: string,
    domain: [number, number],
    sampleCount = 200,
    variableName = 'x'
  ): CurvePoint[] {
    const fn = this.compile(rawExpr, variableName);
    const [xMin, xMax] = domain;
    const step = (xMax - xMin) / Math.max(10, sampleCount);
    const points: CurvePoint[] = [];

    for (let x = xMin; x <= xMax + step * 0.5; x += step) {
      try {
        const y = fn(x);
        if (!isNaN(y) && isFinite(y)) {
          // Bound extreme values to prevent canvas overflow
          const boundedY = Math.max(-10000, Math.min(10000, y));
          points.push({ x: Number(x.toFixed(4)), y: Number(boundedY.toFixed(4)) });
        }
      } catch {
        // Skip singularity point
      }
    }

    return points;
  }

  /**
   * Analyzes function for key pedagogical points: y-intercept, roots, local extrema.
   */
  public static analyzeFunction(
    rawExpr: string,
    domain: [number, number],
    variableName = 'x'
  ): FunctionAnalysis {
    const fn = this.compile(rawExpr, variableName);
    const [xMin, xMax] = domain;
    const roots: Array<{ x: number; y: number }> = [];
    const extrema: Array<{ x: number; y: number; type: 'min' | 'max' }> = [];

    // 1. Y-intercept
    let yIntercept: { x: number; y: number } | undefined;
    if (xMin <= 0 && xMax >= 0) {
      try {
        const y0 = fn(0);
        if (!isNaN(y0) && isFinite(y0)) {
          yIntercept = { x: 0, y: Number(y0.toFixed(4)) };
        }
      } catch {
        // Ignore
      }
    }

    // 2. Numerical search for roots and extrema
    const steps = 300;
    const h = (xMax - xMin) / steps;
    let prevX = xMin;
    let prevY = fn(prevX);
    let prevDy: number | null = null;

    for (let i = 1; i <= steps; i++) {
      const curX = xMin + i * h;
      const curY = fn(curX);

      if (!isNaN(prevY) && !isNaN(curY) && isFinite(prevY) && isFinite(curY)) {
        // Root detection: sign change
        if ((prevY <= 0 && curY >= 0) || (prevY >= 0 && curY <= 0)) {
          // Bisection root refinement (up to 8 iterations)
          let a = prevX;
          let b = curX;
          for (let k = 0; k < 8; k++) {
            const mid = (a + b) / 2;
            const midY = fn(mid);
            if (fn(a) * midY <= 0) {
              b = mid;
            } else {
              a = mid;
            }
          }
          const rootX = (a + b) / 2;
          const rootY = fn(rootX);
          if (Math.abs(rootY) < 0.1) {
            roots.push({ x: Number(rootX.toFixed(3)), y: 0 });
          }
        }

        // Extrema detection: sign change in numerical derivative
        const curDy = (curY - prevY) / h;
        if (prevDy !== null) {
          if (prevDy > 0 && curDy < 0) {
            extrema.push({ x: Number(prevX.toFixed(3)), y: Number(prevY.toFixed(3)), type: 'max' });
          } else if (prevDy < 0 && curDy > 0) {
            extrema.push({ x: Number(prevX.toFixed(3)), y: Number(prevY.toFixed(3)), type: 'min' });
          }
        }
        prevDy = curDy;
      }

      prevX = curX;
      prevY = curY;
    }

    return {
      expression: rawExpr,
      yIntercept,
      roots: roots.slice(0, 6), // Limit to top 6 roots
      extrema: extrema.slice(0, 6)
    };
  }
}
