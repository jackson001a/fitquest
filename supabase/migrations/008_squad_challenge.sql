ALTER TABLE squads ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'waiting';
ALTER TABLE squads ADD COLUMN IF NOT EXISTS result TEXT;
ALTER TABLE squad_members ADD COLUMN IF NOT EXISTS challenge_streak INT DEFAULT 0;
ALTER TABLE squad_members ADD COLUMN IF NOT EXISTS challenge_week_checkins INT DEFAULT 0;
ALTER TABLE squad_members ADD COLUMN IF NOT EXISTS challenge_week_start DATE;
ALTER TABLE squad_members ADD COLUMN IF NOT EXISTS last_challenge_checkin DATE;
