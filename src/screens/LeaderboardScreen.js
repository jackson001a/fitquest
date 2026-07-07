import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Image,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS } from '../theme';
import { useUser } from '../context/UserContext';
import { fetchLeaderboard } from '../services/achievementService';
import { supabase } from '../services/supabase';
import { shareExternal, buildShareText } from '../services/socialService';

function AvatarCircle({ photo, letter, size = 40, gradientColors = ['#8B5CF6','#6D28D9'], style }) {
  if (photo) {
    return <Image source={{ uri: photo }} style={[{ width: size, height: size, borderRadius: size / 2 }, style]} />;
  }
  return (
    <LinearGradient colors={gradientColors} style={[{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Text style={{ color: '#fff', fontSize: size * 0.4, fontWeight: '800' }}>{letter}</Text>
    </LinearGradient>
  );
}

const LEAGUE_CONFIG = {
  Diamante: { emoji: '💎', color: '#67E8F9', gradient: ['#0E7490', '#0C4A6E'] },
  Platina:  { emoji: '🔷', color: '#E2E8F0', gradient: ['#475569', '#1E293B'] },
  Ouro:     { emoji: '🥇', color: '#FFD700', gradient: ['#D97706', '#92400E'] },
  Prata:    { emoji: '🥈', color: '#C0C0C0', gradient: ['#64748B', '#334155'] },
  Bronze:   { emoji: '🥉', color: '#CD7F32', gradient: ['#92400E', '#451A03'] },
};

// ─── COPY HELPER ────────────────────────────────────────────────────────────
async function copyToClipboard(text, label = 'Código') {
  try {
    const Clipboard = require('expo-clipboard');
    await Clipboard.setStringAsync(text);
    Alert.alert('Copiado! 📋', `${label} "${text}" copiado.\nCompartilhe com seus amigos.`);
  } catch {
    Alert.alert(label, text);
  }
}

// ─── JOIN MODAL ──────────────────────────────────────────────────────────────
function JoinModal({ visible, title, subtitle, onJoin, onClose }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (code.trim().length < 6) return;
    setLoading(true);
    try {
      await onJoin(code.trim().toUpperCase());
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.joinCard}>
          <Text style={styles.joinTitle}>{title}</Text>
          <Text style={styles.joinSub}>{subtitle}</Text>
          <TextInput
            style={styles.joinInput}
            value={code}
            onChangeText={t => setCode(t.toUpperCase())}
            placeholder="EX: ABC123"
            placeholderTextColor={COLORS.grayDark}
            maxLength={6}
            autoCapitalize="characters"
            autoFocus
          />
          <View style={styles.joinBtnRow}>
            <TouchableOpacity style={styles.joinBtnCancel} onPress={() => { setCode(''); onClose(); }}>
              <Text style={styles.joinBtnCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.joinBtnConfirm, { opacity: code.length < 6 ? 0.4 : 1 }]}
              onPress={handleJoin}
              disabled={loading || code.length < 6}
            >
              <Text style={styles.joinBtnConfirmText}>{loading ? 'Entrando...' : 'Entrar'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Modo: 'friends' = Juntos (foguinho compartilhado) | 'battle' = Rival (foguinho individual)
const SQUAD_MODE = {
  friends: { label: '🤝 Juntos',  color: '#10B981', sharedFlame: true  },
  battle:  { label: '⚔️ Rival',   color: '#EF4444', sharedFlame: false },
};

function daysLeft(endDate) {
  if (!endDate) return null;
  return Math.max(0, Math.ceil((new Date(endDate) - new Date()) / 86400000));
}

function parseResult(result, currentUserId) {
  if (!result) return null;
  if (result === 'won')      return { type: 'won',        icon: '🏆', title: 'Missão cumprida!',         sub: 'Vocês venceram! Incrível! 🔥' };
  if (result === 'lost')     return { type: 'lost',       icon: '💀', title: 'Vocês perderam',            sub: 'A meta semanal não foi cumprida.' };
  if (result === 'all_won')  return { type: 'won',        icon: '🏆', title: 'Campeões!',                 sub: 'Os dois venceram! Que dupla! 🔥' };
  if (result === 'all_lost') return { type: 'lost',       icon: '💀', title: 'Os dois foram eliminados',  sub: 'Nenhum bateu a meta no período.' };
  if (result.startsWith('champion:')) {
    const parts = result.split(':');
    const winnerId = parts[1];
    const winnerName = parts[2] ?? 'Parceiro';
    const iAmWinner = winnerId === currentUserId;
    return iAmWinner
      ? { type: 'champion',  icon: '👑', title: 'Você foi o campeão!',       sub: 'Você bateu a meta. Parabéns! 🔥' }
      : { type: 'loser',     icon: '😤', title: `${winnerName} foi o campeão`, sub: 'Você não bateu a meta desta vez.' };
  }
  return null;
}

// ─── GROUP CARD ──────────────────────────────────────────────────────────────
function GroupCard({ squad, currentUser, avatarPhoto, onCopyCode, onStart, onDelete }) {
  const modeConf  = SQUAD_MODE[squad.mode] ?? SQUAD_MODE.friends;
  const isJuntos  = squad.mode !== 'battle';
  const members   = squad.members ?? [];
  const status    = squad.status ?? 'waiting';
  const result    = parseResult(squad.result, currentUser?.id);
  const dl        = daysLeft(squad.endDate);
  const canStart  = members.length >= 2 && status === 'waiting';
  const allIn     = members.every(m => m.checkedInToday);
  const missing   = members.filter(m => !m.checkedInToday).length;
  const sortedM   = isJuntos ? members : [...members].sort((a, b) => (b.challengeStreak ?? 0) - (a.challengeStreak ?? 0));

  return (
    <LinearGradient
      colors={status === 'completed'
        ? (result?.type === 'won' || result?.type === 'champion' ? ['#064E3B','#022C22','#0A0A18'] : ['#450A0A','#1A0000','#0A0A18'])
        : squad.gradient}
      style={[styles.groupCard, {
        borderColor: status === 'completed'
          ? (result?.type === 'won' || result?.type === 'champion' ? '#10B98140' : '#EF444440')
          : squad.color + '50'
      }]}
    >
      {/* Header sempre visível */}
      <View style={styles.gcHeader}>
        <Text style={styles.gcEmoji}>{squad.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.gcName} numberOfLines={1}>{squad.name}</Text>
          <View style={styles.gcRulesRow}>
            <Text style={styles.gcRule}>📅 {squad.daysPerWeek}×/sem</Text>
            <Text style={styles.gcRule}>👥 {members.length}/{squad.maxMembers ?? 4}</Text>
            {dl !== null && status === 'active' && <Text style={styles.gcRule}>⏰ {dl}d rest.</Text>}
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {status !== 'completed' && (
            <View style={[styles.gcModeBadge, { backgroundColor: modeConf.color + '20', borderColor: modeConf.color + '50' }]}>
              <Text style={[styles.gcModeText, { color: modeConf.color }]}>{modeConf.label}</Text>
            </View>
          )}
          <TouchableOpacity onPress={onDelete} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={16} color="rgba(255,255,255,0.3)" />
          </TouchableOpacity>
        </View>
      </View>

      {/* COMPLETED: resultado */}
      {status === 'completed' && result && (
        <View style={styles.gcResultBlock}>
          <Text style={styles.gcResultIcon}>{result.icon}</Text>
          <Text style={[styles.gcResultTitle, { color: (result.type === 'won' || result.type === 'champion') ? '#10B981' : '#EF4444' }]}>
            {result.title}
          </Text>
          <Text style={styles.gcResultSub}>{result.sub}</Text>
          {isJuntos ? (
            <View style={styles.gcResultFlame}>
              <Text style={styles.gcResultFlameEmoji}>🔥</Text>
              <Text style={styles.gcResultFlameNum}>{squad.groupStreak}</Text>
              <Text style={styles.gcResultFlameSub}>dias juntos</Text>
            </View>
          ) : (
            <View style={styles.gcRivalList}>
              {sortedM.map((m, i) => (
                <View key={i} style={[styles.gcRivalRow, m.isUser && styles.gcRivalRowMe]}>
                  <Text style={[styles.gcRivalPos, { color: i === 0 ? '#FFD700' : COLORS.gray }]}>#{i + 1}</Text>
                  <View style={[styles.gcRivalRing, { borderColor: i === 0 ? '#FFD700' : COLORS.grayDark }]}>
                    {m.isUser && avatarPhoto
                      ? <Image source={{ uri: avatarPhoto }} style={styles.gcRivalAvatar} />
                      : <LinearGradient colors={m.isUser ? ['#8B5CF6','#6D28D9'] : ['#1E1B3A','#2A2A4A']} style={styles.gcRivalAvatar}>
                          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>{m.avatar}</Text>
                        </LinearGradient>}
                  </View>
                  <Text style={[styles.gcRivalName, m.isUser && { color: COLORS.purpleLight }]} numberOfLines={1}>
                    {m.isUser ? 'Você' : m.name.split(' ')[0]}
                  </Text>
                  <View style={styles.gcRivalFlame}>
                    <Text>🔥</Text>
                    <Text style={styles.gcRivalFlameNum}>{m.challengeStreak ?? 0}</Text>
                    <Text style={styles.gcRivalFlameSub}>dias</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* WAITING: aguardando / pronto para iniciar */}
      {status === 'waiting' && (
        <>
          {members.length < 2 ? (
            <View style={styles.gcWaitBlock}>
              <Text style={styles.gcWaitEmoji}>⏳</Text>
              <Text style={styles.gcWaitTitle}>Aguardando membros</Text>
              <Text style={styles.gcWaitSub}>O desafio só inicia quando houver ao menos 2 participantes</Text>
            </View>
          ) : (
            <View style={styles.gcWaitBlock}>
              <Text style={styles.gcWaitEmoji}>✅</Text>
              <Text style={styles.gcWaitTitle}>Todos prontos!</Text>
              <Text style={styles.gcWaitSub}>Pressione "Iniciar Desafio" para começar a contar os streaks</Text>
            </View>
          )}
          <View style={styles.groupMembersRow}>
            {members.map((m, i) => (
              <View key={i} style={styles.groupMemberItem}>
                <View style={[styles.groupMemberRing, { borderColor: COLORS.purple }]}>
                  {m.isUser && avatarPhoto
                    ? <Image source={{ uri: avatarPhoto }} style={styles.groupMemberAvatar} />
                    : <LinearGradient colors={m.isUser ? ['#8B5CF6','#6D28D9'] : ['#1E1B3A','#2A2A4A']} style={styles.groupMemberAvatar}>
                        <Text style={styles.groupMemberText}>{m.avatar}</Text>
                      </LinearGradient>}
                </View>
                <Text style={styles.groupMemberName} numberOfLines={1}>{m.isUser ? 'Você' : m.name.split(' ')[0]}</Text>
                <Ionicons name="checkmark-circle" size={12} color={COLORS.purple} />
              </View>
            ))}
            {members.length < (squad.maxMembers ?? 4) && (
              <View style={styles.groupMemberItem}>
                <View style={[styles.groupMemberRing, { borderColor: 'rgba(255,255,255,0.15)' }]}>
                  <View style={[styles.groupMemberAvatar, { backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center' }]}>
                    <Ionicons name="add" size={20} color="rgba(255,255,255,0.25)" />
                  </View>
                </View>
                <Text style={[styles.groupMemberName, { color: 'rgba(255,255,255,0.3)' }]}>Convidar</Text>
              </View>
            )}
          </View>
          {canStart && (
            <TouchableOpacity style={styles.gcStartBtn} onPress={onStart} activeOpacity={0.85}>
              <LinearGradient colors={['#10B981','#047857']} style={styles.gcStartBtnInner}>
                <Ionicons name="play-circle" size={18} color="#fff" />
                <Text style={styles.gcStartBtnText}>Iniciar Desafio</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
          {squad.inviteCode && (
            <TouchableOpacity style={styles.groupCodeRow} onPress={() => onCopyCode?.(squad.inviteCode)} activeOpacity={0.7}>
              <Text style={styles.groupCodeLabel}>Código para convidar:</Text>
              <View style={styles.groupCodePill}>
                <Text style={[styles.groupCodeText, { color: modeConf.color }]}>{squad.inviteCode}</Text>
                <Ionicons name="copy-outline" size={13} color={modeConf.color} />
              </View>
            </TouchableOpacity>
          )}
        </>
      )}

      {/* ACTIVE: desafio em andamento */}
      {status === 'active' && (
        <>
          {isJuntos && (
            <View style={styles.gcSharedFlame}>
              <Text style={styles.gcFlameIcon}>🔥</Text>
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.gcFlameNum}>{squad.groupStreak}</Text>
                <Text style={styles.gcFlameSub}>dias juntos</Text>
              </View>
              <Text style={styles.gcFlameIcon}>🔥</Text>
            </View>
          )}
          {isJuntos ? (
            <View style={styles.groupMembersRow}>
              {members.map((m, i) => (
                <View key={i} style={styles.groupMemberItem}>
                  <View style={[styles.groupMemberRing, { borderColor: m.checkedInToday ? '#10B981' : '#F59E0B' }]}>
                    {m.isUser && avatarPhoto
                      ? <Image source={{ uri: avatarPhoto }} style={styles.groupMemberAvatar} />
                      : <LinearGradient colors={m.isUser ? ['#8B5CF6','#6D28D9'] : m.checkedInToday ? ['#047857','#065F46'] : ['#1E1B3A','#12122A']} style={styles.groupMemberAvatar}>
                          <Text style={styles.groupMemberText}>{m.avatar}</Text>
                        </LinearGradient>}
                  </View>
                  <Text style={styles.groupMemberName} numberOfLines={1}>{m.isUser ? 'Você' : m.name.split(' ')[0]}</Text>
                  {m.checkedInToday
                    ? <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                    : <Ionicons name="time-outline" size={12} color="#F59E0B" />}
                </View>
              ))}
              {members.length < (squad.maxMembers ?? 4) && (
                <View style={styles.groupMemberItem}>
                  <View style={[styles.groupMemberRing, { borderColor: 'rgba(255,255,255,0.15)' }]}>
                    <View style={[styles.groupMemberAvatar, { backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center' }]}>
                      <Ionicons name="add" size={20} color="rgba(255,255,255,0.25)" />
                    </View>
                  </View>
                  <Text style={[styles.groupMemberName, { color: 'rgba(255,255,255,0.3)' }]}>Convidar</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.gcRivalList}>
              {sortedM.map((m, i) => (
                <View key={i} style={[styles.gcRivalRow, m.isUser && styles.gcRivalRowMe]}>
                  <Text style={[styles.gcRivalPos, { color: i === 0 ? '#FFD700' : COLORS.gray }]}>#{i + 1}</Text>
                  <View style={[styles.gcRivalRing, { borderColor: m.checkedInToday ? '#10B981' : '#F59E0B' }]}>
                    {m.isUser && avatarPhoto
                      ? <Image source={{ uri: avatarPhoto }} style={styles.gcRivalAvatar} />
                      : <LinearGradient colors={m.isUser ? ['#8B5CF6','#6D28D9'] : ['#1E1B3A','#2A2A4A']} style={styles.gcRivalAvatar}>
                          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>{m.avatar}</Text>
                        </LinearGradient>}
                  </View>
                  <Text style={[styles.gcRivalName, m.isUser && { color: COLORS.purpleLight }]} numberOfLines={1}>
                    {m.isUser ? 'Você' : m.name.split(' ')[0]}
                  </Text>
                  <View style={styles.gcRivalFlame}>
                    <Text>🔥</Text>
                    <Text style={styles.gcRivalFlameNum}>{m.challengeStreak ?? 0}</Text>
                    <Text style={styles.gcRivalFlameSub}>dias</Text>
                  </View>
                  {m.checkedInToday
                    ? <View style={styles.gcDoneTag}><Text style={styles.gcDoneText}>✓ treinou</Text></View>
                    : <View style={styles.gcPendTag}><Text style={styles.gcPendText}>pendente</Text></View>}
                </View>
              ))}
            </View>
          )}
          {isJuntos && (
            <LinearGradient
              colors={allIn ? ['#10B98120','#10B98108'] : ['#F59E0B20','#F59E0B08']}
              style={[styles.groupStatusBar, { borderColor: allIn ? '#10B98140' : '#F59E0B40' }]}
            >
              <Text style={[styles.groupStatusText, { color: allIn ? '#10B981' : '#F59E0B' }]}>
                {allIn
                  ? `🔥 Todos treinaram! Foguinho de ${squad.groupStreak} dias mantido!`
                  : `⚡ ${missing} membro${missing > 1 ? 's' : ''} faltando — treine hoje para não zerar!`}
              </Text>
            </LinearGradient>
          )}
        </>
      )}
    </LinearGradient>
  );
}

function GruposView() {
  const navigation = useNavigation();
  const { user: currentUser, avatarPhoto } = useUser();
  const [squads,    setSquads]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [joinModal, setJoinModal] = useState(false);

  const load = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const { getSquadsWithHistory, checkAndFinalizeSquads } = require('../services/socialService');
      await checkAndFinalizeSquads(currentUser.id).catch(() => {});
      const data = await getSquadsWithHistory(currentUser.id);
      setSquads((data ?? []).filter(s => !s.is_duo));
    } catch (_) {} finally { setLoading(false); }
  }, [currentUser?.id]);

  useEffect(() => { load(); }, [load]);

  const handleStart = async (squadId) => {
    try {
      const { startChallenge } = require('../services/socialService');
      await startChallenge(squadId);
      load();
      Alert.alert('Desafio iniciado! 🔥', 'O contador de streak do grupo começa agora. Bora treinar!');
    } catch (e) { Alert.alert('Erro', e.message); }
  };

  const handleDelete = (squadId) => {
    Alert.alert('Excluir grupo', 'Tem certeza? Todos os membros serão removidos.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        try {
          const { deleteSquad } = require('../services/socialService');
          await deleteSquad(squadId);
          load();
        } catch (e) { Alert.alert('Erro', e.message); }
      }},
    ]);
  };

  const handleJoin = async (code) => {
    const { joinSquadByCode } = require('../services/socialService');
    try {
      await joinSquadByCode(currentUser.id, code);
      setJoinModal(false);
      load();
      Alert.alert('Entrou! 🛡️', 'Você entrou no grupo. Treinem juntos!');
    } catch (e) { Alert.alert('Erro', e.message ?? 'Código inválido ou grupo cheio.'); throw e; }
  };

  const mapSquad = (squad) => ({
    id: squad.id, name: squad.name, emoji: squad.emoji ?? '🛡️',
    mode: squad.mode ?? 'friends', status: squad.status ?? 'waiting',
    result: squad.result, groupStreak: squad.group_streak ?? 0,
    daysPerWeek: squad.min_weekly_checkins ?? 3, maxMembers: squad.max_members ?? 4,
    inviteCode: squad.invite_code, endDate: squad.end_date,
    color: squad.color ?? '#8B5CF6',
    gradient: squad.mode === 'battle' ? ['#7F1D1D','#3B0764','#1E1B4B'] : ['#7C3AED','#5B21B6','#1E1B4B'],
    members: (squad.squad_members ?? []).map(m => ({
      name: m.users?.name ?? '?', avatar: (m.users?.name ?? '?')[0],
      checkedInToday: m.checked_in_today ?? false, streak: m.users?.streak_count ?? 0,
      challengeStreak: m.challenge_streak ?? 0, isUser: m.user_id === currentUser?.id,
    })),
  });

  const active    = squads.filter(s => s.status !== 'completed');
  const completed = squads.filter(s => s.status === 'completed');

  return (
    <View style={styles.socialContainer}>
      <View style={styles.socialHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.socialTitle}>🛡️ Grupos & Clãs</Text>
          <Text style={styles.socialSub}>Treinem juntos. Se alguém falhar, o streak zera.</Text>
        </View>
        <TouchableOpacity style={styles.createBtn} activeOpacity={0.8}
          onPress={() => navigation.navigate('CreateClan', { isDuo: false })}>
          <Text style={styles.createBtnText}>+ Criar</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.enterCodeBtn} onPress={() => setJoinModal(true)} activeOpacity={0.8}>
        <Ionicons name="enter-outline" size={15} color={COLORS.purpleLight} />
        <Text style={styles.enterCodeBtnText}>Entrar em grupo com código de convite</Text>
        <Ionicons name="chevron-forward" size={14} color={COLORS.purpleLight} />
      </TouchableOpacity>
      {loading && <View style={{ alignItems: 'center', paddingVertical: 40 }}><Text style={{ color: COLORS.gray }}>Carregando...</Text></View>}
      {!loading && active.length === 0 && completed.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🛡️</Text>
          <Text style={styles.emptyTitle}>Nenhum grupo ainda</Text>
          <Text style={styles.emptySub}>Crie um grupo, convide amigos e iniciem juntos. O streak começa do zero e só conta quando todos treinam.</Text>
          <TouchableOpacity style={styles.emptyBtn} activeOpacity={0.8} onPress={() => navigation.navigate('CreateClan', { isDuo: false })}>
            <Text style={styles.emptyBtnText}>Criar Grupo</Text>
          </TouchableOpacity>
        </View>
      )}
      {active.map(squad => (
        <GroupCard key={squad.id} squad={mapSquad(squad)} currentUser={currentUser} avatarPhoto={avatarPhoto}
          onCopyCode={code => copyToClipboard(code, 'Código do grupo')}
          onStart={() => handleStart(squad.id)}
          onDelete={() => handleDelete(squad.id)} />
      ))}
      {completed.length > 0 && (
        <>
          <Text style={[styles.sectionSubTitle, { marginTop: SPACING.md }]}>📜 Histórico de Desafios</Text>
          {completed.map(squad => (
            <GroupCard key={squad.id} squad={mapSquad(squad)} currentUser={currentUser} avatarPhoto={avatarPhoto}
              onCopyCode={() => {}}
              onStart={() => {}}
              onDelete={() => handleDelete(squad.id)} />
          ))}
        </>
      )}
      <View style={styles.socialInfoBox}>
        <Text style={styles.socialInfoTitle}>Como funciona 🛡️</Text>
        <Text style={styles.socialInfoText}>{'O streak do grupo é separado do seu streak pessoal 🔥. Começa em 0 quando você iniciar o desafio. Sobe 1 dia a cada checkin/treino. No modo Juntos, todos precisam bater a meta semanal — um falha, o desafio acaba para todos.'}</Text>
      </View>
      <JoinModal visible={joinModal} title="Entrar em um Grupo" subtitle="Digite o código de 6 letras compartilhado pelo criador"
        onJoin={handleJoin} onClose={() => setJoinModal(false)} />
    </View>
  );
}

// ─── DUEL CARD (rivalry ativa entre dois usuários) ──────────────────────────
// Foguinhos INDIVIDUAIS — cada um tem o seu streak
function DuelCard({ duel, avatarPhoto, currentUser }) {
  const myScore      = duel.myScore ?? 0;
  const theirScore   = duel.theirScore ?? 0;
  const winning      = myScore > theirScore;
  const tied         = myScore === theirScore;
  const diff         = Math.abs(myScore - theirScore);
  const barMax       = Math.max(myScore, theirScore, 1);
  const dl           = daysLeft(duel.end_date);
  const opponentName = duel.opponent?.name ?? 'Rival';
  const myStreak     = currentUser?.streak ?? 0;
  const theirStreak  = duel.opponent?.streak_count ?? 0;
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1,   duration: 1000, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.4, duration: 1000, useNativeDriver: true }),
    ])).start();
  }, []);

  const borderCol = tied ? '#A78BFA' : winning ? '#10B981' : '#EF4444';

  return (
    <View style={styles.duelWrapper}>
      <Animated.View pointerEvents="none" style={[styles.duelPulse, { borderColor: borderCol, opacity: pulse }]} />
      <LinearGradient colors={['#4C1D95','#2E1065','#1A1A3E']} style={styles.duelCard}>

        {/* Header */}
        <View style={styles.duelHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.duelTitle}>⚔️ {duel.name ?? 'Duelo'}</Text>
            <Text style={styles.duelSubtitle}>Foguinhos individuais · Mais treinos vence</Text>
          </View>
          <View style={[styles.duelTimeBadge, { backgroundColor: borderCol + '22', borderColor: borderCol + '55' }]}>
            <Text style={[styles.duelTimeText, { color: borderCol }]}>⏳ {dl ?? '?'}d</Text>
          </View>
        </View>

        {/* Foguinhos individuais */}
        <View style={styles.duelFlameRow}>
          <View style={styles.duelFlameItem}>
            <Text style={styles.duelFlameEmoji}>🔥</Text>
            <Text style={styles.duelFlameNum}>{myStreak}</Text>
            <Text style={styles.duelFlameName}>Você</Text>
          </View>
          <Text style={styles.duelFlameSep}>streaks individuais</Text>
          <View style={styles.duelFlameItem}>
            <Text style={styles.duelFlameEmoji}>🔥</Text>
            <Text style={styles.duelFlameNum}>{theirStreak}</Text>
            <Text style={styles.duelFlameName}>{opponentName.split(' ')[0]}</Text>
          </View>
        </View>

        {/* Arena */}
        <View style={styles.duelArena}>
          <View style={styles.duelFighter}>
            <AvatarCircle photo={avatarPhoto} letter={currentUser?.name?.[0] ?? 'V'} size={56}
              gradientColors={['#8B5CF6','#6D28D9']}
              style={winning && diff > 0 ? { borderWidth: 3, borderColor: '#10B981' } : undefined}
            />
            <Text style={styles.duelFighterLabel}>Você</Text>
            <Text style={[styles.duelScore, { color: winning ? '#10B981' : tied ? COLORS.white : '#EF4444' }]}>{myScore}</Text>
            <Text style={styles.duelScoreUnit}>treinos</Text>
          </View>
          <LinearGradient colors={['rgba(255,255,255,0.12)','rgba(255,255,255,0.04)']} style={styles.duelVSCircle}>
            <Text style={[styles.duelVSText, { color: borderCol }]}>VS</Text>
          </LinearGradient>
          <View style={styles.duelFighter}>
            <LinearGradient colors={['#F97316CC','#C2410C88']}
              style={[styles.duelRivalAvatar, !winning && diff > 0 ? { borderWidth: 3, borderColor: '#10B981' } : undefined]}>
              <Text style={styles.duelAvatarText}>{opponentName[0]}</Text>
            </LinearGradient>
            <Text style={styles.duelFighterLabel}>{opponentName.split(' ')[0]}</Text>
            <Text style={[styles.duelScore, { color: !winning && !tied ? '#10B981' : tied ? COLORS.white : '#EF4444' }]}>{theirScore}</Text>
            <Text style={styles.duelScoreUnit}>treinos</Text>
          </View>
        </View>

        {/* Barras */}
        <View style={styles.duelBarsRow}>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={styles.duelBarLabel}>Você</Text>
            <View style={styles.duelBarTrack}>
              <View style={[styles.duelBarFill, { width: `${(myScore/barMax)*100}%`, backgroundColor: winning ? '#10B981' : '#8B5CF6' }]} />
            </View>
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={[styles.duelBarLabel, { textAlign: 'right' }]}>{opponentName.split(' ')[0]}</Text>
            <View style={styles.duelBarTrack}>
              <View style={[styles.duelBarFill, { width: `${(theirScore/barMax)*100}%`, backgroundColor: '#F97316', alignSelf: 'flex-end' }]} />
            </View>
          </View>
        </View>

        {/* Status */}
        <View style={[styles.duelStatusBadge, { backgroundColor: borderCol + '18', borderColor: borderCol + '40' }]}>
          <Text style={[styles.duelStatusText, { color: borderCol }]}>
            {tied ? '🤝 Empate! Próximo treino decide!'
              : winning ? `💪 Você lidera por ${diff} treino${diff > 1 ? 's' : ''}!`
              : `😤 ${opponentName.split(' ')[0]} lidera por ${diff}. Vai treinar!`}
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}

// ─── DUO CARD (dupla colaborativa ou rival) ──────────────────────────────────
function DuoCard({ squad, currentUser, avatarPhoto, onCopyCode, onStart, onDelete }) {
  const isBattle  = squad.mode === 'battle';
  const members   = squad.members ?? [];
  const status    = squad.status ?? 'waiting';
  const result    = parseResult(squad.result, currentUser?.id);
  const dl        = daysLeft(squad.endDate);
  const canStart  = members.length >= 2 && status === 'waiting';
  const me        = members.find(m => m.isUser);
  const partner   = members.find(m => !m.isUser);
  const sharedStreak = squad.groupStreak ?? 0;
  const myCheckedIn   = me?.checkedInToday ?? false;
  const theirCheckedIn = partner?.checkedInToday ?? false;
  const myStreak   = me?.challengeStreak ?? 0;
  const theirStreak = partner?.challengeStreak ?? 0;
  const myWinning  = myStreak > theirStreak;
  const tied       = myStreak === theirStreak;
  const borderCol  = isBattle ? (myWinning ? '#10B981' : tied ? '#A78BFA' : '#EF4444') : '#10B981';

  return (
    <View style={[styles.duoCard, {
      borderColor: status === 'completed'
        ? (result?.type === 'won' || result?.type === 'champion' ? '#10B98140' : '#EF444440')
        : styles.duoCard.borderColor,
      backgroundColor: status === 'completed'
        ? (result?.type === 'won' || result?.type === 'champion' ? '#064E3B22' : '#450A0A22')
        : COLORS.card,
    }]}>
      {/* Header */}
      <View style={styles.duoHeader}>
        <Text style={styles.duoEmoji}>{squad.emoji ?? (isBattle ? '⚔️' : '🤝')}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.duoName}>{squad.name}</Text>
          <View style={styles.duoRulesRow}>
            <Text style={styles.duoRule}>📅 {squad.daysPerWeek ?? 3}×/sem</Text>
            {dl !== null && status === 'active' && <Text style={styles.duoRule}>⏰ {dl}d rest.</Text>}
            <Text style={styles.duoRule}>👥 {members.length}/2</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {status !== 'completed' && (
            <View style={[styles.duoModeBadge, {
              backgroundColor: isBattle ? '#EF444418' : '#10B98118',
              borderColor:     isBattle ? '#EF444440' : '#10B98140',
            }]}>
              <Text style={[styles.duoModeText, { color: isBattle ? '#EF4444' : '#10B981' }]}>
                {isBattle ? '⚔️ Rival' : '🤝 Juntos'}
              </Text>
            </View>
          )}
          <TouchableOpacity onPress={onDelete} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={16} color="rgba(255,255,255,0.3)" />
          </TouchableOpacity>
        </View>
      </View>

      {/* COMPLETED */}
      {status === 'completed' && result && (
        <View style={styles.gcResultBlock}>
          <Text style={styles.gcResultIcon}>{result.icon}</Text>
          <Text style={[styles.gcResultTitle, { color: (result.type === 'won' || result.type === 'champion') ? '#10B981' : '#EF4444' }]}>
            {result.title}
          </Text>
          <Text style={styles.gcResultSub}>{result.sub}</Text>
          {isBattle ? (
            <View style={styles.gcRivalList}>
              {[me, partner].filter(Boolean).sort((a, b) => (b?.challengeStreak ?? 0) - (a?.challengeStreak ?? 0)).map((m, i) => (
                <View key={i} style={[styles.gcRivalRow, m?.isUser && styles.gcRivalRowMe]}>
                  <Text style={[styles.gcRivalPos, { color: i === 0 ? '#FFD700' : COLORS.gray }]}>#{i + 1}</Text>
                  <View style={[styles.gcRivalRing, { borderColor: i === 0 ? '#FFD700' : COLORS.grayDark }]}>
                    {m?.isUser && avatarPhoto
                      ? <Image source={{ uri: avatarPhoto }} style={styles.gcRivalAvatar} />
                      : <LinearGradient colors={m?.isUser ? ['#8B5CF6','#6D28D9'] : ['#F97316','#C2410C']} style={styles.gcRivalAvatar}>
                          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>{m?.avatar}</Text>
                        </LinearGradient>}
                  </View>
                  <Text style={[styles.gcRivalName, m?.isUser && { color: COLORS.purpleLight }]} numberOfLines={1}>
                    {m?.isUser ? 'Você' : m?.name?.split(' ')[0]}
                  </Text>
                  <View style={styles.gcRivalFlame}>
                    <Text>🔥</Text>
                    <Text style={styles.gcRivalFlameNum}>{m?.challengeStreak ?? 0}</Text>
                    <Text style={styles.gcRivalFlameSub}>dias</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.gcResultFlame}>
              <Text style={styles.gcResultFlameEmoji}>🔥</Text>
              <Text style={styles.gcResultFlameNum}>{sharedStreak}</Text>
              <Text style={styles.gcResultFlameSub}>dias juntos</Text>
            </View>
          )}
        </View>
      )}

      {/* WAITING */}
      {status === 'waiting' && (
        <>
          {members.length < 2 ? (
            <View style={styles.gcWaitBlock}>
              <Text style={styles.gcWaitEmoji}>⏳</Text>
              <Text style={styles.gcWaitTitle}>Aguardando parceiro</Text>
              <Text style={styles.gcWaitSub}>Compartilhe o código abaixo para seu parceiro entrar</Text>
            </View>
          ) : (
            <View style={styles.gcWaitBlock}>
              <Text style={styles.gcWaitEmoji}>✅</Text>
              <Text style={styles.gcWaitTitle}>Dupla pronta!</Text>
              <Text style={styles.gcWaitSub}>Pressione "Iniciar Desafio" para começar a contar os streaks</Text>
            </View>
          )}
          <View style={styles.duoArena}>
            <View style={styles.duoFighter}>
              <View style={[styles.duoFighterRing, { borderColor: COLORS.purple }]}>
                {avatarPhoto
                  ? <Image source={{ uri: avatarPhoto }} style={styles.duoFighterAvatar} />
                  : <LinearGradient colors={['#8B5CF6','#6D28D9']} style={styles.duoFighterAvatar}>
                      <Text style={styles.duoFighterAvatarText}>{currentUser?.name?.[0] ?? 'V'}</Text>
                    </LinearGradient>}
              </View>
              <Text style={styles.duoFighterName}>Você</Text>
            </View>
            <View style={styles.duoVSBlock}>
              <Text style={[styles.duoVSLabel, { color: COLORS.purple }]}>{isBattle ? 'VS' : '+'}</Text>
            </View>
            <View style={styles.duoFighter}>
              {partner ? (
                <>
                  <View style={[styles.duoFighterRing, { borderColor: COLORS.purple }]}>
                    <LinearGradient colors={['#F97316','#C2410C']} style={styles.duoFighterAvatar}>
                      <Text style={styles.duoFighterAvatarText}>{partner.avatar}</Text>
                    </LinearGradient>
                  </View>
                  <Text style={styles.duoFighterName}>{partner.name?.split(' ')[0]}</Text>
                </>
              ) : (
                <>
                  <View style={[styles.duoFighterRing, { borderColor: 'rgba(255,255,255,0.15)' }]}>
                    <View style={[styles.duoFighterAvatar, { backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center' }]}>
                      <Ionicons name="person-add-outline" size={20} color="rgba(255,255,255,0.25)" />
                    </View>
                  </View>
                  <Text style={[styles.duoFighterName, { color: 'rgba(255,255,255,0.3)' }]}>Aguardando</Text>
                </>
              )}
            </View>
          </View>
          {canStart && (
            <TouchableOpacity style={styles.gcStartBtn} onPress={onStart} activeOpacity={0.85}>
              <LinearGradient colors={['#10B981','#047857']} style={styles.gcStartBtnInner}>
                <Ionicons name="play-circle" size={18} color="#fff" />
                <Text style={styles.gcStartBtnText}>Iniciar Desafio</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
          {squad.inviteCode && (
            <TouchableOpacity style={styles.duoCodeRow} onPress={() => onCopyCode?.(squad.inviteCode)} activeOpacity={0.7}>
              <Ionicons name="share-social-outline" size={14} color={COLORS.purpleLight} />
              <Text style={styles.duoCodeLabel}>Compartilhe para alguém entrar:</Text>
              <View style={styles.duoCodePill}>
                <Text style={styles.duoCodeText}>{squad.inviteCode}</Text>
                <Ionicons name="copy-outline" size={12} color={COLORS.purpleLight} />
              </View>
            </TouchableOpacity>
          )}
        </>
      )}

      {/* ACTIVE */}
      {status === 'active' && (
        <>
          {!isBattle && (
            <View style={styles.duoSharedFlame}>
              <Text style={styles.duoSharedFlameIcon}>🔥</Text>
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.duoSharedFlameNum}>{sharedStreak}</Text>
                <Text style={styles.duoSharedFlameSub}>dias juntos</Text>
              </View>
              <Text style={styles.duoSharedFlameIcon}>🔥</Text>
            </View>
          )}
          <View style={styles.duoArena}>
            <View style={styles.duoFighter}>
              <View style={[styles.duoFighterRing, { borderColor: myCheckedIn ? '#10B981' : '#F59E0B' }]}>
                {avatarPhoto
                  ? <Image source={{ uri: avatarPhoto }} style={styles.duoFighterAvatar} />
                  : <LinearGradient colors={['#8B5CF6','#6D28D9']} style={styles.duoFighterAvatar}>
                      <Text style={styles.duoFighterAvatarText}>{currentUser?.name?.[0] ?? 'V'}</Text>
                    </LinearGradient>}
              </View>
              <Text style={styles.duoFighterName}>Você</Text>
              {isBattle && (
                <View style={styles.duoIndFlame}>
                  <Text>🔥</Text>
                  <Text style={styles.duoIndFlameNum}>{myStreak}</Text>
                </View>
              )}
              {!isBattle && (myCheckedIn
                ? <Text style={styles.duoCheckinDone}>✓ treinou</Text>
                : <Text style={styles.duoCheckinPend}>pendente</Text>)}
            </View>
            <View style={styles.duoVSBlock}>
              <Text style={[styles.duoVSLabel, { color: borderCol }]}>{isBattle ? 'VS' : '+'}</Text>
              {isBattle && !tied && (
                <View style={[styles.duoLeadBadge, { backgroundColor: borderCol + '20' }]}>
                  <Text style={[styles.duoLeadText, { color: borderCol }]}>
                    {myWinning ? `+${myStreak - theirStreak}` : `-${theirStreak - myStreak}`}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.duoFighter}>
              {partner ? (
                <>
                  <View style={[styles.duoFighterRing, { borderColor: theirCheckedIn ? '#10B981' : '#F59E0B' }]}>
                    <LinearGradient colors={['#F97316','#C2410C']} style={styles.duoFighterAvatar}>
                      <Text style={styles.duoFighterAvatarText}>{partner.avatar}</Text>
                    </LinearGradient>
                  </View>
                  <Text style={styles.duoFighterName}>{partner.name?.split(' ')[0]}</Text>
                  {isBattle && (
                    <View style={styles.duoIndFlame}>
                      <Text>🔥</Text>
                      <Text style={styles.duoIndFlameNum}>{theirStreak}</Text>
                    </View>
                  )}
                  {!isBattle && (theirCheckedIn
                    ? <Text style={styles.duoCheckinDone}>✓ treinou</Text>
                    : <Text style={styles.duoCheckinPend}>pendente</Text>)}
                </>
              ) : (
                <>
                  <View style={[styles.duoFighterRing, { borderColor: 'rgba(255,255,255,0.15)' }]}>
                    <View style={[styles.duoFighterAvatar, { backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center' }]}>
                      <Ionicons name="person-add-outline" size={20} color="rgba(255,255,255,0.25)" />
                    </View>
                  </View>
                  <Text style={[styles.duoFighterName, { color: 'rgba(255,255,255,0.3)' }]}>Aguardando</Text>
                </>
              )}
            </View>
          </View>
          <View style={[styles.duoStatusBar, { backgroundColor: borderCol + '15', borderColor: borderCol + '35' }]}>
            <Text style={[styles.duoStatusText, { color: borderCol }]}>
              {isBattle
                ? (tied ? '🤝 Empatados — próximo treino decide!'
                  : myWinning ? '💪 Você lidera! Continue a pressão!'
                  : `😤 ${partner?.name?.split(' ')[0] ?? 'Rival'} lidera. Vai treinar!`)
                : (myCheckedIn && theirCheckedIn
                  ? `🔥 Ambos treinaram! Foguinho de ${sharedStreak} dias mantido!`
                  : !myCheckedIn && !theirCheckedIn
                  ? '⚡ Ambos precisam treinar hoje para não zerar!'
                  : myCheckedIn
                  ? `⏳ Falta ${partner?.name?.split(' ')[0] ?? 'parceiro'} treinar hoje`
                  : '⏳ Treine você também para manter o foguinho!')}
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

// ─── RIVAIS VIEW ─────────────────────────────────────────────────────────────
function RivaisView() {
  const navigation = useNavigation();
  const { user: currentUser, avatarPhoto } = useUser();
  const [duels,     setDuels]     = useState([]);
  const [duos,      setDuos]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [joinModal, setJoinModal] = useState(false);

  const load = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const { getSquadsWithHistory, getUserDuels, checkAndFinalizeSquads } = require('../services/socialService');
      await checkAndFinalizeSquads(currentUser.id).catch(() => {});
      const [d, squads] = await Promise.all([
        getUserDuels(currentUser.id),
        getSquadsWithHistory(currentUser.id),
      ]);
      setDuels(d ?? []);
      setDuos((squads ?? []).filter(s => s.is_duo));
    } catch (_) {} finally { setLoading(false); }
  }, [currentUser?.id]);

  useEffect(() => { load(); }, [load]);

  const handleStart = async (squadId) => {
    try {
      const { startChallenge } = require('../services/socialService');
      await startChallenge(squadId);
      load();
      Alert.alert('Desafio iniciado! 🔥', 'O contador de streak da dupla começa agora. Bora treinar!');
    } catch (e) { Alert.alert('Erro', e.message); }
  };

  const handleDelete = (squadId) => {
    Alert.alert('Excluir dupla', 'Tem certeza? A dupla será removida para ambos.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        try {
          const { deleteSquad } = require('../services/socialService');
          await deleteSquad(squadId);
          load();
        } catch (e) { Alert.alert('Erro', e.message); }
      }},
    ]);
  };

  const handleJoin = async (code) => {
    const { joinSquadByCode } = require('../services/socialService');
    try {
      await joinSquadByCode(currentUser.id, code);
      setJoinModal(false);
      load();
      Alert.alert('Entrou! ⚔️', 'Você entrou na dupla. Que comecem os treinos!');
    } catch (e) { Alert.alert('Erro', e.message ?? 'Código inválido.'); throw e; }
  };

  const mapDuo = (squad) => ({
    id: squad.id, name: squad.name, emoji: squad.emoji,
    mode: squad.mode ?? 'friends', status: squad.status ?? 'waiting',
    result: squad.result, groupStreak: squad.group_streak ?? 0,
    daysPerWeek: squad.min_weekly_checkins ?? 3,
    inviteCode: squad.invite_code, endDate: squad.end_date,
    members: (squad.squad_members ?? []).map(m => ({
      name: m.users?.name ?? '?', avatar: (m.users?.name ?? '?')[0],
      checkedInToday: m.checked_in_today ?? false, streak: m.users?.streak_count ?? 0,
      challengeStreak: m.challenge_streak ?? 0, isUser: m.user_id === currentUser?.id,
    })),
  });

  const activeDuos    = duos.filter(s => s.status !== 'completed');
  const completedDuos = duos.filter(s => s.status === 'completed');
  const isEmpty = !loading && duels.length === 0 && duos.length === 0;

  return (
    <View style={styles.socialContainer}>
      <View style={styles.socialHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.socialTitle}>⚔️ Rivais & Duplas</Text>
          <Text style={styles.socialSub}>Desafie alguém. Quem treina mais, vence.</Text>
        </View>
        <TouchableOpacity style={styles.createBtn} activeOpacity={0.8}
          onPress={() => navigation.navigate('CreateClan', { isDuo: true })}>
          <Text style={styles.createBtnText}>+ Criar</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.enterCodeBtn} onPress={() => setJoinModal(true)} activeOpacity={0.8}>
        <Ionicons name="enter-outline" size={15} color={COLORS.purpleLight} />
        <Text style={styles.enterCodeBtnText}>Entrar em dupla com código de convite</Text>
        <Ionicons name="chevron-forward" size={14} color={COLORS.purpleLight} />
      </TouchableOpacity>
      {loading && <View style={{ alignItems: 'center', paddingVertical: 40 }}><Text style={{ color: COLORS.gray, fontSize: 14 }}>Carregando duelos...</Text></View>}
      {isEmpty && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>⚔️</Text>
          <Text style={styles.emptyTitle}>Nenhum duelo ainda</Text>
          <Text style={styles.emptySub}>
            Crie uma dupla e desafie um amigo.{'\n'}
            <Text style={{ color: COLORS.white, fontWeight: '800' }}>Rival:</Text> quem bater mais streak no período ganha.{'\n'}
            <Text style={{ color: COLORS.white, fontWeight: '800' }}>Juntos:</Text> treinem juntos pra bater a meta.
          </Text>
          <TouchableOpacity style={styles.emptyBtn} activeOpacity={0.8}
            onPress={() => navigation.navigate('CreateClan', { isDuo: true })}>
            <Text style={styles.emptyBtnText}>Criar Duelo</Text>
          </TouchableOpacity>
        </View>
      )}
      {duels.length > 0 && (
        <>
          <Text style={styles.sectionSubTitle}>⚡ Duelos Ativos</Text>
          {duels.map(duel => (
            <DuelCard key={duel.id} duel={duel} avatarPhoto={avatarPhoto} currentUser={currentUser} />
          ))}
        </>
      )}
      {activeDuos.length > 0 && (
        <>
          <Text style={styles.sectionSubTitle}>🤝 Minhas Duplas</Text>
          {activeDuos.map(duo => (
            <DuoCard key={duo.id} squad={mapDuo(duo)} currentUser={currentUser} avatarPhoto={avatarPhoto}
              onCopyCode={code => copyToClipboard(code, 'Código da dupla')}
              onStart={() => handleStart(duo.id)}
              onDelete={() => handleDelete(duo.id)} />
          ))}
        </>
      )}
      {completedDuos.length > 0 && (
        <>
          <Text style={[styles.sectionSubTitle, { marginTop: SPACING.md }]}>📜 Histórico de Duelos</Text>
          {completedDuos.map(duo => (
            <DuoCard key={duo.id} squad={mapDuo(duo)} currentUser={currentUser} avatarPhoto={avatarPhoto}
              onCopyCode={() => {}}
              onStart={() => {}}
              onDelete={() => handleDelete(duo.id)} />
          ))}
        </>
      )}
      <View style={styles.socialInfoBox}>
        <Text style={styles.socialInfoTitle}>Como funciona ⚔️</Text>
        <Text style={styles.socialInfoText}>{'Seu streak pessoal 🔥 não é afetado pelos duelos. O streak do desafio começa do zero quando você iniciar. No modo Rival, quem bater mais dias de streak no período ganha.'}</Text>
      </View>
      <JoinModal visible={joinModal} title="Entrar em uma Dupla" subtitle="Digite o código de 6 letras compartilhado pelo criador da dupla"
        onJoin={handleJoin} onClose={() => setJoinModal(false)} />
    </View>
  );
}

// ─── FEED ────────────────────────────────────────────────────────────────────
const FEED_TYPE_COLOR = {
  record:      '#F59E0B',
  achievement: '#8B5CF6',
  water:       '#0EA5E9',
  workout:     '#10B981',
  streak:      '#EF4444',
};

const REACTIONS = [
  { key: 'party', emoji: '🎉', activeColor: '#F59E0B' },
  { key: 'fire',  emoji: '🔥', activeColor: '#EF4444' },
  { key: 'heart', emoji: '❤️', activeColor: '#EC4899' },
];

function FeedSection() {
  const { user, avatarPhoto } = useUser();
  const [myReactions, setMyReactions] = useState({});
  const [posts, setPosts]             = useState([]);
  const [loadingFeed, setLoadingFeed] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('feed_posts').select('*, users(name)').order('created_at', { ascending: false }).limit(20),
      user?.id
        ? supabase.from('feed_reactions').select('post_id, reaction_type').eq('user_id', user.id)
        : Promise.resolve({ data: [] }),
    ]).then(([{ data: postsData }, { data: reactsData }]) => {
      setPosts(postsData ?? []);
      // Restaura reações do usuário
      const restored = {};
      (reactsData ?? []).forEach(r => { restored[`${r.post_id}_${r.reaction_type}`] = true; });
      setMyReactions(restored);
      setLoadingFeed(false);
    }).catch(() => setLoadingFeed(false));
  }, [user?.id]);

  const toggle = async (postId, key) => {
    const id = `${postId}_${key}`;
    const isActive = !!myReactions[id];
    setMyReactions((prev) => ({ ...prev, [id]: !isActive }));

    // Persiste no Supabase
    try {
      if (!isActive) {
        await supabase.from('feed_reactions').upsert(
          { post_id: postId, user_id: user?.id, reaction_type: key },
          { onConflict: 'post_id,user_id,reaction_type', ignoreDuplicates: true }
        );
      } else {
        await supabase.from('feed_reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user?.id)
          .eq('reaction_type', key);
      }
    } catch (_) {
      // Rollback se falhar
      setMyReactions((prev) => ({ ...prev, [id]: isActive }));
    }
  };

  return (
    <View style={styles.feedSection}>
      <View style={styles.feedHeader}>
        <Text style={styles.feedTitle}>📣 Feed da Comunidade</Text>
        <TouchableOpacity style={styles.shareBtn} activeOpacity={0.8}
          onPress={() => shareExternal(buildShareText(user ?? {}, 'streak', ''), '')}>
          <Text style={styles.shareBtnText}>+ Compartilhar</Text>
        </TouchableOpacity>
      </View>

      {!loadingFeed && posts.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📣</Text>
          <Text style={styles.emptyTitle}>Feed vazio por enquanto</Text>
          <Text style={styles.emptySub}>Complete treinos, bata recordes e conquistas para aparecer aqui!</Text>
        </View>
      )}

      {posts.map((item) => {
        const accent    = FEED_TYPE_COLOR[item.post_type] ?? COLORS.purple;
        const userName  = item.users?.name ?? 'Usuário';
        const avatarLetter = userName[0]?.toUpperCase() ?? '?';
        const timeAgo   = (() => {
          const diff = Date.now() - new Date(item.created_at).getTime();
          const mins = Math.floor(diff / 60000);
          if (mins < 60) return `${mins}min`;
          const hrs = Math.floor(mins / 60);
          if (hrs < 24) return `${hrs}h`;
          return `${Math.floor(hrs / 24)}d`;
        })();
        return (
          <View key={item.id} style={[styles.feedCard, { borderColor: accent + '28' }]}>
            <View style={styles.feedCardTop}>
              {item.user_id === user?.id && avatarPhoto ? (
                <Image source={{ uri: avatarPhoto }} style={styles.feedAvatar} />
              ) : (
                <LinearGradient colors={[accent + '55', accent + '25']} style={styles.feedAvatar}>
                  <Text style={styles.feedAvatarText}>{avatarLetter}</Text>
                </LinearGradient>
              )}
              <View style={styles.feedMeta}>
                <Text style={styles.feedUser}>{userName}</Text>
                <Text style={styles.feedTime}>{timeAgo} atrás</Text>
              </View>
              <View style={[styles.feedBadge, { backgroundColor: accent + '20', borderColor: accent + '45' }]}>
                <Text style={styles.feedBadgeEmoji}>{item.emoji ?? '🏆'}</Text>
                <Text style={[styles.feedBadgeText, { color: accent }]} numberOfLines={1}>{item.badge ?? item.post_type}</Text>
              </View>
            </View>

            <Text style={styles.feedContent}>{item.detail}</Text>

            <View style={styles.feedReactRow}>
              {REACTIONS.map(({ key, emoji, activeColor }) => {
                const active = !!myReactions[`${item.id}_${key}`];
                const count  = active ? 1 : 0;
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => toggle(item.id, key)}
                    style={[
                      styles.feedReactBtn,
                      active && { backgroundColor: activeColor + '28', borderColor: activeColor + '90' },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.feedReactEmoji}>{emoji}</Text>
                    <Text style={[styles.feedReactCount, active && { color: activeColor, fontWeight: '800' }]}>{count}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── PODIUM ──────────────────────────────────────────────────────────────────
function PodiumItem({ user, position, avatarPhoto }) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const heightMap = { 1: 80, 2: 60, 3: 50 };
  const colorMap  = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' };
  const emojiMap  = { 1: '🥇', 2: '🥈', 3: '🥉' };

  useEffect(() => {
    Animated.spring(scaleAnim, { toValue: 1, delay: position * 150, friction: 5, useNativeDriver: true }).start();
  }, []);

  // Ainda carregando ou posição vazia
  if (!user) return (
    <Animated.View style={[styles.podiumItem, { transform: [{ scale: scaleAnim }] }]}>
      <View style={styles.podiumAvatar}>
        <View style={[styles.podiumAvatarCircle, { backgroundColor: '#1A1A2E' }]} />
        <Text style={styles.podiumMedal}>{emojiMap[position]}</Text>
      </View>
      <Text style={[styles.podiumRank, { color: colorMap[position] }]}>-</Text>
      <View style={[styles.podiumBar, { height: heightMap[position], backgroundColor: colorMap[position] + '15', borderColor: colorMap[position] + '30' }]}>
        <Text style={[styles.podiumRank, { color: colorMap[position] }]}>#{position}</Text>
      </View>
    </Animated.View>
  );

  return (
    <Animated.View style={[styles.podiumItem, { transform: [{ scale: scaleAnim }] }]}>
      <View style={styles.podiumAvatar}>
        {user.isUser && avatarPhoto ? (
          <Image
            source={{ uri: avatarPhoto }}
            style={[styles.podiumAvatarCircle, styles.podiumAvatarUser]}
          />
        ) : (
          <LinearGradient
            colors={position === 1 ? ['#F59E0B', '#D97706'] : ['#8B5CF6', '#6D28D9']}
            style={[styles.podiumAvatarCircle, user.isUser && styles.podiumAvatarUser]}
          >
            <Text style={styles.podiumAvatarText}>{user.avatar}</Text>
          </LinearGradient>
        )}
        <Text style={styles.podiumMedal}>{emojiMap[position]}</Text>
      </View>
      <Text style={styles.podiumName} numberOfLines={1}>{user.isUser ? 'Você' : user.name.split(' ')[0]}</Text>
      <Text style={styles.podiumXP}>{(user.xp / 1000).toFixed(1)}k</Text>
      <View style={[styles.podiumBar, { height: heightMap[position], backgroundColor: colorMap[position] + '30', borderColor: colorMap[position] + '60' }]}>
        <Text style={[styles.podiumRank, { color: colorMap[position] }]}>#{position}</Text>
      </View>
    </Animated.View>
  );
}

// ─── MAIN SCREEN ─────────────────────────────────────────────────────────────
export default function LeaderboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user: currentUser, avatarPhoto } = useUser();
  const [tab, setTab]               = useState('Geral');
  const [rankingData, setRankingData] = useState([]);
  const [loadingRank, setLoadingRank] = useState(true);
  const headerAnim = useRef(new Animated.Value(0)).current;
  const listAnim   = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(listAnim,   { toValue: 0, duration: 500, delay: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  // Carrega ranking real do Supabase
  useEffect(() => {
    fetchLeaderboard(50).then(data => {
      const marked = data.map(u => ({ ...u, isUser: u.id === currentUser?.id }));
      setRankingData(marked);
      setLoadingRank(false);
    }).catch(() => setLoadingRank(false));
  }, [currentUser?.id]);

  const top3      = rankingData.slice(0, 3);
  const rest      = rankingData.slice(3);
  const userEntry = rankingData.find(u => u.isUser) ?? {
    rank: 99, name: currentUser?.name ?? 'Você',
    xp: currentUser?.xp ?? 0, streak: currentUser?.streak ?? 0,
    league: currentUser?.league ?? 'Bronze',
    league_emoji: currentUser?.leagueEmoji ?? '🥉',
    avatar: currentUser?.name?.[0] ?? '?', isUser: true,
  };
  const currentLeague = LEAGUE_CONFIG[currentUser?.league] || LEAGUE_CONFIG['Bronze'];

  const getChangeIcon = (change) => {
    if (change > 0) return { icon: 'arrow-up',   color: COLORS.green };
    if (change < 0) return { icon: 'arrow-down',  color: COLORS.red   };
    return               { icon: 'remove',       color: COLORS.gray  };
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>

        {/* HEADER */}
        <Animated.View style={{ opacity: headerAnim }}>
          <LinearGradient
            colors={['#1A1A3E', '#0A0A18']}
            style={[styles.header, { paddingTop: insets.top + 12 }]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={styles.headerTitle}>🏆 Ranking</Text>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(139,92,246,0.2)', borderRadius: 99, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(139,92,246,0.4)' }}
                onPress={() => navigation.navigate('Friends')}
                activeOpacity={0.8}>
                <Text style={{ fontSize: 14 }}>👥</Text>
                <Text style={{ color: COLORS.purpleLight, fontSize: 13, fontWeight: '700' }}>Amigos</Text>
              </TouchableOpacity>
            </View>

            <LinearGradient colors={currentLeague.gradient} style={styles.leagueCard}>
              <View style={styles.leagueLeft}>
                <Text style={styles.leagueEmoji}>{currentLeague.emoji}</Text>
                <View>
                  <Text style={styles.leagueName}>Liga {currentUser.league}</Text>
                  <Text style={styles.leagueSub}>Sua liga atual</Text>
                </View>
              </View>
              <View style={styles.leagueRight}>
                <Text style={styles.leagueRank}>#{userEntry?.rank}</Text>
                <Text style={styles.leagueRankLabel}>posição</Text>
              </View>
            </LinearGradient>

            <View style={styles.tabs}>
              {['Geral', 'Grupos', 'Rivais'].map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setTab(t)}
                  style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
                >
                  <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ── GERAL ── */}
        {tab === 'Geral' && (
          <>
            <View style={styles.podiumSection}>
              <View style={styles.podiumRow}>
                <PodiumItem user={top3[1]} position={2} avatarPhoto={avatarPhoto} />
                <PodiumItem user={top3[0]} position={1} avatarPhoto={avatarPhoto} />
                <PodiumItem user={top3[2]} position={3} avatarPhoto={avatarPhoto} />
              </View>
            </View>

            <Animated.View style={[styles.listSection, { transform: [{ translateY: listAnim }] }]}>
              {loadingRank && rest.length === 0 && (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Text style={{ color: COLORS.gray, fontSize: 14 }}>Carregando ranking...</Text>
                </View>
              )}
              {rest.map((user) => {
                if (!user) return null;
                const change = getChangeIcon(user.change ?? 0);
                return (
                  <View key={user.rank} style={[styles.listItem, user.isUser && styles.listItemUser]}>
                    {user.isUser && (
                      <LinearGradient
                        colors={['rgba(139,92,246,0.15)', 'rgba(139,92,246,0.05)']}
                        style={StyleSheet.absoluteFill}
                      />
                    )}
                    <Text style={styles.rankNum}>#{user.rank}</Text>
                    {user.isUser && avatarPhoto ? (
                      <Image source={{ uri: avatarPhoto }} style={styles.listAvatar} />
                    ) : (
                      <LinearGradient
                        colors={user.isUser ? ['#8B5CF6', '#6D28D9'] : ['#2A2A4A', '#1A1A3E']}
                        style={styles.listAvatar}
                      >
                        <Text style={styles.listAvatarText}>{user.avatar}</Text>
                      </LinearGradient>
                    )}
                    <View style={styles.listInfo}>
                      <Text style={[styles.listName, user.isUser && styles.listNameUser]}>
                        {user.isUser ? 'Você 👑' : user.name}
                      </Text>
                      <View style={styles.listMeta}>
                        <Text style={styles.listLeague}>{user.league}</Text>
                        <Text style={styles.listStreak}>🔥 {user.streak} dias</Text>
                      </View>
                    </View>
                    <View style={styles.listRight}>
                      <Text style={styles.listXP}>{user.xp.toLocaleString()}</Text>
                      <Text style={styles.listXPLabel}>XP</Text>
                      <View style={styles.changeRow}>
                        <Ionicons name={change.icon} size={10} color={change.color} />
                        {user.change !== 0 && (
                          <Text style={[styles.changeText, { color: change.color }]}>
                            {Math.abs(user.change)}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </Animated.View>

            <View style={styles.leaguesGuide}>
              <Text style={styles.guideTitle}>🏅 Ligas</Text>
              <View style={styles.guideList}>
                {Object.entries(LEAGUE_CONFIG).map(([name, config]) => (
                  <View key={name} style={styles.guideItem}>
                    <Text style={styles.guideEmoji}>{config.emoji}</Text>
                    <Text style={[styles.guideName, { color: config.color }]}>{name}</Text>
                    {name === currentUser.league && (
                      <View style={styles.currentBadge}>
                        <Text style={styles.currentBadgeText}>Atual</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </View>

            <FeedSection />
          </>
        )}

        {/* ── GRUPOS ── */}
        {tab === 'Grupos' && <GruposView />}

        {/* ── RIVAIS ── */}
        {tab === 'Rivais' && <RivaisView />}

      </ScrollView>
    </View>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  // Header
  header: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.lg, gap: 14 },
  headerTitle: { color: COLORS.white, fontSize: 24, fontWeight: '800' },
  leagueCard: { borderRadius: RADIUS.lg, padding: SPACING.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  leagueLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  leagueEmoji: { fontSize: 36 },
  leagueName: { color: '#fff', fontSize: 18, fontWeight: '800' },
  leagueSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  leagueRight: { alignItems: 'center' },
  leagueRank: { color: '#fff', fontSize: 28, fontWeight: '800' },
  leagueRankLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
  tabs: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: RADIUS.md, padding: 3 },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: RADIUS.sm - 2 },
  tabBtnActive: { backgroundColor: COLORS.purple },
  tabText: { color: COLORS.gray, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#fff' },

  // Geral — Podium
  podiumSection: { paddingHorizontal: SPACING.md, paddingTop: SPACING.lg },
  podiumRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 16 },
  podiumItem: { alignItems: 'center', gap: 6, flex: 1 },
  podiumAvatar: { position: 'relative' },
  podiumAvatarCircle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  podiumAvatarUser: { borderWidth: 2, borderColor: '#fff' },
  podiumAvatarText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  podiumMedal: { position: 'absolute', bottom: -6, right: -4, fontSize: 18 },
  podiumName: { color: COLORS.white, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  podiumXP: { color: COLORS.gray, fontSize: 11 },
  podiumBar: { width: '90%', borderRadius: RADIUS.sm, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6 },
  podiumRank: { fontSize: 16, fontWeight: '800' },

  // Geral — List
  listSection: { paddingHorizontal: SPACING.md, marginTop: SPACING.md, gap: 8 },
  listItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: 12, gap: 10, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', marginBottom: 8 },
  listItemUser: { borderColor: 'rgba(139,92,246,0.5)' },
  rankNum: { color: COLORS.gray, fontSize: 14, fontWeight: '700', width: 28, textAlign: 'center' },
  listAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  listAvatarText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  listInfo: { flex: 1 },
  listName: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  listNameUser: { color: COLORS.purpleLight },
  listMeta: { flexDirection: 'row', gap: 8, marginTop: 2 },
  listLeague: { fontSize: 12 },
  listStreak: { color: COLORS.gray, fontSize: 11 },
  listRight: { alignItems: 'flex-end', gap: 2 },
  listXP: { color: COLORS.white, fontSize: 15, fontWeight: '800' },
  listXPLabel: { color: COLORS.gray, fontSize: 10 },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  changeText: { fontSize: 10, fontWeight: '700' },

  // Geral — Leagues Guide
  leaguesGuide: { margin: SPACING.md, backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, gap: 12 },
  guideTitle: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  guideList: { flexDirection: 'row', justifyContent: 'space-around', flexWrap: 'wrap', gap: 8 },
  guideItem: { alignItems: 'center', gap: 4 },
  guideEmoji: { fontSize: 24 },
  guideName: { fontSize: 11, fontWeight: '700' },
  currentBadge: { backgroundColor: COLORS.purple, borderRadius: RADIUS.full, paddingHorizontal: 6, paddingVertical: 2 },
  currentBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },

  // Shared social container
  socialContainer: { paddingHorizontal: SPACING.md, marginTop: SPACING.lg, paddingBottom: 8 },
  socialHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: SPACING.md, gap: 12 },
  socialTitle: { color: COLORS.white, fontSize: 22, fontWeight: '900' },
  socialSub: { color: COLORS.gray, fontSize: 13, marginTop: 3, lineHeight: 18 },
  createBtn: { backgroundColor: 'rgba(139,92,246,0.2)', borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(139,92,246,0.4)', marginTop: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: COLORS.white, marginBottom: 8 },
  emptySub:   { fontSize: 14, color: COLORS.gray, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  emptyBtn:   { backgroundColor: COLORS.purple, borderRadius: RADIUS.full, paddingHorizontal: 24, paddingVertical: 12 },
  emptyBtnText: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  createBtnText: { color: COLORS.purpleLight, fontSize: 12, fontWeight: '700' },
  socialInfoBox: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginTop: 4, gap: 6 },
  socialInfoTitle: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
  socialInfoText: { color: COLORS.gray, fontSize: 12, lineHeight: 18 },

  // Group Card
  groupCard: { backgroundColor: '#12122A', borderRadius: RADIUS.xl, padding: SPACING.md, borderWidth: 1, gap: 14, marginBottom: SPACING.md, elevation: 8, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 16, overflow: 'hidden' },
  groupTopRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  groupShieldBox: { borderRadius: RADIUS.lg, borderWidth: 2, padding: 12, alignItems: 'center', gap: 2, minWidth: 76, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 10, elevation: 8 },
  groupShieldEmoji: { fontSize: 30 },
  groupShieldNum: { fontSize: 34, fontWeight: '900', lineHeight: 36 },
  groupShieldSub: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  groupTitleBlock: { flex: 1, gap: 4 },
  groupName: { color: COLORS.white, fontSize: 18, fontWeight: '900' },
  groupFreq: { color: COLORS.grayDark, fontSize: 11 },
  groupAttendBadge: { alignSelf: 'flex-start', borderRadius: RADIUS.full, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, marginTop: 2 },
  groupAttendText: { fontSize: 12, fontWeight: '800' },
  groupMembersRow: { flexDirection: 'row', gap: 8 },
  groupMemberItem: { alignItems: 'center', gap: 5, flex: 1 },
  groupMemberRing: { borderRadius: 30, borderWidth: 2, padding: 2, backgroundColor: 'rgba(255,255,255,0.02)' },
  groupMemberAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  groupMemberText: { color: '#fff', fontSize: 19, fontWeight: '900' },
  groupMemberName: { color: COLORS.gray, fontSize: 10, textAlign: 'center', fontWeight: '700' },
  groupStatusBar: { borderRadius: RADIUS.lg, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12 },
  groupStatusText: { fontSize: 13, fontWeight: '800', textAlign: 'center' },
  groupCodeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  groupCodeLabel: { color: COLORS.gray, fontSize: 11, fontWeight: '600', flex: 1 },
  groupCodePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: RADIUS.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4 },
  groupCodeText: { fontSize: 13, fontWeight: '900', letterSpacing: 2 },

  // Enter code button (grupos & rivais)
  enterCodeBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(139,92,246,0.1)', borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(139,92,246,0.25)', marginBottom: SPACING.md },
  enterCodeBtnText: { flex: 1, color: COLORS.purpleLight, fontSize: 13, fontWeight: '700' },

  // Section subtitle
  sectionSubTitle: { color: COLORS.white, fontSize: 15, fontWeight: '800', marginBottom: SPACING.sm, marginTop: 4 },

  // Join modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
  joinCard: { backgroundColor: COLORS.bgSecondary, borderRadius: RADIUS.xl, padding: SPACING.lg, width: '100%', gap: 14, borderWidth: 1, borderColor: COLORS.border },
  joinTitle: { color: COLORS.white, fontSize: 18, fontWeight: '900', textAlign: 'center' },
  joinSub: { color: COLORS.gray, fontSize: 13, textAlign: 'center', lineHeight: 18 },
  joinInput: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 16, paddingVertical: 14, color: COLORS.white, fontSize: 22, fontWeight: '900', textAlign: 'center', letterSpacing: 6 },
  joinBtnRow: { flexDirection: 'row', gap: 10 },
  joinBtnCancel: { flex: 1, borderRadius: RADIUS.md, paddingVertical: 13, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: COLORS.border },
  joinBtnCancelText: { color: COLORS.gray, fontWeight: '700', fontSize: 14 },
  joinBtnConfirm: { flex: 1, borderRadius: RADIUS.md, paddingVertical: 13, alignItems: 'center', backgroundColor: COLORS.purple },
  joinBtnConfirmText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  // GroupCard novos estilos (gc prefix)
  gcHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  gcEmoji: { fontSize: 28, marginTop: 2 },
  gcName: { color: COLORS.white, fontSize: 17, fontWeight: '900' },
  gcRulesRow: { flexDirection: 'row', gap: 8, marginTop: 3, flexWrap: 'wrap' },
  gcRule: { color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: '600' },
  gcModeBadge: { borderRadius: RADIUS.full, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  gcModeText: { fontSize: 11, fontWeight: '800' },
  gcSharedFlame: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, paddingVertical: 8 },
  gcFlameIcon: { fontSize: 28 },
  gcFlameNum: { color: '#FCD34D', fontSize: 36, fontWeight: '900', lineHeight: 40 },
  gcFlameSub: { color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: '600' },
  gcRivalList: { gap: 8 },
  gcRivalRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: RADIUS.md, padding: 10 },
  gcRivalRowMe: { backgroundColor: 'rgba(139,92,246,0.15)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)' },
  gcRivalPos: { color: COLORS.gray, fontSize: 13, fontWeight: '900', width: 22, textAlign: 'center' },
  gcRivalRing: { borderRadius: 20, borderWidth: 2, padding: 1 },
  gcRivalAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  gcRivalName: { flex: 1, color: COLORS.white, fontSize: 13, fontWeight: '700' },
  gcRivalFlame: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  gcRivalFlameNum: { color: '#FCD34D', fontSize: 14, fontWeight: '900' },
  gcRivalFlameSub: { color: COLORS.grayDark, fontSize: 10 },
  gcDoneTag: { backgroundColor: '#10B98120', borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#10B98140' },
  gcDoneText: { color: '#10B981', fontSize: 10, fontWeight: '800' },
  gcPendTag: { backgroundColor: '#F59E0B18', borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#F59E0B35' },
  gcPendText: { color: '#F59E0B', fontSize: 10, fontWeight: '800' },
  gcResultBlock: { alignItems: 'center', gap: 8, paddingVertical: 12 },
  gcResultIcon: { fontSize: 48 },
  gcResultTitle: { fontSize: 20, fontWeight: '900', textAlign: 'center' },
  gcResultSub: { color: COLORS.gray, fontSize: 13, textAlign: 'center' },
  gcResultFlame: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  gcResultFlameEmoji: { fontSize: 24 },
  gcResultFlameNum: { color: '#FCD34D', fontSize: 28, fontWeight: '900' },
  gcResultFlameSub: { color: COLORS.gray, fontSize: 12 },
  gcWaitBlock: { alignItems: 'center', gap: 6, paddingVertical: 8 },
  gcWaitEmoji: { fontSize: 32 },
  gcWaitTitle: { color: COLORS.white, fontSize: 15, fontWeight: '800' },
  gcWaitSub: { color: COLORS.gray, fontSize: 12, textAlign: 'center', lineHeight: 17 },
  gcStartBtn: { marginTop: 4 },
  gcStartBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: RADIUS.lg, paddingVertical: 13 },
  gcStartBtnText: { color: '#fff', fontSize: 15, fontWeight: '900' },

  // Duel Card
  duelWrapper: { position: 'relative', marginBottom: SPACING.md },
  duelPulse: { ...StyleSheet.absoluteFillObject, borderRadius: RADIUS.xl + 1, borderWidth: 2, zIndex: 2 },
  duelCard: { borderRadius: RADIUS.xl, padding: SPACING.md, gap: 12, elevation: 8, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(167,139,250,0.25)' },
  duelHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  duelTitle: { color: COLORS.white, fontSize: 15, fontWeight: '900' },
  duelSubtitle: { color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 2 },
  duelTimeBadge: { borderRadius: RADIUS.full, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  duelTimeText: { fontSize: 11, fontWeight: '700' },
  duelFlameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: RADIUS.lg, paddingVertical: 10 },
  duelFlameItem: { alignItems: 'center', gap: 2 },
  duelFlameEmoji: { fontSize: 20 },
  duelFlameNum: { color: '#FCD34D', fontSize: 22, fontWeight: '900', lineHeight: 26 },
  duelFlameName: { color: COLORS.gray, fontSize: 10, fontWeight: '600' },
  duelFlameSep: { color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: '600', textAlign: 'center' },
  duelStatusBadge: { borderRadius: RADIUS.md, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  duelStatusText: { fontSize: 13, fontWeight: '800', textAlign: 'center' },
  duelArena: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: 4 },
  duelFighter: { alignItems: 'center', gap: 4, flex: 1 },
  duelRivalAvatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  duelAvatarText: { color: '#fff', fontSize: 22, fontWeight: '900' },
  duelFighterLabel: { color: COLORS.gray, fontSize: 11, fontWeight: '700' },
  duelScore: { color: COLORS.white, fontSize: 32, fontWeight: '900', lineHeight: 36 },
  duelScoreUnit: { color: COLORS.grayDark, fontSize: 10, fontWeight: '600' },
  duelVSCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)' },
  duelVSText: { fontSize: 14, fontWeight: '900' },
  duelBarsRow: { flexDirection: 'row', gap: 10 },
  duelBarTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' },
  duelBarFill: { height: '100%', borderRadius: 3 },
  duelBarLabel: { color: COLORS.grayDark, fontSize: 10, fontWeight: '700' },

  // Duo Card
  duoCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, marginBottom: SPACING.md, gap: 12 },
  duoHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  duoEmoji: { fontSize: 26, marginTop: 2 },
  duoName: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
  duoRulesRow: { flexDirection: 'row', gap: 8, marginTop: 3, flexWrap: 'wrap' },
  duoRule: { color: COLORS.gray, fontSize: 11, fontWeight: '600' },
  duoModeBadge: { borderRadius: RADIUS.full, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  duoModeText: { fontSize: 11, fontWeight: '800' },
  duoSharedFlame: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: 'rgba(255,180,0,0.08)', borderRadius: RADIUS.lg, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(255,180,0,0.2)' },
  duoSharedFlameIcon: { fontSize: 24 },
  duoSharedFlameNum: { color: '#FCD34D', fontSize: 32, fontWeight: '900', lineHeight: 36 },
  duoSharedFlameSub: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '600' },
  duoArena: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: RADIUS.lg, paddingVertical: 16, paddingHorizontal: 8 },
  duoFighter: { alignItems: 'center', gap: 4, flex: 1 },
  duoFighterRing: { borderRadius: 30, borderWidth: 2, padding: 2 },
  duoFighterAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  duoFighterAvatarText: { color: '#fff', fontSize: 20, fontWeight: '900' },
  duoFighterName: { color: COLORS.gray, fontSize: 11, fontWeight: '700' },
  duoFighterScore: { fontSize: 13, fontWeight: '800' },
  duoIndFlame: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  duoIndFlameNum: { color: '#FCD34D', fontSize: 14, fontWeight: '900' },
  duoVSBlock: { alignItems: 'center', gap: 6 },
  duoVSLabel: { fontSize: 18, fontWeight: '900' },
  duoLeadBadge: { borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3 },
  duoLeadText: { fontSize: 12, fontWeight: '900' },
  duoCheckinDone: { color: '#10B981', fontSize: 10, fontWeight: '800' },
  duoCheckinPend: { color: '#F59E0B', fontSize: 10, fontWeight: '700' },
  duoStatusBar: { borderRadius: RADIUS.md, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  duoStatusText: { fontSize: 13, fontWeight: '800', textAlign: 'center' },
  duoCodeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(139,92,246,0.08)', borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)', paddingHorizontal: 12, paddingVertical: 10 },
  duoCodeLabel: { color: COLORS.gray, fontSize: 11, fontWeight: '600', flex: 1 },
  duoCodePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(139,92,246,0.15)', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  duoCodeText: { color: COLORS.purpleLight, fontSize: 13, fontWeight: '900', letterSpacing: 2 },

  // Feed
  feedSection: { paddingHorizontal: SPACING.md, marginTop: SPACING.lg, paddingBottom: 4 },
  feedHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md },
  feedTitle: { color: COLORS.white, fontSize: 18, fontWeight: '800' },
  shareBtn: { backgroundColor: 'rgba(139,92,246,0.2)', borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(139,92,246,0.4)' },
  shareBtnText: { color: COLORS.purpleLight, fontSize: 12, fontWeight: '700' },
  feedCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, borderWidth: 1, padding: SPACING.md, marginBottom: SPACING.sm, gap: 12 },
  feedCardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  feedAvatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  feedAvatarText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  feedMeta: { flex: 1, gap: 2 },
  feedUser: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  feedTime: { color: COLORS.grayDark, fontSize: 11 },
  feedBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: RADIUS.md, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 5, maxWidth: 140 },
  feedBadgeEmoji: { fontSize: 13 },
  feedBadgeText: { fontSize: 11, fontWeight: '700', flexShrink: 1 },
  feedContent: { color: COLORS.white, fontSize: 16, fontWeight: '700', lineHeight: 22 },
  feedReactRow: { flexDirection: 'row', gap: 8 },
  feedReactBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: RADIUS.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', paddingHorizontal: 11, paddingVertical: 5 },
  feedReactEmoji: { fontSize: 14 },
  feedReactCount: { color: COLORS.grayDark, fontSize: 12, fontWeight: '600' },

});
