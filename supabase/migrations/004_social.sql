-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 004: Sistema social — amigos, clãs, duelos, deep links
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Código único de convite por usuário ─────────────────────────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS user_code TEXT UNIQUE;

-- Gera código para usuários existentes
UPDATE public.users
  SET user_code = UPPER(SUBSTRING(REPLACE(uuid_generate_v4()::TEXT, '-', ''), 1, 6))
  WHERE user_code IS NULL;

-- Trigger: gera user_code automaticamente em novos usuários
CREATE OR REPLACE FUNCTION public.generate_user_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_code IS NULL THEN
    LOOP
      NEW.user_code := UPPER(SUBSTRING(REPLACE(uuid_generate_v4()::TEXT, '-', ''), 1, 6));
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.users WHERE user_code = NEW.user_code);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_user_code ON public.users;
CREATE TRIGGER trg_generate_user_code
  BEFORE INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.generate_user_code();

-- ─── Atualiza tabela squads ────────────────────────────────────────────────
ALTER TABLE public.squads
  ADD COLUMN IF NOT EXISTS mode              TEXT DEFAULT 'friends',   -- 'friends' | 'battle'
  ADD COLUMN IF NOT EXISTS is_duo            BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS duration_days     INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS min_weekly_checkins INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS start_date        DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS end_date          DATE,
  ADD COLUMN IF NOT EXISTS status            TEXT DEFAULT 'waiting',   -- 'waiting' | 'active' | 'completed'
  ADD COLUMN IF NOT EXISTS max_members       INTEGER DEFAULT 4;

-- ─── Pontuação semanal por membro (modo batalha) ──────────────────────────
CREATE TABLE IF NOT EXISTS public.squad_weekly_scores (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  squad_id     UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  week_start   DATE NOT NULL,
  checkins     INTEGER DEFAULT 0,
  points       INTEGER DEFAULT 0,
  met_goal     BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(squad_id, user_id, week_start)
);

-- ─── Convites para squads ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.squad_invites (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  squad_id     UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  inviter_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  invitee_id   UUID REFERENCES public.users(id) ON DELETE CASCADE,
  invitee_code TEXT,   -- user_code do convidado (se não tiver conta ainda)
  status       TEXT DEFAULT 'pending', -- 'pending' | 'accepted' | 'declined'
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Notificações de amigos ───────────────────────────────────────────────
-- A tabela friendships já existe; adicionamos campo de quem enviou
ALTER TABLE public.friendships
  ADD COLUMN IF NOT EXISTS message TEXT; -- mensagem opcional ao adicionar

-- ─── RLS ─────────────────────────────────────────────────────────────────
ALTER TABLE public.squad_weekly_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squad_invites       ENABLE ROW LEVEL SECURITY;

CREATE POLICY "squad_scores: own squad"
  ON public.squad_weekly_scores FOR SELECT
  USING (squad_id IN (SELECT squad_id FROM public.squad_members WHERE user_id = public.get_my_user_id()));

CREATE POLICY "squad_invites: see own"
  ON public.squad_invites FOR SELECT
  USING (inviter_id = public.get_my_user_id() OR invitee_id = public.get_my_user_id());

CREATE POLICY "squad_invites: create"
  ON public.squad_invites FOR INSERT
  WITH CHECK (inviter_id = public.get_my_user_id());

-- ─── Índices ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_code        ON public.users(user_code);
CREATE INDEX IF NOT EXISTS idx_squad_invites     ON public.squad_invites(squad_id, status);
CREATE INDEX IF NOT EXISTS idx_squad_scores_week ON public.squad_weekly_scores(squad_id, week_start);
CREATE INDEX IF NOT EXISTS idx_friendships_both  ON public.friendships(user_id, friend_id, status);
