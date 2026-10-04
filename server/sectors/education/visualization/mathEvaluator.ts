// Safe, deterministic, bounded mathematical expression evaluator for AI Visualizations
// Zero eval(), Zero Function(), Zero code injection vectors, bounded recursion/execution steps.

export interface EvalContext {
  [variable: string]: number;
}

export interface EvalResult {
  value: number;
  isValid: boolean;
  error?: string;
}

type TokenType =
  | 'NUMBER'
  | 'IDENTIFIER'
  | 'OPERATOR'
  | 'LPAREN'
  | 'RPAREN'
  | 'COMMA';

interface Token {
  type: TokenType;
  value: string;
  numValue?: number;
}

const BLOCKED_IDENTIFIERS = new Set([
  '__proto__',
  'constructor',
  'prototype',
  'toString',
  'valueOf',
  'hasOwnProperty',
  'isPrototypeOf',
  'propertyIsEnumerable',
  'toLocaleString',
  'eval',
  'function',
  'process',
  'global',
  'window',
  'document'
]);

export class MathEvaluator {
  private static readonly MAX_EXPRESSION_LENGTH = 1000;
  private static readonly MAX_EVAL_STEPS = 500;

  private static readonly ALLOWED_FUNCTIONS: Record<string, (...args: number[]) => number> = Object.assign(
    Object.create(null),
    {
      sin: (x: number) => Math.sin(x),
      cos: (x: number) => Math.cos(x),
      tan: (x: number) => Math.tan(x),
      asin: (x: number) => Math.asin(x),
      acos: (x: number) => Math.acos(x),
      atan: (x: number) => Math.atan(x),
      sinh: (x: number) => Math.sinh(x),
      cosh: (x: number) => Math.cosh(x),
      tanh: (x: number) => Math.tanh(x),
      sqrt: (x: number) => (x < 0 ? NaN : Math.sqrt(x)),
      cbrt: (x: number) => Math.cbrt(x),
      abs: (x: number) => Math.abs(x),
      ln: (x: number) => (x <= 0 ? NaN : Math.log(x)),
      log: (x: number) => (x <= 0 ? NaN : Math.log10(x)),
      log10: (x: number) => (x <= 0 ? NaN : Math.log10(x)),
      log2: (x: number) => (x <= 0 ? NaN : Math.log2(x)),
      exp: (x: number) => Math.exp(x),
      floor: (x: number) => Math.floor(x),
      ceil: (x: number) => Math.ceil(x),
      round: (x: number) => Math.round(x),
      pow: (b: number, e: number) => Math.pow(b, e),
      min: (...args: number[]) => Math.min(...args),
      max: (...args: number[]) => Math.max(...args)
    }
  );

  private static readonly CONSTANTS: Record<string, number> = Object.assign(
    Object.create(null),
    {
      pi: Math.PI,
      PI: Math.PI,
      e: Math.E,
      E: Math.E
    }
  );

  /**
   * Tokenize mathematical string safely
   */
  public static tokenize(expr: string): Token[] {
    if (!expr || typeof expr !== 'string') return [];
    if (expr.length > MathEvaluator.MAX_EXPRESSION_LENGTH) {
      throw new Error(`Expression length exceeds limit of ${MathEvaluator.MAX_EXPRESSION_LENGTH} characters`);
    }

    const tokens: Token[] = [];
    let i = 0;
    const len = expr.length;

    while (i < len) {
      const ch = expr[i];

      // Skip whitespace
      if (/\s/.test(ch)) {
        i++;
        continue;
      }

      // Numbers (integers and decimals)
      if (/[0-9]/.test(ch) || (ch === '.' && i + 1 < len && /[0-9]/.test(expr[i + 1]))) {
        let numStr = '';
        let dotCount = 0;
        while (i < len && (/[0-9]/.test(expr[i]) || expr[i] === '.')) {
          if (expr[i] === '.') {
            dotCount++;
            if (dotCount > 1) break;
          }
          numStr += expr[i];
          i++;
        }
        tokens.push({ type: 'NUMBER', value: numStr, numValue: parseFloat(numStr) });
        continue;
      }

      // Identifiers (function names, variables, constants)
      if (/[a-zA-Z_]/.test(ch)) {
        let idStr = '';
        while (i < len && /[a-zA-Z0-9_]/.test(expr[i])) {
          idStr += expr[i];
          i++;
        }

        if (BLOCKED_IDENTIFIERS.has(idStr)) {
          throw new Error(`Disallowed reserved identifier: '${idStr}'`);
        }

        tokens.push({ type: 'IDENTIFIER', value: idStr });
        continue;
      }

      // Operators
      if (['+', '-', '*', '/', '^', '%'].includes(ch)) {
        tokens.push({ type: 'OPERATOR', value: ch });
        i++;
        continue;
      }

      // Parentheses
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

      // Comma for multi-arg functions
      if (ch === ',') {
        tokens.push({ type: 'COMMA', value: ',' });
        i++;
        continue;
      }

      // Disallow any malicious or unexpected characters
      throw new Error(`Invalid or disallowed character in mathematical expression: '${ch}'`);
    }

    // Insert implicit multiplication e.g., "2x" -> "2 * x", "2(x)" -> "2 * (x)", "(x)(y)" -> "(x) * (y)", "x y" -> "x * y"
    const expandedTokens: Token[] = [];
    for (let k = 0; k < tokens.length; k++) {
      const current = tokens[k];
      expandedTokens.push(current);

      if (k < tokens.length - 1) {
        const next = tokens[k + 1];
        const currentIsValue =
          current.type === 'NUMBER' ||
          current.type === 'IDENTIFIER' ||
          current.type === 'RPAREN';
        const nextIsValue =
          (next.type === 'IDENTIFIER' && !Object.prototype.hasOwnProperty.call(MathEvaluator.ALLOWED_FUNCTIONS, next.value)) ||
          next.type === 'NUMBER' ||
          next.type === 'LPAREN' ||
          (next.type === 'IDENTIFIER' && Object.prototype.hasOwnProperty.call(MathEvaluator.ALLOWED_FUNCTIONS, next.value));

        if (
          (current.type === 'NUMBER' && next.type === 'IDENTIFIER') ||
          (current.type === 'NUMBER' && next.type === 'LPAREN') ||
          (current.type === 'RPAREN' && next.type === 'LPAREN') ||
          (current.type === 'RPAREN' && next.type === 'IDENTIFIER') ||
          (current.type === 'IDENTIFIER' && !Object.prototype.hasOwnProperty.call(MathEvaluator.ALLOWED_FUNCTIONS, current.value) && next.type === 'LPAREN')
        ) {
          expandedTokens.push({ type: 'OPERATOR', value: '*' });
        }
      }
    }

    return expandedTokens;
  }

  /**
   * Evaluate mathematical expression for given variable context (e.g. x=2.5, a=1.0)
   */
  public static evaluate(expr: string, context: EvalContext = {}): EvalResult {
    try {
      const tokens = MathEvaluator.tokenize(expr);
      if (tokens.length === 0) {
        return { value: 0, isValid: true };
      }

      let pos = 0;
      let stepCount = 0;

      const checkSteps = () => {
        stepCount++;
        if (stepCount > MathEvaluator.MAX_EVAL_STEPS) {
          throw new Error('Evaluation exceeded maximum execution step limit');
        }
      };

      // Grammar:
      // Expression = Term (( '+' | '-' ) Term)*
      // Term = Exponent (( '*' | '/' | '%' ) Exponent)*
      // Exponent = Factor ( '^' Factor )*
      // Factor = ('+' | '-')? Primary
      // Primary = NUMBER | IDENTIFIER ( '(' args ')' )? | '(' Expression ')'

      const parseExpression = (): number => {
        checkSteps();
        let val = parseTerm();
        while (pos < tokens.length && tokens[pos].type === 'OPERATOR' && ['+', '-'].includes(tokens[pos].value)) {
          const op = tokens[pos].value;
          pos++;
          const nextTerm = parseTerm();
          if (op === '+') val += nextTerm;
          else val -= nextTerm;
        }
        return val;
      };

      const parseTerm = (): number => {
        checkSteps();
        let val = parseExponent();
        while (pos < tokens.length && tokens[pos].type === 'OPERATOR' && ['*', '/', '%'].includes(tokens[pos].value)) {
          const op = tokens[pos].value;
          pos++;
          const nextExp = parseExponent();
          if (op === '*') {
            val *= nextExp;
          } else if (op === '/') {
            if (nextExp === 0) {
              val = NaN;
            } else {
              val /= nextExp;
            }
          } else if (op === '%') {
            val = nextExp === 0 ? NaN : val % nextExp;
          }
        }
        return val;
      };

      const parseExponent = (): number => {
        checkSteps();
        let val = parseFactor();
        if (pos < tokens.length && tokens[pos].type === 'OPERATOR' && tokens[pos].value === '^') {
          pos++;
          const exponent = parseFactor();
          val = Math.pow(val, exponent);
        }
        return val;
      };

      const parseFactor = (): number => {
        checkSteps();
        if (pos < tokens.length && tokens[pos].type === 'OPERATOR') {
          const op = tokens[pos].value;
          if (op === '+' || op === '-') {
            pos++;
            const factorVal = parseFactor();
            return op === '-' ? -factorVal : factorVal;
          }
        }
        return parsePrimary();
      };

      const parsePrimary = (): number => {
        checkSteps();
        if (pos >= tokens.length) {
          throw new Error('Unexpected end of expression');
        }

        const tok = tokens[pos];

        if (tok.type === 'NUMBER') {
          pos++;
          return tok.numValue ?? parseFloat(tok.value);
        }

        if (tok.type === 'LPAREN') {
          pos++;
          const val = parseExpression();
          if (pos >= tokens.length || tokens[pos].type !== 'RPAREN') {
            throw new Error('Mismatched parentheses: missing closing ")"');
          }
          pos++;
          return val;
        }

        if (tok.type === 'IDENTIFIER') {
          const name = tok.value;
          pos++;

          // Check if it's a function call e.g. sin(x), sqrt(x)
          if (pos < tokens.length && tokens[pos].type === 'LPAREN') {
            pos++; // consume '('
            const args: number[] = [];
            if (pos < tokens.length && tokens[pos].type !== 'RPAREN') {
              args.push(parseExpression());
              while (pos < tokens.length && tokens[pos].type === 'COMMA') {
                pos++; // consume ','
                args.push(parseExpression());
              }
            }
            if (pos >= tokens.length || tokens[pos].type !== 'RPAREN') {
              throw new Error(`Missing closing parenthesis for function ${name}`);
            }
            pos++; // consume ')'

            const fn = Object.prototype.hasOwnProperty.call(MathEvaluator.ALLOWED_FUNCTIONS, name)
              ? MathEvaluator.ALLOWED_FUNCTIONS[name]
              : undefined;
            if (!fn) {
              throw new Error(`Unknown or unsupported function '${name}'`);
            }
            return fn(...args);
          }

          // Check constants (pi, e)
          if (Object.prototype.hasOwnProperty.call(MathEvaluator.CONSTANTS, name)) {
            return MathEvaluator.CONSTANTS[name];
          }

          // Check variable context safely
          if (Object.prototype.hasOwnProperty.call(context, name) && !BLOCKED_IDENTIFIERS.has(name)) {
            const ctxVal = context[name];
            return typeof ctxVal === 'number' && !isNaN(ctxVal) ? ctxVal : NaN;
          }

          throw new Error(`Undefined variable '${name}' in evaluation context`);
        }

        throw new Error(`Unexpected token '${tok.value}'`);
      };

      const result = parseExpression();

      if (pos < tokens.length) {
        throw new Error(`Unexpected extra tokens after expression: '${tokens[pos].value}'`);
      }

      if (isNaN(result) || !isFinite(result)) {
        return { value: NaN, isValid: true };
      }

      return { value: result, isValid: true };
    } catch (err: any) {
      return { value: NaN, isValid: false, error: err?.message || 'Math evaluation error' };
    }
  }

  /**
   * Sample 2D curve points across [xMin, xMax] for plotting
   */
  public static sampleCurve(
    expr: string,
    xMin: number,
    xMax: number,
    pointsCount: number = 200,
    parameters: EvalContext = {}
  ): Array<{ x: number; y: number }> {
    const points: Array<{ x: number; y: number }> = [];
    if (pointsCount < 2 || xMin >= xMax) return points;

    const step = (xMax - xMin) / (pointsCount - 1);
    for (let i = 0; i < pointsCount; i++) {
      const x = xMin + i * step;
      const evalRes = MathEvaluator.evaluate(expr, { ...parameters, x });
      if (evalRes.isValid && !isNaN(evalRes.value) && isFinite(evalRes.value)) {
        // Clamp extreme runaway values to prevent SVG canvas distortion
        const clampedY = Math.max(-10000, Math.min(10000, evalRes.value));
        points.push({ x: Number(x.toFixed(4)), y: Number(clampedY.toFixed(4)) });
      }
    }
    return points;
  }
}
