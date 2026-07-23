-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 012: Políticas RLS da tabela friendships
--
-- RLS estava habilitado em public.friendships desde a migration 001, mas
-- nenhuma política foi criada — isso bloqueia 100% dos INSERT/SELECT/UPDATE/
-- DELETE feitos pelo app (chave anon/authenticated), inclusive pedidos de
-- amizade, que sempre falhavam com "new row violates row-level security policy".
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "friendships: select own"        ON public.friendships;
DROP POLICY IF EXISTS "friendships: insert own"         ON public.friendships;
DROP POLICY IF EXISTS "friendships: update participant" ON public.friendships;
DROP POLICY IF EXISTS "friendships: delete participant" ON public.friendships;

-- Vê pedidos/amizades onde é remetente ou destinatário
CREATE POLICY "friendships: select own"
  ON public.friendships FOR SELECT
  USING (
    user_id   = public.get_my_user_id()
    OR friend_id = public.get_my_user_id()
  );

-- Só pode criar um pedido em nome próprio (user_id = quem está autenticado)
CREATE POLICY "friendships: insert own"
  ON public.friendships FOR INSERT
  WITH CHECK (user_id = public.get_my_user_id());

-- Aceitar/recusar — qualquer um dos dois lados pode atualizar o status
CREATE POLICY "friendships: update participant"
  ON public.friendships FOR UPDATE
  USING (
    user_id   = public.get_my_user_id()
    OR friend_id = public.get_my_user_id()
  );

-- Remover amizade/pedido — qualquer um dos dois lados
CREATE POLICY "friendships: delete participant"
  ON public.friendships FOR DELETE
  USING (
    user_id   = public.get_my_user_id()
    OR friend_id = public.get_my_user_id()
  );
