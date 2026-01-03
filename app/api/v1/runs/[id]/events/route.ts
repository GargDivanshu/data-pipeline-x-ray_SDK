import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { XRayEvent } from '@/packages/xray-core/types';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: runId } = await params;

    if (!runId) {
        return NextResponse.json({ error: 'Missing run ID' }, { status: 400 });
    }

    console.log(`[API] Processing events for run: ${runId}`);

    try {
        const body = await request.json();
        const events = body as XRayEvent[];

        if (!Array.isArray(events)) {
            console.error('[API] Events payload is not an array:', typeof events);
            return NextResponse.json({ error: 'Expected array' }, { status: 400 });
        }

        // GUARDRAIL 2: All DB calls must be explicitly awaited.
        // We process sequentially.
        for (const event of events) {
            console.log(`[API] Event: ${event.type}`);

            if (event.type === 'step_start') {
                const { seq, meta, input, ts } = event;
                const startTime = ts || new Date().toISOString();

                console.log(`[API] Inserting step ${seq}`);

                // Direct INSERT
                await db.query(
                    `INSERT INTO xray_steps (run_id, seq, step_name, step_type, start_time, inputs, status)
                     VALUES ($1, $2, $3, $4, $5, $6, 'pending')
                     ON CONFLICT (run_id, seq) DO UPDATE
                     SET step_name = EXCLUDED.step_name,
                         step_type = EXCLUDED.step_type,
                         start_time = EXCLUDED.start_time,
                         inputs = EXCLUDED.inputs`,
                    [runId, seq, meta.name, meta.type, startTime, JSON.stringify(input || {})]
                );
            }
            else if (event.type === 'step_end') {
                const { seq, payload, ts } = event;
                const endTime = ts || new Date().toISOString();

                console.log(`[API] Updating step ${seq} end`);

                // GUARDRAIL 1: Explicitly check rowCount
                const result = await db.query(
                    `UPDATE xray_steps
                     SET end_time = $1,
                         outputs = $2,
                         metrics = $3,
                         explanation = $4,
                         status = 'completed'
                     WHERE run_id = $5 AND seq = $6`,
                    [
                        endTime,
                        JSON.stringify(payload.output || {}),
                        JSON.stringify(payload.metrics || {}), // Metrics persistence
                        // GUARDRAIL: Truncate explanation to sensible length (2KB)
                        payload.why ? payload.why.substring(0, 2048) : null,
                        runId,
                        seq
                    ]
                );

                if (result.rowCount === 0) {
                    console.error(`[API] ERROR: step_end update affected 0 rows for run ${runId} seq ${seq}`);
                } else {
                    console.log(`[API] Step ${seq} updated safely.`);
                }
            }
            else if (event.type === 'run_finish') {
                const { finish, ts } = event;
                const endTime = ts || new Date().toISOString();

                // Correction: SDK sends 'success' or 'failure'. DB expects 'completed' or 'failed'.
                const dbStatus = finish.status === 'success' ? 'completed' : 'failed';

                console.log(`[API] Finishing run ${runId} with status ${dbStatus}`);

                // GUARDRAIL 3: run_finish must update run row
                const result = await db.query(
                    `UPDATE xray_runs
                     SET end_time = $1,
                         status = $2,
                         metadata = metadata || $3
                     WHERE run_id = $4`,
                    [
                        endTime,
                        dbStatus,
                        JSON.stringify({ outcome: finish.outcome, error: finish.error }),
                        runId
                    ]
                );

                if (result.rowCount === 0) {
                    console.error(`[API] ERROR: run_finish update affected 0 rows for run ${runId}`);
                } else {
                    console.log(`[API] Run ${runId} finished safely.`);
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[API] Critical error ingesting events:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
