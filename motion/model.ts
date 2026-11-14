/**
 * Module modeling interfaces
 *
 * @module
 */

import type * as annotation from "./annotation.ts";

/**
 * Module model
 *
 * All projects in the editor are packages, which are basically gzipped tarballs that consists of modules, assets and
 * package index describing the package (similar to jsr). However, in order to use the elements exported from the
 * projects, the package must be given an identifier, usually inside package index or manually choosen by user when
 * adding the package to the editor's local registry.
 */
export interface Module {
    /**
     * Element table
     *
     * Module element consists of types, functions and components. Elements can be imported from other modules or
     * declared inside current module. Elements are referenced by an ordinal, which is an integer indexing to this
     * element table.
     */
    readonly elementTable: readonly Element[];

    /**
     * Exported elements
     *
     * This is a mapping from exported name to element ordinal.
     */
    readonly exports: Readonly<Record<string, number>>;
}

export type Element =
    | ImportElement
    | Function
    | Struct
    | Variant
    | Component;

/**
 * Import element frmo other module
 */
export interface ImportElement {
    readonly kind: "import";

    /**
     * Module identifier
     *
     * The module identifier is just a description for embedder to query, resolve and load the module. A single module
     * can have multiple identifiers, and each identifier can only refer to a single module. The format of module
     * identifier is up to embedder to define.
     */
    readonly module: string;

    /**
     * Export name of exported element
     */
    readonly name: string;
}

interface LocalElement<K extends string> {
    readonly kind: K;
    readonly annotations: readonly annotation.Annotation[];
}

/**
 * Function element
 */
export interface Function extends LocalElement<"function"> {
    readonly typeParams: readonly TypeParameter[];
    readonly inputs: readonly FunctionInput[];
    readonly returnType: Type;
    readonly expression: Expression;
}

export interface TypeParameter {
    readonly annotations: readonly annotation.Annotation[];
}

export interface FunctionInput {
    readonly annotations: readonly annotation.Annotation[];
    readonly type: Type;
}

interface TypeDecl<T extends string> extends LocalElement<T> {
    readonly typeParams: readonly TypeParameter[];
    readonly methods: Readonly<Record<string, Method>>;
}

export interface Method {
    readonly annotations: readonly annotation.Annotation[];
    readonly typeParams: readonly TypeParameter[];
    readonly inputs: readonly FunctionInput[];
    readonly returnType: Type;
    readonly expression: Expression;
}

/**
 * Struct element
 */
export interface Struct extends TypeDecl<"struct"> {
    readonly fields: Readonly<Record<string, Field>>;
}

export interface Field {
    readonly annotations: readonly annotation.Annotation[];
    readonly type: Type;
}

/**
 * Variant element
 */
export interface Variant extends TypeDecl<"variant"> {
    readonly options: Readonly<Record<string, Option>>;
    readonly default: string;
}

export interface Option {
    readonly annotations: readonly annotation.Annotation[];
    readonly type: Type | null;
}

/**
 * Component element
 */
export interface Component extends LocalElement<"component"> {
    readonly typeParams: readonly TypeParameter[];
    readonly parameters: Readonly<Record<string, Parameter>>;
    readonly slots: Readonly<Record<string, Slot>>;
    readonly content: Fragment;
}

/**
 * Component parameter
 *
 * A parameter in component is like a lambda function that the component can call to get value. Most of the time, the
 * parameter have no inputs, which makes it effectively a simple input value. Some parmaeters may have inputs, which may
 * be called by the component, usually multiple times, with each call having (potentially) different set of inputs.
 */
export interface Parameter {
    readonly annotations: readonly annotation.Annotation[];
    readonly inputs: readonly FunctionInput[];
    readonly returnType: Type;
    readonly fallback: Expression;
}

/**
 * Component slot
 *
 * Slots are "injection points" for parent object to inject some objects to children's tree. It is like parameter, but
 * have no return values and the default behavior is to do nothing.
 */
export interface Slot {
    readonly annotations: readonly annotation.Annotation[];
    readonly inputs: readonly FunctionInput[];
}

export type Fragment = readonly Object[];
export type Object =
    | ComponentObject
    | ScopeObject
    | SlotObject;

interface ObjectBase<T extends string> {
    readonly kind: T;
    readonly annotations: readonly annotation.Annotation[];
}

/**
 * Render a component as object
 */
export interface ComponentObject extends ObjectBase<"component"> {
    readonly componentOrdinal: number;
    readonly typeParams: readonly Type[];
    readonly parameters: Readonly<Record<string, Expression>>;
    readonly slots: Readonly<Record<string, Fragment>>;
}

/**
 * Make a scope
 *
 * Unlike expression scope where variables can be lazily initialized, component scope must initialize all variables
 * before any objects can be rendered. Also, all variables in component scope are read-only after initialized, similar
 * to `let` in scope expression.
 *
 * The expressions in {@link ComponentVariable.expression} are evaluated in parent scope, while the content inside
 * {@link ScopeObject.content} are rendered in child scope.
 */
export interface ScopeObject extends ObjectBase<"scope"> {
    readonly variables: readonly ComponentVariable[];
    readonly content: Fragment;
}

export interface ComponentVariable {
    readonly type: Type;
    readonly expression: Expression;
}

/**
 * Render the slot
 */
export interface SlotObject extends ObjectBase<"slot"> {
    readonly name: string;
    readonly inputs: readonly Expression[];
}

/**
 * Expression
 */
export type Expression =
    | DefaultExpression
    | ConstExpression<"number", number>
    | ConstExpression<"boolean", boolean>
    | ConstExpression<"string", string>
    | ArrayExpression
    | StructExpression
    | FieldExpression
    | VariantExpression
    | FunctionExpression
    | MethodExpression
    | VariableExpression
    | MatchExpression
    | ScopeExpression
    | ParameterExpression;

/**
 * Default value (zero-value) expression
 *
 * Produce default value based on expected type. It can be used on places that requires type parameter, such as `T` or
 * `Array<T>`.
 *
 * Can be used on any expected type.
 */
export interface DefaultExpression {
    readonly kind: "default";
}

/**
 * Constant expression
 *
 * An expression that always produce a constant value.
 *
 * Expected type depends on {@link ConstExpression.kind}:
 *
 * - `number`: `number` from `builtin:core`
 * - `boolean`: `boolean` from `builtin:core`
 * - `string`: `string` from `builtin:core`
 */
export interface ConstExpression<T extends string, V> {
    readonly kind: T;
    readonly value: V;
}

/**
 * Array literal expression
 *
 * Expected type must be an array (which is `runtime.coreModule.Array`).
 */
export interface ArrayExpression {
    readonly kind: "array";
    readonly values: readonly Expression[];
}

/**
 * Struct construct expression
 *
 * Construct a new struct value.
 *
 * Expected type must be a struct (so that the module loader can know the fields).
 */
export interface StructExpression {
    readonly kind: "struct";
    readonly fields: Readonly<Record<string, Expression>>;
}

/**
 * Grab value from a struct field
 *
 * Expected type must be the type of the struct field.
 */
export interface FieldExpression {
    readonly kind: "field";

    /**
     * Instance's value type
     */
    readonly type: Type;
    readonly target: Expression;
    readonly fieldName: string;
}

/**
 * Variant construct expression
 *
 * Construct a new variant value.
 *
 * Expected type must be a variant (so that the module loader can know the options and the type of option's data).
 */
export interface VariantExpression {
    readonly kind: "variant";
    readonly option: string;
    readonly data: Expression | null;
}

/**
 * Call the function
 *
 * Expected type must match the function's return type.
 */
export interface FunctionExpression {
    readonly kind: "function";

    /**
     * Function index in element table
     *
     * The element referenced from element table by this ordinal must be a function.
     */
    readonly functionOrdinal: number;

    /**
     * List of inputs for type parameters
     *
     * This will be used to resolve the input parameter's types and return type.
     */
    readonly typeParams: readonly Type[];

    /**
     * Input parameters for function
     */
    readonly inputs: readonly Expression[];
}

/**
 * Call the method on instance
 *
 * Expected type must match the method's return type.
 */
export interface MethodExpression {
    readonly kind: "method";
    readonly type: Type;
    readonly target: Expression;
    readonly methodName: string;
    readonly typeParams: readonly Type[];
    readonly inputs: readonly Expression[];
}

/**
 * Grab value from variable table
 *
 * The variable table is constructed by concatenating instance value (if calling the method), function/method inputs. If
 * there are scopes, entering the scope would "unshift" and leaving the scope would "shift" the variable table. The
 * variable ordinal is the index to that variable table. That means the ordinal would represents the "distance" from the
 * expression to the variable (the lower the ordinal, the closer to the variable declaration).
 *
 * Expected type must match the variable's type.
 */
export interface VariableExpression {
    readonly kind: "variable";
    readonly variableOrdinal: number;
}

/**
 * Pattern matching expression
 *
 * Expected type must be a variant.
 */
export interface MatchExpression {
    readonly kind: "match";
    readonly type: Type;
    readonly target: Expression;

    /**
     * Match arms for options
     *
     * If the option have data associated with it, the option data will be prepended to the variable table of
     * expression's scope.
     */
    readonly options: Readonly<Record<string, Expression>>;

    /**
     * Match arm for other options
     */
    readonly fallback: Expression;
}

/**
 * Make a scope, run the statements and evaluate return expression
 *
 * The {@link ScopeExpression.statements} run the procedure inside the new scope, and the {@link ScopeExpression.return}
 * is the expression that will be evaluated inside the scope.
 *
 * Expected type for {@link ScopeExpression} is the same as expected type for this scope expression.
 */
export interface ScopeExpression {
    readonly kind: "scope";
    readonly variables: readonly Variable[];
    readonly statements: readonly Statement[];
    readonly return: Expression;
}

/**
 * Get value from component parameter
 *
 * Only usable inside component context.
 */
export interface ParameterExpression {
    readonly kind: "parameter";
    readonly name: string;
    readonly inputs: readonly Expression[];
}

/**
 * Variable declaration
 *
 * Variable mode controls how the variable can be assigned.
 *
 * - `var`: Variable can be assigned multiple times;
 * - `let`: Variable can only be assigned once.
 */
export interface Variable {
    readonly mode: "var" | "let";
    readonly type: Type;
}

export type Statement =
    | AssignStatement
    | LoopStatement
    | LoopControlStatement;

/**
 * Assign value to variable
 */
export interface AssignStatement {
    readonly kind: "assign";
    readonly variableOrdinal: number;
    readonly expression: Expression;
}

/**
 * Loop the statements
 */
export interface LoopStatement {
    readonly kind: "loop";
    readonly statements: readonly Statement[];
}

/**
 * Control loop
 *
 * - `break`: Break the loop
 * - `continue`: Continue to next iteration, skipping the rest
 */
export interface LoopControlStatement {
    readonly kind: "break" | "continue";
}

/**
 * Represent a value type
 */
export type Type =
    | ParameterizedType
    | FreshType;

export interface ParameterizedType {
    readonly kind: "parameterized";

    /**
     * Parameter index in type parameter table
     *
     * The type parameter table is a list of types, which is created depending on where {@link Type} is used:
     *
     * - Inside function: list of function-level type parameters
     * - Inside component: list of component-level type parameters
     * - Inside struct field or variant option: list of type-level type parameters
     * - Inside type declaration's method: a concatenated list of type-level and method-level type parameters
     */
    readonly parameterOrdinal: number;
}

export interface FreshType {
    readonly kind: "fresh";

    /**
     * Type declaration index in element table
     *
     * The element referenced from element table by this ordinal must be a type declaration.
     */
    readonly declOrdinal: number;

    /**
     * List of inputs for type parameters
     *
     * If the type declaration have type parameters, this list will be the input types for the parameters.
     */
    readonly typeParams: readonly Type[];
}
