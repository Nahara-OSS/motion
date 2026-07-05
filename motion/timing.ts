/**
 * Number of ticks per second.
 *
 * The constant 176,400 was choosen as it is the LCM (least common multiple) of following integers:
 *
 * - **Video frame rate**: 24, 25, 50, 60, 120 and 144;
 * - **Audio sampling rate**: 44,100 and 48,000.
 *
 * The ticks per second value must be the LCM of the integers above so that the video and audio signals can be aligned.
 * The timing data are always stored in ticks across Nahara's Motion.
 */
export const TICKS_PER_SECOND = 176400;

export function secToTicks(s: number): number {
    return Math.round(s * TICKS_PER_SECOND);
}
