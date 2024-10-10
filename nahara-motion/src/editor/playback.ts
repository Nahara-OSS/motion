export interface IPlaybackManager {
    /**
     * The current time of the main seekhead. The viewport will preview the scene with current time.
     */
    readonly currentTime: number;

    /**
     * The differences in time between previous frame and current frame. If the value is 0, the playback is paused. If
     * the value is positive, the playback manager is playing the scene normally. If the value is negative, the playback
     * manager is playing the scene backward.
     */
    readonly deltaTime: number;

    /**
     * The current playback state.
     */
    readonly state: PlaybackState;

    /**
     * The playback rate (also known as speed). The unit for this value is scene milliseconds per real world
     * milliseconds. For example, if the `rate` is `2.0`, the playback manager will play the scene twice as fast as
     * normal. Note that this have zero effect while rendering.
     */
    readonly rate: number;

    /**
     * The frame rate that this playback manager will play. If the value is `vsync`, the frame rate is bounds to the
     * refresh rate of current monitor. The current monitor is determined by the browser.
     */
    readonly fps: PlaybackFPS;

    seekTo(time: number): void;
    changeState(state: PlaybackState): void;
}

export type PlaybackState = "paused" | "playing-normal" | "playing-backward";
export type PlaybackFPS = number | "vsync";