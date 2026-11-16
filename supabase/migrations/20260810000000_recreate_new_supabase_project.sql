-- SwarSetu fresh Supabase project bootstrap
create extension if not exists pgcrypto;

do $$ begin create type public.user_role as enum ('parent','teacher','principal'); exception when duplicate_object then null; end $$;
do $$ begin create type public.app_role as enum ('parent','teacher','principal'); exception when duplicate_object then null; end $$;
do $$ begin create type public.report_status as enum ('draft','generated','archived'); exception when duplicate_object then null; end $$;

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(), name text not null, address text, city text, state text default 'Maharashtra', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(), user_id uuid not null unique references auth.users(id) on delete cascade, full_name text not null, role public.user_role not null default 'parent', institute_name text, grades text[], avatar_url text, school_id uuid references public.schools(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, role public.app_role not null, created_at timestamptz not null default now(), unique(user_id, role)
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(), name text not null, grade text not null, teacher_id uuid references auth.users(id) on delete set null, parent_id uuid references auth.users(id) on delete set null, parent_email text, parent_linked_at timestamptz, status text not null default 'normal', total_points integer default 0, streak_days integer default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), constraint students_status_check check (status in ('normal','flagged','reviewed','at-risk')), constraint students_points_nonnegative check (coalesce(total_points,0) >= 0), constraint students_streak_nonnegative check (coalesce(streak_days,0) >= 0)
);

create table if not exists public.test_sessions (
  id uuid primary key default gen_random_uuid(), student_id uuid not null references public.students(id) on delete cascade, conducted_by uuid references auth.users(id) on delete set null, test_type text not null, status text not null default 'in_progress', overall_score numeric(5,2), reading_score numeric(5,2), number_score numeric(5,2), phoneme_score numeric(5,2), flagged_conditions text[], analysis_report jsonb, audio_url text, created_at timestamptz not null default now(), completed_at timestamptz, constraint test_sessions_test_type_check check (test_type in ('voice','written','dyslexia','dyscalculia','dysgraphia','perception')), constraint test_sessions_status_check check (status in ('in_progress','completed','cancelled')), constraint test_sessions_scores_check check ((overall_score is null or overall_score between 0 and 100) and (reading_score is null or reading_score between 0 and 100) and (number_score is null or number_score between 0 and 100) and (phoneme_score is null or phoneme_score between 0 and 100))
);

create table if not exists public.voice_analysis (
  id uuid primary key default gen_random_uuid(), session_id uuid not null references public.test_sessions(id) on delete cascade, phoneme_error_rate numeric(5,2), pronunciation_consistency numeric(5,2), prosodic_score numeric(5,2), temporal_score numeric(5,2), error_pattern_density numeric(5,2), transcription text, phoneme_errors jsonb, detailed_metrics jsonb, created_at timestamptz not null default now()
);

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(), code text not null unique, name text not null, description text, disorder_type text, test_type text not null, version text not null default '1.0.0', active boolean not null default true, config jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), constraint assessments_test_type_check check (test_type in ('voice','written','dyslexia','dyscalculia','dysgraphia','perception'))
);

create table if not exists public.assessment_results (
  id uuid primary key default gen_random_uuid(), assessment_id uuid references public.assessments(id) on delete set null, session_id uuid references public.test_sessions(id) on delete cascade, student_id uuid not null references public.students(id) on delete cascade, user_id uuid references auth.users(id) on delete set null, raw_answers jsonb not null default '[]'::jsonb, engineered_features jsonb not null default '{}'::jsonb, scores jsonb not null default '{}'::jsonb, risk_level text, completed_at timestamptz not null default now(), created_at timestamptz not null default now(), constraint assessment_results_risk_check check (risk_level is null or risk_level in ('low','moderate','high'))
);

create table if not exists public.model_metadata (
  id uuid primary key default gen_random_uuid(), model_name text not null, model_version text not null, disorder_type text not null, framework text, feature_schema jsonb not null default '[]'::jsonb, metrics jsonb not null default '{}'::jsonb, artifact_uri text, active boolean not null default true, created_at timestamptz not null default now(), unique(model_name, model_version)
);

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(), assessment_result_id uuid references public.assessment_results(id) on delete cascade, session_id uuid references public.test_sessions(id) on delete cascade, student_id uuid not null references public.students(id) on delete cascade, model_metadata_id uuid references public.model_metadata(id) on delete set null, disorder_type text not null, prediction text not null, confidence numeric(5,2), probabilities jsonb not null default '{}'::jsonb, explanation text, created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), constraint predictions_confidence_check check (confidence is null or confidence between 0 and 100)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(), session_id uuid references public.test_sessions(id) on delete cascade, student_id uuid not null references public.students(id) on delete cascade, generated_by uuid references auth.users(id) on delete set null, report_type text not null default 'assessment', status public.report_status not null default 'generated', title text, summary text, recommendations text[], report_json jsonb not null default '{}'::jsonb, pdf_url text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete set null, student_id uuid references public.students(id) on delete cascade, session_id uuid references public.test_sessions(id) on delete cascade, rating integer, category text, message text, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), constraint feedback_rating_check check (rating is null or rating between 1 and 5)
);

create table if not exists public.learning_resources (
  id uuid primary key default gen_random_uuid(), title text not null, description text, resource_type text not null, skill_targeted text not null, grade_min integer not null default 1, grade_max integer not null default 8, language text not null default 'en', url text, duration_minutes integer, difficulty text default 'medium', conditions text[] default '{}', thumbnail_url text, created_at timestamptz not null default now(), constraint learning_resources_grade_check check (grade_min <= grade_max), constraint learning_resources_difficulty_check check (difficulty is null or difficulty in ('easy','medium','hard'))
);

create table if not exists public.resource_interactions (
  id uuid primary key default gen_random_uuid(), resource_id uuid references public.learning_resources(id) on delete cascade, student_id uuid references public.students(id) on delete cascade, parent_id uuid not null references auth.users(id) on delete cascade, opened_at timestamptz not null default now(), completed boolean default false, time_spent_minutes integer default 0, constraint resource_interactions_time_check check (coalesce(time_spent_minutes,0) >= 0)
);

create table if not exists public.teacher_grade_assignments (
  id uuid primary key default gen_random_uuid(), teacher_id uuid not null references auth.users(id) on delete cascade, grade text not null, subjects text[] default '{}', institute_name text, school_id uuid references public.schools(id) on delete set null, created_at timestamptz not null default now(), unique(teacher_id, grade)
);

create table if not exists public.teacher_resource_assignments (
  id uuid primary key default gen_random_uuid(), teacher_id uuid not null references auth.users(id) on delete cascade, resource_id uuid references public.learning_resources(id) on delete cascade, student_id uuid references public.students(id) on delete cascade, class_grade text, assigned_at timestamptz not null default now(), completed boolean default false, completed_at timestamptz
);

create table if not exists public.badge_definitions (
  id uuid primary key default gen_random_uuid(), code text not null unique, name text not null, description text, icon text not null default 'Trophy', criteria_type text not null, criteria_value integer not null default 1, points_awarded integer not null default 10, created_at timestamptz not null default now()
);

create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, student_id uuid references public.students(id) on delete cascade, badge_id uuid not null references public.badge_definitions(id) on delete cascade, earned_at timestamptz not null default now(), unique(student_id, badge_id)
);

create table if not exists public.voice_practice_sessions (
  id uuid primary key default gen_random_uuid(), student_id uuid references public.students(id) on delete cascade, parent_id uuid not null references auth.users(id) on delete cascade, prompt_text text not null, spoken_text text, pronunciation_score numeric, fluency_score numeric, hesitation_count integer default 0, pause_duration_ms integer default 0, accuracy_score numeric, feedback text, audio_url text, created_at timestamptz not null default now()
);

create index if not exists idx_profiles_user_id on public.profiles(user_id);
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_school_id on public.profiles(school_id);
create index if not exists idx_user_roles_user_id on public.user_roles(user_id);
create index if not exists idx_students_teacher_id on public.students(teacher_id);
create index if not exists idx_students_parent_id on public.students(parent_id);
create index if not exists idx_students_parent_email on public.students(lower(parent_email));
create index if not exists idx_students_grade on public.students(grade);
create index if not exists idx_test_sessions_student_id on public.test_sessions(student_id);
create index if not exists idx_test_sessions_conducted_by on public.test_sessions(conducted_by);
create index if not exists idx_test_sessions_created_at on public.test_sessions(created_at desc);
create index if not exists idx_test_sessions_type_status on public.test_sessions(test_type,status);
create index if not exists idx_voice_analysis_session_id on public.voice_analysis(session_id);
create index if not exists idx_assessment_results_student_id on public.assessment_results(student_id);
create index if not exists idx_predictions_student_id on public.predictions(student_id);
create index if not exists idx_reports_student_id on public.reports(student_id);
create index if not exists idx_feedback_student_id on public.feedback(student_id);
create index if not exists idx_resource_interactions_parent_student on public.resource_interactions(parent_id, student_id);
create index if not exists idx_teacher_resource_assignments_teacher on public.teacher_resource_assignments(teacher_id);
create index if not exists idx_user_badges_user_student on public.user_badges(user_id, student_id);
create index if not exists idx_voice_practice_student on public.voice_practice_sessions(student_id, created_at desc);

create or replace function public.update_updated_at_column() returns trigger language plpgsql set search_path = public as $$ begin new.updated_at = now(); return new; end; $$;
create or replace function public.has_role(_user_id uuid, _role public.app_role) returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;
create or replace function public.get_user_role(_user_id uuid) returns public.app_role language sql stable security definer set search_path = public as $$ select role from public.user_roles where user_id = _user_id limit 1 $$;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare selected_role public.user_role;
begin
  selected_role := coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'parent'::public.user_role);
  insert into public.profiles (user_id, full_name, role, institute_name, grades)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name','User'), selected_role, new.raw_user_meta_data->>'institute_name', case when jsonb_typeof(new.raw_user_meta_data->'grades') = 'array' then array(select jsonb_array_elements_text(new.raw_user_meta_data->'grades')) else null end)
  on conflict (user_id) do update set full_name = excluded.full_name, role = excluded.role, institute_name = excluded.institute_name, grades = excluded.grades, updated_at = now();
  insert into public.user_roles (user_id, role) values (new.id, selected_role::text::public.app_role) on conflict do nothing;
  if selected_role = 'parent'::public.user_role then
    update public.students set parent_id = new.id, parent_linked_at = coalesce(parent_linked_at, now()), updated_at = now() where parent_id is null and lower(parent_email) = lower(new.email);
  end if;
  return new;
end;
$$;

create or replace function public.set_parent_linked_at() returns trigger language plpgsql security invoker set search_path = public as $$ begin if new.parent_id is not null and old.parent_id is null then new.parent_linked_at = now(); end if; return new; end; $$;

drop trigger if exists update_profiles_updated_at on public.profiles; create trigger update_profiles_updated_at before update on public.profiles for each row execute function public.update_updated_at_column();
drop trigger if exists update_schools_updated_at on public.schools; create trigger update_schools_updated_at before update on public.schools for each row execute function public.update_updated_at_column();
drop trigger if exists update_students_updated_at on public.students; create trigger update_students_updated_at before update on public.students for each row execute function public.update_updated_at_column();
drop trigger if exists update_assessments_updated_at on public.assessments; create trigger update_assessments_updated_at before update on public.assessments for each row execute function public.update_updated_at_column();
drop trigger if exists update_reports_updated_at on public.reports; create trigger update_reports_updated_at before update on public.reports for each row execute function public.update_updated_at_column();
drop trigger if exists on_auth_user_created on auth.users; create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
drop trigger if exists set_parent_linked_at_trigger on public.students; create trigger set_parent_linked_at_trigger before update on public.students for each row execute function public.set_parent_linked_at();

grant usage on schema public to anon, authenticated;
grant select on public.learning_resources, public.badge_definitions, public.schools to anon, authenticated;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.get_user_role(uuid) to authenticated;

alter table public.schools enable row level security; alter table public.profiles enable row level security; alter table public.user_roles enable row level security; alter table public.students enable row level security; alter table public.test_sessions enable row level security; alter table public.voice_analysis enable row level security; alter table public.assessments enable row level security; alter table public.assessment_results enable row level security; alter table public.model_metadata enable row level security; alter table public.predictions enable row level security; alter table public.reports enable row level security; alter table public.feedback enable row level security; alter table public.learning_resources enable row level security; alter table public.resource_interactions enable row level security; alter table public.teacher_grade_assignments enable row level security; alter table public.teacher_resource_assignments enable row level security; alter table public.badge_definitions enable row level security; alter table public.user_badges enable row level security; alter table public.voice_practice_sessions enable row level security;

do $$ declare r record; begin for r in select schemaname, tablename, policyname from pg_policies where schemaname = 'public' loop execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename); end loop; end $$;

create policy schools_public_read on public.schools for select using (true);
create policy schools_principal_manage on public.schools for all using (public.has_role(auth.uid(), 'principal')) with check (public.has_role(auth.uid(), 'principal'));
create policy profiles_self_read on public.profiles for select using (auth.uid() = user_id);
create policy profiles_self_insert on public.profiles for insert with check (auth.uid() = user_id);
create policy profiles_self_update on public.profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy profiles_principal_read on public.profiles for select using (public.has_role(auth.uid(), 'principal'));
create policy user_roles_self_read on public.user_roles for select using (auth.uid() = user_id);
create policy user_roles_self_insert_metadata_sync on public.user_roles for insert with check (auth.uid() = user_id);
create policy user_roles_principal_read on public.user_roles for select using (public.has_role(auth.uid(), 'principal'));
create policy students_teacher_parent_read on public.students for select using (teacher_id = auth.uid() or parent_id = auth.uid() or lower(parent_email) = lower(coalesce(auth.jwt()->>'email','')));
create policy students_principal_read on public.students for select using (public.has_role(auth.uid(), 'principal'));
create policy students_teacher_insert on public.students for insert with check (teacher_id = auth.uid());
create policy students_teacher_update on public.students for update using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
create policy students_teacher_delete on public.students for delete using (teacher_id = auth.uid());
create policy test_sessions_access_read on public.test_sessions for select using (conducted_by = auth.uid() or exists (select 1 from public.students s where s.id = test_sessions.student_id and (s.teacher_id = auth.uid() or s.parent_id = auth.uid() or lower(s.parent_email) = lower(coalesce(auth.jwt()->>'email','')))) or public.has_role(auth.uid(), 'principal'));
create policy test_sessions_teacher_insert on public.test_sessions for insert with check (conducted_by = auth.uid());
create policy test_sessions_teacher_update on public.test_sessions for update using (conducted_by = auth.uid()) with check (conducted_by = auth.uid());
create policy voice_analysis_access_read on public.voice_analysis for select using (exists (select 1 from public.test_sessions ts join public.students s on s.id = ts.student_id where ts.id = voice_analysis.session_id and (ts.conducted_by = auth.uid() or s.teacher_id = auth.uid() or s.parent_id = auth.uid() or lower(s.parent_email) = lower(coalesce(auth.jwt()->>'email','')) or public.has_role(auth.uid(), 'principal'))));
create policy voice_analysis_teacher_insert on public.voice_analysis for insert with check (exists (select 1 from public.test_sessions ts where ts.id = voice_analysis.session_id and ts.conducted_by = auth.uid()));
create policy assessments_public_active_read on public.assessments for select using (active = true);
create policy assessments_principal_manage on public.assessments for all using (public.has_role(auth.uid(), 'principal')) with check (public.has_role(auth.uid(), 'principal'));
create policy assessment_results_access_read on public.assessment_results for select using (user_id = auth.uid() or exists (select 1 from public.students s where s.id = assessment_results.student_id and (s.teacher_id = auth.uid() or s.parent_id = auth.uid() or lower(s.parent_email) = lower(coalesce(auth.jwt()->>'email','')) or public.has_role(auth.uid(), 'principal'))));
create policy assessment_results_teacher_insert on public.assessment_results for insert with check (user_id = auth.uid() and exists (select 1 from public.students s where s.id = assessment_results.student_id and s.teacher_id = auth.uid()));
create policy model_metadata_authenticated_read on public.model_metadata for select to authenticated using (active = true);
create policy model_metadata_principal_manage on public.model_metadata for all using (public.has_role(auth.uid(), 'principal')) with check (public.has_role(auth.uid(), 'principal'));
create policy predictions_access_read on public.predictions for select using (exists (select 1 from public.students s where s.id = predictions.student_id and (s.teacher_id = auth.uid() or s.parent_id = auth.uid() or lower(s.parent_email) = lower(coalesce(auth.jwt()->>'email','')) or public.has_role(auth.uid(), 'principal'))));
create policy predictions_teacher_insert on public.predictions for insert with check (created_by = auth.uid() and exists (select 1 from public.students s where s.id = predictions.student_id and s.teacher_id = auth.uid()));
create policy reports_access_read on public.reports for select using (exists (select 1 from public.students s where s.id = reports.student_id and (s.teacher_id = auth.uid() or s.parent_id = auth.uid() or lower(s.parent_email) = lower(coalesce(auth.jwt()->>'email','')) or public.has_role(auth.uid(), 'principal'))));
create policy reports_teacher_insert on public.reports for insert with check (generated_by = auth.uid() and exists (select 1 from public.students s where s.id = reports.student_id and s.teacher_id = auth.uid()));
create policy reports_teacher_update on public.reports for update using (generated_by = auth.uid()) with check (generated_by = auth.uid());
create policy feedback_owner_read on public.feedback for select using (user_id = auth.uid() or public.has_role(auth.uid(), 'principal'));
create policy feedback_owner_insert on public.feedback for insert with check (user_id = auth.uid());
create policy learning_resources_public_read on public.learning_resources for select using (true);
create policy learning_resources_principal_manage on public.learning_resources for all using (public.has_role(auth.uid(), 'principal')) with check (public.has_role(auth.uid(), 'principal'));
create policy resource_interactions_parent_read on public.resource_interactions for select using (parent_id = auth.uid());
create policy resource_interactions_parent_insert on public.resource_interactions for insert with check (parent_id = auth.uid());
create policy resource_interactions_parent_update on public.resource_interactions for update using (parent_id = auth.uid()) with check (parent_id = auth.uid());
create policy teacher_grade_assignments_read on public.teacher_grade_assignments for select using (teacher_id = auth.uid() or public.has_role(auth.uid(), 'principal'));
create policy teacher_grade_assignments_teacher_insert on public.teacher_grade_assignments for insert with check (teacher_id = auth.uid());
create policy teacher_grade_assignments_teacher_update on public.teacher_grade_assignments for update using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
create policy teacher_resource_assignments_teacher_manage on public.teacher_resource_assignments for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
create policy teacher_resource_assignments_parent_read on public.teacher_resource_assignments for select using (exists (select 1 from public.students s where s.id = teacher_resource_assignments.student_id and (s.teacher_id = auth.uid() or s.parent_id = auth.uid() or lower(s.parent_email) = lower(coalesce(auth.jwt()->>'email','')))));
create policy badge_definitions_public_read on public.badge_definitions for select using (true);
create policy badge_definitions_principal_manage on public.badge_definitions for all using (public.has_role(auth.uid(), 'principal')) with check (public.has_role(auth.uid(), 'principal'));
create policy user_badges_access_read on public.user_badges for select using (user_id = auth.uid() or exists (select 1 from public.students s where s.id = user_badges.student_id and (s.teacher_id = auth.uid() or s.parent_id = auth.uid() or lower(s.parent_email) = lower(coalesce(auth.jwt()->>'email','')) or public.has_role(auth.uid(), 'principal'))));
create policy user_badges_insert_owned on public.user_badges for insert with check (user_id = auth.uid() or exists (select 1 from public.students s where s.id = user_badges.student_id and (s.teacher_id = auth.uid() or s.parent_id = auth.uid())));
create policy voice_practice_parent_manage on public.voice_practice_sessions for all using (parent_id = auth.uid()) with check (parent_id = auth.uid());
create policy voice_practice_teacher_read on public.voice_practice_sessions for select using (exists (select 1 from public.students s where s.id = voice_practice_sessions.student_id and (s.teacher_id = auth.uid() or public.has_role(auth.uid(), 'principal'))));

do $$ begin alter publication supabase_realtime add table public.students; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.test_sessions; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.user_badges; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.resource_interactions; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.schools; exception when duplicate_object then null; end $$;

insert into public.assessments (code, name, description, disorder_type, test_type, version, config) values
('voice-screening','Voice-Based Assessment','Multilingual voice assessment using speech transcription and LLM analysis.','dyslexia','voice','1.0.0','{}'::jsonb),
('dyslexia-dsm5','DSM-5 Dyslexia Screening','Reading and phonological awareness screening.','dyslexia','dyslexia','1.0.0','{}'::jsonb),
('dyscalculia-dsm5','DSM-5 Dyscalculia Screening','Number sense and arithmetic screening.','dyscalculia','dyscalculia','1.0.0','{}'::jsonb),
('dysgraphia-canvas','Dysgraphia Canvas Assessment','Drawing and handwriting motor-skill assessment.','dysgraphia','dysgraphia','1.0.0','{}'::jsonb),
('perception-test','Perception Test','Image-based perception and response analysis.','perception','perception','1.0.0','{}'::jsonb)
on conflict (code) do update set name = excluded.name, description = excluded.description, active = true, updated_at = now();

insert into public.model_metadata (model_name, model_version, disorder_type, framework, feature_schema, metrics, active) values
('unified_predictor','local-current','multi','python/numpy','[]'::jsonb,'{}'::jsonb,true),
('dyslexia_neural_network','local-current','dyslexia','python/numpy','[]'::jsonb,'{}'::jsonb,true),
('dysgraphia_neural_network','local-current','dysgraphia','python/numpy','[]'::jsonb,'{}'::jsonb,true),
('dyscalculia_neural_network','local-current','dyscalculia','python/numpy','[]'::jsonb,'{}'::jsonb,true)
on conflict (model_name, model_version) do update set active = excluded.active;

insert into public.badge_definitions (code, name, description, icon, criteria_type, criteria_value, points_awarded) values
('first_test','First Test','Completed your first assessment','Trophy','test_completed',1,10),
('five_day_streak','5-Day Streak','Practiced for 5 days in a row','Flame','streak',5,25),
('ten_day_streak','10-Day Streak','Practiced for 10 days in a row','Flame','streak',10,50),
('perfect_score','Perfect Score','Achieved 100% on an assessment','Target','score_improvement',100,100),
('speed_reader','Speed Reader','Completed 5 reading exercises','Zap','resource_completed',5,30),
('math_whiz','Math Whiz','Completed 5 number exercises','Calculator','resource_completed',5,30),
('first_resource','First Resource','Opened your first learning resource','BookOpen','resource_completed',1,5),
('parent_engaged','Parent Engaged','Parent completed 3 practice sessions with child','Heart','engagement',3,20),
('improvement_star','Improvement Star','Improved score by 10% from previous test','Star','score_improvement',10,40),
('phonics_pro','Phonics Pro','Completed 5 phonics exercises','Volume2','resource_completed',5,30)
on conflict (code) do update set name = excluded.name, description = excluded.description, icon = excluded.icon, criteria_type = excluded.criteria_type, criteria_value = excluded.criteria_value, points_awarded = excluded.points_awarded;

insert into public.learning_resources (title, description, resource_type, skill_targeted, grade_min, grade_max, language, url, duration_minutes, difficulty, conditions) values
('Phonics Fun: Letter Sounds','Learn letter sounds through interactive games','phonics','Phonological Awareness',1,3,'en','https://www.starfall.com/h/ltr-classic/',15,'easy',array['dyslexia','general']),
('Syllable Clapping Game','Practice breaking words into syllables','phonics','Syllable Segmentation',1,4,'en','https://www.education.com/game/syllable-clap/',10,'easy',array['dyslexia']),
('Word Family Rhymes','Learn rhyming patterns with word families','reading','Phoneme Awareness',1,3,'en','https://www.readingrockets.org/article/word-families',15,'easy',array['dyslexia','general']),
('Reading Fluency Practice','Short passages for reading practice','reading','Reading Fluency',2,5,'en','https://www.readworks.org/',20,'medium',array['dyslexia','general']),
('Visual Word Recognition','Practice sight words with visual cues','visual','Word Recognition',1,4,'en','https://www.sightwords.com/sight-words/games/',15,'easy',array['dyslexia']),
('Number Line Adventures','Understand number placement on a line','number_sense','Number Sense',1,4,'en','https://www.mathplayground.com/number_bonds_20.html',15,'easy',array['dyscalculia','general']),
('Counting with Objects','Learn counting through visual objects','number_sense','Counting Skills',1,2,'en','https://www.topmarks.co.uk/learning-to-count/teddy-numbers',10,'easy',array['dyscalculia','general']),
('Dot Pattern Recognition','Recognize quantities without counting','number_sense','Subitizing',1,3,'en','https://www.nctm.org/Classroom-Resources/Illuminations/',15,'easy',array['dyscalculia']),
('Math Word Problems','Solve everyday math problems','number_sense','Problem Solving',3,6,'en','https://www.khanacademy.org/math',20,'medium',array['dyscalculia','general']),
('Place Value Practice','Understand ones, tens, hundreds','number_sense','Place Value',2,4,'en','https://www.mathgames.com/place-value',15,'medium',array['dyscalculia']),
('Pattern Recognition Games','Complete number patterns','number_sense','Sequential Logic',2,5,'en','https://www.mathplayground.com/number_sequence.html',15,'medium',array['dyscalculia']),
('Audio Story Time','Listen to stories to improve comprehension','audio','Listening Comprehension',1,5,'en','https://www.storynory.com/',20,'easy',array['dyslexia','general']),
('Visual Tracing Worksheets','Practice letter and number formation','visual','Fine Motor Skills',1,3,'en','https://www.education.com/worksheets/',15,'easy',array['dyslexia','dyscalculia','general']),
('Reading Comprehension Stories','Age-appropriate reading passages','reading','Comprehension',3,6,'en','https://www.readtheory.org/',25,'medium',array['general']),
('Math Facts Practice','Practice basic arithmetic facts','number_sense','Arithmetic Fluency',2,5,'en','https://www.xtramath.org/',15,'medium',array['general']),
('Spelling Bee Practice','Improve spelling with practice games','reading','Spelling',2,6,'en','https://www.spellingcity.com/',15,'medium',array['general']),
('Mental Math Challenges','Build mental calculation skills','number_sense','Mental Math',3,8,'en','https://www.mathplayground.com/mental-math.html',15,'hard',array['general'])
on conflict do nothing;
