-- Foguinho do grupo/dupla colaborativa passa a ser cumulativo por semana, baseado no
-- menor número de check-ins entre os membros (não mais em check-ins no mesmo dia).
-- week_min_checkins/week_min_start rastreiam o quanto da semana atual já foi "creditado"
-- em group_streak, pra só somar a diferença a cada checkin em vez de recalcular do zero.
ALTER TABLE squads ADD COLUMN IF NOT EXISTS week_min_checkins INT DEFAULT 0;
ALTER TABLE squads ADD COLUMN IF NOT EXISTS week_min_start DATE;
