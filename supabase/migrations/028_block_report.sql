-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 028: Bloqueio de usuários (exigência Apple Guideline 1.2)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.blocked_users (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker ON public.blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON public.blocked_users(blocked_id);

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blocked_users: own read"   ON public.blocked_users;
DROP POLICY IF EXISTS "blocked_users: own insert" ON public.blocked_users;
DROP POLICY IF EXISTS "blocked_users: own delete" ON public.blocked_users;

-- Só o próprio usuário vê/gerencia sua lista de bloqueios — usa a mesma
-- função auxiliar da migration 002 pra evitar recursão de RLS.
CREATE POLICY "blocked_users: own read"
  ON public.blocked_users FOR SELECT
  USING (blocker_id = public.get_my_user_id());

CREATE POLICY "blocked_users: own insert"
  ON public.blocked_users FOR INSERT
  WITH CHECK (blocker_id = public.get_my_user_id());

CREATE POLICY "blocked_users: own delete"
  ON public.blocked_users FOR DELETE
  USING (blocker_id = public.get_my_user_id());
