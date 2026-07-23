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