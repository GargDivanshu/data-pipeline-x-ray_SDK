import 'dotenv/config';
import { db } from './lib/db';

async function verify() {
    console.log("Verifying fixes...");

    // 1. Check rows in xray_steps
    console.log("\n--- Query 1: xray_steps rows ---");
    const steps = await db.query(`
        SELECT run_id, seq, step_name, step_type, metrics, status 
        FROM xray_steps 
        ORDER BY created_at DESC, seq ASC
        LIMIT 10
    `);

    if (steps.rows.length === 0) {
        console.error("❌ FAILED: No rows in xray_steps");
    } else {
        console.log(`✅ SUCCESS: Found ${steps.rows.length} rows`);
        steps.rows.forEach(r => console.log(`   ${r.seq} [${r.step_type}] ${r.step_name} (${r.status})`));
    }

    // 2. Check metrics
    console.log("\n--- Query 2: Metrics persistence ---");
    const metrics = await db.query(`
        SELECT
            run_id,
            step_name,
            (metrics->>'candidates_in')::int as in,
            (metrics->>'candidates_out')::int as out,
            (metrics->>'drop_ratio')::float as drop
        FROM xray_steps
        WHERE step_type = 'filter'
        AND (metrics->>'drop_ratio')::float > 0.0
        ORDER BY created_at DESC
        LIMIT 1
    `);

    if (metrics.rows.length === 0) {
        console.error("❌ FAILED: No filter steps with valid metrics found");
    } else {
        const row = metrics.rows[0];
        console.log(`✅ SUCCESS: Found filter metrics -> In: ${row.in}, Out: ${row.out}, Drop: ${row.drop}`);
        if (row.drop > 0.4) console.log("   (Drop ratio looks correct > 0.4)");

        // precise check for user request
        if (row.out < 5) {
            console.log(`✅ USER REQ: Candidates Out (${row.out}) is < 5`);
        } else {
            console.error(`❌ USER REQ FAILED: Candidates Out (${row.out}) is NOT < 5`);
        }
    }

    // 3. Check run status
    console.log("\n--- Query 3: Run Status ---");
    const run = await db.query(`
        SELECT run_id, status, end_time 
        FROM xray_runs 
        WHERE status = 'completed' 
        ORDER BY created_at DESC 
        LIMIT 1
    `);

    if (run.rows.length === 0) {
        console.error("❌ FAILED: No completed runs found");
    } else {
        console.log(`✅ SUCCESS: Found completed run ${run.rows[0].run_id}`);
        console.log(`   End time: ${run.rows[0].end_time}`);
    }

    process.exit(0);
}

verify().catch(console.error);
