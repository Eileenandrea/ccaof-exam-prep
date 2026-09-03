-- Initial schema and RLS policies for ccaof-exam-prep
BEGIN;

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  display_name text,
  created_at timestamptz DEFAULT now()
);

-- Questions table
CREATE TABLE IF NOT EXISTS public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain smallint,
  prompt text NOT NULL,
  options jsonb NOT NULL,
  correct jsonb NOT NULL,
  explanation text,
  created_at timestamptz DEFAULT now()
);

-- Attempts table
CREATE TABLE IF NOT EXISTS public.attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id),
  score int,
  taken_at timestamptz DEFAULT now(),
  details jsonb
);

-- Enable Row Level Security where applicable
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;

-- Policies
-- Allow everyone to read questions (public read)
CREATE POLICY public_select_questions ON public.questions
  FOR SELECT USING (true);

-- Allow authenticated users to insert attempts for themselves
CREATE POLICY insert_attempts_by_owner ON public.attempts
  FOR INSERT USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to select their own attempts
CREATE POLICY select_own_attempts ON public.attempts
  FOR SELECT USING (auth.uid() = user_id);

COMMIT;
