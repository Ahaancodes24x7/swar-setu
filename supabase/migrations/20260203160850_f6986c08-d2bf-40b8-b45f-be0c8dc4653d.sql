-- Add school and principal tracking for teacher-principal data sync

-- Add school_id to profiles for grouping users by school
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS school_id uuid DEFAULT NULL;

-- Create schools table if needed for multi-school support
CREATE TABLE IF NOT EXISTS public.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  city text,
  state text DEFAULT 'Maharashtra',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on schools
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- Anyone can view schools
CREATE POLICY "Anyone can view schools"
ON public.schools FOR SELECT
USING (true);

-- Principals can manage their school
CREATE POLICY "Principals can manage schools"
ON public.schools FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.role = 'principal'
    AND p.school_id = schools.id
  )
);

-- Update teacher_grade_assignments to include school context
ALTER TABLE public.teacher_grade_assignments
ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);

-- Create view for principal dashboard aggregation
CREATE OR REPLACE VIEW public.principal_dashboard_stats AS
SELECT 
  p.school_id,
  COUNT(DISTINCT s.id) as total_students,
  COUNT(DISTINCT CASE WHEN ts.status = 'completed' THEN s.id END) as tested_students,
  COUNT(DISTINCT CASE WHEN s.status IN ('flagged', 'at-risk') THEN s.id END) as flagged_students,
  COALESCE(AVG(CASE WHEN ts.status = 'completed' THEN ts.overall_score END), 0) as avg_score
FROM public.profiles p
JOIN public.students s ON s.teacher_id = p.user_id
LEFT JOIN public.test_sessions ts ON ts.student_id = s.id
WHERE p.role = 'teacher'
GROUP BY p.school_id;

-- Allow read access to the view
GRANT SELECT ON public.principal_dashboard_stats TO authenticated;

-- Update students table to track when parent was linked
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS parent_linked_at timestamptz DEFAULT NULL;

-- Trigger to set parent_linked_at when parent_id is set
CREATE OR REPLACE FUNCTION public.set_parent_linked_at()
RETURNS trigger AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL AND OLD.parent_id IS NULL THEN
    NEW.parent_linked_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_parent_linked_at_trigger ON public.students;
CREATE TRIGGER set_parent_linked_at_trigger
BEFORE UPDATE ON public.students
FOR EACH ROW
EXECUTE FUNCTION public.set_parent_linked_at();

-- Enable realtime for principal dashboard updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.schools;