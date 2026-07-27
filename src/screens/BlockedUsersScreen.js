import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, ActivityIndicator, Alert } from 'react-native';
import TouchableOpacity from '../components/TouchableOpacity';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeftIcon, ProhibitIcon, UserMinusIcon } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS } from '../theme';
import { useUser } from '../context/UserContext';
import { getBlockedUsers } from '../services/socialService';

export default function BlockedUsersScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, doUnblockUser } = useUser();
  const [blocked, setBlocked] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId,  setBusyId]  = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    getBlockedUsers(user.id)
      .then(setBlocked)
      .catch(e => console.warn('[BlockedUsersScreen] falha ao carregar:', e.message))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const handleUnblock = (target) => {
    Alert.alert(
      'Desbloquear usuário',
      `${target.name} vai voltar a aparecer no ranking e no feed.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desbloquear',
          onPress: async () => {
            setBusyId(target.id);
            try {
              await doUnblockUser(target.id);
              setBlocked(prev => prev.filter(u => u.id !== target.id));
            } catch (_) {
              Alert.alert('Erro', 'Não foi possível desbloquear agora.');
            } finally {
              setBusyId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeftIcon size={20} color={COLORS.white} weight="regular" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Usuários bloqueados</Text>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.purpleLight} style={{ marginTop: 40 }} />
      ) : blocked.length === 0 ? (
        <View style={styles.emptyState}>
          <ProhibitIcon size={40} color={COLORS.grayDark} weight="regular" />
          <Text style={styles.emptyTitle}>Nenhum usuário bloqueado</Text>
          <Text style={styles.emptySub}>Usuários que você bloquear vão aparecer aqui.</Text>
        </View>
      ) : (
        <FlatList
          data={blocked}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: SPACING.md, paddingBottom: 40 }}
          renderItem={({ item }) => (
            <View style={styles.row}>
              {item.avatar_url ? (
                <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
              ) : (
                <LinearGradient colors={['#8B5CF6', '#EC4899']} style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.name?.[0]?.toUpperCase() ?? '?'}</Text>
                </LinearGradient>
              )}
              <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
              <TouchableOpacity
                style={styles.unblockBtn}
                onPress={() => handleUnblock(item)}
                disabled={busyId === item.id}
                activeOpacity={0.8}
              >
                {busyId === item.id ? <ActivityIndicator size="small" color={COLORS.purpleLight} /> : (
                  <>
                    <UserMinusIcon size={14} color={COLORS.purpleLight} weight="regular" />
                    <Text style={styles.unblockText}>Desbloquear</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingBottom: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  headerTitle: { color: COLORS.white, fontSize: 17, fontWeight: '800' },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, gap: 8 },
  emptyTitle: { color: COLORS.white, fontSize: 15, fontWeight: '700', marginTop: 8 },
  emptySub: { color: COLORS.gray, fontSize: 13, textAlign: 'center' },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.card, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: 12, marginBottom: 8 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  rowName: { flex: 1, color: COLORS.white, fontSize: 14, fontWeight: '700' },
  unblockBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(139,92,246,0.12)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.35)', borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 7 },
  unblockText: { color: COLORS.purpleLight, fontSize: 12, fontWeight: '700' },
});
