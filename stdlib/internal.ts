import * as motion from "@nahara/motion";

export class NativeTypeDecl extends motion.runtime.TypeDecl {
    #cached: motion.runtime.TypeDeclInfo | null = null;
    #query: () => motion.runtime.TypeDeclInfo;

    constructor(query: () => motion.runtime.TypeDeclInfo) {
        super();
        this.#query = query;
    }

    override get info(): motion.runtime.TypeDeclInfo {
        if (this.#cached == null) this.#cached = this.#query();
        return this.#cached;
    }
}

export class NativeFunction extends motion.runtime.Function {
    #cached: motion.runtime.FunctionInfo | null = null;
    #query: () => motion.runtime.FunctionInfo;

    constructor(query: () => motion.runtime.FunctionInfo) {
        super();
        this.#query = query;
    }

    override get info(): motion.runtime.FunctionInfo {
        if (this.#cached == null) this.#cached = this.#query();
        return this.#cached;
    }
}

export class NativeComponent extends motion.runtime.Component {
    #cached: motion.runtime.ComponentInfo | null = null;
    #query: () => motion.runtime.ComponentInfo;

    constructor(query: () => motion.runtime.ComponentInfo) {
        super();
        this.#query = query;
    }

    override get info(): motion.runtime.ComponentInfo {
        if (this.#cached == null) this.#cached = this.#query();
        return this.#cached;
    }
}

export type Variant<T extends Readonly<Record<string, unknown>>> = {
    [Option in keyof T]: {
        readonly option: Option;
        readonly data: T[Option];
    };
}[keyof T];
