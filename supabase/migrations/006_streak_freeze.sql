-- Adiciona dias de congelamento de sequência na tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS streak_freeze_days INTEGER DEFAULT 0;
