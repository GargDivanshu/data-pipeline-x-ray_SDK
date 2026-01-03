// packages/xray-sdk/run.ts
import { XRayEvent, RunStart, StepType, Json } from "../xray-core/types";
import { Transport } from "./transport";
import { executeStep } from "./step";

export class XRayRun {
    public id: string = "";
    private seqCounter = 0;
    private queue: XRayEvent[] = [];
    private transport: Transport;

    constructor(transport: Transport, runId: string) {
        this.transport = transport;
        this.id = runId;
    }

    nextSeq(): number {
        return ++this.seqCounter;
    }

    async emit(event: XRayEvent) {
        this.queue.push(event);
        // FORCE SYNC FLUSH for V1 Demo Correctness
        // Trade performance for correctness as requested.
        await this.flush();
    }

    async flush() {
        if (this.queue.length === 0) return;
        const events = [...this.queue];
        this.queue = [];
        await this.transport.send(events);
    }

    async step<T>(name: string, type: StepType, fn: (ctx: any) => Promise<T>, inputs?: Json): Promise<T> {
        return executeStep(this, name, type, fn, inputs);
    }

    async finish(outcome?: Json, error?: Json) {
        await this.emit({
            type: "run_finish",
            run_id: this.id,
            finish: {
                status: error ? "failure" : "success",
                outcome,
                error
            },
            ts: new Date().toISOString()
        });
        // emit flushes, but we can flush again to be safe/sure
        await this.flush();
    }
}

export class XRayClient {
    constructor(private baseUrl: string) { }

    async startRun(config: RunStart): Promise<XRayRun> {
        // Create run on backend
        const res = await fetch(`${this.baseUrl}/runs`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(config)
        });

        if (!res.ok) {
            throw new Error(`Failed to start run: ${res.statusText}`);
        }

        const { run_id } = await res.json();

        const transport = {
            send: async (events: XRayEvent[]) => {
                await fetch(`${this.baseUrl}/runs/${run_id}/events`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(events)
                });
            }
        };

        return new XRayRun(transport, run_id);
    }
}
