-- Enable RLS (safe if already enabled)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_sessions ENABLE ROW LEVEL SECURITY;

-- Principals: demo/analytics read across platform
DO $$ BEGIN
  CREATE POLICY principal_read_all_profiles
  ON public.profiles
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'principal'
  ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY principal_read_all_students
  ON public.students
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'principal'
  ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY principal_read_all_test_sessions
  ON public.test_sessions
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'principal'
  ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Teachers: can insert sessions they conduct
DO $$ BEGIN
  CREATE POLICY teacher_insert_test_sessions
  ON public.test_sessions
  FOR INSERT
  WITH CHECK (conducted_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Teachers: can read sessions they conducted
DO $$ BEGIN
  CREATE POLICY teacher_read_own_test_sessions
  ON public.test_sessions
  FOR SELECT
  USING (conducted_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Parents: can read sessions for linked students (by parent_id)
DO $$ BEGIN
  CREATE POLICY parent_read_linked_student_sessions
  ON public.test_sessions
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = test_sessions.student_id AND s.parent_id = auth.uid()
  ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
