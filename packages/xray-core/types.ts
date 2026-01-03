export type StepType = "llm" | "search" | "filter" | "rank" | "select" | "custom";

export type RunStatus = "running" | "success" | "failure";

export type Json = Record<string, any>;

export type RunStart = {
  pipeline: string;
  pipelineVersion?: string;
  entity?: { type: string; id: string };
  tags?: Json;
};

export type RunFinish = {
  status?: Exclude<RunStatus, "running">; // default success
  outcome?: Json;
  error?: Json;
};

export type StepMeta = {
  name: string;
  type: StepType;
};

export type StepMetrics = Partial<{
  candidates_in: number;
  candidates_out: number;
  drop_ratio: number;
  model: string;
  temperature: number;
  score_top: number;
}>;

export type ArtifactRef = {
  artifact_id?: string;
  kind: string;
  uri: string;
  content_type?: string;
  bytes?: number;
  summary?: Json;
};

export type StepEndPayload = {
  output?: Json;
  why?: string;
  why_json?: Json;
  metrics?: StepMetrics;
  artifact_refs?: ArtifactRef[];
  warnings?: Json[];
};

export type XRayEvent =
  | { type: "run_start"; run: RunStart; run_id?: string; ts?: string }
  | { type: "run_finish"; run_id: string; finish: RunFinish; ts?: string }
  | { type: "step_start"; run_id: string; seq: number; meta: StepMeta; input?: Json; ts?: string }
  | { type: "step_end"; run_id: string; seq: number; payload: StepEndPayload; ts?: string };
