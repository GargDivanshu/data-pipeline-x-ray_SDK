```md
# X-Ray System — V1 Build Contract (READ BEFORE CODING)

## What We Are Building (Non-Negotiable)

We are building an **X-Ray system for decision pipelines**.

We are **NOT** building:
- a tracing tool
- an observability/logging platform
- an LLM prompt store
- an AI monitoring product

### Core Purpose

> For any pipeline run:
> 1. Explain **why** the final decision happened  
> 2. Enable **cross-run analysis** of decision failures  

Everything implemented **must serve at least one** of these goals:

- Debug a single bad run  
- Detect patterns of failure across runs  

If a feature does **not** support either goal, **do not implement it**.

---

## Core Mental Model (Lock This In)

### 1. Run

A **Run** = one execution of a pipeline on one entity  
Example: `Find competitor for ASIN X`

A Run:
- has metadata (pipeline, entity, tags)
- has a start and end
- contains ordered **Steps**
- ends with an outcome or failure

---

### 2. Step

A **Step** = one business decision unit  
Examples:
- keyword generation (LLM)
- filter candidates
- rank items
- final selection

A Step:
- has a **name** (developer-defined)
- has a **type** (from a fixed vocabulary)
- has inputs, outputs, and metrics
- explains **why** it behaved the way it did
- may reference heavy artifacts

Steps are the **core unit of meaning** in the system.

---

### 3. Artifact

An **Artifact** = bulky, optional evidence  
Examples:
- full candidate lists
- LLM prompt + response
- rejection samples

Artifacts:
- are **never required** to understand a run
- exist only to enable deep dives
- can be dropped under load

---

## Storage Philosophy (Strict)

We intentionally split storage into **two tiers**.

### Hot / Queryable Storage (Postgres via Supabase)

Stores:
- runs
- steps
- typed metrics (`drop_ratio`, `candidates_in`, `candidates_out`)
- short explanations (`why`)

This enables:
- cross-pipeline queries
- debugging workflows
- future dashboards

### Cold / Bulky Storage (Artifacts)

Stores:
- large payloads
- optional evidence
- data that may be sampled or dropped

Artifacts are **referenced, not embedded**.

### Rule
- If Postgres is down → **system is broken**
- If artifacts are missing → **system is degraded but usable**

---

## V1 Scope — What We ARE Implementing

### Backend (Next.js API)

Only **three endpoints**:

#### 1. Create Run
`POST /api/v1/runs`

- creates a run row
- returns `run_id`

---

#### 2. Ingest Events (Batched)
`POST /api/v1/runs/:run_id/events`

Accepts:
- `step_start`
- `step_end`
- `run_finish`

Responsibilities:
- upsert step rows
- update metrics
- store explanations (`why`)
- attach artifact references

---

#### 3. Query Steps Across Runs
`GET /api/v1/steps`

Supports filtering by:
- `step_type`
- `drop_ratio` thresholds
- time window

This endpoint **proves cross-pipeline queryability**.

Nothing else is required for V1.

---

## SDK (TypeScript)

The SDK exists to make **correct instrumentation easy and cheap**.

### SDK Responsibilities
- hide event formatting
- buffer events
- flush asynchronously
- **never break production pipelines**

### SDK Features (V1)
- `startRun()`
- `run.step(name, type, fn)`
- `run.finish()`
- in-memory event queue
- `best_effort` vs `strict` mode

### SDK Explicitly Does NOT
- retry forever
- guarantee delivery
- block pipeline execution
- enforce heavy schemas

---

## Step Types (Fixed Vocabulary)

Every step must declare **exactly one** type:

- `llm`
- `search`
- `filter`
- `rank`
- `select`
- `custom`

No custom types beyond this in V1.

This constraint enables **cross-pipeline queries**.

---

## Standard Metrics (Critical)

Certain step types are expected to emit metrics.

| Step Type | Required Metrics |
|---------|------------------|
| filter | `candidates_in`, `candidates_out`, `drop_ratio` |
| rank | `candidates_in`, `candidates_out` (optional score stats) |
| llm | `model`, `temperature` (optional) |

If these metrics are missing → **cross-run queries fail**.

Metrics are **mandatory**.
Artifacts are optional.

---

## What We Are Explicitly NOT Building

❌ No UI (JSON + console demo is enough)  
❌ No auth / RBAC  
❌ No distributed tracing integration  
❌ No streaming ingestion  
❌ No Kafka / queues  
❌ No schema registry  
❌ No AI-generated explanations  
❌ No dashboards  
❌ No “AI observability” buzzwords  

If tempted to add any of these — **stop**.

---

## Debugging Flow (Success Criteria)

When a bad match happens (e.g. phone case → laptop stand):

A developer must be able to:
1. Fetch the run
2. See step order
3. Inspect:
   - keyword generation output
   - candidate distributions
   - filter drop ratios
   - ranking rationale
4. Answer **which step failed and why**

If this is possible, the system is successful.

---

## Capture Strategy (Performance Reality)

Assumptions:
- steps may process **thousands of candidates**
- storing all rejections is expensive

Therefore:
- metrics are **always captured**
- summaries are preferred
- samples are optional
- full payloads are rare

Decision authority:
- developer chooses capture level
- backend enforces limits

Artifacts may be dropped.  
Metrics must never be dropped.

---

## Folder Responsibilities

### `/packages/xray-core`
- shared types
- step conventions
- capture policy logic
- **NO** Next.js or Supabase imports

### `/packages/xray-sdk`
- developer-facing API
- event buffering
- transport abstraction
- `best_effort` vs `strict` logic

### `/apps/api`
- thin HTTP layer
- request parsing
- database writes
- **NO business logic**

If logic leaks into API routes, abstraction is broken.

---

## Implementation Order (Do Not Shuffle)

### Phase 1 — Backend Skeleton
- create tables
- implement:
  - `POST /runs`
  - `POST /runs/:id/events`
  - `GET /steps`

### Phase 2 — SDK Core
- XRay client
- Run object
- Step wrapper
- event queue + flush

### Phase 3 — Demo Pipeline
- fake competitor selection
- intentionally bad filter
- multiple runs
- prove queryability

### Phase 4 — Architecture Document
- explain WHY this model
- explain trade-offs
- explain debugging walkthrough

---

## Final Guardrail

If asked:
> “Why not store everything?”

Answer:
> “Debuggability requires **signal**, not exhaustiveness — and signal must remain queryable at scale.”

If this principle is violated, the implementation is wrong.
```
