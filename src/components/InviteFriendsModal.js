import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, ActivityIndicator, FlatList, Image, Alert } from 'react-native';
import TouchableOpacity from './TouchableOpacity';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircleIcon, UserPlusIcon, UsersIcon, XIcon } from 'phosphor-react-native';
import { COLORS, SPACING, RADIUS } from '../theme';
import { getFriends, inviteFriendToSquad } from '../services/socialService';

// ─── Modal: convidar amigos direto pra um grupo/dupla (sem precisar de código) ──
export default function InviteFriendsModal({ visible, onClose, squad, currentUserId, maxMembers }) {
  const [friends,    setFriends]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [invitedIds, setInvitedIds] = useState(new Set());
  const [sendingId,  setSendingId]  = useState(null);

  useEffect(() => {
    if (!visible || !currentUserId) return;
    setLoading(true);
    getFriends(currentUserId).then(setFriends).catch(() => setFriends([])).finally(() => setLoading(false));
  }, [visible, currentUserId]);

  const handleInvite = async (friend) => {
    setSendingId(friend.id);
    try {
      const res = await inviteFriendToSquad(squad.id, currentUserId, friend.id);
      setInvitedIds(prev => new Set([...prev, friend.id]));
      if (res.already) Alert.alert('Já convidado', `${friend.name} já tem um convite pendente para este desafio.`);
    } catch (e) {
      Alert.alert('Erro', e.message ?? 'Não foi possível enviar o convite.');
    } finally {
      setSendingId(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Convidar amigos</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <XIcon size={20} color={COLORS.gray} weight="bold" />
            </TouchableOpacity>
          </View>
          <Text style={styles.sub}>
            {maxMembers ? `Até ${maxMembers} pessoas nesse desafio. ` : ''}Escolha quem você quer chamar — a pessoa recebe o convite direto no app.
          </Text>

          {loading ? (
            <ActivityIndicator color={COLORS.purpleLight} style={{ marginTop: 30, marginBottom: 30 }} />
          ) : friends.length === 0 ? (
            <View style={styles.empty}>
              <UsersIcon size={32} color={COLORS.gray} weight="regular" />
              <Text style={styles.emptyText}>Você ainda não tem amigos adicionados.{'\n'}Adicione amigos na aba Ranking → Amigos.</Text>
            </View>
          ) : (
            <FlatList
              data={friends}
              keyExtractor={f => f.id}
              style={{ maxHeight: 340 }}
              renderItem={({ item }) => {
                const invited = invitedIds.has(item.id);
                const letter = item.name?.[0]?.toUpperCase() ?? '?';
                return (
                  <View style={styles.row}>
                    {item.avatar_url ? (
                      <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
                    ) : (
                      <LinearGradient colors={['#8B5CF6', '#6D28D9']} style={styles.avatar}>
                        <Text style={styles.avatarText}>{letter}</Text>
                      </LinearGradient>
                    )}
                    <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                    {invited ? (
                      <View style={styles.invitedBadge}>
                        <CheckCircleIcon size={14} color={COLORS.green} weight="fill" />
                        <Text style={styles.invitedBadgeText}>Convidado</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.inviteBtn}
                        activeOpacity={0.8}
                        disabled={sendingId === item.id}
                        onPress={() => handleInvite(item)}
                      >
                        {sendingId === item.id
                          ? <ActivityIndicator size="small" color="#fff" />
                          : (
                            <>
                              <UserPlusIcon size={13} color="#fff" weight="fill" />
                              <Text style={styles.inviteBtnText}>Convidar</Text>
                            </>
                          )}
                      </TouchableOpacity>
                    )}
                  </View>
                );
              }}
            />
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  card: { backgroundColor: '#1A1A2E', borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.lg, paddingBottom: 32, borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  title: { color: COLORS.white, fontSize: 17, fontWeight: '800' },
  sub: { color: COLORS.gray, fontSize: 12, lineHeight: 17, marginBottom: 16 },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 30 },
  emptyText: { color: COLORS.gray, fontSize: 13, textAlign: 'center', lineHeight: 19 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  name: { flex: 1, color: COLORS.white, fontSize: 14, fontWeight: '700' },
  inviteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.purple, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 8, minWidth: 96, justifyContent: 'center' },
  inviteBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  invitedBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(16,185,129,0.15)', borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(16,185,129,0.35)' },
  invitedBadgeText: { color: COLORS.green, fontSize: 12, fontWeight: '700' },
});
