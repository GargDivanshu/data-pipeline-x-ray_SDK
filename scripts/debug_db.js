const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local', silent: true });
require('dotenv').config({ path: '.env', silent: true });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function debug() {
    try {
        const runs = await pool.query('SELECT count(*) FROM xray_runs');
        const steps = await pool.query('SELECT count(*) FROM xray_steps');
        console.log('Runs count:', runs.rows[0].count);
        console.log('Steps count:', steps.rows[0].count);

        if (parseInt(runs.rows[0].count) > 0) {
            const firstRun = await pool.query('SELECT * FROM xray_runs LIMIT 1');
            const runId = firstRun.rows[0].run_id;
            console.log('Sample Run:', firstRun.rows[0]);

            // Manual Insert Test
            try {
                await pool.query(
                    `INSERT INTO xray_steps (run_id, seq, step_name, step_type, start_time, status)
                     VALUES ($1, 999, 'debug-step', 'custom', NOW(), 'pending')
                     ON CONFLICT (run_id, seq) DO NOTHING`,
                    [runId]
                );
                console.log("Manual INSERT successful");
            } catch (e) {
                console.error("Manual INSERT failed:", e);
            }
        }

        const stepsAfter = await pool.query('SELECT count(*) FROM xray_steps');
        console.log('Steps count after manual insert:', stepsAfter.rows[0].count);
    } catch (err) {
        console.error('Debug failed:', err);
    } finally {
        await pool.end();
    }
}

debug();
