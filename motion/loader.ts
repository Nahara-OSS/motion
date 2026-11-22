import type * as annotation from "./annotation.ts";
import type * as context from "./context.ts";
import { array, asset, boolean, number, string } from "./core.ts";
import { dbg, dbgName } from "./debug.ts";
import * as model from "./model.ts";
import * as runtime from "./runtime.ts";

export interface LoadModuleOptions {
    readonly source: model.Module;
    readonly resolve: (module: string, name: string) => runtime.Element;
    readonly asset: (name: string) => Blob;
}

export interface LoadModuleOptionsAsync {
    readonly source: model.Module;
    readonly resolve: (module: string, name: string) => PromiseLike<runtime.Element> | runtime.Element;
    readonly asset: (name: string) => PromiseLike<Blob> | Blob;
}

export interface LoadedModule {
    readonly elementTable: readonly runtime.Element[];
    readonly exports: Readonly<Record<string, runtime.Element>>;
}

/**
 * Load module from source
 *
 * The sync version is for when the dependencies are known and already loaded ahead of time, while the async version
 * should be used whenever possible.
 *
 * @param options Module load options
 * @returns Loaded module
 */
export function loadModule(options: LoadModuleOptions): LoadedModule {
    const { source, resolve, asset } = options;
    const linkable: Linkable[] = [];
    const elementTable = source.elementTable.map((e) => {
        switch (e.kind) {
            case model.ElementKind.ImportElement: {
                const { module, name } = e;
                return resolve(module, name);
            }

            case model.ElementKind.ImportAsset: {
                const { name } = e;
                return new Asset(asset(name));
            }

            default: {
                const element = loadNonImportElement(e);
                linkable.push(element);
                return element;
            }
        }
    });
    return linkModule(elementTable, source.exports, linkable);
}

/**
 * Async version of {@link loadModule}
 *
 * @param options Module load options
 * @returns Loaded module
 */
export async function loadModuleAsync(options: LoadModuleOptionsAsync): Promise<LoadedModule> {
    const { source, resolve, asset } = options;
    const linkable: Linkable[] = [];
    const elementTable = await Promise.all(source.elementTable.map(async (e) => {
        switch (e.kind) {
            case model.ElementKind.ImportElement: {
                const { module, name } = e;
                return await resolve(module, name);
            }

            case model.ElementKind.ImportAsset: {
                const { name } = e;
                return new Asset(await asset(name));
            }

            default: {
                const element = loadNonImportElement(e);
                linkable.push(element);
                return element;
            }
        }
    }));
    return linkModule(elementTable, source.exports, linkable);
}

function loadNonImportElement(source: model.Element): runtime.Element & Linkable {
    switch (source.kind) {
        case model.ElementKind.ImportElement:
        case model.ElementKind.ImportAsset: {
            throw new Error("Linking should be done in module loader");
        }

        case model.ElementKind.Component: {
            const component = new Component(source);
            return component;
        }

        default: {
            throw new Error(`Illegal element type ID: ${(source as model.Element)?.kind ?? "<???>"}`);
        }
    }
}

function linkModule(
    elementTable: runtime.Element[],
    exports: Readonly<Record<string, number>>,
    linkables: Linkable[],
): LoadedModule {
    for (const linkable of linkables) linkable[LinkQueryableInfo](elementTable);
    for (const linkable of linkables) linkable[LinkImplementation](elementTable);

    return {
        elementTable,
        exports: Object.fromEntries(
            Object.entries(exports).map(([key, ordinal]) => {
                if (ordinal < 0 || ordinal >= elementTable.length) {
                    throw new Error(`Element index ${ordinal} is out of bounds: [0; ${elementTable.length})`);
                }

                return [key, elementTable[ordinal]] as const;
            }),
        ),
    };
}

interface Linkable {
    [LinkQueryableInfo](elementTable: readonly runtime.Element[]): void;
    [LinkImplementation](elementTable: readonly runtime.Element[]): void;
}

const LinkQueryableInfo = Symbol();
const LinkImplementation = Symbol();

class Asset extends runtime.Asset {
    override annotations: readonly annotation.Annotation[] = [];

    constructor(public readonly data: Blob) {
        super();
    }
}

class Component extends runtime.Component implements Linkable {
    #source: model.Component;
    #parameters: Record<string, runtime.Parameter> | null = null;
    #fallbacks: Record<string, Expression> | null = null;
    #content: readonly ((options: RenderOptions) => Promise<void>)[] | null = null;
    #slots: Record<string, runtime.Slot> | null = null;

    override annotations: readonly annotation.Annotation[];
    override typeParams: readonly runtime.TypeParameter[];

    constructor(source: model.Component) {
        super();
        this.#source = source;
        this.annotations = source.annotations;
        this.typeParams = source.typeParams.map(({ annotations }) => new runtime.TypeParameter(annotations));
    }

    override get parameters(): Readonly<Record<string, runtime.Parameter>> {
        if (this.#parameters == null) throw new Error("Not linked");
        return this.#parameters;
    }

    override get slots(): Readonly<Record<string, runtime.Slot>> {
        if (this.#slots == null) throw new Error("Not linked");
        return this.#slots;
    }

    [LinkQueryableInfo](elementTable: readonly runtime.Element[]): void {
        this.#parameters = Object.fromEntries(
            Object.entries(this.#source.parameters).map(([name, { annotations, inputs, output }]) => {
                const paramInputs = inputs.map((source) => (loadInput({
                    source,
                    elementTable,
                    typeParams: this.typeParams,
                })));

                const outputType = loadType({
                    source: output,
                    elementTable,
                    typeParams: this.typeParams,
                });

                return [name, {
                    annotations,
                    inputs: paramInputs,
                    outputType,
                }];
            }),
        );

        this.#slots = Object.fromEntries(
            Object.entries(this.#source.slots).map(([name, { annotations, inputs }]) => [name, {
                annotations,
                inputs: inputs.map((source) => (loadInput({
                    source,
                    elementTable,
                    typeParams: this.typeParams,
                }))),
            }]),
        );
    }

    [LinkImplementation](elementTable: readonly runtime.Element[]): void {
        this.#fallbacks = Object.fromEntries(
            Object.entries(this.#source.parameters).map(([name, { fallback }]) => {
                const { outputType, inputs } = this.#parameters![name];
                const expr = loadExpression({
                    source: fallback,
                    expect: outputType,
                    elementTable: elementTable,
                    typeParams: this.typeParams,
                    variables: inputs.map(({ inputType }) => ({
                        dataType: inputType,
                        origin: VariableOrigin.ParameterInput,
                        writable: true,
                        initialized: true,
                    })),
                    parameters: {},
                });
                return [name, expr];
            }),
        );

        this.#content = this.#source.content.map((source) => (Component.loadChild({
            source,
            elementTable,
            typeParams: this.typeParams,
            variables: [],
            parameters: Object.fromEntries(
                Object.entries(this.#parameters!).map(([name, { inputs, outputType }]) => [name, {
                    inputs,
                    output: outputType,
                }]),
            ),
            slots: Object.fromEntries(
                Object.entries(this.#slots!).map(([name, { inputs }]) => [name, {
                    inputs,
                }]),
            ),
        })));
    }

    override async render(
        typeParams: runtime.RuntimeType[],
        context: context.ContextMap,
        // deno-lint-ignore no-explicit-any
        parameters: Readonly<Partial<Record<string, (...inputs: any[]) => any>>>,
        slots: Readonly<
            // deno-lint-ignore no-explicit-any
            Partial<Record<string, (context: context.ContextMap, ...inputs: any[]) => PromiseLike<void> | void>>
        >,
    ): Promise<void> {
        if (this.#parameters == null) throw new Error("Not linked");
        if (this.#slots == null) throw new Error("Not linked");
        if (this.#fallbacks == null) throw new Error("Not linked");
        if (this.#content == null) throw new Error("Not linked");

        for (const child of this.#content) {
            await child({
                typeParams,
                context,
                invokeParameter: (parameter, inputs) => {
                    const fn = parameters[parameter];
                    if (fn != null) return fn(...inputs);
                    return this.#fallbacks![parameter]({
                        typeParams,
                        invokeParameter: () => null,
                        getVar: (o) => inputs[o],
                        setVar: () => {},
                    });
                },
                renderSlot: async (slot, context, inputs) => {
                    const fn = slots[slot];
                    if (fn != null) await fn(context, ...inputs);
                },
                getVar: () => null,
                setVar: () => {},
            });
        }
    }

    static loadChild(options: {
        readonly source: model.ComponentChild;
        readonly elementTable: readonly runtime.Element[];
        readonly typeParams: readonly runtime.TypeParameter[];
        readonly variables: readonly VariableOptions[];
        readonly parameters: Readonly<Record<string, ParameterOptions>>;
        readonly slots: Readonly<Record<string, SlotOptions>>;
    }): (options: RenderOptions) => Promise<void> {
        const { source, elementTable, typeParams: typeParamsDecl, variables, slots } = options;

        switch (source.type) {
            case model.ComponentChildType.Object: {
                const { componentOrdinal: ordinal } = source;

                if (ordinal < 0 || ordinal >= elementTable.length) {
                    throw new Error(`Element ordinal ${ordinal} is out of bounds: [0; ${elementTable.length})`);
                }

                const component = elementTable[ordinal];

                if (!(component instanceof runtime.Component)) {
                    throw new Error(dbg`Expecting element ${ordinal} to be component, found ${component}`);
                }

                const targetTypes = source.typeParams.map((source) => {
                    const type = loadType({ source, elementTable, typeParams: typeParamsDecl });
                    const factory = typeToRuntimeFactory(type, typeParamsDecl);
                    return { type, factory };
                });

                const parameters = Object.entries(source.parameters).map(([name, source]) => {
                    if (!(name in component.parameters)) throw new Error(dbg`No parameter ${name} in ${component}`);
                    const paramInfo = component.parameters[name];
                    const expr = loadExpression({
                        source,
                        expect: translateDomain(
                            component.typeParams,
                            paramInfo.outputType,
                            targetTypes.map(({ type }) => type),
                            (decl, typeParams) => new runtime.ConcreteType(decl, typeParams),
                        ),
                        elementTable,
                        typeParams: typeParamsDecl,
                        parameters: options.parameters,
                        variables: [
                            ...paramInfo.inputs.map(({ inputType }) => ({
                                dataType: inputType,
                                origin: VariableOrigin.ParameterInput,
                                initialized: true,
                                writable: false,
                            })),
                            ...variables,
                        ],
                    });
                    return [name, { expr }] as const;
                });

                const slots = Object.entries(source.slots).map(([name, content]) => {
                    if (!(name in component.slots)) throw new Error(dbg`No slot ${name} in ${component}`);
                    const slotInfo = component.slots[name];
                    const fragment = content.map((source) => (Component.loadChild({
                        ...options,
                        source,
                        variables: [
                            ...slotInfo.inputs.map(({ inputType }) => ({
                                dataType: inputType,
                                origin: VariableOrigin.ParameterInput,
                                initialized: true,
                                writable: false,
                            })),
                            ...variables,
                        ],
                    })));
                    return [name, fragment] as const;
                });

                return async (options) => {
                    const { context, typeParams, invokeParameter, getVar, setVar } = options;
                    await component.render(
                        targetTypes.map(({ factory }) => factory(typeParams)),
                        context,
                        Object.fromEntries(parameters.map(([name, { expr }]) => {
                            // deno-lint-ignore no-explicit-any
                            const fn = (...inputs: any[]) =>
                                expr({
                                    typeParams,
                                    invokeParameter,
                                    getVar: (o) => {
                                        if (o < inputs.length) return inputs[o];
                                        return getVar(o - inputs.length);
                                    },
                                    setVar: (o, v) => {
                                        if (o < inputs.length) return;
                                        setVar(o - inputs.length, v);
                                    },
                                });
                            return [name, fn];
                        })),
                        Object.fromEntries(slots.map(([name, fragment]) => {
                            // deno-lint-ignore no-explicit-any
                            return [name, async (context: context.ContextMap, inputs: any[]) => {
                                for (const child of fragment) {
                                    await child({
                                        ...options,
                                        context,
                                        getVar: (o) => {
                                            if (o < inputs.length) return inputs[o];
                                            return getVar(o - inputs.length);
                                        },
                                        setVar: (o, v) => {
                                            if (o < inputs.length) return;
                                            setVar(o - inputs.length, v);
                                        },
                                    });
                                }
                            }];
                        })),
                    );
                };
            }

            case model.ComponentChildType.UseSlot: {
                const { slot } = source;
                if (!(slot in slots)) throw new Error(dbg`No slot ${slot} in current scope`);

                const inputs = source.inputs.map((source, i) => (loadExpression({
                    source,
                    expect: slots[slot].inputs[i],
                    elementTable,
                    typeParams: typeParamsDecl,
                    parameters: options.parameters,
                    variables,
                })));

                return async ({ context, renderSlot, typeParams, invokeParameter, getVar, setVar }) => {
                    await renderSlot(
                        slot,
                        context,
                        inputs.map((fn) => (fn({
                            typeParams,
                            invokeParameter,
                            getVar,
                            setVar,
                        }))),
                    );
                };
            }
        }
    }
}

interface RenderOptions {
    readonly context: context.ContextMap;
    readonly typeParams: readonly runtime.RuntimeType[];
    // deno-lint-ignore no-explicit-any
    invokeParameter(parameter: string, inputs: any[]): any;
    // deno-lint-ignore no-explicit-any
    renderSlot(slot: string, context: context.ContextMap, inputs: any[]): Promise<void>;
    // deno-lint-ignore no-explicit-any
    getVar(ordinal: number): any;
    // deno-lint-ignore no-explicit-any
    setVar(ordinal: number, value: any): void;
}

function loadType(options: {
    readonly source: model.Type;
    readonly elementTable: readonly runtime.Element[];
    readonly typeParams: readonly runtime.TypeParameter[];
}): runtime.Type {
    const { source, elementTable, typeParams } = options;

    switch (source.kind) {
        case model.TypeKind.Concrete: {
            if (source.typeOrdinal < 0 || source.typeOrdinal >= elementTable.length) {
                throw new Error(`Element ordinal ${source.typeOrdinal} is out of bounds: [0; ${elementTable.length})`);
            }

            const element = elementTable[source.typeOrdinal];

            if (!(element instanceof runtime.TypeDecl)) {
                throw new Error(dbg`Expecting element ${source.typeOrdinal} to be type, found ${element}`);
            }

            return new runtime.ConcreteType(
                element,
                source.parameters.map((source) => (loadType({ ...options, source }))),
            );
        }

        case model.TypeKind.Parameterized: {
            if (source.paramOrdinal < 0 || source.paramOrdinal >= typeParams.length) {
                throw new Error(`Type parameter #${source.paramOrdinal} is out of bounds: [0; ${typeParams.length}]`);
            }

            return typeParams[source.paramOrdinal];
        }
    }
}

function typeToRuntimeFactory(
    type: runtime.Type,
    typeParamsDecl: readonly runtime.TypeParameter[],
): (typeParams: readonly runtime.RuntimeType[]) => runtime.RuntimeType {
    if (type instanceof runtime.TypeParameter) {
        const i = typeParamsDecl.indexOf(type);
        if (i == -1) throw new Error("Provided type is parameterized, but it does not exists in declaration list");
        return (typeParams) => typeParams[i];
    }

    if (type instanceof runtime.ConcreteType) {
        const list = type.typeParams.map((x) => typeToRuntimeFactory(x, typeParamsDecl));
        return (typeParams) => new runtime.RuntimeType(type.declaration, list.map((fn) => fn(typeParams)));
    }

    throw new Error("Illegal build-time type information");
}

function compareType(a: runtime.Type, b: runtime.Type): boolean {
    if (a == b) return true;

    if (a instanceof runtime.ConcreteType && b instanceof runtime.ConcreteType) {
        if (a.declaration != b.declaration) return false;
        if (a.typeParams.length != b.typeParams.length) return false;
        return a.typeParams.every((x, i) => compareType(x, b.typeParams[i]));
    }

    return false;
}

/**
 * Translate type domain
 *
 * This function translate the domain from source domain to current domain. For example: if the current domain is
 * `<A, B, C>`, source is `Pair<X, Y>` and the domain translation is `X => A; Y => B`, the result type will become
 * `Pair<A, B>`.
 *
 * ```
 * translateDomain(
 *     [X, Y],
 *     new ConcreteType(Pair, [X, Y]),
 *     [A, B],
 *     merge
 * ) // == new ConcreteType(Pair, [A, B])
 * ```
 *
 * @param typeParams Declared source type parameters
 * @param source Source type
 * @param targets Target type parameters
 * @param merge Merging function
 * @returns Target type
 */
function translateDomain<T>(
    typeParams: readonly runtime.TypeParameter[],
    source: runtime.Type,
    targets: readonly T[],
    merge: (decl: runtime.TypeDecl, typeParams: readonly T[]) => T,
): T {
    if (source instanceof runtime.TypeParameter) {
        const i = typeParams.indexOf(source);
        if (i == -1) throw new Error(`Source type is not includedin provided type parameter declaration list`);
        return targets[i];
    }

    if (source instanceof runtime.ConcreteType) {
        const decl = source.declaration;
        const list = source.typeParams.map((source) => translateDomain(typeParams, source, targets, merge));
        return merge(decl, list);
    }

    throw new Error(`Illegal build-time type information`);
}

function loadInput(options: {
    readonly source: model.Input;
    readonly elementTable: readonly runtime.Element[];
    readonly typeParams: readonly runtime.TypeParameter[];
}): runtime.Input {
    const { source: { annotations, type }, elementTable, typeParams } = options;
    return {
        annotations,
        inputType: loadType({ source: type, elementTable, typeParams }),
    };
}

export interface LoadExpressionOptions {
    readonly source: model.Expression;
    readonly expect: runtime.Type;
    readonly elementTable: readonly runtime.Element[];
    readonly typeParams: readonly runtime.TypeParameter[];
    readonly variables: readonly VariableOptions[];
    readonly parameters: Readonly<Record<string, ParameterOptions>>;
}

export interface VariableOptions {
    readonly dataType: runtime.Type;
    readonly origin: VariableOrigin;
    readonly writable: boolean;
    readonly initialized: boolean;
}

export interface ParameterOptions {
    readonly inputs: readonly runtime.Type[];
    readonly output: runtime.Type;
}

export interface SlotOptions {
    readonly inputs: readonly runtime.Type[];
}

export enum VariableOrigin {
    General,
    FunctionInput,
    Reserved0, // for method's "self" if we choose to add this feature later
    Reserved1, // for method's input if we choose to add this feature later
    ParameterInput,
    SlotInput,
    Local,
    PatternMatch,
}

const varOriginNames: Record<VariableOrigin, string> = {
    [VariableOrigin.General]: "general",
    [VariableOrigin.FunctionInput]: "function input",
    [VariableOrigin.Reserved0]: "method instance",
    [VariableOrigin.Reserved1]: "method input",
    [VariableOrigin.ParameterInput]: "parameter input",
    [VariableOrigin.SlotInput]: "slot input",
    [VariableOrigin.Local]: "local variable",
    [VariableOrigin.PatternMatch]: "pattern matcher",
};

function dbgVariableInfo(options: VariableOptions): string {
    let result = `${varOriginNames[options.origin]}: ${dbgName(options.dataType)}`;
    if (options.writable) result = "mutable " + result;
    if (!options.initialized) result = result + " (not initialized)";
    return result;
}

export interface ExpressionOptions {
    readonly typeParams: readonly runtime.RuntimeType[];
    // deno-lint-ignore no-explicit-any
    invokeParameter(parameter: string, inputs: any[]): any;
    // deno-lint-ignore no-explicit-any
    getVar(ordinal: number): any;
    // deno-lint-ignore no-explicit-any
    setVar(ordinal: number, value: any): void;
}

export interface Expression {
    // deno-lint-ignore no-explicit-any
    (options: ExpressionOptions): any;
}

const primitiveMap = {
    [model.ExpressionKind.Number]: number.asType(),
    [model.ExpressionKind.Boolean]: boolean.asType(),
    [model.ExpressionKind.String]: string.asType(),
};

export function loadExpression(options: LoadExpressionOptions): Expression {
    const { source, expect, elementTable, typeParams: typeParamsDecl, variables, parameters } = options;

    switch (source.kind) {
        case model.ExpressionKind.Default: {
            const factory = typeToRuntimeFactory(expect, typeParamsDecl);
            return ({ typeParams }) => factory(typeParams).default();
        }

        case model.ExpressionKind.VariableGet: {
            const { variableOrdinal: ordinal } = source;

            if (ordinal < 0 || ordinal >= variables.length) {
                const s1 = `Variable ordinal ${ordinal} is out of bounds: [0; ${variables.length})`;
                const s2 = `Variable table at this location: [${variables.map(dbgVariableInfo).join(", ")}]`;
                throw new Error(`${s1}; ${s2}`);
            }

            const varInfo = variables[ordinal];

            if (!compareType(expect, varInfo.dataType)) {
                const s1 = dbg`Expect type ${expect}, found ${varInfo.dataType} (${ordinal})`;
                const s2 = `Variable table at this location: [${variables.map(dbgVariableInfo).join(", ")}]`;
                throw new Error(`${s1}; ${s2}`);
            }

            if (!varInfo.initialized) {
                const s1 = dbg`Variable ${ordinal} is not initialized yet`;
                const s2 = `Variable table at this location: [${variables.map(dbgVariableInfo).join(", ")}]`;
                throw new Error(`${s1}; ${s2}`);
            }

            return (options) => options.getVar(ordinal);
        }

        case model.ExpressionKind.PatternMatch: {
            const targetType = loadType({ source: source.targetType, elementTable, typeParams: typeParamsDecl });

            if (!(targetType instanceof runtime.ConcreteType) || !(targetType.declaration instanceof runtime.Variant)) {
                throw new Error(dbg`Target type must be a variant, found ${targetType}`);
            }

            const variant = targetType.declaration;
            const factory = typeToRuntimeFactory(targetType, typeParamsDecl);
            const targetExpr = loadExpression({ ...options, source: source.target, expect: targetType });
            const fallbackExpr = loadExpression({ ...options, source: source.fallback });
            const cases = new Map(
                Object.entries(source.cases).map(([name, source]) => {
                    if (!(name in variant.options)) {
                        throw new Error(dbg`No option ${name} in ${variant}`);
                    }

                    const optionInfo = variant.options[name];
                    const expr = loadExpression({
                        ...options,
                        source,
                        variables: optionInfo.dataType == null ? variables : [
                            {
                                dataType: optionInfo.dataType,
                                origin: VariableOrigin.PatternMatch,
                                initialized: true,
                                writable: false,
                            },
                            ...variables,
                        ],
                    });

                    return [name, { hasData: optionInfo.dataType != null, expr }];
                }),
            );

            return (options) => {
                const target = targetExpr(options);
                const vTypeParams = factory(options.typeParams).typeParams;
                const result = variant.match(vTypeParams, target);
                const matched = cases.get(result.option);
                return matched == null ? fallbackExpr(options) : matched.expr({
                    ...options,
                    getVar: !matched.hasData ? options.getVar : (o) => o == 0 ? result.data : options.getVar(o - 1),
                    setVar: !matched.hasData ? options.setVar : (o, v) => o == 0 ? void 0 : options.setVar(o - 1, v),
                });
            };
        }

        case model.ExpressionKind.FunctionInvoke: {
            const { functionOrdinal: ordinal } = source;

            if (ordinal < 0 || ordinal >= elementTable.length) {
                throw new Error(`Element index ${ordinal} is out of bounds: [0; ${elementTable.length})`);
            }

            const fn = elementTable[ordinal];

            if (!(fn instanceof runtime.Function)) {
                throw new Error(`Expecting element #${ordinal} to be a function, found ${fn.elementTypeName}`);
            }

            if (fn.typeParams.length != source.typeParams.length) {
                const x = fn.typeParams.length;
                const y = source.typeParams.length;
                throw new Error(`Function requires ${x} type parameters, but only ${y} found`);
            }

            if (fn.inputs.length != source.inputs.length) {
                throw new Error(`Function requires ${fn.inputs.length} inputs, but only ${source.inputs.length} found`);
            }

            const targetTypes = source.typeParams.map((source) => {
                const type = loadType({ source, elementTable, typeParams: typeParamsDecl });
                const factory = typeToRuntimeFactory(type, typeParamsDecl);
                return { type, factory };
            });

            const outputType = translateDomain(
                fn.typeParams,
                fn.outputType,
                targetTypes.map(({ type }) => type),
                (decl, typeParams) => new runtime.ConcreteType(decl, typeParams),
            );

            if (!compareType(expect, outputType)) {
                throw new Error(dbg`Expect ${expect}, found ${outputType}`);
            }

            const inputs = source.inputs.map((source, i) => (loadExpression({
                ...options,
                source,
                expect: translateDomain(
                    fn.typeParams,
                    fn.inputs[i].inputType,
                    targetTypes.map(({ type }) => type),
                    (decl, typeParams) => new runtime.ConcreteType(decl, typeParams),
                ),
            })));

            return (options) => {
                const evaluatedInputs = inputs.map((expr) => expr(options));
                const fnTypeParams = targetTypes.map(({ factory }) => factory(options.typeParams));
                fn.invoke(fnTypeParams, ...evaluatedInputs);
            };
        }

        case model.ExpressionKind.ParameterInvoke: {
            const { parameter } = source;

            if (!(parameter in parameters)) {
                throw new Error(dbg`No parameter ${parameter} in current scope`);
            }

            const paramInfo = parameters[parameter];

            if (source.inputs.length != paramInfo.inputs.length) {
                const x = paramInfo.inputs.length;
                const y = source.inputs.length;
                throw new Error(`Parameter requires ${x} inputs, but only ${y} found`);
            }

            if (!compareType(expect, paramInfo.output)) {
                throw new Error(dbg`Expect ${expect}, found ${paramInfo.output}`);
            }

            const inputs = source.inputs.map((source, i) => (loadExpression({
                ...options,
                source,
                expect: paramInfo.inputs[i],
            })));

            return (options) => options.invokeParameter(parameter, inputs.map((fn) => fn(options)));
        }

        case model.ExpressionKind.Number:
        case model.ExpressionKind.Boolean:
        case model.ExpressionKind.String: {
            const found = primitiveMap[source.kind];

            if (!compareType(expect, found)) {
                throw new Error(dbg`Expect type ${expect}, found ${found}`);
            }

            return () => source.value;
        }

        case model.ExpressionKind.Array: {
            if (!(expect instanceof runtime.ConcreteType) || expect.declaration != array) {
                throw new Error(dbg`Expect type ${expect}, found array`);
            }

            const elements = source.elements.map((source) => (loadExpression({
                ...options,
                source,
                expect: expect.typeParams[0],
            })));

            return (options) => elements.map((fn) => fn(options));
        }

        case model.ExpressionKind.Struct: {
            if (!(expect instanceof runtime.ConcreteType) || !(expect.declaration instanceof runtime.Struct)) {
                throw new Error(dbg`Expect type ${expect}, found struct`);
            }

            const struct = expect.declaration;
            const factory = typeToRuntimeFactory(expect, typeParamsDecl);
            const fields = Object.entries(source.fields).map(([name, source]) => {
                if (!(name in struct.fields)) throw new Error(dbg`No field ${name} in struct ${struct}`);
                const expr = loadExpression({ ...options, source, expect: struct.fields[name].fieldType });
                return [name, expr] as const;
            });

            return (options) => {
                const sTypeParams = factory(options.typeParams).typeParams;
                struct.create(sTypeParams, Object.fromEntries(fields.map(([name, fn]) => [name, fn(options)])));
            };
        }

        case model.ExpressionKind.Variant: {
            const { option, data } = source;

            if (!(expect instanceof runtime.ConcreteType) || !(expect.declaration instanceof runtime.Variant)) {
                throw new Error(dbg`Expect type ${expect}, found variant`);
            }

            if (!(option in expect.declaration.options)) {
                throw new Error(dbg`No option ${option} in variant ${expect}`);
            }

            const variant = expect.declaration;
            const { dataType } = expect.declaration.options[option];
            const factory = typeToRuntimeFactory(expect, typeParamsDecl);
            const dataExpr = dataType == null || data == null ? null : loadExpression({
                ...options,
                source: data,
                expect: dataType,
            });

            if (dataType == null && data != null) {
                throw new Error(dbg`Option ${option} in ${variant} does not expect any data, but data is provided`);
            }

            return (options) => {
                const vTypeParams = factory(options.typeParams).typeParams;
                variant.create(vTypeParams, option, dataExpr == null ? undefined : dataExpr(options));
            };
        }

        case model.ExpressionKind.Asset: {
            if (!compareType(expect, asset)) {
                throw new Error(dbg`Expect type ${expect}, found asset`);
            }

            const { assetOrdinal: ordinal } = source;

            if (ordinal < 0 || ordinal >= elementTable.length) {
                throw new Error(`Element index ${ordinal} is out of bounds: [0; ${elementTable.length})`);
            }

            const assetElement = elementTable[ordinal];

            if (!(assetElement instanceof runtime.Asset)) {
                throw new Error(`Expecting element #${ordinal} to be an asset, found ${assetElement.elementTypeName}`);
            }

            return () => assetElement.data;
        }
    }
}
