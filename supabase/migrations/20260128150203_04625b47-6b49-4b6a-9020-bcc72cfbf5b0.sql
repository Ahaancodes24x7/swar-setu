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