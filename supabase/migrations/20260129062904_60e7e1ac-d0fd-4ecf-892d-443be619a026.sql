-- 1. Create user roles enum and table for secure role management
CREATE TYPE public.app_role AS ENUM ('parent', 'teacher', 'principal');

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Users can read their own role
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create security definer function to check role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Trigger to auto-create user_role on signup (from metadata)
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
BEGIN
  -- Get role from metadata, default to parent
  user_role := COALESCE(
    (NEW.raw_user_meta_data->>'role')::app_role, 
    'parent'::app_role
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created_role
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- 2. Create badges and achievements tables
CREATE TABLE public.badge_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT NOT NULL DEFAULT 'Trophy',
    criteria_type TEXT NOT NULL, -- 'test_completed', 'streak', 'score_improvement', 'engagement', 'resource_completed'
    criteria_value INTEGER NOT NULL DEFAULT 1,
    points_awarded INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    badge_id UUID REFERENCES public.badge_definitions(id) ON DELETE CASCADE NOT NULL,
    earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(student_id, badge_id)
);

-- Enable RLS on badges
ALTER TABLE public.badge_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Everyone can read badge definitions
CREATE POLICY "Anyone can view badge definitions" 
ON public.badge_definitions 
FOR SELECT 
USING (true);

-- Users can view badges for students they have access to
CREATE POLICY "Users can view relevant badges" 
ON public.user_badges 
FOR SELECT 
USING (
    user_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM students s 
        WHERE s.id = user_badges.student_id 
        AND (s.teacher_id = auth.uid() OR s.parent_id = auth.uid())
    )
);

-- System can insert badges (via edge function)
CREATE POLICY "System can insert badges"
ON public.user_badges
FOR INSERT
WITH CHECK (true);

-- 3. Add teacher assignments for principal visibility
CREATE TABLE public.teacher_grade_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL,
    grade TEXT NOT NULL,
    subjects TEXT[] DEFAULT '{}',
    institute_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(teacher_id, grade)
);

ALTER TABLE public.teacher_grade_assignments ENABLE ROW LEVEL SECURITY;

-- Principals can view all teacher assignments
CREATE POLICY "Principals can view teacher assignments"
ON public.teacher_grade_assignments
FOR SELECT
USING (
    public.has_role(auth.uid(), 'principal'::app_role) OR
    teacher_id = auth.uid()
);

-- Teachers can insert their own assignments
CREATE POLICY "Teachers can insert own assignments"
ON public.teacher_grade_assignments
FOR INSERT
WITH CHECK (teacher_id = auth.uid());

-- 4. Add resource assignments table for teachers
CREATE TABLE public.teacher_resource_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL,
    resource_id UUID REFERENCES public.learning_resources(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    class_grade TEXT,
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.teacher_resource_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage their assignments"
ON public.teacher_resource_assignments
FOR ALL
USING (teacher_id = auth.uid())
WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Students and parents can view their assignments"
ON public.teacher_resource_assignments
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM students s 
        WHERE s.id = teacher_resource_assignments.student_id 
        AND (s.teacher_id = auth.uid() OR s.parent_id = auth.uid())
    )
);

-- 5. Create voice analysis results for Saathi
CREATE TABLE public.voice_practice_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    parent_id UUID NOT NULL,
    prompt_text TEXT NOT NULL,
    spoken_text TEXT,
    pronunciation_score NUMERIC,
    fluency_score NUMERIC,
    hesitation_count INTEGER DEFAULT 0,
    pause_duration_ms INTEGER DEFAULT 0,
    accuracy_score NUMERIC,
    feedback TEXT,
    audio_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.voice_practice_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can manage their sessions"
ON public.voice_practice_sessions
FOR ALL
USING (parent_id = auth.uid())
WITH CHECK (parent_id = auth.uid());

CREATE POLICY "Teachers can view student sessions"
ON public.voice_practice_sessions
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM students s 
        WHERE s.id = voice_practice_sessions.student_id 
        AND s.teacher_id = auth.uid()
    )
);

-- 6. Insert default badge definitions
INSERT INTO public.badge_definitions (code, name, description, icon, criteria_type, criteria_value, points_awarded) VALUES
('first_test', 'First Test', 'Completed your first assessment', 'Trophy', 'test_completed', 1, 10),
('five_day_streak', '5-Day Streak', 'Practiced for 5 days in a row', 'Flame', 'streak', 5, 25),
('ten_day_streak', '10-Day Streak', 'Practiced for 10 days in a row', 'Flame', 'streak', 10, 50),
('perfect_score', 'Perfect Score', 'Achieved 100% on an assessment', 'Target', 'score_improvement', 100, 100),
('speed_reader', 'Speed Reader', 'Completed 5 reading exercises', 'Zap', 'resource_completed', 5, 30),
('math_whiz', 'Math Whiz', 'Completed 5 number exercises', 'Calculator', 'resource_completed', 5, 30),
('first_resource', 'First Resource', 'Opened your first learning resource', 'BookOpen', 'resource_completed', 1, 5),
('parent_engaged', 'Parent Engaged', 'Parent completed 3 practice sessions with child', 'Heart', 'engagement', 3, 20),
('improvement_star', 'Improvement Star', 'Improved score by 10% from previous test', 'Star', 'score_improvement', 10, 40),
('phonics_pro', 'Phonics Pro', 'Completed 5 phonics exercises', 'Volume2', 'resource_completed', 5, 30);

-- Enable realtime for badges
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_badges;