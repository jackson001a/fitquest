-- Ativa RLS na tabela `squads` (clãs/duplas)
ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;

-- Leitura aberta a autenticados: necessário para buscar um squad pelo invite_code
-- antes de entrar nele (joinSquadByCode/acceptSquadInvite), quando o usuário
-- ainda não é membro.
CREATE POLICY "squads: read authenticated" ON public.squads
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "squads: insert own" ON public.squads
  FOR INSERT
  WITH CHECK (created_by = get_my_user_id());

-- UPDATE/DELETE liberado para qualquer membro do squad (não só o criador): o
-- botão de excluir e as ações de iniciar/finalizar desafio aparecem pra
-- qualquer membro na UI, e o placar/streak do squad é atualizado por quem
-- fizer o check-in, não só pelo admin.
CREATE POLICY "squads: update member" ON public.squads
  FOR UPDATE
  USING (public.is_my_squad(id))
  WITH CHECK (public.is_my_squad(id));

CREATE POLICY "squads: delete member" ON public.squads
  FOR DELETE
  USING (public.is_my_squad(id));
