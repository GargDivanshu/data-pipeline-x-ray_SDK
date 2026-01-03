import { XRayClient } from "../../packages/xray-sdk/index";

// Mock delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
    const client = new XRayClient("http://localhost:3000/api/v1");

    console.log("Starting pipeline run...");
    const run = await client.startRun({
        pipeline: "competitor-selection",
        entity: { type: "asin", id: "B08XABCDEF" },
        tags: { region: "US", strategy: "aggressive" }
    });
    console.log(`Run started: ${run.id}`);

    try {
        // Step 1: Search candidates (LLM)
        const candidates = await run.step("generate-candidates", "llm", async (ctx) => {
            await delay(500);
            // Generate 50 candidates
            // We want < 5 to pass the filter (relevance > 0.5)
            // So we make 4 good ones (0.9) and 46 bad ones (0.1)
            const candidates = Array.from({ length: 50 }, (_, i) => ({
                id: `C${i + 1}`,
                name: `Competitor ${i + 1}`,
                relevance: i < 4 ? 0.9 : 0.1
            }));

            return candidates;
        });

        // Step 2: Filter low relevance (Filter)
        const filtered = await run.step("filter-relevance", "filter", async (ctx) => {
            await delay(200);
            const out = candidates.filter(c => c.relevance > 0.5);

            ctx.addMetric("candidates_in", candidates.length);
            ctx.addMetric("candidates_out", out.length);
            ctx.addMetric("drop_ratio", (candidates.length - out.length) / candidates.length);

            return out;
        });

        // Step 3: Rank by price/reviews (Rank)
        const ranked = await run.step("rank-candidates", "rank", async (ctx) => {
            await delay(300);
            ctx.addMetric("candidates_in", filtered.length);
            ctx.addMetric("candidates_out", filtered.length);
            return filtered.sort((a, b) => b.relevance - a.relevance);
        });

        // Step 4: Final Selection (Select)
        const selection = await run.step("select-winner", "select", async (ctx) => {
            if (ranked.length === 0) throw new Error("No candidates left!");
            await delay(100);
            return ranked[0];
        });

        console.log("Pipeline finished successfully. Winner:", selection.name);
        await run.finish({ winner: selection });

    } catch (err) {
        console.error("Pipeline failed:", err);
        await run.finish(undefined, { message: String(err) });
    }
}

main().catch(console.error);
