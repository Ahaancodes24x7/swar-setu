-- SwarSetu screening store (PostgreSQL). Applied automatically by the backend;
-- also shipped as supabase/migrations/20261012000000_screening_store.sql.

CREATE TABLE IF NOT EXISTS public.screening_assessments (
    id              UUID PRIMARY KEY,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    student_id      TEXT,
    session_id      TEXT,
    disorder_type   TEXT NOT NULL,
    screening_mode  TEXT,
    model_id        TEXT NOT NULL,
    raw_payload     JSONB NOT NULL,
    feature_vector  JSONB NOT NULL,
    covariates      JSONB,
    prediction      JSONB NOT NULL,
    explanation     JSONB,
    remote_sync     JSONB
);
CREATE INDEX IF NOT EXISTS idx_screening_assessments_student
    ON public.screening_assessments (student_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.screening_outcomes (
    id              UUID PRIMARY KEY,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    assessment_id   UUID REFERENCES public.screening_assessments(id) ON DELETE CASCADE,
    student_id      TEXT,
    disorder        TEXT NOT NULL CHECK (disorder IN ('dyslexia', 'dyscalculia', 'dysgraphia')),
    diagnosis       SMALLINT NOT NULL CHECK (diagnosis IN (0, 1)),
    source          TEXT NOT NULL,
    notes           TEXT
);
CREATE INDEX IF NOT EXISTS idx_screening_outcomes_student ON public.screening_outcomes (student_id);

-- Supabase: children's screening data is written only by the backend (service connection).
-- Row-level security is enabled with no policies, so the public anon/authenticated API
-- roles cannot read or write these tables.
ALTER TABLE public.screening_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screening_outcomes ENABLE ROW LEVEL SECURITY;
