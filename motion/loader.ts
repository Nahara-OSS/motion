import type * as context from "./context.ts";
import type * as model from "./model.ts";
import * as runtime from "./runtime.ts";

export function loadType(
    options: Readonly<{
        source: model.Type;
        elementTable: (ordinal: number) => runtime.Element;
    }>,
): runtime.Type {
    const { source, elementTable } = options;

    switch (source.kind) {
        case "parameterized": {
            const { parameterOrdinal } = source;
            return { kind: "parameterized", parameterOrdinal };
        }

        case "fresh": {
            const { declOrdinal, typeParams } = source;
            const element = elementTable(declOrdinal);

            if (element == null) {
                console.log(source);
                throw new Error(`(TODO: no element at ordinal ${declOrdinal})`);
            }

            if (!(element instanceof runtime.TypeDecl)) {
                throw new Error("(TODO: element is not a type)");
            }

            return {
                kind: "fresh",
                decl: element,
                typeParams: typeParams.map((source) => loadType({ source, elementTable })),
            };
        }
    }
}

/**
 * Map type to new domain
 *
 * @param from Type from source (e.g. field type)
 * @param domain Target type parameter domain
 * @returns Mapped type under given new domain
 */
export function mapType(from: runtime.Type, domain: readonly runtime.Type[]): runtime.Type {
    switch (from.kind) {
        case "parameterized": {
            return domain[from.parameterOrdinal];
        }

        case "fresh": {
            const { decl, typeParams } = from;
            return { kind: "fresh", decl, typeParams: typeParams.map((x) => mapType(x, domain)) };
        }
    }
}

export function qualifyType(
    type: runtime.Type,
    inputTypeParams: readonly runtime.QualifiedType[],
): runtime.QualifiedType {
    switch (type.kind) {
        case "fresh": {
            const { decl, typeParams } = type;

            if (decl.info.typeParams.length != typeParams.length) {
                throw new Error("(TODO: type parameter count mismatch)");
            }

            return { decl, typeParams: typeParams.map((type) => qualifyType(type, inputTypeParams)) };
        }

        case "parameterized": {
            return inputTypeParams[type.parameterOrdinal];
        }
    }
}

/**
 * Load a module from its AST representation
 *
 * @param options Load options
 * @returns Loaded module
 */
export function loadModule(
    options: Readonly<{
        source: model.Module;
        resolve: (module: string, name: string) => runtime.Element;
    }>,
): LoadedModule {
    const { source, resolve } = options;
    const elementTableArray: runtime.Element[] = source.elementTable.map((source) => loadElement({ source, resolve }));
    const elementTable = (ordinal: number) => elementTableArray[ordinal];

    function isLoaderImpl(e: runtime.Element): e is Struct | Variant | Function | Component {
        return e instanceof Struct || e instanceof Variant || e instanceof Function || e instanceof Component;
    }

    elementTableArray.forEach((e) => isLoaderImpl(e) && !e.linked ? e.prelink(elementTable) : void 0);
    elementTableArray.forEach((e) => isLoaderImpl(e) && !e.linked ? e.link(elementTable) : void 0);
    elementTableArray.forEach((e) => isLoaderImpl(e) ? e.linked = true : void 0);

    return {
        elementTable: elementTableArray,
        exports: Object.fromEntries(
            Object.entries(source.exports).map(([name, ordinal]) => {
                if (ordinal >= elementTableArray.length) throw new Error("(TODO: element ordinal out of bounds)");
                return [name, elementTableArray[ordinal]] as const;
            }),
        ),
    };
}

export function createResolver(
    matrix: Readonly<Record<string, Readonly<Record<string, runtime.Element>>>>,
): (module: string, name: string) => runtime.Element {
    return (module, name) => {
        if (!(module in matrix)) throw new Error(`Module not found: "${module}"`);
        if (!(name in matrix[module])) throw new Error(`No element exported with name ${name} in module "${module}"`);
        return matrix[module][name];
    };
}

export interface LoadedModule {
    /**
     * Element table
     *
     * This table contains all the elements that has been imported and created inside the module. Tooling (e.g. the
     * editor) would access the element table directly, while resolver would only touch the exported elements.
     */
    readonly elementTable: readonly runtime.Element[];

    /**
     * Exported elements
     *
     * Access to elements exported from the loaded module.
     */
    readonly exports: Readonly<Record<string, runtime.Element>>;
}

export function loadElement(
    options: Readonly<{
        source: model.Element;
        resolve: (module: string, name: string) => runtime.Element;
    }>,
): runtime.Element {
    const { source, resolve } = options;

    switch (source.kind) {
        case "import": {
            const { module, name } = source;
            return resolve(module, name);
        }

        case "struct": {
            return new Struct(source);
        }

        case "variant": {
            return new Variant(source);
        }

        case "function": {
            return new Function(source);
        }

        case "component": {
            return new Component(source);
        }
    }

    throw new Error("(TODO: unexpected element type / try updating maybe?)");
}

/**
 * Marker indicating the element is not linked
 *
 * This marker is used on embedder-side functions like {@link runtime.FunctionInfo.apply} or
 * {@link runtime.MethodInfo.apply}.
 */
// deno-lint-ignore no-explicit-any
export function notLinked(): any {
    throw new Error("Not linked");
}

abstract class TypeDecl extends runtime.TypeDecl {
    prelinkMethods(
        source: Readonly<Record<string, model.Method>>,
        elementTable: (ordinal: number) => runtime.Element,
    ): Record<string, runtime.MethodInfo & { apply: runtime.MethodInfo["apply"] }> {
        return Object.fromEntries(
            Object.entries(source).map(([name, { annotations, typeParams, inputs, returnType }]) =>
                [
                    name,
                    {
                        annotations,
                        typeParams: typeParams.map(({ annotations }) => ({ annotations })),
                        inputs: inputs.map((input) => Function.loadInput(input, elementTable)),
                        returnType: loadType({ source: returnType, elementTable }),
                        apply: notLinked,
                    } as runtime.MethodInfo,
                ] as const
            ),
        );
    }

    linkMethods(
        source: Readonly<Record<string, model.Method>>,
        methods: Readonly<Record<string, runtime.MethodInfo & { apply: runtime.MethodInfo["apply"] }>>,
        elementTable: (ordinal: number) => runtime.Element,
    ): void {
        for (const methodName in source) {
            const methodInfo = methods[methodName];
            const expression = loadExpression({
                source: source[methodName].expression,
                expected: methodInfo.returnType,
                typeParams: [
                    ...this.info.typeParams.map(() => TypeParameterKind.Type),
                    ...methodInfo.typeParams.map(() => TypeParameterKind.Method),
                ],
                variables: [
                    {
                        type: {
                            kind: "fresh",
                            decl: this,
                            typeParams: this.info.typeParams.map((_, i) => ({
                                kind: "parameterized",
                                parameterOrdinal: i,
                            })),
                        },
                        mode: "let",
                        init: true,
                    },
                    ...methodInfo.inputs.map(({ type }) => ({
                        type: type,
                        mode: "let",
                        init: true,
                    } satisfies VariableInfo)),
                ],
                elementTable,
            });

            methodInfo.apply = (typeParams, self, ...inputs) => (expression(typeParams, {
                get: (ordinal) => {
                    if (ordinal == 0) return self;
                    if (ordinal > 0 && ordinal <= methodInfo.inputs.length) return inputs[ordinal - 1];
                    throw new Error(`Variable ordinal ${ordinal} does not exists on method-level scope`);
                },
                set: (ordinal) => {
                    if (ordinal >= 0 && ordinal <= methodInfo.inputs.length) {
                        throw new Error(`Variable can only be assigned once`);
                    }
                    throw new Error(`Variable ordinal ${ordinal} does not exists on method-level scope`);
                },
            }));
        }
    }
}

class Struct extends TypeDecl {
    #info: runtime.StructTypeDeclInfo | null = null;
    #source: model.Struct;
    linked = false;

    constructor(source: model.Struct) {
        super();
        this.#source = source;
    }

    override get info(): runtime.StructTypeDeclInfo {
        if (this.#info == null) throw new Error("Not linked");
        return this.#info;
    }

    prelink(elementTable: (ordinal: number) => runtime.Element): void {
        const { annotations, typeParams, fields, methods } = this.#source;

        const loadedFields = Object.entries(fields).map(([name, { annotations, type }]) =>
            [name, {
                annotations,
                type: loadType({ source: type, elementTable }),
                get: (_, self) => (self as Record<string, unknown>)[name],
            } as runtime.StructFieldInfo] as const
        );

        this.#info = {
            annotations,
            typeParams: typeParams.map(({ annotations }) => ({ annotations })),
            family: "struct",
            fields: Object.fromEntries(loadedFields),
            methods: this.prelinkMethods(methods, elementTable),

            default: (typeParams) => (Object.fromEntries(
                loadedFields.map(([name, { type }]) => {
                    const qualified = qualifyType(type, typeParams);
                    const value = qualified.decl.info.default(qualified.typeParams);
                    return [name, value] as const;
                }),
            )),

            create: (typeParams, fields) => (Object.fromEntries(loadedFields.map(([name, { type }]) => {
                if (name in fields) return [name, fields[name]] as const;
                const qualified = qualifyType(type, typeParams);
                const value = qualified.decl.info.default(qualified.typeParams);
                return [name, value] as const;
            }))),
        };
    }

    link(elementTable: (ordinal: number) => runtime.Element): void {
        if (this.#info == null) throw new Error("Not pre-linked");
        this.linkMethods(this.#source.methods, this.#info.methods, elementTable);
    }
}

class Variant extends TypeDecl {
    #info: runtime.VariantTypeDeclInfo | null = null;
    #source: model.Variant;
    linked = false;

    constructor(source: model.Variant) {
        super();
        this.#source = source;
    }

    override get info(): runtime.VariantTypeDeclInfo {
        if (this.#info == null) throw new Error("Not linked");
        return this.#info;
    }

    prelink(elementTable: (ordinal: number) => runtime.Element): void {
        const { annotations, typeParams, options, default: initial, methods } = this.#source;

        interface Variant {
            option: string;
            data: unknown;
        }

        const loadedOptions = Object.fromEntries(
            Object.entries(options).map(([name, { annotations, type }]) =>
                [name, {
                    annotations,
                    type: type != null ? loadType({ source: type, elementTable }) : null,
                    create: (_, data) => ({ option: name, data: type != null ? data : null } satisfies Variant),
                    match: (_, self) => {
                        const { option, data } = self as Variant;
                        if (option == name) return { matched: true, data };
                        return { matched: false };
                    },
                } as runtime.VariantOptionInfo] as const
            ),
        );

        if (Object.keys(loadedOptions).length == 0) {
            throw new Error("(TODO: variant X have no defined options)");
        }

        if (!(initial in loadedOptions)) {
            throw new Error("(TODO: default option X does not exists in Y)");
        }

        const defaultOption = loadedOptions[initial];

        this.#info = {
            annotations,
            typeParams: typeParams.map(({ annotations }) => ({ annotations })),
            family: "variant",
            options: loadedOptions,
            methods: this.prelinkMethods(methods, elementTable),

            default: (typeParams) => {
                if (defaultOption.type != null) {
                    const qualified = qualifyType(defaultOption.type, typeParams);
                    const data = qualified.decl.info.default(qualified.typeParams);
                    return { option: initial, data } satisfies Variant;
                } else {
                    return { option: initial, data: null } satisfies Variant;
                }
            },
        };
    }

    link(elementTable: (ordinal: number) => runtime.Element): void {
        if (this.#info == null) throw new Error("Not pre-linked");
        this.linkMethods(this.#source.methods, this.#info.methods, elementTable);
    }
}

class Function extends runtime.Function {
    #info: (runtime.FunctionInfo & { apply: runtime.FunctionInfo["apply"] }) | null = null;
    #source: model.Function;
    linked = false;

    constructor(source: model.Function) {
        super();
        this.#source = source;
    }

    override get info(): runtime.FunctionInfo {
        if (this.#info == null) throw new Error("Not linked");
        return this.#info;
    }

    prelink(elementTable: (ordinal: number) => runtime.Element): void {
        const { annotations, typeParams, inputs, returnType } = this.#source;

        this.#info = {
            annotations,
            typeParams: typeParams.map(({ annotations }) => ({ annotations })),
            inputs: inputs.map((input) => Function.loadInput(input, elementTable)),
            returnType: loadType({ source: returnType, elementTable }),
            apply: notLinked,
        };
    }

    link(elementTable: (ordinal: number) => runtime.Element): void {
        if (this.#info == null) throw new Error("Not pre-linked");

        const info = this.#info;
        const expression = loadExpression({
            source: this.#source.expression,
            expected: info.returnType,
            typeParams: info.typeParams.map(() => TypeParameterKind.Function),
            variables: info.inputs.map(({ type }) => ({ type, mode: "let", init: true })),
            elementTable,
        });

        this.#info.apply = (typeParams, ...inputs) => (expression(typeParams, {
            get: (ordinal) => {
                if (ordinal >= 0 && ordinal < info.inputs.length) return inputs[ordinal];
                throw new Error(`Variable ordinal ${ordinal} does not exists on function-level scope`);
            },
            set: (ordinal) => {
                if (ordinal >= 0 && ordinal < info.inputs.length) throw new Error(`Variable can only be assigned once`);
                throw new Error(`Variable ordinal ${ordinal} does not exists on function-level scope`);
            },
        }));
    }

    static loadInput(
        source: model.FunctionInput,
        elementTable: (ordinal: number) => runtime.Element,
    ): runtime.FunctionInputInfo {
        const { annotations, type } = source;
        return { annotations, type: loadType({ source: type, elementTable }) };
    }
}

class Component extends runtime.Component {
    #info: (runtime.ComponentInfo & { eval: runtime.ComponentInfo["eval"] }) | null = null;
    #source: model.Component;
    linked = false;

    constructor(source: model.Component) {
        super();
        this.#source = source;
    }

    override get info(): runtime.ComponentInfo {
        if (this.#info == null) throw new Error("Not linked");
        return this.#info;
    }

    prelink(elementTable: (ordinal: number) => runtime.Element): void {
        const { annotations, typeParams, parameters, slots } = this.#source;

        this.#info = {
            annotations,
            typeParams: typeParams.map(({ annotations }) => ({ annotations })),
            parameters: Object.fromEntries(
                Object.entries(parameters).map(([name, { annotations, inputs, returnType }]) => ([name, {
                    annotations,
                    inputs: inputs.map(({ annotations, type }) => ({
                        annotations,
                        type: loadType({ source: type, elementTable }),
                    })),
                    returnType: loadType({ source: returnType, elementTable }),
                } as runtime.ParameterInfo] as const)),
            ),
            slots: Object.fromEntries(
                Object.entries(slots).map(([name, { annotations, inputs }]) => ([name, {
                    annotations,
                    inputs: inputs.map(({ annotations, type }) => ({
                        annotations,
                        type: loadType({ source: type, elementTable }),
                    })),
                } as runtime.SlotInfo] as const)),
            ),
            eval: notLinked,
        };
    }

    link(elementTable: (ordinal: number) => runtime.Element): void {
        if (this.#info == null) throw new Error("Not pre-linked");

        const componentInfo = this.#info;

        const loadedParameters = Object.entries(this.#source.parameters).map(([name, { fallback }]) => {
            const paramInfo = componentInfo.parameters[name];
            const expression = loadExpression({
                source: fallback,
                expected: paramInfo.returnType,
                typeParams: componentInfo.typeParams.map(() => TypeParameterKind.Component),
                variables: paramInfo.inputs.map(({ type }) => ({ type, mode: "let", init: true })),
                elementTable,
            });
            return [name, { fallback: expression }] as const;
        });

        const content = this.#loadFragment(
            this.#source.content,
            [],
            elementTable,
        );

        this.#info.eval = async ({
            context,
            typeParams = [],
            parameters = {},
            slots = {},
        }) => {
            await content(
                typeParams,
                context,
                Object.fromEntries(loadedParameters.map(([name, { fallback }]) =>
                    [name, (inputs) => {
                        if (name in parameters) parameters[name](...inputs);
                        return fallback(typeParams, {
                            get: (ordinal) => inputs[ordinal],
                            set: () => {},
                        });
                    }] as const
                )),
                Object.fromEntries(
                    Object.entries(componentInfo.slots).map(([name]) => [name, slots[name] ?? (() => {})] as const),
                ),
                () => {},
            );
        };
    }

    #loadFragment(
        source: model.Fragment,
        variables: readonly runtime.Type[],
        elementTable: (ordinal: number) => runtime.Element,
    ): (
        typeParams: readonly runtime.QualifiedType[],
        context: context.ContextMap,
        parameters: Readonly<Record<string, (inputs: unknown[]) => unknown>>,
        slots: Readonly<Record<string, (context: context.ContextMap, inputs: unknown[]) => Promise<void> | void>>,
        variable: (ordinal: number) => unknown,
    ) => Promise<void> {
        const fragment = source.map((object) => this.#loadObject(object, variables, elementTable));

        return async (...inputs) => {
            for (const object of fragment) {
                await object(...inputs);
            }
        };
    }

    #loadObject(
        source: model.Object,
        variables: readonly runtime.Type[],
        elementTable: (ordinal: number) => runtime.Element,
    ): (
        typeParams: readonly runtime.QualifiedType[],
        context: context.ContextMap,
        parameters: Readonly<Record<string, (inputs: unknown[]) => unknown>>,
        slots: Readonly<Record<string, (context: context.ContextMap, inputs: unknown[]) => Promise<void> | void>>,
        variable: (ordinal: number) => unknown,
    ) => Promise<void> {
        if (this.#info == null) throw new Error("Not pre-linked");

        const componentInfo = this.#info;
        const typeParams = this.#info.typeParams.map(() => TypeParameterKind.Component);
        const exprVars = variables.map((type) => ({ type, mode: "let", init: true } as VariableInfo));

        switch (source.kind) {
            case "component": {
                const { parameters, slots } = source;
                const component = elementTable(source.componentOrdinal);

                if (!(component instanceof runtime.Component)) {
                    throw new Error("(TODO: X is not a component)");
                }

                const childTypeParams = source.typeParams.map((source) => loadType({ source, elementTable }));
                const childInfo = component.info;

                const loadedParameters = Object.entries(parameters).map(([name, source]) => {
                    const paramInfo = childInfo.parameters[name];
                    const expression = loadExpression({
                        source,
                        expected: paramInfo.returnType,
                        typeParams,
                        variables: [
                            ...paramInfo.inputs.map(({ type }) => ({ type, mode: "let", init: true } as const)),
                            ...exprVars,
                        ],
                        elementTable,
                    });
                    return [name, expression] as const;
                });

                const loadedSlots = Object.entries(slots).map(([name, source]) => {
                    const slotInfo = childInfo.slots[name];
                    const fragment = this.#loadFragment(
                        source,
                        [
                            ...slotInfo.inputs.map(({ type }) => type),
                            ...variables,
                        ],
                        elementTable,
                    );
                    return [name, fragment] as const;
                });

                return async (typeParams, context, parameters, slots, variable) => {
                    await component.info.eval({
                        context,
                        typeParams: childTypeParams.map((type) => qualifyType(type, typeParams)),
                        parameters: Object.fromEntries(
                            loadedParameters.map(([name, expr]) => [name, (...inputs) => (expr(typeParams, {
                                get: (ordinal) => {
                                    const paramInputs = childInfo.parameters[name].inputs.length;
                                    if (ordinal < paramInputs) return inputs[ordinal];
                                    return variable(ordinal - paramInputs);
                                },
                                set: () => {},
                            }))]),
                        ),
                        slots: Object.fromEntries(
                            loadedSlots.map(([name, slot]) => [name, (context, ...inputs) => (slot(
                                typeParams,
                                context,
                                parameters,
                                slots,
                                (ordinal) => {
                                    const paramInputs = childInfo.parameters[name].inputs.length;
                                    if (ordinal < paramInputs) return inputs[ordinal];
                                    return variable(ordinal - paramInputs);
                                },
                            ))]),
                        ),
                    });
                };
            }

            case "slot": {
                const { name, inputs } = source;

                if (!(name in componentInfo.slots)) {
                    throw new Error("(TODO: no slot X defined in component)");
                }

                const slotInfo = componentInfo.slots[name];

                if (slotInfo.inputs.length != inputs.length) {
                    throw new Error("(TODO: number of inputs mismatched)");
                }

                const loadedInputs = inputs.map((expression, i) =>
                    loadExpression({
                        source: expression,
                        expected: slotInfo.inputs[i].type,
                        typeParams,
                        variables: exprVars,
                        elementTable,
                    })
                );

                return async (typeParams, context, _parameters, slots, variable) => {
                    await slots[name](
                        context,
                        loadedInputs.map((expr) => expr(typeParams, { get: variable, set: () => {} })),
                    );
                };
            }
        }

        throw new Error("(TODO: unexpected object type / try updating maybe?)");
    }
}

export function loadExpression(
    options: Readonly<{
        source: model.Expression;
        expected: runtime.Type;
        typeParams: readonly TypeParameterKind[];
        variables: readonly VariableInfo[];
        elementTable: (ordinal: number) => runtime.Element;
    }>,
): (typeParams: readonly runtime.QualifiedType[], variables: RuntimeVariableTable) => unknown {
    const { source, expected, typeParams, variables, elementTable } = options;

    switch (source.kind) {
        case "default": {
            if (expected.kind == "fresh") {
                return (typeParams) => {
                    return expected.decl.info.default(expected.typeParams.map((type) => qualifyType(type, typeParams)));
                };
            }

            if (expected.parameterOrdinal >= typeParams.length) {
                throw new Error("(TODO: type parameter ordinal out of bounds)");
            }

            // `default` works with all types (including parameterized types),
            // so no type checking here.

            return (inputTypeParams) => {
                const { decl, typeParams } = inputTypeParams[expected.parameterOrdinal];
                return decl.info.default(typeParams);
            };
        }

        case "number":
        case "boolean":
        case "string": {
            const decl = primitiveTypeDecls[source.kind];

            if (expected.kind != "fresh" || expected.decl != decl) {
                throw new Error("(TODO: expected type is X, but Y constant found)");
            }

            return () => source.value;
        }

        case "array": {
            const { values } = source;

            if (expected.kind != "fresh" || expected.decl != runtime.coreModule.Array) {
                throw new Error("(TODO: expected type is X, but array literal found)");
            }

            const expectedEntry = expected.typeParams[0];
            const entries = values.map((source) => loadExpression({ ...options, source, expected: expectedEntry }));
            return (typeParams, variables) => entries.map((expr) => expr(typeParams, variables));
        }

        case "struct": {
            const { fields } = source;

            if (expected.kind != "fresh" || expected.decl.info.family != "struct") {
                throw new Error("(TODO: expected type is X, but struct initializer found)");
            }

            // avoid these checks for now to reduce breaking changes from modifying module
            // editor should show warning instead
            // for (const expectedField in expected.decl.info.fields) {
            //     if (!(expectedField in fields)) {
            //         throw new Error(`(TODO: struct initializer does not have field X, which is required by Y)`);
            //     }
            // }
            // for (const foundField in fields) {
            //     if (!(foundField in expected.decl.info.fields)) {
            //         throw new Error("(TODO: struct initializer have extra field X, while Y does not)");
            //     }
            // }

            const structInfo = expected.decl.info;
            const entries = Object
                .entries(fields)
                .filter(([name]) => name in structInfo.fields)
                .map(([name, source]) => {
                    const expectedFieldType = mapType(structInfo.fields[name].type, expected.typeParams);
                    return [name, loadExpression({ ...options, source, expected: expectedFieldType })] as const;
                });

            return (typeParams, variables) => (structInfo.create(
                typeParams,
                Object.fromEntries(
                    entries.map(([name, expr]) => [name, expr(typeParams, variables)] as const),
                ),
            ));
        }

        case "variant": {
            const { option, data } = source;

            if (expected.kind != "fresh" || expected.decl.info.family != "variant") {
                throw new Error("(TODO: expected type is X, but variant initializer found)");
            }

            if (!(option in expected.decl.info.options)) {
                throw new Error("(TODO: type X does not have option Y)");
            }

            const optionInfo = expected.decl.info.options[option];

            if (optionInfo.type == null && data == null) {
                return (typeParams) => optionInfo.create(typeParams, null);
            } else if (optionInfo.type != null && data != null) {
                const expr = loadExpression({
                    ...options,
                    source: data,
                    expected: mapType(optionInfo.type, expected.typeParams),
                });
                return (typeParams, variables) => optionInfo.create(typeParams, expr(typeParams, variables));
            } else if (optionInfo.type == null) {
                throw new Error("(TODO: option X in type Y does not hold data, but variant init is providing it)");
            } else {
                throw new Error("(TODO: option X in type Y hold data, but variant init is not providing it)");
            }
        }

        case "variable": {
            const { variableOrdinal } = source;

            if (variableOrdinal >= options.variables.length) {
                // TODO: also show variable table
                throw new Error("(TODO: variable ordinal out of bounds)");
            }

            if (!runtime.typeEquals(expected, variables[variableOrdinal].type)) {
                throw new Error("(TODO: expected type is X, but Y found)");
            }

            if (!variables[variableOrdinal].init) {
                throw new Error("(TODO: variable X is used before initialization)");
            }

            return (_, variables) => variables.get(variableOrdinal);
        }

        case "field": {
            const { target, fieldName } = source;
            const type = loadType({ source: source.type, elementTable });
            const instanceExpr = loadExpression({ ...options, source: target, expected: type });

            if (type.kind != "fresh" || type.decl.info.family != "struct") {
                throw new Error("(TODO: trying to access field X on non-struct type Y)");
            }

            const structInfo = type.decl.info;

            if (!(fieldName in structInfo.fields)) {
                throw new Error("(TODO: no field X in type Y)");
            }

            const fieldInfo = structInfo.fields[fieldName];
            const fieldType = mapType(fieldInfo.type, type.typeParams);

            if (!runtime.typeEquals(expected, fieldType)) {
                throw new Error("(TODO: expected type is X, but Y found)");
            }

            return (typeParams, variables) => {
                const instance = instanceExpr(typeParams, variables);
                return fieldInfo.get(qualifyType(type, typeParams).typeParams, instance);
            };
        }

        case "function": {
            const { functionOrdinal, typeParams, inputs } = source;
            const element = elementTable(functionOrdinal);

            if (!(element instanceof runtime.Function)) {
                throw new Error("(TODO: X is not a function)");
            }

            const functionTypeParams = typeParams.map((source) => loadType({ source, elementTable }));
            const returnType = mapType(element.info.returnType, functionTypeParams);

            if (!runtime.typeEquals(expected, returnType)) {
                throw new Error("(TODO: expected type is X, but Y found)");
            }

            const inputTypes = element.info.inputs.map(({ type }) => mapType(type, functionTypeParams));
            const loadedInputs = inputs.map((source, i) =>
                loadExpression({
                    ...options,
                    source,
                    expected: inputTypes[i],
                })
            );

            return (inputTypeParams, variables) => {
                const inputs = loadedInputs.map((expr) => expr(inputTypeParams, variables));
                const typeParams = functionTypeParams.map((type) => qualifyType(type, inputTypeParams));
                return element.info.apply(typeParams, ...inputs);
            };
        }

        case "method": {
            const { target, methodName, typeParams, inputs } = source;
            const type = loadType({ source: source.type, elementTable });
            const instanceExpr = loadExpression({ ...options, source: target, expected: type });

            if (type.kind != "fresh") {
                throw new Error("(TODO: trying to access method X on parameterized type Y)");
            }

            if (!(methodName in type.decl.info.methods)) {
                throw new Error("(TODO: no method X in type Y)");
            }

            const methodInfo = type.decl.info.methods[methodName];
            const methodTypeParams = [
                ...type.typeParams,
                ...typeParams.map((source) => loadType({ source, elementTable })),
            ];
            const returnType = mapType(methodInfo.returnType, methodTypeParams);

            if (!runtime.typeEquals(expected, returnType)) {
                throw new Error("(TODO: expected type is X, but Y found)");
            }

            const inputTypes = methodInfo.inputs.map(({ type }) => mapType(type, methodTypeParams));
            const loadedInputs = inputs.map((source, i) =>
                loadExpression({
                    ...options,
                    source,
                    expected: inputTypes[i],
                })
            );

            return (inputTypeParams, variables) => {
                const instance = instanceExpr(inputTypeParams, variables);
                const inputs = loadedInputs.map((expr) => expr(inputTypeParams, variables));
                const typeParams = methodTypeParams.map((type) => qualifyType(type, inputTypeParams));
                return methodInfo.apply(typeParams, instance, ...inputs);
            };
        }

        case "match": {
            const { target, options: arms, fallback } = source;
            const type = loadType({ source: source.type, elementTable });
            const instanceExpr = loadExpression({ ...options, source: target, expected: type });

            if (type.kind != "fresh" || type.decl.info.family != "variant") {
                throw new Error("(TODO: trying to access option X on non-variant type Y)");
            }

            const variantInfo = type.decl.info;
            const loadedFallback = loadExpression({ ...options, source: fallback });
            const loadedOptions = Object.entries(arms).map(([name, expression]) => {
                if (!(name in variantInfo.options)) {
                    throw new Error("(TODO: no option X in variant Y)");
                }

                const variables: readonly VariableInfo[] = variantInfo.options[name].type == null
                    ? options.variables
                    : [
                        {
                            type: variantInfo.options[name].type,
                            mode: "let",
                            init: true,
                        },
                        ...options.variables,
                    ];

                return [name, loadExpression({ ...options, source: expression, variables })] as const;
            });

            return (inputTypeParams, variables) => {
                const instance = instanceExpr(inputTypeParams, variables);
                const qualified = qualifyType(type, inputTypeParams);

                for (const [name, option] of loadedOptions) {
                    const result = variantInfo.options[name].match(qualified.typeParams, instance);

                    if (result.matched) {
                        if (variantInfo.options[name].type == null) return option(inputTypeParams, variables);
                        return option(inputTypeParams, {
                            get: (ordinal) => {
                                if (ordinal == 0) return result.data;
                                return variables.get(ordinal - 1);
                            },
                            set: (ordinal, value) => {
                                if (ordinal == 0) throw new Error(`Variable can only be assigned once`);
                                return variables.set(ordinal - 1, value);
                            },
                        });
                    }
                }

                return loadedFallback(inputTypeParams, variables);
            };
        }
    }

    throw new Error("(TODO: unexpected expression type / try updating maybe?)");
}

const primitiveTypeDecls = {
    number: runtime.coreModule.number,
    boolean: runtime.coreModule.boolean,
    string: runtime.coreModule.string,
};

/**
 * Where the type parameter is located
 */
export enum TypeParameterKind {
    Function = "function",
    Type = "type",
    Method = "method",
    Component = "component",
}

export interface VariableInfo {
    readonly mode: "let" | "var";
    readonly type: runtime.Type;
    readonly init: boolean;
}

interface RuntimeVariableTable {
    get(ordinal: number): unknown;
    set(ordinal: number, value: unknown): void;
}
