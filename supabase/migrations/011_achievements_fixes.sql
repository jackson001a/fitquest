-- ─── Corrige conquistas que nunca podiam ser desbloqueadas ou tinham lógica errada ──

-- "1000 XP/dia" checava XP TOTAL (sempre destravava sem nunca bater 1000 num dia só)
UPDATE public.achievements SET condition_type = 'daily_xp' WHERE id = 11;

-- "Sem Desculpas" era 'manual' mas nada no app nunca chamava o desbloqueio dela;
-- vira automática reaproveitando a mesma condição de "5 treinos na semana"
UPDATE public.achievements SET condition_type = 'week_workouts' WHERE id = 18;

-- "Focado" (7 desafios diários) também era 'manual' sem nenhum trigger — vira
-- automática via novo contador total_challenges_completed
UPDATE public.achievements SET condition_type = 'challenges_completed' WHERE id = 14;

-- "Liga Diamante" também era 'manual' sem trigger — vira automática reaproveitando
-- a condição 'xp' já existente, no mesmo limiar usado por computeLeague() no app
UPDATE public.achievements SET condition_type = 'xp', condition_value = 30000 WHERE id = 15;

-- Contador de desafios diários concluídos (para a conquista "Focado")
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS total_challenges_completed INTEGER DEFAULT 0;

-- Conquistas que o código já tentava desbloquear (vitória em desafio de clã/duelo)
-- mas cujas linhas nunca existiram na tabela
INSERT INTO public.achievements (id, emoji, name, description, category, xp_reward, condition_type, condition_value) VALUES
  (19, '🛡️', 'Guerreiro do Clã', 'Vença um desafio de grupo (clã)', 'especial', 400, 'manual', 1),
  (20, '⚔️', 'Campeão de Duelo',  'Vença um desafio de dupla (duelo)', 'especial', 400, 'manual', 1)
ON CONFLICT (id) DO NOTHING;
