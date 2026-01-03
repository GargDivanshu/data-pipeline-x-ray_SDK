# X-Ray System Architecture

## Core Mental Model

The X-Ray system is built around three core concepts designed to make pipelines debuggable:

1.  **Run**: A single execution of a pipeline on an entity (e.g., "Find competitor for ASIN X").
2.  **Step**: A discrete business logic unit (LLM, Filter, Rank) that emitted a decision.
3.  **Artifact**: Bulky evidence (full HTML, large JSON) referenced by steps but stored separately.

### Step-Level Reasoning

Each decision step may emit a concise, human-readable explanation describing *why* the step produced its outcome (e.g., “Dropped 92% of candidates due to relevance threshold”).

This explanation is intentionally:
- post-hoc (not model chain-of-thought)
- compact
- human-debuggable
- safe to persist

Explanations complement structured metrics: metrics enable system-wide queries, while explanations provide local context during deep dives. Large or sensitive payloads are intentionally excluded and would be stored as external artifacts in a future iteration.

## Storage Philosophy: Hot vs. Cold

We explicitly split storage to maintain query performance and manage costs.

### Hot Storage (Postgres)
- **Content**: Runs, Steps, Metrics, structured Inputs/Outputs, "Why" explanations.
- **Goal**: Instant querying and filtering.
- **Killer Query**:
  ```sql
  SELECT run_id, step_name, candidates_in, candidates_out, drop_ratio
  FROM xray_steps
  WHERE step_type = 'filter'
    AND drop_ratio > 0.9
  ORDER BY drop_ratio DESC;
  ```
  *This works across pipelines because step_type and drop_ratio are standardized, not free-form logs.*
- **Constraint**: Data must be structured and relatively small.

### Cold Storage (Artifacts)
- **Content**: Large payloads (HTML bodies, full LLM context windows).
- **Goal**: Deep dive debugging for individual failures.
- **Constraint**: Accessed by ID, not queryable.

## SDK Design

The TypeScript SDK is designed to be **safe** and **unobtrusive**.

### Buffering & Transport
- Events (`step_start`, `step_end`) are buffered in-memory.
- Batches are flushed asynchronously to the generic `POST /events` endpoint.
- **Failure Handling**: The SDK uses a "best-effort" approach. If the observability backend is down, the production pipeline **must not fail**. Errors are logged, and execution continues.

### Step Context
- The SDK manages `seq` (sequence numbers) automatically to order steps.
- Steps are wrapped in a closure to safely capture start/end times and errors.

## Trade-offs

### Consistency vs. Availability
We prioritize **pipeline availability**. The SDK will drop events rather than blocking the main thread. This means X-Ray might occasionally miss data, but it will never take down the production system.

### Signal vs. Exhaustiveness
We do NOT store every byte of data. We store **signals** (metrics, decisions) in Postgres and **references** to heavy data.
- **Con**: If artifacts are lost or not captured, deep replayability is limited.

In production, step ingestion would be fully async with backpressure and partial drops; the demo prioritizes determinism to validate system semantics.

## Debugging Flow

**Example failure**: Phone case matched to laptop stand.

1.  **Query filter steps** with `drop_ratio > 0.9`.
2.  **Identify** `filter_candidates` step removing 99% of items.
3.  **Inspect** `why_json.top_reject_reasons`:
    - `category_mismatch`: 4720
4.  **Inspect** previous `search_candidates` step summary:
    - category distribution dominated by `laptop_stands`
5.  **Root cause**: Keyword generation polluted retrieval.

*This shows reasoning, not just tooling.*

## Why Not Logs?

This system is intentionally not a general-purpose log platform. Logs capture events, but they do not model decision structure, ordering, or semantic guarantees. X-Ray treats decision steps as first-class objects with standardized metrics, enabling cross-pipeline queries that would otherwise require brittle log parsing and strict team-wide conventions. Without these guarantees, identical questions would require each team to reinvent logging conventions, making cross-system analysis unreliable.

## Artifact Capture Policy

The developer decides what data is emitted as artifacts via the SDK. The backend enforces size ceilings and may downgrade full payloads to summaries under load. Metrics and step metadata are never dropped.
