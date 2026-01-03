-- Runs Table
CREATE TABLE IF NOT EXISTS xray_runs (
    run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_name TEXT NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    status TEXT CHECK (status IN ('running', 'completed', 'failed')) DEFAULT 'running',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Steps Table
CREATE TABLE IF NOT EXISTS xray_steps (
    step_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES xray_runs(run_id) ON DELETE CASCADE,
    seq INTEGER NOT NULL, -- Sequence number from SDK
    step_name TEXT NOT NULL,
    step_type TEXT NOT NULL, -- 'llm', 'search', 'filter', 'rank', 'select', 'custom'
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    inputs JSONB DEFAULT '{}'::jsonb, -- references to artifacts or small raw data
    outputs JSONB DEFAULT '{}'::jsonb, -- references to artifacts or small raw data
    metrics JSONB DEFAULT '{}'::jsonb, -- mandatory typed metrics
    explanation TEXT, -- "why" this happened
    status TEXT CHECK (status IN ('pending', 'completed', 'failed')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(run_id, seq)
);

-- Indexes for Queryability
CREATE INDEX IF NOT EXISTS idx_xray_runs_pipeline_name ON xray_runs(pipeline_name);
CREATE INDEX IF NOT EXISTS idx_xray_runs_status ON xray_runs(status);
CREATE INDEX IF NOT EXISTS idx_xray_steps_run_id ON xray_steps(run_id);
CREATE INDEX IF NOT EXISTS idx_xray_steps_type ON xray_steps(step_type);
-- Index for querying specific metrics might be needed, using GIN for JSONB
CREATE INDEX IF NOT EXISTS idx_xray_steps_metrics ON xray_steps USING GIN (metrics);
