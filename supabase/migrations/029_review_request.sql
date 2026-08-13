-- Rastreio de solicitação de avaliação (App Store) — dispara só após o 3º
-- check-in confirmado e pelo menos 2 dias de conta, nunca mais de uma vez.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS total_checkins       INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS has_requested_review BOOLEAN NOT NULL DEFAULT FALSE;
