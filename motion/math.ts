export class Matrix4 {
    private constructor(private readonly data: Float32Array) {}

    static readonly IDENTITY: Matrix4 = new Matrix4(new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]));

    /**
     * Create new matrix from array of numbers
     *
     * The matrix elements when laid out contiguously in array are in column-major order, similar to OpenGL and WebGPU,
     * where the translation components are in 13th, 14th and 15th element of the array.
     *
     * @param array Array containing matrix values
     * @param offset Offset in array
     * @returns New matrix
     */
    static fromArray(array: ArrayLike<number>, offset: number = 0): Matrix4 {
        if (offset + 16 > array.length) throw new Error("There must be at least 16 elements to create a matrix");
        if (offset == 0 && array.length == 16) return new Matrix4(new Float32Array(array));
        const data = new Float32Array(16);
        for (let i = 0; i < 16; i++) data[i] = array[offset + i];
        return new Matrix4(data);
    }

    /**
     * Create new projection matrix for 2D content
     *
     * @param width Width of the camera
     * @param height Height of the camera
     * @returns Projection matrix
     */
    static projection2D(width: number, height: number): Matrix4 {
        return this.scale(2 / width, 2 / height, 1);
    }

    static translate(x: number, y: number, z: number): Matrix4 {
        return new Matrix4(new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]));
    }

    static scale(x: number, y: number, z: number): Matrix4 {
        return new Matrix4(new Float32Array([x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1]));
    }

    static rotate(x: number, y: number, z: number, angle: number): Matrix4 {
        const s = Math.sin(angle);
        const c = Math.cos(angle);
        const t = 1 - c;

        return new Matrix4(
            new Float32Array([
                x * x * t + c,
                x * y * t + z * s,
                x * z * t - y * s,
                0,
                y * x * t - z * s,
                y * y * t + c,
                y * z * t + x * s,
                0,
                z * x * t + y * s,
                z * y * t - x * s,
                z * z * t + c,
                0,
                0,
                0,
                0,
                1,
            ]),
        );
    }

    static mul(base: Matrix4, ...matrices: Matrix4[]): Matrix4 {
        let result = new Float32Array(base.data);
        let alt = new Float32Array(16);

        for (const mat of matrices) {
            const other = mat.data;
            const aux = result;
            result = alt;
            alt = aux;

            result[0] = alt[0] * other[0] + alt[4] * other[1] + alt[8] * other[2] + alt[12] * other[3];
            result[1] = alt[1] * other[0] + alt[5] * other[1] + alt[9] * other[2] + alt[13] * other[3];
            result[2] = alt[2] * other[0] + alt[6] * other[1] + alt[10] * other[2] + alt[14] * other[3];
            result[3] = alt[3] * other[0] + alt[7] * other[1] + alt[11] * other[2] + alt[15] * other[3];

            result[4] = alt[0] * other[4] + alt[4] * other[5] + alt[8] * other[6] + alt[12] * other[7];
            result[5] = alt[1] * other[4] + alt[5] * other[5] + alt[9] * other[6] + alt[13] * other[7];
            result[6] = alt[2] * other[4] + alt[6] * other[5] + alt[10] * other[6] + alt[14] * other[7];
            result[7] = alt[3] * other[4] + alt[7] * other[5] + alt[11] * other[6] + alt[15] * other[7];

            result[8] = alt[0] * other[8] + alt[4] * other[9] + alt[8] * other[10] + alt[12] * other[11];
            result[9] = alt[1] * other[8] + alt[5] * other[9] + alt[9] * other[10] + alt[13] * other[11];
            result[10] = alt[2] * other[8] + alt[6] * other[9] + alt[10] * other[10] + alt[14] * other[11];
            result[11] = alt[3] * other[8] + alt[7] * other[9] + alt[11] * other[10] + alt[15] * other[11];

            result[12] = alt[0] * other[12] + alt[4] * other[13] + alt[8] * other[14] + alt[12] * other[15];
            result[13] = alt[1] * other[12] + alt[5] * other[13] + alt[9] * other[14] + alt[13] * other[15];
            result[14] = alt[2] * other[12] + alt[6] * other[13] + alt[10] * other[14] + alt[14] * other[15];
            result[15] = alt[3] * other[12] + alt[7] * other[13] + alt[11] * other[14] + alt[15] * other[15];
        }

        return new Matrix4(result);
    }

    get(i: number): number {
        return this.data[i];
    }

    map(x: number, y: number, z: number, w: number): [x: number, y: number, z: number, w: number] {
        return [
            x * this.data[0] + y * this.data[4] + z * this.data[8] + w * this.data[12],
            x * this.data[1] + y * this.data[5] + z * this.data[9] + w * this.data[13],
            x * this.data[2] + y * this.data[6] + z * this.data[10] + w * this.data[14],
            x * this.data[3] + y * this.data[7] + z * this.data[11] + w * this.data[15],
        ];
    }

    toFloat32Array(): Float32Array<ArrayBuffer> {
        return new Float32Array(this.data);
    }

    setToArray(target: Float16Array | Float32Array | Float64Array | number[], offset: number = 0): void {
        if (target instanceof Array) {
            for (let i = 0; i < 16; i++) target[offset + i] = this.data[i];
        } else {
            target.set(this.data, offset);
        }
    }

    setToView(view: DataView, byteOffset: number = 0, type: `${"f16" | "f32" | "f64"}${"le" | "be"}` = "f32le"): void {
        const le = type.substring(3) == "le";

        for (let i = 0; i < 16; i++) {
            switch (type.substring(0, 3)) {
                case "f16":
                    view.setFloat16(byteOffset + i * 2, this.data[i], le);
                    break;
                case "f32":
                    view.setFloat32(byteOffset + i * 4, this.data[i], le);
                    break;
                case "f64":
                    view.setFloat64(byteOffset + i * 8, this.data[i], le);
                    break;
            }
        }
    }
}
