import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { RunStart } from '@/packages/xray-core/types';

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as RunStart;
        const { pipeline, tags, entity } = body;

        // Validate minimal requirement
        if (!pipeline) {
            return NextResponse.json({ error: 'pipeline name required' }, { status: 400 });
        }

        // Merge entity and tags into metadata for now, or just store as is.
        // Schema says: pipeline_name, start_time, status, metadata.
        // We'll put tags and entity into metadata.
        const metadata = {
            ...tags,
            entity,
        };

        const result = await db.query(
            `INSERT INTO xray_runs (pipeline_name, metadata, status, start_time)
       VALUES ($1, $2, 'running', NOW())
       RETURNING run_id`,
            [pipeline, JSON.stringify(metadata)]
        );

        const runId = result.rows[0].run_id;

        return NextResponse.json({ run_id: runId });
    } catch (error) {
        console.error('Error creating run:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
