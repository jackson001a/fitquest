import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  FlatList, Alert, Share, ActivityIndicator, Image,
} from 'react-native';
import TouchableOpacity from '../components/TouchableOpacity';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeftIcon, CheckCircleIcon, CheckIcon, EnvelopeSimpleIcon, FireIcon, LightningIcon, MagnifyingGlassIcon, ShareIcon, UserPlusIcon, UsersIcon, XIcon } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS } from '../theme';
import { useUser } from '../context/UserContext';
import {
  searchUsers, sendFriendRequest, acceptFriendRequest,
  declineFriendRequest, getPendingRequests, getFriends,
  addFriendByCode, buildInviteLink, shareExternal, buildShareText,
} from '../services/socialService';

export default function FriendsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useUser();

  const [tab,         setTab]         = useState('amigos');   // 'amigos' | 'buscar' | 'pedidos'
  const [query,       setQuery]       = useState('');
  const [results,     setResults]     = useState([]);
  const [friends,     setFriends]     = useState([]);
  const [pending,     setPending]     = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [codeInput,   setCodeInput]   = useState('');
  const [sentRequests, setSentRequests] = useState(new Set());

  const myInviteLink = user?.id ? buildInviteLink(user.user_code ?? '??????') : '';

  // ─── Carrega amigos e pedidos ─────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [f, p] = await Promise.all([
        getFriends(user.id),
        getPendingRequests(user.id),
      ]);
      setFriends(f);
      setPending(p);
    } catch (_) {}
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Busca ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await searchUsers(query, user?.id);
        setResults(r);
      } catch (_) {}
    }, 400);
    return () => clearTimeout(t);
  }, [query, user?.id]);

  // ─── Ações ────────────────────────────────────────────────────────────────
  async function handleAddByCode() {
    if (!codeInput || codeInput.length < 6) {
      Alert.alert('Código inválido', 'Digite o código de 6 letras do seu amigo.');
      return;
    }
    try {
      const res = await addFriendByCode(user.id, codeInput);
      if (res.already) {
        Alert.alert('Atenção', res.status === 'accepted' ? 'Vocês já são amigos!' : 'Pedido já enviado.');
      } else {
        Alert.alert('✅ Pedido enviado!', 'Seu amigo vai receber a notificação.');
        setCodeInput('');
      }
    } catch (e) {
      Alert.alert('Erro', e.message);
    }
  }

  async function handleSendRequest(targetId, targetName) {
    if (sentRequests.has(targetId)) return;
    try {
      const res = await sendFriendRequest(user.id, targetId);
      if (res.already) {
        Alert.alert('Atenção', res.status === 'accepted' ? 'Já são amigos!' : 'Pedido já enviado.');
      } else {
        setSentRequests(prev => new Set([...prev, targetId]));
        Alert.alert('✅ Pedido enviado!', `Você convidou ${targetName}.`);
      }
    } catch (_) {
      Alert.alert('Erro', 'Não foi possível enviar o pedido.');
    }
  }

  async function handleAccept(id) {
    try {
      await acceptFriendRequest(id);
      await loadData();
    } catch (_) {}
  }

  async function handleDecline(id) {
    try {
      await declineFriendRequest(id);
      await loadData();
    } catch (_) {}
  }

  async function handleShareLink() {
    await shareExternal(
      buildShareText(user, 'default', ''),
      myInviteLink,
    );
  }

  // ─── Render helpers ───────────────────────────────────────────────────────
  function UserRow({ u, action }) {
    const avatar = u.name?.[0]?.toUpperCase() ?? '?';
    return (
      <View style={styles.userRow}>
        {u.avatar_url ? (
          <Image source={{ uri: u.avatar_url }} style={styles.avatar} />
        ) : (
          <LinearGradient colors={['#8B5CF6', '#6D28D9']} style={styles.avatar}>
            <Text style={styles.avatarText}>{avatar}</Text>
          </LinearGradient>
        )}
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{u.name}</Text>
          <View style={styles.iconLabelRow}>
            <LightningIcon size={11} color={COLORS.gray} weight="fill" />
            <Text style={styles.userSub}>{u.xp ?? 0} XP</Text>
            <Text style={styles.userSub}>  •  </Text>
            <FireIcon size={11} color={COLORS.gray} weight="fill" />
            <Text style={styles.userSub}>{u.streak_count ?? 0} dias</Text>
          </View>
        </View>
        {action}
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeftIcon size={22} color={COLORS.white}  weight="regular" />
        </TouchableOpacity>
        <Text style={styles.title}>Amigos</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Meu código de convite */}
      <LinearGradient colors={['#2D1B69', '#1A1A2E']} style={styles.codeCard}>
        <View style={styles.codeRow}>
          <View>
            <Text style={styles.codeLabel}>Meu código de convite</Text>
            <Text style={styles.codeValue}>{user?.user_code ?? '------'}</Text>
          </View>
          <TouchableOpacity style={styles.shareCodeBtn} onPress={handleShareLink} activeOpacity={0.8}>
            <ShareIcon size={18} color={COLORS.purpleLight}  weight="regular" />
            <Text style={styles.shareCodeText}>Compartilhar</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabs}>
        {['amigos', 'buscar', 'pedidos'].map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'pedidos' ? `Pedidos${pending.length ? ` (${pending.length})` : ''}` : t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Conteúdo por tab */}
      {tab === 'amigos' && (
        <FlatList
          data={friends}
          keyExtractor={f => f.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <UsersIcon size={36} color={COLORS.gray} weight="regular" style={styles.emptyEmoji} />
              <Text style={styles.emptyTitle}>Nenhum amigo ainda</Text>
              <Text style={styles.emptySub}>Busque pelo nome ou compartilhe seu código para adicionar amigos.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <UserRow u={item} action={
              <View style={styles.friendBadge}>
                <CheckCircleIcon size={20} color={COLORS.green}  weight="fill" />
              </View>
            } />
          )}
        />
      )}

      {tab === 'buscar' && (
        <View style={{ flex: 1 }}>
          <View style={styles.searchBox}>
            <MagnifyingGlassIcon size={18} color={COLORS.gray}  weight="bold" />
            <TextInput
              style={styles.searchInput}
              placeholder="Nome ou código de 6 letras..."
              placeholderTextColor={COLORS.gray}
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
            />
          </View>

          {/* Adicionar por código */}
          <View style={styles.codeInputRow}>
            <TextInput
              style={styles.codeInput}
              placeholder="Código (ex: ABC123)"
              placeholderTextColor={COLORS.gray}
              value={codeInput}
              onChangeText={t => setCodeInput(t.toUpperCase())}
              maxLength={6}
              autoCapitalize="characters"
            />
            <TouchableOpacity style={styles.addCodeBtn} onPress={handleAddByCode} activeOpacity={0.8}>
              <Text style={styles.addCodeBtnText}>Adicionar</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={results}
            keyExtractor={r => r.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <UserRow u={item} action={
                sentRequests.has(item.id)
                  ? <View style={styles.sentBadge}><Text style={styles.sentText}>Enviado</Text></View>
                  : <TouchableOpacity style={styles.addBtn} activeOpacity={0.8}
                      onPress={() => handleSendRequest(item.id, item.name)}>
                      <UserPlusIcon size={16} color={COLORS.white}  weight="fill" />
                    </TouchableOpacity>
              } />
            )}
          />
        </View>
      )}

      {tab === 'pedidos' && (
        <FlatList
          data={pending}
          keyExtractor={p => p.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <EnvelopeSimpleIcon size={36} color={COLORS.gray} weight="regular" style={styles.emptyEmoji} />
              <Text style={styles.emptyTitle}>Nenhum pedido pendente</Text>
            </View>
          }
          renderItem={({ item }) => {
            const u = item.users;
            return (
              <UserRow u={u} action={
                <View style={styles.requestBtns}>
                  <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(item.id)}>
                    <CheckIcon size={18} color={COLORS.white}  weight="bold" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.declineBtn} onPress={() => handleDecline(item.id)}>
                    <XIcon size={18} color={COLORS.white}  weight="bold" />
                  </TouchableOpacity>
                </View>
              } />
            );
          }}
        />
      )}

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={COLORS.purple} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: COLORS.bg },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: 12 },
  backBtn:     { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title:       { fontSize: 20, fontWeight: '800', color: COLORS.white },
  codeCard:    { marginHorizontal: SPACING.md, borderRadius: RADIUS.lg, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)' },
  codeRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  codeLabel:   { color: COLORS.gray, fontSize: 12, fontWeight: '600', marginBottom: 4 },
  codeValue:   { color: COLORS.white, fontSize: 28, fontWeight: '900', letterSpacing: 4 },
  shareCodeBtn:{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(139,92,246,0.2)', borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(139,92,246,0.4)' },
  shareCodeText:{ color: COLORS.purpleLight, fontSize: 13, fontWeight: '700' },
  tabs:        { flexDirection: 'row', marginHorizontal: SPACING.md, marginVertical: 8, backgroundColor: COLORS.bgSecondary, borderRadius: RADIUS.lg, padding: 4 },
  tab:         { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: RADIUS.md },
  tabActive:   { backgroundColor: COLORS.purple },
  tabText:     { color: COLORS.gray, fontSize: 13, fontWeight: '600' },
  tabTextActive:{ color: COLORS.white, fontWeight: '700' },
  list:        { paddingHorizontal: SPACING.md, paddingVertical: 4 },
  userRow:     { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  avatar:      { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText:  { color: COLORS.white, fontSize: 18, fontWeight: '800' },
  userInfo:    { flex: 1, marginLeft: 12 },
  userName:    { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  userSub:     { color: COLORS.gray, fontSize: 12, marginTop: 2 },
  iconLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  addBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.purple, alignItems: 'center', justifyContent: 'center' },
  friendBadge: { padding: 4 },
  sentBadge:   { backgroundColor: COLORS.border, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 5 },
  sentText:    { color: COLORS.gray, fontSize: 11, fontWeight: '600' },
  requestBtns: { flexDirection: 'row', gap: 8 },
  acceptBtn:   { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.green, alignItems: 'center', justifyContent: 'center' },
  declineBtn:  { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.red, alignItems: 'center', justifyContent: 'center' },
  searchBox:   { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: RADIUS.lg, marginHorizontal: SPACING.md, marginBottom: 8, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.border, gap: 8 },
  searchInput: { flex: 1, color: COLORS.white, fontSize: 15 },
  codeInputRow:{ flexDirection: 'row', marginHorizontal: SPACING.md, marginBottom: 8, gap: 8 },
  codeInput:   { flex: 1, backgroundColor: COLORS.card, borderRadius: RADIUS.lg, paddingHorizontal: 14, paddingVertical: 10, color: COLORS.white, fontSize: 16, fontWeight: '700', letterSpacing: 3, borderWidth: 1, borderColor: COLORS.border },
  addCodeBtn:  { backgroundColor: COLORS.purple, borderRadius: RADIUS.lg, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  addCodeBtnText:{ color: COLORS.white, fontWeight: '700', fontSize: 13 },
  empty:       { alignItems: 'center', paddingVertical: 48 },
  emptyEmoji:  { fontSize: 48, marginBottom: 12 },
  emptyTitle:  { color: COLORS.white, fontSize: 17, fontWeight: '800', marginBottom: 8 },
  emptySub:    { color: COLORS.gray, fontSize: 13, textAlign: 'center', paddingHorizontal: 24 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
});
