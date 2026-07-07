import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Animated, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS } from '../theme';
import { flameTiers } from '../data/mockData';
import { useUser } from '../context/UserContext';
import { fetchUserAchievements } from '../services/achievementService';

const { width } = Dimensions.get('window');
const CARD_W = (width - SPACING.md * 2 - 12) / 2;

const CATEGORIES = [
  { key: 'todos',    label: 'Todos',    emoji: '🏅' },
  { key: 'streak',   label: 'Streak',   emoji: '🔥' },
  { key: 'treinos',  label: 'Treinos',  emoji: '💪' },
  { key: 'xp',       label: 'XP',       emoji: '⚡' },
  { key: 'especial', label: 'Especial', emoji: '👑' },
];

// ─── ACHIEVEMENT CARD ─────────────────────────────────────────────────────────
function AchievementCard({ a, index }) {
  const scale    = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;
  const pct      = a.progress != null ? Math.min(100, Math.round((a.progress / a.total) * 100)) : null;

  useEffect(() => {
    Animated.spring(scale, { toValue: 1, delay: index * 40, friction: 6, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (!a.unlocked) return;
    Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1,   duration: 1400, useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 0.4, duration: 1400, useNativeDriver: true }),
    ])).start();
  }, [a.unlocked]);

  const onPress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.92, duration: 70, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
  };

  return (
    <Animated.View style={[s.cardWrap, { transform: [{ scale }] }]}>
      <TouchableOpacity onPress={onPress} activeOpacity={1}>
        <LinearGradient
          colors={a.unlocked
            ? [a.color + '40', a.color + '18', '#0D0D22']
            : ['#13132B', '#0A0A18']}
          style={[s.card, {
            borderColor: a.unlocked ? a.color + '80' : 'rgba(255,255,255,0.07)',
            shadowColor: a.unlocked ? a.color : 'transparent',
          }]}
        >
          {a.unlocked && (
            <Animated.View pointerEvents="none"
              style={[StyleSheet.absoluteFill, {
                borderRadius: RADIUS.xl, backgroundColor: a.color + '08', opacity: glowAnim,
              }]} />
          )}

          <View style={s.cardTop}>
            <LinearGradient
              colors={a.unlocked ? [a.color + '60', a.color + '28'] : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
              style={s.emojiBox}
            >
              <Text style={[s.emoji, !a.unlocked && { opacity: 0.25 }]}>{a.emoji}</Text>
            </LinearGradient>
            {a.unlocked
              ? <LinearGradient colors={[a.color, a.color + 'AA']} style={s.checkBadge}>
                  <Ionicons name="checkmark" size={10} color="#fff" />
                </LinearGradient>
              : <View style={s.lockBadge}>
                  <Ionicons name="lock-closed" size={9} color="rgba(255,255,255,0.25)" />
                </View>
            }
          </View>

          <Text style={[s.cardName, { color: a.unlocked ? '#fff' : 'rgba(255,255,255,0.3)' }]} numberOfLines={1}>
            {a.name}
          </Text>
          <Text style={[s.cardDesc, { color: a.unlocked ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.18)' }]} numberOfLines={2}>
            {a.desc ?? a.description}
          </Text>

          {!a.unlocked && pct != null && (
            <View style={s.progressWrap}>
              <View style={s.progressBg}>
                <LinearGradient
                  colors={[a.color, a.color + '55']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={[s.progressFill, { width: `${pct}%` }]}
                />
              </View>
              <Text style={[s.progressPct, { color: a.color }]}>{pct}%</Text>
            </View>
          )}

          {a.unlocked && a.unlockedAt && (
            <Text style={[s.unlockedDate, { color: a.color + 'BB' }]}>✓ {a.unlockedAt}</Text>
          )}

          <View style={[s.xpPill, {
            backgroundColor: a.unlocked ? a.color + '28' : 'rgba(255,255,255,0.04)',
            borderColor:      a.unlocked ? a.color + '55' : 'rgba(255,255,255,0.07)',
          }]}>
            <Text style={[s.xpText, { color: a.unlocked ? a.color : 'rgba(255,255,255,0.2)' }]}>
              ⚡ +{a.xpReward} XP
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── NEXT TARGET CARD ─────────────────────────────────────────────────────────
function NextCard({ a }) {
  const pct     = Math.min(100, Math.round((a.progress / a.total) * 100));
  const barAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(barAnim, { toValue: pct / 100, duration: 900, useNativeDriver: false }).start();
  }, []);

  return (
    <LinearGradient
      colors={[a.color + '18', a.color + '08', '#0A0A18']}
      style={[s.nextCard, { borderColor: a.color + '40' }]}
    >
      <LinearGradient colors={[a.color + '50', a.color + '20']} style={s.nextEmoji}>
        <Text style={{ fontSize: 26 }}>{a.emoji}</Text>
      </LinearGradient>

      <View style={s.nextBody}>
        <View style={s.nextTopRow}>
          <Text style={s.nextName}>{a.name}</Text>
          <Text style={[s.nextPct, { color: a.color }]}>{pct}%</Text>
        </View>
        {(a.desc ?? a.description) && (
          <Text style={s.nextDesc} numberOfLines={1}>{a.desc ?? a.description}</Text>
        )}
        <View style={s.nextBarBg}>
          <Animated.View style={[s.nextBarFill, {
            width: barAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            backgroundColor: a.color,
          }]} />
        </View>
        <Text style={s.nextProgress}>{a.progress} / {a.total}</Text>
      </View>

      <LinearGradient colors={[a.color + '35', a.color + '15']} style={s.nextXP}>
        <Text style={[s.nextXPNum, { color: a.color }]}>+{a.xpReward}</Text>
        <Text style={s.nextXPLabel}>XP</Text>
      </LinearGradient>
    </LinearGradient>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function AchievementsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const [activeCat,    setActiveCat]    = useState('todos');
  const [achievements, setAchievements] = useState([]);
  const fireScale  = useRef(new Animated.Value(1)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;
  const headerY    = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    if (!user?.id) return;
    fetchUserAchievements(user.id).then(data => {
      setAchievements((data ?? []).map(a => ({
        ...a,
        xpReward: a.xp_reward ?? 0,
        total:    a.condition_value ?? 1,
      })));
    });
  }, [user?.id, user?.streak, user?.totalWorkouts, user?.xp]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(headerY,    { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
    Animated.loop(Animated.sequence([
      Animated.timing(fireScale, { toValue: 1.28, duration: 900, useNativeDriver: true }),
      Animated.timing(fireScale, { toValue: 1,    duration: 900, useNativeDriver: true }),
    ])).start();
  }, []);

  const streak      = user?.streak ?? 0;
  const currentTier = flameTiers.reduce((prev, t) => streak >= t.min ? t : prev);
  const nextTier    = flameTiers.find(t => t.min > streak);
  const tierPct     = nextTier
    ? ((streak - currentTier.min) / (nextTier.min - currentTier.min)) * 100
    : 100;

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount    = achievements.length;
  const overallPct    = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  const nextTargets = achievements
    .filter(a => !a.unlocked && a.condition_type !== 'manual' && (a.progress ?? 0) > 0)
    .map(a => ({ ...a, progress: a.progress ?? 0, total: a.condition_value ?? 1 }))
    .sort((a, b) => (b.progress / b.total) - (a.progress / a.total))
    .slice(0, 3);

  const filtered = activeCat === 'todos'
    ? achievements
    : achievements.filter(a => a.category === activeCat);

  const unlocked = filtered.filter(a => a.unlocked);
  const locked   = filtered.filter(a => !a.unlocked);

  return (
    <View style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* HEADER */}
        <LinearGradient
          colors={[currentTier.gradient[0], currentTier.gradient[1], '#0A0A18']}
          style={[s.header, { paddingTop: insets.top + 16 }]}
        >
          <View style={s.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.headerLabel}>CONQUISTAS</Text>
              <Text style={s.headerTitle}>Sua Jornada</Text>
            </View>
            <View style={[s.headerBadge, { borderColor: currentTier.color + '60', backgroundColor: currentTier.color + '20' }]}>
              <Text style={[s.headerBadgeNum, { color: currentTier.color }]}>{unlockedCount}</Text>
              <Text style={[s.headerBadgeSlash, { color: currentTier.color + '80' }]}>/{totalCount}</Text>
            </View>
          </View>

          <View style={s.statsRow}>
            {[
              { emoji: '🔥', val: streak, lbl: 'dias', color: currentTier.color, anim: true },
              { emoji: '⚡', val: (user?.xp ?? 0).toLocaleString(), lbl: 'XP total', color: '#FCD34D' },
              { emoji: '💪', val: user?.totalWorkouts ?? 0, lbl: 'treinos', color: '#A78BFA' },
              { emoji: '🏅', val: `${overallPct}%`, lbl: 'completo', color: '#10B981' },
            ].map((st, i) => (
              <React.Fragment key={i}>
                {i > 0 && <View style={[s.statDivider, { backgroundColor: currentTier.color + '30' }]} />}
                <View style={s.statItem}>
                  {st.anim
                    ? <Animated.Text style={[s.statEmoji, { transform: [{ scale: fireScale }] }]}>{st.emoji}</Animated.Text>
                    : <Text style={s.statEmoji}>{st.emoji}</Text>}
                  <Text style={[s.statVal, { color: st.color }]}>{st.val}</Text>
                  <Text style={s.statLbl}>{st.lbl}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>

          <View style={s.headerBarBg}>
            <LinearGradient
              colors={[currentTier.color, nextTier?.color ?? currentTier.color]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[s.headerBarFill, { width: `${overallPct}%` }]}
            />
          </View>
        </LinearGradient>

        <Animated.View style={{ opacity: headerAnim, transform: [{ translateY: headerY }] }}>

          {/* EVOLUÇÃO DA CHAMA */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>🔥 Evolução da Chama</Text>
              <View style={[s.tierBadge, { backgroundColor: currentTier.color + '20', borderColor: currentTier.color + '50' }]}>
                <Text style={[s.tierBadgeText, { color: currentTier.color }]}>{currentTier.label}</Text>
              </View>
            </View>

            <View style={s.flameCard}>
              {/* Linha de progresso */}
              <View style={s.flameLineWrap}>
                <View style={s.flameLineBg} />
                <View style={[s.flameLineProgress, {
                  width: `${(flameTiers.indexOf(currentTier) / Math.max(1, flameTiers.length - 1)) * 100}%`,
                  backgroundColor: currentTier.color,
                }]} />
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.flameScroll}>
                {flameTiers.map((tier) => {
                  const isActive   = tier.label === currentTier.label;
                  const isUnlocked = streak >= tier.min;
                  return (
                    <View key={tier.label} style={s.flameTierItem}>
                      <LinearGradient
                        colors={isUnlocked ? tier.gradient : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']}
                        style={[
                          s.flameTierCircle,
                          isActive && { borderColor: tier.color, borderWidth: 3, shadowColor: tier.color, shadowOpacity: 0.9, shadowRadius: 10, elevation: 10 },
                          !isUnlocked && { opacity: 0.35 },
                        ]}
                      >
                        {isActive
                          ? <Animated.Text style={[s.flameTierEmoji, { transform: [{ scale: fireScale }] }]}>🔥</Animated.Text>
                          : <Text style={s.flameTierEmoji}>🔥</Text>}
                      </LinearGradient>
                      {isActive && <View style={[s.activeDot, { backgroundColor: tier.color }]} />}
                      <Text style={[s.flameTierLabel,
                        isActive && { color: tier.color, fontWeight: '800' },
                        !isUnlocked && { color: 'rgba(255,255,255,0.2)' },
                      ]}>
                        {tier.label}
                      </Text>
                      <Text style={[s.flameTierMin, isUnlocked && { color: 'rgba(255,255,255,0.4)' }]}>
                        {tier.min === 0 ? 'início' : `${tier.min}d`}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>

              {nextTier && (
                <View style={s.tierProgressWrap}>
                  <View style={s.tierProgressBar}>
                    <LinearGradient
                      colors={[currentTier.color, nextTier.color]}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={[s.tierProgressFill, { width: `${tierPct}%` }]}
                    />
                  </View>
                  <Text style={s.tierProgressText}>
                    <Text style={{ color: currentTier.color, fontWeight: '800' }}>{streak} dias</Text>
                    <Text style={{ color: COLORS.gray }}> · faltam </Text>
                    <Text style={{ color: nextTier.color, fontWeight: '800' }}>{nextTier.min - streak}d</Text>
                    <Text style={{ color: COLORS.gray }}> para {nextTier.label}</Text>
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* QUASE LÁ */}
          {nextTargets.length > 0 && (
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>⚡ Quase lá...</Text>
                <Text style={s.sectionSub}>{nextTargets.length} próximas</Text>
              </View>
              {nextTargets.map(a => <NextCard key={a.id} a={a} />)}
            </View>
          )}

          {/* TODAS AS CONQUISTAS */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>🏅 Todas as Conquistas</Text>
              <View style={s.countBadge}>
                <Text style={s.countBadgeText}>{totalCount}</Text>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabScroll}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.key}
                  style={[s.tab, activeCat === cat.key && s.tabActive]}
                  onPress={() => setActiveCat(cat.key)}
                  activeOpacity={0.75}
                >
                  <Text style={s.tabEmoji}>{cat.emoji}</Text>
                  <Text style={[s.tabText, activeCat === cat.key && s.tabTextActive]}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Desbloqueadas */}
          {unlocked.length > 0 && (
            <View style={s.gridSection}>
              {activeCat === 'todos' && (
                <Text style={s.gridLabel}>✅ Desbloqueadas ({unlocked.length})</Text>
              )}
              <View style={s.grid}>
                {unlocked.map((a, i) => <AchievementCard key={a.id} a={a} index={i} />)}
              </View>
            </View>
          )}

          {/* Bloqueadas */}
          {locked.length > 0 && (
            <View style={[s.gridSection, unlocked.length > 0 && { marginTop: 4 }]}>
              {activeCat === 'todos' && unlocked.length > 0 && (
                <Text style={s.gridLabel}>🔒 Bloqueadas ({locked.length})</Text>
              )}
              <View style={s.grid}>
                {locked.map((a, i) => <AchievementCard key={a.id} a={a} index={unlocked.length + i} />)}
              </View>
            </View>
          )}

          {filtered.length === 0 && (
            <View style={s.empty}>
              <Text style={{ fontSize: 40 }}>🏅</Text>
              <Text style={s.emptyText}>Nenhuma conquista nesta categoria</Text>
            </View>
          )}

        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  // Header
  header: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.xl, gap: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerLabel: { color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  headerTitle: { color: '#fff', fontSize: 28, fontWeight: '900', marginTop: 2 },
  headerBadge: { borderRadius: RADIUS.xl, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  headerBadgeNum: { fontSize: 24, fontWeight: '900' },
  headerBadgeSlash: { fontSize: 15, fontWeight: '600' },
  statsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: RADIUS.lg, paddingVertical: 12, paddingHorizontal: 8 },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statEmoji: { fontSize: 18 },
  statVal: { fontSize: 15, fontWeight: '900', lineHeight: 19 },
  statLbl: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '600' },
  statDivider: { width: 1, height: 34, marginHorizontal: 4 },
  headerBarBg: { height: 7, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: RADIUS.full, overflow: 'hidden' },
  headerBarFill: { height: '100%', borderRadius: RADIUS.full },

  // Sections
  section: { paddingHorizontal: SPACING.md, marginTop: SPACING.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
  sectionTitle: { color: COLORS.white, fontSize: 18, fontWeight: '900' },
  sectionSub: { color: COLORS.gray, fontSize: 12, fontWeight: '600' },
  tierBadge: { borderRadius: RADIUS.full, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  tierBadgeText: { fontSize: 12, fontWeight: '800' },
  countBadge: { backgroundColor: COLORS.purple, borderRadius: RADIUS.full, minWidth: 28, height: 28, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  countBadgeText: { color: '#fff', fontSize: 13, fontWeight: '900' },

  // Flame
  flameCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, paddingTop: SPACING.md, paddingBottom: 14, gap: 14, overflow: 'hidden' },
  flameLineWrap: { position: 'absolute', top: 43, left: 54, right: 54, height: 3, zIndex: 0 },
  flameLineBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 2 },
  flameLineProgress: { height: '100%', borderRadius: 2 },
  flameScroll: { paddingHorizontal: SPACING.md, gap: 4 },
  flameTierItem: { alignItems: 'center', width: 78, gap: 5, zIndex: 1 },
  flameTierCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  flameTierEmoji: { fontSize: 26 },
  activeDot: { width: 7, height: 7, borderRadius: 3.5, marginTop: -2 },
  flameTierLabel: { color: COLORS.gray, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  flameTierMin: { color: 'rgba(255,255,255,0.2)', fontSize: 10 },
  tierProgressWrap: { paddingHorizontal: SPACING.md, gap: 8 },
  tierProgressBar: { height: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: RADIUS.full, overflow: 'hidden' },
  tierProgressFill: { height: '100%', borderRadius: RADIUS.full },
  tierProgressText: { fontSize: 12, textAlign: 'center' },

  // Next card
  nextCard: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.xl, borderWidth: 1, padding: 14, gap: 12, marginBottom: 10, overflow: 'hidden' },
  nextEmoji: { width: 56, height: 56, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  nextBody: { flex: 1, gap: 5 },
  nextTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nextName: { color: COLORS.white, fontSize: 15, fontWeight: '800' },
  nextPct: { fontSize: 14, fontWeight: '900' },
  nextDesc: { color: COLORS.gray, fontSize: 11 },
  nextBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: RADIUS.full, overflow: 'hidden' },
  nextBarFill: { height: '100%', borderRadius: RADIUS.full },
  nextProgress: { color: COLORS.grayDark, fontSize: 11, fontWeight: '600' },
  nextXP: { borderRadius: RADIUS.lg, paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center', minWidth: 58, flexShrink: 0 },
  nextXPNum: { fontSize: 16, fontWeight: '900' },
  nextXPLabel: { color: COLORS.grayDark, fontSize: 10, fontWeight: '700' },

  // Tabs
  tabScroll: { gap: 8, paddingBottom: 6, paddingTop: 2 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)' },
  tabActive: { backgroundColor: COLORS.purple, borderColor: COLORS.purple },
  tabEmoji: { fontSize: 14 },
  tabText: { color: COLORS.gray, fontSize: 13, fontWeight: '700' },
  tabTextActive: { color: '#fff' },

  // Grid
  gridSection: { paddingHorizontal: SPACING.md, marginTop: SPACING.sm },
  gridLabel: { color: COLORS.gray, fontSize: 12, fontWeight: '700', marginBottom: 10, marginTop: 4, letterSpacing: 0.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },

  // Achievement card
  cardWrap: { width: CARD_W },
  card: { borderRadius: RADIUS.xl, borderWidth: 1.5, padding: 14, gap: 8, minHeight: 185, overflow: 'hidden', elevation: 8, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  emojiBox: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 28 },
  checkBadge: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  lockBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' },
  cardName: { fontSize: 14, fontWeight: '900', letterSpacing: 0.3 },
  cardDesc: { fontSize: 11, lineHeight: 16 },
  progressWrap: { gap: 3, marginTop: 2 },
  progressBg: { height: 4, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: RADIUS.full, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: RADIUS.full },
  progressPct: { fontSize: 10, fontWeight: '800', alignSelf: 'flex-end' },
  unlockedDate: { fontSize: 10, fontWeight: '600' },
  xpPill: { borderRadius: RADIUS.md, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start', marginTop: 'auto' },
  xpText: { fontSize: 12, fontWeight: '900' },

  // Empty
  empty: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyText: { color: COLORS.gray, fontSize: 14, fontWeight: '600' },
});
