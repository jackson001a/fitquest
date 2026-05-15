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

// Squads do usuário (com membros)
export async function getUserSquads(userId) {
  const { data: memberships } = await supabase
    .from('squad_members')
    .select('squad_id, role, squads(*, squad_members(user_id, role, checked_in_today, users(name, xp, streak_count)))')
    .eq('user_id', userId);

  return (memberships ?? []).map(m => m.squads).filter(Boolean);
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
