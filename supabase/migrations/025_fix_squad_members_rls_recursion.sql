-- A migration 024 causou "infinite recursion detected in policy for relation
-- squad_members": a policy de squad_members consultava a própria tabela
-- squad_members dentro do seu USING/WITH CHECK. Corrige com uma função
-- SECURITY DEFINER (mesmo padrão de get_my_user_id()) que contorna a RLS
-- ao checar squad_id, quebrando a recursão.

CREATE OR REPLACE FUNCTION public.is_my_squad(p_squad_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.squad_members
    WHERE squad_id = p_squad_id AND user_id = public.get_my_user_id()
  );
$$;

DROP POLICY IF EXISTS "squad_members: select own squads" ON public.squad_members;
DROP POLICY IF EXISTS "squad_members: update own squads" ON public.squad_members;
DROP POLICY IF EXISTS "squad_members: delete own squads" ON public.squad_members;

CREATE POLICY "squad_members: select own squads" ON public.squad_members
  FOR SELECT
  USING (
    user_id = get_my_user_id()
    OR public.is_my_squad(squad_id)
  );

CREATE POLICY "squad_members: update own squads" ON public.squad_members
  FOR UPDATE
  USING (public.is_my_squad(squad_id))
  WITH CHECK (public.is_my_squad(squad_id));

CREATE POLICY "squad_members: delete own squads" ON public.squad_members
  FOR DELETE
  USING (public.is_my_squad(squad_id));
