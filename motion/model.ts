/**
 * Module modeling interfaces
 *
 * @module
 */

import type * as annotation from "./annotation.ts";

export interface Module {
    readonly elementTable: readonly Element[];
    readonly exports: Readonly<Record<string, number>>;
}

export type Element =
    | ImportElement
    | ImportAsset
    | Component;

export enum ElementKind {
    // 0x00 to 0x0F: System elements
    Reserved = 0x00,
    ImportElement = 0x01,
    ImportAsset = 0x02,
    // 0x10 to 0x1F: Type declarations
    // Struct = 0x10,
    // Variant = 0x11,
    // 0x20 to 0x3F: Other declarations
    // Function = 0x20,
    Component = 0x21,
    // 0x40 to 0x7F: Reserved
    // 0x80 to 0xFF: Reserved
}

/**
 * Import an element from another module
 */
export interface ImportElement {
    readonly kind: ElementKind.ImportElement;
    readonly module: string;
    readonly name: string;
}

/**
 * Import asset in _current_ module
 */
export interface ImportAsset {
    readonly kind: ElementKind.ImportAsset;
    readonly name: string;
}

interface LocalElement {
    readonly annotations: readonly annotation.Annotation[];
}

/**
 * Type parameter declaration
 */
export interface TypeParameter {
    readonly annotations: readonly annotation.Annotation[];
}

/**
 * Function, parameter or slot input
 */
export interface Input {
    readonly annotations: readonly annotation.Annotation[];
    readonly type: Type;
}

export type Type =
    | ConcreteType
    | ParameterizedType;

export enum TypeKind {
    Reserved = 0x00,
    Concrete = 0x01,
    Parameterized = 0x02,
}

export interface ConcreteType {
    readonly kind: TypeKind.Concrete;
    readonly typeOrdinal: number;
    readonly parameters: readonly Type[];
}

export interface ParameterizedType {
    readonly kind: TypeKind.Parameterized;
    readonly paramOrdinal: number;
}

/**
 * Component
 */
export interface Component extends LocalElement {
    readonly kind: ElementKind.Component;
    readonly typeParams: readonly TypeParameter[];
    readonly parameters: Readonly<Record<string, Parameter>>;
    readonly slots: Readonly<Record<string, Slot>>;
    readonly content: readonly ComponentChild[];
}

/**
 * Component parameter
 */
export interface Parameter {
    readonly annotations: readonly annotation.Annotation[];
    readonly inputs: readonly Input[];
    readonly output: Type;
    readonly fallback: Expression;
}

/**
 * Component slot
 */
export interface Slot {
    readonly annotations: readonly annotation.Annotation[];
    readonly inputs: readonly Input[];
}

export enum ComponentChildType {
    Reserved = 0x00,
    Object = 0x01,
    UseSlot = 0x02,
}

export type ComponentChild =
    | Object
    | UseSlot;

/**
 * Object inside a component
 */
export interface Object {
    readonly type: ComponentChildType.Object;
    readonly componentOrdinal: number;
    readonly typeParams: readonly Type[];
    readonly parameters: Readonly<Record<string, Expression>>;
    readonly slots: Readonly<Record<string, readonly ComponentChild[]>>;
}

export interface UseSlot {
    readonly type: ComponentChildType.UseSlot;
    readonly slot: string;
    readonly inputs: readonly Expression[];
}

export type Expression =
    | DefaultExpr
    | VariableGetExpr
    | PatternMatchExpr
    | FunctionInvokeExpr
    | ParameterInvokeExpr
    | NumberExpr
    | BooleanExpr
    | StringExpr
    | ArrayExpr
    | StructExpr
    | VariantExpr
    | AssetExpr;

export enum ExpressionKind {
    Reserved = 0x00,

    // System
    Default = 0x01,
    VariableGet = 0x02,
    PatternMatch = 0x03,
    FunctionInvoke = 0x04,
    ParameterInvoke = 0x05,
    // MethodInvoke = 0x06,

    // Constructors
    Number = 0x10,
    Boolean = 0x11,
    String = 0x12,
    Array = 0x13,
    Struct = 0x14,
    Variant = 0x15,
    Asset = 0x16,
}

/**
 * Produce default value
 *
 * Default can be used anywhere that is expecting an expression, including places whose type is parameterized.
 */
export interface DefaultExpr {
    readonly kind: ExpressionKind.Default;
}

export interface VariableGetExpr {
    readonly kind: ExpressionKind.VariableGet;
    readonly variableOrdinal: number;
}

export interface PatternMatchExpr {
    readonly kind: ExpressionKind.PatternMatch;
    readonly targetType: Type;
    readonly target: Expression;
    readonly cases: Readonly<Record<string, Expression>>;
    readonly fallback: Expression;
}

export interface FunctionInvokeExpr {
    readonly kind: ExpressionKind.FunctionInvoke;
    readonly functionOrdinal: number;
    readonly typeParams: readonly Type[];
    readonly inputs: readonly Expression[];
}

export interface ParameterInvokeExpr {
    readonly kind: ExpressionKind.ParameterInvoke;
    readonly parameter: string;
    readonly inputs: readonly Expression[];
}

export interface NumberExpr {
    readonly kind: ExpressionKind.Number;
    readonly value: number;
}

export interface BooleanExpr {
    readonly kind: ExpressionKind.Boolean;
    readonly value: boolean;
}

export interface StringExpr {
    readonly kind: ExpressionKind.String;
    readonly value: string;
}

export interface ArrayExpr {
    readonly kind: ExpressionKind.Array;
    readonly elements: readonly Expression[];
}

export interface StructExpr {
    readonly kind: ExpressionKind.Struct;
    readonly fields: Readonly<Record<string, Expression>>;
}

export interface VariantExpr {
    readonly kind: ExpressionKind.Variant;
    readonly option: string;
    readonly data: Expression | null;
}

export interface AssetExpr {
    readonly kind: ExpressionKind.Asset;
    readonly assetOrdinal: number;
}
