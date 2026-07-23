import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Animated, Dimensions, Modal, TextInput, Image, Alert, Linking, Platform,
} from 'react-native';
import TouchableOpacity from '../components/TouchableOpacity';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { BarbellIcon, BellIcon, CalendarIcon, CameraIcon, CaretLeftIcon, CaretRightIcon, ChartBarIcon, CheckIcon, CrownIcon, FireIcon, GearIcon, LightningIcon, LockSimpleIcon, MedalIcon, QuestionIcon, ScalesIcon, ShareNetworkIcon, SignOutIcon, TargetIcon, TrophyIcon, UsersIcon, XIcon } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS } from '../theme';
import { useUser } from '../context/UserContext';
import { fetchUserAchievements, fetchRecentActivity } from '../services/achievementService';
import { supabase } from '../services/supabase';
import { identityTitles, getUserTitle } from '../data/mockData';

const { width } = Dimensions.get('window');

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

// ─── CALENDAR ─────────────────────────────────────────────────────────────────
const TODAY = new Date();
const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DAYS_SHORT = ['S','T','Q','Q','S','S','D'];

// SETTINGS é função para poder usar dados dinâmicos
function buildSettings(friendsCount, dailyGoalXP, notificationsEnabled, isPremium) {
  return [
    { icon: CrownIcon,        label: 'Assinatura',    sub: isPremium ? 'Premium ativo · gerenciar' : 'Assine o FitQuest Premium' },
    { icon: BellIcon,         label: 'Notificações',  sub: notificationsEnabled ? 'Ativadas' : 'Toque para ativar' },
    { icon: TrophyIcon,       label: 'Metas',         sub: `Meta diária: ${dailyGoalXP} XP` },
    { icon: UsersIcon,        label: 'Amigos',        sub: friendsCount > 0 ? `${friendsCount} amigos conectados` : 'Convide amigos' },
    { icon: LockSimpleIcon,   label: 'Conta e Segurança', sub: 'Login, senha e privacidade' },
    { icon: ShareNetworkIcon, label: 'Compartilhar',  sub: 'Mostre seu progresso' },
    { icon: QuestionIcon,     label: 'Ajuda',         sub: 'FAQ e suporte' },
  ];
}

// ─── STAT BOX ────────────────────────────────────────────────────────────────
function StatBox({ value, label, icon: Icon, color }) {
  return (
    <View style={styles.statBox}>
      <Icon size={24} color={color} weight="fill" />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, updateCurrentWeight, avatarPhoto, updateAvatarPhoto, notificationsEnabled, enableNotifications, doSignOut, isPremium } = useUser();
  const headerAnim = useRef(new Animated.Value(0)).current;

  const [viewYear,      setViewYear]      = useState(TODAY.getFullYear());
  const [viewMonth,     setViewMonth]     = useState(TODAY.getMonth());
  const [trainingDays,  setTrainingDays]  = useState({});
  const [achievements,  setAchievements]  = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [friendsCount,   setFriendsCount]   = useState(0);
  const [loadingData,    setLoadingData]    = useState(true);
  const [weightModal,    setWeightModal]    = useState(false);
  const [newWeightInput, setNewWeightInput] = useState('');
  const [journeyModal,   setJourneyModal]   = useState(false);

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 700, useNativeDriver: true }).start();
  }, []);

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão necessária', 'Permita o acesso à galeria para trocar a foto.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      updateAvatarPhoto(result.assets[0].uri);
    }
  };

  // Carrega dados reais do Supabase
  useEffect(() => {
    if (!user?.id) return;
    const timeout = (ms) => new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms));
    Promise.race([
      Promise.all([
        supabase.from('checkins').select('date').eq('user_id', user.id)
          .gte('date', (() => { const d = new Date(); d.setMonth(d.getMonth()-4); return d.toISOString().split('T')[0]; })()),
        fetchUserAchievements(user.id),
        fetchRecentActivity(user.id, 8),
        // Conta amigos
        supabase.from('friendships').select('*', { count: 'exact', head: true })
          .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`).eq('status', 'accepted'),
      ]),
      timeout(6000),
    ]).then(([{ data: checkins }, achs, activity, { count: fc }]) => {
      setFriendsCount(fc ?? 0);
      // Monta mapa de dias treinados
      const map = {};
      (checkins ?? []).forEach(c => {
        const [y, m, d] = c.date.split('-').map(Number);
        const key = `${y}-${m - 1}`; // month é 0-indexed
        if (!map[key]) map[key] = new Set();
        map[key].add(d);
      });
      setTrainingDays(map);
      setAchievements(achs ?? []);
      setRecentActivity(activity ?? []);
      setLoadingData(false);
    }).catch(() => setLoadingData(false));
  }, [user?.id]);

  function getTrainingDays(year, month) {
    return trainingDays[`${year}-${month}`] || new Set();
  }

  const xpPercent  = ((user?.xp ?? 0) / (user?.nextLevelXp ?? 1000)) * 100;
  const userTitle  = getUserTitle(user?.totalWorkouts ?? 0);
  const nextTitle  = (userTitle.idx + 1 < identityTitles.length) ? identityTitles[userTitle.idx + 1] : null;
  const unlockedAch = achievements.filter(a => a.unlocked);
  const personalRecords = Object.entries(user?.personalRecords ?? {})
    .map(([exercise, kg]) => ({ exercise, kg, isNew: false }))
    .sort((a, b) => b.kg - a.kg);

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

  const calendarDays   = getTrainingDays(viewYear, viewMonth);
  const trainedCount   = calendarDays.size;
  const isCurrentView  = viewYear === TODAY.getFullYear() && viewMonth === TODAY.getMonth();
  const isNextDisabled = isCurrentView;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>

        {/* ── HEADER ── */}
        <Animated.View style={{ opacity: headerAnim }}>
          <LinearGradient colors={['#1A1A3E', '#12122A']} style={[styles.profileHeader, { paddingTop: insets.top + 12 }]}>
            <View style={styles.avatarSection}>
              <TouchableOpacity onPress={pickAvatar} activeOpacity={0.85} style={styles.avatarOuter}>
                <LinearGradient colors={['#8B5CF6', '#EC4899']} style={styles.avatarCircle}>
                  {(avatarPhoto || user.avatarUrl)
                    ? <Image source={{ uri: avatarPhoto || user.avatarUrl }} style={styles.avatarPhoto} />
                    : <Text style={styles.avatarText}>{user.name[0]}</Text>}
                </LinearGradient>
                <View style={styles.levelBadge}>
                  <Text style={styles.levelBadgeText}>{user.level}</Text>
                </View>
                <View style={styles.cameraBtn}>
                  <CameraIcon size={12} color="#fff"  weight="fill" />
                </View>
              </TouchableOpacity>
              <Text style={styles.profileName}>{user.name}</Text>
              <TouchableOpacity
                style={[styles.profileTitleBadge, { borderColor: userTitle.color + '50', backgroundColor: userTitle.color + '12' }]}
                onPress={() => setJourneyModal(true)}
                activeOpacity={0.8}
              >
                <userTitle.icon size={13} color={userTitle.color} weight="fill" />
                <Text style={[styles.profileTitleText, { color: userTitle.color }]}>{userTitle.title}</Text>
              </TouchableOpacity>
              {nextTitle && (
                <TouchableOpacity onPress={() => setJourneyModal(true)} activeOpacity={0.7}>
                  <Text style={styles.nextTitleHint}>
                    próximo: <Text style={{ color: nextTitle.color, fontWeight: '700' }}>{nextTitle.title}</Text> — faltam {Math.max(0, nextTitle.min - (user?.totalWorkouts ?? 0))} treinos
                  </Text>
                </TouchableOpacity>
              )}
              <View style={styles.profileLeague}>
                <Text style={styles.profileLeagueText}>
                  {user.leagueEmoji} Liga {user.league}  ·  #{user.rank ?? '—'} no ranking
                </Text>
              </View>
              {/* Código do usuário + botão amigos */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                <View style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}>
                  <Text style={{ color: COLORS.gray, fontSize: 10, fontWeight: '600' }}>Meu código</Text>
                  <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: '900', letterSpacing: 3 }}>{user.user_code ?? '------'}</Text>
                </View>
                <TouchableOpacity
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(139,92,246,0.2)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(139,92,246,0.4)' }}
                  onPress={() => navigation.navigate('Friends')}
                  activeOpacity={0.8}>
                  <UsersIcon size={16} color={COLORS.purpleLight} weight="fill" />
                  <Text style={{ color: COLORS.purpleLight, fontSize: 13, fontWeight: '700' }}>Amigos</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.xpSection}>
              <View style={styles.xpRow}>
                <View style={styles.iconLabelRow}>
                  <LightningIcon size={13} color={COLORS.purpleLight} weight="fill" />
                  <Text style={styles.xpLabel}>{user.xp.toLocaleString()} XP</Text>
                </View>
                <Text style={styles.xpNextLabel}>Nível {user.level + 1} → {user.nextLevelXp.toLocaleString()} XP</Text>
              </View>
              <View style={styles.xpBarBg}>
                <View style={[styles.xpBarFill, { width: `${xpPercent}%` }]} />
              </View>
            </View>

          </LinearGradient>
        </Animated.View>

        {/* ── ATUALIZAR PESO ── */}
        <View style={[styles.section, { paddingTop: 0 }]}>
          <TouchableOpacity
            style={styles.updateWeightBtn}
            onPress={() => { setNewWeightInput(String(user?.currentWeight ?? '')); setWeightModal(true); }}
            activeOpacity={0.8}>
            <ScalesIcon size={20} color={COLORS.white} weight="regular" />
            <View style={{ flex: 1 }}>
              <Text style={styles.updateWeightTitle}>Meu peso atual</Text>
              <Text style={styles.updateWeightSub}>Toque para atualizar · Atual: {user?.currentWeight ?? '—'}kg</Text>
            </View>
            <CaretRightIcon size={18} color={COLORS.grayDark}  weight="bold" />
          </TouchableOpacity>
        </View>

        {/* ── STATS ── */}
        <View style={styles.statsSection}>
          <View style={styles.iconLabelRow}>
            <ChartBarIcon size={17} color={COLORS.white} weight="fill" />
            <Text style={styles.sectionTitle}>Estatísticas</Text>
          </View>
          <View style={styles.statsGrid}>
            <StatBox value={user.totalWorkouts}                label="Treinos"          icon={BarbellIcon}   color={COLORS.purple} />
            <StatBox value={user.longestStreak}                label="Maior sequência"  icon={FireIcon}      color={COLORS.red}    />
            <StatBox value={user.streak}                       label="Sequência atual"  icon={LightningIcon} color={COLORS.gold}   />
            <StatBox value={`${(user.xp / 1000).toFixed(1)}k`} label="XP total"        icon={TrophyIcon}    color={COLORS.green}  />
          </View>
        </View>

        {/* ── CALENDÁRIO DO MÊS ── */}
        <View style={styles.section}>
          <View style={styles.iconLabelRow}>
            <CalendarIcon size={17} color={COLORS.white} weight="fill" />
            <Text style={styles.sectionTitle}>Histórico de Treinos</Text>
          </View>
          <View style={styles.calCard}>

            {/* Nav */}
            <View style={styles.calNavRow}>
              <TouchableOpacity style={styles.calNavBtn} onPress={goToPrev}>
                <CaretLeftIcon size={16} color={COLORS.purpleLight}  weight="bold" />
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
                <CaretRightIcon size={16} color={isNextDisabled ? COLORS.grayDark : COLORS.purpleLight}  weight="bold" />
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
                const isTrained = calendarDays.has(d);
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
          <View style={styles.iconLabelRow}>
            <TrophyIcon size={17} color={COLORS.white} weight="fill" />
            <Text style={styles.sectionTitle}>Recordes Pessoais</Text>
          </View>
          {personalRecords.length === 0 ? (
            <View style={styles.emptyCard}>
              <BarbellIcon size={36} color={COLORS.gray} weight="regular" style={{ marginBottom: 10 }} />
              <Text style={styles.emptyCardText}>Nenhum recorde ainda.{'\n'}Complete treinos para registrar seus pesos máximos!</Text>
            </View>
          ) : personalRecords.map((pr, i) => (
            <View key={i} style={[styles.prItem, pr.isNew && { borderColor: '#F59E0B55' }]}>
              <View style={[styles.prIconWrap, { backgroundColor: 'rgba(139,92,246,0.12)' }]}>
                <TargetIcon size={20} color={COLORS.purpleLight} weight="fill" />
              </View>
              <View style={styles.prInfo}>
                <Text style={styles.prExercise}>{pr.exercise}</Text>
              </View>
              <View style={styles.prRight}>
                <Text style={[styles.prKg, { color: COLORS.white }]}>{pr.kg}kg</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── SELOS OBTIDOS ── */}
        <View style={styles.sealsSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconLabelRow}>
              <MedalIcon size={17} color={COLORS.white} weight="fill" />
              <Text style={styles.sectionTitle}>Selos Obtidos</Text>
            </View>
            <View style={styles.sealCountBadge}>
              <Text style={styles.sealCountText}>{unlockedAch.length} selos</Text>
            </View>
          </View>
          {unlockedAch.length === 0 ? (
            <View style={styles.emptyCard}>
              <MedalIcon size={36} color={COLORS.gray} weight="regular" style={{ marginBottom: 10 }} />
              <Text style={styles.emptyCardText}>Nenhum selo ainda. Complete desafios para ganhar seus primeiros selos!</Text>
            </View>
          ) : (
            <View style={styles.sealsGrid}>
              {unlockedAch.map(a => (
                <TouchableOpacity
                  key={a.id}
                  style={styles.sealItem}
                  activeOpacity={0.8}
                  onPress={() => Alert.alert(
                    `${a.emoji} ${a.name}`,
                    `${a.description}\n\nConquistado ${formatRelativeDate(a.unlocked_at)?.toLowerCase() ?? 'há um tempo'} · +${a.xp_reward ?? 0} XP`,
                  )}
                >
                  <LinearGradient
                    colors={[a.color + '45', a.color + '20', a.color + '08']}
                    style={[styles.sealBadge, { borderColor: a.color + '65', shadowColor: a.color }]}
                  >
                    <Text style={styles.sealEmoji}>{a.emoji}</Text>
                    <LinearGradient colors={[a.color, a.color + 'CC']} style={styles.sealCheckDot}>
                      <CheckIcon size={8} color="#fff"  weight="bold" />
                    </LinearGradient>
                  </LinearGradient>
                  <Text style={[styles.sealName, { color: a.color }]} numberOfLines={2}>{a.name}</Text>
                  {formatRelativeDate(a.unlocked_at) && (
                    <Text style={styles.sealDate}>{formatRelativeDate(a.unlocked_at)}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ── SETTINGS ── */}
        <View style={styles.settingsSection}>
          <View style={styles.iconLabelRow}>
            <GearIcon size={17} color={COLORS.white} weight="fill" />
            <Text style={styles.sectionTitle}>Configurações</Text>
          </View>
          {buildSettings(friendsCount, user?.dailyGoal ?? 200, notificationsEnabled, isPremium).map((item, i) => (
            <TouchableOpacity key={i} style={styles.settingItem} activeOpacity={0.7}
              onPress={async () => {
                if (item.label === 'Assinatura') {
                  if (isPremium) {
                    Linking.openURL(Platform.OS === 'ios'
                      ? 'itms-apps://apps.apple.com/account/subscriptions'
                      : 'https://play.google.com/store/account/subscriptions');
                  } else {
                    navigation.navigate('Paywall');
                  }
                }
                else if (item.label === 'Amigos') navigation.navigate('Friends');
                else if (item.label === 'Metas') navigation.navigate('EditGoal');
                else if (item.label === 'Conta e Segurança') navigation.navigate('AccountSecurity');
                else if (item.label === 'Ajuda') navigation.navigate('Help');
                else if (item.label === 'Notificações') {
                  if (notificationsEnabled) {
                    Alert.alert('Notificações ativadas', 'Você já recebe lembretes de treino e alertas de sequência neste aparelho.');
                    return;
                  }
                  const granted = await enableNotifications();
                  Alert.alert(
                    granted ? 'Notificações ativadas! 🔔' : 'Permissão negada',
                    granted
                      ? 'Você vai receber lembretes quando sua sequência estiver em risco.'
                      : 'Ative as notificações do CapiFit nas configurações do seu celular para receber lembretes.'
                  );
                }
                else if (item.label === 'Compartilhar') {
                  const { shareExternal, buildShareText } = require('../services/socialService');
                  shareExternal(buildShareText(user, 'default', ''));
                }
              }}>
              <View style={styles.settingIcon}>
                <item.icon size={20} color={COLORS.purpleLight} weight="regular" />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>{item.label}</Text>
                <Text style={styles.settingSub}>{item.sub}</Text>
              </View>
              <CaretRightIcon size={18} color={COLORS.grayDark}  weight="bold" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.signOutBtn}
          activeOpacity={0.8}
          onPress={() => {
            Alert.alert(
              'Sair da conta',
              'Você poderá entrar novamente com seu login ou criar uma nova conta. Nada do seu progresso é apagado.',
              [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Sair', style: 'destructive', onPress: () => doSignOut() },
              ]
            );
          }}
        >
          <SignOutIcon size={18} color={COLORS.red}  weight="regular" />
          <Text style={styles.signOutText}>Sair da conta</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Modal jornada de títulos */}
      <Modal visible={journeyModal} transparent animationType="fade" onRequestClose={() => setJourneyModal(false)}>
        <TouchableOpacity style={styles.journeyBackdrop} activeOpacity={1} onPress={() => setJourneyModal(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.journeyCard}>
            <View style={styles.journeyHeader}>
              <View style={styles.iconLabelRow}>
                <TrophyIcon size={18} color={COLORS.white} weight="fill" />
                <Text style={styles.journeyTitle}>Jornada de Títulos</Text>
              </View>
              <TouchableOpacity onPress={() => setJourneyModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <XIcon size={20} color={COLORS.gray} weight="bold" />
              </TouchableOpacity>
            </View>
            <Text style={styles.journeySub}>
              Progride conforme o total de treinos concluídos — não depende da sua sequência de dias.
            </Text>
            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {identityTitles.map((t, i) => {
                const total = user?.totalWorkouts ?? 0;
                const unlocked = total >= t.min;
                const isCurrent = i === userTitle.idx;
                const nextMin = identityTitles[i + 1]?.min;
                const progress = nextMin ? Math.min(1, (total - t.min) / (nextMin - t.min)) : 1;
                return (
                  <View
                    key={t.title}
                    style={[
                      styles.journeyRow,
                      isCurrent && { borderColor: t.color + '60', backgroundColor: t.color + '12' },
                    ]}
                  >
                    <View style={[styles.journeyIconWrap, { backgroundColor: (unlocked ? t.color : COLORS.grayDark) + '22' }]}>
                      {unlocked
                        ? <t.icon size={18} color={t.color} weight="fill" />
                        : <LockSimpleIcon size={16} color={COLORS.grayDark} weight="fill" />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.journeyRowTitle, { color: unlocked ? COLORS.white : COLORS.gray }]}>{t.title}</Text>
                        {isCurrent && <View style={[styles.journeyCurrentPill, { backgroundColor: t.color }]}><Text style={styles.journeyCurrentPillText}>ATUAL</Text></View>}
                      </View>
                      <Text style={styles.journeyRowReq}>{t.req}</Text>
                      {isCurrent && nextMin && (
                        <View style={styles.journeyBarBg}>
                          <View style={[styles.journeyBarFill, { width: `${progress * 100}%`, backgroundColor: t.color }]} />
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Modal atualizar peso */}
      <Modal visible={weightModal} transparent animationType="fade" onRequestClose={() => setWeightModal(false)}>
        <TouchableOpacity style={{ flex:1, backgroundColor:'rgba(0,0,0,0.7)', justifyContent:'center', alignItems:'center' }}
          activeOpacity={1} onPress={() => setWeightModal(false)}>
          <TouchableOpacity activeOpacity={1} style={{ width:'80%', backgroundColor:'#1A1A2E', borderRadius:20, padding:24, borderWidth:1, borderColor:COLORS.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <ScalesIcon size={18} color={COLORS.white} weight="regular" />
              <Text style={{ color:COLORS.white, fontSize:18, fontWeight:'800' }}>Meu peso atual</Text>
            </View>
            <Text style={{ color:COLORS.gray, fontSize:13, marginBottom:16 }}>
              Atualize conforme for se pesando. Sua meta em "Minha Meta" se recalcula automaticamente.
            </Text>
            <View style={{ flexDirection:'row', alignItems:'center', backgroundColor:COLORS.bg, borderRadius:12, paddingHorizontal:16, marginBottom:20, borderWidth:1, borderColor:COLORS.border }}>
              <TextInput
                style={{ flex:1, color:COLORS.white, fontSize:28, fontWeight:'900', paddingVertical:14 }}
                value={newWeightInput}
                onChangeText={setNewWeightInput}
                keyboardType="decimal-pad"
                placeholder={String(user?.currentWeight ?? 70)}
                placeholderTextColor={COLORS.grayDark}
                autoFocus
              />
              <Text style={{ color:COLORS.gray, fontSize:18, fontWeight:'700' }}>kg</Text>
            </View>
            {newWeightInput ? (
              <Text style={{ color:COLORS.gray, fontSize:13, textAlign:'center', marginBottom:16 }}>
                Meta: {user?.targetWeight}kg  ·  Faltam {Math.abs(parseFloat(newWeightInput || 0) - (user?.targetWeight ?? 0)).toFixed(1)}kg
              </Text>
            ) : null}
            <TouchableOpacity
              style={{ backgroundColor:COLORS.purple, borderRadius:12, paddingVertical:14, alignItems:'center' }}
              onPress={async () => {
                const kg = parseFloat(newWeightInput);
                if (!isNaN(kg) && kg > 0) await updateCurrentWeight?.(kg);
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  // Jornada de títulos (modal)
  journeyBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: SPACING.md },
  journeyCard: { width: '100%', maxWidth: 420, backgroundColor: '#1A1A2E', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: COLORS.border },
  journeyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  journeyTitle: { color: COLORS.white, fontSize: 17, fontWeight: '800' },
  journeySub: { color: COLORS.gray, fontSize: 12, marginBottom: 16, lineHeight: 17 },
  journeyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: 'transparent', padding: 10, marginBottom: 8 },
  journeyIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  journeyRowTitle: { fontSize: 14, fontWeight: '800' },
  journeyRowReq: { color: COLORS.gray, fontSize: 11, marginTop: 2 },
  journeyCurrentPill: { borderRadius: RADIUS.full, paddingHorizontal: 6, paddingVertical: 1 },
  journeyCurrentPillText: { color: '#fff', fontSize: 8, fontWeight: '900' },
  journeyBarBg: { height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, marginTop: 6, overflow: 'hidden' },
  journeyBarFill: { height: '100%', borderRadius: 2 },

  // Header
  profileHeader: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.xl, gap: 16 },
  avatarSection: { alignItems: 'center', gap: 8 },
  avatarOuter: { position: 'relative' },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#fff' },
  avatarPhoto: { width: 80, height: 80, borderRadius: 40 },
  levelBadge: { position: 'absolute', bottom: -4, right: -4, backgroundColor: COLORS.gold, borderRadius: RADIUS.full, width: 26, height: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.bgSecondary },
  levelBadgeText: { color: '#000', fontSize: 11, fontWeight: '800' },
  cameraBtn: { position: 'absolute', bottom: 18, left: -4, backgroundColor: '#8B5CF6', borderRadius: RADIUS.full, width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.bgSecondary },
  profileName: { color: COLORS.white, fontSize: 22, fontWeight: '800' },
  profileTitleBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: RADIUS.full, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 6 },
  profileTitleText: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  profileLeague: { backgroundColor: 'rgba(139,92,246,0.15)', borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)' },
  profileLeagueText: { color: COLORS.purpleLight, fontSize: 12, fontWeight: '600' },
  xpSection: { gap: 6 },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between' },
  iconLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  xpLabel: { color: COLORS.purpleLight, fontSize: 12, fontWeight: '700' },
  xpNextLabel: { color: COLORS.gray, fontSize: 11 },
  xpBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: RADIUS.full, overflow: 'hidden' },
  xpBarFill: { height: '100%', backgroundColor: COLORS.purple, borderRadius: RADIUS.full },

  // Section
  section: { paddingHorizontal: SPACING.md, marginTop: SPACING.lg },
  sectionTitle: { color: COLORS.white, fontSize: 17, fontWeight: '800', marginBottom: SPACING.sm },

  nextTitleHint: { color: COLORS.gray, fontSize: 11, marginTop: 6, textAlign: 'center' },

  // Stats
  statsSection: { paddingHorizontal: SPACING.md, marginTop: SPACING.lg },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statBox: { width: (width - SPACING.md * 2 - 10) / 2, backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.md, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: COLORS.border },
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
  emptyCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  emptyCardText: { color: COLORS.gray, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  prIconWrap: { width: 42, height: 42, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
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
  sealDate: { fontSize: 9, fontWeight: '600', color: COLORS.gray, textAlign: 'center', marginTop: 1 },

  // Settings
  settingsSection: { paddingHorizontal: SPACING.md, marginTop: SPACING.lg },
  settingItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: 14, marginBottom: 8, gap: 12, borderWidth: 1, borderColor: COLORS.border },
  settingIcon: { width: 36, height: 36, borderRadius: RADIUS.sm, backgroundColor: 'rgba(139,92,246,0.15)', alignItems: 'center', justifyContent: 'center' },
  settingInfo: { flex: 1 },
  settingLabel: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  settingSub: { color: COLORS.gray, fontSize: 11, marginTop: 1 },
  updateWeightBtn: { flexDirection:'row', alignItems:'center', gap:12, backgroundColor:COLORS.card, borderRadius:RADIUS.lg, padding:14, borderWidth:1, borderColor:COLORS.border },
  updateWeightTitle: { color:COLORS.white, fontSize:14, fontWeight:'700' },
  updateWeightSub: { color:COLORS.gray, fontSize:12, marginTop:2 },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, margin: SPACING.md, marginTop: SPACING.lg, padding: 14, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.08)' },
  signOutText: { color: COLORS.red, fontSize: 14, fontWeight: '700' },
});
