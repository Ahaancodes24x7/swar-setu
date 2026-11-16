-- Student profiles and DSM-5 teacher/operator questionnaire.
-- Written by the SwarSetu backend only (service connection); RLS without policies keeps the
-- public anon/authenticated API roles out of children's profile data.

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

ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profile_history ENABLE ROW LEVEL SECURITY;
