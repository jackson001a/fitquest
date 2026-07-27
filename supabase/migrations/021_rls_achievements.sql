-- Ativa RLS na tabela de catálogo `achievements` (leitura pública, sem escrita via app)
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "achievements: read all" ON public.achievements
  FOR SELECT
  USING (true);
