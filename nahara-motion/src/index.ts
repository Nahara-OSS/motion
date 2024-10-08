import { addons } from "./addon/addon.js";
import { NaharaMotionSystemAddon } from "./system/nahara.js";

// #region Exports
export * from "./addon/addon.js";
export * from "./addon/registries.js";
export * from "./addon/registry.js";
export * from "./addon/service.js";

export * from "./editor/command.js";
export * from "./editor/editor.js";
export * from "./editor/layout.js";
export * from "./editor/playback.js";
export * from "./editor/selection.js";

export * from "./project/assets.js";
export * from "./project/project.js";

export * from "./render/context.js";

export * from "./scene/animation.js";
export * from "./scene/easing.js";
export * from "./scene/editor.js";
export * from "./scene/object.js";
export * from "./scene/property.js";
export * from "./scene/scene.js";

export * from "./anchor.js";
export * from "./types.js";
export * from "./utils.js";
// Users are not supposed to have access to system/*
// #endregion

addons.addAndLoadAddon("nahara", new NaharaMotionSystemAddon());