import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Animated, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS } from '../theme';
import { userData, achievements } from '../data/mockData';

const { width } = Dimensions.get('window');

// ─── TÍTULOS ─────────────────────────────────────────────────────────────────
const TITLES = [
  { title: 'Fantasma da Academia',  color: '#6B7280', emoji: '👻', desc: 'Precisa voltar!',             cond: d => d.streak <= 3 },
  { title: 'Atleta Dedicado',       color: '#3B82F6', emoji: '💪', desc: 'Construindo consistência',    cond: d => d.streak > 3 },
  { title: 'Rei do Cardio',         color: '#10B981', emoji: '🏃', desc: '5 treinos em uma semana',     cond: d => d.weekWorkouts >= 5 },
  { title: 'Veterano do Ferro',     color: '#8B5CF6', emoji: '🏆', desc: 'Nível 10 ou superior',        cond: d => d.level >= 10 },
  { title: 'Monstro do Ferro',      color: '#F97316', emoji: '🦁', desc: '100+ treinos completados',    cond: d => d.totalWorkouts >= 100 },
  { title: 'Guerreiro Consistente', color: '#EF4444', emoji: '⚔️', desc: 'Sequência de 21+ dias',       cond: d => d.streak >= 21 },
  { title: 'Lenda Viva',            color: '#F59E0B', emoji: '👑', desc: 'Sequência de 30+ dias',       cond: d => d.streak >= 30 },
  { title: 'Imortal',               color: '#06B6D4', emoji: '⚡', desc: 'Sequência de 60+ dias',       cond: d => d.streak >= 60 },
];

function getUserTitle(data) {
  for (let i = TITLES.length - 1; i >= 0; i--) {
    if (TITLES[i].cond(data)) return { ...TITLES[i], idx: i };
  }
  return { ...TITLES[0], idx: 0 };
}

// ─── CALENDAR MOCK DATA ───────────────────────────────────────────────────────
const TODAY = new Date();
const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DAYS_SHORT = ['S','T','Q','Q','S','S','D'];

const TRAINING_HISTORY = (() => {
  const y = TODAY.getFullYear();
  const m = TODAY.getMonth();
  return {
    [`${y}-${m}`]:   new Set([1,3,5,6,8,10,12,13,15,17,18,20,22,23]),
    [`${y}-${m-1}`]: new Set([2,4,5,7,9,11,14,16,17,19,21,23,24,26,28,29,30]),
    [`${y}-${m-2}`]: new Set([1,3,7,9,10,12,14,16,19,21,23,25,26,28]),
    [`${y}-${m-3}`]: new Set([2,5,7,9,12,14,16,17,19,22,24,25,27,29]),
  };
})();

function getTrainingDays(year, month) {
  return TRAINING_HISTORY[`${year}-${month}`] || new Set();
}

const PERSONAL_RECORDS = [
  { exercise: 'Supino Reto',     kg: 70,  date: 'há 3 dias',    isNew: false },
  { exercise: 'Agachamento',     kg: 100, date: 'há 1 semana',  isNew: true  },
  { exercise: 'Deadlift',        kg: 120, date: 'há 2 semanas', isNew: false },
  { exercise: 'Leg Press',       kg: 180, date: 'há 5 dias',    isNew: false },
  { exercise: 'Desenvolvimento', kg: 50,  date: 'há 10 dias',   isNew: true  },
];

const SETTINGS = [
  { icon: 'notifications-outline', label: 'Notificações',  sub: 'Lembretes de treino' },
  { icon: 'trophy-outline',        label: 'Metas',         sub: 'Meta diária: 200 XP' },
  { icon: 'people-outline',        label: 'Amigos',        sub: '8 amigos conectados' },
  { icon: 'share-social-outline',  label: 'Compartilhar',  sub: 'Mostre seu progresso' },
  { icon: 'help-circle-outline',   label: 'Ajuda',         sub: 'FAQ e suporte' },
];

// ─── STAT BOX ────────────────────────────────────────────────────────────────
function StatBox({ value, label, icon, color }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const headerAnim = useRef(new Animated.Value(0)).current;

  const [viewYear,  setViewYear]  = useState(TODAY.getFullYear());
  const [viewMonth, setViewMonth] = useState(TODAY.getMonth());

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 700, useNativeDriver: true }).start();
  }, []);

  const xpPercent  = (userData.xp / userData.nextLevelXp) * 100;
  const userTitle  = getUserTitle(userData);
  const nextTitle  = TITLES[userTitle.idx + 1] || null;
  const unlockedAch = achievements.filter(a => a.unlocked);

  const goToPrev = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const goToNext = () => {
    const isCurrentMonth = viewYear === TODAY.getFullYear() && viewMonth === TODAY.getMonth();
    if (isCurrentMonth) return;
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  let firstDow = new Date(viewYear, viewMonth, 1).getDay();
  firstDow = firstDow === 0 ? 6 : firstDow - 1;

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const trainingDays  = getTrainingDays(viewYear, viewMonth);
  const trainedCount  = trainingDays.size;
  const isCurrentView = viewYear === TODAY.getFullYear() && viewMonth === TODAY.getMonth();
  const isNextDisabled = isCurrentView;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>

        {/* ── HEADER ── */}
        <Animated.View style={{ opacity: headerAnim }}>
          <LinearGradient colors={['#1A1A3E', '#12122A']} style={[styles.profileHeader, { paddingTop: insets.top + 12 }]}>
            <View style={styles.avatarSection}>
              <View style={styles.avatarOuter}>
                <LinearGradient colors={['#8B5CF6', '#EC4899']} style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>{userData.name[0]}</Text>
                </LinearGradient>
                <View style={styles.levelBadge}>
                  <Text style={styles.levelBadgeText}>{userData.level}</Text>
                </View>
              </View>
              <Text style={styles.profileName}>{userData.name}</Text>
              <View style={[styles.profileTitleBadge, { borderColor: userTitle.color + '50', backgroundColor: userTitle.color + '12' }]}>
                <Text style={styles.profileTitleEmoji}>{userTitle.emoji}</Text>
                <Text style={[styles.profileTitleText, { color: userTitle.color }]}>{userTitle.title}</Text>
              </View>
              <View style={styles.profileLeague}>
                <Text style={styles.profileLeagueText}>
                  {userData.leagueEmoji} Liga {userData.league}  ·  #{userData.rank} no ranking
                </Text>
              </View>
            </View>

            <View style={styles.xpSection}>
              <View style={styles.xpRow}>
                <Text style={styles.xpLabel}>⚡ {userData.xp.toLocaleString()} XP</Text>
                <Text style={styles.xpNextLabel}>Nível {userData.level + 1} → {userData.nextLevelXp.toLocaleString()} XP</Text>
              </View>
              <View style={styles.xpBarBg}>
                <View style={[styles.xpBarFill, { width: `${xpPercent}%` }]} />
              </View>
            </View>

            <View style={styles.currencyRow}>
              <View style={styles.currencyItem}>
                <Text style={styles.currencyEmoji}>🪙</Text>
                <Text style={styles.currencyValue}>{userData.coins}</Text>
                <Text style={styles.currencyLabel}>Moedas</Text>
              </View>
              <View style={styles.currencyDivider} />
              <View style={styles.currencyItem}>
                <Text style={styles.currencyEmoji}>💎</Text>
                <Text style={styles.currencyValue}>{userData.gems}</Text>
                <Text style={styles.currencyLabel}>Gemas</Text>
              </View>
              <View style={styles.currencyDivider} />
              <View style={styles.currencyItem}>
                <Text style={styles.currencyEmoji}>🔥</Text>
                <Text style={styles.currencyValue}>{userData.streak}</Text>
                <Text style={styles.currencyLabel}>Sequência</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ── IDENTIDADE FITNESS ── */}
        <View style={styles.section}>
          <View style={[styles.identityCard, { borderColor: userTitle.color + '35' }]}>
            <View style={styles.identityRow}>
              <View style={[styles.identityIconBox, { backgroundColor: userTitle.color + '18' }]}>
                <Text style={styles.identityEmoji}>{userTitle.emoji}</Text>
              </View>
              <View style={styles.identityInfo}>
                <Text style={styles.identitySmallLabel}>SUA IDENTIDADE FITNESS</Text>
                <Text style={[styles.identityTitle, { color: userTitle.color }]}>{userTitle.title}</Text>
                <Text style={styles.identityDesc}>{userTitle.desc}</Text>
              </View>
            </View>
            {nextTitle && (
              <View style={[styles.identityNextRow, { borderTopColor: userTitle.color + '20' }]}>
                <Text style={styles.identityNextLabel}>Próximo título:</Text>
                <Text style={styles.identityNextEmoji}>{nextTitle.emoji}</Text>
                <Text style={[styles.identityNextTitle, { color: nextTitle.color }]}>{nextTitle.title}</Text>
                <Text style={styles.identityNextCond}>· {nextTitle.desc}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── STATS ── */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>📊 Estatísticas</Text>
          <View style={styles.statsGrid}>
            <StatBox value={userData.totalWorkouts}                label="Treinos"          icon="🏋️" color={COLORS.purple} />
            <StatBox value={userData.longestStreak}                label="Maior sequência"  icon="🔥" color={COLORS.red}    />
            <StatBox value={userData.streak}                       label="Sequência atual"  icon="⚡" color={COLORS.gold}   />
            <StatBox value={`${(userData.xp / 1000).toFixed(1)}k`} label="XP total"        icon="🏆" color={COLORS.green}  />
          </View>
        </View>

        {/* ── CALENDÁRIO DO MÊS ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Histórico de Treinos</Text>
          <View style={styles.calCard}>

            {/* Nav */}
            <View style={styles.calNavRow}>
              <TouchableOpacity style={styles.calNavBtn} onPress={goToPrev}>
                <Ionicons name="chevron-back" size={16} color={COLORS.purpleLight} />
              </TouchableOpacity>
              <View style={styles.calNavCenter}>
                <Text style={styles.calMonthText}>{MONTHS_PT[viewMonth]}</Text>
                <Text style={styles.calYearText}>{viewYear} · {trainedCount} treinos</Text>
              </View>
              <TouchableOpacity
                style={[styles.calNavBtn, isNextDisabled && styles.calNavBtnDisabled]}
                onPress={goToNext}
                disabled={isNextDisabled}
              >
                <Ionicons name="chevron-forward" size={16} color={isNextDisabled ? COLORS.grayDark : COLORS.purpleLight} />
              </TouchableOpacity>
            </View>

            {/* Day headers */}
            <View style={styles.calDayHeader}>
              {DAYS_SHORT.map((d, i) => (
                <Text key={i} style={styles.calDayName}>{d}</Text>
              ))}
            </View>

            {/* Grid */}
            <View style={styles.calGrid}>
              {cells.map((d, i) => {
                if (!d) return <View key={`e${i}`} style={styles.calCell} />;
                const isTrained = trainingDays.has(d);
                const isToday   = isCurrentView && d === TODAY.getDate();
                const isFuture  = isCurrentView && d > TODAY.getDate();
                return (
                  <View key={d} style={styles.calCell}>
                    {isTrained ? (
                      <LinearGradient colors={['#8B5CF6', '#6D28D9']} style={styles.calDayTrained}>
                        <Text style={styles.calDayTrainedNum}>{d}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={[
                        styles.calDay,
                        isToday  && styles.calDayToday,
                        isFuture && styles.calDayFuture,
                      ]}>
                        <Text style={[
                          styles.calDayNum,
                          isToday  && styles.calDayTodayNum,
                          isFuture && styles.calDayFutureNum,
                        ]}>{d}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* ── RECORDES PESSOAIS ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏆 Recordes Pessoais</Text>
          {PERSONAL_RECORDS.map((pr, i) => (
            <View key={i} style={[styles.prItem, pr.isNew && { borderColor: '#F59E0B55' }]}>
              {pr.isNew && (
                <LinearGradient colors={['#F59E0B20', 'transparent']} style={StyleSheet.absoluteFill} />
              )}
              <View style={[styles.prIconWrap, { backgroundColor: pr.isNew ? '#F59E0B22' : 'rgba(139,92,246,0.12)' }]}>
                <Text style={styles.prIconEmoji}>{pr.isNew ? '🏆' : '🎯'}</Text>
              </View>
              <View style={styles.prInfo}>
                <Text style={styles.prExercise}>{pr.exercise}</Text>
                <Text style={styles.prDate}>{pr.date}</Text>
              </View>
              <View style={styles.prRight}>
                <Text style={[styles.prKg, { color: pr.isNew ? '#F59E0B' : COLORS.white }]}>{pr.kg}kg</Text>
                {pr.isNew && (
                  <View style={styles.prNewBadge}>
                    <Text style={styles.prNewBadgeText}>🆕 RECORDE</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* ── SELOS OBTIDOS ── */}
        <View style={styles.sealsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🏅 Selos Obtidos</Text>
            <View style={styles.sealCountBadge}>
              <Text style={styles.sealCountText}>{unlockedAch.length} selos</Text>
            </View>
          </View>
          <View style={styles.sealsGrid}>
            {unlockedAch.map(a => (
              <View key={a.id} style={styles.sealItem}>
                <LinearGradient
                  colors={[a.color + '45', a.color + '20', a.color + '08']}
                  style={[styles.sealBadge, { borderColor: a.color + '65', shadowColor: a.color }]}
                >
                  <Text style={styles.sealEmoji}>{a.emoji}</Text>
                  <LinearGradient colors={[a.color, a.color + 'CC']} style={styles.sealCheckDot}>
                    <Ionicons name="checkmark" size={8} color="#fff" />
                  </LinearGradient>
                </LinearGradient>
                <Text style={[styles.sealName, { color: a.color }]} numberOfLines={2}>{a.name}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── SETTINGS ── */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>⚙️ Configurações</Text>
          {SETTINGS.map((item, i) => (
            <TouchableOpacity key={i} style={styles.settingItem} activeOpacity={0.7}>
              <View style={styles.settingIcon}>
                <Ionicons name={item.icon} size={20} color={COLORS.purpleLight} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>{item.label}</Text>
                <Text style={styles.settingSub}>{item.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.grayDark} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.signOutBtn} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color={COLORS.red} />
          <Text style={styles.signOutText}>Sair da conta</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  // Header
  profileHeader: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.xl, gap: 16 },
  avatarSection: { alignItems: 'center', gap: 8 },
  avatarOuter: { position: 'relative' },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#fff' },
  levelBadge: { position: 'absolute', bottom: -4, right: -4, backgroundColor: COLORS.gold, borderRadius: RADIUS.full, width: 26, height: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.bgSecondary },
  levelBadgeText: { color: '#000', fontSize: 11, fontWeight: '800' },
  profileName: { color: COLORS.white, fontSize: 22, fontWeight: '800' },
  profileTitleBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: RADIUS.full, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 6 },
  profileTitleEmoji: { fontSize: 14 },
  profileTitleText: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  profileLeague: { backgroundColor: 'rgba(139,92,246,0.15)', borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)' },
  profileLeagueText: { color: COLORS.purpleLight, fontSize: 12, fontWeight: '600' },
  xpSection: { gap: 6 },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between' },
  xpLabel: { color: COLORS.purpleLight, fontSize: 12, fontWeight: '700' },
  xpNextLabel: { color: COLORS.gray, fontSize: 11 },
  xpBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: RADIUS.full, overflow: 'hidden' },
  xpBarFill: { height: '100%', backgroundColor: COLORS.purple, borderRadius: RADIUS.full },
  currencyRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: RADIUS.lg, padding: SPACING.md, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  currencyItem: { flex: 1, alignItems: 'center', gap: 2 },
  currencyDivider: { width: 1, height: 36, backgroundColor: COLORS.border },
  currencyEmoji: { fontSize: 22 },
  currencyValue: { color: COLORS.white, fontSize: 18, fontWeight: '800' },
  currencyLabel: { color: COLORS.gray, fontSize: 10 },

  // Section
  section: { paddingHorizontal: SPACING.md, marginTop: SPACING.lg },
  sectionTitle: { color: COLORS.white, fontSize: 17, fontWeight: '800', marginBottom: SPACING.sm },

  // Identity card (simple)
  identityCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACING.md, gap: 10 },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  identityIconBox: { width: 52, height: 52, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  identityEmoji: { fontSize: 28 },
  identityInfo: { flex: 1, gap: 3 },
  identitySmallLabel: { color: COLORS.grayDark, fontSize: 9, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  identityTitle: { fontSize: 16, fontWeight: '900' },
  identityDesc: { color: COLORS.gray, fontSize: 12 },
  identityNextRow: { flexDirection: 'row', alignItems: 'center', gap: 5, borderTopWidth: 1, paddingTop: 10, flexWrap: 'wrap' },
  identityNextLabel: { color: COLORS.grayDark, fontSize: 11 },
  identityNextEmoji: { fontSize: 14 },
  identityNextTitle: { fontSize: 12, fontWeight: '800' },
  identityNextCond: { color: COLORS.grayDark, fontSize: 11 },

  // Stats
  statsSection: { paddingHorizontal: SPACING.md, marginTop: SPACING.lg },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statBox: { width: (width - SPACING.md * 2 - 10) / 2, backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.md, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: COLORS.border },
  statIcon: { fontSize: 24 },
  statValue: { fontSize: 24, fontWeight: '800' },
  statLabel: { color: COLORS.gray, fontSize: 12 },

  // Calendar
  calCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.sm, gap: 8 },
  calNavRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  calNavBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(139,92,246,0.1)', alignItems: 'center', justifyContent: 'center' },
  calNavBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.03)' },
  calNavCenter: { alignItems: 'center' },
  calMonthText: { color: COLORS.white, fontSize: 14, fontWeight: '800' },
  calYearText: { color: COLORS.gray, fontSize: 10, marginTop: 1 },
  calDayHeader: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 2 },
  calDayName: { color: COLORS.grayDark, fontSize: 10, fontWeight: '700', width: 28, textAlign: 'center' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 2 },
  calDay: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  calDayToday: { borderWidth: 1.5, borderColor: COLORS.purpleLight },
  calDayFuture: { opacity: 0.25 },
  calDayNum: { color: COLORS.grayDark, fontSize: 11, fontWeight: '500' },
  calDayTodayNum: { color: COLORS.purpleLight, fontWeight: '800' },
  calDayFutureNum: { color: 'rgba(255,255,255,0.15)' },
  calDayTrained: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  calDayTrainedNum: { color: '#fff', fontSize: 11, fontWeight: '800' },

  // Personal records
  prItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 12, marginBottom: 8, gap: 12, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  prIconWrap: { width: 42, height: 42, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  prIconEmoji: { fontSize: 20 },
  prInfo: { flex: 1 },
  prExercise: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
  prDate: { color: COLORS.gray, fontSize: 11, marginTop: 2 },
  prRight: { alignItems: 'flex-end', gap: 4 },
  prKg: { fontSize: 18, fontWeight: '900' },
  prNewBadge: { backgroundColor: '#F59E0B22', borderRadius: RADIUS.full, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: '#F59E0B44' },
  prNewBadgeText: { color: '#F59E0B', fontSize: 9, fontWeight: '800' },

  // Seals
  sealsSection: { paddingHorizontal: SPACING.md, marginTop: SPACING.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
  sealCountBadge: { backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(245,158,11,0.35)' },
  sealCountText: { color: '#F59E0B', fontSize: 12, fontWeight: '700' },
  sealsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  sealItem: { width: (width - SPACING.md * 2 - 36) / 4, alignItems: 'center', gap: 5 },
  sealBadge: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 6, elevation: 6 },
  sealEmoji: { fontSize: 28 },
  sealCheckDot: { position: 'absolute', bottom: -3, right: -3, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.bg },
  sealName: { fontSize: 10, fontWeight: '700', textAlign: 'center', lineHeight: 13 },

  // Settings
  settingsSection: { paddingHorizontal: SPACING.md, marginTop: SPACING.lg },
  settingItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: 14, marginBottom: 8, gap: 12, borderWidth: 1, borderColor: COLORS.border },
  settingIcon: { width: 36, height: 36, borderRadius: RADIUS.sm, backgroundColor: 'rgba(139,92,246,0.15)', alignItems: 'center', justifyContent: 'center' },
  settingInfo: { flex: 1 },
  settingLabel: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  settingSub: { color: COLORS.gray, fontSize: 11, marginTop: 1 },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, margin: SPACING.md, marginTop: SPACING.lg, padding: 14, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.08)' },
  signOutText: { color: COLORS.red, fontSize: 14, fontWeight: '700' },
});
