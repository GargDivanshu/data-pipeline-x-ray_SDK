import { StepType, StepMetrics, Json, ArtifactRef } from "../xray-core/types";
import { XRayRun } from "./run";

export class StepContext {
    public metrics: StepMetrics = {};

    constructor(
        private run: XRayRun,
        private seq: number
    ) { }

    addMetric(key: keyof StepMetrics, value: number | string) {
        // @ts-ignore
        this.metrics[key] = value;
    }
}

export type StepFunction<T> = (context: StepContext) => Promise<T>;

// Minimal step wrapper helper
export async function executeStep<T>(
    run: XRayRun,
    name: string,
    type: StepType,
    fn: (ctx: StepContext) => Promise<T>,
    inputs?: Json
): Promise<T> {
    const seq = run.nextSeq();
    const startTime = new Date().toISOString();

    await run.emit({
        type: "step_start",
        run_id: run.id,
        seq,
        meta: { name, type },
        input: inputs,
        ts: startTime
    });

    const ctx = new StepContext(run, seq);

    try {
        const result = await fn(ctx);

        // Infer metrics if result has them? 
        // For V1, we assume result is the output.
        // If the user wants to return metrics, they might need a sophisticated return type
        // OR we just take the result as output.

        await run.emit({
            type: "step_end",
            run_id: run.id,
            seq,
            payload: {
                output: result as unknown as Json,
                metrics: ctx.metrics
            },
            ts: new Date().toISOString()
        });

        return result;
    } catch (err) {
        await run.emit({
            type: "step_end",
            run_id: run.id,
            seq,
            payload: {
                // error info in output or why?
                why: String(err),
                output: { error: String(err) }
            },
            ts: new Date().toISOString()
        });
        throw err;
    }
}
