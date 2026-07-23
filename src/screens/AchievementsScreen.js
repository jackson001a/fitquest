import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Animated, Dimensions, Modal,
} from 'react-native';
import TouchableOpacity from '../components/TouchableOpacity';
import { LinearGradient } from 'expo-linear-gradient';
import { BarbellIcon, CheckIcon, CrownIcon, FireIcon, LightningIcon, LockIcon, MedalIcon, TargetIcon, TrophyIcon, XIcon } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS } from '../theme';
import { flameTiers } from '../data/mockData';
import { useUser } from '../context/UserContext';
import { fetchUserAchievements, getCurrentProgress } from '../services/achievementService';

const { width } = Dimensions.get('window');
const CARD_W = (width - SPACING.md * 2 - 12) / 2;

const CATEGORIES = [
  { key: 'todos',    label: 'Todos',    icon: MedalIcon },
  { key: 'streak',   label: 'Streak',   icon: FireIcon },
  { key: 'treinos',  label: 'Treinos',  icon: BarbellIcon },
  { key: 'xp',       label: 'XP',       icon: LightningIcon },
  { key: 'especial', label: 'Especial', icon: CrownIcon },
];

// ─── Explica em português o que cada tipo de condição está medindo ──────────
function explainCondition(conditionType) {
  switch (conditionType) {
    case 'streak':               return 'sua sequência de dias seguidos treinando';
    case 'workouts':              return 'o total de treinos concluídos (nunca reseta, mesmo se você perder a sequência)';
    case 'xp':                    return 'seu XP total acumulado na conta';
    case 'daily_xp':               return 'o XP ganho em um único dia';
    case 'boss_kills':            return 'quantos chefes semanais você já derrotou';
    case 'week_workouts':          return 'quantos treinos você fez nesta semana';
    case 'commitment':            return 'seu índice de disciplina, calculado pela consistência do seu plano';
    case 'challenges_completed':  return 'quantos desafios diários você já completou';
    default:                      return 'uma ação específica, e não um número que sobe aos poucos';
  }
}

// ─── Formata timestamp em "Hoje" / "Há Xd" / "Há Xm" ─────────────────────────
function formatRelativeDate(iso) {
  if (!iso) return null;
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return 'Hoje';
  if (days === 1) return 'Há 1 dia';
  if (days < 30) return `Há ${days} dias`;
  const months = Math.floor(days / 30);
  return months === 1 ? 'Há 1 mês' : `Há ${months} meses`;
}

// ─── ACHIEVEMENT CARD ─────────────────────────────────────────────────────────
function AchievementCard({ a, index, onInfo, highlighted }) {
  const scale    = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;
  const highlightAnim = useRef(new Animated.Value(0)).current;
  // Conquistas manuais ("tudo ou nada") não têm progresso numérico — ou já
  // desbloqueou, ou não.
  const hasProgress = a.condition_type !== 'manual' && a.progress != null;

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

  // Pisca a borda dourada quando o usuário chega aqui vindo do "Ver conquista" do modal
  useEffect(() => {
    if (!highlighted) { highlightAnim.setValue(0); return; }
    Animated.loop(
      Animated.sequence([
        Animated.timing(highlightAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(highlightAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
      { iterations: 5 }
    ).start();
  }, [highlighted]);

  const onPress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.92, duration: 70, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
    onInfo?.(a);
  };

  return (
    <Animated.View style={[s.cardWrap, { transform: [{ scale }] }]}>
      <TouchableOpacity onPress={onPress} activeOpacity={1}>
        <LinearGradient
          colors={a.unlocked
            ? [a.color + '75', a.color + '3A']
            : [a.color + '22', a.color + '0D', '#0A0A18']}
          style={[s.card, {
            borderColor: a.unlocked ? a.color : a.color + '35',
            shadowColor: a.unlocked ? a.color : 'transparent',
          }]}
        >
          {a.unlocked && (
            <Animated.View pointerEvents="none"
              style={[StyleSheet.absoluteFill, {
                borderRadius: RADIUS.xl, backgroundColor: a.color + '10', opacity: glowAnim,
              }]} />
          )}

          {highlighted && (
            <Animated.View pointerEvents="none"
              style={[StyleSheet.absoluteFill, {
                borderRadius: RADIUS.xl, borderWidth: 3, borderColor: COLORS.gold,
                opacity: highlightAnim,
              }]} />
          )}

          <View style={s.cardTop}>
            <LinearGradient
              colors={a.unlocked ? [a.color + 'A0', a.color + '55'] : [a.color + '35', a.color + '14']}
              style={s.emojiBox}
            >
              <Text style={[s.emoji, !a.unlocked && { opacity: 0.4 }]}>{a.emoji}</Text>
            </LinearGradient>
            {a.unlocked
              ? <LinearGradient colors={[a.color, a.color + 'AA']} style={s.checkBadge}>
                  <CheckIcon size={10} color="#fff"  weight="bold" />
                </LinearGradient>
              : <View style={s.lockBadge}>
                  <LockIcon size={9} color="rgba(255,255,255,0.25)"  weight="fill" />
                </View>
            }
          </View>

          <Text style={[s.cardName, { color: a.unlocked ? '#fff' : 'rgba(255,255,255,0.3)' }]} numberOfLines={1}>
            {a.name}
          </Text>
          <Text style={[s.cardDesc, { color: a.unlocked ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.18)' }]} numberOfLines={2}>
            {a.desc ?? a.description}
          </Text>

          {!a.unlocked && hasProgress && (
            <Text style={[s.progressNum, { color: a.color }]}>{a.progress} / {a.total}</Text>
          )}

          {a.unlocked && formatRelativeDate(a.unlocked_at) && (
            <Text style={[s.unlockedDate, { color: a.color + 'BB' }]}>✓ {formatRelativeDate(a.unlocked_at)}</Text>
          )}

          {!a.unlocked && a.condition_type === 'manual' && (
            <View style={s.iconLabelRow}>
              <TargetIcon size={11} color="rgba(255,255,255,0.25)" weight="regular" />
              <Text style={s.manualHint}>Desbloqueia com uma ação específica</Text>
            </View>
          )}

          <View style={[s.xpPill, s.iconLabelRow, {
            backgroundColor: a.unlocked ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.04)',
            borderColor:      a.unlocked ? a.color + '90' : 'rgba(255,255,255,0.07)',
          }]}>
            <LightningIcon size={12} color={a.unlocked ? '#fff' : 'rgba(255,255,255,0.2)'} weight="fill" />
            <Text style={[s.xpText, { color: a.unlocked ? '#fff' : 'rgba(255,255,255,0.2)' }]}>
              +{a.xpReward} XP
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── NEXT TARGET CARD ─────────────────────────────────────────────────────────
function NextCard({ a, onInfo }) {
  const pct = Math.max(0, Math.min(1, a.total > 0 ? a.progress / a.total : 0));
  return (
    <TouchableOpacity onPress={() => onInfo?.(a)} activeOpacity={0.85}>
      <LinearGradient
        colors={[a.color + '75', a.color + '3A']}
        style={[s.nextCard, { borderColor: a.color }]}
      >
        <LinearGradient colors={[a.color + 'A0', a.color + '55']} style={s.nextEmoji}>
          <Text style={{ fontSize: 26 }}>{a.emoji}</Text>
        </LinearGradient>

        <View style={s.nextBody}>
          <View style={s.nextTopRow}>
            <Text style={s.nextName}>{a.name}</Text>
            <Text style={[s.nextProgress, { color: a.color }]}>{a.progress} / {a.total}</Text>
          </View>
          {(a.desc ?? a.description) && (
            <Text style={s.nextDesc} numberOfLines={1}>{a.desc ?? a.description}</Text>
          )}
          <View style={s.nextBarBg}>
            <View style={[s.nextBarFill, { width: `${pct * 100}%`, backgroundColor: a.color }]} />
          </View>
          <Text style={s.nextMissing}>faltam {Math.max(0, a.total - a.progress)}  ·  toque para entender</Text>
        </View>

        <View style={[s.nextXP, { backgroundColor: 'rgba(0,0,0,0.28)', borderWidth: 1, borderColor: a.color + '90' }]}>
          <Text style={[s.nextXPNum, { color: a.color }]}>+{a.xpReward}</Text>
          <Text style={[s.nextXPLabel, { color: a.color }]}>XP</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function AchievementsScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { user, newAchievements } = useUser();
  const [activeCat,    setActiveCat]    = useState('todos');
  const [viewMode,     setViewMode]     = useState('locked'); // 'locked' | 'unlocked'
  const [achievements, setAchievements] = useState([]);
  const [infoFor,      setInfoFor]      = useState(null);
  const [headerInfo,   setHeaderInfo]   = useState(false);
  const [highlightId,  setHighlightId]  = useState(null);
  const scrollRef  = useRef(null);
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
        // Progresso calculado na hora a partir do `user` do contexto (sempre
        // fresco) em vez de confiar só no valor gravado no banco, que só é
        // atualizado quando alguma ação dispara checkAndUnlockAchievements —
        // sem isso o progresso exibido podia ficar temporariamente atrasado
        // (ex: "10 Treinos" mostrando 3 mesmo já tendo feito 4).
        progress: a.condition_type !== 'manual' ? getCurrentProgress(a, user) : (a.progress ?? 0),
      })));
    });
  }, [user?.id, user?.streak, user?.totalWorkouts, user?.xp, user?.todayXP, user?.commitment, user?.weekWorkouts, user?.totalChallengesCompleted, user?.totalBossKills]);

  // Reflete na hora conquistas desbloqueadas nesta sessão — sem isso a lista só
  // atualizava depois de um refetch (troca de aba, reabrir o app), então o selo
  // não aparecia "em tempo real" assim que a conquista era desbloqueada.
  useEffect(() => {
    if (!newAchievements?.length) return;
    setAchievements(prev => {
      const byId = new Map(prev.map(a => [a.id, a]));
      newAchievements.forEach(na => {
        const existing = byId.get(na.id);
        byId.set(na.id, {
          ...existing,
          ...na,
          xpReward:    na.xp_reward ?? existing?.xpReward ?? 0,
          total:       na.condition_value ?? existing?.total ?? 1,
          unlocked:    true,
          unlocked_at: existing?.unlocked_at ?? new Date().toISOString(),
          progress:    na.condition_value ?? existing?.progress ?? 1,
        });
      });
      return Array.from(byId.values());
    });
  }, [newAchievements]);

  // Chegou aqui pelo botão "Ver conquista" do modal de desbloqueio — troca pra
  // aba de desbloqueadas, volta pro topo e pisca a borda da conquista certa.
  useEffect(() => {
    const id = route?.params?.highlightId;
    if (!id) return;
    setViewMode('unlocked');
    setActiveCat('todos');
    setHighlightId(id);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    navigation?.setParams({ highlightId: undefined });
    const t = setTimeout(() => setHighlightId(null), 5000);
    return () => clearTimeout(t);
  }, [route?.params?.highlightId]);

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

  const nextTargets = achievements
    .filter(a => !a.unlocked && a.condition_type !== 'manual' && (a.progress ?? 0) > 0)
    .map(a => ({ ...a, progress: a.progress ?? 0, total: a.condition_value ?? 1 }))
    .sort((a, b) => (b.progress / b.total) - (a.progress / a.total))
    .slice(0, 3);

  const filtered = activeCat === 'todos'
    ? achievements
    : achievements.filter(a => a.category === activeCat);

  // As que já aparecem em "Quase lá" somem da grade de bloqueadas, pra não duplicar.
  const nextTargetIds = new Set(nextTargets.map(a => a.id));
  const locked = filtered.filter(a => !a.unlocked && !nextTargetIds.has(a.id));
  const unlocked = filtered
    .filter(a => a.unlocked)
    .sort((a, b) => new Date(b.unlocked_at ?? 0) - new Date(a.unlocked_at ?? 0));

  return (
    <View style={s.container}>
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

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
            <TouchableOpacity
              style={[s.headerBadge, { borderColor: currentTier.color + '60', backgroundColor: currentTier.color + '20' }]}
              onPress={() => setHeaderInfo(true)}
              activeOpacity={0.8}
            >
              <Text style={[s.headerBadgeNum, { color: currentTier.color }]}>{unlockedCount}</Text>
              <Text style={[s.headerBadgeSlash, { color: currentTier.color + '80' }]}>/{totalCount}</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <Animated.View style={{ opacity: headerAnim, transform: [{ translateY: headerY }] }}>

          {/* EVOLUÇÃO DA CHAMA */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <View style={s.iconLabelRow}>
                <FireIcon size={16} color="#F97316" weight="fill" />
                <Text style={s.sectionTitle}>Evolução da Chama</Text>
              </View>
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
                        colors={isUnlocked ? tier.gradient : [tier.color + '2A', tier.color + '10']}
                        style={[
                          s.flameTierCircle,
                          isActive && { borderColor: tier.color, borderWidth: 3, shadowColor: tier.color, shadowOpacity: 0.9, shadowRadius: 10, elevation: 10 },
                          !isUnlocked && { borderColor: tier.color + '30', borderWidth: 1 },
                        ]}
                      >
                        {isActive
                          ? <Animated.View style={{ transform: [{ scale: fireScale }] }}><FireIcon size={26} color="#fff" weight="fill" /></Animated.View>
                          : <FireIcon size={26} color={isUnlocked ? '#fff' : tier.color} weight="fill" style={!isUnlocked && { opacity: 0.5 }} />}
                      </LinearGradient>
                      {isActive && <View style={[s.activeDot, { backgroundColor: tier.color }]} />}
                      <Text style={[s.flameTierLabel,
                        isActive && { color: tier.color, fontWeight: '800' },
                        !isUnlocked && { color: tier.color + '90' },
                      ]}>
                        {tier.label}
                      </Text>
                      <Text style={[s.flameTierMin, { color: isUnlocked ? 'rgba(255,255,255,0.4)' : tier.color + '60' }]}>
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
                <View style={s.iconLabelRow}>
                  <LightningIcon size={16} color="#FCD34D" weight="fill" />
                  <Text style={s.sectionTitle}>Quase lá...</Text>
                </View>
                <Text style={s.sectionSub}>{nextTargets.length} próximas</Text>
              </View>
              {nextTargets.map(a => <NextCard key={a.id} a={a} onInfo={setInfoFor} />)}
            </View>
          )}

          {/* GRADE — bloqueadas / desbloqueadas */}
          <View style={s.section}>
            <View style={s.modeSwitch}>
              <TouchableOpacity
                style={[s.modeBtn, viewMode === 'locked' && s.modeBtnActive]}
                onPress={() => setViewMode('locked')}
                activeOpacity={0.8}
              >
                <MedalIcon size={14} color={viewMode === 'locked' ? '#fff' : COLORS.gray} weight={viewMode === 'locked' ? 'fill' : 'regular'} />
                <Text style={[s.modeBtnText, viewMode === 'locked' && s.modeBtnTextActive]}>Por Destravar</Text>
                <View style={[s.countBadge, viewMode !== 'locked' && { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                  <Text style={s.countBadgeText}>{locked.length}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modeBtn, viewMode === 'unlocked' && s.modeBtnActive]}
                onPress={() => setViewMode('unlocked')}
                activeOpacity={0.8}
              >
                <TrophyIcon size={14} color={viewMode === 'unlocked' ? '#fff' : COLORS.gray} weight={viewMode === 'unlocked' ? 'fill' : 'regular'} />
                <Text style={[s.modeBtnText, viewMode === 'unlocked' && s.modeBtnTextActive]}>Desbloqueadas</Text>
                <View style={[s.countBadge, viewMode !== 'unlocked' && { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                  <Text style={s.countBadgeText}>{unlockedCount}</Text>
                </View>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabScroll}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.key}
                  style={[s.tab, activeCat === cat.key && s.tabActive]}
                  onPress={() => setActiveCat(cat.key)}
                  activeOpacity={0.75}
                >
                  <cat.icon size={14} color={activeCat === cat.key ? '#fff' : COLORS.gray} weight={activeCat === cat.key ? 'fill' : 'regular'} />
                  <Text style={[s.tabText, activeCat === cat.key && s.tabTextActive]}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {viewMode === 'locked' ? (
            <>
              {locked.length > 0 && (
                <View style={s.gridSection}>
                  <View style={s.grid}>
                    {locked.map((a, i) => <AchievementCard key={a.id} a={a} index={i} onInfo={setInfoFor} />)}
                  </View>
                </View>
              )}
              {locked.length === 0 && nextTargets.filter(a => activeCat === 'todos' || a.category === activeCat).length === 0 && (
                <View style={s.empty}>
                  <TrophyIcon size={40} color={COLORS.gold} weight="fill" />
                  <Text style={s.emptyText}>Você já desbloqueou tudo nesta categoria!</Text>
                </View>
              )}
            </>
          ) : (
            <>
              {unlocked.length > 0 && (
                <View style={s.gridSection}>
                  <View style={s.grid}>
                    {unlocked.map((a, i) => (
                      <AchievementCard key={a.id} a={a} index={i} onInfo={setInfoFor} highlighted={a.id === highlightId} />
                    ))}
                  </View>
                </View>
              )}
              {unlocked.length === 0 && (
                <View style={s.empty}>
                  <MedalIcon size={40} color={COLORS.gray} weight="regular" />
                  <Text style={s.emptyText}>Nenhuma conquista desbloqueada nesta categoria ainda.</Text>
                </View>
              )}
            </>
          )}

        </Animated.View>
      </ScrollView>

      {/* Modal: o que essa conquista mede */}
      <Modal visible={!!infoFor} transparent animationType="fade" onRequestClose={() => setInfoFor(null)}>
        <TouchableOpacity style={s.infoBackdrop} activeOpacity={1} onPress={() => setInfoFor(null)}>
          <TouchableOpacity activeOpacity={1} style={s.infoCard}>
            {infoFor && (
              <>
                <View style={s.infoHeader}>
                  <View style={s.iconLabelRow}>
                    <Text style={{ fontSize: 22 }}>{infoFor.emoji}</Text>
                    <Text style={s.infoTitle}>{infoFor.name}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setInfoFor(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <XIcon size={20} color={COLORS.gray} weight="bold" />
                  </TouchableOpacity>
                </View>
                <Text style={s.infoDesc}>{infoFor.desc ?? infoFor.description}</Text>
                <Text style={s.infoExplain}>
                  Isso é medido por {explainCondition(infoFor.condition_type)}.
                </Text>
                {infoFor.condition_type !== 'manual' ? (
                  <Text style={s.infoProgress}>
                    Progresso atual: <Text style={{ fontWeight: '900', color: infoFor.color }}>{infoFor.progress ?? 0} / {infoFor.total ?? infoFor.condition_value}</Text>
                    {'  '}· faltam {Math.max(0, (infoFor.total ?? infoFor.condition_value) - (infoFor.progress ?? 0))}
                  </Text>
                ) : (
                  <Text style={s.infoProgress}>Não tem número de progresso — ela desbloqueia de uma vez quando você faz a ação certa.</Text>
                )}
                <Text style={s.infoReward}>Recompensa: +{infoFor.xpReward ?? infoFor.xp_reward} XP</Text>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Modal: o que o contador do topo significa */}
      <Modal visible={headerInfo} transparent animationType="fade" onRequestClose={() => setHeaderInfo(false)}>
        <TouchableOpacity style={s.infoBackdrop} activeOpacity={1} onPress={() => setHeaderInfo(false)}>
          <TouchableOpacity activeOpacity={1} style={s.infoCard}>
            <View style={s.infoHeader}>
              <View style={s.iconLabelRow}>
                <TrophyIcon size={20} color={COLORS.gold} weight="fill" />
                <Text style={s.infoTitle}>Suas conquistas</Text>
              </View>
              <TouchableOpacity onPress={() => setHeaderInfo(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <XIcon size={20} color={COLORS.gray} weight="bold" />
              </TouchableOpacity>
            </View>
            <Text style={s.infoDesc}>
              {unlockedCount} de {totalCount} conquistas já desbloqueadas — faltam {totalCount - unlockedCount}. Toque em qualquer conquista na lista para ver exatamente o que ela mede e quanto falta.
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  // Modal de explicação
  infoBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: SPACING.md },
  infoCard: { width: '100%', maxWidth: 420, backgroundColor: '#1A1A2E', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: COLORS.border, gap: 10 },
  infoHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  infoTitle: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
  infoDesc: { color: 'rgba(255,255,255,0.85)', fontSize: 13, lineHeight: 19 },
  infoExplain: { color: COLORS.gray, fontSize: 13, lineHeight: 19 },
  infoProgress: { color: 'rgba(255,255,255,0.85)', fontSize: 13 },
  infoReward: { color: COLORS.gold, fontSize: 13, fontWeight: '700' },

  // Header
  header: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.xl, gap: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerLabel: { color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  headerTitle: { color: '#fff', fontSize: 28, fontWeight: '900', marginTop: 2 },
  headerBadge: { borderRadius: RADIUS.xl, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  headerBadgeNum: { fontSize: 24, fontWeight: '900' },
  headerBadgeSlash: { fontSize: 15, fontWeight: '600' },

  // Sections
  section: { paddingHorizontal: SPACING.md, marginTop: SPACING.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
  iconLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { color: COLORS.white, fontSize: 18, fontWeight: '900' },
  sectionSub: { color: COLORS.gray, fontSize: 12, fontWeight: '600' },
  tierBadge: { borderRadius: RADIUS.full, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  tierBadgeText: { fontSize: 12, fontWeight: '800' },
  countBadge: { backgroundColor: COLORS.purple, borderRadius: RADIUS.full, minWidth: 24, height: 24, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7 },
  countBadgeText: { color: '#fff', fontSize: 12, fontWeight: '900' },

  // Mode switch (Por Destravar / Desbloqueadas)
  modeSwitch: { flexDirection: 'row', gap: 8, marginBottom: SPACING.sm },
  modeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: RADIUS.lg, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  modeBtnActive: { backgroundColor: COLORS.card, borderColor: COLORS.purple },
  modeBtnText: { color: COLORS.gray, fontSize: 12.5, fontWeight: '700' },
  modeBtnTextActive: { color: '#fff' },

  // Flame
  flameCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, paddingTop: SPACING.md, paddingBottom: 14, gap: 14, overflow: 'hidden' },
  flameLineWrap: { position: 'absolute', top: 43, left: 54, right: 54, height: 3, zIndex: 0 },
  flameLineBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 2 },
  flameLineProgress: { height: '100%', borderRadius: 2 },
  flameScroll: { paddingHorizontal: SPACING.md, gap: 4 },
  flameTierItem: { alignItems: 'center', width: 78, gap: 5, zIndex: 1 },
  flameTierCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'transparent' },
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
  nextDesc: { color: 'rgba(255,255,255,0.8)', fontSize: 11 },
  nextProgress: { fontSize: 14, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.55)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  nextBarBg: { height: 3, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.25)', overflow: 'hidden', marginTop: 4 },
  nextBarFill: { height: '100%', borderRadius: 2 },
  nextMissing: { color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: '600', marginTop: 2 },
  nextXP: { borderRadius: RADIUS.lg, paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center', minWidth: 58, flexShrink: 0 },
  nextXPNum: { fontSize: 17, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.55)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  nextXPLabel: { fontSize: 10, fontWeight: '800' },

  // Tabs
  tabScroll: { gap: 8, paddingBottom: 6, paddingTop: 2 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)' },
  tabActive: { backgroundColor: COLORS.purple, borderColor: COLORS.purple },
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
  progressNum: { fontSize: 11, fontWeight: '800', marginTop: 2 },
  unlockedDate: { fontSize: 10, fontWeight: '600' },
  manualHint: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.25)' },
  xpPill: { borderRadius: RADIUS.md, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start', marginTop: 'auto' },
  xpText: { fontSize: 12, fontWeight: '900' },

  // Empty
  empty: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyText: { color: COLORS.gray, fontSize: 14, fontWeight: '600' },
});
