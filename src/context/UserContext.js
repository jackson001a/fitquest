import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { signInAnonymous } from '../services/authService';
import { supabase } from '../services/supabase';
import { getOrCreateUser, updateUser, fetchTodayChallenges, completeChallengeinDB, saveWorkoutCompletion } from '../services/userService';
import { calculateMissedDays, checkWeeklyReset, processCheckin, processWorkout, processChallenge, computeFlameActive } from '../services/streakService';
import { checkAndUnlockAchievements, saveActivity } from '../services/achievementService';
import { scheduleFlameNotification } from '../services/notificationService';
import { useAppState } from '../hooks/useAppState';
import { dailyChallenges as mockChallenges } from '../data/mockData';

const UserContext = createContext(null);

// Garante número válido — converte null/undefined/NaN para fallback
function num(v, fallback = 0) {
  const n = Number(v);
  return isNaN(n) ? fallback : n;
}

// Calcula nível correto se XP ultrapassou o limite (retroativo)
function recalcLevel(xp, level, nextXP) {
  let l = level ?? 1, n = nextXP ?? 300;
  while (xp >= n) { l++; n = Math.round(n * 1.5); }
  return { level: l, nextLevelXp: n };
}

// Mapeia snake_case do Supabase → camelCase que as telas já usam
function normalizeUser(u) {
  if (!u) return null;
  return {
    ...u,
    // Gamificação — coerção numérica + recalcula nível retroativamente se XP ultrapassou limite
    xp:               num(u.xp, 0),
    level:            recalcLevel(num(u.xp,0), num(u.level,1), num(u.next_level_xp,300)).level,
    coins:            num(u.coins, 0),
    gems:             num(u.gems, 0),
    nextLevelXp:      recalcLevel(num(u.xp,0), num(u.level,1), num(u.next_level_xp,300)).nextLevelXp,
    todayXP:          num(u.today_xp, 0),
    dailyGoal:        num(u.daily_goal_xp, 200),
    leagueEmoji:      u.league_emoji      ?? '🥉',
    // Plano / streak
    streak:           num(u.streak_count, 0),
    streakCount:      num(u.streak_count, 0),
    longestStreak:    num(u.longest_streak, 0),
    streakGoal:       30,
    totalWorkouts:    num(u.total_workouts, 0),
    weekWorkouts:     num(u.week_workouts, 0),
    weekTrainingDays: u.week_training_days ?? [false,false,false,false,false,false,false],
    commitment:       num(u.commitment, 70),
    // Peso / meta
    goalType:         u.goal_type         ?? 'emagrecer',
    startWeight:      num(u.start_weight, 70),
    currentWeight:    num(u.current_weight, 70),
    targetWeight:     num(u.target_weight, 65),
    // Controle diário
    lastCheckinDate:   u.last_gym_checkin_date ?? null,
    isFlameActive:     u.is_flame_active   ?? false,
    weeklyFrequency:   num(u.weekly_frequency, 3),
    plannedDays:       u.planned_days      ?? [],
    weekCheckinsCount: num(u.week_checkins_count, 0),
    onboardingDone:    u.onboarding_done   ?? false,
    // Campos extras
    personalRecords:      u.personal_records       ?? {},
    bossKillsThisWeek:    num(u.boss_kills_this_week, 0),
    totalBossKills:       num(u.total_boss_kills, 0),
    userCode:             u.user_code ?? null,
    streakFreezeDays:     num(u.streak_freeze_days, 0),
  };
}

const AVATAR_KEY = '@capifit_avatar_photo';

export function UserProvider({ children }) {
  const [user,              setUser]              = useState(null);
  const [challenges,        setChallenges]        = useState(mockChallenges);
  const [onboardingDone,    setOnboardingDone]    = useState(false);
  const [loading,           setLoading]           = useState(true);
  const [alerts,            setAlerts]            = useState([]);
  const [newAchievements,   setNewAchievements]   = useState([]);
  const [avatarPhoto,       setAvatarPhoto]       = useState(null);

  const userRef    = useRef(null);
  const mountedRef = useRef(true);

  // ─── Boot: sessão em cache → sem esperar rede ────────────────────────────
  useEffect(() => {
    mountedRef.current = true;

    // Timeout de segurança — nunca fica travado mais de 8s
    const safetyTimer = setTimeout(() => {
      if (mountedRef.current && loading) {
        console.warn('Boot timeout — liberando tela');
        setLoading(false);
      }
    }, 8000);

    async function boot() {
      try {
        // 1. Tenta sessão salva localmente (AsyncStorage, sem rede)
        const { data: { session } } = await supabase.auth.getSession();
        let authId = session?.user?.id;

        // 2. Se não tem sessão, faz login anônimo (rede)
        if (!authId) {
          const anonUser = await signInAnonymous();
          authId = anonUser?.id;
        }

        if (!authId || !mountedRef.current) return;

        // 3. Carrega/cria usuário no Supabase
        const dbUser = normalizeUser(await getOrCreateUser(authId));
        if (!mountedRef.current) return;

        userRef.current = dbUser;
        setUser(dbUser);
        setOnboardingDone(dbUser.onboarding_done ?? false);

        // 4. Desafios, checagens e foto de perfil em paralelo (não bloqueiam a UI)
        const AS = require('@react-native-async-storage/async-storage').default;
        AS.getItem(AVATAR_KEY).then(uri => { if (uri && mountedRef.current) setAvatarPhoto(uri); }).catch(() => {});
        Promise.all([
          loadChallenges(dbUser.id),
          runForegroundChecks(dbUser),
        ]).catch(() => {});

      } catch (e) {
        console.error('UserContext boot error:', e);
      } finally {
        if (mountedRef.current) {
          clearTimeout(safetyTimer);
          setLoading(false);
        }
      }
    }

    boot();

    // Listener para refresh de token e mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mountedRef.current) return;
        if (!session && userRef.current) {
          // Token expirou — renova silenciosamente
          signInAnonymous().catch(() => {});
        }
      }
    );

    return () => {
      mountedRef.current = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  // ─── Detecta app voltando ao foreground ─────────────────────────────────
  const onForeground = useCallback(async () => {
    const current = userRef.current;
    if (!current) return;
    await runForegroundChecks(current);
  }, []);

  useAppState(onForeground);

  // ─── Checagens ao abrir / voltar ao app ──────────────────────────────────
  async function runForegroundChecks(dbUser) {
    const newAlerts = [];

    // 1. Reset semanal (segunda-feira) — verifica checkins reais no Supabase
    const { fields: resetFields, streakReset } = await checkWeeklyReset(dbUser.id, dbUser, supabase);
    if (Object.keys(resetFields).length > 0) {
      await updateUser(dbUser.id, resetFields);
      dbUser = normalizeUser({ ...dbUser, ...resetFields });
      userRef.current = dbUser;
      setUser(dbUser);

      if (streakReset) {
        newAlerts.push({
          type:    'streak_reset',
          message: 'Seu plano foi zerado porque você não cumpriu a meta da semana passada. Recomece hoje! 💪',
        });
      }
    }

    // 2. Comprometimento por dias perdidos
    const { fields: missedFields, alerts: missedAlerts } = calculateMissedDays(dbUser);
    if (missedAlerts.length > 0) {
      await updateUser(dbUser.id, missedFields);
      dbUser = normalizeUser({ ...dbUser, ...missedFields });
      userRef.current = dbUser;
      setUser(dbUser);
      newAlerts.push(...missedAlerts);
    }

    // 3. Foguinho — usa userRef.current para pegar estado mais recente
    // (evita race condition se check-in foi feito durante as operações acima)
    const latest = userRef.current ?? dbUser;
    const flameActive = computeFlameActive(latest);
    if (flameActive !== latest.is_flame_active) {
      await updateUser(latest.id, { is_flame_active: flameActive });
      const withFlame = normalizeUser({ ...latest, is_flame_active: flameActive });
      userRef.current = withFlame;
      setUser(withFlame);
    }

    // streak_risk vai inline no card — não mostra popup
    if (newAlerts.length > 0) setAlerts(newAlerts);
  }

  // ─── Carrega desafios diários ────────────────────────────────────────────
  async function loadChallenges(userId) {
    try {
      const rows = await fetchTodayChallenges(userId);
      // Mescla definições do mockData com status do Supabase
      const merged = mockChallenges.map(c => {
        const row = rows.find(r => r.challenge_id === c.id);
        return { ...c, completed: row?.completed ?? false };
      });
      setChallenges(merged);
    } catch {
      // Fallback para mockData
      setChallenges(mockChallenges.map(c => ({ ...c, completed: false })));
    }
  }

  // ─── Completa onboarding ─────────────────────────────────────────────────
  const completeOnboarding = useCallback(async (answers) => {
    const current = userRef.current;
    if (!current) return;

    const goalMap = { lose: 'emagrecer', gain: 'engordar', maintain: 'manter' };
    const fields = {
      name:             answers.name       || current.name,
      email:            answers.email      || current.email,
      phone:            answers.phone      || null,
      goal_type:        goalMap[answers.goal] || current.goal_type,
      target_weight:    answers.targetWeight !== undefined ? Number(answers.targetWeight) : current.target_weight,
      current_weight:   Number(answers.weight) || current.current_weight,
      start_weight:     Number(answers.weight) || current.start_weight,
      weekly_frequency: Number(answers.freq)   || current.weekly_frequency,
      planned_days:     answers.workoutDays    || current.planned_days,
      onboarding_done:  true,
    };

    const updated = normalizeUser(await updateUser(current.id, fields));
    userRef.current = updated;
    setUser(updated);
    setOnboardingDone(true);
  }, []);

  // ─── Check-in de academia ────────────────────────────────────────────────
  const doCheckin = useCallback(async () => {
    const current = userRef.current;
    if (!current) return false;

    const result = await processCheckin(current.id, current);
    if (!result) return false;

    const updated = normalizeUser({ ...current, ...result.fields });
    userRef.current = updated;
    setUser(updated);

    try { await scheduleFlameNotification(updated.weekly_frequency, updated.week_checkins_count); } catch (_) {}

    // Salva atividade + checa conquistas
    try {
      await saveActivity(current.id, 'checkin', 'Check-in na academia ✅', '✅', result.xpGain);
      const unlocked = await checkAndUnlockAchievements(current.id, updated);
      if (unlocked.length > 0) {
        setNewAchievements(prev => [...prev, ...unlocked]);
        for (const ach of unlocked) {
          await saveActivity(current.id, 'achievement', `Conquistou "${ach.name}"! ${ach.emoji}`, ach.emoji, ach.xp_reward ?? 0);
        }
      }
    } catch (_) {}

    return result;
  }, []);

  // ─── Completar treino ────────────────────────────────────────────────────
  const completeWorkout = useCallback(async (workout, durationSeconds = 0) => {
    const current = userRef.current;
    if (!current) return;

    // ── Update otimista imediato (UI atualiza antes das chamadas de rede) ──
    const newBossKills = (current.boss_kills_this_week ?? 0) + 1;
    const optimisticXP = (current.xp ?? 0) + workout.xp;
    let   optimisticLevel = current.level ?? 1;
    let   optimisticNextXP = current.next_level_xp ?? 1000;
    if (optimisticXP >= optimisticNextXP) {
      optimisticLevel++;
      optimisticNextXP = Math.round(optimisticNextXP * 1.5);
    }
    const optimistic = normalizeUser({
      ...current,
      xp:                  optimisticXP,
      today_xp:            (current.today_xp ?? 0) + workout.xp,
      level:               optimisticLevel,
      next_level_xp:       optimisticNextXP,
      total_workouts:      (current.total_workouts ?? 0) + 1,
      boss_kills_this_week: newBossKills,
    });
    userRef.current = optimistic;
    setUser(optimistic); // ← UI atualiza imediatamente

    // ── Persiste em background (sem rollback — estado otimista é mantido) ───
    try {
      const fields = await processWorkout(current.id, current, workout.xp);
      await saveWorkoutCompletion(current.id, workout, durationSeconds);
      await updateUser(current.id, {
        boss_kills_this_week: newBossKills,
        total_boss_kills: newBossKills >= 5
          ? (current.total_boss_kills ?? 0) + 1
          : (current.total_boss_kills ?? 0),
      });
      const updated = normalizeUser({ ...current, ...fields, boss_kills_this_week: newBossKills });
      userRef.current = updated;
      setUser(updated);
    } catch (e) {
      console.warn('[completeWorkout] Falha de rede — XP mantido localmente:', e.message);
      // Não faz rollback: usuário completou o treino e mantém o XP
      // Na próxima abertura do app o servidor sincroniza
    }

    // Salva atividade + checa conquistas
    try {
      const latestUser = userRef.current ?? optimistic;
      await saveActivity(current.id, 'workout', `Completou ${workout.name}`, workout.emoji, workout.xp);
      const unlocked = await checkAndUnlockAchievements(current.id, latestUser);
      if (unlocked.length > 0) {
        setNewAchievements(prev => [...prev, ...unlocked]);
        for (const ach of unlocked) {
          await saveActivity(current.id, 'achievement', `Conquistou "${ach.name}"! ${ach.emoji}`, ach.emoji, ach.xp_reward ?? 0);
        }
      }
    } catch (_) {}

    // Atualiza desafio de treino como concluído
    const hasChallengeWorkout = challenges.find(c => c.id === 1 && !c.completed);
    if (hasChallengeWorkout) await completeChallenge(1);
  }, [challenges]);

  // ─── Completar desafio diário ────────────────────────────────────────────
  const completeChallenge = useCallback(async (challengeId) => {
    const current   = userRef.current;
    const challenge = challenges.find(c => c.id === challengeId && !c.completed);
    if (!current || !challenge) return;

    await completeChallengeinDB(current.id, challengeId);
    const fields = await processChallenge(current.id, current, challenge);

    const updated = normalizeUser({ ...current, ...fields });
    userRef.current = updated;
    setUser(updated);

    setChallenges(prev => prev.map(c =>
      c.id === challengeId ? { ...c, completed: true } : c
    ));
  }, [challenges]);

  // ─── Compra congelamento de sequência com gemas ──────────────────────────────
  const purchaseFreeze = useCallback(async (days) => {
    const PRICES = { 1: 7, 2: 13, 3: 20 };
    const cost = PRICES[days];
    const current = userRef.current;
    if (!current || !cost) return { success: false, reason: 'invalid' };
    if ((current.gems ?? 0) < cost) return { success: false, reason: 'no_gems' };

    const newGems  = (current.gems ?? 0) - cost;
    const newFreeze = (current.streakFreezeDays ?? 0) + days;
    const fields = { gems: newGems, streak_freeze_days: newFreeze };
    const updated = normalizeUser({ ...current, ...fields });
    userRef.current = updated;
    setUser(updated);
    try { await updateUser(current.id, fields); } catch (_) {}
    return { success: true };
  }, []);

  // ─── Adiciona gemas (recompensas, eventos) ───────────────────────────────────
  const addGems = useCallback(async (amount) => {
    const current = userRef.current;
    if (!current || amount <= 0) return;
    const newGems = (current.gems ?? 0) + amount;
    const updated = normalizeUser({ ...current, gems: newGems });
    userRef.current = updated;
    setUser(updated);
    try { await updateUser(current.id, { gems: newGems }); } catch (_) {}
  }, []);

  // ─── Adiciona XP diretamente (bonus missões, chefe, etc.) ───────────────────
  const addXP = useCallback(async (amount) => {
    const current = userRef.current;
    if (!current || amount <= 0) return;
    const newXP      = current.xp + amount;
    const newTodayXP = (current.today_xp ?? 0) + amount;
    const { level: newLevel, nextLevelXp: newNextXP } = recalcLevel(newXP, 1, 300);
    const fields = { xp: newXP, today_xp: newTodayXP, level: newLevel, next_level_xp: newNextXP };
    const updated = normalizeUser({ ...current, ...fields });
    userRef.current = updated;
    setUser(updated);
    try { await updateUser(current.id, fields); } catch (_) {}
  }, []);

  // ─── Atualiza peso atual ──────────────────────────────────────────────────
  const updateCurrentWeight = useCallback(async (kg) => {
    const current = userRef.current;
    if (!current) return;
    const fields = { current_weight: kg };
    await updateUser(current.id, fields);
    const updated = normalizeUser({ ...current, ...fields });
    userRef.current = updated;
    setUser(updated);
  }, []);

  // ─── Atualiza foto de perfil ─────────────────────────────────────────────
  const updateAvatarPhoto = useCallback(async (uri) => {
    setAvatarPhoto(uri);
    const AS = require('@react-native-async-storage/async-storage').default;
    if (uri) AS.setItem(AVATAR_KEY, uri).catch(() => {});
    else     AS.removeItem(AVATAR_KEY).catch(() => {});
  }, []);

  // ─── Descarta primeira conquista da fila (após animação) ─────────────────
  const dismissAchievement = useCallback(() => {
    setNewAchievements(prev => prev.slice(1));
  }, []);

  // ─── Limpa alertas ───────────────────────────────────────────────────────
  const clearAlerts = useCallback(() => setAlerts([]), []);

  return (
    <UserContext.Provider value={{
      user,
      challenges,
      onboardingDone,
      loading,
      alerts,
      clearAlerts,
      newAchievements,
      dismissAchievement,
      completeOnboarding,
      doCheckin,
      completeWorkout,
      completeChallenge,
      addXP,
      addGems,
      purchaseFreeze,
      updateCurrentWeight,
      avatarPhoto,
      updateAvatarPhoto,
    }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
