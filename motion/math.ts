const m11 = 0;
const m12 = 1;
const m13 = 2;
const m14 = 3;
const m21 = 4;
const m22 = 5;
const m23 = 6;
const m24 = 7;
const m31 = 8;
const m32 = 9;
const m33 = 10;
const m34 = 11;
const m41 = 12;
const m42 = 13;
const m43 = 14;
const m44 = 15;

/**
 * 4x4 matrix.
 */
export class Matrix4 {
    #values: Float32Array;

    constructor(values: ArrayLike<number>) {
        if (values.length != 16) throw new Error("Array length must be exactly 16");
        this.#values = new Float32Array(values);
    }

    /**
     * Size of matrix in bytes.
     */
    static readonly BYTES_SIZE: number = Float32Array.BYTES_PER_ELEMENT * 16;

    /**
     * Identity matrix.
     */
    static readonly IDENTITY: Matrix4 = new Matrix4([
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1],
    ].flat());

    /**
     * Create a new translation matrix.
     *
     * This matrix is typically multiplied with another matrix to create a new transformed matrix.
     *
     * @param x X translation
     * @param y Y translation
     * @param z Z translation
     * @returns Translation matrix
     */
    static translate(x: number, y: number, z: number): Matrix4 {
        return new Matrix4([
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [x, y, z, 1],
        ].flat());
    }

    static scale(x: number, y: number, z: number, w: number = 1): Matrix4 {
        return new Matrix4([
            [x, 0, 0, 0],
            [0, y, 0, 0],
            [0, 0, z, 0],
            [0, 0, 0, w],
        ].flat());
    }

    static rotateZ(rz: number): Matrix4 {
        const cos = Math.cos(rz);
        const sin = Math.sin(rz);

        return new Matrix4([
            [cos, sin, 0, 0],
            [-sin, cos, 0, 0],
            [0, 0, 1, 0],
            [0, 0, 0, 1],
        ].flat());
    }

    /**
     * Array of matrix elements.
     *
     * A copy of internal element array will be created when getting the array from this field.
     */
    get values(): Float32Array {
        return new Float32Array(this.#values);
    }

    /**
     * Check whether this matrix is an identity.
     */
    get identity(): boolean {
        return this == Matrix4.IDENTITY || this.#values.every((v, i) => v == Matrix4.IDENTITY.#values[i]);
    }

    /**
     * Write the content of this matrix to `DataView`.
     *
     * @param view Data view to write to
     * @param offset The offset in data view
     * @param littleEndian Whether to use little endian for each element
     */
    setToDataView(view: DataView, offset: number, littleEndian: boolean = true): void {
        for (let i = 0; i < 16; i++) {
            view.setFloat32(offset + Float32Array.BYTES_PER_ELEMENT * i, this.#values[i], littleEndian);
        }
    }

    mul(another: Matrix4): Matrix4 {
        const m1 = this.#values;
        const m2 = another.#values;

        return new Matrix4([
            m2[m11] * m1[m11] + m2[m12] * m1[m21] + m2[m13] * m1[m31] + m2[m14] * m1[m41],
            m2[m11] * m1[m12] + m2[m12] * m1[m22] + m2[m13] * m1[m32] + m2[m14] * m1[m42],
            m2[m11] * m1[m13] + m2[m12] * m1[m23] + m2[m13] * m1[m33] + m2[m14] * m1[m43],
            m2[m11] * m1[m14] + m2[m12] * m1[m24] + m2[m13] * m1[m34] + m2[m14] * m1[m44],
            m2[m21] * m1[m11] + m2[m22] * m1[m21] + m2[m23] * m1[m31] + m2[m24] * m1[m41],
            m2[m21] * m1[m12] + m2[m22] * m1[m22] + m2[m23] * m1[m32] + m2[m24] * m1[m42],
            m2[m21] * m1[m13] + m2[m22] * m1[m23] + m2[m23] * m1[m33] + m2[m24] * m1[m43],
            m2[m21] * m1[m14] + m2[m22] * m1[m24] + m2[m23] * m1[m34] + m2[m24] * m1[m44],
            m2[m31] * m1[m11] + m2[m32] * m1[m21] + m2[m33] * m1[m31] + m2[m34] * m1[m41],
            m2[m31] * m1[m12] + m2[m32] * m1[m22] + m2[m33] * m1[m32] + m2[m34] * m1[m42],
            m2[m31] * m1[m13] + m2[m32] * m1[m23] + m2[m33] * m1[m33] + m2[m34] * m1[m43],
            m2[m31] * m1[m14] + m2[m32] * m1[m24] + m2[m33] * m1[m34] + m2[m34] * m1[m44],
            m2[m41] * m1[m11] + m2[m42] * m1[m21] + m2[m43] * m1[m31] + m2[m44] * m1[m41],
            m2[m41] * m1[m12] + m2[m42] * m1[m22] + m2[m43] * m1[m32] + m2[m44] * m1[m42],
            m2[m41] * m1[m13] + m2[m42] * m1[m23] + m2[m43] * m1[m33] + m2[m44] * m1[m43],
            m2[m41] * m1[m14] + m2[m42] * m1[m24] + m2[m43] * m1[m34] + m2[m44] * m1[m44],
        ]);
    }
}
