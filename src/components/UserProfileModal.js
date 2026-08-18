import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, Image, ActivityIndicator, Alert, Linking } from 'react-native';
import TouchableOpacity from './TouchableOpacity';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircleIcon, ClockIcon, FireIcon, FlagIcon, LightningIcon, ProhibitIcon, UserPlusIcon, XIcon } from 'phosphor-react-native';
import { COLORS, SPACING, RADIUS } from '../theme';
import { computeLeague } from '../services/userService';
import { getFriendshipStatus, sendFriendRequest, acceptFriendRequest } from '../services/socialService';
import { useUser } from '../context/UserContext';

const SUPPORT_EMAIL = 'jacksondeandradee@gmail.com';

export default function UserProfileModal({ visible, targetUser, currentUserId, onClose }) {
  const { blockedIds, doBlockUser } = useUser();
  const [status,    setStatus]    = useState('loading');
  const [requestId, setRequestId] = useState(null);
  const [busy,      setBusy]      = useState(false);
  const [blocking,  setBlocking]  = useState(false);

  useEffect(() => {
    if (!visible || !targetUser?.id) return;
    setStatus('loading');
    getFriendshipStatus(currentUserId, targetUser.id)
      .then(r => { setStatus(r.status); setRequestId(r.id ?? null); })
      .catch(() => setStatus('none'));
  }, [visible, targetUser?.id, currentUserId]);

  if (!targetUser) return null;

  const xp     = targetUser.xp ?? 0;
  const streak = targetUser.streak ?? targetUser.streak_count ?? targetUser.challengeStreak ?? 0;
  const league = computeLeague(xp);
  const letter = targetUser.name?.[0]?.toUpperCase() ?? '?';

  const handleAdd = async () => {
    setBusy(true);
    try {
      const res = await sendFriendRequest(currentUserId, targetUser.id);
      if (res.already) {
        setStatus(res.status === 'accepted' ? 'accepted' : 'pending_sent');
      } else {
        setStatus('pending_sent');
      }
    } catch (_) {
      Alert.alert('Erro', 'Não foi possível enviar o pedido agora.');
    } finally {
      setBusy(false);
    }
  };

  const handleAccept = async () => {
    if (!requestId) return;
    setBusy(true);
    try {
      await acceptFriendRequest(requestId, currentUserId);
      setStatus('accepted');
    } catch (_) {
      Alert.alert('Erro', 'Não foi possível aceitar o pedido agora.');
    } finally {
      setBusy(false);
    }
  };

  const handleBlock = () => {
    Alert.alert(
      'Bloquear usuário',
      `${targetUser.name} não vai mais aparecer no seu feed, ranking ou perfil, e a amizade (se houver) será desfeita. Você pode desbloquear depois em Configurações.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Bloquear',
          style: 'destructive',
          onPress: async () => {
            setBlocking(true);
            try {
              await doBlockUser(targetUser.id);
              onClose?.();
            } catch (_) {
              Alert.alert('Erro', 'Não foi possível bloquear agora. Tente novamente.');
            } finally {
              setBlocking(false);
            }
          },
        },
      ]
    );
  };

  const handleReport = () => {
    const subject = encodeURIComponent('Denúncia de usuário — CapiFit');
    const body = encodeURIComponent(`Estou denunciando o usuário "${targetUser.name}" (ID: ${targetUser.id}).\n\nMotivo:\n`);
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`)
      .catch(() => Alert.alert('Erro', 'Não foi possível abrir o app de email.'));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.card}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <XIcon size={18} color={COLORS.gray} weight="bold" />
          </TouchableOpacity>

          {targetUser.avatar_url ? (
            <Image source={{ uri: targetUser.avatar_url }} style={styles.avatar} />
          ) : (
            <LinearGradient colors={['#A855F7', '#EC4899']} style={styles.avatar}>
              <Text style={styles.avatarText}>{letter}</Text>
            </LinearGradient>
          )}

          <Text style={styles.name}>{targetUser.name}</Text>
          <View style={[styles.leagueBadge, { borderColor: league.color ? league.color + '55' : 'rgba(168, 85, 247,0.4)' }]}>
            <Text style={styles.leagueText}>{league.emoji} Liga {league.league}</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <LightningIcon size={16} color={COLORS.purpleLight} weight="fill" />
              <Text style={styles.statValue}>{xp.toLocaleString()}</Text>
              <Text style={styles.statLabel}>XP</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <FireIcon size={16} color="#F97316" weight="fill" />
              <Text style={styles.statValue}>{streak}</Text>
              <Text style={styles.statLabel}>dias</Text>
            </View>
          </View>

          {status === 'loading' && <ActivityIndicator color={COLORS.purpleLight} style={{ marginTop: 18 }} />}

          {status === 'none' && (
            <TouchableOpacity onPress={handleAdd} disabled={busy} activeOpacity={0.9} style={{ width: '100%', marginTop: 18 }}>
              <LinearGradient colors={['#A855F7', '#7E22CE']} style={styles.actionBtn}>
                {busy ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <UserPlusIcon size={18} color="#fff" weight="fill" />
                    <Text style={styles.actionBtnText}>Adicionar amigo</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}

          {status === 'pending_sent' && (
            <View style={[styles.pill, { marginTop: 18 }]}>
              <ClockIcon size={14} color={COLORS.gray} weight="regular" />
              <Text style={styles.pillText}>Pedido enviado</Text>
            </View>
          )}

          {status === 'pending_received' && (
            <TouchableOpacity onPress={handleAccept} disabled={busy} activeOpacity={0.9} style={{ width: '100%', marginTop: 18 }}>
              <LinearGradient colors={['#10E88C', '#047857']} style={styles.actionBtn}>
                {busy ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <CheckCircleIcon size={18} color="#fff" weight="fill" />
                    <Text style={styles.actionBtnText}>Aceitar pedido de amizade</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}

          {status === 'accepted' && (
            <View style={[styles.pill, { marginTop: 18, backgroundColor: 'rgba(16, 232, 140,0.15)', borderColor: 'rgba(16, 232, 140,0.4)' }]}>
              <CheckCircleIcon size={14} color={COLORS.green} weight="fill" />
              <Text style={[styles.pillText, { color: COLORS.green }]}>Vocês são amigos</Text>
            </View>
          )}

          {targetUser.id !== currentUserId && !blockedIds?.includes(targetUser.id) && (
            <View style={styles.moderationRow}>
              <TouchableOpacity onPress={handleReport} activeOpacity={0.7} style={styles.moderationBtn} disabled={blocking}>
                <FlagIcon size={13} color={COLORS.gray} weight="regular" />
                <Text style={styles.moderationText}>Denunciar</Text>
              </TouchableOpacity>
              <View style={styles.moderationDivider} />
              <TouchableOpacity onPress={handleBlock} activeOpacity={0.7} style={styles.moderationBtn} disabled={blocking}>
                {blocking ? <ActivityIndicator size="small" color={COLORS.red} /> : (
                  <>
                    <ProhibitIcon size={13} color={COLORS.red} weight="regular" />
                    <Text style={[styles.moderationText, { color: COLORS.red }]}>Bloquear usuário</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  card: { width: '100%', maxWidth: 340, backgroundColor: '#1A1A2E', borderRadius: RADIUS.xl, padding: SPACING.lg, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(168, 85, 247,0.35)' },
  closeBtn: { position: 'absolute', top: 14, right: 14, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  avatarText: { color: '#fff', fontSize: 30, fontWeight: '800' },
  name: { color: COLORS.white, fontSize: 18, fontWeight: '800', marginTop: 12 },
  leagueBadge: { borderRadius: RADIUS.full, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 5, marginTop: 8, backgroundColor: 'rgba(168, 85, 247,0.12)' },
  leagueText: { color: COLORS.purpleLight, fontSize: 12, fontWeight: '700' },
  statsRow: { flexDirection: 'row', alignItems: 'center', width: '100%', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: RADIUS.md, padding: 14, marginTop: 16 },
  statBox: { flex: 1, alignItems: 'center', gap: 3 },
  statValue: { color: COLORS.white, fontSize: 17, fontWeight: '800' },
  statLabel: { color: COLORS.gray, fontSize: 11 },
  statDivider: { width: 1, height: 28, backgroundColor: COLORS.border },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: RADIUS.lg, paddingVertical: 14 },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 16, paddingVertical: 10 },
  pillText: { color: COLORS.gray, fontSize: 13, fontWeight: '700' },

  moderationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 16 },
  moderationBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 4 },
  moderationText: { color: COLORS.gray, fontSize: 12, fontWeight: '600' },
  moderationDivider: { width: 1, height: 12, backgroundColor: COLORS.border },
});
