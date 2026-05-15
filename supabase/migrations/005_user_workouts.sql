-- Treinos criados pelo usuário
CREATE TABLE IF NOT EXISTS public.user_workouts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  workout_data JSONB NOT NULL,  -- objeto completo do treino
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_workouts_user ON public.user_workouts(user_id, created_at DESC);

ALTER TABLE public.user_workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_workouts: own"
  ON public.user_workouts
  USING (user_id = public.get_my_user_id());
