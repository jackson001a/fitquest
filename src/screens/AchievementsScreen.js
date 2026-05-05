import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Animated, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS } from '../theme';
import { userData, achievements, flameTiers } from '../data/mockData';

const CARD_W = (Dimensions.get('window').width - SPACING.md * 2 - 10) / 2;

const CATEGORIES = [
  { key: 'todos',    label: 'Todos'    },
  { key: 'streak',   label: 'Streak'   },
  { key: 'treinos',  label: 'Treinos'  },
  { key: 'xp',       label: 'XP'       },
  { key: 'especial', label: 'Especial' },
];

// ─── ACHIEVEMENT CARD ────────────────────────────────────────────────────────
function AchievementCard({ a }) {
  const scale    = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.5)).current;
  const pct = a.progress != null ? Math.round((a.progress / a.total) * 100) : null;

  useEffect(() => {
    if (!a.unlocked) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1,   duration: 1200, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.5, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, [a.unlocked]);

  const onPress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.91, duration: 80, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
  };

  return (
    <Animated.View style={[s.achieveCard, { transform: [{ scale }] }]}>
      <TouchableOpacity onPress={onPress} activeOpacity={1} style={s.achieveTouch}>
        <LinearGradient
          colors={a.unlocked
            ? [a.color + '38', a.color + '18', '#0C0C1E']
            : ['#111126', '#0A0A18']}
          style={[s.achieveInner, {
            borderColor: a.unlocked ? a.color + '70' : 'rgba(255,255,255,0.06)',
            shadowColor: a.unlocked ? a.color : 'transparent',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.6,
            shadowRadius: 8,
            elevation: a.unlocked ? 6 : 0,
          }]}
        >
          {a.unlocked && (
            <Animated.View
              pointerEvents="none"
              style={[s.achieveGlow, { backgroundColor: a.color + '10', opacity: glowAnim }]}
            />
          )}

          <View style={s.achieveTop}>
            <LinearGradient
              colors={a.unlocked ? [a.color + '55', a.color + '22'] : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']}
              style={s.achieveEmojiWrap}
            >
              <Text style={[s.achieveEmoji, !a.unlocked && { opacity: 0.22 }]}>{a.emoji}</Text>
            </LinearGradient>
            {a.unlocked
              ? <LinearGradient colors={[a.color, a.color + 'BB']} style={s.achieveStatusBadge}>
                  <Ionicons name="checkmark" size={9} color="#fff" />
                </LinearGradient>
              : <View style={s.achieveLockBadge}>
                  <Ionicons name="lock-closed" size={9} color={COLORS.grayDark} />
                </View>
            }
          </View>

          <Text style={[s.achieveName, !a.unlocked && { color: 'rgba(255,255,255,0.28)' }]} numberOfLines={1}>
            {a.name}
          </Text>
          <Text style={[s.achieveDesc, !a.unlocked && { color: 'rgba(255,255,255,0.2)' }]} numberOfLines={2}>
            {a.desc}
          </Text>

          {!a.unlocked && pct != null && (
            <>
              <View style={s.achieveBarBg}>
                <LinearGradient
                  colors={[a.color, a.color + '66']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={[s.achieveBarFill, { width: `${pct}%` }]}
                />
              </View>
              <Text style={[s.achievePct, { color: a.color }]}>{pct}%</Text>
            </>
          )}

          {a.unlocked && a.unlockedAt && (
            <Text style={[s.achieveDate, { color: a.color + 'CC' }]}>✓ {a.unlockedAt}</Text>
          )}

          <View style={[s.achieveXPRow, { backgroundColor: a.unlocked ? a.color + '22' : 'rgba(255,255,255,0.04)', borderColor: a.unlocked ? a.color + '44' : 'rgba(255,255,255,0.06)' }]}>
            <Text style={[s.achieveXP, { color: a.unlocked ? a.color : 'rgba(255,255,255,0.18)' }]}>
              ⚡ +{a.xpReward} XP
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── MAIN SCREEN ─────────────────────────────────────────────────────────────
export default function AchievementsScreen() {
  const insets = useSafeAreaInsets();
  const [activeCat, setActiveCat] = useState('todos');
  const fireScale = useRef(new Animated.Value(1)).current;
  const entranceAnim = useRef(new Animated.Value(0)).current;
  const entranceY = useRef(new Animated.Value(24)).current;

  const currentTier = flameTiers.reduce((prev, t) => userData.streak >= t.min ? t : prev);
  const nextTier = flameTiers.find(t => t.min > userData.streak);
  const tierPct = nextTier
    ? ((userData.streak - currentTier.min) / (nextTier.min - currentTier.min)) * 100
    : 100;

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const nextTargets = achievements
    .filter(a => !a.unlocked && a.progress != null)
    .sort((a, b) => (b.progress / b.total) - (a.progress / a.total))
    .slice(0, 3);
  const filtered = activeCat === 'todos'
    ? achievements
    : achievements.filter(a => a.category === activeCat);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(entranceAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(entranceY, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(fireScale, { toValue: 1.22, duration: 850, useNativeDriver: true }),
        Animated.timing(fireScale, { toValue: 1, duration: 850, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <View style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>

        {/* ── HEADER ── */}
        <LinearGradient
          colors={[currentTier.gradient[0], currentTier.gradient[1], '#0A0A18']}
          style={[s.header, { paddingTop: insets.top + 16 }]}
        >
          <View style={s.headerRow}>
            <View>
              <Text style={s.headerTitle}>Conquistas</Text>
              <Text style={s.headerSub}>{unlockedCount} de {achievements.length} desbloqueadas</Text>
            </View>
            <View style={[s.headerCounter, { borderColor: currentTier.color + '55', backgroundColor: currentTier.color + '18' }]}>
              <Text style={[s.headerCounterNum, { color: currentTier.color }]}>{unlockedCount}</Text>
              <Text style={s.headerCounterSlash}>/{achievements.length}</Text>
            </View>
          </View>

          <View style={s.headerBarBg}>
            <LinearGradient
              colors={[currentTier.color, currentTier.color + '66']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[s.headerBarFill, { width: `${(unlockedCount / achievements.length) * 100}%` }]}
            />
          </View>
        </LinearGradient>

        <Animated.View style={{ opacity: entranceAnim, transform: [{ translateY: entranceY }] }}>

          {/* ── TIER PROGRESS ── */}
          {nextTier && (
            <View style={s.section}>
              <View style={[s.tierCompactCard, { borderColor: currentTier.color + '40' }]}>
                <View style={s.tierCompactLeft}>
                  <Animated.Text style={{ fontSize: 32, transform: [{ scale: fireScale }] }}>🔥</Animated.Text>
                  <View>
                    <Text style={[s.tierCompactName, { color: currentTier.color }]}>{currentTier.label}</Text>
                    <Text style={s.tierCompactStreak}>{userData.streak} dias · {Math.round(tierPct)}% para {nextTier.label}</Text>
                  </View>
                </View>
                <View style={[s.tierCompactNext, { backgroundColor: nextTier.color + '18', borderColor: nextTier.color + '40' }]}>
                  <Text style={[s.tierCompactNextDays, { color: nextTier.color }]}>+{nextTier.min - userData.streak}d</Text>
                </View>
              </View>
              <View style={s.tierBarBg}>
                <LinearGradient
                  colors={[currentTier.color, nextTier.color]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={[s.tierBarFill, { width: `${tierPct}%` }]}
                />
              </View>
            </View>
          )}

          {/* ── EVOLUÇÃO DA CHAMA ── */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>🔥 Evolução da Chama</Text>
            <View style={s.flameTrackCard}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.flameTrackScroll}>
                <View style={s.flameTrackRow}>
                  <View style={s.flameTrackLine} />
                  {flameTiers.map((tier) => {
                    const isActive = tier.label === currentTier.label;
                    const isUnlocked = userData.streak >= tier.min;
                    return (
                      <View key={tier.label} style={s.flameTierItem}>
                        <LinearGradient
                          colors={isUnlocked ? tier.gradient : ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
                          style={[
                            s.flameTierCircle,
                            isActive && { borderColor: tier.color, borderWidth: 2.5 },
                            !isUnlocked && s.flameTierCircleLocked,
                          ]}
                        >
                          <Text style={[s.flameTierEmoji, !isUnlocked && { opacity: 0.2 }]}>🔥</Text>
                        </LinearGradient>
                        {isActive && <View style={[s.flameTierActiveDot, { backgroundColor: tier.color }]} />}
                        <Text style={[s.flameTierLabel, isActive && { color: tier.color, fontWeight: '800' }, !isUnlocked && { color: 'rgba(255,255,255,0.2)' }]}>
                          {tier.label}
                        </Text>
                        <Text style={[s.flameTierMin, isUnlocked && { color: 'rgba(255,255,255,0.4)' }]}>
                          {tier.min === 0 ? 'início' : `${tier.min}d`}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          </View>

          {/* ── QUASE LÁ ── */}
          {nextTargets.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>⚡ Quase lá...</Text>
              {nextTargets.map(a => {
                const pct = Math.round((a.progress / a.total) * 100);
                return (
                  <View key={a.id} style={[s.nextCard, { borderColor: a.color + '35' }]}>
                    <View style={[s.nextCardIcon, { backgroundColor: a.color + '20' }]}>
                      <Text style={s.nextCardEmoji}>{a.emoji}</Text>
                    </View>
                    <View style={s.nextCardBody}>
                      <View style={s.nextCardTopRow}>
                        <Text style={s.nextCardName}>{a.name}</Text>
                        <Text style={[s.nextCardPct, { color: a.color }]}>{pct}%</Text>
                      </View>
                      <Text style={s.nextCardDesc}>{a.desc}</Text>
                      <View style={s.nextBarBg}>
                        <LinearGradient
                          colors={[a.color, a.color + '88']}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                          style={[s.nextBarFill, { width: `${pct}%` }]}
                        />
                      </View>
                      <Text style={s.nextCardProgress}>{a.progress} / {a.total}</Text>
                    </View>
                    <View style={[s.nextCardXPBox, { backgroundColor: a.color + '18' }]}>
                      <Text style={[s.nextCardXPNum, { color: a.color }]}>+{a.xpReward}</Text>
                      <Text style={s.nextCardXPLabel}>XP</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* ── TODAS AS CONQUISTAS ── */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>🏅 Todas as Conquistas</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catScroll}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.key}
                  style={[s.catTab, activeCat === cat.key && s.catTabActive]}
                  onPress={() => setActiveCat(cat.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.catTabText, activeCat === cat.key && s.catTabTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={s.grid}>
            {filtered.map(a => <AchievementCard key={a.id} a={a} />)}
          </View>

        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  header: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.lg, gap: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: COLORS.white, fontSize: 26, fontWeight: '900' },
  headerSub: { color: COLORS.gray, fontSize: 13, marginTop: 2 },
  headerCounter: { borderRadius: RADIUS.full, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  headerCounterNum: { fontSize: 22, fontWeight: '900' },
  headerCounterSlash: { color: COLORS.grayDark, fontSize: 14, fontWeight: '600' },
  headerBarBg: { height: 5, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: RADIUS.full, overflow: 'hidden' },
  headerBarFill: { height: '100%', borderRadius: RADIUS.full },

  section: { paddingHorizontal: SPACING.md, marginTop: SPACING.md },
  sectionTitle: { color: COLORS.white, fontSize: 17, fontWeight: '800', marginBottom: SPACING.sm },

  tierCompactCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: RADIUS.lg, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10 },
  tierCompactLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  tierCompactName: { fontSize: 16, fontWeight: '900' },
  tierCompactStreak: { color: COLORS.gray, fontSize: 11, marginTop: 2 },
  tierCompactNext: { borderRadius: RADIUS.md, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
  tierCompactNextDays: { fontSize: 13, fontWeight: '900' },
  tierBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: RADIUS.full, overflow: 'hidden', marginTop: 2 },
  tierBarFill: { height: '100%', borderRadius: RADIUS.full },

  flameTrackCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, paddingVertical: SPACING.md },
  flameTrackScroll: { paddingHorizontal: SPACING.md },
  flameTrackRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, position: 'relative' },
  flameTrackLine: { position: 'absolute', top: 26, left: 36, right: 36, height: 2, backgroundColor: 'rgba(255,255,255,0.07)' },
  flameTierItem: { alignItems: 'center', width: 74, gap: 5 },
  flameTierCircle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  flameTierCircleLocked: { borderColor: 'rgba(255,255,255,0.04)' },
  flameTierEmoji: { fontSize: 24 },
  flameTierActiveDot: { width: 6, height: 6, borderRadius: 3, marginTop: -2 },
  flameTierLabel: { color: COLORS.gray, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  flameTierMin: { color: 'rgba(255,255,255,0.18)', fontSize: 10 },

  nextCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1, padding: 12, gap: 12, marginBottom: 8 },
  nextCardIcon: { width: 48, height: 48, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  nextCardEmoji: { fontSize: 24 },
  nextCardBody: { flex: 1, gap: 4 },
  nextCardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nextCardName: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  nextCardPct: { fontSize: 13, fontWeight: '800' },
  nextCardDesc: { color: COLORS.gray, fontSize: 11 },
  nextBarBg: { height: 5, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: RADIUS.full, overflow: 'hidden' },
  nextBarFill: { height: '100%', borderRadius: RADIUS.full },
  nextCardProgress: { color: COLORS.grayDark, fontSize: 10 },
  nextCardXPBox: { borderRadius: RADIUS.md, paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center', minWidth: 52 },
  nextCardXPNum: { fontSize: 15, fontWeight: '900' },
  nextCardXPLabel: { color: COLORS.grayDark, fontSize: 10, fontWeight: '600' },

  catScroll: { gap: 8, paddingBottom: 4 },
  catTab: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  catTabActive: { backgroundColor: COLORS.purple, borderColor: COLORS.purple },
  catTabText: { color: COLORS.gray, fontSize: 13, fontWeight: '600' },
  catTabTextActive: { color: COLORS.white, fontWeight: '700' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SPACING.md, gap: 10, marginTop: SPACING.sm },
  achieveCard: { width: CARD_W },
  achieveTouch: { flex: 1 },
  achieveInner: { borderRadius: RADIUS.lg, borderWidth: 1.5, padding: 12, gap: 6, minHeight: 165, overflow: 'hidden' },
  achieveGlow: { ...StyleSheet.absoluteFillObject, borderRadius: RADIUS.lg },
  achieveTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  achieveEmojiWrap: { width: 46, height: 46, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  achieveEmoji: { fontSize: 26 },
  achieveStatusBadge: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  achieveLockBadge: { width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' },
  achieveName: { color: COLORS.white, fontSize: 13, fontWeight: '800', marginTop: 4 },
  achieveDesc: { color: COLORS.gray, fontSize: 11, lineHeight: 15 },
  achieveBarBg: { height: 5, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: RADIUS.full, overflow: 'hidden', marginTop: 4 },
  achieveBarFill: { height: '100%', borderRadius: RADIUS.full },
  achievePct: { fontSize: 11, fontWeight: '800' },
  achieveDate: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  achieveXPRow: { borderRadius: RADIUS.sm, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start', marginTop: 'auto' },
  achieveXP: { fontSize: 11, fontWeight: '800' },
});
