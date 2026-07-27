-- Ativa RLS na tabela `rivalries` (duelos) — só os dois participantes acessam
ALTER TABLE public.rivalries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rivalries: select participant" ON public.rivalries
  FOR SELECT
  USING (challenger_id = get_my_user_id() OR rival_id = get_my_user_id());

CREATE POLICY "rivalries: insert own" ON public.rivalries
  FOR INSERT
  WITH CHECK (challenger_id = get_my_user_id());

CREATE POLICY "rivalries: update participant" ON public.rivalries
  FOR UPDATE
  USING (challenger_id = get_my_user_id() OR rival_id = get_my_user_id())
  WITH CHECK (challenger_id = get_my_user_id() OR rival_id = get_my_user_id());

CREATE POLICY "rivalries: delete participant" ON public.rivalries
  FOR DELETE
  USING (challenger_id = get_my_user_id() OR rival_id = get_my_user_id());
