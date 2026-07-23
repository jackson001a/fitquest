import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signInAnonymous, signInWithEmail } from '../services/authService';
import { supabase } from '../services/supabase';
import { getOrCreateUser, updateUser, fetchTodayChallenges, completeChallengeinDB, saveWorkoutCompletion, computeLeague } from '../services/userService';
import { calculateMissedDays, checkDailyReset, checkWeeklyReset, processCheckin, processWorkout, processChallenge, computeFlameActive } from '../services/streakService';
import { checkAndUnlockAchievements, saveActivity, unlockManualAchievement, ACHIEVEMENT_IDS } from '../services/achievementService';
import { scheduleFlameNotification, registerForPushNotifications } from '../services/notificationService';
import { useAppState } from '../hooks/useAppState';
import { dailyChallenges as mockChallenges } from '../data/mockData';

const UserContext = createContext(null);

// Garante número válido — converte null/undefined/NaN para fallback
function num(v, fallback = 0) {
  const n = Number(v);
  return isNaN(n) ? fallback : n;
}

// Sempre recalcula nível do zero a partir do XP total — nunca confia no level/
// next_level_xp salvos como ponto de partida, pois podem ficar dessincronizados
// (ex: level alto pareado com next_level_xp baixo) e travar o usuário num nível errado.
// O XP exigido por nível (incremento) cresce 1.5x a cada nível; o limiar mostrado
// é a soma cumulativa desses incrementos — não o incremento multiplicado direto,
// que fazia o salto do nível 2→3 ficar mais fácil que o do 1→2.
function recalcLevel(xp) {
  let level = 1, increment = 300, threshold = increment;
  while (xp >= threshold) {
    level++;
    increment = Math.round(increment * 1.5);
    threshold += increment;
  }
  return { level, nextLevelXp: threshold };
}

// Gemas de bônus por subir de liga — raro (só 4 vezes na vida da conta),
// bem mais difícil que "subir de nível" (que acontece toda hora).
const LEAGUE_UP_GEMS = 4;
function leagueUpBonus(prevLeague, newXP) {
  return computeLeague(newXP).league !== prevLeague ? LEAGUE_UP_GEMS : 0;
}

// Gema de bônus ao bater um marco de sequência (7/14/21/30/60 dias) —
// raro e não sobrepõe o sistema de chama, que já usa os mesmos marcos visualmente.
const STREAK_GEM_MILESTONES = [10, 21, 35, 60, 100];
const STREAK_GEM_AMOUNT = 1;

// Mapeia snake_case do Supabase → camelCase que as telas já usam
function normalizeUser(u) {
  if (!u) return null;
  return {
    ...u,
    // Gamificação — coerção numérica + recalcula nível retroativamente se XP ultrapassou limite
    xp:               num(u.xp, 0),
    level:            recalcLevel(num(u.xp,0)).level,
    gems:             num(u.gems, 0),
    nextLevelXp:      recalcLevel(num(u.xp,0)).nextLevelXp,
    todayXP:          num(u.today_xp, 0),
    dailyGoal:        num(u.daily_goal_xp, 200),
    // Liga sempre recalculada a partir do XP total — nunca confia no valor salvo,
    // que só era gravado uma vez na criação do usuário e nunca mais atualizado.
    league:           computeLeague(num(u.xp, 0)).league,
    leagueEmoji:      computeLeague(num(u.xp, 0)).emoji,
    // Plano / streak
    streak:           num(u.streak_count, 0),
    streakCount:      num(u.streak_count, 0),
    longestStreak:    num(u.longest_streak, 0),
    streakGoal:       30,
    totalWorkouts:    num(u.total_workouts, 0),
    weekWorkouts:     num(u.week_workouts, 0),
    totalChallengesCompleted: num(u.total_challenges_completed, 0),
    weekTrainingDays: u.week_training_days ?? [false,false,false,false,false,false,false],
    commitment:       num(u.commitment, 70),
    // Peso / meta
    goalType:         u.goal_type         ?? 'emagrecer',
    startWeight:      num(u.start_weight, 70),
    currentWeight:    num(u.current_weight, 70),
    targetWeight:     num(u.target_weight, 65),
    goalsUpdatedAt:   u.goals_updated_at   ?? null,
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
    avatarUrl:            u.avatar_url ?? null,
    isPremium:            u.is_premium ?? false,
    premiumPlan:          u.premium_plan ?? null,
  };
}

// Chave de foto de perfil é isolada POR USUÁRIO — evita que a foto de uma conta
// "vaze" para outra conta criada no mesmo aparelho após logout/nova conta.
const avatarKeyFor      = (userId) => `@capifit_avatar_photo_${userId}`;
const LOGGED_OUT_KEY    = '@capifit_logged_out';
const NOTIFICATIONS_KEY = '@capifit_notifications_enabled';

export function UserProvider({ children }) {
  const [user,              setUser]              = useState(null);
  const [challenges,        setChallenges]        = useState(mockChallenges);
  const [onboardingDone,    setOnboardingDone]    = useState(false);
  const [loading,           setLoading]           = useState(true);
  const [alerts,            setAlerts]            = useState([]);
  const [newAchievements,   setNewAchievements]   = useState([]);
  const [avatarPhoto,       setAvatarPhoto]       = useState(null);
  const [loggedOut,         setLoggedOut]         = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [xpToast, setXpToast] = useState(null);
  const xpToastIdRef = useRef(0);

  // Mostra "+N XP" com a origem sempre que XP é ganho fora do fluxo de treino
  // (que já tem seu próprio modal de comemoração) — sem isso, ganhos de XP de
  // check-in, desafio diário ou bônus manual não davam nenhum feedback visível.
  const pushXPToast = useCallback((amount, source) => {
    if (!amount || amount <= 0) return;
    xpToastIdRef.current += 1;
    setXpToast({ id: xpToastIdRef.current, amount, source });
  }, []);
  const clearXpToast = useCallback(() => setXpToast(null), []);

  // ─── Fila unificada de comemorações (conquista desbloqueada / subiu de nível) ──
  // Várias coisas podem "merecer" um popup no mesmo instante (treino concluído
  // gera XP, que desbloqueia conquista, que sobe de nível — tudo na mesma ação).
  // Mostrar todos os popups ao mesmo tempo como Modals separados fazia um
  // "engolir" o outro (só o som tocava, nada aparecia). A fila garante que só
  // um Modal fica visível por vez, um atrás do outro. Os modais "locais" da
  // própria tela (resumo do treino, comemoração de check-in) têm prioridade —
  // a tela chama `setCelebrationsPaused(true)` enquanto o modal dela estiver
  // aberto, e a fila só começa a desfilar depois que ela libera.
  const [celebrationQueue, setCelebrationQueue] = useState([]);
  const [celebrationsPaused, setCelebrationsPausedState] = useState(false);
  const prevLevelRef = useRef(null);

  const enqueueCelebration = useCallback((item) => {
    setCelebrationQueue(prev => [...prev, { id: `${Date.now()}_${Math.random().toString(36).slice(2)}`, ...item }]);
  }, []);
  const advanceCelebration = useCallback(() => {
    setCelebrationQueue(prev => prev.slice(1));
  }, []);
  const setCelebrationsPaused = useCallback((paused) => {
    setCelebrationsPausedState(paused);
  }, []);

  // checkAndUnlockAchievements/unlockManualAchievement gravam o bônus de XP
  // direto no Supabase, mas não atualizavam o estado local — o app só refletia
  // esse XP extra (e o nível daí decorrente) depois de reabrir. Esses helpers
  // aplicam o mesmo bônus no estado local logo em seguida.
  const applyXPBonus = useCallback((baseUser, amount, gems = 0) => {
    if (!(amount > 0)) return baseUser;
    const bumped = normalizeUser({
      ...baseUser,
      xp:       (baseUser.xp ?? 0) + amount,
      today_xp: (baseUser.todayXP ?? 0) + amount,
      gems:     (baseUser.gems ?? 0) + gems,
    });
    userRef.current = bumped;
    setUser(bumped);
    return bumped;
  }, []);

  const applyAchievementBonus = useCallback((baseUser, unlocked) => {
    if (!unlocked || !(unlocked.xpBonus > 0)) return baseUser;
    return applyXPBonus(baseUser, unlocked.xpBonus, unlocked.gemsBonus ?? 0);
  }, [applyXPBonus]);

  const userRef    = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    if (user == null) { prevLevelRef.current = null; return; }
    if (prevLevelRef.current != null && user.level > prevLevelRef.current) {
      enqueueCelebration({ kind: 'levelup', level: user.level });
    }
    prevLevelRef.current = user.level;
  }, [user?.level]);

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

        // 2. Se não tem sessão, verifica se foi um "sair da conta" explícito —
        // nesse caso não loga anônimo de novo, mostra a tela de login/criar conta.
        if (!authId) {
          const wasSignedOut = await AsyncStorage.getItem(LOGGED_OUT_KEY);
          if (wasSignedOut === '1') {
            if (mountedRef.current) setLoggedOut(true);
            return;
          }
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
        setAvatarPhoto(null); // limpa a foto da sessão anterior antes de buscar a deste usuário
        AS.getItem(avatarKeyFor(dbUser.id)).then(uri => { if (uri && mountedRef.current) setAvatarPhoto(uri); }).catch(e => console.warn('[boot] avatar cache falhou:', e.message));
        AS.getItem(NOTIFICATIONS_KEY).then(v => { if (mountedRef.current) setNotificationsEnabled(v === '1'); }).catch(e => console.warn('[boot] preferência de notificações falhou:', e.message));
        Promise.all([
          loadChallenges(dbUser.id),
          runForegroundChecks(dbUser),
        ]).catch(e => console.warn('[boot] checagens de foreground falharam:', e.message));

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
          signInAnonymous().catch(e => console.warn('[auth] renovação de sessão falhou:', e.message));
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
  // Pausado durante o fluxo de check-in: abrir a câmera nativa também dispara
  // background→foreground, e rodar as duas checagens em paralelo disputava
  // a mesma escrita de usuário no Supabase.
  const foregroundChecksPausedRef = useRef(false);
  const setForegroundChecksPaused = useCallback((paused) => {
    foregroundChecksPausedRef.current = paused;
  }, []);

  const onForeground = useCallback(async () => {
    if (foregroundChecksPausedRef.current) return;
    const current = userRef.current;
    if (!current) return;
    try {
      await runForegroundChecks(current);
    } catch (e) {
      console.warn('[onForeground] checagens falharam:', e.message);
    }
  }, []);

  useAppState(onForeground);

  // ─── Checagens ao abrir / voltar ao app ──────────────────────────────────
  async function runForegroundChecks(dbUser) {
    const newAlerts = [];

    // 1. Reset diário do XP de hoje — sem isso "XP hoje" ficava com o valor do dia anterior
    const { fields: dailyFields } = checkDailyReset(dbUser);
    if (Object.keys(dailyFields).length > 0) {
      await updateUser(dbUser.id, dailyFields);
      dbUser = normalizeUser({ ...dbUser, ...dailyFields });
      userRef.current = dbUser;
      setUser(dbUser);
    }

    // 2. Reset semanal (segunda-feira) — verifica checkins reais no Supabase
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

    // 3. Comprometimento por dias perdidos
    const { fields: missedFields, alerts: missedAlerts } = calculateMissedDays(dbUser);
    if (missedAlerts.length > 0) {
      await updateUser(dbUser.id, missedFields);
      dbUser = normalizeUser({ ...dbUser, ...missedFields });
      userRef.current = dbUser;
      setUser(dbUser);
      newAlerts.push(...missedAlerts);
    }

    // 4. Foguinho — usa userRef.current para pegar estado mais recente
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
    } catch (e) {
      console.warn('[loadChallenges] falha ao buscar do Supabase, usando mockData:', e.message);
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
      goals_updated_at: new Date().toISOString(),
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

    let bonusGems = leagueUpBonus(current.league, result.fields.xp);
    if (STREAK_GEM_MILESTONES.includes(result.fields.streak_count)) bonusGems += STREAK_GEM_AMOUNT;

    let updated = normalizeUser({ ...current, ...result.fields });
    if (bonusGems > 0) {
      const newGems = (current.gems ?? 0) + bonusGems;
      updated = normalizeUser({ ...updated, gems: newGems });
      try { await updateUser(current.id, { gems: newGems }); } catch (e) { console.warn('[doCheckin] bônus de gemas falhou:', e.message); }
    }
    userRef.current = updated;
    setUser(updated);
    pushXPToast(result.xpGain, 'Check-in na academia');

    try { await scheduleFlameNotification(updated.weekly_frequency, updated.week_checkins_count); } catch (e) { console.warn('[doCheckin] notificação de foguinho falhou:', e.message); }

    try {
      const { registerChallengeCheckin } = require('../services/socialService');
      await registerChallengeCheckin(current.id);
    } catch (e) { console.warn('[doCheckin] registro de desafio social falhou:', e.message); }

    // Salva atividade do check-in (separado da checagem de conquistas abaixo —
    // se essa gravação falhar, não pode derrubar a checagem de conquistas junto)
    try {
      await saveActivity(current.id, 'checkin', 'Check-in na academia ✅', '✅', result.xpGain);
    } catch (e) { console.warn('[doCheckin] salvar atividade falhou:', e.message); }

    // Checa conquistas — em try/catch próprio para não depender do saveActivity acima
    try {
      const unlocked = await checkAndUnlockAchievements(current.id, updated);
      applyAchievementBonus(updated, unlocked);
      if (unlocked.length > 0) {
        setNewAchievements(prev => [...prev, ...unlocked]);
        for (const ach of unlocked) {
          enqueueCelebration({ kind: 'achievement', achievement: ach });
          await saveActivity(current.id, 'achievement', `Conquistou "${ach.name}"! ${ach.emoji}`, ach.emoji, ach.xp_reward ?? 0);
        }
      }
    } catch (e) { console.warn('[doCheckin] checagem de conquistas falhou:', e.message); }

    return result;
  }, []);

  // ─── Completar treino ────────────────────────────────────────────────────
  const completeWorkout = useCallback(async (workout, durationSeconds = 0) => {
    const current = userRef.current;
    if (!current) return;

    // ── Update otimista imediato (UI atualiza antes das chamadas de rede) ──
    const newBossKills = (current.boss_kills_this_week ?? 0) + 1;
    const optimisticXP = (current.xp ?? 0) + workout.xp;
    const { level: optimisticLevel, nextLevelXp: optimisticNextXP } = recalcLevel(optimisticXP);
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
    // total_boss_kills é calculado uma única vez aqui e usado tanto na gravação
    // quanto no objeto local — antes era calculado só dentro do updateUser() e
    // nunca entrava no `updated` local, então o Caçador (que depende desse
    // valor) só via o número certo depois de reabrir o app.
    const newTotalBossKills = newBossKills >= 5
      ? (current.total_boss_kills ?? 0) + 1
      : (current.total_boss_kills ?? 0);
    try {
      const fields = await processWorkout(current.id, current, workout.xp);
      await saveWorkoutCompletion(current.id, workout, durationSeconds);
      try {
        const { registerChallengeCheckin } = require('../services/socialService');
        await registerChallengeCheckin(current.id);
      } catch (e) { console.warn('[completeWorkout] registro de desafio social falhou:', e.message); }
      const bonusGems = leagueUpBonus(current.league, fields.xp);
      const gemsFields = bonusGems > 0 ? { gems: (current.gems ?? 0) + bonusGems } : {};
      await updateUser(current.id, {
        boss_kills_this_week: newBossKills,
        total_boss_kills: newTotalBossKills,
        ...gemsFields,
      });
      const updated = normalizeUser({ ...current, ...fields, ...gemsFields, boss_kills_this_week: newBossKills, total_boss_kills: newTotalBossKills });
      userRef.current = updated;
      setUser(updated);
    } catch (e) {
      console.warn('[completeWorkout] Falha de rede — XP mantido localmente:', e.message);
      // Não faz rollback: usuário completou o treino e mantém o XP
      // Na próxima abertura do app o servidor sincroniza — mas o boss kill
      // local ainda precisa refletir aqui, senão o Caçador nunca dispara hoje
      if (userRef.current) {
        const withBossKills = normalizeUser({ ...userRef.current, total_boss_kills: newTotalBossKills });
        userRef.current = withBossKills;
        setUser(withBossKills);
      }
    }

    // Salva atividade do treino (separado da checagem de conquistas abaixo —
    // se essa gravação falhar, não pode derrubar a checagem de conquistas junto,
    // que antes ficava presa no mesmo try/catch e nunca rodava nesse caso)
    try {
      await saveActivity(current.id, 'workout', `Completou ${workout.name}`, workout.emoji, workout.xp);
    } catch (e) { console.warn('[completeWorkout] salvar atividade falhou:', e.message); }

    try {
      let latestUser = userRef.current ?? optimistic;
      const unlocked = await checkAndUnlockAchievements(current.id, latestUser);
      latestUser = applyAchievementBonus(latestUser, unlocked);
      if (unlocked.length > 0) {
        setNewAchievements(prev => [...prev, ...unlocked]);
        for (const ach of unlocked) {
          enqueueCelebration({ kind: 'achievement', achievement: ach });
          await saveActivity(current.id, 'achievement', `Conquistou "${ach.name}"! ${ach.emoji}`, ach.emoji, ach.xp_reward ?? 0);
        }
      }

      // ── Conquistas manuais baseadas em contexto do treino ──────────────────
      // Madrugador: treino antes das 8h
      const hour = new Date().getHours();
      if (hour < 8) {
        const ach = await unlockManualAchievement(current.id, ACHIEVEMENT_IDS.MADRUGADOR, latestUser);
        if (ach) {
          latestUser = applyXPBonus(latestUser, ach.xp_reward ?? 0);
          setNewAchievements(prev => [...prev, ach]);
          enqueueCelebration({ kind: 'achievement', achievement: ach });
          await saveActivity(current.id, 'achievement', `Conquistou "${ach.name}"! ${ach.emoji}`, ach.emoji, ach.xp_reward ?? 0);
        }
      }

      // Caçador: boss derrotado (5 treinos na semana = 1 boss kill)
      // Já é automático via checkAndUnlockAchievements com condition_type='boss_kills'
      // mas disparamos também aqui para garantir imediatamente
      if ((latestUser.total_boss_kills ?? 0) >= 1) {
        const cacador = await unlockManualAchievement(current.id, ACHIEVEMENT_IDS.CACADOR, latestUser).catch(e => { console.warn('[completeWorkout] conquista Caçador falhou:', e.message); return null; });
        if (cacador) {
          latestUser = applyXPBonus(latestUser, cacador.xp_reward ?? 0);
          setNewAchievements(prev => [...prev, cacador]);
          enqueueCelebration({ kind: 'achievement', achievement: cacador });
          await saveActivity(current.id, 'achievement', `Conquistou "${cacador.name}"! ${cacador.emoji}`, cacador.emoji, cacador.xp_reward ?? 0);
        }
      }
    } catch (e) { console.warn('[completeWorkout] checagem de conquistas falhou:', e.message); }

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

    const bonusGems = leagueUpBonus(current.league, fields.xp);
    if (bonusGems > 0) {
      fields.gems = (current.gems ?? 0) + bonusGems;
      try { await updateUser(current.id, { gems: fields.gems }); } catch (e) { console.warn('[completeChallenge] bônus de liga falhou:', e.message); }
    }

    const updated = normalizeUser({ ...current, ...fields });
    userRef.current = updated;
    setUser(updated);
    pushXPToast(fields.xp - current.xp, challenge.title ?? 'Desafio diário');

    setChallenges(prev => prev.map(c =>
      c.id === challengeId ? { ...c, completed: true } : c
    ));

    try {
      const unlocked = await checkAndUnlockAchievements(current.id, updated);
      applyAchievementBonus(updated, unlocked);
      if (unlocked.length > 0) {
        setNewAchievements(prev => [...prev, ...unlocked]);
        for (const ach of unlocked) {
          enqueueCelebration({ kind: 'achievement', achievement: ach });
          await saveActivity(current.id, 'achievement', `Conquistou "${ach.name}"! ${ach.emoji}`, ach.emoji, ach.xp_reward ?? 0);
        }
      }
    } catch (e) { console.warn('[completeChallenge] checagem de conquistas falhou:', e.message); }
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
    try { await updateUser(current.id, fields); } catch (e) { console.warn('[purchaseFreeze] persistência falhou, estado local mantido:', e.message); }
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
    try { await updateUser(current.id, { gems: newGems }); } catch (e) { console.warn('[addGems] persistência falhou, estado local mantido:', e.message); }
  }, []);

  // ─── Adiciona XP diretamente (bonus missões, chefe, etc.) ───────────────────
  const addXP = useCallback(async (amount, source = 'Bônus') => {
    const current = userRef.current;
    if (!current || amount <= 0) return;
    const newXP      = current.xp + amount;
    const newTodayXP = (current.today_xp ?? 0) + amount;
    const { level: newLevel, nextLevelXp: newNextXP } = recalcLevel(newXP);
    const bonusGems = leagueUpBonus(current.league, newXP);
    const fields = {
      xp: newXP, today_xp: newTodayXP, level: newLevel, next_level_xp: newNextXP,
      ...(bonusGems > 0 ? { gems: (current.gems ?? 0) + bonusGems } : {}),
    };
    const updated = normalizeUser({ ...current, ...fields });
    userRef.current = updated;
    setUser(updated);
    pushXPToast(amount, source);
    try { await updateUser(current.id, fields); } catch (e) { console.warn('[addXP] persistência falhou, estado local mantido:', e.message); }

    // Recalcula progresso de conquistas por XP — sem isso, bônus concedidos por
    // addXP (missões do dia, chefe da semana) deixavam o progresso salvo desatualizado
    // até o próximo check-in/treino/desafio.
    try {
      const unlocked = await checkAndUnlockAchievements(current.id, updated);
      applyAchievementBonus(updated, unlocked);
      if (unlocked.length > 0) {
        setNewAchievements(prev => [...prev, ...unlocked]);
        for (const ach of unlocked) {
          enqueueCelebration({ kind: 'achievement', achievement: ach });
          await saveActivity(current.id, 'achievement', `Conquistou "${ach.name}"! ${ach.emoji}`, ach.emoji, ach.xp_reward ?? 0);
        }
      }
    } catch (e) { console.warn('[addXP] checagem de conquistas falhou:', e.message); }
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

  // ─── Reflete um recorde pessoal salvo no banco também no estado local ────
  // (o WorkoutDetailScreen já grava no Supabase via savePersonalRecord — isso
  // só evita esperar o próximo reload para o badge "último: Xkg" e a lista de
  // recordes do Perfil aparecerem atualizados).
  const applyPersonalRecord = useCallback((exerciseName, kg) => {
    const current = userRef.current;
    if (!current) return;
    const updated = normalizeUser({
      ...current,
      personal_records: { ...(current.personalRecords ?? {}), [exerciseName]: kg },
    });
    userRef.current = updated;
    setUser(updated);
  }, []);

  // ─── Atualiza meta/objetivo (sem tocar em XP, streak, conquistas ou histórico) ──
  const updateGoals = useCallback(async (goalAnswers) => {
    const current = userRef.current;
    if (!current) return;

    const goalMap = { lose: 'emagrecer', gain: 'engordar', maintain: 'manter' };
    const fields = {
      goal_type:        goalMap[goalAnswers.goal] ?? current.goal_type,
      target_weight:    Number(goalAnswers.targetWeight) || current.target_weight,
      start_weight:     current.current_weight, // nova meta = nova linha de base para o progresso
      weekly_frequency: Number(goalAnswers.freq) || current.weekly_frequency,
      planned_days:     goalAnswers.workoutDays ?? current.planned_days,
      goals_updated_at: new Date().toISOString(),
    };

    const updated = normalizeUser(await updateUser(current.id, fields));
    userRef.current = updated;
    setUser(updated);
    return updated;
  }, []);

  // ─── Sai da conta (logout explícito) ─────────────────────────────────────
  // Diferente do boot normal: marca uma flag persistida para NÃO logar anônimo
  // de novo sozinho — o usuário decide na tela seguinte se quer entrar ou criar conta.
  const doSignOut = useCallback(async () => {
    try { await supabase.auth.signOut(); } catch (e) { console.warn('[doSignOut] falha ao encerrar sessão:', e.message); }
    userRef.current = null;
    setUser(null);
    setOnboardingDone(false);
    setChallenges(mockChallenges);
    setAlerts([]);
    setNewAchievements([]);
    setAvatarPhoto(null); // a foto é isolada por conta — não deve aparecer na tela de login/próxima conta
    setLoggedOut(true);
    try { await AsyncStorage.setItem(LOGGED_OUT_KEY, '1'); } catch (e) { console.warn('[doSignOut] falha ao salvar flag local:', e.message); }
  }, []);

  // ─── Login com email + senha (conta já existente) ────────────────────────
  const loginWithEmail = useCallback(async (email, password) => {
    const authUser = await signInWithEmail(email, password); // lança erro se credenciais inválidas
    const dbUser = normalizeUser(await getOrCreateUser(authUser.id));
    userRef.current = dbUser;
    setUser(dbUser);
    setOnboardingDone(dbUser.onboarding_done ?? false);
    setLoggedOut(false);
    try { await AsyncStorage.removeItem(LOGGED_OUT_KEY); } catch (e) { console.warn('[loginWithEmail] falha ao limpar flag local:', e.message); }
    setAvatarPhoto(null);
    AsyncStorage.getItem(avatarKeyFor(dbUser.id)).then(uri => { if (uri) setAvatarPhoto(uri); }).catch(e => console.warn('[loginWithEmail] avatar cache falhou:', e.message));
    loadChallenges(dbUser.id).catch(e => console.warn('[loginWithEmail] falha ao carregar desafios:', e.message));
    runForegroundChecks(dbUser).catch(e => console.warn('[loginWithEmail] checagens falharam:', e.message));
    return dbUser;
  }, []);

  // ─── Cria uma conta nova (anônima) e manda para o onboarding ─────────────
  const startNewAccount = useCallback(async () => {
    const anonUser = await signInAnonymous();
    const dbUser = normalizeUser(await getOrCreateUser(anonUser.id));
    userRef.current = dbUser;
    setUser(dbUser);
    setOnboardingDone(false);
    setLoggedOut(false);
    setAvatarPhoto(null); // conta nova começa sem foto — nunca herda a da conta anterior
    try { await AsyncStorage.removeItem(LOGGED_OUT_KEY); } catch (e) { console.warn('[startNewAccount] falha ao limpar flag local:', e.message); }
    return dbUser;
  }, []);

  // ─── Solicita permissão de notificações push e registra o dispositivo ───
  const enableNotifications = useCallback(async () => {
    const current = userRef.current;
    const token = await registerForPushNotifications(current?.id);
    const enabled = !!token;
    setNotificationsEnabled(enabled);
    try { await AsyncStorage.setItem(NOTIFICATIONS_KEY, enabled ? '1' : '0'); } catch (e) { console.warn('[enableNotifications] falha ao salvar preferência:', e.message); }
    return enabled;
  }, []);

  // ─── Atualiza foto de perfil (local + Supabase Storage, visível pra todo mundo) ──
  const updateAvatarPhoto = useCallback(async (uri) => {
    const current = userRef.current;
    if (!current) return;

    // 1. Feedback instantâneo + cache local (mesma foto ao reabrir o app offline)
    setAvatarPhoto(uri);
    const key = avatarKeyFor(current.id);
    if (uri) AsyncStorage.setItem(key, uri).catch(e => console.warn('[updateAvatarPhoto] cache local falhou:', e.message));
    else     AsyncStorage.removeItem(key).catch(e => console.warn('[updateAvatarPhoto] limpeza de cache falhou:', e.message));

    // 2. Envia pro Supabase Storage — sem isso a foto nunca sai do aparelho de quem tirou
    // Lê como base64 + converte pra ArrayBuffer: o Blob do fetch() não é confiável em
    // React Native (uploads silenciosos de 0 bytes em alguns Android), esse é o caminho
    // recomendado pela própria Supabase para Expo.
    try {
      if (uri) {
        const FileSystem = require('expo-file-system/legacy');
        const { decode }  = require('base64-arraybuffer');
        const ext      = (uri.split('.').pop() || 'jpg').split('?')[0].toLowerCase();
        const path     = `${current.auth_id}/avatar.${ext}`;
        const base64   = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, decode(base64), { upsert: true, contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}` });
        if (uploadError) throw uploadError;

        const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
        // Cache-bust — mesmo path, foto nova: sem isso outros telas mantêm a versão antiga em cache
        const publicUrl = `${pub.publicUrl}?v=${Date.now()}`;
        const updatedUser = normalizeUser(await updateUser(current.id, { avatar_url: publicUrl }));
        userRef.current = updatedUser;
        setUser(updatedUser);
      } else {
        const updatedUser = normalizeUser(await updateUser(current.id, { avatar_url: null }));
        userRef.current = updatedUser;
        setUser(updatedUser);
      }
    } catch (e) {
      console.warn('[updateAvatarPhoto] upload remoto falhou — foto só ficará visível neste aparelho:', e.message);
    }
  }, []);

  // ─── Ativa assinatura Premium (chamado após confirmação de compra na loja) ──
  const activatePremium = useCallback(async (plan) => {
    const current = userRef.current;
    if (!current) return;
    const fields = { is_premium: true, premium_plan: plan, premium_since: new Date().toISOString() };
    const updated = normalizeUser(await updateUser(current.id, fields));
    userRef.current = updated;
    setUser(updated);
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
      applyPersonalRecord,
      updateGoals,
      avatarPhoto,
      updateAvatarPhoto,
      setForegroundChecksPaused,
      loggedOut,
      doSignOut,
      loginWithEmail,
      startNewAccount,
      notificationsEnabled,
      enableNotifications,
      isPremium: user?.isPremium ?? false,
      activatePremium,
      xpToast,
      clearXpToast,
      celebrationQueue,
      advanceCelebration,
      celebrationsPaused,
      setCelebrationsPaused,
    }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
