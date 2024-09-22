export type BaseCanvasRenderingContext2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
export type Vec2 = { x: number, y: number };
export type Vec3 = Vec2 & { z: number };
export type Vec4 = Vec3 & { w: number };
export type AngleDeg = { deg: number };
export type AngleRad = { rad: number };
export type Angle = AngleDeg | AngleRad;

export interface IColor<TModel extends string> { model: TModel; }
export interface ColorRGBA extends IColor<"rgba"> { r: number; g: number; b: number; a?: number; }
export type Color = ColorRGBA;