import { Share } from 'react-native';
import * as Linking from 'expo-linking';
import { supabase } from './supabase';
import { toDateString, getMondayOf } from './userService';

const APP_SCHEME = 'capifit';
const APP_STORE_URL = 'https://capifit.app'; // atualizar quando publicar

// ═══════════════════════════════════════════════════════════════════════════
// DEEP LINKS
// ═══════════════════════════════════════════════════════════════════════════

export function buildDeepLink(path, params = {}) {
  return Linking.createURL(path, { queryParams: params });
}

export function buildInviteLink(userCode) {
  return buildDeepLink('adicionar', { code: userCode });
}

export function buildSquadInviteLink(squadId, inviteCode) {
  return buildDeepLink('entrar-squad', { squad: squadId, code: inviteCode });
}

export function parseDeepLink(url) {
  return Linking.parse(url);
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPARTILHAMENTO
// ═══════════════════════════════════════════════════════════════════════════

export async function shareExternal(message, url = APP_STORE_URL) {
  try {
    await Share.share({ message: `${message}\n\n${url}` });
    return true;
  } catch (_) { return false; }
}

export function buildShareText(user, type, detail) {
  const texts = {
    workout:     `💪 Acabei de completar um treino no CapiFit!\n${detail}\n🔥 Sequência: ${user.streak} dias | ⚡ ${user.xp} XP`,
    achievement: `🏆 Conquistei "${detail}" no CapiFit!\n🔥 Sequência: ${user.streak} dias | ⚡ ${user.xp} XP`,
    record:      `🏋️ Novo recorde pessoal: ${detail}\nCapiFit me ajudou a chegar aqui! 💪`,
    streak:      `🔥 ${user.streak} dias seguidos no CapiFit! Bate esse aí 😤`,
    checkin:     `✅ Check-in feito na academia! Sequência de ${user.streak} dias no CapiFit 💪`,
    default:     `🔥 Estou no CapiFit! Sequência: ${user.streak} dias | XP: ${user.xp}`,
  };
  return `${texts[type] ?? texts.default}\n\n👇 Baixe grátis:`;
}

// ═══════════════════════════════════════════════════════════════════════════
// AMIGOS
// ═══════════════════════════════════════════════════════════════════════════

// Busca usuários por nome ou código
export async function searchUsers(query, currentUserId) {
  const isCode = /^[A-Z0-9]{6}$/.test(query.toUpperCase());

  const { data, error } = await supabase
    .from('users')
    .select('id, name, xp, streak_count, league, league_emoji, user_code, onboarding_done')
    .eq('onboarding_done', true)
    .neq('id', currentUserId)
    .or(isCode
      ? `user_code.eq.${query.toUpperCase()}`
      : `name.ilike.%${query}%`)
    .limit(10);

  if (error) throw error;
  return data ?? [];
}

// Envia pedido de amizade
export async function sendFriendRequest(fromUserId, toUserId) {
  const { data: existing } = await supabase
    .from('friendships')
    .select('id, status')
    .or(`and(user_id.eq.${fromUserId},friend_id.eq.${toUserId}),and(user_id.eq.${toUserId},friend_id.eq.${fromUserId})`)
    .single();

  if (existing) return { already: true, status: existing.status };

  const { data, error } = await supabase
    .from('friendships')
    .insert({ user_id: fromUserId, friend_id: toUserId, status: 'pending' })
    .select()
    .single();

  if (error) throw error;
  return { data, already: false };
}

// Aceita pedido de amizade
export async function acceptFriendRequest(friendshipId) {
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', friendshipId);
  if (error) throw error;
}

// Recusa pedido de amizade
export async function declineFriendRequest(friendshipId) {
  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('id', friendshipId);
  if (error) throw error;
}

// Pedidos pendentes que EU recebi
export async function getPendingRequests(userId) {
  const { data, error } = await supabase
    .from('friendships')
    .select('id, user_id, users!friendships_user_id_fkey(id, name, xp, streak_count, user_code)')
    .eq('friend_id', userId)
    .eq('status', 'pending');
  if (error) throw error;
  return data ?? [];
}

// Lista de amigos aceitos
export async function getFriends(userId) {
  const { data: sent } = await supabase
    .from('friendships')
    .select('friend_id, users!friendships_friend_id_fkey(id, name, xp, streak_count, league, league_emoji, user_code)')
    .eq('user_id', userId)
    .eq('status', 'accepted');

  const { data: received } = await supabase
    .from('friendships')
    .select('user_id, users!friendships_user_id_fkey(id, name, xp, streak_count, league, league_emoji, user_code)')
    .eq('friend_id', userId)
    .eq('status', 'accepted');

  const friends = [
    ...(sent ?? []).map(r => r.users),
    ...(received ?? []).map(r => r.users),
  ].filter(Boolean);

  return friends;
}

// Adicionar amigo por código (user_code)
export async function addFriendByCode(myUserId, code) {
  const { data: target, error } = await supabase
    .from('users')
    .select('id, name, user_code')
    .eq('user_code', code.toUpperCase())
    .single();

  if (error || !target) throw new Error('Código não encontrado');
  if (target.id === myUserId) throw new Error('Este é o seu próprio código!');

  return sendFriendRequest(myUserId, target.id);
}

// ═══════════════════════════════════════════════════════════════════════════
// CLÃS / SQUADS
// ═══════════════════════════════════════════════════════════════════════════

export async function createSquad(creatorId, config) {
  const {
    name, emoji = '🛡️', mode = 'friends', isDuo = false,
    durationDays = 30, minWeeklyCheckins = 3, maxMembers = 4,
  } = config;

  const startDate = toDateString();
  const endDate   = toDateString(new Date(Date.now() + durationDays * 86400000));

  const { data: squad, error } = await supabase
    .from('squads')
    .insert({
      name, emoji, created_by: creatorId, mode,
      is_duo: isDuo, duration_days: durationDays,
      min_weekly_checkins: minWeeklyCheckins,
      max_members: isDuo ? 2 : maxMembers,
      start_date: startDate, end_date: endDate,
      status: 'waiting',
    })
    .select()
    .single();

  if (error) throw error;

  // Criador entra automaticamente
  await supabase.from('squad_members').insert({
    squad_id: squad.id, user_id: creatorId, role: 'admin',
  });

  return squad;
}

export async function joinSquadByCode(userId, inviteCode) {
  const { data: squad, error } = await supabase
    .from('squads')
    .select('id, max_members, status')
    .eq('invite_code', inviteCode.toUpperCase())
    .single();

  if (error || !squad) throw new Error('Código do squad não encontrado');
  if (squad.status === 'completed') throw new Error('Este squad já foi encerrado');

  const { count } = await supabase
    .from('squad_members')
    .select('*', { count: 'exact', head: true })
    .eq('squad_id', squad.id);

  if (count >= squad.max_members) throw new Error('Squad já está cheio!');

  const { error: joinError } = await supabase
    .from('squad_members')
    .upsert({ squad_id: squad.id, user_id: userId, role: 'member' },
      { onConflict: 'squad_id,user_id', ignoreDuplicates: true });

  if (joinError) throw joinError;
  return squad;
}

// Squads do usuário (com membros) — com fallback se migration 008 ainda não aplicada
export async function getUserSquads(userId) {
  const { data: full, error: fullErr } = await supabase
    .from('squad_members')
    .select('squad_id, role, challenge_streak, squads(*, squad_members(id, user_id, role, checked_in_today, challenge_streak, challenge_week_checkins, challenge_week_start, last_challenge_checkin, users(name, xp, streak_count)))')
    .eq('user_id', userId);

  if (!fullErr && full) return full.map(m => m.squads).filter(Boolean);

  const { data: basic } = await supabase
    .from('squad_members')
    .select('squad_id, role, squads(*, squad_members(id, user_id, role, checked_in_today, users(name, xp, streak_count)))')
    .eq('user_id', userId);

  return (basic ?? []).map(m => m.squads).filter(Boolean);
}

// Registro de check-in no squad
export async function registerSquadCheckin(userId) {
  const today   = toDateString();
  const monday  = toDateString(getMondayOf());

  // Marca todos os squads do usuário como check-in hoje
  const { data: memberships } = await supabase
    .from('squad_members')
    .select('squad_id, squads(mode, min_weekly_checkins)')
    .eq('user_id', userId);

  for (const m of memberships ?? []) {
    await supabase.from('squad_members')
      .update({ checked_in_today: true })
      .eq('squad_id', m.squad_id)
      .eq('user_id', userId);

    // Atualiza pontuação semanal (modo batalha)
    if (m.squads?.mode === 'battle') {
      await supabase.from('squad_weekly_scores')
        .upsert({
          squad_id:   m.squad_id,
          user_id:    userId,
          week_start: monday,
          checkins:   1,
          points:     10,
        }, {
          onConflict: 'squad_id,user_id,week_start',
          ignoreDuplicates: false,
        });

      await supabase.rpc('increment_squad_score', {
        p_squad_id:   m.squad_id,
        p_user_id:    userId,
        p_week_start: monday,
      }).catch(() => {
        // fallback manual
        supabase.from('squad_weekly_scores')
          .update({ checkins: supabase.sql`checkins + 1`, points: supabase.sql`points + 10` })
          .eq('squad_id', m.squad_id)
          .eq('user_id', userId)
          .eq('week_start', monday);
      });
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DUELOS (rivalries)
// ═══════════════════════════════════════════════════════════════════════════

export async function createDuel(challengerId, rivalId, config = {}) {
  const {
    name = 'Duelo Semanal',
    type = 'weekly', // 'weekly' | 'monthly'
    durationDays = 7,
  } = config;

  const endDate = toDateString(new Date(Date.now() + durationDays * 86400000));

  const { data, error } = await supabase
    .from('rivalries')
    .insert({
      challenger_id: challengerId,
      rival_id:      rivalId,
      name,
      rivalry_type:  type,
      start_date:    toDateString(),
      end_date:      endDate,
      status:        'active',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getUserDuels(userId) {
  const { data } = await supabase
    .from('rivalries')
    .select('*, challenger:users!rivalries_challenger_id_fkey(id,name,xp,streak_count), rival:users!rivalries_rival_id_fkey(id,name,xp,streak_count)')
    .or(`challenger_id.eq.${userId},rival_id.eq.${userId}`)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  return (data ?? []).map(d => ({
    ...d,
    isChallenger: d.challenger_id === userId,
    myScore:     d.challenger_id === userId ? d.challenger_score : d.rival_score,
    theirScore:  d.challenger_id === userId ? d.rival_score : d.challenger_score,
    opponent:    d.challenger_id === userId ? d.rival : d.challenger,
  }));
}

export async function updateDuelScore(duelId, challengerId, rivalId, checkerUserId) {
  const field = checkerUserId === challengerId ? 'challenger_score' : 'rival_score';
  await supabase.from('rivalries')
    .update({ [field]: supabase.sql`${field} + 1` })
    .eq('id', duelId);
}

// ═══════════════════════════════════════════════════════════════════════════
// DESAFIOS DE GRUPO / DUPLA — ESTADOS waiting / active / completed
// ═══════════════════════════════════════════════════════════════════════════

export async function startChallenge(squadId) {
  const { error } = await supabase.from('squads')
    .update({ status: 'active', result: null, group_streak: 0, started_at: new Date().toISOString() })
    .eq('id', squadId);
  if (error) throw error;
  await supabase.from('squad_members')
    .update({ challenge_streak: 0, challenge_week_checkins: 0, challenge_week_start: toDateString(getMondayOf()), last_challenge_checkin: null })
    .eq('squad_id', squadId);
}

export async function deleteSquad(squadId) {
  await supabase.from('squad_members').delete().eq('squad_id', squadId);
  const { error } = await supabase.from('squads').delete().eq('id', squadId);
  if (error) throw error;
}

export async function finalizeSquad(squadId, result, winnerUserId = null) {
  await supabase.from('squads').update({ status: 'completed', result }).eq('id', squadId);

  // Desbloqueia conquistas para os vencedores
  if (!winnerUserId) return;
  try {
    const { unlockManualAchievement, ACHIEVEMENT_IDS, saveActivity } = require('./achievementService');
    const { data: squad } = await supabase.from('squads').select('is_duo').eq('id', squadId).single();
    const achievId = squad?.is_duo ? ACHIEVEMENT_IDS.CAMPEAO_DUELO : ACHIEVEMENT_IDS.GUERREIRO_CLA;
    const { data: user } = await supabase.from('users').select('xp, coins').eq('id', winnerUserId).single();
    const ach = await unlockManualAchievement(winnerUserId, achievId, user ?? {});
    if (ach) await saveActivity(winnerUserId, 'achievement', `Conquistou "${ach.name}"! ${ach.emoji}`, ach.emoji, ach.xp_reward ?? 0);
  } catch (_) {}
}

export async function getSquadsWithHistory(userId) {
  // Tenta com colunas novas (migration 008). Se falhar, usa fallback sem elas.
  const { data: full, error: fullErr } = await supabase
    .from('squad_members')
    .select('squad_id, role, challenge_streak, squads(*, squad_members(id, user_id, role, checked_in_today, challenge_streak, challenge_week_checkins, challenge_week_start, last_challenge_checkin, users(name, xp, streak_count)))')
    .eq('user_id', userId);

  if (!fullErr && full) {
    return full.map(m => ({ ...m.squads, myStreak: m.challenge_streak ?? 0, myRole: m.role })).filter(Boolean);
  }

  const { data: basic } = await supabase
    .from('squad_members')
    .select('squad_id, role, squads(*, squad_members(id, user_id, role, checked_in_today, users(name, xp, streak_count)))')
    .eq('user_id', userId);

  return (basic ?? []).map(m => ({ ...m.squads, myStreak: 0, myRole: m.role })).filter(Boolean);
}

export async function registerChallengeCheckin(userId) {
  const today = toDateString();
  const monday = toDateString(getMondayOf());
  const { data: memberships } = await supabase
    .from('squad_members')
    .select('id, squad_id, challenge_streak, last_challenge_checkin, challenge_week_checkins, challenge_week_start, squads(status, mode, min_weekly_checkins, group_streak, squad_members(user_id, last_challenge_checkin))')
    .eq('user_id', userId);
  for (const m of memberships ?? []) {
    const squad = m.squads;
    if (squad?.status !== 'active') continue;
    if (m.last_challenge_checkin === today) continue;
    const isNewWeek = m.challenge_week_start !== monday;
    const weekCheckins = isNewWeek ? 1 : (m.challenge_week_checkins ?? 0) + 1;
    const newStreak = (m.challenge_streak ?? 0) + 1;
    await supabase.from('squad_members').update({
      challenge_streak: newStreak, last_challenge_checkin: today,
      challenge_week_checkins: weekCheckins, challenge_week_start: monday, checked_in_today: true,
    }).eq('id', m.id);
    if (squad.mode !== 'battle') {
      const allIn = squad.squad_members?.every(sm => sm.user_id === userId || sm.last_challenge_checkin === today);
      if (allIn) await supabase.from('squads').update({ group_streak: (squad.group_streak ?? 0) + 1 }).eq('id', m.squad_id);
    }
  }
}

export async function checkAndFinalizeSquads(userId) {
  const now = new Date();
  const monday = getMondayOf();
  // Se migration 008 não aplicada, essa função simplesmente não faz nada
  const { data: memberships, error } = await supabase
    .from('squad_members')
    .select('squad_id, challenge_week_checkins, challenge_week_start, squads(id, status, mode, is_duo, min_weekly_checkins, end_date, started_at, result, group_streak, squad_members(user_id, challenge_streak, challenge_week_checkins, challenge_week_start, users(name)))')
    .eq('user_id', userId);
  if (error) return; // colunas novas não existem ainda
  for (const m of memberships ?? []) {
    const s = m.squads;
    if (!s || s.status !== 'active' || s.result) continue;
    const endDate = s.end_date ? new Date(s.end_date) : null;
    const startedAt = s.started_at ? new Date(s.started_at) : null;
    if (!startedAt) continue;
    const members = s.squad_members ?? [];
    const weeksPassed = Math.max(1, Math.ceil((now - startedAt) / (7 * 86400000)));
    const totalGoal = (s.min_weekly_checkins ?? 3) * weeksPassed;
    const minWeekly  = s.min_weekly_checkins ?? 3;
    const isNewWeek  = startedAt && new Date(m.challenge_week_start ?? 0) < monday && m.challenge_week_start;

    // ── Verificação semanal — vale para AMBOS os modos ──────────────────────
    // Se virou semana e alguém não bateu a meta da semana anterior → encerra
    if (isNewWeek) {
      const failedMembers = members.filter(sm => (sm.challenge_week_checkins ?? 0) < minWeekly);
      const allFailed     = failedMembers.length >= members.length;

      if (failedMembers.length > 0) {
        if (s.mode === 'battle') {
          // Rival: quem falhou na semana perde; quem bateu ganha
          const winner = members.find(sm => (sm.challenge_week_checkins ?? 0) >= minWeekly);
          if (allFailed) {
            await finalizeSquad(s.id, 'all_lost');
          } else {
            await finalizeSquad(s.id, `champion:${winner.user_id}:${winner.users?.name ?? '?'}`, winner.user_id);
          }
        } else {
          // Juntos: qualquer falha encerra o grupo
          await finalizeSquad(s.id, 'lost');
        }
        continue;
      }
    }

    // ── Fim do período ───────────────────────────────────────────────────────
    if (endDate && now > endDate) {
      if (s.mode === 'battle') {
        const metGoal = members.filter(sm => (sm.challenge_streak ?? 0) >= totalGoal);
        if (metGoal.length === 0) {
          await finalizeSquad(s.id, 'all_lost');
        } else if (metGoal.length >= members.length) {
          // Todos venceram — desbloqueia para o usuário atual
          await finalizeSquad(s.id, 'all_won', userId);
        } else {
          const winner = members.reduce((a, b) => (a.challenge_streak ?? 0) >= (b.challenge_streak ?? 0) ? a : b);
          await finalizeSquad(s.id, `champion:${winner.user_id}:${winner.users?.name ?? '?'}`, winner.user_id);
        }
      } else {
        // Juntos: chegou ao fim sem falhar → todos venceram, desbloqueia para todos
        await finalizeSquad(s.id, 'won', userId);
      }
    }
  }
}
