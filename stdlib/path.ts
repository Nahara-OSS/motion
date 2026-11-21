import * as motion from "@nahara/motion";
import * as helper from "@nahara/motion-helper";
import * as geometry from "@nahara/geometry";
import { Vec2 } from "./math.ts";
import { createVariant, type Variant } from "./internal.ts";
import { HostFunction } from "../helper/host.ts";

const { HostStructType, HostNativeType, Type } = helper.host;

export interface QuadraticPenParams {
    readonly cp: Vec2;
    readonly target: Vec2;
}

export const QuadraticPenParams: motion.runtime.Struct = new HostStructType<QuadraticPenParams>({
    name: "Quadratic bezier pen parameters",
    default: () => ({ cp: [0, 0], target: [0, 0] }),
    create: (_, { cp = [0, 0], target = [0, 0] }) => ({ cp, target }),
    fields: {
        cp: {
            type: Type.concrete(Vec2),
            name: "Control point",
            description: "Control point of quadratic bezier curve",
            get: ({ cp }) => cp,
        },
        target: {
            type: Type.concrete(Vec2),
            name: "Target point",
            description: "Target position the pen will drag to",
            get: ({ target }) => target,
        },
    },
});

export interface CubicPenParams {
    readonly cp1: Vec2;
    readonly cp2: Vec2;
    readonly target: Vec2;
}

export const CubicPenParams: motion.runtime.Struct = new HostStructType<CubicPenParams>({
    name: "Cubic bezier pen parameters",
    default: () => ({ cp1: [0, 0], cp2: [0, 0], target: [0, 0] }),
    create: (_, { cp1 = [0, 0], cp2 = [0, 0], target = [0, 0] }) => ({ cp1, cp2, target }),
    fields: {
        cp1: {
            type: Type.concrete(Vec2),
            name: "Control point 1",
            description: "First control point of cubic bezier curve",
            get: ({ cp1 }) => cp1,
        },
        cp2: {
            type: Type.concrete(Vec2),
            name: "Control point 2",
            description: "Second control point of cubic bezier curve",
            get: ({ cp2 }) => cp2,
        },
        target: {
            type: Type.concrete(Vec2),
            name: "Target point",
            description: "Target position the pen will drag to",
            get: ({ target }) => target,
        },
    },
});

export type PenCommand = Variant<PenCommands>;
export interface PenCommands {
    readonly Move: Vec2;
    readonly Line: Vec2;
    readonly Quadratic: QuadraticPenParams;
    readonly Cubic: CubicPenParams;
    readonly Close: null;
}

export const PenCommand: motion.runtime.Variant = createVariant<PenCommands>({
    name: "Pen command",
    description: "Instructions for drawing path with pen",
    default: () => ({ option: "Move", data: [0, 0] }),
    options: {
        Move: {
            name: "Move",
            description: "Lift and move the pen to new starting position",
            dataType: Type.concrete(Vec2),
        },
        Line: {
            name: "Line",
            description: "Drag the pen to next position",
            dataType: Type.concrete(Vec2),
        },
        Quadratic: {
            name: "Quadratic bezier",
            description: "Drag the pen along quadratic bezier curve path",
            dataType: Type.concrete(QuadraticPenParams),
        },
        Cubic: {
            name: "Cubic bezier",
            description: "Drag the pen along cubic bezier curve path",
            dataType: Type.concrete(CubicPenParams),
        },
        Close: {
            name: "Close path",
            description: "Drag the pen to starting position",
            dataType: null,
        },
    },
});

export type Path = geometry.path.Path;
export const Path: motion.runtime.TypeDecl = new HostNativeType<Path>({
    name: "Path",
    debugName: "Path",
    description: [
        "Path can be sampled to find position on it, or be drawn as vector graphics.",
    ],
    default: () => ({ length: 0, segments: [] }),
});

export const penCommandsToPath: motion.runtime.Function = new HostFunction({
    name: "Pen commands to path",
    description: "Convert pen commands into sequence of paths",
    inputs: [
        {
            type: Type.concrete(motion.core.array, [Type.concrete(PenCommand)]),
            name: "Pen commands",
            debugName: "commands",
            description: "List of pen commands",
        },
    ],
    output: Type.concrete(motion.core.array, [Type.concrete(Path)]),
    fn: (_, commands: PenCommand[]) => {
        return [...geometry.path.penCommandsToPath(commands.map<geometry.path.PenCommand>((command) => {
            switch (command.option) {
                case "Move": {
                    return { type: "move", target: command.data };
                }

                case "Line": {
                    return { type: "line", target: command.data };
                }

                case "Quadratic": {
                    const { cp, target } = command.data;
                    return { type: "quadratic", cp, target };
                }

                case "Cubic": {
                    const { cp1, cp2, target } = command.data;
                    return { type: "cubic", cp1, cp2, target };
                }

                case "Close": {
                    return { type: "close" };
                }

                default: {
                    throw new Error(`Unimplemented: ${(command as PenCommand).option}`);
                }
            }
        }))];
    },
});

export const pathLength: motion.runtime.Function = new HostFunction({
    name: "Path length",
    description: "Get length of a path",
    inputs: [
        {
            type: Type.concrete(Path),
            name: "Path",
            debugName: "path",
            description: "Path to obtain the length",
        },
    ],
    output: Type.concrete(motion.core.number),
    fn: (_, path: Path) => path.length,
});

export const slicePath: motion.runtime.Function = new HostFunction({
    name: "Slice path",
    description: [
        "Slice to get a portion of a path",
        "Both start and end offsets are measured in path distance.",
    ],
    inputs: [
        {
            type: Type.concrete(Path),
            name: "Path",
            debugName: "path",
            description: "Path to slice",
        },
        {
            type: Type.concrete(motion.core.number),
            name: "Start offset",
            debugName: "start",
        },
        {
            type: Type.concrete(motion.core.number),
            name: "End offset",
            debugName: "end",
        },
    ],
    output: Type.concrete(Path),
    fn: (_, path: Path, start: number, end: number) => geometry.path.slice(path, start, end),
});

export const samplePath: motion.runtime.Function = new HostFunction({
    name: "Sample path",
    debugName: "samplePath",
    description: "Get a point from given offset on the path",
    inputs: [
        {
            type: Type.concrete(Path),
            name: "Path",
            debugName: "path",
            description: "Path to sample",
        },
        {
            type: Type.concrete(motion.core.number),
            name: "Offset",
            debugName: "offset",
            description: "Offset from the start of the path",
        },
    ],
    output: Type.concrete(Vec2),
    fn: (_, path: Path, offset: number) => geometry.path.find(path, offset).point,
});
