/**
 * File signature for binary module format
 */
export const SIGNATURE: Uint8Array = new Uint8Array([..."NaharaMt"].map((c) => c.charCodeAt(0)));

/**
 * Current version number for binary module format
 */
export const VERSION: number = 1;
