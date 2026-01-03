import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const stepType = searchParams.get('step_type');
        const limit = parseInt(searchParams.get('limit') || '50');

        let queryText = `
      SELECT s.*, r.pipeline_name
      FROM xray_steps s
      JOIN xray_runs r ON s.run_id = r.run_id
    `;
        const params: any[] = [];

        if (stepType) {
            queryText += ` WHERE s.step_type = $1`;
            params.push(stepType);
        }

        queryText += ` ORDER BY s.created_at DESC LIMIT $${params.length + 1}`;
        params.push(limit);

        const result = await db.query(queryText, params);

        return NextResponse.json({ steps: result.rows });
    } catch (error) {
        console.error('Error fetching steps:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
