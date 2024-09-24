import type { TimelineSnappingMode } from "../../snapping";

export type ModeType<T extends TimelineSnappingMode> = T extends { type: string } ? T["type"] : T;
export interface ModeDefinition<T extends TimelineSnappingMode> {
    type: ModeType<T>;
    name: string;
    default: T;
    asShortDisplayName(data: any): string;
}

export const AllModes: ModeDefinition<TimelineSnappingMode>[] = [
    {
        type: "free",
        name: "Unlocked",
        default: "free",
        asShortDisplayName: () => "Unlocked"
    },
    {
        type: "nearest-object",
        name: "Nearest object",
        default: "nearest-object",
        asShortDisplayName: () => "Nearest"
    },
    {
        type: "grid",
        name: "Time grid",
        default: {
            type: "grid",
            msPerSegment: 100
        },
        asShortDisplayName: ({ msPerSegment }) => `${msPerSegment}ms`
    },
    {
        type: "bpm",
        name: "Beat per second",
        default: {
            type: "bpm",
            bpm: 60,
            division: 4
        },
        asShortDisplayName: ({ bpm, division }) => `1/${division} of ${bpm} BPM`
    }
];

const TypeToMode: Record<ModeType<TimelineSnappingMode>, ModeDefinition<TimelineSnappingMode>> = {
    "free": AllModes[0],
    "nearest-object": AllModes[1],
    "grid": AllModes[2],
    "bpm": AllModes[3]
};

export function getSnappingModeType(mode: TimelineSnappingMode): ModeDefinition<TimelineSnappingMode> {
    return TypeToMode[typeof mode == "string" ? mode : mode.type];
}