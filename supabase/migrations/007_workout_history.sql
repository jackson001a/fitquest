-- Adiciona dados completos do treino na tabela de conclusões
ALTER TABLE workout_completions ADD COLUMN IF NOT EXISTS workout_data JSONB;
