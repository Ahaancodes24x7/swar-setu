
-- ================================================================
-- FIX: Change all SELECT policies to PERMISSIVE (OR logic)
-- Currently all are RESTRICTIVE (AND), which means a principal
-- must also be a teacher/parent to see data — this is wrong.
-- ================================================================

-- ===================== PROFILES =====================
-- Drop existing restrictive SELECT policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "principal_read_all_profiles" ON public.profiles;

-- Recreate as PERMISSIVE (default)
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "principal_read_all_profiles"
  ON public.profiles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'principal'::user_role
  ));

-- ===================== STUDENTS =====================
-- Drop existing restrictive SELECT policies
DROP POLICY IF EXISTS "Teachers can view their students" ON public.students;
DROP POLICY IF EXISTS "principal_read_all_students" ON public.students;

-- Recreate as PERMISSIVE
CREATE POLICY "Teachers can view their students"
  ON public.students FOR SELECT
  USING (teacher_id = auth.uid() OR parent_id = auth.uid());

CREATE POLICY "principal_read_all_students"
  ON public.students FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'principal'::user_role
  ));

-- ===================== TEST_SESSIONS =====================
-- Drop existing restrictive SELECT policies
DROP POLICY IF EXISTS "Teachers and parents can view test sessions" ON public.test_sessions;
DROP POLICY IF EXISTS "parent_read_linked_student_sessions" ON public.test_sessions;
DROP POLICY IF EXISTS "principal_read_all_test_sessions" ON public.test_sessions;
DROP POLICY IF EXISTS "teacher_read_own_test_sessions" ON public.test_sessions;

-- Recreate as PERMISSIVE
CREATE POLICY "Teachers and parents can view test sessions"
  ON public.test_sessions FOR SELECT
  USING (
    conducted_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.students
      WHERE students.id = test_sessions.student_id
      AND (students.teacher_id = auth.uid() OR students.parent_id = auth.uid())
    )
  );

CREATE POLICY "principal_read_all_test_sessions"
  ON public.test_sessions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'principal'::user_role
  ));

-- ===================== TEACHER INSERT POLICIES =====================
-- Fix duplicate insert policies on test_sessions
DROP POLICY IF EXISTS "Teachers can insert test sessions" ON public.test_sessions;
DROP POLICY IF EXISTS "teacher_insert_test_sessions" ON public.test_sessions;

CREATE POLICY "Teachers can insert test sessions"
  ON public.test_sessions FOR INSERT
  WITH CHECK (conducted_by = auth.uid());
