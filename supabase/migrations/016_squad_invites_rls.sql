-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 016: Completa as políticas RLS de squad_invites (só tinha SELECT/
-- INSERT) e habilita Realtime — necessário para o convite direto de amigos
-- pra grupos/duplas (sem precisar trocar código manualmente).
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "squad_invites: update own" ON public.squad_invites;
DROP POLICY IF EXISTS "squad_invites: delete own" ON public.squad_invites;

-- Convidado aceita/recusa (recusar vira DELETE, aceitar vira UPDATE de status)
CREATE POLICY "squad_invites: update own"
  ON public.squad_invites FOR UPDATE
  USING (invitee_id = public.get_my_user_id())
  WITH CHECK (invitee_id = public.get_my_user_id());

-- Convidado ou quem convidou pode remover/cancelar o convite
CREATE POLICY "squad_invites: delete own"
  ON public.squad_invites FOR DELETE
  USING (invitee_id = public.get_my_user_id() OR inviter_id = public.get_my_user_id());

ALTER PUBLICATION supabase_realtime ADD TABLE public.squad_invites;
