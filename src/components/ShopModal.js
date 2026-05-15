import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ScrollView, Alert, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS } from '../theme';
import { useUser } from '../context/UserContext';

const { height: SH } = Dimensions.get('window');

const FREEZE_OPTIONS = [
  { days: 1, gems: 7,  emoji: '🧊',     label: '1 dia',   desc: 'Protege 1 dia planejado perdido' },
  { days: 2, gems: 13, emoji: '🧊🧊',   label: '2 dias',  desc: 'Protege 2 dias planejados perdidos' },
  { days: 3, gems: 20, emoji: '🧊🧊🧊', label: '3 dias',  desc: 'Protege 3 dias planejados perdidos' },
];

const GEM_PACKAGES = [
  { id: 'p1', gems: 7,  price: 'R$ 4,99',  label: '7 gemas',  emoji: '💎' },
  { id: 'p2', gems: 20, price: 'R$ 12,99', label: '20 gemas', emoji: '💎💎', popular: true },
  { id: 'p3', gems: 50, price: 'R$ 29,90', label: '50 gemas', emoji: '💎💎💎' },
];

export default function ShopModal({ visible, onClose }) {
  const insets = useSafeAreaInsets();
  const { user, purchaseFreeze } = useUser();

  const [view,     setView]     = useState('main');
  const [selected, setSelected] = useState(null);
  const [selPkg,   setSelPkg]   = useState('p2');
  const [loading,  setLoading]  = useState(false);

  // Reset ao abrir
  useEffect(() => {
    if (visible) {
      setView('main');
      setSelected(null);
      setLoading(false);
    }
  }, [visible]);

  const gems       = user?.gems ?? 0;
  const freezeDays = user?.streakFreezeDays ?? 0;

  function selectFreeze(opt) {
    setSelected(opt);
    if (gems < opt.gems) setView('buy_gems');
    else                  setView('confirm');
  }

  async function confirmFreeze() {
    if (!selected || loading) return;
    setLoading(true);
    const result = await purchaseFreeze(selected.days);
    setLoading(false);
    if (result.success) {
      onClose();
      Alert.alert('🧊 Sequência Protegida!', `${selected.days} dia${selected.days > 1 ? 's' : ''} de congelamento ativado!`);
    }
  }

  function buyGems(pkg) {
    Alert.alert('💎 Comprar Gemas', `${pkg.label} por ${pkg.price}\n\nPagamentos online em breve!\n\nDica: ganhe gemas derrotando o chefe da semana.`);
  }

  const titleMap = { main: 'Loja', confirm: 'Confirmar', buy_gems: 'Comprar Gemas' };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={st.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />

        <View style={[st.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>

          {/* HANDLE */}
          <View style={st.handle} />

          {/* HEADER */}
          <View style={st.header}>
            <TouchableOpacity onPress={onClose} style={st.closeBtn}>
              <Ionicons name="close" size={22} color={COLORS.white} />
            </TouchableOpacity>
            <Text style={st.headerTitle}>{titleMap[view]}</Text>
            <View style={st.gemBadge}>
              <Text style={st.gemBadgeText}>💎 {gems}</Text>
            </View>
          </View>

          {/* ── MAIN ── */}
          {view === 'main' && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.scrollContent}>

              {/* Freeze ativo */}
              {freezeDays > 0 && (
                <View style={st.freezeActiveBanner}>
                  <Text style={{ fontSize: 22 }}>🧊</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={st.freezeActiveTitle}>Sequência Protegida</Text>
                    <Text style={st.freezeActiveSub}>{freezeDays} dia{freezeDays > 1 ? 's' : ''} de congelamento restante{freezeDays > 1 ? 's' : ''}</Text>
                  </View>
                </View>
              )}

              <Text style={st.sectionTitle}>🧊 Bloqueio de Sequência</Text>
              <Text style={st.sectionSub}>Proteja seu streak quando não puder treinar</Text>

              {FREEZE_OPTIONS.map(opt => {
                const hasEnough = gems >= opt.gems;
                return (
                  <TouchableOpacity key={opt.days} onPress={() => selectFreeze(opt)} activeOpacity={0.8} style={st.freezeCard}>
                    <Text style={st.freezeEmoji}>{opt.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={st.freezeLabel}>{opt.label}</Text>
                      <Text style={st.freezeDesc}>{opt.desc}</Text>
                    </View>
                    <View style={[st.gemPill, !hasEnough && st.gemPillInsuf]}>
                      <Text style={[st.gemPillText, !hasEnough && st.gemPillTextInsuf]}>💎 {opt.gems}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              <Text style={[st.sectionTitle, { marginTop: 24 }]}>💎 Como ganhar gemas</Text>
              {[
                { emoji: '👹', text: 'Derrote o chefe da semana', reward: '+2 💎' },
                { emoji: '🔥', text: 'Complete 7 dias seguidos',  reward: '+1 💎' },
                { emoji: '🏆', text: 'Suba de nível',             reward: '+1 💎' },
              ].map((item, i) => (
                <View key={i} style={st.earnRow}>
                  <Text style={{ fontSize: 18 }}>{item.emoji}</Text>
                  <Text style={st.earnText}>{item.text}</Text>
                  <Text style={st.earnReward}>{item.reward}</Text>
                </View>
              ))}

              <TouchableOpacity onPress={() => setView('buy_gems')} activeOpacity={0.85} style={{ marginTop: 20 }}>
                <LinearGradient colors={['#1E40AF', '#1D4ED8']} style={st.buyGemsBtn}>
                  <Text style={{ fontSize: 20 }}>💎</Text>
                  <Text style={st.buyGemsBtnText}>Comprar Gemas</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* ── CONFIRM ── */}
          {view === 'confirm' && selected && (
            <View style={st.confirmWrap}>
              <Text style={st.confirmEmoji}>{selected.emoji}</Text>
              <Text style={st.confirmTitle}>
                Proteja sua sequência com {selected.days} bloqueio{selected.days > 1 ? 's' : ''}!
              </Text>
              <Text style={st.confirmSub}>
                Você tem {gems} gemas. Serão gastas {selected.gems} gemas.
              </Text>
              <TouchableOpacity onPress={confirmFreeze} activeOpacity={0.85} disabled={loading}>
                <LinearGradient colors={['#2563EB', '#1D4ED8']} style={st.confirmBtn}>
                  <Text style={st.confirmBtnText}>
                    {loading ? 'Ativando...' : `ATIVAR POR 💎 ${selected.gems}`}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setView('main')} style={{ marginTop: 16 }}>
                <Text style={st.cancelText}>AGORA NÃO</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── BUY GEMS ── */}
          {view === 'buy_gems' && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.scrollContent}>
              <Text style={st.buyTitle}>Reabasteça suas gemas!</Text>
              {selected && (
                <View style={st.insuffBanner}>
                  <Ionicons name="information-circle-outline" size={16} color={COLORS.gold} />
                  <Text style={st.insuffText}>
                    Você precisa de {selected.gems} 💎, mas tem apenas {gems}.
                  </Text>
                </View>
              )}
              {GEM_PACKAGES.map(pkg => (
                <TouchableOpacity key={pkg.id} onPress={() => setSelPkg(pkg.id)} activeOpacity={0.8}>
                  <View style={[st.pkgCard, selPkg === pkg.id && st.pkgCardSelected]}>
                    {pkg.popular && (
                      <View style={st.popularBadge}>
                        <Text style={st.popularText}>POPULAR</Text>
                      </View>
                    )}
                    <Text style={{ fontSize: 22 }}>{pkg.emoji}</Text>
                    <Text style={st.pkgLabel}>{pkg.label}</Text>
                    <Text style={[st.pkgPrice, selPkg === pkg.id && { color: '#60A5FA' }]}>{pkg.price}</Text>
                    {selPkg === pkg.id && <Ionicons name="checkmark-circle" size={22} color="#60A5FA" style={{ marginLeft: 4 }} />}
                  </View>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => buyGems(GEM_PACKAGES.find(p => p.id === selPkg))}
                activeOpacity={0.85}
                style={{ marginTop: 8 }}
              >
                <LinearGradient colors={['#2563EB', '#1D4ED8']} style={st.confirmBtn}>
                  <Text style={st.confirmBtnText}>COMPRAR GEMAS</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setView('main')} style={{ marginTop: 16 }}>
                <Text style={st.cancelText}>AGORA NÃO</Text>
              </TouchableOpacity>
            </ScrollView>
          )}

        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay:      { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' },
  sheet:        { backgroundColor: '#0F0F1E', borderTopLeftRadius: 28, borderTopRightRadius: 28, minHeight: SH * 0.55, maxHeight: SH * 0.92, paddingHorizontal: SPACING.md, paddingTop: 8 },
  handle:       { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  closeBtn:     { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 18 },
  headerTitle:  { color: COLORS.white, fontSize: 17, fontWeight: '800' },
  gemBadge:     { backgroundColor: 'rgba(96,165,250,0.15)', borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(96,165,250,0.3)' },
  gemBadgeText: { color: '#60A5FA', fontSize: 13, fontWeight: '800' },
  scrollContent:{ paddingBottom: 24 },

  freezeActiveBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(30,58,95,0.8)', borderRadius: RADIUS.lg, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(96,165,250,0.3)' },
  freezeActiveTitle:  { color: '#60A5FA', fontSize: 14, fontWeight: '800' },
  freezeActiveSub:    { color: COLORS.gray, fontSize: 12, marginTop: 2 },

  sectionTitle: { color: COLORS.white, fontSize: 15, fontWeight: '800', marginBottom: 4 },
  sectionSub:   { color: COLORS.gray, fontSize: 12, marginBottom: 14 },

  freezeCard:         { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  freezeEmoji:        { fontSize: 22, width: 44, textAlign: 'center' },
  freezeLabel:        { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  freezeDesc:         { color: COLORS.gray, fontSize: 11, marginTop: 2 },
  gemPill:            { backgroundColor: 'rgba(96,165,250,0.15)', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(96,165,250,0.3)' },
  gemPillInsuf:       { backgroundColor: 'rgba(100,100,100,0.08)', borderColor: 'rgba(100,100,100,0.2)' },
  gemPillText:        { color: '#60A5FA', fontSize: 12, fontWeight: '800' },
  gemPillTextInsuf:   { color: COLORS.grayDark },

  earnRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  earnText:   { flex: 1, color: COLORS.gray, fontSize: 13 },
  earnReward: { color: '#60A5FA', fontSize: 13, fontWeight: '700' },

  buyGemsBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: RADIUS.lg, padding: 16 },
  buyGemsBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '800' },

  confirmWrap:    { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 8 },
  confirmEmoji:   { fontSize: 80, marginBottom: 20 },
  confirmTitle:   { color: COLORS.white, fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 8, lineHeight: 26 },
  confirmSub:     { color: COLORS.gray, fontSize: 13, textAlign: 'center', marginBottom: 28 },
  confirmBtn:     { borderRadius: RADIUS.lg, paddingVertical: 16, paddingHorizontal: 32, alignItems: 'center', minWidth: 260 },
  confirmBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
  cancelText:     { color: COLORS.gray, fontSize: 13, fontWeight: '700', textAlign: 'center', letterSpacing: 0.5 },

  buyTitle:      { color: COLORS.white, fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 16 },
  insuffBanner:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: RADIUS.md, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' },
  insuffText:    { color: COLORS.gold, fontSize: 12, flex: 1 },
  pkgCard:       { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  pkgCardSelected: { borderColor: '#60A5FA', backgroundColor: 'rgba(96,165,250,0.08)' },
  popularBadge:  { position: 'absolute', top: -9, left: 14, backgroundColor: '#2563EB', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  popularText:   { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  pkgLabel:      { flex: 1, color: COLORS.white, fontSize: 15, fontWeight: '700' },
  pkgPrice:      { color: COLORS.gray, fontSize: 14, fontWeight: '600' },
});
