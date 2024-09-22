export namespace utils {
    /**
     * Perform binary search on sorted array.
     * @param array The sorted array to search.
     * @param key The key to search.
     * @param compare The comparator.
     * @returns The index in the array if found, `-1 - insertIndex` otherwise. If you only care about insert index, you
     * can get it by using `out >= 0 ? out : (-out - 1)` expression.
     */
    export function binarySearch<T>(array: ArrayLike<T>, key: T, compare: (a: T, b: T) => number) {
        if (array.length == 0) return -1;

        let start = 0, end = array.length - 1;

        while (start <= end) {
            const mid = (start + end) >> 1;
            const midValue = array[mid];
            const comparision = compare(midValue, key);

            if (comparision < 0) start = mid + 1;
            else if (comparision > 0) end = mid - 1;
            else return mid;
        }

        return -1 - start;
    }

    let uidClock = Date.now();
    let uidCounter = 0;

    export function randomUid() {
        const clock = Date.now();

        if (uidClock != clock) {
            uidClock = clock;
            uidCounter = 0;
        }

        const out = `uid-${clock}-${uidCounter}`;
        uidCounter++;
        return out;
    }

    export interface ILogger {
        log(level: number, ...message: any[]): void;
        info(...message: any[]): void;
        warn(...message: any[]): void;
        error(...message: any[]): void;
    }
    
    export class Logger implements ILogger {
        constructor(public readonly name: string) {}
    
        log(level: number, ...message: any[]): void {
            const levels = [console.log, console.warn, console.error];
            const levelLogger = levels[Math.min(level, levels.length - 1)];
            levelLogger(`%c(${this.name})`, "font-weight: bold; color: purple;", ...message);
        }
    
        info(...message: any[]): void { this.log(0, ...message); }
        warn(...message: any[]): void { this.log(1, ...message); }
        error(...message: any[]): void { this.log(2, ...message); }
    }

    const predefinedColors = [
        "#efefef5f",
        "#ff9f9f5f",
        "#9fff9f5f",
        "#9f9fff5f",
        "#ffff9f5f",
        "#9fffff5f",
        "#ff9fff5f"
    ];

    export function deriveColorFromString(s: string) {
        let sum = [...s].map(c => c.charCodeAt(0)).reduce((a, b) => a + b);
        return predefinedColors[sum % predefinedColors.length];
    }
}