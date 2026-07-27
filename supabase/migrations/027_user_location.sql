-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 027: Localização do usuário (estado/cidade) para ranking local
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS estado TEXT, -- sigla UF, ex: 'GO', 'DF'
  ADD COLUMN IF NOT EXISTS cidade TEXT;

CREATE INDEX IF NOT EXISTS idx_users_estado_cidade ON public.users(estado, cidade);
