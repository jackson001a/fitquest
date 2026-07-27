-- Ativa RLS na tabela de catálogo `daily_challenges` (leitura pública, sem escrita via app)
ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_challenges: read all" ON public.daily_challenges
  FOR SELECT
  USING (true);
