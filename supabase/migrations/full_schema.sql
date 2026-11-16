-- Create user roles enum
CREATE TYPE public.user_role AS ENUM ('parent', 'teacher', 'principal');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'parent',
  institute_name TEXT,
  grades TEXT[], -- For teachers: which grades they teach
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create students table
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  grade TEXT NOT NULL,
  teacher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  parent_email TEXT,
  status TEXT NOT NULL DEFAULT 'normal' CHECK (status IN ('normal', 'flagged', 'reviewed')),
  total_points INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create test_sessions table
CREATE TABLE public.test_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  conducted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  test_type TEXT NOT NULL CHECK (test_type IN ('voice', 'written')),
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
  overall_score NUMERIC(5,2),
  reading_score NUMERIC(5,2),
  number_score NUMERIC(5,2),
  phoneme_score NUMERIC(5,2),
  flagged_conditions TEXT[], -- e.g., ['dyslexia', 'dyscalculia']
  analysis_report JSONB,
  audio_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create voice_analysis table for detailed speech analysis
CREATE TABLE public.voice_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.test_sessions(id) ON DELETE CASCADE NOT NULL,
  phoneme_error_rate NUMERIC(5,2),
  pronunciation_consistency NUMERIC(5,2),
  prosodic_score NUMERIC(5,2),
  temporal_score NUMERIC(5,2),
  error_pattern_density NUMERIC(5,2),
  transcription TEXT,
  phoneme_errors JSONB, -- Array of {expected, actual, position}
  detailed_metrics JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_analysis ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Students policies
CREATE POLICY "Teachers can view their students"
  ON public.students FOR SELECT
  USING (teacher_id = auth.uid() OR parent_id = auth.uid());

CREATE POLICY "Teachers can insert students"
  ON public.students FOR INSERT
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Teachers can update their students"
  ON public.students FOR UPDATE
  USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can delete their students"
  ON public.students FOR DELETE
  USING (teacher_id = auth.uid());

-- Test sessions policies
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

CREATE POLICY "Teachers can insert test sessions"
  ON public.test_sessions FOR INSERT
  WITH CHECK (conducted_by = auth.uid());

CREATE POLICY "Teachers can update their test sessions"
  ON public.test_sessions FOR UPDATE
  USING (conducted_by = auth.uid());

-- Voice analysis policies
CREATE POLICY "Users can view voice analysis for their sessions"
  ON public.voice_analysis FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.test_sessions ts
      JOIN public.students s ON s.id = ts.student_id
      WHERE ts.id = voice_analysis.session_id
      AND (ts.conducted_by = auth.uid() OR s.teacher_id = auth.uid() OR s.parent_id = auth.uid())
    )
  );

CREATE POLICY "Teachers can insert voice analysis"
  ON public.voice_analysis FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.test_sessions ts
      WHERE ts.id = voice_analysis.session_id
      AND ts.conducted_by = auth.uid()
    )
  );

-- Enable realtime for session updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.test_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.students;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for timestamps
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'parent')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Migration File --

-- Create learning resources table
CREATE TABLE public.learning_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  resource_type TEXT NOT NULL, -- 'reading', 'phonics', 'number_sense', 'visual', 'audio'
  skill_targeted TEXT NOT NULL,
  grade_min INTEGER NOT NULL DEFAULT 1,
  grade_max INTEGER NOT NULL DEFAULT 8,
  language TEXT NOT NULL DEFAULT 'en',
  url TEXT,
  duration_minutes INTEGER,
  difficulty TEXT DEFAULT 'medium', -- 'easy', 'medium', 'hard'
  conditions TEXT[] DEFAULT '{}', -- 'dyslexia', 'dyscalculia', 'general'
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create resource interactions tracking table
CREATE TABLE public.resource_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_id UUID REFERENCES public.learning_resources(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL,
  opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed BOOLEAN DEFAULT false,
  time_spent_minutes INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.learning_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_interactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for learning_resources (publicly readable)
CREATE POLICY "Anyone can view learning resources"
  ON public.learning_resources FOR SELECT
  USING (true);

-- RLS policies for resource_interactions
CREATE POLICY "Parents can view their interactions"
  ON public.resource_interactions FOR SELECT
  USING (parent_id = auth.uid());

CREATE POLICY "Parents can insert interactions"
  ON public.resource_interactions FOR INSERT
  WITH CHECK (parent_id = auth.uid());

CREATE POLICY "Parents can update their interactions"
  ON public.resource_interactions FOR UPDATE
  USING (parent_id = auth.uid());

-- Insert initial learning resources
INSERT INTO public.learning_resources (title, description, resource_type, skill_targeted, grade_min, grade_max, language, url, duration_minutes, difficulty, conditions) VALUES
-- Reading/Phonics resources for Dyslexia
('Phonics Fun: Letter Sounds', 'Learn letter sounds through interactive games', 'phonics', 'Phonological Awareness', 1, 3, 'en', 'https://www.starfall.com/h/ltr-classic/', 15, 'easy', ARRAY['dyslexia', 'general']),
('Syllable Clapping Game', 'Practice breaking words into syllables', 'phonics', 'Syllable Segmentation', 1, 4, 'en', 'https://www.education.com/game/syllable-clap/', 10, 'easy', ARRAY['dyslexia']),
('Word Family Rhymes', 'Learn rhyming patterns with word families', 'reading', 'Phoneme Awareness', 1, 3, 'en', 'https://www.readingrockets.org/article/word-families', 15, 'easy', ARRAY['dyslexia', 'general']),
('Reading Fluency Practice', 'Short passages for reading practice', 'reading', 'Reading Fluency', 2, 5, 'en', 'https://www.readworks.org/', 20, 'medium', ARRAY['dyslexia', 'general']),
('Visual Word Recognition', 'Practice sight words with visual cues', 'visual', 'Word Recognition', 1, 4, 'en', 'https://www.sightwords.com/sight-words/games/', 15, 'easy', ARRAY['dyslexia']),

-- Hindi Reading Resources
('हिंदी वर्णमाला (Hindi Alphabets)', 'Learn Hindi letters through sounds', 'phonics', 'Letter Recognition', 1, 3, 'hi', 'https://www.hindibhasha.com/', 15, 'easy', ARRAY['dyslexia', 'general']),
('मात्रा अभ्यास (Matra Practice)', 'Practice Hindi vowel marks', 'reading', 'Hindi Phonics', 1, 4, 'hi', 'https://www.hindibhasha.com/matra/', 20, 'medium', ARRAY['dyslexia']),

-- Number Sense resources for Dyscalculia
('Number Line Adventures', 'Understand number placement on a line', 'number_sense', 'Number Sense', 1, 4, 'en', 'https://www.mathplayground.com/number_bonds_20.html', 15, 'easy', ARRAY['dyscalculia', 'general']),
('Counting with Objects', 'Learn counting through visual objects', 'number_sense', 'Counting Skills', 1, 2, 'en', 'https://www.topmarks.co.uk/learning-to-count/teddy-numbers', 10, 'easy', ARRAY['dyscalculia', 'general']),
('Dot Pattern Recognition', 'Recognize quantities without counting', 'number_sense', 'Subitizing', 1, 3, 'en', 'https://www.nctm.org/Classroom-Resources/Illuminations/', 15, 'easy', ARRAY['dyscalculia']),
('Math Word Problems', 'Solve everyday math problems', 'number_sense', 'Problem Solving', 3, 6, 'en', 'https://www.khanacademy.org/math', 20, 'medium', ARRAY['dyscalculia', 'general']),
('Place Value Practice', 'Understand ones, tens, hundreds', 'number_sense', 'Place Value', 2, 4, 'en', 'https://www.mathgames.com/place-value', 15, 'medium', ARRAY['dyscalculia']),
('Pattern Recognition Games', 'Complete number patterns', 'number_sense', 'Sequential Logic', 2, 5, 'en', 'https://www.mathplayground.com/number_sequence.html', 15, 'medium', ARRAY['dyscalculia']),

-- Visual/Audio resources
('Audio Story Time', 'Listen to stories to improve comprehension', 'audio', 'Listening Comprehension', 1, 5, 'en', 'https://www.storynory.com/', 20, 'easy', ARRAY['dyslexia', 'general']),
('Visual Tracing Worksheets', 'Practice letter and number formation', 'visual', 'Fine Motor Skills', 1, 3, 'en', 'https://www.education.com/worksheets/', 15, 'easy', ARRAY['dyslexia', 'dyscalculia', 'general']),

-- General grade-appropriate resources
('Reading Comprehension Stories', 'Age-appropriate reading passages', 'reading', 'Comprehension', 3, 6, 'en', 'https://www.readtheory.org/', 25, 'medium', ARRAY['general']),
('Math Facts Practice', 'Practice basic arithmetic facts', 'number_sense', 'Arithmetic Fluency', 2, 5, 'en', 'https://www.xtramath.org/', 15, 'medium', ARRAY['general']),
('Spelling Bee Practice', 'Improve spelling with practice games', 'reading', 'Spelling', 2, 6, 'en', 'https://www.spellingcity.com/', 15, 'medium', ARRAY['general']),
('Mental Math Challenges', 'Build mental calculation skills', 'number_sense', 'Mental Math', 3, 8, 'en', 'https://www.mathplayground.com/mental-math.html', 15, 'hard', ARRAY['general']);

-- Enable realtime for interactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.resource_interactions;

-- Migration File --

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

-- Migration File --

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

-- Migration File --

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

-- Migration File --

-- Fix security issues from previous migration

-- Drop the security definer view and recreate as regular table-based query
DROP VIEW IF EXISTS public.principal_dashboard_stats;

-- Fix function search path
CREATE OR REPLACE FUNCTION public.set_parent_linked_at()
RETURNS trigger 
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL AND OLD.parent_id IS NULL THEN
    NEW.parent_linked_at = now();
  END IF;
  RETURN NEW;
END;
$$;

-- Migration File --

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


-- Migration File --


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
-- Drop existing restrictive SELECT & UPDATE policies
DROP POLICY IF EXISTS "Teachers can view their students" ON public.students;
DROP POLICY IF EXISTS "Teachers can update their students" ON public.students;
DROP POLICY IF EXISTS "principal_read_all_students" ON public.students;
DROP POLICY IF EXISTS "Parents can update parent_id" ON public.students;

-- Recreate as PERMISSIVE
CREATE POLICY "Teachers and parents can view students"
  ON public.students FOR SELECT
  USING (
    teacher_id = auth.uid() OR 
    parent_id = auth.uid() OR 
    LOWER(parent_email) = LOWER(auth.jwt() ->> 'email')
  );

CREATE POLICY "Teachers and parents can update students"
  ON public.students FOR UPDATE
  USING (
    teacher_id = auth.uid() OR 
    parent_id = auth.uid() OR 
    LOWER(parent_email) = LOWER(auth.jwt() ->> 'email')
  );

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


-- Migration File --

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

-- Migration File --

-- Fix the test_type check constraint to allow all test types
ALTER TABLE public.test_sessions DROP CONSTRAINT test_sessions_test_type_check;

ALTER TABLE public.test_sessions ADD CONSTRAINT test_sessions_test_type_check 
  CHECK (test_type = ANY (ARRAY['voice'::text, 'written'::text, 'dyslexia'::text, 'dyscalculia'::text, 'dysgraphia'::text, 'perception'::text]));