type ASTNode =
  | PropertyPath
  | Comparison
  | Literal
  | ContextRef
  | ContextPathRef
  | FilteredSegment;

/* ASTNode type - PropertyPath */
interface PropertyPath {
  type: 'propertyPath';
  segments: Segment[];
}

/* ASTNode type - Segment */
type Segment = PropertySegment | FilteredSegment;

/* ASTNode type - PropertySegment */
interface PropertySegment {
  type: 'property';
  name: string;
}

/* ASTNode type - FilteredSegment */
interface FilteredSegment {
  type: 'filtered';
  name: string;
  filter: ASTNode;
}

/* ASTNode type - Comparison */
interface Comparison {
  type: 'comparison';
  operator: Operator;
  left: ASTNode;
  right: ASTNode;
}

/* ASTNode type - Literal */
interface Literal {
  type: 'literal';
  value: string | number;
  typeHint?: TypeHint;
}

/* ASTNode type - ContextRef */
interface ContextRef {
  type: 'contextRef';
  name: string;
  typeHint?: TypeHint;
}

/* ASTNode type - ContextPathRef */
interface ContextPathRef {
  type: 'contextPathRef';
  segments: string[];
  typeHint?: TypeHint;
}

/**
 * This is the function type of a re-usable compiled expression
 * that serves as the main output from the parser-compiler.
 *
 * @param input - The object to apply the expression to.
 * @param context - Variable/binding namespace for reference lookup.
 * @param reporter - Optional callback to publish execution details to.
 */
export type CompiledExpression = (
  input: any,
  context: Record<string, any>,
  reporter?: OperationReporter
) => any;

/**
 * Protocol for execution detail reporting
 */
export interface Operation {
  type: string;
  desc: string;
  result: any;
}

/**
 * Execution reporting function type
 */
export type OperationReporter = (op: Operation) => void;

type TypeHint = 'string' | 'number' | 'boolean';

/**
 * Supported operators for comparison
 */
type Operator = '=' | '!=' | '>' | '>=' | '<' | '<=';

/**
 * Used for visual represenation of comparisons in reporting.
 */
const comparatorLegend = {
  '=': '===',
  '!=': '!==',
  '>': '>',
  '<': '<',
  '>=': '>=',
  '<=': '<=',
};

/**
 * Convenience-function for publishing execution details to reported
 * that may or may not have been provided.
 */
const report = (
  reporter: OperationReporter | undefined,
  type: string,
  desc: string,
  result: any
) => {
  if (reporter) {
    reporter({ type, desc, result });
  }
};

/**
 * Coerce a referenced value according to the provided type hint, if any.
 */
const applyTypeHint = (ref: ContextRef | ContextPathRef, value: any) => {
  switch (ref.typeHint) {
    case 'number':
      return Number(value);
    case 'string':
      return String(value);
    case 'boolean':
      return value === 'false' ? false : Boolean(value);
    default:
      return value;
  }
};

/**
 * Perform a comparison between two fully resolved values.
 */
const applyComparison = (l: any, r: any, operator: Operator) => {
  switch (operator) {
    case '=':
      return l === r;
    case '!=':
      return l !== r;
    case '>':
      return l > r;
    case '<':
      return l < r;
    case '>=':
      return l >= r;
    case '<=':
      return l <= r;
  }
};

/**
 * Main entry-point for parsing an expression into an AST.
 */
export const parse = (expression: string): ASTNode => {
  const tokens = tokenize(expression);
  let index = 0;

  function peek() {
    return tokens[index];
  }

  function next() {
    return tokens[index++];
  }

  function parseExpression(): ASTNode {
    const left = parsePath();

    const op = peek();
    if (['=', '!=', '>', '<', '>=', '<='].includes(op)) {
      next();
      const right = parseValue();
      return {
        type: 'comparison',
        operator: op as Operator,
        left,
        right,
      };
    }

    return left;
  }

  function parsePath(): PropertyPath {
    const segments: Segment[] = [];

    while (true) {
      const ident = next();
      if (!ident.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/))
        throw new Error(`Invalid identifier: ${ident}`);

      if (peek() === '[') {
        next(); // [
        const filter = parseExpression();
        if (next() !== ']') throw new Error(`Expected ]`);
        segments.push({ type: 'filtered', name: ident, filter });
      } else {
        segments.push({ type: 'property', name: ident });
      }

      if (peek() !== '.') break;
      next(); // .
    }

    return { type: 'propertyPath', segments };
  }

  function parseValue(): ASTNode {
    const tok = next();

    /* If it looks like an identifier or type-hinted identifier */
    if (/^[#!$]?[a-zA-Z_]/.test(tok)) {
      return parseContextPath(tok);
    }

    /* Otherwise, parse normally */
    if (/^[0-9]+$/.test(tok)) {
      return { type: 'literal', value: parseInt(tok, 10) };
    } else if (/^"[^"]+"$/.test(tok)) {
      return { type: 'literal', value: tok.slice(1, -1) };
    } else {
      return { type: 'contextRef', name: tok };
    }
  }

  function parseContextPath(base: string): ASTNode {
    // Handle hint, if any
    let typeHint: TypeHint | undefined;
    let name = base;

    if (/^#/.test(base)) {
      typeHint = 'number';
      name = base.slice(1);
    } else if (/^!/.test(base)) {
      typeHint = 'boolean';
      name = base.slice(1);
    } else if (/^\$/.test(base)) {
      typeHint = 'string';
      name = base.slice(1);
    }

    const segments: string[] = [name];

    while (peek() === '.') {
      next(); // consume and discard '.'
      segments.push(next()); // push the next path identifier
    }

    return {
      type: 'contextPathRef',
      segments,
      typeHint,
    };
  }

  return parseExpression();
};

/**
 * Tokenize an expression to prepare for parsing
 */
const tokenize = (str: string): string[] => {
  return (
    str.match(/[#!$]?[a-zA-Z_][a-zA-Z0-9_]*|[><=!]=?|"(?:[^"\\]|\\.)*"|\d+|\[|\]|\./g) ||
    []
  );
};

/**
 * Main entry-point for compiling an AST to an executable function.
 */
export function compile(ast: ASTNode): CompiledExpression {
  switch (ast.type) {
    case 'literal':
      return () => ast.value;

    case 'contextRef':
      return (_, context) => {
        const raw = context[ast.name];

        return applyTypeHint(ast, raw);
      };

    case 'contextPathRef':
      return (_, context) => {
        let val = context;
        for (const segment of ast.segments) {
          if (val == null) return undefined;
          val = val[segment];
        }
        return applyTypeHint(ast, val);
      };

    case 'propertyPath':
      const segmentFns = ast.segments.map(compileSegment);
      return (input, context, reporter) => {
        let value = input;
        for (const fn of segmentFns) {
          value = fn(value, context, reporter);
          if (value == null) return undefined;
        }
        return value;
      };

    case 'comparison':
      const left = compile(ast.left);
      const right = compile(ast.right);
      return (input, context, reporter) => {
        const l = left(input, context);
        const r = right(input, context);
        const result = applyComparison(l, r, ast.operator);
        report(
          reporter,
          'compare',
          [JSON.stringify(l), comparatorLegend[ast.operator], JSON.stringify(r)].join(
            ' '
          ),
          result
        );
        return result;
      };

    default:
      throw new Error(`Unknown AST node: ${(ast as any).type}`);
  }
}

/**
 * Compile a function for traversal of path segments
 */
function compileSegment(segment: Segment): CompiledExpression {
  if (segment.type === 'property') {
    return (input) => input?.[segment.name];
  }

  if (segment.type === 'filtered') {
    const filterFn = compile(segment.filter);
    return (input, context, reporter) => {
      const list = input?.[segment.name];
      if (!Array.isArray(list)) return undefined;
      return list.find((item) => filterFn(item, context, reporter));
    };
  }

  throw new Error(`Unknown segment type`);
}

/**
 * Convenience function for performing the full flow of parsing and compiling
 * an expression to an executable function.
 */
export const parseAndCompile = (expression: string): CompiledExpression => {
  return compile(parse(expression));
};

export default {
  compile,
  parse,
  parseAndCompile,
};
