import 'dotenv/config';
import { db } from './lib/db';

async function verifyCrossPipeline() {
    console.log("Verifying cross-pipeline metrics...");

    const query = `
        SELECT
          r.pipeline_name,
          s.step_name,
          (s.metrics->>'drop_ratio')::float AS drop_ratio
        FROM xray_steps s
        JOIN xray_runs r USING (run_id)
        WHERE s.step_type = 'filter'
          AND (s.metrics->>'drop_ratio')::float > 0.9
        ORDER BY r.created_at DESC;
    `;

    const res = await db.query(query);

    if (res.rows.length < 2) {
        console.error("❌ FAILED: Expected at least 2 rows (one from each pipeline). Found:", res.rows.length);
        res.rows.forEach(r => console.log(r));
    } else {
        const pipelines = new Set(res.rows.map(r => r.pipeline_name));
        if (pipelines.has('competitor-selection') && pipelines.has('product-categorization')) {
            console.log("✅ SUCCESS: Found high drop_ratio steps from both pipelines!");
            res.rows.forEach(r => console.log(`   Pipeline: ${r.pipeline_name} | Step: ${r.step_name} | Drop: ${r.drop_ratio}`));
        } else {
            console.error("❌ FAILED: Did not find both pipelines. Found:", pipelines);
        }
    }
    process.exit(0);
}

verifyCrossPipeline().catch(console.error);
