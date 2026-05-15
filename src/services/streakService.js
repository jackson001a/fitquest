import { updateUser, saveCheckin, getDayId, isNewWeek, getMondayOf, toDateString } from './userService';

// ─── Pontuação de comprometimento ────────────────────────────────────────────
const C = {
  CHECKIN_PLANNED:    6,
  MISSED_PLANNED:    -8,   // reduzido (menos punitivo por dia)
  CHECKIN_EXTRA:      2,
  WEEKLY_BONUS:       5,
  MAX_WEEKLY_PENALTY:-20,  // perde no máximo 20 pontos por semana de faltas
  MIN:                0,
  MAX:              100,
};

function clamp(v) {
  return Math.max(C.MIN, Math.min(C.MAX, v));
}

// ─── Verifica dias perdidos desde a última abertura do app ────────────────────
// Retorna { fields, alerts } para salvar no Supabase e mostrar ao usuário
export function calculateMissedDays(user) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // parseLocalDate via split para evitar bug de timezone (new Date('YYYY-MM-DD') = UTC)
  function parseLocal(str) {
    if (!str) return new Date();
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0);
  }

  const lastChecked = parseLocal(user.last_checked_date);
  lastChecked.setHours(0, 0, 0, 0);

  const alerts = [];
  let commitmentDelta = 0;
  const freezeActive  = (user.streak_freeze_days ?? 0) > 0;
  const dayLabels = {
    seg:'segunda', ter:'terça', qua:'quarta',
    qui:'quinta',  sex:'sexta', sab:'sábado', dom:'domingo',
  };

  // Itera de (lastChecked + 1) até ontem
  const cursor = new Date(lastChecked);
  cursor.setDate(cursor.getDate() + 1);

  while (cursor < today) {
    const dayId   = getDayId(cursor);
    const dateStr = toDateString(cursor);
    const planned = (user.planned_days ?? []).includes(dayId);
    const didGo   = user.last_gym_checkin_date === dateStr;

    if (planned && !didGo) {
      if (freezeActive) {
        // Freeze ativo — commitment não cai (freeze cobre)
        alerts.push({ type: 'freeze_used', message: `🧊 Bloqueio protegeu seu treino de ${dayLabels[dayId]}!` });
      } else {
        commitmentDelta += C.MISSED_PLANNED;
        alerts.push({ type: 'commitment_drop', message: `Você não treinou ${dayLabels[dayId]} como havia planejado. Comprometimento −8 pontos.` });
      }
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  // Limita a perda total da semana
  const cappedDelta = Math.max(commitmentDelta, C.MAX_WEEKLY_PENALTY);

  const fields = {
    commitment:        clamp((user.commitment ?? 70) + cappedDelta),
    last_checked_date: toDateString(),
  };

  return { fields, alerts, commitmentDelta: cappedDelta };
}

// ─── Reset semanal (toda segunda-feira) ──────────────────────────────────────
export async function checkWeeklyReset(userId, user, supabase) {
  if (!isNewWeek(user.week_start_date)) {
    return { fields: {}, streakReset: false };
  }

  const monday      = toDateString(getMondayOf());
  const lastMonday  = toDateString(new Date(new Date(monday).getTime() - 7 * 86400000));

  // Verifica checkins reais no Supabase para a semana passada (evita falso reset por bug de contagem)
  let realCheckins = user.week_checkins_count ?? 0;
  if (supabase && userId) {
    try {
      const { count } = await supabase
        .from('checkins')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('date', lastMonday)
        .lt('date', monday);
      if (count !== null) realCheckins = Math.max(realCheckins, count);
    } catch (_) {}
  }

  const metGoal    = realCheckins >= (user.weekly_frequency ?? 1);
  const missedDays = Math.max(0, (user.weekly_frequency ?? 1) - realCheckins);
  const freezeDays = user.streak_freeze_days ?? 0;
  // Freeze cobre se há dias suficientes para proteger todos os dias perdidos
  const freezeCovers = freezeDays >= missedDays && missedDays > 0;

  const fields = {
    week_checkins_count:  0,
    week_start_date:      monday,
    week_training_days:   [false,false,false,false,false,false,false],
    week_workouts:        0,
    today_xp:             0,
    last_active_date:     toDateString(),
    last_checked_date:    monday,
    boss_kills_this_week: 0,
  };

  if (metGoal) {
    // Meta batida → bônus de comprometimento
    fields.commitment = clamp((user.commitment ?? 70) + C.WEEKLY_BONUS);
  } else if (freezeCovers) {
    // Freeze protege o streak — consome os dias usados
    fields.streak_freeze_days = freezeDays - missedDays;
    // Sem bônus de comprometimento, mas também sem penalidade de streak
  } else if ((user.streak_count ?? 0) > 0) {
    // Sem freeze suficiente → zera o streak
    fields.streak_count = 0;
  }

  const streakReset = !metGoal && !freezeCovers && (user.streak_count ?? 0) > 0;
  return { fields, streakReset };
}

// ─── Processa check-in de academia ───────────────────────────────────────────
export async function processCheckin(userId, user) {
  const today = toDateString();
  if (user.last_gym_checkin_date === today) return null; // já fez hoje

  const dayId     = getDayId(new Date());
  const isPlanned = (user.planned_days ?? []).includes(dayId);

  // Comprometimento
  const commitmentDelta = isPlanned ? C.CHECKIN_PLANNED : C.CHECKIN_EXTRA;
  let newCommitment = clamp((user.commitment ?? 70) + commitmentDelta);

  // Plano (streak)
  const newStreak  = (user.streak_count ?? 0) + 1;
  const newLongest = Math.max(user.longest_streak ?? 0, newStreak);

  // Semana
  const newWeekCount = (user.week_checkins_count ?? 0) + 1;
  const metGoalNow   = newWeekCount >= (user.weekly_frequency ?? 1);
  if (metGoalNow && newWeekCount === (user.weekly_frequency ?? 1)) {
    // Acabou de bater a meta semanal → bônus
    newCommitment = clamp(newCommitment + C.WEEKLY_BONUS);
  }

  // Dia da semana no array [Seg=0..Dom=6]
  const dow    = new Date().getDay();
  const idx    = dow === 0 ? 6 : dow - 1;
  const days   = [...(user.week_training_days ?? [false,false,false,false,false,false,false])];
  days[idx]    = true;

  // XP
  const xpGain   = 30;
  const newXP    = (user.xp ?? 0) + xpGain;
  const newToday = (user.today_xp ?? 0) + xpGain;
  let level      = user.level ?? 1;
  let nextXP     = user.next_level_xp ?? 1000;
  if (newXP >= nextXP) { level++; nextXP = Math.round(nextXP * 1.5); }

  const fields = {
    last_gym_checkin_date: today,
    last_checkin_date:     today,
    last_checked_date:     today,
    last_active_date:      today,
    is_flame_active:       true,
    streak_count:          newStreak,
    longest_streak:        newLongest,
    week_checkins_count:   newWeekCount,
    week_training_days:    days,
    week_workouts:         newWeekCount,
    commitment:            newCommitment,
    xp:                    newXP,
    today_xp:              newToday,
    level,
    next_level_xp:         nextXP,
  };

  await updateUser(userId, fields);
  await saveCheckin(userId, xpGain);

  return { fields, xpGain, isPlanned, metGoalNow };
}

// ─── Processa conclusão de treino ─────────────────────────────────────────────
export async function processWorkout(userId, user, xpGain) {
  const today    = toDateString();
  const newXP    = (user.xp ?? 0) + xpGain;
  const newToday = (user.today_xp ?? 0) + xpGain;
  let level  = user.level ?? 1;
  let nextXP = user.next_level_xp ?? 1000;
  if (newXP >= nextXP) { level++; nextXP = Math.round(nextXP * 1.5); }

  const fields = {
    xp:               newXP,
    today_xp:         newToday,
    level,
    next_level_xp:    nextXP,
    total_workouts:   (user.total_workouts ?? 0) + 1,
    last_workout_date: today,
    last_active_date:  today,
  };

  await updateUser(userId, fields);
  return fields;
}

// ─── Processa conclusão de desafio diário ────────────────────────────────────
export async function processChallenge(userId, user, challenge) {
  const today   = toDateString();
  // Suporte a ambos os campos: xp_reward (Supabase) e xp (mockData)
  const amount  = Number(challenge.xp_reward ?? challenge.xp ?? 0);
  const newXP   = (user.xp ?? 0) + amount;
  const newToday = (user.today_xp ?? 0) + amount;

  const fields = {
    xp:              newXP,
    today_xp:        newToday,
    last_active_date: today,
  };

  await updateUser(userId, fields);
  return fields;
}

// ─── Calcula se o foguinho está ativo no momento ─────────────────────────────
export function computeFlameActive(user) {
  const today    = toDateString();
  const metGoal  = (user.week_checkins_count ?? 0) >= (user.weekly_frequency ?? 1);

  // Bateu a meta semanal → foguinho aceso o resto da semana
  if (metGoal) return true;

  // Senão, só fica aceso se fez check-in hoje
  return user.last_gym_checkin_date === today;
}
