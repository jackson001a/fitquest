-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 017: checkins precisa ser público para LEITURA (ranking geral usa
-- contagem de check-ins do mês de TODOS os usuários — migration 002 deixou a
-- política "checkins: own" sem FOR, o que restringe até o SELECT à própria
-- linha, fazendo o ranking mostrar 0 check-ins pra qualquer usuário que não
-- seja o logado). Escrita continua restrita ao próprio usuário.
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "checkins: own" ON public.checkins;

CREATE POLICY "checkins: select all"
  ON public.checkins FOR SELECT
  USING (true);

CREATE POLICY "checkins: insert own"
  ON public.checkins FOR INSERT
  WITH CHECK (user_id = public.get_my_user_id());

CREATE POLICY "checkins: update own"
  ON public.checkins FOR UPDATE
  USING (user_id = public.get_my_user_id())
  WITH CHECK (user_id = public.get_my_user_id());

CREATE POLICY "checkins: delete own"
  ON public.checkins FOR DELETE
  USING (user_id = public.get_my_user_id());
