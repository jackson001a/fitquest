import { supabase } from './supabase';

// ─── Helpers de data ──────────────────────────────────────────────────────────

// Converte 'YYYY-MM-DD' → Date local (sem bug de timezone UTC)
function parseLocalDate(str) {
  if (!str) return new Date();
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0); // meio-dia local — evita mudança de dia por UTC offset
}

// ─── Liga por XP total (mesmos nomes/emojis do LEAGUE_CONFIG em LeaderboardScreen) ──
// Ordem crescente (Bronze → Diamante) — usada também para exibir a progressão na UI.
export const LEAGUE_TIERS = [
  { league: 'Bronze',   emoji: '🥉', min: 0 },
  { league: 'Prata',    emoji: '🥈', min: 3500 },
  { league: 'Ouro',     emoji: '🥇', min: 10000 },
  { league: 'Platina',  emoji: '🔷', min: 22000 },
  { league: 'Diamante', emoji: '💎', min: 45000 },
];

export function computeLeague(xp) {
  const tier = [...LEAGUE_TIERS].reverse().find(t => xp >= t.min);
  return { league: tier.league, emoji: tier.emoji };
}

// Índice da liga atual + a próxima (para telas que mostram progresso rumo à próxima liga)
export function getLeagueProgress(xp) {
  const idx  = [...LEAGUE_TIERS].reverse().findIndex(t => xp >= t.min);
  const cur  = LEAGUE_TIERS[LEAGUE_TIERS.length - 1 - idx];
  const curIdx = LEAGUE_TIERS.findIndex(t => t.league === cur.league);
  const next = LEAGUE_TIERS[curIdx + 1] ?? null;
  return { current: cur, currentIndex: curIdx, next };
}

export function getMondayOf(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Dom
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getDayId(date = new Date()) {
  return ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'][date.getDay()];
}

export function isNewWeek(weekStartDateStr) {
  if (!weekStartDateStr) return false; // usuário novo — nunca reseta na primeira abertura
  const stored  = getMondayOf(parseLocalDate(weekStartDateStr));
  const current = getMondayOf(new Date());
  return current > stored;
}

export function toDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`; // 'YYYY-MM-DD' em hora local (sem UTC offset)
}

// ─── Cria o usuário na tabela public.users ────────────────────────────────────
export async function createUser(authId, overrides = {}) {
  const today  = toDateString();
  const monday = toDateString(getMondayOf());

  const payload = {
    auth_id:             authId,
    name:                overrides.name        || 'Usuário',
    email:               overrides.email       || null,
    phone:               overrides.phone       || null,
    goal_type:           overrides.goal_type   || 'emagrecer',
    start_weight:        overrides.start_weight   || 70,
    current_weight:      overrides.current_weight || 70,
    target_weight:       overrides.target_weight  || 65,
    xp:                  0,
    level:               1,
    next_level_xp:       300,   // nível 1→2 fácil; escala 1.5x a cada nível
    gems:                0,
    league:              'Bronze',
    league_emoji:        '🥉',
    daily_goal_xp:       200,
    today_xp:            0,
    streak_count:        0,
    longest_streak:      0,
    total_workouts:      0,
    week_workouts:       0,
    week_training_days:  [false,false,false,false,false,false,false],
    commitment:          0,    // começa do zero para mostrar evolução
    weekly_frequency:    overrides.weekly_frequency || 3,
    planned_days:        overrides.planned_days     || [],
    onboarding_done:     false,
    week_checkins_count: 0,
    week_start_date:     monday,
    is_flame_active:     false,
    last_checkin_date:   null,
    last_gym_checkin_date: null,
    last_checked_date:   today,
    last_workout_date:   null,
    last_active_date:    today,
    expo_push_token:     null,
  };

  const { data, error } = await supabase
    .from('users')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Busca usuário pelo auth_id ───────────────────────────────────────────────
export async function fetchUserByAuthId(authId) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', authId)
    .single();

  if (error?.code === 'PGRST116') return null; // not found
  if (error) throw error;
  return data;
}

// ─── Obtém ou cria usuário ────────────────────────────────────────────────────
export async function getOrCreateUser(authId, initialData = {}) {
  const existing = await fetchUserByAuthId(authId);
  if (existing) return existing;
  return createUser(authId, initialData);
}

// ─── Atualiza campos do usuário ───────────────────────────────────────────────
export async function updateUser(userId, fields) {
  // Remove null/NaN de campos numéricos para não corromper o banco
  const safe = Object.fromEntries(
    Object.entries(fields).filter(([, v]) =>
      v !== null && v !== undefined && !(typeof v === 'number' && isNaN(v))
    )
  );

  const { data, error } = await supabase
    .from('users')
    .update(safe)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('[updateUser] erro:', error.message, '| campos:', Object.keys(safe).join(', '));
    throw error;
  }
  return data;
}

// ─── Desafios diários do usuário para hoje ────────────────────────────────────
export async function fetchTodayChallenges(userId) {
  const today = toDateString();

  // Garante que os registros de hoje existem
  const challengeIds = [1, 2, 3];
  for (const id of challengeIds) {
    await supabase.from('user_daily_challenges').upsert(
      { user_id: userId, challenge_id: id, date: today, completed: false },
      { onConflict: 'user_id,challenge_id,date', ignoreDuplicates: true }
    );
  }

  const { data, error } = await supabase
    .from('user_daily_challenges')
    .select('*, daily_challenges(*)')
    .eq('user_id', userId)
    .eq('date', today);

  if (error) throw error;
  return data;
}

// ─── Marca desafio diário como concluído ─────────────────────────────────────
export async function completeChallengeinDB(userId, challengeId) {
  const today = toDateString();
  const { data, error } = await supabase
    .from('user_daily_challenges')
    .update({ completed: true, completed_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('challenge_id', challengeId)
    .eq('date', today)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Salva treino concluído ───────────────────────────────────────────────────
export async function saveWorkoutCompletion(userId, workout, durationSeconds) {
  const { data, error } = await supabase
    .from('workout_completions')
    .insert({
      user_id:          userId,
      workout_name:     workout.name,
      workout_emoji:    workout.emoji,
      duration_seconds: durationSeconds,
      xp_earned:        workout.xp,
      workout_data:     workout,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Salva check-in de academia ───────────────────────────────────────────────
export async function saveCheckin(userId, xpEarned = 30) {
  const today = toDateString();
  const { data, error } = await supabase
    .from('checkins')
    .upsert(
      { user_id: userId, date: today, xp_earned: xpEarned },
      { onConflict: 'user_id,date', ignoreDuplicates: true }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Histórico de treinos ─────────────────────────────────────────────────────
export async function fetchWorkoutHistory(userId, limit = 20) {
  const { data, error } = await supabase
    .from('workout_completions')
    .select('*')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

// ─── Último registro de kg/reps de um treino específico (para pré-preencher séries) ──
export async function fetchLastWorkoutLog(userId, workoutName) {
  const { data, error } = await supabase
    .from('workout_completions')
    .select('workout_data, completed_at')
    .eq('user_id', userId)
    .eq('workout_name', workoutName)
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.workout_data ?? null;
}

// ─── Categorias dos treinos concluídos nesta semana (para o Chefe da Semana) ──
export async function fetchThisWeekWorkoutCategories(userId) {
  const monday = getMondayOf().toISOString();
  const { data, error } = await supabase
    .from('workout_completions')
    .select('workout_data')
    .eq('user_id', userId)
    .gte('completed_at', monday);

  if (error) throw error;
  return (data ?? []).map(row => row.workout_data?.category).filter(Boolean);
}

// ─── Ranking de amigos ────────────────────────────────────────────────────────
export async function fetchFriendsLeaderboard(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, xp, streak_count, league, league_emoji')
    .in('id', [
      userId,
      // subquery via friendships
      ...(await supabase
        .from('friendships')
        .select('friend_id')
        .eq('user_id', userId)
        .eq('status', 'accepted')
        .then(r => r.data?.map(f => f.friend_id) ?? []))
    ])
    .order('xp', { ascending: false });

  if (error) throw error;
  return data;
}

// ─── Salva token de push notification ────────────────────────────────────────
export async function savePushToken(userId, token) {
  await updateUser(userId, { expo_push_token: token });
}
