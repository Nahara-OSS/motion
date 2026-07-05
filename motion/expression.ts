/**
 * Nahara's Motion expression language
 *
 * The expression language allows user to create complex animation with math expression. Internally, all animatable
 * properties are stored as math expressions with additional links to keyframe-based animators. In editor, however,
 * there are 2 modes that user can use for animating the properties: value and keyframe mode, or math expression input
 * mode.
 *
 * @module
 */

export type UnaryOperator = "+" | "-" | "!";
export type BinaryOperator = "+" | "-" | "*" | "/" | "==" | "!=" | ">=" | "<=" | ">" | "<" | "&&" | "||";
export type Keyword = BinaryOperator | UnaryOperator | "(" | ")" | "." | "," | "@" | "true" | "false" | "if" | "else";

/**
 * The type of expression tokenizing/parsing error.
 *
 * The error may be used for providing localized error messages to user.
 */
export enum ExpressionError {
    /**
     * Unexpected character while tokenizing
     */
    UnexpectedCharacter = "unexpected-character",

    /**
     * Unexpected token while parsing
     */
    UnexpectedToken = "unexpected-token",

    /**
     * String is not encapsulated between quotes
     */
    UnfinishedString = "unfinished-string",

    /**
     * Expression contains trailing input
     */
    Trailing = "trailing",

    /**
     * Input is empty
     */
    Empty = "empty",
}

export type InputRange = { start: number; end: number };

export type TokenContent =
    | { type: "keyword"; keyword: Keyword }
    | { type: "int"; value: string }
    | { type: "id"; value: string }
    | { type: "string"; value: string }
    | { type: "error"; error: ExpressionError }
    | { type: "eof" };

export type ExpressionContent =
    | { type: "primitive"; value: number | string | boolean }
    | { type: "variable"; name: string }
    | { type: "reference"; name: string }
    | { type: "property-access"; of: Expression; property: string }
    | { type: "binary-operator"; left: Expression; right: Expression; operator: BinaryOperator }
    | { type: "unary-operator"; of: Expression; operator: UnaryOperator }
    | { type: "conditional"; condition: Expression; ifTrue: Expression; ifFalse: Expression }
    | { type: "call"; of: Expression; parameters: Expression[] }
    | { type: "error"; error: ExpressionError };

export type Token = InputRange & TokenContent;
export type Expression = InputRange & ExpressionContent;

const KEYWORDS: Keyword[] = [
    "+",
    "-",
    "*",
    "/",
    "==",
    "!=",
    ">=",
    "<=",
    ">",
    "<",
    "&&",
    "||",
    "(",
    ")",
    ".",
    ",",
    "@",
    "!",
    "true",
    "false",
    "if",
    "else",
];
const WHITESPACES = " \t\r\n";
const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const DIGITS = "0123456789";
const ALPHANUMERICS = ALPHA + DIGITS;
const ID_PREFIX = ALPHA + "_";
const ID_SUFFIX = ALPHANUMERICS + "_";

/**
 * Tokenize expression string
 *
 * The returned generator can be passed into `parse()` to parse the expression.
 *
 * @param input Input to tokenize
 */
export function* tokenize(input: string): Generator<Token, void> {
    let lastError: [start: number, end: number] | null = null;

    outer: for (let i = 0; i < input.length; i) {
        // Whitespaces
        if (WHITESPACES.includes(input[i])) {
            i++;
            continue;
        }

        // Keywords
        const keyword = KEYWORDS.find((k) => input.substring(i, i + k.length) == k);

        if (keyword != null) {
            if (lastError != null) {
                yield {
                    start: lastError[0],
                    end: lastError[1],
                    type: "error",
                    error: ExpressionError.UnexpectedCharacter,
                };

                lastError = null;
            }

            yield { start: i, end: i + keyword.length, type: "keyword", keyword };
            i += keyword.length;
            continue;
        }

        // Digits
        if (DIGITS.includes(input[i])) {
            let value = input[i];

            for (let j = i + 1; j < input.length; j++) {
                if (!DIGITS.includes(input[j])) break;
                value += input[j];
            }

            if (lastError != null) {
                yield {
                    start: lastError[0],
                    end: lastError[1],
                    type: "error",
                    error: ExpressionError.UnexpectedCharacter,
                };

                lastError = null;
            }

            yield { start: i, end: i + value.length, type: "int", value };
            i += value.length;
            continue;
        }

        // Identifiers
        if (ID_PREFIX.includes(input[i])) {
            let value = input[i];

            for (let j = i + 1; j < input.length; j++) {
                if (!ID_SUFFIX.includes(input[j])) break;
                value += input[j];
            }

            if (lastError != null) {
                yield {
                    start: lastError[0],
                    end: lastError[1],
                    type: "error",
                    error: ExpressionError.UnexpectedCharacter,
                };

                lastError = null;
            }

            yield { start: i, end: i + value.length, type: "id", value };
            i += value.length;
            continue;
        }

        // String
        if (input[i] == "'" || input[i] == '"') {
            const quote = input[i];
            let value = "";
            let escaping = false;

            for (let j = i + 1; j < input.length; j++) {
                if (escaping) {
                    value += input[j];
                    continue;
                }

                if (input[j] == "\\") {
                    escaping = true;
                    continue;
                }

                if (input[j] == quote) {
                    if (lastError != null) {
                        yield {
                            start: lastError[0],
                            end: lastError[1],
                            type: "error",
                            error: ExpressionError.UnexpectedCharacter,
                        };

                        lastError = null;
                    }

                    yield { start: i, end: i + value.length + 2, type: "string", value };
                    i += value.length + 2;
                    continue outer;
                }

                value += input[j];
            }

            // Reached EOF without matching end quote
            if (lastError != null) {
                yield {
                    start: lastError[0],
                    end: lastError[1],
                    type: "error",
                    error: ExpressionError.UnexpectedCharacter,
                };

                lastError = null;
            }

            yield { start: i, end: input.length, type: "error", error: ExpressionError.UnfinishedString };
            i = input.length;
            continue;
        }

        // Unexpected input
        if (lastError != null) lastError[1] = i + 1;
        else lastError = [i, i + 1];
        i++;
    }

    if (lastError != null) {
        yield { start: lastError[0], end: lastError[1], type: "error", error: ExpressionError.UnexpectedCharacter };
    }

    yield { start: input.length, end: input.length, type: "eof" };
}

class TokenStream<T> {
    #tokens: TokenStream<T> | T[];
    #pos: number;

    constructor(parent: TokenStream<T>);
    constructor(tokens: T[]);
    constructor(param: TokenStream<T> | T[]) {
        this.#tokens = param;
        this.#pos = param instanceof TokenStream ? param.#pos : 0;
    }

    #at(pos: number): T {
        return this.#tokens instanceof TokenStream ? this.#tokens.#at(pos) : this.#tokens[pos];
    }

    next(): T {
        return this.#at(this.#pos++);
    }

    join(): void {
        if (this.#tokens instanceof TokenStream) {
            this.#tokens.#pos = this.#pos;
        }
    }

    fork(): TokenStream<T> {
        return new TokenStream(this);
    }
}

/**
 * Parse the expression from string.
 *
 * This function basically combines `tokenize()` and `parseFromTokens()`. If there is an error in parsed expression, an
 * error will be _returned_ (not thrown). The expression can also be _partially valid_, and the error only appears when
 * walking in the expression tree.
 *
 * @param input Input expression as string
 * @returns Parsed expression
 */
export function parse(input: string): Expression {
    return parseFromTokens(tokenize(input));
}

/**
 * Parse expression from tokens.
 *
 * @param iterable Tokens
 * @returns Parsed expression
 */
export function parseFromTokens(iterable: Iterable<Token>): Expression {
    const stream = new TokenStream([...iterable]);
    const fork = stream.fork();
    const expr = matchExpression(fork);
    let token: Token;

    if (expr == null) {
        const { start, end, type } = stream.next();
        return {
            start,
            end,
            type: "error",
            error: type == "eof" ? ExpressionError.Empty : ExpressionError.UnexpectedToken,
        };
    }

    fork.join();

    if ((token = stream.next()).type != "eof") {
        const { start, end } = token;
        return { start, end, type: "error", error: ExpressionError.Trailing };
    }

    return expr;
}

function matchAnyOf(
    stream: TokenStream<Token>,
    ...matchers: ((stream: TokenStream<Token>) => Expression | null)[]
): Expression | null {
    for (const matcher of matchers) {
        const fork = stream.fork();
        const result = matcher(fork);

        if (result != null) {
            fork.join();
            return result;
        }
    }

    return null;
}

function matchInfixes(
    stream: TokenStream<Token>,
    matcher: (stream: TokenStream<Token>) => Expression | null,
    predicate: (token: Token) => boolean,
    reduce: (left: Expression, token: Token, right: Expression) => Expression,
): Expression | null {
    let expr = matcher(stream);
    if (expr == null) return null;

    const fork = stream.fork();
    let token: Token;

    while (predicate(token = fork.next())) {
        const right = matcher(fork);
        if (right == null) break;
        fork.join();
        expr = reduce(expr, token, right);
    }

    return expr;
}

function matchBinaryOperators(
    stream: TokenStream<Token>,
    matcher: (stream: TokenStream<Token>) => Expression | null,
    operators: BinaryOperator[],
): Expression | null {
    return matchInfixes(
        stream,
        matcher,
        (t) => t.type == "keyword" && (operators as Keyword[]).includes(t.keyword),
        (left, op, right) => ({
            start: left.start,
            end: right.end,
            type: "binary-operator",
            operator: (op as { keyword: BinaryOperator }).keyword,
            left,
            right,
        }),
    );
}

function matchExpression(stream: TokenStream<Token>): Expression | null {
    return matchBooleanOp(stream);
}

function matchBooleanOp(stream: TokenStream<Token>): Expression | null {
    return matchBinaryOperators(stream, matchEquality, ["&&", "||"]);
}

function matchEquality(stream: TokenStream<Token>): Expression | null {
    return matchBinaryOperators(stream, matchInequality, ["==", "!="]);
}

function matchInequality(stream: TokenStream<Token>): Expression | null {
    return matchBinaryOperators(stream, matchAddOrSub, [">=", "<=", ">", "<"]);
}

function matchAddOrSub(stream: TokenStream<Token>): Expression | null {
    return matchBinaryOperators(stream, matchMulOrDiv, ["+", "-"]);
}

function matchMulOrDiv(stream: TokenStream<Token>): Expression | null {
    return matchBinaryOperators(stream, matchUnaryOperator, ["*", "/"]);
}

function matchUnaryOperator(stream: TokenStream<Token>): Expression | null {
    const fork = stream.fork();
    const unary = fork.next();

    if (unary.type == "keyword" && ["+", "-", "!"].includes(unary.keyword)) {
        const expr = matchFunctionCallOrPropertyAccess(fork);
        if (expr == null) return null;

        const { start } = unary;
        const { end } = expr;
        fork.join();
        return { start, end, type: "unary-operator", of: expr, operator: unary.keyword as UnaryOperator };
    }

    return matchFunctionCallOrPropertyAccess(stream);
}

function matchFunctionCallOrPropertyAccess(stream: TokenStream<Token>): Expression | null {
    let value = matchValue(stream);
    if (value == null) return null;

    const fork = stream.fork();
    let token: Token;

    while ((token = fork.next()).type == "keyword") {
        if (token.keyword == ".") {
            const id = fork.next();

            if (id.type == "id") {
                const { start } = value as Expression;
                const { end, value: property } = id;
                fork.join();
                value = { start, end, type: "property-access", of: value, property };
                continue;
            }
        }

        if (token.keyword == "(") {
            const parameters: Expression[] = [];
            const forkOfFork = fork.fork();
            let parameter: Expression | null;

            if ((parameter = matchExpression(forkOfFork)) != null) {
                forkOfFork.join();
                parameters.push(parameter);

                while ((token = forkOfFork.next()).type == "keyword" && token.keyword == ",") {
                    if ((parameter = matchExpression(forkOfFork)) != null) {
                        forkOfFork.join();
                        parameters.push(parameter);
                    }
                }
            }

            if ((token = fork.next()).type == "keyword" && token.keyword == ")") {
                const { start } = value as Expression;
                const { end } = token;
                fork.join();
                value = { start, end, type: "call", of: value, parameters };
                continue;
            }

            return null;
        }

        break;
    }

    return value;
}

function matchValue(stream: TokenStream<Token>): Expression | null {
    return matchAnyOf(
        stream,
        matchConditional,
        matchGroup,
        matchReference,
        matchVariable,
        matchPrimitive,
    );
}

function matchConditional(stream: TokenStream<Token>): Expression | null {
    const iif = stream.next();
    const { start } = iif;
    if (iif.type != "keyword" || iif.keyword != "if") return null;

    const fork = stream.fork();
    const condition = matchExpression(fork);

    if (condition == null) {
        const { end } = iif;
        return { type: "error", start: start, end, error: ExpressionError.UnexpectedToken };
    } else {
        fork.join();
    }

    const ifTrue = matchExpression(fork);
    if (ifTrue?.type == "error") return condition;

    if (ifTrue == null) {
        const { end } = condition;
        return { type: "error", start, end, error: ExpressionError.UnexpectedToken };
    } else {
        fork.join();
    }

    const eelse = fork.next();

    if (eelse.type != "keyword" || eelse.keyword != "else") {
        const { start, end } = eelse;
        return { type: "error", start, end, error: ExpressionError.UnexpectedToken };
    } else {
        fork.join();
    }

    const ifFalse = matchExpression(fork);

    if (ifFalse == null) {
        return { type: "error", start: iif.start, end: ifTrue.end, error: ExpressionError.UnexpectedToken };
    } else {
        fork.join();
    }

    const { end } = ifFalse;
    return { type: "conditional", condition, ifTrue, ifFalse, start, end };
}

function matchGroup(stream: TokenStream<Token>): Expression | null {
    const open = stream.next();
    if (open.type != "keyword" || open.keyword != "(") return null;

    const expr = matchExpression(stream);
    if (expr == null) return null;

    const close = stream.next();
    if (close.type != "keyword" || close.keyword != ")") return null;

    const { start } = open;
    const { end } = close;
    return { ...expr, start, end };
}

function matchReference(stream: TokenStream<Token>): Expression | null {
    const at = stream.next();
    if (at.type != "keyword" || at.keyword != "@") return null;

    const id = stream.next();
    if (id.type != "id") return null;

    const { start } = at;
    const { end, value } = id;
    return { start, end, type: "reference", name: value };
}

function matchVariable(stream: TokenStream<Token>): Expression | null {
    const id = stream.next();
    if (id.type != "id") return null;

    const { start, end, value } = id;
    return { start, end, type: "variable", name: value };
}

function matchPrimitive(stream: TokenStream<Token>): Expression | null {
    return matchAnyOf(
        stream,
        matchString,
        matchNumber,
        matchBoolean,
        matchError,
    );
}

function matchString(stream: TokenStream<Token>): Expression | null {
    const token = stream.next();
    if (token.type != "string") return null;

    const { start, end, value } = token;
    return { start, end, type: "primitive", value };
}

function matchNumber(stream: TokenStream<Token>): Expression | null {
    let token: Token;

    if ((token = stream.next()).type == "int") {
        const { start, end } = token;
        const int = token.value;
        const fork = stream.fork();

        if ((token = fork.next()).type == "keyword" && token.keyword == ".") {
            if ((token = fork.next()).type == "int") {
                const end = token.end;
                const frac = token.value;
                fork.join();
                return { start, end, type: "primitive", value: Number(int + "." + frac) };
            }
        }

        return { start, end, type: "primitive", value: Number(int) };
    }

    if (token.type == "keyword" && token.keyword == ".") {
        const start = token.start;
        const fork = stream.fork();

        if ((token = fork.next()).type == "int") {
            const end = token.end;
            const frac = token.value;
            fork.join();
            return { start, end, type: "primitive", value: Number("0." + frac) };
        }
    }

    return null;
}

function matchBoolean(stream: TokenStream<Token>): Expression | null {
    const token = stream.next();

    return token.type == "keyword"
        ? token.keyword == "true"
            ? {
                start: token.start,
                end: token.end,
                type: "primitive",
                value: true,
            }
            : token.keyword == "false"
            ? {
                start: token.start,
                end: token.end,
                type: "primitive",
                value: false,
            }
            : null
        : null;
}

function matchError(stream: TokenStream<Token>): Expression | null {
    const token = stream.next();
    return token.type == "error" ? token : null;
}

export function visit<T extends Expression>(
    expr: Expression,
    predicate: (expr: Expression) => expr is T,
    transform: (expr: T) => Expression,
): Expression;

export function visit(
    expr: Expression,
    predicate: (expr: Expression) => boolean,
    transform: (expr: Expression) => Expression,
): Expression;

export function visit(
    expr: Expression,
    predicate: (expr: Expression) => boolean,
    transform: (expr: Expression) => Expression,
): Expression {
    if (predicate(expr)) return transform(expr);

    switch (expr.type) {
        case "unary-operator":
        case "property-access": {
            const of = visit(expr.of, predicate, transform);
            return of == expr.of ? expr : { ...expr, of };
        }

        case "binary-operator": {
            const left = visit(expr.left, predicate, transform);
            const right = visit(expr.right, predicate, transform);
            return left == expr.left && right == expr.right ? expr : { ...expr, left, right };
        }

        case "call": {
            const of = visit(expr.of, predicate, transform);
            const parameters = expr.parameters.map((p) => visit(p, predicate, transform));
            const equals = of == expr.of && parameters.every((p, i) => p == expr.parameters[i]);
            return equals ? expr : { ...expr, of, parameters };
        }

        case "conditional": {
            const condition = visit(expr.condition, predicate, transform);
            const ifTrue = visit(expr.ifTrue, predicate, transform);
            const ifFalse = visit(expr.ifFalse, predicate, transform);
            const equals = condition == expr.condition && ifTrue == expr.ifTrue && ifFalse == expr.ifFalse;
            return equals ? expr : { ...expr, condition, ifTrue, ifFalse };
        }

        default: {
            return expr;
        }
    }
}

/**
 * Extract errors from expression
 *
 * @param expr Expression to extract
 * @returns All errors extracted from expression
 */
export function extractErrors(expr: Expression): (InputRange & { error: ExpressionError })[] {
    switch (expr.type) {
        case "error":
            return [expr];
        case "binary-operator":
            return [...extractErrors(expr.left), ...extractErrors(expr.right)];
        case "property-access":
        case "unary-operator":
            return extractErrors(expr.of);
        case "call":
            return [...extractErrors(expr.of), ...expr.parameters.flatMap(extractErrors)];
        case "conditional":
            return [...extractErrors(expr.condition), ...extractErrors(expr.ifTrue), ...extractErrors(expr.ifFalse)];
        default:
            return [];
    }
}

/**
 * Search for inner-most expression in the expression tree
 *
 * This may be used for providing contextual suggestion or documentations based on cursor position (eg: when the cursor
 * is hovering on variable or primitive).
 *
 * @param expr Expression to search
 * @param pos The text position in the input
 */
export function expressionAtPosition(expr: Expression, pos: number): Expression | null {
    let inner: Expression | null = null;

    switch (expr.type) {
        case "unary-operator":
        case "property-access": {
            if ((inner = expressionAtPosition(expr.of, pos)) != null) return inner;
            break;
        }

        case "binary-operator": {
            if ((inner = expressionAtPosition(expr.left, pos)) != null) return inner;
            if ((inner = expressionAtPosition(expr.right, pos)) != null) return inner;
            break;
        }

        case "call": {
            if ((inner = expressionAtPosition(expr.of, pos)) != null) return inner;

            for (const parameter of expr.parameters) {
                if ((inner = expressionAtPosition(parameter, pos)) != null) return inner;
            }

            break;
        }

        case "conditional": {
            if ((inner = expressionAtPosition(expr.condition, pos))) return inner;
            if ((inner = expressionAtPosition(expr.ifTrue, pos))) return inner;
            if ((inner = expressionAtPosition(expr.ifFalse, pos))) return inner;
            break;
        }

        default:
            break;
    }

    return pos >= expr.start && pos < expr.end ? expr : null;
}
