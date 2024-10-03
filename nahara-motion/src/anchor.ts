import { Vec2 } from "./types.js";

/**
 * Represent both the anchor and origin. Although this is `Anchor` enum, it is used for both anchor and origin. This is
 * quite similar to osu!framework positioning system.
 *
 * - Anchor: The position on the parent element.
 * - Origin: The position on the object.
 *
 * When positioning the object, it will matches the anchor position (on parent) with origin position (on object).
 */
export enum Anchor {
    RowLeft   = 0b000_001,
    RowCenter = 0b000_010,
    RowRight  = 0b000_100,
    ColTop    = 0b001_000,
    ColMiddle = 0b010_000,
    ColBottom = 0b100_000,

    TopLeft    = 0b001_001, TopCenter    = 0b001_010, TopRight    = 0b001_100,
    MiddleLeft = 0b010_001, MiddleCenter = 0b010_010, MiddleRight = 0b010_100,
    BottomLeft = 0b100_001, BottomCenter = 0b100_010, BottomRight = 0b100_100,
}

export function calculateAnchorPos(size: Vec2, anchor: Anchor): Vec2 {
    let x = 0, y = 0;

    if (anchor & Anchor.RowLeft) x = 0;
    else if (anchor & Anchor.RowCenter) x = size.x / 2;
    else if (anchor & Anchor.RowRight) x = size.x;

    if (anchor & Anchor.ColTop) y = 0;
    else if (anchor & Anchor.ColMiddle) y = size.y / 2;
    else if (anchor & Anchor.ColBottom) y = size.y;

    return { x, y };
}