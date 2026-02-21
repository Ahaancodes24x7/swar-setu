-- ============================================================
-- FIX 1: Drop recursive RLS policies that cause infinite recursion
-- The principal_read_all_profiles policy queries the profiles table
-- FROM WITHIN a policy on the profiles table = infinite recursion.
-- This breaks ALL queries for principals (and even teachers because
-- their students/test_sessions policies also subquery profiles).
-- ============================================================

DROP POLICY IF EXISTS "principal_read_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "principal_read_all_students" ON public.students;
DROP POLICY IF EXISTS "principal_read_all_test_sessions" ON public.test_sessions;

-- Recreate using has_role() which is SECURITY DEFINER and uses user_roles table (no recursion)
CREATE POLICY "principal_read_all_profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'principal'::app_role));

CREATE POLICY "principal_read_all_students" ON public.students
  FOR SELECT USING (public.has_role(auth.uid(), 'principal'::app_role));

CREATE POLICY "principal_read_all_test_sessions" ON public.test_sessions
  FOR SELECT USING (public.has_role(auth.uid(), 'principal'::app_role));

-- ============================================================
-- FIX 2: Recreate missing triggers on auth.users
-- These triggers were never created, so new users don't get
-- profiles or user_roles entries automatically.
-- ============================================================

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_role();

-- Also add set_parent_linked_at trigger on students
CREATE OR REPLACE TRIGGER set_parent_linked_at_trigger
  BEFORE UPDATE ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.set_parent_linked_at();

-- Also add updated_at triggers
CREATE OR REPLACE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- FIX 3: Backfill user_roles for all existing users missing entries
-- 7 of 10 users currently have no user_roles row, so has_role()
-- returns false for them. This breaks principal access.
-- ============================================================

INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, p.role::text::app_role
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id
)
ON CONFLICT DO NOTHING;