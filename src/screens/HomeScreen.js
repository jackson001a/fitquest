import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowsDownUpIcon, BarbellIcon, CameraIcon, CheckCircleIcon, CheckIcon, ChecksIcon, CircleIcon, ClockIcon, DiamondIcon, DropIcon, FireIcon, FlagIcon, LightningIcon, MinusIcon, RocketIcon, ScanIcon, ShieldCheckeredIcon, ShieldIcon, SkullIcon, SnowflakeIcon, StarIcon, SwordIcon, TrendDownIcon, TrendUpIcon, TrophyIcon, UsersIcon, WarningIcon, XIcon } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS } from '../theme';
import {
  bossData,
  recommendedWorkouts,
  quotes,
  getUserTitle,
  getBossWeekNumber,
} from '../data/mockData';
import { useUser } from '../context/UserContext';
import ShopModal from '../components/ShopModal';
import { SUPABASE_URL, SUPABASE_ANON_KEY, supabase } from '../services/supabase';
import { fetchThisWeekWorkoutCategories } from '../services/userService';

// Calcula o progresso real do Chefe da Semana de acordo com o tipo de exigência
// (ver comentário sobre `type` em ALL_BOSSES, em data/mockData.js)
function computeBossProgress(boss, user, weekCategories) {
  const days = user.weekTrainingDays ?? [];
  switch (boss.type) {
    case 'category':
      return weekCategories.filter(c => c === boss.category).length;
    case 'distinctDays':
      return days.filter(Boolean).length;
    case 'streakDays': {
      let max = 0, cur = 0;
      for (const d of days) { cur = d ? cur + 1 : 0; max = Math.max(max, cur); }
      return max;
    }
    case 'count':
    default:
      return user.boss_kills_this_week ?? 0;
  }
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const BOOST_EVENTS = [
  { icon: FireIcon,      title: 'BOOST SECRETO!',   desc: '+50% XP por 1 hora',        color: '#F97316', gradient: ['#7C2D12', '#431407'] },
  { icon: LightningIcon, title: 'XP DOBRADO!',       desc: 'XP dobrado neste treino!',  color: '#F59E0B', gradient: ['#78350F', '#3B1500'] },
  { icon: ShieldIcon,    title: 'MISSÃO ESPECIAL!', desc: 'Nova missão desbloqueada!', color: '#8B5CF6', gradient: ['#4C1D95', '#2E1065'] },
];

const FLAVOR_EVENT_CHANCE = 0.30;

// ─── CHECK-IN CELEBRATION ────────────────────────────────────────────────────
function CheckinCelebration({ visible, event, xpGain, onDismiss }) {
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

  if (!visible) return null;

  const isBoost = event != null;
  const gain = xpGain ?? 30;
  const cfg = isBoost
    ? event
    : { icon: CheckCircleIcon, title: 'Check-in Feito!', desc: `+${gain} XP conquistados!`, color: '#10B981', gradient: ['#065F46', '#022C22'] };
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
              <cfg.icon size={64} color={cfg.color} weight="fill" style={s.celebBigEmoji} />
              <Text style={[s.celebTitle, { color: cfg.color }]}>{cfg.title}</Text>
              <Text style={s.celebDesc}>{cfg.desc}</Text>
              <View style={[s.celebXPRow, { backgroundColor: cfg.color + '20', borderColor: cfg.color + '40' }]}>
                <Text style={[s.celebXPText, { color: cfg.color }]}>
                  {isBoost ? `check-in: +${gain} XP conquistados!` : 'Sequência mantida! 🔥'}
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

// ─── VERIFICATION MODAL ──────────────────────────────────────────────────────
function VerificationModal({ visible, status, message, onDismiss }) {
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && status === 'verifying') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
          Animated.timing(scanAnim, { toValue: 0, duration: 0, useNativeDriver: true })
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      scanAnim.stopAnimation();
    }
  }, [visible, status]);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={status === 'error' ? onDismiss : undefined}>
      <View style={s.verifyModalBg}>
        {status === 'verifying' && (
          <View style={s.verifyContent}>
            <View style={s.verifyRadarWrap}>
              <Animated.View style={[s.verifyRadarRing, {
                transform: [{ scale: scanAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.8] }) }],
                opacity: scanAnim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] })
              }]} />
              <Animated.View style={[s.verifyRadarRing, {
                position: 'absolute',
                transform: [{ scale: scanAnim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1.3] }) }],
                opacity: scanAnim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [0.5, 0.6, 0] })
              }]} />
              <LinearGradient colors={['#3B82F6', '#1D4ED8']} style={s.verifyRadarCenter}>
                <ScanIcon size={32} color="#fff"  weight="regular" />
              </LinearGradient>
            </View>
            <Text style={s.verifyTitle}>Analisando Foto</Text>
            <Text style={s.verifySub}>Inteligência artificial verificando o ambiente...</Text>
          </View>
        )}
        {status === 'success' && (
          <View style={s.verifyContent}>
            <View style={[s.verifyRadarCenter, { backgroundColor: '#10B981', width: 80, height: 80, borderRadius: 40 }]}>
              <CheckIcon size={44} color="#fff"  weight="bold" />
            </View>
            <Text style={[s.verifyTitle, { color: '#10B981', marginTop: 24 }]}>Academia Confirmada!</Text>
            <Text style={s.verifySub}>Check-in validado com sucesso.</Text>
          </View>
        )}
        {status === 'error' && (
          <View style={s.verifyContent}>
            <View style={[s.verifyRadarCenter, { backgroundColor: '#EF4444', width: 80, height: 80, borderRadius: 40 }]}>
              <XIcon size={44} color="#fff"  weight="bold" />
            </View>
            <Text style={[s.verifyTitle, { color: '#EF4444', marginTop: 24 }]}>Não Reconhecido</Text>
            <Text style={[s.verifySub, { textAlign: 'center', paddingHorizontal: 20 }]}>{message || 'A foto não parece ser de uma academia.'}</Text>
            <TouchableOpacity style={s.verifyRetryBtn} onPress={onDismiss} activeOpacity={0.8}>
              <Text style={s.verifyRetryText}>Tentar Novamente</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

// ─── STREAK HERO CARD ────────────────────────────────────────────────────────
function StreakHeroCard({ user, flameOn, fireScale, fireTranslateY, onProtect }) {
  const flameColor = flameOn ? '#F97316' : COLORS.grayDark;
  const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const day = new Date().getDay();
  const todayIdx = day === 0 ? 6 : day - 1;
  const trained = user.weekTrainingDays;

  const dayOfWeekNow  = new Date().getDay();
  const daysLeftWeek  = dayOfWeekNow === 0 ? 0 : 7 - dayOfWeekNow;
  const checkinsLeft  = Math.max(0, (user.weeklyFrequency ?? 3) - (user.weekCheckinsCount ?? 0));
  const planAtRisk    = checkinsLeft > 0 && daysLeftWeek > 0 && daysLeftWeek <= checkinsLeft;

  let streakMsg;
  if (checkinsLeft === 0) {
    streakMsg = '🎉 Meta da semana atingida! Incrível!';
  } else if (planAtRisk) {
    streakMsg = `⚠️ Faltam ${checkinsLeft} treino${checkinsLeft > 1 ? 's' : ''} essa semana — não deixe o plano zerar!`;
  } else if (checkinsLeft > 0) {
    streakMsg = `💪 Faltam ${checkinsLeft} treino${checkinsLeft > 1 ? 's' : ''} para bater a meta da semana!`;
  } else if (user.streak >= 30) {
    streakMsg = '🔥 Você é imparável!';
  } else {
    streakMsg = 'Cada dia conta. Não pare agora!';
  }

  // Usa o comprometimento real do Supabase (calculado pelo servidor com base em check-ins vs planejado)
  const commitScore = user.commitment ?? 70;
  let commitCfg;
  if (commitScore >= 80)      commitCfg = { color: COLORS.green, icon: RocketIcon,   label: 'Excepcional' };
  else if (commitScore >= 60) commitCfg = { color: COLORS.blue,  icon: BarbellIcon,  label: 'Muito Bom' };
  else if (commitScore >= 40) commitCfg = { color: COLORS.gold,  icon: TrendUpIcon,  label: 'Regular' };
  else                        commitCfg = { color: COLORS.red,   icon: WarningIcon,  label: 'Precisa Melhorar' };

  return (
    <LinearGradient colors={['#2D1B69', '#1A1A3E', '#0A0A18']} style={s.streakHero}>
      {/* Top row: fire + number + record */}
      <View style={s.streakTopRow}>
        <View style={s.streakLeft}>
          <Animated.View style={{ transform: [{ scale: fireScale }, { translateY: fireTranslateY }], alignItems: 'center', justifyContent: 'center' }}>
            {flameOn && (
              <View style={{ position: 'absolute', width: 44, height: 44, backgroundColor: '#F97316', borderRadius: 22, opacity: 0.35, shadowColor: '#F59E0B', shadowOpacity: 1, shadowRadius: 20, shadowOffset: {width:0, height:0} }} />
            )}
            <FireIcon size={56} color={flameColor}  weight="fill" />
          </Animated.View>
          <Text style={s.streakNumberBig}>{user.streak}</Text>
          <View style={s.streakDaysStack}>
            <Text style={s.streakDaysTop}>dias</Text>
            <Text style={s.streakDaysBot}>seguidos</Text>
          </View>
        </View>
        <View style={s.streakRight}>
          <View style={s.streakRecordBox}>
            <View style={s.iconLabelRow}>
              <TrophyIcon size={11} color={COLORS.gold}  weight="fill" />
              <Text style={s.streakRecordLabel}>Recorde</Text>
            </View>
            <Text style={s.streakRecordNum}>{user.longestStreak} dias</Text>
          </View>
          <View style={s.streakGoalBox}>
            <View style={s.iconLabelRow}>
              <FlagIcon size={11} color={COLORS.purpleLight}  weight="fill" />
              <Text style={s.streakGoalLabel}>Meta</Text>
            </View>
            <Text style={s.streakGoalNum}>{user.streakGoal} dias</Text>
          </View>
          {/* Botão discreto de proteção */}
          <TouchableOpacity onPress={onProtect} activeOpacity={0.7} style={s.freezeIconBtn}>
            {(user.streakFreezeDays ?? 0) > 0
              ? <View style={s.iconLabelRow}>
                  <SnowflakeIcon size={13} color="#7DD3FC"  weight="fill" />
                  <Text style={s.freezeIconActive}>{user.streakFreezeDays}d</Text>
                </View>
              : <ShieldIcon size={14} color={COLORS.grayDark}  weight="regular" />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Marcos de milestone — substituem a barra de meta */}
      <View style={s.milestoneRow}>
        {[7, 14, 21, 30].map((m) => {
          const done = user.streak >= m;
          return (
            <View key={m} style={s.milestoneItem}>
              <LinearGradient
                colors={done ? ['#F59E0B', '#EF4444'] : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.06)']}
                style={[s.milestoneDot, done && s.milestoneDotDone]}
              >
                {done
                  ? <FireIcon size={12} color="#fff"  weight="fill" />
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
                  <CheckIcon size={13} color="#fff"  weight="bold" />
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

      {/* Motivational message + botão proteger */}
      <View style={s.streakMsgRow}>
        <Text style={[s.streakMsg, planAtRisk && { color: COLORS.orange }]}>{streakMsg}</Text>
      </View>

      {/* ── ÍNDICE DE DISCIPLINA ── */}
      {(() => {
        const R    = 24;
        const SW   = 5;
        const circ = 2 * Math.PI * R;
        const fill = circ - (commitScore / 100) * circ;
        const sz   = (R + SW) * 2;
        return (
          <LinearGradient colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.01)']} style={[s.commitStrip, { borderColor: commitCfg.color + '30' }]}>
            <View style={s.commitStripRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.commitStripTitle}>ÍNDICE DE DISCIPLINA</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <commitCfg.icon size={13} color={commitCfg.color} weight="fill" />
                  <Text style={[s.commitStripStatus, { color: commitCfg.color }]}>{commitCfg.label}</Text>
                </View>
                <Text style={s.commitStripSub}>Baseado na consistência do seu plano</Text>
              </View>
              {/* Anel circular */}
              <View style={s.commitRingWrap}>
                <Svg width={sz} height={sz}>
                  <Circle cx={sz/2} cy={sz/2} r={R} stroke="rgba(0,0,0,0.4)" strokeWidth={SW} fill="none" />
                  <Circle cx={sz/2} cy={sz/2} r={R}
                    stroke={commitCfg.color} strokeWidth={SW} fill="none"
                    strokeDasharray={circ} strokeDashoffset={fill}
                    strokeLinecap="round" rotation="-90" origin={`${sz/2},${sz/2}`}
                  />
                </Svg>
                <View style={s.commitRingValue}>
                  <Text style={s.commitRingNum}>{commitScore}</Text>
                  <Text style={s.commitRingPct}>%</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        );
      })()}
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

// Chave isolada POR USUÁRIO — sem isso, a água de uma conta "vazava" pra outra
// no mesmo aparelho (mesmo bug que já existiu com a foto de perfil).
const waterKeyFor = (userId) => `@capifit_water_daily_${userId}`;

function WaterTracker({ userId, goalLiters = 2.0, onGoalReached }) {
  const goalMl = Math.round(goalLiters * 1000);
  const [mlDrank,   setMlDrank]   = useState(0);
  const [goalGiven, setGoalGiven] = useState(false); // XP já dado hoje
  const fillAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!userId) return;
    setMlDrank(0);
    setGoalGiven(false);
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const today = new Date().toDateString();
    AsyncStorage.getItem(waterKeyFor(userId)).then(raw => {
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.date === today) {
        setMlDrank(saved.ml ?? 0);
        setGoalGiven(saved.goalGiven ?? false);
      }
    }).catch(() => {});
  }, [userId]);

  const persist = (ml, gv) => {
    if (!userId) return;
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    AsyncStorage.setItem(waterKeyFor(userId), JSON.stringify({ date: new Date().toDateString(), ml, goalGiven: gv })).catch(() => {});
  };

  const goalReached = mlDrank >= goalMl;

  const add = (addMl) => {
    setMlDrank(prev => {
      if (prev >= goalMl) return prev; // já bateu, não passa
      const next = Math.min(prev + addMl, goalMl);
      persist(next, goalGiven || next >= goalMl);
      // Dá XP quando bate a meta pela primeira vez no dia
      if (!goalGiven && next >= goalMl) {
        setGoalGiven(true);
        onGoalReached?.();
      }
      return next;
    });
  };

  const sub = () => {
    if (goalReached) return; // bloqueado após bater a meta
    setMlDrank(prev => {
      const next = Math.max(prev - 250, 0);
      persist(next, false);
      return next;
    });
  };

  const pct      = Math.min((mlDrank / goalMl) * 100, 100);
  const liters   = (mlDrank / 1000).toFixed(2);
  const filled   = Math.round(pct / 12.5);
  const msg      = getWaterMsg(filled);
  const goalColor = pct >= 100 ? '#10B981' : pct >= 75 ? '#38BDF8' : pct >= 50 ? '#3B82F6' : '#94A3B8';

  useEffect(() => {
    Animated.spring(fillAnim, { toValue: pct / 100, useNativeDriver: false, friction: 6 }).start();
  }, [pct]);

  return (
    <LinearGradient colors={['#0C2D4A', '#071A2E', '#0A0A18']} style={s.waterCard}>

      {/* Header */}
      <View style={s.waterHeader}>
        <LinearGradient colors={['#0EA5E9', '#0369A1']} style={s.waterDropCircle}>
          <DropIcon size={22} color="#fff"  weight="fill" />
        </LinearGradient>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.waterTitle}>Hidratação Diária</Text>
          <Text style={[s.waterMsg, { color: msg.color }]}>{msg.text}</Text>
        </View>
        <View style={[s.waterCountBadge, { borderColor: goalColor + '60', backgroundColor: goalColor + '18' }]}>
          <Text style={[s.waterCountNum, { color: goalColor }]}>{Math.round(pct)}%</Text>
        </View>
      </View>

      {/* Quantidade atual */}
      <View style={{ alignItems: 'center', marginVertical: 8 }}>
        <Text style={{ fontSize: 42, fontWeight: '900', color: COLORS.white, letterSpacing: -2 }}>
          {liters}<Text style={{ fontSize: 20, fontWeight: '600', color: COLORS.gray }}>L</Text>
        </Text>
        <Text style={{ color: COLORS.gray, fontSize: 13, marginTop: 2 }}>
          de {goalLiters.toFixed(1)}L diários
        </Text>
      </View>

      {/* Barra de progresso */}
      <View style={s.waterBarBg}>
        <Animated.View style={{ overflow: 'hidden', borderRadius: 99, height: '100%',
          width: fillAnim.interpolate({ inputRange: [0,1], outputRange: ['0%','100%'] }) }}>
          <LinearGradient colors={['#0369A1','#0EA5E9','#38BDF8']}
            start={{ x:0, y:0 }} end={{ x:1, y:0 }} style={{ flex:1 }} />
        </Animated.View>
      </View>

      {/* Botões de incremento */}
      <View style={s.waterBtnsRow}>
        {[250, 500, 750, 1000].map(ml => (
          <TouchableOpacity key={ml} onPress={() => add(ml)} activeOpacity={0.75}
            style={[s.waterAddBtn, pct >= 100 && { opacity: 0.4 }]} disabled={pct >= 100}>
            <Text style={s.waterAddBtnText}>+{ml >= 1000 ? '1L' : `${ml}ml`}</Text>
          </TouchableOpacity>
        ))}
        {!goalReached && (
          <TouchableOpacity onPress={sub} activeOpacity={0.75} style={s.waterSubBtn} disabled={mlDrank === 0}>
            <MinusIcon size={16} color={COLORS.gray}  weight="bold" />
          </TouchableOpacity>
        )}
      </View>

    </LinearGradient>
  );
}

// ─── MAIN SCREEN ─────────────────────────────────────────────────────────────
export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, challenges, completeChallenge: ctxCompleteChallenge, doCheckin, updateCurrentWeight, addXP, addGems, avatarPhoto, setForegroundChecksPaused, isPremium } = useUser();
  const [celebVisible, setCelebVisible] = useState(false);
  const [celebXpGain, setCelebXpGain] = useState(30);
  const [celebEvent, setCelebEvent]   = useState(null);
  const bonusGivenRef    = useRef(false);
  const bossXpGivenRef   = useRef(false);
  const [grantsReady,    setGrantsReady]    = useState(false);
  const [shopVisible,    setShopVisible]    = useState(false);

  // Lê AsyncStorage para saber se XP já foi dado hoje/essa semana
  useEffect(() => {
    const AS = require('@react-native-async-storage/async-storage').default;
    const weekNum = getBossWeekNumber();
    AS.multiGet([`@capifit_bonus_${todayISO}`, `@capifit_boss_xp_${weekNum}`])
      .then(([[, bonusDone], [, bossDone]]) => {
        if (bonusDone === 'true') bonusGivenRef.current = true;
        if (bossDone === 'true')  bossXpGivenRef.current = true;
        setGrantsReady(true);
      })
      .catch(() => setGrantsReady(true));
  }, []);
  const [weightModal,     setWeightModal]     = useState(false);
  const [newWeightInput,  setNewWeightInput]  = useState('');
  const [verifyModalVisible, setVerifyModalVisible] = useState(false);
  const [verifyStatus, setVerifyStatus]   = useState('verifying');
  const [verifyMessage, setVerifyMessage] = useState('');
  const todayISO = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
  const checkinDone = user.lastCheckinDate === todayISO;

  const fireScale = useRef(new Animated.Value(1)).current;
  const fireTranslateY = useRef(new Animated.Value(0)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(30)).current;
  const xpAnim = useRef(new Animated.Value(0)).current;
  const checkinScale = useRef(new Animated.Value(1)).current;

  const [activeSquads, setActiveSquads] = useState([]);
  const [activeDuels,  setActiveDuels]  = useState([]);
  const [weekCategories, setWeekCategories] = useState([]);

  // Só busca categorias quando o chefe da semana exige uma categoria específica
  useEffect(() => {
    if (!user?.id || bossData.type !== 'category') return;
    fetchThisWeekWorkoutCategories(user.id)
      .then(setWeekCategories)
      .catch(e => console.warn('[bossProgress] falha ao buscar categorias da semana:', e.message));
  }, [user?.id, user.boss_kills_this_week]);

  const loadCompetitions = useCallback(() => {
    if (!user?.id) return;
    const { getUserSquads, getUserDuels } = require('../services/socialService');
    Promise.all([getUserSquads(user.id), getUserDuels(user.id)])
      .then(([squads, duels]) => {
        setActiveSquads((squads ?? []).filter(s => !s.is_duo));
        // Duelos reais + duplas (is_duo squads) aparecem juntos na seção de rivais
        const duoSquads = (squads ?? []).filter(s => s.is_duo).map(s => ({
          id: s.id,
          name: s.name,
          isDuo: true,
          mode:       s.mode,
          myScore:    s.squad_members?.find(m => m.user_id === user.id)?.challenge_week_checkins ?? 0,
          theirScore: s.squad_members?.find(m => m.user_id !== user.id)?.challenge_week_checkins ?? 0,
          opponent:   { name: s.squad_members?.find(m => m.user_id !== user.id)?.users?.name ?? 'Parceiro' },
          gradient:   ['#4C1D95','#2E1065'],
          color:      '#C084FC',
        }));
        setActiveDuels([...duoSquads, ...(duels ?? [])]);
      }).catch(() => {});
  }, [user?.id]);

  // Recarrega toda vez que a Home ganha foco — sem isso, criar/excluir um grupo ou
  // dupla no Ranking só refletia aqui depois de fechar e reabrir o app.
  useFocusEffect(loadCompetitions);

  // Tempo real: qualquer mudança nos squads (criar/excluir/entrar) do usuário atualiza na hora,
  // mesmo com a Home já aberta em segundo plano.
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('home_squads_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'squads' }, loadCompetitions)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'squad_members' }, loadCompetitions)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rivalries' }, loadCompetitions)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, loadCompetitions]);

  const userTitle  = getUserTitle(user.totalWorkouts ?? 0);
  const todayQuote = quotes[new Date().getDay() % quotes.length];
  const completedChallenges = challenges.filter((c) => c.completed).length;
  const xpPercent = (user.xp / user.nextLevelXp) * 100;

  // ── Bônus +70 XP quando todas as missões do dia são concluídas ──
  useEffect(() => {
    if (!grantsReady || challenges.length === 0) return;
    if (completedChallenges === challenges.length && !bonusGivenRef.current) {
      bonusGivenRef.current = true;
      const AS = require('@react-native-async-storage/async-storage').default;
      AS.setItem(`@capifit_bonus_${todayISO}`, 'true').catch(() => {});
      addXP?.(70);
    }
  }, [completedChallenges, challenges.length, grantsReady]);

  // ── +XP ao derrotar o chefe da semana (apenas uma vez por semana) ──
  useEffect(() => {
    if (!grantsReady) return;
    const bossTotal   = bossData.total;
    const bossCurrent = computeBossProgress(bossData, user, weekCategories);
    if (bossCurrent >= bossTotal && !bossXpGivenRef.current) {
      bossXpGivenRef.current = true;
      const weekNum = getBossWeekNumber();
      const AS = require('@react-native-async-storage/async-storage').default;
      AS.setItem(`@capifit_boss_xp_${weekNum}`, 'true').catch(() => {});
      addXP?.(bossData.reward ?? 500);
      addGems?.(2);
      setCelebEvent({ icon: SkullIcon, title: 'CHEFE DERROTADO!', desc: `+${bossData.reward ?? 500} XP e +2 gemas conquistadas!`, color: '#F59E0B', gradient: ['#78350F', '#3B1500'] });
      setCelebVisible(true);
    }
  }, [user.boss_kills_this_week, user.weekTrainingDays, weekCategories, grantsReady]);

  // ── GOAL CONFIG ──
  const totalDiff = Math.abs(user.startWeight - user.targetWeight);
  const weightChanged = Math.abs(user.startWeight - user.currentWeight);
  const weightRemaining = Math.abs(user.currentWeight - user.targetWeight);
  const goalPct = Math.min((weightChanged / totalDiff) * 100, 100);
  const currentPos = `${goalPct}%`;

  let goalCfg;
  if (user.goalType === 'emagrecer') {
    goalCfg = { label: 'Emagrecer', icon: TrendDownIcon, color: '#10B981', gradient: ['#052E16', '#0A0A18'], barColors: ['#10B981', '#34D399'], changedLabel: 'perdidos', msg: `Incrível! Você já perdeu ${weightChanged}kg — faltam só ${weightRemaining}kg para a meta! 🎯` };
  } else if (user.goalType === 'engordar') {
    goalCfg = { label: 'Ganhar Massa', icon: TrendUpIcon, color: '#10B981', gradient: ['#052E16', '#0A0A18'], barColors: ['#10B981', '#34D399'], changedLabel: 'ganhos', msg: `Ótimo! Você ganhou ${weightChanged}kg — faltam ${weightRemaining}kg para bater a meta! 💪` };
  } else {
    goalCfg = { label: 'Manter Peso', icon: ArrowsDownUpIcon, color: '#3B82F6', gradient: ['#172554', '#0A0A18'], barColors: ['#3B82F6', '#60A5FA'], changedLabel: 'variação', msg: `Peso sob controle! Continue com a consistência! ✅` };
  }

  // Animações de entrada (só na montagem)
  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(contentAnim, { toValue: 0, duration: 600, delay: 150, useNativeDriver: true }),
    ]).start();
  }, []);

  // Foguinho só pulsa quando está aceso (streak > 0 e check-in de hoje feito, ou meta da semana já batida)
  const flameOn = (user.streak ?? 0) > 0 && !!user.isFlameActive;
  useEffect(() => {
    if (!flameOn) {
      fireScale.setValue(1);
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(fireScale, { toValue: 1.25, duration: 700, useNativeDriver: true }),
        Animated.timing(fireScale, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [flameOn]);

  // Barra de XP — re-anima sempre que o XP mudar
  useEffect(() => {
    Animated.timing(xpAnim, {
      toValue: xpPercent,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [xpPercent]);

  // As missões diárias (água, proteína, sono etc.) não têm como o app medir de
  // verdade — são autodeclaradas. Sem uma confirmação, um toque sem querer na
  // linha já credita XP e marca como feita, dando a impressão de que "bateu
  // sozinha". A confirmação também deixa claro que é o próprio usuário
  // afirmando ter cumprido a missão.
  const confirmCompleteChallenge = useCallback((challenge) => {
    Alert.alert(
      challenge.title,
      'Confirma que você já cumpriu essa missão hoje?',
      [
        { text: 'Ainda não', style: 'cancel' },
        { text: 'Sim, cumpri!', onPress: () => completeChallenge(challenge.id) },
      ],
    );
  }, []);

  const completeChallenge = useCallback((id) => {
    ctxCompleteChallenge(id);
  }, [ctxCompleteChallenge]);

  const handleCheckin = useCallback(async () => {
    if (checkinDone || verifyModalVisible) return;

    if (!isPremium) {
      Alert.alert(
        'Recurso Premium 🔒',
        'Seja Premium e faça check-in ilimitado na academia, desafios diários e muito mais!',
        [
          { text: 'Agora não', style: 'cancel' },
          { text: 'Assinar Premium', onPress: () => navigation.navigate('Paywall') },
        ]
      );
      return;
    }

    // Evita que a checagem de foreground (disparada quando a câmera nativa
    // fecha e o app volta ao primeiro plano) rode em paralelo com o check-in
    // e dispute a mesma atualização de usuário no Supabase. Só é liberada de
    // volta no fim do fluxo (handoff explícito para o setTimeout abaixo).
    setForegroundChecksPaused?.(true);
    let handedOff = false;

    try {
      // 1. Solicita permissão de câmera
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Câmera necessária', 'Precisamos da câmera para verificar que você está na academia.');
        return;
      }

      // 2. Abre câmera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.5,        // comprime para reduzir tamanho
        base64: true,        // necessário para enviar ao Claude
        allowsEditing: false,
      });

      if (result.canceled || !result.assets?.[0]?.base64) return;

      // 3. Mostra estado de verificação
      setVerifyStatus('verifying');
      setVerifyModalVisible(true);

      const base64 = result.assets[0].base64;
      const mimeType = result.assets[0].mimeType ?? 'image/jpeg';

      const resp = await fetch(
        `${SUPABASE_URL}/functions/v1/verify-gym-photo`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ imageBase64: base64, mimeType }),
        }
      );

      const data = await resp.json();

      if (data.isGym) {
        setVerifyStatus('success');
        handedOff = true;
        setTimeout(async () => {
          setVerifyModalVisible(false);
          // Anima o botão
          Animated.sequence([
            Animated.timing(checkinScale, { toValue: 0.92, duration: 100, useNativeDriver: true }),
            Animated.spring(checkinScale, { toValue: 1, friction: 4, useNativeDriver: true }),
          ]).start();

          try {
            const success = await doCheckin();
            if (success) {
              const ev = Math.random() < FLAVOR_EVENT_CHANCE
                ? BOOST_EVENTS[Math.floor(Math.random() * BOOST_EVENTS.length)]
                : null;
              setCelebXpGain(success.xpGain ?? 30);
              setCelebEvent(ev);
              setCelebVisible(true);
            }
          } catch (e) {
            console.warn('[handleCheckin] doCheckin falhou:', e.message);
          } finally {
            setForegroundChecksPaused?.(false);
          }
        }, 1500);
      } else {
        setVerifyStatus('error');
        setVerifyMessage(data.message || 'A foto não parece ser de uma academia.');
      }
    } catch (e) {
      setVerifyStatus('error');
      setVerifyMessage('Erro ao comunicar com o servidor. Tente novamente.');
    } finally {
      if (!handedOff) setForegroundChecksPaused?.(false);
    }
  }, [checkinDone, verifyModalVisible, isPremium, navigation, doCheckin, checkinScale, setForegroundChecksPaused]);

  return (
    <View style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>

        {/* ── HEADER ── */}
        <Animated.View style={{ opacity: headerAnim }}>
          <LinearGradient colors={['#1A1A3E', '#0A0A18']} style={[s.header, { paddingTop: insets.top + 12 }]}>
            <View style={s.headerRow}>
              <View style={s.userRow}>
                <TouchableOpacity onPress={() => navigation.navigate('Profile')} activeOpacity={0.8}>
                  <LinearGradient colors={['#8B5CF6', '#EC4899']} style={s.avatar}>
                    {(avatarPhoto || user.avatarUrl)
                      ? <Image source={{ uri: avatarPhoto || user.avatarUrl }} style={s.avatarImg} />
                      : <Text style={s.avatarText}>{user.name[0]}</Text>}
                  </LinearGradient>
                </TouchableOpacity>
                <View>
                  <Text style={s.greeting}>Olá, {user.name}! 💪</Text>
                  <View style={s.levelRow}>
                    <StarIcon size={11} color={COLORS.gold}  weight="fill" />
                    <Text style={s.levelText}> Nível {user.level}  •  Liga {user.league} {user.leagueEmoji}</Text>
                  </View>
                  <View style={[s.titleRow, { borderColor: userTitle.color + '40' }]}>
                    <userTitle.icon size={11} color={userTitle.color} weight="fill" />
                    <Text style={[s.titleText, { color: userTitle.color }]}>{userTitle.title}</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShopVisible(true)} activeOpacity={0.8} style={[s.gemBadge, s.iconLabelRow]}>
                <DiamondIcon size={13} color="#60A5FA"  weight="fill" />
                <Text style={s.gemBadgeText}>{user.gems ?? 0}</Text>
              </TouchableOpacity>
            </View>

            {/* XP BAR */}
            <View style={s.xpSection}>
              <View style={s.xpLabels}>
                <View style={s.iconLabelRow}>
                  <LightningIcon size={13} color={COLORS.purpleLight}  weight="fill" />
                  <Text style={s.xpCurrent}>{user.xp.toLocaleString()} XP</Text>
                </View>
                <Text style={s.xpNext}>→ Nível {user.level + 1}  ({user.nextLevelXp.toLocaleString()} XP)</Text>
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
            <StreakHeroCard
              user={user}
              flameOn={flameOn}
              fireScale={fireScale}
              fireTranslateY={fireTranslateY}
              onProtect={() => setShopVisible(true)}
            />
          </View>

          {/* ── CHECK-IN ── */}
          <Animated.View style={[s.checkinWrap, { transform: [{ scale: checkinScale }] }]}>
            <TouchableOpacity
              onPress={handleCheckin}
              activeOpacity={0.88}
              disabled={checkinDone || verifyModalVisible}
            >
              <LinearGradient
                colors={
                  checkinDone ? ['#064E3B', '#022C22', '#0A0A18'] :
                  ['#059669', '#047857', '#065F46']
                }
                style={s.checkinBtn}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                {/* Ícone */}
                <View style={[s.checkinIconWrap, {
                  backgroundColor: checkinDone ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.18)'
                }]}>
                  {checkinDone
                    ? <CheckCircleIcon size={24} color="#10B981"  weight="fill" />
                    : <CameraIcon size={24} color="#fff"  weight="fill" />
                  }
                </View>

                {/* Texto */}
                <View style={s.checkinContent}>
                  <Text style={s.checkinTitle}>
                    {checkinDone ? 'Presença registrada!' : 'Check-in na Academia'}
                  </Text>
                  <Text style={s.checkinSub}>
                    {checkinDone ? `🔥 Sequência de ${user.streak} dias! +30 XP` : 'Tire foto da academia para confirmar presença 📸'}
                  </Text>
                </View>

                {/* Badge XP */}
                {!checkinDone && (
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
            <WaterTracker
              userId={user.id}
              goalLiters={parseFloat(((user.currentWeight ?? 70) * 0.035).toFixed(1))}
              onGoalReached={() => ctxCompleteChallenge(2)}
            />
          </View>

          {/* ── STATS RÁPIDAS ── */}
          <View style={s.miniStatsRow}>
            <LinearGradient colors={['#D97706', '#92400E']} style={s.miniStat}>
              <LightningIcon size={20} color="#FCD34D" style={{shadowColor: '#FCD34D', shadowOpacity: 0.6, shadowRadius: 6}}  weight="fill" />
              <Text style={s.miniStatNum}>{user.todayXP}</Text>
              <Text style={s.miniStatLabel}>XP hoje</Text>
              <Text style={s.miniStatSub}>{user.todayXP} / {user.dailyGoal} meta</Text>
            </LinearGradient>
            <LinearGradient colors={['#047857', '#064E3B']} style={s.miniStat}>
              <ChecksIcon size={20} color="#34D399" style={{shadowColor: '#34D399', shadowOpacity: 0.6, shadowRadius: 6}}  weight="bold" />
              <Text style={s.miniStatNum}>{user.weekCheckinsCount}</Text>
              <Text style={s.miniStatLabel}>check-ins/semana</Text>
              <Text style={s.miniStatSub}>meta: {user.weeklyFrequency ?? 3} por semana</Text>
            </LinearGradient>
          </View>

          {/* ── MISSÕES DO DIA ── */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <View style={s.iconLabelRow}>
                <ShieldIcon size={16} color={COLORS.purpleLight}  weight="fill" />
                <Text style={s.sectionTitle}>Missões do Dia</Text>
              </View>
              <View style={s.progressChip}>
                <Text style={s.progressChipText}>{completedChallenges}/{challenges.length}</Text>
              </View>
            </View>
            <View style={s.challengeCard}>
              {challenges.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[s.challengeItem, c.completed && s.challengeItemDone]}
                  onPress={() => !c.completed && confirmCompleteChallenge(c)}
                  activeOpacity={0.75}
                >
                  <View style={[s.checkbox, c.completed && s.checkboxDone]}>
                    {c.completed && <CheckIcon size={13} color="#fff"  weight="bold" />}
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
                  <Text style={s.allDoneText}>🎉  Missões completas! +70 XP bônus!</Text>
                </LinearGradient>
              )}
            </View>
          </View>

          {/* ── CHEFE DA SEMANA ── */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <View style={s.iconLabelRow}>
                <SkullIcon size={16} color="#F59E0B"  weight="fill" />
                <Text style={s.sectionTitle}>Chefe da Semana</Text>
              </View>
            </View>
            <LinearGradient colors={['#1E1B4B', '#2D1B69']} style={s.bossCard}>
              <View style={s.bossTop}>
                <Text style={s.bossEmoji}>{bossData.emoji}</Text>
                <View style={s.bossInfo}>
                  <Text style={s.bossName}>{bossData.name}</Text>
                  <Text style={s.bossDesc}>{bossData.description}</Text>
                  <View style={s.iconLabelRow}>
                    <ClockIcon size={11} color={COLORS.orange}  weight="regular" />
                    <Text style={s.bossTimer}>{bossData.timeLeft} restantes</Text>
                  </View>
                </View>
                <LinearGradient colors={['#F59E0B', '#D97706']} style={s.bossReward}>
                  <Text style={s.bossRewardText}>+{bossData.reward}</Text>
                  <Text style={s.bossRewardLabel}>XP</Text>
                </LinearGradient>
              </View>
              {(() => {
                const bossTotal   = bossData.total;
                const bossCurrent = Math.min(computeBossProgress(bossData, user, weekCategories), bossTotal);
                const bossPct     = Math.round((bossCurrent / bossTotal) * 100);
                const bossUnit    = (bossData.type === 'distinctDays' || bossData.type === 'streakDays') ? 'dias' : 'treinos';
                return (
                  <View style={s.bossProgress}>
                    <View style={s.bossProgressLabels}>
                      <Text style={s.bossProgressText}>{bossCurrent}/{bossTotal} {bossUnit}</Text>
                      <Text style={s.bossProgressPct}>{bossPct}%</Text>
                    </View>
                    <View style={s.bossBarBg}>
                      <LinearGradient
                        colors={['#8B5CF6', '#EC4899']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={[s.bossBarFill, { width: `${bossPct}%` }]}
                      />
                    </View>
                    <View style={s.bossSteps}>
                      {Array.from({ length: bossTotal }).map((_, i) => (
                        <View key={i} style={[s.bossStep, i < bossCurrent && s.bossStepDone]}>
                          {i < bossCurrent ? (
                            <CheckIcon size={10} color="#fff"  weight="bold" />
                          ) : (
                            <Text style={s.bossStepNum}>{i + 1}</Text>
                          )}
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })()}
            </LinearGradient>
          </View>

          {/* ── TREINOS RECOMENDADOS ── */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <View style={s.iconLabelRow}>
                <TrophyIcon size={16} color={COLORS.gold}  weight="fill" />
                <Text style={s.sectionTitle}>Recomendados</Text>
              </View>
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
                      <View style={s.iconLabelRow}>
                        <ClockIcon size={12} color={COLORS.white}  weight="regular" />
                        <Text style={s.workoutMetaText}>{workout.duration}min</Text>
                      </View>
                      <View style={s.iconLabelRow}>
                        <FireIcon size={12} color={COLORS.white}  weight="fill" />
                        <Text style={s.workoutMetaText}>{workout.calories}kcal</Text>
                      </View>
                    </View>
                    <View style={[s.diffBadge, { backgroundColor: workout.difficultyColor + '30' }]}>
                      <Text style={[s.diffText, { color: workout.difficultyColor }]}>{workout.difficulty}</Text>
                    </View>
                    <View style={[s.workoutXP, s.iconLabelRow]}>
                      <LightningIcon size={12} color={COLORS.white}  weight="fill" />
                      <Text style={s.workoutXPText}>+{workout.xp} XP</Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* ── METAS ── */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <View style={s.iconLabelRow}>
                <goalCfg.icon size={16} color={goalCfg.color} weight="bold" />
                <Text style={s.sectionTitle}>Minha Meta</Text>
              </View>
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
                    <Text style={s.goalTrackWeight}>{user.startWeight}kg</Text>
                    <Text style={s.goalTrackSub}>Início</Text>
                  </View>
                  {goalPct > 8 && goalPct < 92 && (
                    <View style={[s.goalTrackLabelItem, { position: 'absolute', left: currentPos, transform: [{ translateX: -28 }] }]}>
                      <Text style={[s.goalTrackWeight, { color: goalCfg.color }]}>{user.currentWeight}kg</Text>
                      <Text style={[s.goalTrackSub, { color: goalCfg.color }]}>Você</Text>
                    </View>
                  )}
                  <View style={s.goalTrackLabelItem}>
                    <Text style={[s.goalTrackWeight, { color: goalCfg.color }]}>{user.targetWeight}kg</Text>
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
          {(activeSquads.length > 0 || activeDuels.length > 0) ? (
            <View style={s.compSection}>
              <View style={s.compHeader}>
                <View style={s.iconLabelRow}>
                  <LightningIcon size={15} color={COLORS.white}  weight="fill" />
                  <Text style={s.compTitle}>Competições</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('Leaderboard')}>
                  <Text style={s.compLink}>Ver tudo →</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.compScroll}>
                {activeSquads.map(g => {
                  const members    = g.squad_members ?? [];
                  const weeklyGoal = g.min_weekly_checkins ?? 3;
                  // Meta é semanal, não diária — cada um bate no próprio ritmo.
                  const present = members.filter(m => (m.challenge_week_checkins ?? 0) >= weeklyGoal).length;
                  const allIn   = members.length > 0 && present === members.length;
                  const sc      = allIn ? '#10B981' : '#F59E0B';
                  const isBattle = g.mode === 'battle';
                  return (
                    <TouchableOpacity key={g.id} activeOpacity={0.85}
                      onPress={() => navigation.navigate('Leaderboard', { initialTab: 'Grupos' })}>
                      <LinearGradient colors={['#7C3AED','#4C1D95']}
                        style={[s.compChip, { borderColor: '#8B5CF680' }]}>
                        <View style={s.compChipRow}>
                          <ShieldCheckeredIcon size={20} color="#A78BFA"  weight="fill" />
                          <View style={[s.compChipDot, { backgroundColor: sc, shadowColor: sc }]} />
                        </View>
                        <Text style={[s.compChipBig, { color: '#A78BFA' }]}>
                          {g.group_streak ?? 0}<Text style={s.compChipUnit}>d</Text>
                        </Text>
                        <Text style={s.compChipName} numberOfLines={1}>{g.name}</Text>
                        <View style={s.compChipTypeRow}>
                          {isBattle
                            ? <SwordIcon size={9} color="#F87171" weight="fill" />
                            : <ShieldIcon size={9} color="#60A5FA" weight="fill" />}
                          <Text style={[s.compChipType, { color: isBattle ? '#F87171' : '#60A5FA' }]}>
                            Grupo · {isBattle ? 'Batalha' : 'Amigos'}
                          </Text>
                        </View>
                        <LinearGradient colors={[sc+'35', sc+'12']}
                          style={[s.compChipBadge, s.iconLabelRow, { borderColor: sc+'55' }]}>
                          {allIn
                            ? <CheckCircleIcon size={11} color={sc} weight="fill" />
                            : <LightningIcon size={11} color={sc} weight="fill" />}
                          <Text style={[s.compChipBadgeText, { color: sc }]}>
                            {allIn ? 'Todos' : `${present}/${members.length}`}
                          </Text>
                        </LinearGradient>
                      </LinearGradient>
                    </TouchableOpacity>
                  );
                })}
                {activeDuels.map(d => {
                  const winning = (d.myScore ?? 0) >= (d.theirScore ?? 0);
                  const pc = winning ? '#10B981' : '#EF4444';
                  const isCollab = d.mode === 'friends';
                  return (
                    <TouchableOpacity key={d.id} activeOpacity={0.85}
                      onPress={() => navigation.navigate('Leaderboard', { initialTab: 'Duplas' })}>
                      <LinearGradient colors={['#6D28D9','#4C1D95']}
                        style={[s.compChip, { borderColor: '#A78BFA80' }]}>
                        <View style={s.compChipRow}>
                          <LightningIcon size={20} color="#F87171"  weight="regular" />
                          {winning
                            ? <TrophyIcon size={13} color={COLORS.gold} weight="fill" />
                            : <CircleIcon size={13} color="#EF4444" weight="fill" />}
                        </View>
                        <View style={s.compVsRow}>
                          <Text style={[s.compChipBig, { color: winning ? '#10B981' : COLORS.white }]}>{d.myScore ?? 0}</Text>
                          <Text style={s.compVsDivider}>–</Text>
                          <Text style={[s.compChipBig, { color: !winning ? '#EF4444' : COLORS.white }]}>{d.theirScore ?? 0}</Text>
                        </View>
                        <Text style={s.compChipName} numberOfLines={1}>vs {d.opponent?.name?.split(' ')[0] ?? 'Rival'}</Text>
                        <View style={s.compChipTypeRow}>
                          {isCollab
                            ? <ShieldIcon size={9} color="#60A5FA" weight="fill" />
                            : <SwordIcon size={9} color="#F87171" weight="fill" />}
                          <Text style={[s.compChipType, { color: isCollab ? '#60A5FA' : '#F87171' }]}>
                            Dupla · {isCollab ? 'Colaborativa' : 'Rival'}
                          </Text>
                        </View>
                        <LinearGradient colors={[pc+'35', pc+'12']}
                          style={[s.compChipBadge, s.iconLabelRow, { borderColor: pc+'55' }]}>
                          {winning
                            ? <TrendUpIcon size={11} color={pc} weight="bold" />
                            : <TrendDownIcon size={11} color={pc} weight="bold" />}
                          <Text style={[s.compChipBadgeText, { color: pc }]}>
                            {winning ? 'Na frente' : 'Atrás'}
                          </Text>
                        </LinearGradient>
                      </LinearGradient>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          ) : (
            <View style={s.compSection}>
              <View style={s.compHeader}>
                <View style={s.iconLabelRow}>
                  <LightningIcon size={15} color={COLORS.white}  weight="fill" />
                  <Text style={s.compTitle}>Competições</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('Leaderboard')}>
                  <Text style={s.compLink}>Ver tudo →</Text>
                </TouchableOpacity>
              </View>
              <LinearGradient colors={['#1A1A2E', '#12122A']} style={s.compEmptyCard}>
                <UsersIcon size={40} color={COLORS.purpleLight} style={s.compEmptyEmoji}  weight="fill" />
                <Text style={s.compEmptyTitle}>Nenhuma competição ainda</Text>
                <Text style={s.compEmptySub}>Crie um grupo ou monte uma dupla com alguém.</Text>
                <TouchableOpacity style={s.compEmptyBtn} onPress={() => navigation.navigate('CreateClan', {})} activeOpacity={0.8}>
                  <Text style={s.compEmptyBtnText}>Criar Grupo / Dupla →</Text>
                </TouchableOpacity>
              </LinearGradient>
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
        xpGain={celebXpGain}
        onDismiss={() => setCelebVisible(false)}
      />

      <ShopModal visible={shopVisible} onClose={() => setShopVisible(false)} />

      <VerificationModal
        visible={verifyModalVisible}
        status={verifyStatus}
        message={verifyMessage}
        onDismiss={() => setVerifyModalVisible(false)}
      />

      {/* Modal atualizar peso atual */}
      <Modal visible={weightModal} transparent animationType="fade" onRequestClose={() => setWeightModal(false)}>
        <TouchableOpacity style={{ flex:1, backgroundColor:'rgba(0,0,0,0.7)', justifyContent:'center', alignItems:'center' }}
          activeOpacity={1} onPress={() => setWeightModal(false)}>
          <TouchableOpacity activeOpacity={1} style={{ width:'80%', backgroundColor:'#1A1A2E', borderRadius:20, padding:24, borderWidth:1, borderColor:COLORS.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <ArrowsDownUpIcon size={18} color={COLORS.white}  weight="bold" />
              <Text style={{ color:COLORS.white, fontSize:18, fontWeight:'800' }}>Meu peso atual</Text>
            </View>
            <Text style={{ color:COLORS.gray, fontSize:13, marginBottom:16 }}>
              Atualize conforme for se pesando. A meta mostrará o quanto ainda falta.
            </Text>
            <View style={{ flexDirection:'row', alignItems:'center', backgroundColor:COLORS.bg, borderRadius:12, paddingHorizontal:16, marginBottom:20, borderWidth:1, borderColor:COLORS.border }}>
              <TextInput
                style={{ flex:1, color:COLORS.white, fontSize:28, fontWeight:'900', paddingVertical:14, letterSpacing:-1 }}
                value={newWeightInput}
                onChangeText={setNewWeightInput}
                keyboardType="decimal-pad"
                placeholder={String(user.currentWeight ?? 70)}
                placeholderTextColor={COLORS.grayDark}
                selectionColor={COLORS.purple}
                autoFocus
              />
              <Text style={{ color:COLORS.gray, fontSize:18, fontWeight:'700' }}>kg</Text>
            </View>
            {newWeightInput ? (
              <Text style={{ color:COLORS.gray, fontSize:13, textAlign:'center', marginBottom:16 }}>
                Meta: {user.targetWeight}kg  ·  Faltam {Math.abs(parseFloat(newWeightInput || 0) - (user.targetWeight ?? 0)).toFixed(1)}kg
              </Text>
            ) : null}
            <TouchableOpacity
              style={{ backgroundColor:COLORS.purple, borderRadius:12, paddingVertical:14, alignItems:'center' }}
              onPress={async () => {
                const kg = parseFloat(newWeightInput);
                if (!isNaN(kg) && kg > 0) { await updateCurrentWeight(kg); }
                setWeightModal(false);
              }}
              activeOpacity={0.85}>
              <Text style={{ color:COLORS.white, fontSize:16, fontWeight:'800' }}>Salvar</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarText: { fontSize: 20, fontWeight: '800', color: '#fff' },
  avatarImg: { width: 48, height: 48, borderRadius: 24 },
  greeting: { fontSize: 17, fontWeight: '700', color: COLORS.white },
  levelRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  levelText: { fontSize: 12, color: COLORS.gray },
  gemBadge: { backgroundColor: 'rgba(96,165,250,0.15)', borderWidth: 1, borderColor: 'rgba(96,165,250,0.3)', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 5 },
  gemBadgeText: { color: '#60A5FA', fontSize: 13, fontWeight: '700' },
  freezeIconBtn: { marginTop: 6, alignSelf: 'center', padding: 4 },
  freezeIconActive: { fontSize: 11, color: '#60A5FA', fontWeight: '700' },
  iconLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
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
    borderRadius: RADIUS.lg,
    padding: 16,
    borderWidth: 1,
    marginTop: 4,
  },
  commitStripRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  commitStripTitle: { color: COLORS.gray, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2 },
  commitStripStatus: { fontSize: 15, fontWeight: '800', marginTop: 4 },
  commitStripSub: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 4, fontWeight: '500' },
  commitRingWrap: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.2)', padding: 6, borderRadius: 99 },
  commitRingValue: { position: 'absolute', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  commitRingNum: { color: COLORS.white, fontSize: 14, fontWeight: '900' },
  commitRingPct: { color: COLORS.gray, fontSize: 10, fontWeight: '700', marginLeft: 1, marginTop: 2 },

  // ── VERIFICATION MODAL ──
  verifyModalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  verifyContent: { alignItems: 'center', paddingHorizontal: 20, width: '100%' },
  verifyRadarWrap: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center', marginBottom: 30 },
  verifyRadarRing: { position: 'absolute', width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: '#3B82F6' },
  verifyRadarCenter: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', shadowColor: '#3B82F6', shadowOpacity: 0.6, shadowRadius: 16, elevation: 8 },
  verifyTitle: { color: COLORS.white, fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  verifySub: { color: COLORS.gray, fontSize: 14, marginTop: 8 },
  verifyRetryBtn: { marginTop: 32, backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1, borderColor: '#EF4444', paddingHorizontal: 32, paddingVertical: 14, borderRadius: RADIUS.full },
  verifyRetryText: { color: '#FCA5A5', fontSize: 15, fontWeight: '700' },

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
  waterBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: RADIUS.full, overflow: 'hidden', marginBottom: 14 },
  waterBtnsRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  waterAddBtn: { flex: 1, backgroundColor: 'rgba(14,165,233,0.18)', borderRadius: RADIUS.md, paddingVertical: 9, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(14,165,233,0.35)' },
  waterAddBtnText: { color: '#38BDF8', fontSize: 12, fontWeight: '700' },
  waterSubBtn: { width: 36, height: 36, borderRadius: RADIUS.md, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
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
  retryCheckinBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8, paddingVertical: 8 },
  retryCheckinText: { color: COLORS.gray, fontSize: 13, fontWeight: '600' },

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
  updateWeightBtn: { flexDirection:'row', alignItems:'center', gap:8, marginTop:10, paddingVertical:10, paddingHorizontal:14, borderRadius:RADIUS.lg, backgroundColor:'rgba(255,255,255,0.04)', borderWidth:1 },
  updateWeightText: { flex:1, fontSize:13, fontWeight:'600' },
  updateWeightCurrent: { color:COLORS.gray, fontSize:12 },
  goalMsg: { fontSize: 13, fontWeight: '600', textAlign: 'center' },

  // ── COMPETIÇÕES COMPACT ──
  compSection: { paddingHorizontal: SPACING.md, marginTop: SPACING.md },
  compEmptyCard: { borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginTop: 8 },
  compEmptyEmoji: { fontSize: 36, marginBottom: 10 },
  compEmptyTitle: { fontSize: 16, fontWeight: '800', color: COLORS.white, marginBottom: 6 },
  compEmptySub:   { fontSize: 13, color: COLORS.gray, textAlign: 'center', lineHeight: 18, marginBottom: 16 },
  compEmptyBtn:   { backgroundColor: 'rgba(139,92,246,0.2)', borderRadius: 99, paddingHorizontal: 20, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(139,92,246,0.4)' },
  compEmptyBtnText: { color: COLORS.purpleLight, fontSize: 13, fontWeight: '700' },
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
  compChipTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  compChipType: { fontSize: 9, fontWeight: '700' },
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
