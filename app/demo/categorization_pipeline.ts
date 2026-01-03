import { XRayClient } from "../../packages/xray-sdk/index";

// Mock delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
    const client = new XRayClient("http://localhost:3000/api/v1");

    console.log("Starting product-categorization pipeline...");
    const run = await client.startRun({
        pipeline: "product-categorization",
        entity: { type: "product", id: "P-999-XYZ" },
        tags: { department: "home-goods", priority: "high" }
    });
    console.log(`Run started: ${run.id}`);

    try {
        // Step 1: Extract Attributes (LLM)
        const attributes = await run.step("extract-attributes", "llm", async (ctx) => {
            await delay(300);
            return {
                name: "Smart Coffee Maker",
                features: ["wifi", "programmable", "thermal carafe"],
                price_range: "mid-high"
            };
        });

        // Step 2: Filter Categories (Filter)
        // Simulate checking 100 possible categories, filtered down to small set
        const potentialCategories = await run.step("filter-categories", "filter", async (ctx) => {
            await delay(200);

            const totalCategories = 100;
            // Generate dummy categories, only 3 are relevant
            const allCategories = Array.from({ length: totalCategories }, (_, i) => ({
                id: `cat_${i}`,
                name: i < 3 ? `Relevant Category ${i}` : `Irrelevant Category ${i}`,
                score: i < 3 ? 0.95 : 0.05
            }));

            const filtered = allCategories.filter(c => c.score > 0.5);

            // CRITICAL: Emit standard metrics
            ctx.addMetric("candidates_in", totalCategories);
            ctx.addMetric("candidates_out", filtered.length);
            ctx.addMetric("drop_ratio", (totalCategories - filtered.length) / totalCategories);

            return filtered;
        });

        // Step 3: Rank Categories (Rank)
        const ranked = await run.step("rank-categories", "rank", async (ctx) => {
            await delay(150);
            return potentialCategories.sort((a, b) => b.score - a.score);
        });

        // Step 4: Select Category (Select)
        const selection = await run.step("select-category", "select", async (ctx) => {
            if (ranked.length === 0) throw new Error("No categories found!");
            await delay(100);
            return ranked[0];
        });

        console.log("Pipeline finished successfully. Category:", selection.name);
        await run.finish({ result: selection });

    } catch (err) {
        console.error("Pipeline failed:", err);
        await run.finish(undefined, { message: String(err) });
    }
}

main().catch(console.error);
