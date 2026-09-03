-- Create attempt_items table used to record which questions were shown in an attempt
BEGIN;

CREATE TABLE IF NOT EXISTS public.attempt_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid REFERENCES public.attempts(id) ON DELETE CASCADE,
  question_id uuid REFERENCES public.questions(id),
  shown_at timestamptz DEFAULT now()
);

COMMIT;
