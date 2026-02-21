-- Fix the overly permissive INSERT policy on user_badges
DROP POLICY IF EXISTS "System can insert badges" ON public.user_badges;

-- Create more restrictive insert policy - only allow inserts for students the user has access to
CREATE POLICY "Users can insert badges for their students"
ON public.user_badges
FOR INSERT
WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM students s 
        WHERE s.id = user_badges.student_id 
        AND (s.teacher_id = auth.uid() OR s.parent_id = auth.uid())
    )
);