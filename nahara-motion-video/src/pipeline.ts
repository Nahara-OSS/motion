/**
 * Represent a pipeline in the system.
 * @param I The input chunk type.
 * @param O The output chunk type, which will be passed to next part of pipeline or collected by consumer.
 * @param R The result of the pipeline, which will be collected by consumer (does not pass to other pipelines!). Mainly
 * used for video file.
 */
export interface IPipeline<I, O, R> {
    initialize(next: (output: O) => any): Promise<void>;
    consume(input: I): void;
    finalize(): Promise<R>;
}

export type AnyPipeline = IPipeline<any, any, any>;

export function concat<I, M, O, R1, R2>(a: IPipeline<I, M, R1>, b: IPipeline<M, O, R2>): IPipeline<I, O, [R1, R2]>;
export function concat(...pipelines: AnyPipeline[]): AnyPipeline;
export function concat(...pipelines: AnyPipeline[]): AnyPipeline {
    let consumer: (inputs: any) => void;

    return {
        async initialize(next) {
            for (let i = pipelines.length - 1; i >= 0; i--) {
                const pipeline = pipelines[i];
                await pipeline.initialize(next);
                next = inputs => pipeline.consume(inputs);
            }

            consumer = next;
        },
        consume: i => consumer(i),
        async finalize() {
            const out: any[] = [];
            for (const p of pipelines) out.push(await p.finalize());
            return out;
        },
    };
}