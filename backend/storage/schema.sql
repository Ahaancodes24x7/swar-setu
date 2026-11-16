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

CREATE TABLE IF NOT EXISTS public.student_profiles (
    student_id      TEXT PRIMARY KEY,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    filled_by       TEXT,
    schema_version  INTEGER NOT NULL,
    answers         JSONB NOT NULL
);

-- every saved version, so earlier answers are never lost when a profile is edited
CREATE TABLE IF NOT EXISTS public.student_profile_history (
    id              UUID PRIMARY KEY,
    student_id      TEXT NOT NULL,
    saved_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    filled_by       TEXT,
    schema_version  INTEGER NOT NULL,
    answers         JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_profile_history_student ON public.student_profile_history (student_id, saved_at DESC);

-- premium/freemium tier per student: premium unlocks the parent dashboard
CREATE TABLE IF NOT EXISTS public.student_access (
    student_id      TEXT PRIMARY KEY,
    name            TEXT,
    grade           TEXT,
    parent_email    TEXT,
    tier            TEXT NOT NULL DEFAULT 'freemium' CHECK (tier IN ('freemium', 'premium')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by      TEXT
);
