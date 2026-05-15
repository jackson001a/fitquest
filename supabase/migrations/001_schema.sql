-- ═══════════════════════════════════════════════════════════════════════════
-- CapiFit — Schema completo do banco de dados (Supabase / PostgreSQL)
-- Cole este arquivo no SQL Editor do Supabase e execute tudo de uma vez.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Extensões ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── USUÁRIOS ────────────────────────────────────────────────────────────────
CREATE TABLE public.users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id         UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Perfil
  name            TEXT NOT NULL DEFAULT 'Usuário',
  email           TEXT,
  phone           TEXT,
  goal_type       TEXT DEFAULT 'emagrecer', -- 'emagrecer' | 'engordar' | 'manter'
  start_weight    NUMERIC(5,1) DEFAULT 70,
  current_weight  NUMERIC(5,1) DEFAULT 70,
  target_weight   NUMERIC(5,1) DEFAULT 65,

  -- Gamificação
  xp              INTEGER DEFAULT 250,
  level           INTEGER DEFAULT 1,
  next_level_xp   INTEGER DEFAULT 1000,
  coins           INTEGER DEFAULT 0,
  gems            INTEGER DEFAULT 0,
  league          TEXT DEFAULT 'Bronze',
  league_emoji    TEXT DEFAULT '🥉',
  rank_position   INTEGER DEFAULT 9999,
  daily_goal_xp   INTEGER DEFAULT 200,
  today_xp        INTEGER DEFAULT 0,

  -- Plano (Streak / Sequência)
  streak_count        INTEGER DEFAULT 0,
  longest_streak      INTEGER DEFAULT 0,
  total_workouts      INTEGER DEFAULT 0,
  week_workouts       INTEGER DEFAULT 0,
  week_training_days  BOOLEAN[] DEFAULT '{false,false,false,false,false,false,false}',

  -- Comprometimento (0–100, memória longa)
  commitment          INTEGER DEFAULT 70,

  -- Configuração do onboarding
  weekly_frequency    INTEGER DEFAULT 3,
  planned_days        TEXT[] DEFAULT '{}', -- ['seg','ter','qua',...]
  onboarding_done     BOOLEAN DEFAULT FALSE,

  -- Controle semanal
  week_checkins_count INTEGER DEFAULT 0,
  week_start_date     DATE DEFAULT CURRENT_DATE,

  -- Controle diário / foguinho
  is_flame_active       BOOLEAN DEFAULT FALSE,
  last_checkin_date     DATE,
  last_gym_checkin_date DATE,
  last_checked_date     DATE DEFAULT CURRENT_DATE,
  last_workout_date     DATE,
  last_active_date      DATE DEFAULT CURRENT_DATE,

  -- Push notifications
  expo_push_token TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── AMIZADES ────────────────────────────────────────────────────────────────
CREATE TABLE public.friendships (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status    TEXT DEFAULT 'pending', -- 'pending' | 'accepted' | 'blocked'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_id),
  CHECK (user_id <> friend_id)
);

-- ─── SQUADS (grupos de até 4 pessoas) ────────────────────────────────────────
CREATE TABLE public.squads (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  emoji        TEXT DEFAULT '🛡️',
  created_by   UUID REFERENCES public.users(id),
  group_streak INTEGER DEFAULT 0,
  days_per_week INTEGER DEFAULT 5,
  color        TEXT DEFAULT '#8B5CF6',
  invite_code  TEXT UNIQUE DEFAULT UPPER(SUBSTRING(uuid_generate_v4()::TEXT, 1, 6)),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.squad_members (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  squad_id         UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role             TEXT DEFAULT 'member', -- 'admin' | 'member'
  checked_in_today BOOLEAN DEFAULT FALSE,
  joined_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(squad_id, user_id)
);

-- ─── CHECK-INS DE ACADEMIA ───────────────────────────────────────────────────
CREATE TABLE public.checkins (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date       DATE NOT NULL DEFAULT CURRENT_DATE,
  xp_earned  INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- ─── TREINOS COMPLETADOS ──────────────────────────────────────────────────────
CREATE TABLE public.workout_completions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  workout_name     TEXT NOT NULL,
  workout_emoji    TEXT,
  duration_seconds INTEGER,
  xp_earned        INTEGER,
  sets_done        INTEGER DEFAULT 0,
  completed_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── DEFINIÇÕES DE CONQUISTAS ─────────────────────────────────────────────────
CREATE TABLE public.achievements (
  id              INTEGER PRIMARY KEY,
  emoji           TEXT,
  name            TEXT,
  description     TEXT,
  category        TEXT, -- 'streak' | 'treinos' | 'xp' | 'especial'
  xp_reward       INTEGER DEFAULT 0,
  condition_type  TEXT, -- 'streak' | 'workouts' | 'xp' | 'manual'
  condition_value INTEGER
);

CREATE TABLE public.user_achievements (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  achievement_id INTEGER NOT NULL REFERENCES public.achievements(id),
  progress       INTEGER DEFAULT 0,
  unlocked       BOOLEAN DEFAULT FALSE,
  unlocked_at    TIMESTAMPTZ,
  UNIQUE(user_id, achievement_id)
);

-- ─── DESAFIOS DIÁRIOS ─────────────────────────────────────────────────────────
CREATE TABLE public.daily_challenges (
  id             INTEGER PRIMARY KEY,
  emoji          TEXT,
  title          TEXT,
  description    TEXT,
  xp_reward      INTEGER DEFAULT 20,
  challenge_type TEXT -- 'workout' | 'water' | 'walk' | 'checkin'
);

CREATE TABLE public.user_daily_challenges (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  challenge_id INTEGER NOT NULL REFERENCES public.daily_challenges(id),
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  completed    BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, challenge_id, date)
);

-- ─── DUELOS / RIVAIS ──────────────────────────────────────────────────────────
CREATE TABLE public.rivalries (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenger_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rival_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name             TEXT,
  rivalry_type     TEXT DEFAULT 'weekly', -- 'weekly' | 'monthly'
  challenger_score INTEGER DEFAULT 0,
  rival_score      INTEGER DEFAULT 0,
  start_date       DATE DEFAULT CURRENT_DATE,
  end_date         DATE,
  status           TEXT DEFAULT 'active', -- 'active' | 'completed'
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── FEED SOCIAL ──────────────────────────────────────────────────────────────
CREATE TABLE public.feed_posts (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  post_type  TEXT, -- 'record' | 'achievement' | 'workout' | 'streak' | 'water'
  emoji      TEXT,
  badge      TEXT,
  detail     TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.feed_reactions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id       UUID NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL, -- 'party' | 'fire' | 'heart'
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id, reaction_type)
);

-- ─── NOTIFICAÇÕES (histórico in-app) ─────────────────────────────────────────
CREATE TABLE public.notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title      TEXT,
  body       TEXT,
  type       TEXT, -- 'flame_warning' | 'commitment_drop' | 'streak_risk' | 'achievement' | 'friend_invite'
  data       JSONB DEFAULT '{}',
  read       BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- ÍNDICES — aceleram as queries mais usadas
-- ═══════════════════════════════════════════════════════════════════════════
CREATE INDEX idx_users_auth_id        ON public.users(auth_id);
CREATE INDEX idx_users_xp             ON public.users(xp DESC);
CREATE INDEX idx_users_streak         ON public.users(streak_count DESC);
CREATE INDEX idx_friendships_user     ON public.friendships(user_id, status);
CREATE INDEX idx_friendships_friend   ON public.friendships(friend_id, status);
CREATE INDEX idx_squad_members_squad  ON public.squad_members(squad_id);
CREATE INDEX idx_squad_members_user   ON public.squad_members(user_id);
CREATE INDEX idx_checkins_user_date   ON public.checkins(user_id, date DESC);
CREATE INDEX idx_workouts_user        ON public.workout_completions(user_id, completed_at DESC);
CREATE INDEX idx_feed_user            ON public.feed_posts(user_id, created_at DESC);
CREATE INDEX idx_feed_created         ON public.feed_posts(created_at DESC);
CREATE INDEX idx_notifications_user   ON public.notifications(user_id, read, created_at DESC);
CREATE INDEX idx_rivalries_challenger ON public.rivalries(challenger_id, status);
CREATE INDEX idx_rivalries_rival      ON public.rivalries(rival_id, status);

-- ═══════════════════════════════════════════════════════════════════════════
-- VIEWS — queries prontas para o app
-- ═══════════════════════════════════════════════════════════════════════════

-- Ranking global (top 100 por XP)
CREATE VIEW public.leaderboard_global AS
  SELECT id, name, xp, streak_count, league, league_emoji, rank_position,
         RANK() OVER (ORDER BY xp DESC) AS position
  FROM public.users
  ORDER BY xp DESC
  LIMIT 100;

-- ═══════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY — cada usuário acessa só seus dados
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_completions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_posts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_reactions       ENABLE ROW LEVEL SECURITY;

-- Usuário vê/edita somente o próprio perfil
CREATE POLICY "users: own row" ON public.users
  USING (auth.uid() = auth_id)
  WITH CHECK (auth.uid() = auth_id);

-- Usuário vê perfis de amigos (para ranking)
CREATE POLICY "users: friends visible" ON public.users
  FOR SELECT USING (
    id IN (
      SELECT friend_id FROM public.friendships
      WHERE user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
        AND status = 'accepted'
    )
  );

-- Check-ins: próprios
CREATE POLICY "checkins: own" ON public.checkins
  USING (user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- Workouts: próprios
CREATE POLICY "workouts: own" ON public.workout_completions
  USING (user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- Notificações: próprias
CREATE POLICY "notifications: own" ON public.notifications
  USING (user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════
-- DADOS INICIAIS — desafios diários e conquistas
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO public.daily_challenges (id, emoji, title, description, xp_reward, challenge_type) VALUES
  (1, '🏋️', 'Complete um treino',    'Qualquer treino conta!',        50, 'workout'),
  (2, '💧', 'Beba 2L de água',       'Hidratação é essencial',        20, 'water'),
  (3, '🚶', '10 min de caminhada',   'Pode ser qualquer hora',        30, 'walk');

INSERT INTO public.achievements (id, emoji, name, description, category, xp_reward, condition_type, condition_value) VALUES
  (1,  '🔥', 'Plano de 7',     '7 check-ins no plano',         'streak',  100,  'streak',   7),
  (2,  '🔥', 'Plano de 14',    '14 check-ins no plano',        'streak',  200,  'streak',   14),
  (3,  '🔥', 'Em Chamas',      'Plano de 30',                  'streak',  500,  'streak',   30),
  (4,  '🔥', 'Indomável',      'Plano de 60',                  'streak',  1000, 'streak',   60),
  (5,  '🔥', 'Lenda Viva',     'Plano de 100',                 'streak',  2000, 'streak',   100),
  (6,  '💪', '10 Treinos',     'Complete 10 treinos',          'treinos', 150,  'workouts', 10),
  (7,  '🏅', '50 Treinos',     'Complete 50 treinos',          'treinos', 400,  'workouts', 50),
  (8,  '💯', '100 Treinos',    'Complete 100 treinos',         'treinos', 800,  'workouts', 100),
  (9,  '🏆', '200 Treinos',    'Complete 200 treinos',         'treinos', 2000, 'workouts', 200),
  (10, '⚡', 'Primeiro XP',    'Ganhe seu primeiro XP',        'xp',      50,   'xp',       1),
  (11, '⚡', '1000 XP/dia',    'Ganhe 1000 XP em um dia',     'xp',      300,  'xp',       1000),
  (12, '💎', '10.000 XP',      'Acumule 10.000 XP totais',    'xp',      1000, 'xp',       10000),
  (13, '🦁', 'Caçador',        'Derrote um chefe semanal',     'especial',300,  'manual',   1),
  (14, '🎯', 'Focado',         'Complete 7 desafios diários',  'especial',200,  'manual',   7),
  (15, '👑', 'Liga Diamante',  'Alcance a Liga Diamante',      'especial',1500, 'manual',   1),
  (16, '🏆', 'Top 3',          'Fique no top 3 do ranking',    'especial',1000, 'manual',   1),
  (17, '🌙', 'Madrugador',     'Treine às 6h da manhã',        'especial',200,  'manual',   1),
  (18, '🎽', 'Sem Desculpas',  'Treine 5x na mesma semana',   'especial',350,  'manual',   5);

-- ═══════════════════════════════════════════════════════════════════════════
-- TRIGGER — atualiza updated_at automaticamente
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_user_updated
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
