-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 003: Adiciona campos extras ao usuário
-- ═══════════════════════════════════════════════════════════════════════════

-- Recordes pessoais por exercício (ex: {"Supino Reto": 70, "Agachamento": 100})
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS personal_records JSONB DEFAULT '{}';

-- Quantos chefes semanais o usuário derrotou neste ciclo (resetado toda segunda)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS boss_kills_this_week INTEGER DEFAULT 0;

-- Total de chefes derrotados na vida
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS total_boss_kills INTEGER DEFAULT 0;

-- Tabela de atividade recente (feed do perfil)
CREATE TABLE IF NOT EXISTS public.user_activity (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL, -- 'workout' | 'checkin' | 'achievement' | 'streak' | 'level'
  text       TEXT,
  emoji      TEXT,
  xp_earned  INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_user ON public.user_activity(user_id, created_at DESC);

ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity: own"
  ON public.user_activity
  USING (user_id = public.get_my_user_id());
