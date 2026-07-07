import { supabase } from './supabase';
import { updateUser } from './userService';

// Condição de desbloqueio por tipo
function meetsCondition(achievement, user) {
  const v = achievement.condition_value ?? 1;
  switch (achievement.condition_type) {
    case 'streak':       return (user.streak_count    ?? 0) >= v;
    case 'workouts':     return (user.total_workouts   ?? 0) >= v;
    case 'xp':           return (user.xp               ?? 0) >= v;
    case 'boss_kills':   return (user.total_boss_kills ?? 0) >= v;
    case 'week_workouts':return (user.weekWorkouts      ?? 0) >= v;
    case 'commitment':   return (user.commitment        ?? 0) >= v;
    default:             return false; // 'manual' → acionado por evento específico
  }
}

// Progresso atual para exibição
function getCurrentProgress(achievement, user) {
  switch (achievement.condition_type) {
    case 'streak':        return user.streak_count    ?? 0;
    case 'workouts':      return user.total_workouts   ?? 0;
    case 'xp':            return user.xp               ?? 0;
    case 'boss_kills':    return user.total_boss_kills ?? 0;
    case 'week_workouts': return user.weekWorkouts      ?? 0;
    case 'commitment':    return user.commitment        ?? 0;
    default:              return 0;
  }
}

// ─── Busca conquistas do usuário (com definições) ─────────────────────────────
export async function fetchUserAchievements(userId) {
  const [{ data: defs }, { data: userAchs }] = await Promise.all([
    supabase.from('achievements').select('*').order('id'),
    supabase.from('user_achievements').select('*').eq('user_id', userId),
  ]);

  const map = {};
  userAchs?.forEach(a => { map[a.achievement_id] = a; });

  return (defs ?? []).map(def => {
    const ua = map[def.id];
    return {
      ...def,
      unlocked:    ua?.unlocked   ?? false,
      progress:    ua?.progress   ?? 0,
      unlocked_at: ua?.unlocked_at ?? null,
    };
  });
}

// ─── Checa e desbloqueia conquistas automáticas ───────────────────────────────
// Retorna array de conquistas recém-desbloqueadas (para mostrar animação)
export async function checkAndUnlockAchievements(userId, user) {
  const [{ data: defs }, { data: existing }] = await Promise.all([
    supabase.from('achievements').select('*').neq('condition_type', 'manual'),
    supabase.from('user_achievements').select('*').eq('user_id', userId),
  ]);

  if (!defs) return [];

  const existingMap = {};
  existing?.forEach(a => { existingMap[a.achievement_id] = a; });

  const newlyUnlocked = [];
  const upserts = [];

  for (const def of defs) {
    const current = existingMap[def.id];
    if (current?.unlocked) continue; // já desbloqueada

    const progress = getCurrentProgress(def, user);
    const shouldUnlock = meetsCondition(def, user);

    if (shouldUnlock) {
      upserts.push({
        user_id:        userId,
        achievement_id: def.id,
        unlocked:       true,
        progress:       def.condition_value,
        unlocked_at:    new Date().toISOString(),
      });
      newlyUnlocked.push(def);
    } else {
      upserts.push({
        user_id:        userId,
        achievement_id: def.id,
        unlocked:       false,
        progress,
      });
    }
  }

  if (upserts.length > 0) {
    await supabase
      .from('user_achievements')
      .upsert(upserts, { onConflict: 'user_id,achievement_id' });
  }

  // Bônus de XP pelas conquistas desbloqueadas
  if (newlyUnlocked.length > 0) {
    const xpBonus = newlyUnlocked.reduce((sum, a) => sum + (a.xp_reward ?? 0), 0);
    if (xpBonus > 0) {
      await updateUser(userId, {
        xp:    (user.xp ?? 0) + xpBonus,
        coins: (user.coins ?? 0) + Math.floor(xpBonus / 10),
      });
    }
  }

  return newlyUnlocked;
}

// ─── Desbloqueia conquista manual por ID ─────────────────────────────────────
export async function unlockManualAchievement(userId, achievementId, user) {
  const { data: def } = await supabase
    .from('achievements')
    .select('*')
    .eq('id', achievementId)
    .single();
  if (!def) return null;

  const { data: existing } = await supabase
    .from('user_achievements')
    .select('unlocked')
    .eq('user_id', userId)
    .eq('achievement_id', achievementId)
    .single();
  if (existing?.unlocked) return null;

  await supabase.from('user_achievements').upsert({
    user_id: userId, achievement_id: achievementId,
    unlocked: true, progress: 1, unlocked_at: new Date().toISOString(),
  }, { onConflict: 'user_id,achievement_id' });

  if (def.xp_reward) {
    await updateUser(userId, { xp: (user.xp ?? 0) + def.xp_reward });
  }

  return def;
}

// IDs fixos das conquistas manuais — para disparar pelo nome
export const ACHIEVEMENT_IDS = {
  CACADOR:         13, // Derrota o boss semanal (5 treinos/semana)
  FOCADO:          14, // 7 desafios diários concluídos
  LIGA_DIAMANTE:   15, // Atingiu Liga Diamante
  TOP_3:           16, // Top 3 do ranking
  MADRUGADOR:      19, // Treino antes das 8h
  GUERREIRO_CLA:   20, // Venceu desafio de grupo
  CAMPEAO_DUELO:   21, // Venceu duelo individual
};

// ─── Salva atividade recente e publica no feed se for evento público ─────────
export async function saveActivity(userId, type, text, emoji, xpEarned = 0) {
  await supabase.from('user_activity').insert({
    user_id: userId, type, text, emoji, xp_earned: xpEarned,
  });

  // Publica no feed social para eventos relevantes
  const feedTypes = ['record', 'achievement', 'workout', 'streak'];
  if (feedTypes.includes(type)) {
    const badgeMap = {
      record:      'Novo Recorde',
      achievement: 'Conquista Desbloqueada',
      workout:     'Treino Completo',
      streak:      'Sequência Ativa',
    };
    await supabase.from('feed_posts').insert({
      user_id:   userId,
      post_type: type,
      emoji,
      badge:     badgeMap[type] ?? type,
      detail:    text,
    }).catch(() => {}); // não bloqueia se falhar
  }
}

// ─── Busca atividade recente ──────────────────────────────────────────────────
export async function fetchRecentActivity(userId, limit = 10) {
  const { data } = await supabase
    .from('user_activity')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

// ─── Salva recorde pessoal ────────────────────────────────────────────────────
export async function savePersonalRecord(userId, exerciseName, kg, user) {
  const current = user.personal_records ?? {};
  const prev    = current[exerciseName]; // undefined = sem histórico ainda

  // Não é recorde se já existe um registro maior ou igual
  if (prev !== undefined && kg <= prev) return false;

  const updated = { ...current, [exerciseName]: kg };
  await updateUser(userId, { personal_records: updated });

  // Só publica atividade se for um PR real (não primeiro registro)
  if (prev !== undefined && kg > prev) {
    await saveActivity(userId, 'record', `Novo recorde: ${exerciseName} ${kg}kg 🏆`, '🏆', 0);
    return true;
  }
  return false;
}

// ─── Busca ranking real do Supabase ──────────────────────────────────────────
export async function fetchLeaderboard(limit = 20) {
  const { data } = await supabase
    .from('users')
    .select('id, name, xp, streak_count, league, league_emoji, onboarding_done')
    .eq('onboarding_done', true)
    .order('xp', { ascending: false })
    .limit(limit);
  return (data ?? []).map((u, i) => ({
    ...u,
    rank:    i + 1,
    avatar:  u.name?.[0]?.toUpperCase() ?? '?',
    streak:  u.streak_count ?? 0,
    change:  0,
    isUser:  false, // será marcado no componente
  }));
}
