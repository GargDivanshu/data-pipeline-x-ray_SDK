import 'dotenv/config';
import { db } from './lib/db';

async function verifyExplanations() {
    console.log("Verifying step explanations...");

    const query = `
        SELECT step_name, explanation
        FROM xray_steps
        WHERE explanation IS NOT NULL
        ORDER BY created_at DESC;
    `;

    const res = await db.query(query);

    if (res.rows.length === 0) {
        console.error("❌ FAILED: No explanations found in DB");
    } else {
        console.log(`✅ SUCCESS: Found ${res.rows.length} steps with explanations`);
        res.rows.forEach(r => console.log(`   [${r.step_name}] ${r.explanation}`));
    }
    process.exit(0);
}

verifyExplanations().catch(console.error);
