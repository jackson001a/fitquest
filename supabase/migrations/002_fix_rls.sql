-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 002: Corrige recursão infinita nas políticas RLS
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Função auxiliar SECURITY DEFINER ─────────────────────────────────────
-- Retorna o UUID interno do usuário atual sem acionar RLS (evita recursão)
CREATE OR REPLACE FUNCTION public.get_my_user_id()
RETURNS UUID AS $$
  SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─── 2. Remove políticas antigas problemáticas ────────────────────────────────
DROP POLICY IF EXISTS "users: own row"          ON public.users;
DROP POLICY IF EXISTS "users: friends visible"  ON public.users;
DROP POLICY IF EXISTS "checkins: own"           ON public.checkins;
DROP POLICY IF EXISTS "workouts: own"           ON public.workout_completions;
DROP POLICY IF EXISTS "notifications: own"      ON public.notifications;

-- ─── 3. Políticas da tabela users (sem recursão) ──────────────────────────────
-- Qualquer usuário autenticado pode LER perfis (necessário para ranking/social)
CREATE POLICY "users: read"
  ON public.users FOR SELECT
  USING (auth.role() = 'authenticated');

-- Só pode INSERIR o próprio perfil
CREATE POLICY "users: insert"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = auth_id);

-- Só pode ATUALIZAR o próprio perfil
CREATE POLICY "users: update"
  ON public.users FOR UPDATE
  USING  (auth.uid() = auth_id)
  WITH CHECK (auth.uid() = auth_id);

-- Só pode DELETAR o próprio perfil
CREATE POLICY "users: delete"
  ON public.users FOR DELETE
  USING (auth.uid() = auth_id);

-- ─── 4. Demais tabelas usando a função auxiliar (sem recursão) ────────────────
CREATE POLICY "checkins: own"
  ON public.checkins
  USING (user_id = public.get_my_user_id());

CREATE POLICY "workouts: own"
  ON public.workout_completions
  USING (user_id = public.get_my_user_id());

CREATE POLICY "notifications: own"
  ON public.notifications
  USING (user_id = public.get_my_user_id());

-- Feed social — todos os autenticados podem LER (ranking/feed social)
ALTER TABLE public.feed_posts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feed: read"      ON public.feed_posts;
DROP POLICY IF EXISTS "feed: write own" ON public.feed_posts;
DROP POLICY IF EXISTS "reactions: read"      ON public.feed_reactions;
DROP POLICY IF EXISTS "reactions: write own" ON public.feed_reactions;

CREATE POLICY "feed: read"
  ON public.feed_posts FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "feed: write own"
  ON public.feed_posts FOR ALL
  USING (user_id = public.get_my_user_id());

CREATE POLICY "reactions: read"
  ON public.feed_reactions FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "reactions: write own"
  ON public.feed_reactions FOR ALL
  USING (user_id = public.get_my_user_id());

-- Desafios e conquistas — próprios
DROP POLICY IF EXISTS "challenges: own" ON public.user_daily_challenges;
DROP POLICY IF EXISTS "achievements: own" ON public.user_achievements;

CREATE POLICY "challenges: own"
  ON public.user_daily_challenges
  USING (user_id = public.get_my_user_id());

CREATE POLICY "achievements: own"
  ON public.user_achievements
  USING (user_id = public.get_my_user_id());
