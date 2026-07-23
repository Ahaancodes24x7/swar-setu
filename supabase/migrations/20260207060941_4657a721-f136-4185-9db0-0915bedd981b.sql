-- Fix the test_type check constraint to allow all test types
ALTER TABLE public.test_sessions DROP CONSTRAINT test_sessions_test_type_check;

ALTER TABLE public.test_sessions ADD CONSTRAINT test_sessions_test_type_check 
  CHECK (test_type = ANY (ARRAY['voice'::text, 'written'::text, 'dyslexia'::text, 'dyscalculia'::text, 'dysgraphia'::text, 'perception'::text]));