import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS } from '../theme';
import {
  userData,
  dailyChallenges as initialChallenges,
  bossData,
  recommendedWorkouts,
  quotes,
  groupsData,
  rivalsData,
} from '../data/mockData';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

function getUserTitle(data) {
  if (data.streak >= 60)         return { title: 'Imortal',               color: '#06B6D4', emoji: '⚡' };
  if (data.streak >= 30)         return { title: 'Lenda Viva',            color: '#F59E0B', emoji: '👑' };
  if (data.streak >= 21)         return { title: 'Guerreiro Consistente', color: '#EF4444', emoji: '⚔️' };
  if (data.totalWorkouts >= 100) return { title: 'Monstro do Ferro',      color: '#F97316', emoji: '🦁' };
  if (data.level >= 10)          return { title: 'Veterano do Ferro',     color: '#8B5CF6', emoji: '🏆' };
  if (data.weekWorkouts >= 5)    return { title: 'Rei do Cardio',         color: '#10B981', emoji: '🏃' };
  if (data.streak <= 3)          return { title: 'Fantasma da Academia',  color: '#6B7280', emoji: '👻' };
  return                          { title: 'Atleta Dedicado',             color: '#3B82F6', emoji: '💪' };
}

const BOOST_EVENTS = [
  { emoji: '🔥', title: 'BOOST SECRETO!',   desc: '+50% XP por 1 hora',        color: '#F97316', gradient: ['#7C2D12', '#431407'] },
  { emoji: '⚡', title: 'XP DOBRADO!',       desc: 'XP dobrado neste treino!',  color: '#F59E0B', gradient: ['#78350F', '#3B1500'] },
  { emoji: '⚔️', title: 'MISSÃO ESPECIAL!', desc: 'Nova missão desbloqueada!', color: '#8B5CF6', gradient: ['#4C1D95', '#2E1065'] },
  { emoji: '💎', title: 'RECOMPENSA RARA!', desc: '+50 moedas encontradas!',    color: '#06B6D4', gradient: ['#164E63', '#082F49'] },
];

// ─── CHECK-IN CELEBRATION ────────────────────────────────────────────────────
function CheckinCelebration({ visible, event, onDismiss }) {
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const cardScale    = useRef(new Animated.Value(0.6)).current;
  const cardOpacity  = useRef(new Animated.Value(0)).current;
  const particles    = useRef(
    Array.from({ length: 6 }, () => ({ y: new Animated.Value(0), op: new Animated.Value(0) }))
  ).current;

  useEffect(() => {
    if (!visible) {
      backdropAnim.setValue(0); cardScale.setValue(0.6); cardOpacity.setValue(0);
      particles.forEach(p => { p.y.setValue(0); p.op.setValue(0); });
      return;
    }
    Animated.parallel([
      Animated.timing(backdropAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.spring(cardScale,    { toValue: 1, friction: 6, tension: 120, useNativeDriver: true }),
      Animated.timing(cardOpacity,  { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
    particles.forEach((p, i) => {
      Animated.sequence([
        Animated.delay(i * 70),
        Animated.parallel([
          Animated.timing(p.op, { toValue: 1, duration: 80,  useNativeDriver: true }),
          Animated.timing(p.y,  { toValue: -(90 + i * 22), duration: 950, useNativeDriver: true }),
        ]),
        Animated.timing(p.op, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]).start();
    });
  }, [visible]);

  const isBoost = event != null;
  const cfg = isBoost
    ? event
    : { emoji: '✅', title: 'Check-in Feito!', desc: '+30 XP conquistados!', color: '#10B981', gradient: ['#065F46', '#022C22'] };
  const pEmojis = isBoost ? ['🔥','⚡','💥','✨','🌟','🎉'] : ['✅','⚡','💪','🌟','✨','🎊'];
  const pX      = [SCREEN_W*0.08, SCREEN_W*0.22, SCREEN_W*0.38, SCREEN_W*0.54, SCREEN_W*0.70, SCREEN_W*0.84];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onDismiss} activeOpacity={1}>
        <Animated.View style={[
          StyleSheet.absoluteFill,
          { backgroundColor: '#000', opacity: backdropAnim.interpolate({ inputRange: [0,1], outputRange: [0, 0.85] }) },
        ]} />
        {particles.map((p, i) => (
          <Animated.Text
            key={i}
            style={{ position: 'absolute', left: pX[i], bottom: SCREEN_H * 0.44,
                     fontSize: 26, transform: [{ translateY: p.y }], opacity: p.op }}
          >{pEmojis[i]}</Animated.Text>
        ))}
        <View style={s.celebWrap}>
          <Animated.View style={{ transform: [{ scale: cardScale }], opacity: cardOpacity }}>
            <LinearGradient colors={cfg.gradient} style={s.celebCard}>
              {isBoost && (
                <View style={s.celebBoostBadge}>
                  <Text style={s.celebBoostText}>✦ EVENTO ESPECIAL ✦</Text>
                </View>
              )}
              <Text style={s.celebBigEmoji}>{cfg.emoji}</Text>
              <Text style={[s.celebTitle, { color: cfg.color }]}>{cfg.title}</Text>
              <Text style={s.celebDesc}>{cfg.desc}</Text>
              <View style={[s.celebXPRow, { backgroundColor: cfg.color + '20', borderColor: cfg.color + '40' }]}>
                <Text style={[s.celebXPText, { color: cfg.color }]}>
                  {isBoost ? 'check-in: +30 XP conquistados!' : 'Sequência mantida! 🔥'}
                </Text>
              </View>
              <Text style={s.celebTap}>Toque para continuar</Text>
            </LinearGradient>
          </Animated.View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── STREAK HERO CARD ────────────────────────────────────────────────────────
function StreakHeroCard({ fireScale }) {
  const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const day = new Date().getDay();
  const todayIdx = day === 0 ? 6 : day - 1;
  const trained = userData.weekTrainingDays;

  let streakMsg;
  if (userData.streak >= 30)      streakMsg = '🔥 Você é imparável!';
  else if (userData.streak >= 14) streakMsg = `Faltam ${userData.streakGoal - userData.streak} dias para o recorde!`;
  else if (userData.streak >= 7)  streakMsg = 'Ótimo ritmo! Continue assim!';
  else                            streakMsg = 'Cada dia conta. Não pare agora!';

  // Comprometimento calculado aqui, exibido de forma compacta
  const commitScore = Math.min(
    Math.round(
      Math.min(userData.streak / 30, 1) * 40 +
      Math.min(userData.weekWorkouts / 5, 1) * 35 +
      Math.min(userData.totalWorkouts / 100, 1) * 25
    ), 100
  );
  let commitCfg;
  if (commitScore >= 80)      commitCfg = { color: COLORS.green, emoji: '🚀', label: 'Excepcional' };
  else if (commitScore >= 60) commitCfg = { color: COLORS.blue,  emoji: '💪', label: 'Muito Bom' };
  else if (commitScore >= 40) commitCfg = { color: COLORS.gold,  emoji: '📈', label: 'Regular' };
  else                        commitCfg = { color: COLORS.red,   emoji: '😤', label: 'Precisa Melhorar' };

  return (
    <LinearGradient colors={['#2D1B69', '#1A1A3E', '#0A0A18']} style={s.streakHero}>
      {/* Top row: fire + number + record */}
      <View style={s.streakTopRow}>
        <View style={s.streakLeft}>
          <Animated.Text style={[s.streakFireBig, { transform: [{ scale: fireScale }] }]}>
            🔥
          </Animated.Text>
          <Text style={s.streakNumberBig}>{userData.streak}</Text>
          <View style={s.streakDaysStack}>
            <Text style={s.streakDaysTop}>dias</Text>
            <Text style={s.streakDaysBot}>seguidos</Text>
          </View>
        </View>
        <View style={s.streakRight}>
          <View style={s.streakRecordBox}>
            <Text style={s.streakRecordLabel}>🏆 Recorde</Text>
            <Text style={s.streakRecordNum}>{userData.longestStreak} dias</Text>
          </View>
          <View style={s.streakGoalBox}>
            <Text style={s.streakGoalLabel}>🎯 Meta</Text>
            <Text style={s.streakGoalNum}>{userData.streakGoal} dias</Text>
          </View>
        </View>
      </View>

      {/* Marcos de milestone — substituem a barra de meta */}
      <View style={s.milestoneRow}>
        {[7, 14, 21, 30].map((m) => {
          const done = userData.streak >= m;
          return (
            <View key={m} style={s.milestoneItem}>
              <LinearGradient
                colors={done ? ['#F59E0B', '#EF4444'] : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.06)']}
                style={[s.milestoneDot, done && s.milestoneDotDone]}
              >
                {done
                  ? <Ionicons name="flame" size={12} color="#fff" />
                  : <Text style={s.milestoneDotNum}>{m}</Text>
                }
              </LinearGradient>
              <Text style={[s.milestoneLabel, done && s.milestoneLabelDone]}>{m}d</Text>
            </View>
          );
        })}
        <View style={s.milestoneLine} />
      </View>

      {/* Divider */}
      <View style={s.streakDivider} />

      {/* Week calendar */}
      <View style={s.streakWeekRow}>
        {days.map((day, i) => {
          const isToday = i === todayIdx;
          const done = trained[i];
          const isFuture = i > todayIdx;
          return (
            <View key={i} style={s.streakDayCol}>
              <Text style={[s.streakDayName, isToday && s.streakDayNameToday]}>{day}</Text>
              <View
                style={[
                  s.streakDayDot,
                  done && s.streakDayDotDone,
                  isToday && s.streakDayDotToday,
                  isFuture && s.streakDayDotFuture,
                ]}
              >
                {done ? (
                  <Ionicons name="checkmark" size={13} color="#fff" />
                ) : isToday ? (
                  <Text style={s.streakDayTodayEmoji}>•</Text>
                ) : (
                  <View style={s.streakDayEmpty} />
                )}
              </View>
              {isToday && <View style={s.streakTodayDot} />}
            </View>
          );
        })}
      </View>

      {/* Motivational message */}
      <View style={s.streakMsgRow}>
        <Text style={s.streakMsg}>{streakMsg}</Text>
      </View>

      {/* ── Comprometimento ── */}
      <View style={[s.commitStrip, { borderColor: commitCfg.color + '30' }]}>
        <View style={s.commitStripRow}>
          <View>
            <Text style={s.commitStripTitle}>🎯 Comprometimento</Text>
            <Text style={[s.commitStripStatus, { color: commitCfg.color }]}>{commitCfg.emoji} {commitCfg.label}</Text>
          </View>
          <View style={[s.commitBadge, { borderColor: commitCfg.color + '50', backgroundColor: commitCfg.color + '18' }]}>
            <Text style={[s.commitBadgeScore, { color: commitCfg.color }]}>{commitScore}</Text>
            <Text style={s.commitBadgeOf}>/100</Text>
          </View>
        </View>
        <View style={s.commitBarBg}>
          <View style={[s.commitBarFill, { width: `${commitScore}%`, backgroundColor: commitCfg.color }]} />
        </View>
      </View>
    </LinearGradient>
  );
}

// ─── WATER TRACKER ───────────────────────────────────────────────────────────
function getWaterMsg(n) {
  if (n === 8) return { text: '🎉 Meta atingida! Parabéns!', color: COLORS.green };
  if (n >= 6) return { text: `Quase lá! Mais ${8 - n} copinho${8 - n > 1 ? 's' : ''}!`, color: COLORS.cyan };
  if (n >= 4) return { text: 'Bom progresso! Continue bebendo!', color: COLORS.blue };
  if (n >= 2) return { text: 'Hidrate-se! Melhora o treino!', color: COLORS.gold };
  return { text: '🌵 Você está desidratado! Beba água!', color: COLORS.red };
}

function WaterTracker() {
  const [glasses, setGlasses] = useState([true, true, true, false, false, false, false, false]);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const rippleAnims = useRef(Array.from({ length: 8 }, () => new Animated.Value(1))).current;
  const filled = glasses.filter(Boolean).length;
  const pct = (filled / 8) * 100;
  const msg = getWaterMsg(filled);

  const toggleGlass = (i) => {
    const next = [...glasses];
    next[i] = !next[i];
    setGlasses(next);
    if (next[i]) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 7, duration: 55, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -7, duration: 55, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 55, useNativeDriver: true }),
      ]).start();
      Animated.sequence([
        Animated.timing(rippleAnims[i], { toValue: 1.25, duration: 120, useNativeDriver: true }),
        Animated.spring(rippleAnims[i], { toValue: 1, friction: 4, useNativeDriver: true }),
      ]).start();
    }
  };

  const liters = (filled * 0.25).toFixed(2);
  const goalColor = filled >= 8 ? '#10B981' : filled >= 6 ? '#38BDF8' : filled >= 4 ? '#3B82F6' : '#94A3B8';

  return (
    <LinearGradient colors={['#0C2D4A', '#071A2E', '#0A0A18']} style={s.waterCard}>
      {/* Header */}
      <View style={s.waterHeader}>
        <Animated.View style={[s.waterDropWrap, { transform: [{ translateX: shakeAnim }] }]}>
          <LinearGradient colors={['#0EA5E9', '#0369A1']} style={s.waterDropCircle}>
            <Text style={s.waterDropEmoji}>💧</Text>
          </LinearGradient>
        </Animated.View>
        <View style={{ flex: 1 }}>
          <Text style={s.waterTitle}>Hidratação Diária</Text>
          <Text style={[s.waterMsg, { color: msg.color }]}>{msg.text}</Text>
        </View>
        <View style={[s.waterCountBadge, { borderColor: goalColor + '60', backgroundColor: goalColor + '18' }]}>
          <Text style={[s.waterCountNum, { color: goalColor }]}>{filled}</Text>
          <Text style={s.waterCountDen}>/8</Text>
        </View>
      </View>

      {/* Glasses row */}
      <View style={s.glassesRow}>
        {glasses.map((full, i) => (
          <TouchableOpacity key={i} onPress={() => toggleGlass(i)} activeOpacity={0.8}>
            <Animated.View style={[s.glassWrap, full && s.glassWrapFull, { transform: [{ scale: rippleAnims[i] }] }]}>
              {full ? (
                <LinearGradient colors={['#38BDF8', '#0EA5E9', '#0369A1']} style={s.glassInner}>
                  <Text style={s.glassDropText}>💧</Text>
                </LinearGradient>
              ) : (
                <View style={s.glassEmpty}>
                  <View style={s.glassEmptyLine} />
                  <View style={[s.glassEmptyLine, { width: '60%' }]} />
                </View>
              )}
              <Text style={[s.glassNumText, full && s.glassNumFull]}>{i + 1}</Text>
            </Animated.View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Progress bar */}
      <View style={s.waterBarBg}>
        <LinearGradient
          colors={['#0369A1', '#0EA5E9', '#38BDF8']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={[s.waterBarFill, { width: `${pct}%` }]}
        />
        {pct > 0 && (
          <View style={[s.waterBarDot, { left: `${Math.min(pct, 97)}%` }]} />
        )}
      </View>

      {/* Footer */}
      <View style={s.waterFooter}>
        <Text style={s.waterLiters}>💧 {liters}L de 2.0L diários</Text>
        <Text style={[s.waterPct, { color: goalColor }]}>{Math.round(pct)}%</Text>
      </View>
    </LinearGradient>
  );
}

// ─── MAIN SCREEN ─────────────────────────────────────────────────────────────
export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [challenges, setChallenges] = useState(initialChallenges);
  const [todayXP, setTodayXP] = useState(userData.todayXP);
  const [checkinDone, setCheckinDone] = useState(false);
  const [celebVisible, setCelebVisible] = useState(false);
  const [celebEvent, setCelebEvent]   = useState(null);

  const fireScale = useRef(new Animated.Value(1)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(30)).current;
  const xpAnim = useRef(new Animated.Value(0)).current;
  const checkinScale = useRef(new Animated.Value(1)).current;

  const userTitle  = getUserTitle(userData);
  const todayQuote = quotes[new Date().getDay() % quotes.length];
  const completedChallenges = challenges.filter((c) => c.completed).length;
  const xpPercent = (userData.xp / userData.nextLevelXp) * 100;

  // ── GOAL CONFIG ──
  const totalDiff = Math.abs(userData.startWeight - userData.targetWeight);
  const weightChanged = Math.abs(userData.startWeight - userData.currentWeight);
  const weightRemaining = Math.abs(userData.currentWeight - userData.targetWeight);
  const goalPct = Math.min((weightChanged / totalDiff) * 100, 100);
  const currentPos = `${goalPct}%`;

  let goalCfg;
  if (userData.goalType === 'emagrecer') {
    goalCfg = { label: 'Emagrecer', emoji: '🔻', color: '#10B981', gradient: ['#052E16', '#0A0A18'], barColors: ['#10B981', '#34D399'], changedLabel: 'perdidos', msg: `Incrível! Você já perdeu ${weightChanged}kg — faltam só ${weightRemaining}kg para a meta! 🎯` };
  } else if (userData.goalType === 'engordar') {
    goalCfg = { label: 'Ganhar Massa', emoji: '📈', color: '#F97316', gradient: ['#431407', '#0A0A18'], barColors: ['#F97316', '#FB923C'], changedLabel: 'ganhos', msg: `Ótimo! Você ganhou ${weightChanged}kg — faltam ${weightRemaining}kg para bater a meta! 💪` };
  } else {
    goalCfg = { label: 'Manter Peso', emoji: '⚖️', color: '#3B82F6', gradient: ['#172554', '#0A0A18'], barColors: ['#3B82F6', '#60A5FA'], changedLabel: 'variação', msg: `Peso sob controle! Continue com a consistência! ✅` };
  }

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(contentAnim, { toValue: 0, duration: 600, delay: 150, useNativeDriver: true }),
      Animated.timing(xpAnim, { toValue: xpPercent, duration: 1200, delay: 400, useNativeDriver: false }),
    ]).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(fireScale, { toValue: 1.25, duration: 700, useNativeDriver: true }),
        Animated.timing(fireScale, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const completeChallenge = useCallback((id) => {
    setChallenges((prev) =>
      prev.map((c) => {
        if (c.id === id && !c.completed) {
          setTodayXP((xp) => xp + c.xp);
          return { ...c, completed: true };
        }
        return c;
      })
    );
  }, []);

  const handleCheckin = useCallback(() => {
    if (checkinDone) return;
    Animated.sequence([
      Animated.timing(checkinScale, { toValue: 0.92, duration: 100, useNativeDriver: true }),
      Animated.spring(checkinScale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
    setCheckinDone(true);
    setTodayXP((xp) => xp + 30);
    const ev = Math.random() < 0.38
      ? BOOST_EVENTS[Math.floor(Math.random() * BOOST_EVENTS.length)]
      : null;
    setCelebEvent(ev);
    setCelebVisible(true);
  }, [checkinDone]);

  return (
    <View style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>

        {/* ── HEADER ── */}
        <Animated.View style={{ opacity: headerAnim }}>
          <LinearGradient colors={['#1A1A3E', '#0A0A18']} style={[s.header, { paddingTop: insets.top + 12 }]}>
            <View style={s.headerRow}>
              <View style={s.userRow}>
                <LinearGradient colors={['#8B5CF6', '#EC4899']} style={s.avatar}>
                  <Text style={s.avatarText}>{userData.name[0]}</Text>
                </LinearGradient>
                <View>
                  <Text style={s.greeting}>Olá, {userData.name}! 💪</Text>
                  <View style={s.levelRow}>
                    <Ionicons name="star" size={11} color={COLORS.gold} />
                    <Text style={s.levelText}> Nível {userData.level}  •  Liga {userData.league} {userData.leagueEmoji}</Text>
                  </View>
                  <View style={[s.titleRow, { borderColor: userTitle.color + '40' }]}>
                    <Text style={s.titleEmoji}>{userTitle.emoji}</Text>
                    <Text style={[s.titleText, { color: userTitle.color }]}>{userTitle.title}</Text>
                  </View>
                </View>
              </View>
              <View style={s.coinsBadge}>
                <Text style={s.coinsText}>🪙 {userData.coins}</Text>
              </View>
            </View>

            {/* XP BAR */}
            <View style={s.xpSection}>
              <View style={s.xpLabels}>
                <Text style={s.xpCurrent}>⚡ {userData.xp.toLocaleString()} XP</Text>
                <Text style={s.xpNext}>→ Nível {userData.level + 1}  ({userData.nextLevelXp.toLocaleString()} XP)</Text>
              </View>
              <View style={s.xpBarBg}>
                <Animated.View
                  style={[s.xpBarFill, {
                    width: xpAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
                  }]}
                />
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View style={{ transform: [{ translateY: contentAnim }] }}>

          {/* ── STREAK HERO (destaque principal) ── */}
          <View style={s.section}>
            <StreakHeroCard fireScale={fireScale} />
          </View>

          {/* ── CHECK-IN ── */}
          <Animated.View style={[s.checkinWrap, { transform: [{ scale: checkinScale }] }]}>
            <TouchableOpacity onPress={handleCheckin} activeOpacity={0.88} disabled={checkinDone}>
              <LinearGradient
                colors={checkinDone ? ['#064E3B', '#022C22', '#0A0A18'] : ['#059669', '#047857', '#065F46']}
                style={s.checkinBtn}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                <View style={[s.checkinIconWrap, { backgroundColor: checkinDone ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.18)' }]}>
                  <Text style={s.checkinEmoji}>{checkinDone ? '✅' : '📍'}</Text>
                </View>
                <View style={s.checkinContent}>
                  <Text style={s.checkinTitle}>{checkinDone ? 'Presença registrada!' : 'Check-in na Academia'}</Text>
                  <Text style={s.checkinSub}>
                    {checkinDone
                      ? `🔥 Sequência de ${userData.streak} dias mantida! +30 XP`
                      : 'Toque para registrar sua presença hoje'}
                  </Text>
                </View>
                {checkinDone ? (
                  <View style={s.checkinXPBadge}>
                    <Text style={s.checkinXPText}>+30</Text>
                    <Text style={s.checkinXPLabel}>XP</Text>
                  </View>
                ) : (
                  <View style={s.checkinXPBadge}>
                    <Text style={s.checkinXPText}>+30</Text>
                    <Text style={s.checkinXPLabel}>XP</Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* ── ÁGUA ── */}
          <View style={s.section}>
            <WaterTracker />
          </View>

          {/* ── STATS RÁPIDAS ── */}
          <View style={s.miniStatsRow}>
            <LinearGradient colors={['#D97706', '#92400E']} style={s.miniStat}>
              <Text style={s.miniStatEmoji}>⚡</Text>
              <Text style={s.miniStatNum}>{todayXP}</Text>
              <Text style={s.miniStatLabel}>XP hoje</Text>
              <Text style={s.miniStatSub}>{todayXP} / {userData.dailyGoal} meta</Text>
            </LinearGradient>
            <LinearGradient colors={['#047857', '#064E3B']} style={s.miniStat}>
              <Text style={s.miniStatEmoji}>🏋️</Text>
              <Text style={s.miniStatNum}>{userData.weekWorkouts}</Text>
              <Text style={s.miniStatLabel}>treinos/semana</Text>
              <Text style={s.miniStatSub}>meta: 5 por semana</Text>
            </LinearGradient>
          </View>

          {/* ── MISSÕES DO DIA ── */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>⚔️ Missões do Dia</Text>
              <View style={s.progressChip}>
                <Text style={s.progressChipText}>{completedChallenges}/{challenges.length}</Text>
              </View>
            </View>
            <View style={s.challengeCard}>
              {challenges.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[s.challengeItem, c.completed && s.challengeItemDone]}
                  onPress={() => completeChallenge(c.id)}
                  activeOpacity={0.75}
                >
                  <View style={[s.checkbox, c.completed && s.checkboxDone]}>
                    {c.completed && <Ionicons name="checkmark" size={13} color="#fff" />}
                  </View>
                  <Text style={s.challengeEmoji}>{c.emoji}</Text>
                  <View style={s.challengeBody}>
                    <Text style={[s.challengeName, c.completed && s.challengeNameDone]}>{c.title}</Text>
                    <Text style={s.challengeDesc}>{c.description}</Text>
                  </View>
                  <View style={[s.xpChip, c.completed && s.xpChipDone]}>
                    <Text style={[s.xpChipText, c.completed && s.xpChipTextDone]}>+{c.xp} XP</Text>
                  </View>
                </TouchableOpacity>
              ))}
              {completedChallenges === challenges.length && (
                <LinearGradient colors={['#8B5CF6', '#6D28D9']} style={s.allDoneBanner}>
                  <Text style={s.allDoneText}>🎉  Missões completas! +200 XP bônus!</Text>
                </LinearGradient>
              )}
            </View>
          </View>

          {/* ── CHEFE DA SEMANA ── */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>👹 Chefe da Semana</Text>
            </View>
            <LinearGradient colors={['#1E1B4B', '#2D1B69']} style={s.bossCard}>
              <View style={s.bossTop}>
                <Text style={s.bossEmoji}>{bossData.emoji}</Text>
                <View style={s.bossInfo}>
                  <Text style={s.bossName}>{bossData.name}</Text>
                  <Text style={s.bossDesc}>{bossData.description}</Text>
                  <Text style={s.bossTimer}>⏰ {bossData.timeLeft} restantes</Text>
                </View>
                <LinearGradient colors={['#F59E0B', '#D97706']} style={s.bossReward}>
                  <Text style={s.bossRewardText}>+{bossData.reward}</Text>
                  <Text style={s.bossRewardLabel}>XP</Text>
                </LinearGradient>
              </View>
              <View style={s.bossProgress}>
                <View style={s.bossProgressLabels}>
                  <Text style={s.bossProgressText}>{bossData.current}/{bossData.total} treinos</Text>
                  <Text style={s.bossProgressPct}>{Math.round((bossData.current / bossData.total) * 100)}%</Text>
                </View>
                <View style={s.bossBarBg}>
                  <LinearGradient
                    colors={['#8B5CF6', '#EC4899']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={[s.bossBarFill, { width: `${(bossData.current / bossData.total) * 100}%` }]}
                  />
                </View>
                <View style={s.bossSteps}>
                  {Array.from({ length: bossData.total }).map((_, i) => (
                    <View key={i} style={[s.bossStep, i < bossData.current && s.bossStepDone]}>
                      {i < bossData.current ? (
                        <Ionicons name="checkmark" size={10} color="#fff" />
                      ) : (
                        <Text style={s.bossStepNum}>{i + 1}</Text>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* ── TREINOS RECOMENDADOS ── */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>🏆 Recomendados</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Workouts')}>
                <Text style={s.seeAll}>Ver todos →</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.hScroll}>
              {recommendedWorkouts.map((workout) => (
                <TouchableOpacity
                  key={workout.id}
                  onPress={() => navigation.navigate('WorkoutDetail', { workout })}
                  activeOpacity={0.85}
                  style={s.workoutCardWrap}
                >
                  <LinearGradient colors={workout.gradient} style={s.workoutCard}>
                    <Text style={s.workoutEmoji}>{workout.emoji}</Text>
                    <Text style={s.workoutName}>{workout.name}</Text>
                    <View style={s.workoutMeta}>
                      <Text style={s.workoutMetaText}>⏱ {workout.duration}min</Text>
                      <Text style={s.workoutMetaText}>🔥 {workout.calories}kcal</Text>
                    </View>
                    <View style={[s.diffBadge, { backgroundColor: workout.difficultyColor + '30' }]}>
                      <Text style={[s.diffText, { color: workout.difficultyColor }]}>{workout.difficulty}</Text>
                    </View>
                    <View style={s.workoutXP}>
                      <Text style={s.workoutXPText}>⚡ +{workout.xp} XP</Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* ── METAS ── */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>{goalCfg.emoji} Minha Meta</Text>
              <View style={[s.goalTypeBadge, { backgroundColor: goalCfg.color + '22', borderColor: goalCfg.color + '44' }]}>
                <Text style={[s.goalTypeBadgeText, { color: goalCfg.color }]}>{goalCfg.label}</Text>
              </View>
            </View>
            <LinearGradient colors={goalCfg.gradient} style={s.goalCard}>

              {/* Trilho de peso: Início → Atual → Meta */}
              <View style={s.goalTrackWrap}>
                <View style={s.goalTrackBarBg}>
                  <LinearGradient
                    colors={goalCfg.barColors}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={[s.goalTrackBarFill, { width: currentPos }]}
                  />
                  {/* Marcador "Você" */}
                  <View style={[s.goalTrackMarker, { left: currentPos }]}>
                    <View style={[s.goalTrackDot, { backgroundColor: goalCfg.color }]} />
                  </View>
                </View>
                {/* Labels abaixo do trilho */}
                <View style={s.goalTrackLabels}>
                  <View style={s.goalTrackLabelItem}>
                    <Text style={s.goalTrackWeight}>{userData.startWeight}kg</Text>
                    <Text style={s.goalTrackSub}>Início</Text>
                  </View>
                  <View style={[s.goalTrackLabelItem, { position: 'absolute', left: currentPos, transform: [{ translateX: -28 }] }]}>
                    <Text style={[s.goalTrackWeight, { color: goalCfg.color }]}>{userData.currentWeight}kg</Text>
                    <Text style={[s.goalTrackSub, { color: goalCfg.color }]}>Você</Text>
                  </View>
                  <View style={s.goalTrackLabelItem}>
                    <Text style={[s.goalTrackWeight, { color: goalCfg.color }]}>{userData.targetWeight}kg</Text>
                    <Text style={[s.goalTrackSub, { color: goalCfg.color }]}>Meta</Text>
                  </View>
                </View>
              </View>

              {/* Stats */}
              <View style={s.goalStatsRow}>
                <View style={s.goalStat}>
                  <Text style={[s.goalStatNum, { color: goalCfg.color }]}>{weightChanged}kg</Text>
                  <Text style={s.goalStatLabel}>{goalCfg.changedLabel}</Text>
                </View>
                <View style={[s.goalStatDivider]} />
                <View style={s.goalStat}>
                  <Text style={s.goalStatNum}>{weightRemaining}kg</Text>
                  <Text style={s.goalStatLabel}>faltam</Text>
                </View>
                <View style={s.goalStatDivider} />
                <View style={s.goalStat}>
                  <Text style={[s.goalStatNum, { color: goalCfg.color }]}>{Math.round(goalPct)}%</Text>
                  <Text style={s.goalStatLabel}>concluído</Text>
                </View>
              </View>

              {/* Mensagem */}
              <View style={[s.goalMsgRow, { borderColor: goalCfg.color + '30' }]}>
                <Text style={[s.goalMsg, { color: goalCfg.color }]}>{goalCfg.msg}</Text>
              </View>

            </LinearGradient>
          </View>

          {/* ── COMPETIÇÕES ── */}
          {(groupsData.length > 0 || rivalsData.length > 0) && (
            <View style={s.compSection}>
              <View style={s.compHeader}>
                <Text style={s.compTitle}>⚡ Competições</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Ranking')}>
                  <Text style={s.compLink}>Ver tudo →</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.compScroll}>
                {groupsData.map((g) => {
                  const allIn   = g.members.every((m) => m.checkedInToday);
                  const present = g.members.filter((m) => m.checkedInToday).length;
                  const sc      = allIn ? '#10B981' : '#F59E0B';
                  return (
                    <LinearGradient
                      key={g.id}
                      colors={['#7C3AED', '#4C1D95']}
                      style={[s.compChip, { borderColor: '#8B5CF680' }]}
                    >
                      <View style={s.compChipRow}>
                        <Text style={s.compChipEmoji}>🛡️</Text>
                        <View style={[s.compChipDot, { backgroundColor: sc, shadowColor: sc }]} />
                      </View>
                      <Text style={[s.compChipBig, { color: '#A78BFA' }]}>
                        {g.groupStreak}<Text style={s.compChipUnit}>d</Text>
                      </Text>
                      <Text style={s.compChipName} numberOfLines={1}>{g.name}</Text>
                      <LinearGradient
                        colors={[sc + '35', sc + '12']}
                        style={[s.compChipBadge, { borderColor: sc + '55' }]}
                      >
                        <Text style={[s.compChipBadgeText, { color: sc }]}>
                          {allIn ? '✅ Todos' : `⚡ ${present}/${g.members.length}`}
                        </Text>
                      </LinearGradient>
                    </LinearGradient>
                  );
                })}
                {rivalsData.map((r) => {
                  const winning = r.userScore >= r.rivalScore;
                  const pc      = winning ? '#10B981' : '#EF4444';
                  return (
                    <LinearGradient
                      key={r.id}
                      colors={r.gradient}
                      style={[s.compChip, { borderColor: r.color + '80' }]}
                    >
                      <View style={s.compChipRow}>
                        <Text style={s.compChipEmoji}>⚔️</Text>
                        <Text style={{ fontSize: 13 }}>{winning ? '👑' : '🔴'}</Text>
                      </View>
                      <View style={s.compVsRow}>
                        <Text style={[s.compChipBig, { color: winning ? '#10B981' : COLORS.white }]}>{r.userScore}</Text>
                        <Text style={s.compVsDivider}>–</Text>
                        <Text style={[s.compChipBig, { color: !winning ? '#EF4444' : COLORS.white }]}>{r.rivalScore}</Text>
                      </View>
                      <Text style={s.compChipName} numberOfLines={1}>vs {r.rival.name.split(' ')[0]}</Text>
                      <LinearGradient
                        colors={[pc + '35', pc + '12']}
                        style={[s.compChipBadge, { borderColor: pc + '55' }]}
                      >
                        <Text style={[s.compChipBadgeText, { color: pc }]}>
                          {winning ? '💪 Na frente' : '😤 Atrás'}
                        </Text>
                      </LinearGradient>
                    </LinearGradient>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* ── FRASE MOTIVACIONAL ── */}
          <View style={s.section}>
            <LinearGradient colors={['#1A1A2E', '#0D0D1A']} style={s.quoteCard}>
              <View style={s.quoteLine} />
              <Text style={s.quoteText}>"{todayQuote.text}"</Text>
              <Text style={s.quoteAuthor}>— {todayQuote.author}</Text>
            </LinearGradient>
          </View>

        </Animated.View>
      </ScrollView>
      <CheckinCelebration
        visible={celebVisible}
        event={celebEvent}
        onDismiss={() => setCelebVisible(false)}
      />
    </View>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  // Header
  header: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: '800', color: '#fff' },
  greeting: { fontSize: 17, fontWeight: '700', color: COLORS.white },
  levelRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  levelText: { fontSize: 12, color: COLORS.gray },
  coinsBadge: { backgroundColor: 'rgba(245,158,11,0.15)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 5 },
  coinsText: { color: COLORS.gold, fontSize: 13, fontWeight: '700' },
  xpSection: { gap: 6 },
  xpLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  xpCurrent: { color: COLORS.purpleLight, fontSize: 12, fontWeight: '700' },
  xpNext: { color: COLORS.gray, fontSize: 11 },
  xpBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: RADIUS.full, overflow: 'hidden' },
  xpBarFill: { height: '100%', borderRadius: RADIUS.full, backgroundColor: '#8B5CF6' },

  // Section layout
  section: { paddingHorizontal: SPACING.md, marginTop: SPACING.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
  sectionTitle: { color: COLORS.white, fontSize: 17, fontWeight: '800' },
  seeAll: { color: COLORS.purpleLight, fontSize: 13, fontWeight: '600' },

  // ── STREAK HERO ──
  streakHero: {
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.4)',
    gap: 12,
  },
  streakTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  streakLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  streakFireBig: { fontSize: 62 },
  streakNumberBig: { fontSize: 72, fontWeight: '900', color: COLORS.white, lineHeight: 76 },
  streakDaysStack: { justifyContent: 'center', gap: 0 },
  streakDaysTop: { color: COLORS.white, fontSize: 15, fontWeight: '800', lineHeight: 18 },
  streakDaysBot: { color: COLORS.gray, fontSize: 13, fontWeight: '600', lineHeight: 16 },
  streakRight: { gap: 8, alignItems: 'flex-end' },
  streakRecordBox: { backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: RADIUS.md, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)', alignItems: 'center' },
  streakRecordLabel: { color: COLORS.gold, fontSize: 10, fontWeight: '700' },
  streakRecordNum: { color: COLORS.white, fontSize: 14, fontWeight: '800' },
  streakGoalBox: { backgroundColor: 'rgba(139,92,246,0.15)', borderRadius: RADIUS.md, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)', alignItems: 'center' },
  streakGoalLabel: { color: COLORS.purpleLight, fontSize: 10, fontWeight: '700' },
  streakGoalNum: { color: COLORS.white, fontSize: 14, fontWeight: '800' },
  // milestone dots (substituem a barra de meta)
  milestoneRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', position: 'relative', paddingHorizontal: 4 },
  milestoneLine: { position: 'absolute', left: 20, right: 20, height: 1, backgroundColor: 'rgba(255,255,255,0.07)', top: 16, zIndex: 0 },
  milestoneItem: { alignItems: 'center', gap: 5, zIndex: 1 },
  milestoneDot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  milestoneDotDone: { borderColor: '#F59E0B' },
  milestoneDotNum: { color: COLORS.grayDark, fontSize: 9, fontWeight: '700' },
  milestoneLabel: { color: COLORS.grayDark, fontSize: 10, fontWeight: '700' },
  milestoneLabelDone: { color: COLORS.gold },
  streakDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  streakWeekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  streakDayCol: { alignItems: 'center', gap: 5 },
  streakDayName: { color: COLORS.gray, fontSize: 10, fontWeight: '700' },
  streakDayNameToday: { color: COLORS.purpleLight },
  streakDayDot: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  streakDayDotDone: { backgroundColor: '#7C3AED', borderColor: '#8B5CF6' },
  streakDayDotToday: { borderColor: COLORS.purpleLight, borderWidth: 2 },
  streakDayDotFuture: { opacity: 0.35 },
  streakDayTodayEmoji: { color: COLORS.purpleLight, fontSize: 16, fontWeight: '900' },
  streakDayEmpty: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.15)' },
  streakTodayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: COLORS.purple },
  streakMsgRow: { backgroundColor: 'rgba(139,92,246,0.12)', borderRadius: RADIUS.md, padding: 10, alignItems: 'center' },
  streakMsg: { color: COLORS.purpleLight, fontSize: 13, fontWeight: '600', textAlign: 'center' },

  // ── COMMITMENT STRIP ──
  commitStrip: {
    flexDirection: 'column',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: RADIUS.md,
    padding: 12,
    borderWidth: 1,
    gap: 10,
  },
  commitStripRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  commitStripTitle: { color: COLORS.gray, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  commitStripStatus: { fontSize: 13, fontWeight: '700', marginTop: 3 },
  commitBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: RADIUS.full, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
  commitBadgeScore: { fontSize: 20, fontWeight: '900' },
  commitBadgeOf: { color: COLORS.grayDark, fontSize: 12, fontWeight: '600' },
  commitBarBg: { height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: RADIUS.full, overflow: 'hidden' },
  commitBarFill: { height: '100%', borderRadius: RADIUS.full },

  // ── WATER ──
  waterCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.25)',
    gap: 12,
  },
  waterHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  waterDropWrap: {},
  waterDropCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  waterDropEmoji: { fontSize: 22 },
  waterTitle: { color: COLORS.white, fontSize: 15, fontWeight: '800' },
  waterMsg: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  waterCountBadge: { borderRadius: RADIUS.md, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', flexDirection: 'row', gap: 2 },
  waterCountNum: { fontSize: 20, fontWeight: '900' },
  waterCountDen: { color: COLORS.grayDark, fontSize: 13, fontWeight: '700' },
  glassesRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  glassWrap: { width: 34, borderRadius: RADIUS.sm, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', overflow: 'hidden', paddingBottom: 4 },
  glassWrapFull: { borderColor: 'rgba(14,165,233,0.6)', backgroundColor: 'rgba(14,165,233,0.08)' },
  glassInner: { width: '100%', height: 28, alignItems: 'center', justifyContent: 'center' },
  glassDropText: { fontSize: 16 },
  glassEmpty: { width: '100%', height: 28, alignItems: 'center', justifyContent: 'center', gap: 4 },
  glassEmptyLine: { width: '70%', height: 2, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 1 },
  glassNumText: { color: COLORS.grayDark, fontSize: 9, fontWeight: '700', marginTop: 2 },
  glassNumFull: { color: '#38BDF8' },
  waterBarBg: { height: 7, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: RADIUS.full, overflow: 'visible', position: 'relative' },
  waterBarFill: { height: '100%', borderRadius: RADIUS.full },
  waterBarDot: { position: 'absolute', top: -3, width: 13, height: 13, borderRadius: 7, backgroundColor: '#38BDF8', borderWidth: 2, borderColor: '#0A0A18', marginLeft: -6 },
  waterFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  waterLiters: { color: COLORS.gray, fontSize: 11 },
  waterPct: { fontSize: 12, fontWeight: '800' },

  // ── MINI STATS ──
  miniStatsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: SPACING.md, marginTop: SPACING.md },
  miniStat: { flex: 1, borderRadius: RADIUS.lg, padding: 12, gap: 2 },
  miniStatEmoji: { fontSize: 20 },
  miniStatNum: { fontSize: 22, fontWeight: '800', color: COLORS.white },
  miniStatLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },
  miniStatSub: { fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 },

  // ── CHECK-IN ──
  checkinWrap: { marginHorizontal: SPACING.md, marginTop: SPACING.md, borderRadius: RADIUS.xl, overflow: 'hidden', shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  checkinBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: 14, gap: 12, borderRadius: RADIUS.xl },
  checkinIconWrap: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  checkinContent: { flex: 1 },
  checkinEmoji: { fontSize: 24 },
  checkinTitle: { color: COLORS.white, fontSize: 15, fontWeight: '800' },
  checkinSub: { color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 3, lineHeight: 15 },
  checkinXPBadge: { backgroundColor: 'rgba(0,0,0,0.22)', borderRadius: RADIUS.md, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  checkinXPText: { color: '#FCD34D', fontSize: 16, fontWeight: '900' },
  checkinXPLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '700' },

  // ── CHALLENGES ──
  progressChip: { backgroundColor: COLORS.purple, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3 },
  progressChipText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
  challengeCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  challengeItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  challengeItemDone: { opacity: 0.6 },
  checkbox: { width: 22, height: 22, borderRadius: RADIUS.sm, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  checkboxDone: { backgroundColor: COLORS.purple, borderColor: COLORS.purple },
  challengeEmoji: { fontSize: 20 },
  challengeBody: { flex: 1 },
  challengeName: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  challengeNameDone: { textDecorationLine: 'line-through', color: COLORS.gray },
  challengeDesc: { color: COLORS.gray, fontSize: 11, marginTop: 1 },
  xpChip: { backgroundColor: 'rgba(139,92,246,0.2)', borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(139,92,246,0.4)' },
  xpChipDone: { backgroundColor: 'rgba(16,185,129,0.2)', borderColor: 'rgba(16,185,129,0.4)' },
  xpChipText: { color: COLORS.purpleLight, fontSize: 11, fontWeight: '700' },
  xpChipTextDone: { color: COLORS.green },
  allDoneBanner: { marginTop: 10, borderRadius: RADIUS.md, padding: 10, alignItems: 'center' },
  allDoneText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // ── BOSS ──
  bossCard: { borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)' },
  bossTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: SPACING.md },
  bossEmoji: { fontSize: 44 },
  bossInfo: { flex: 1 },
  bossName: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
  bossDesc: { color: COLORS.gray, fontSize: 12, marginTop: 2 },
  bossTimer: { color: COLORS.orange, fontSize: 11, fontWeight: '600', marginTop: 4 },
  bossReward: { borderRadius: RADIUS.md, padding: 8, alignItems: 'center', minWidth: 52 },
  bossRewardText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  bossRewardLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '600' },
  bossProgress: { gap: 8 },
  bossProgressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  bossProgressText: { color: COLORS.gray, fontSize: 12 },
  bossProgressPct: { color: COLORS.purpleLight, fontSize: 12, fontWeight: '700' },
  bossBarBg: { height: 10, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: RADIUS.full, overflow: 'hidden' },
  bossBarFill: { height: '100%', borderRadius: RADIUS.full },
  bossSteps: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 4 },
  bossStep: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  bossStepDone: { backgroundColor: COLORS.purple, borderColor: COLORS.purple },
  bossStepNum: { color: COLORS.gray, fontSize: 11, fontWeight: '700' },

  // ── WORKOUTS ──
  hScroll: { gap: 12, paddingRight: SPACING.md },
  workoutCardWrap: { borderRadius: RADIUS.lg, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  workoutCard: { width: 150, padding: SPACING.md, borderRadius: RADIUS.lg, gap: 6, minHeight: 180 },
  workoutEmoji: { fontSize: 32 },
  workoutName: { color: COLORS.white, fontSize: 14, fontWeight: '800', lineHeight: 18 },
  workoutMeta: { gap: 2 },
  workoutMetaText: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  diffBadge: { alignSelf: 'flex-start', borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3, marginTop: 2 },
  diffText: { fontSize: 10, fontWeight: '800' },
  workoutXP: { marginTop: 'auto' },
  workoutXPText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '700' },

  // ── GOAL ──
  goalTypeBadge: { borderRadius: RADIUS.full, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 3 },
  goalTypeBadgeText: { fontSize: 12, fontWeight: '700' },
  goalCard: { borderRadius: RADIUS.xl, padding: SPACING.md, gap: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  // weight track
  goalTrackWrap: { gap: 12 },
  goalTrackBarBg: { height: 10, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: RADIUS.full, overflow: 'visible', position: 'relative' },
  goalTrackBarFill: { height: '100%', borderRadius: RADIUS.full },
  goalTrackMarker: { position: 'absolute', top: -3, marginLeft: -8 },
  goalTrackDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#0A0A18' },
  goalTrackLabels: { flexDirection: 'row', justifyContent: 'space-between', position: 'relative', marginTop: 4 },
  goalTrackLabelItem: { alignItems: 'center' },
  goalTrackWeight: { color: COLORS.white, fontSize: 13, fontWeight: '800' },
  goalTrackSub: { color: COLORS.gray, fontSize: 10, fontWeight: '600', marginTop: 1 },
  // stats
  goalStatsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: RADIUS.md, paddingVertical: 12 },
  goalStat: { flex: 1, alignItems: 'center' },
  goalStatNum: { color: COLORS.white, fontSize: 20, fontWeight: '900' },
  goalStatLabel: { color: COLORS.gray, fontSize: 11, marginTop: 2 },
  goalStatDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.08)' },
  // message
  goalMsgRow: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: RADIUS.md, padding: 10, borderWidth: 1 },
  goalMsg: { fontSize: 13, fontWeight: '600', textAlign: 'center' },

  // ── COMPETIÇÕES COMPACT ──
  compSection: { paddingHorizontal: SPACING.md, marginTop: SPACING.md },
  compHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  compTitle: { color: COLORS.white, fontSize: 15, fontWeight: '800' },
  compLink: { color: COLORS.purpleLight, fontSize: 12, fontWeight: '600' },
  compScroll: { gap: 10, paddingRight: SPACING.md },
  compChip: { width: 118, borderRadius: RADIUS.xl, borderWidth: 2, padding: 12, gap: 5 },
  compChipRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  compChipEmoji: { fontSize: 20 },
  compChipDot: { width: 9, height: 9, borderRadius: 5, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 5, elevation: 4 },
  compChipBig: { color: COLORS.white, fontSize: 28, fontWeight: '900', lineHeight: 32 },
  compChipUnit: { fontSize: 14, fontWeight: '700' },
  compChipName: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '600' },
  compVsRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  compVsDivider: { color: COLORS.grayDark, fontSize: 13, fontWeight: '700' },
  compChipBadge: { borderRadius: RADIUS.full, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  compChipBadgeText: { fontSize: 9, fontWeight: '800' },

  // ── QUOTE ──
  quoteCard: { borderRadius: RADIUS.lg, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border },
  quoteLine: { width: 40, height: 3, backgroundColor: COLORS.purple, borderRadius: RADIUS.full, marginBottom: SPACING.md },
  quoteText: { color: COLORS.white, fontSize: 15, fontStyle: 'italic', lineHeight: 22, fontWeight: '500' },
  quoteAuthor: { color: COLORS.gray, fontSize: 12, marginTop: 8, fontWeight: '600' },

  // ── TITLE BADGE ──
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  titleEmoji: { fontSize: 11 },
  titleText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },

  // ── CHECK-IN CELEBRATION ──
  celebWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  celebCard: { borderRadius: RADIUS.xl, padding: 28, alignItems: 'center', gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', minWidth: 280 },
  celebBoostBadge: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 5 },
  celebBoostText: { color: 'rgba(255,255,255,0.65)', fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  celebBigEmoji: { fontSize: 68, marginVertical: 4 },
  celebTitle: { fontSize: 26, fontWeight: '900', textAlign: 'center' },
  celebDesc: { color: 'rgba(255,255,255,0.72)', fontSize: 14, textAlign: 'center', fontWeight: '500' },
  celebXPRow: { borderRadius: RADIUS.full, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 7 },
  celebXPText: { fontSize: 13, fontWeight: '700' },
  celebTap: { color: 'rgba(255,255,255,0.32)', fontSize: 12, marginTop: 6 },

});
