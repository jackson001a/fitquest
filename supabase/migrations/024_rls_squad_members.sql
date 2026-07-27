-- Ativa RLS na tabela `squad_members` — membros só enxergam/mexem em squads dos quais participam
ALTER TABLE public.squad_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "squad_members: select own squads" ON public.squad_members
  FOR SELECT
  USING (
    user_id = get_my_user_id()
    OR squad_id IN (SELECT squad_id FROM public.squad_members WHERE user_id = get_my_user_id())
  );

CREATE POLICY "squad_members: insert own" ON public.squad_members
  FOR INSERT
  WITH CHECK (user_id = get_my_user_id());

-- UPDATE precisa cobrir squad_members de OUTROS membros também: iniciar um desafio
-- (startChallenge) reseta challenge_streak/checkins de todo o squad, feito por quem
-- clica "iniciar", não só na própria linha.
CREATE POLICY "squad_members: update own squads" ON public.squad_members
  FOR UPDATE
  USING (squad_id IN (SELECT squad_id FROM public.squad_members WHERE user_id = get_my_user_id()))
  WITH CHECK (squad_id IN (SELECT squad_id FROM public.squad_members WHERE user_id = get_my_user_id()));

-- DELETE precisa cobrir remover outros membros também: deleteSquad apaga todas as
-- linhas do squad de uma vez.
CREATE POLICY "squad_members: delete own squads" ON public.squad_members
  FOR DELETE
  USING (squad_id IN (SELECT squad_id FROM public.squad_members WHERE user_id = get_my_user_id()));
