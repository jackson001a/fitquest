import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS } from '../theme';
import { leaderboardData, userData, groupsData, rivalsData, feedData } from '../data/mockData';

const LEAGUE_CONFIG = {
  Diamante: { emoji: '💎', color: '#67E8F9', gradient: ['#0E7490', '#0C4A6E'] },
  Platina:  { emoji: '🔷', color: '#E2E8F0', gradient: ['#475569', '#1E293B'] },
  Ouro:     { emoji: '🥇', color: '#FFD700', gradient: ['#D97706', '#92400E'] },
  Prata:    { emoji: '🥈', color: '#C0C0C0', gradient: ['#64748B', '#334155'] },
  Bronze:   { emoji: '🥉', color: '#CD7F32', gradient: ['#92400E', '#451A03'] },
};

// ─── GROUP CARD ──────────────────────────────────────────────────────────────
function GroupCard({ group }) {
  const allIn   = group.members.every(m => m.checkedInToday);
  const missing = group.members.filter(m => !m.checkedInToday).length;
  const present = group.members.filter(m => m.checkedInToday).length;
  const alertColor = '#F59E0B';

  return (
    <LinearGradient
      colors={group.gradient}
      style={[styles.groupCard, { borderColor: group.color + '70', shadowColor: group.color }]}
    >
      {/* ── Topo: escudo + nome + frequência ── */}
      <View style={styles.groupTopRow}>
        <View style={[styles.groupShieldBox, { backgroundColor: group.color + '28', borderColor: group.color + '70', shadowColor: group.color }]}>
          <Text style={styles.groupShieldEmoji}>🛡️</Text>
          <Text style={[styles.groupShieldNum, { color: group.color }]}>{group.groupStreak}</Text>
          <Text style={[styles.groupShieldSub, { color: group.color + 'AA' }]}>dias</Text>
        </View>
        <View style={styles.groupTitleBlock}>
          <Text style={styles.groupName}>{group.name}</Text>
          <Text style={styles.groupFreq}>{group.daysPerWeek}× por semana</Text>
          <View style={[styles.groupAttendBadge, { backgroundColor: allIn ? '#10B98122' : alertColor + '22', borderColor: allIn ? '#10B98145' : alertColor + '45' }]}>
            <Text style={[styles.groupAttendText, { color: allIn ? '#10B981' : alertColor }]}>
              {allIn ? '✅' : '⚡'} {present}/{group.members.length} treinaram hoje
            </Text>
          </View>
        </View>
      </View>

      {/* ── Membros ── */}
      <View style={styles.groupMembersRow}>
        {group.members.map((m, i) => (
          <View key={i} style={styles.groupMemberItem}>
            <View style={[
              styles.groupMemberRing,
              { borderColor: m.checkedInToday ? '#10B981' : '#F59E0B', shadowColor: m.checkedInToday ? '#10B981' : '#F59E0B', elevation: m.checkedInToday ? 4 : 0 },
            ]}>
              <LinearGradient
                colors={m.isUser ? ['#8B5CF6','#6D28D9'] : m.checkedInToday ? ['#047857','#065F46'] : ['#1E1B3A','#12122A']}
                style={styles.groupMemberAvatar}
              >
                <Text style={styles.groupMemberText}>{m.avatar}</Text>
              </LinearGradient>
            </View>
            <Text style={styles.groupMemberName} numberOfLines={1}>{m.isUser ? 'Você' : m.name.split(' ')[0]}</Text>
            <View style={[styles.groupMemberDot, { backgroundColor: m.checkedInToday ? '#10B981' : '#F59E0B' }]} />
          </View>
        ))}
      </View>

      {/* ── Barra de status ── */}
      <LinearGradient
        colors={allIn ? ['#10B98120', '#10B98108'] : [alertColor + '20', alertColor + '08']}
        style={[styles.groupStatusBar, { borderColor: allIn ? '#10B98140' : alertColor + '40' }]}
      >
        <Text style={[styles.groupStatusText, { color: allIn ? '#10B981' : alertColor }]}>
          {allIn
            ? `🔥 Incrível! Todos foram hoje — escudo em ${group.groupStreak} dias!`
            : `⚡ ${missing} membro${missing > 1 ? 's' : ''} faltando — vai hoje ainda!`
          }
        </Text>
      </LinearGradient>
    </LinearGradient>
  );
}

function GruposView() {
  return (
    <View style={styles.socialContainer}>
      <View style={styles.socialHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.socialTitle}>🛡️ Grupos & Clãs</Text>
          <Text style={styles.socialSub}>Treinem juntos. Se alguém falhar, o escudo zera.</Text>
        </View>
        <TouchableOpacity style={styles.createBtn} activeOpacity={0.8}>
          <Text style={styles.createBtnText}>+ Criar</Text>
        </TouchableOpacity>
      </View>

      {groupsData.map(group => <GroupCard key={group.id} group={group} />)}

      <View style={styles.socialInfoBox}>
        <Text style={styles.socialInfoTitle}>Como funciona 🛡️</Text>
        <Text style={styles.socialInfoText}>
          O Escudo do Clã é separado do seu streak pessoal 🔥. Ele cresce somente quando{' '}
          <Text style={{ fontWeight: '700', color: COLORS.white }}>todos os membros</Text>{' '}
          fazem check-in nos dias combinados. Um ausente e o escudo zera para todos.
        </Text>
      </View>
    </View>
  );
}

// ─── RIVAL MATCH CARD ────────────────────────────────────────────────────────
function RivalMatchCard({ r }) {
  const userWinning = r.userScore > r.rivalScore;
  const tied        = r.userScore === r.rivalScore;
  const diff        = Math.abs(r.userScore - r.rivalScore);
  const barMax      = Math.max(r.userScore, r.rivalScore, 1);
  const userPct     = Math.round((r.userScore / barMax) * 100);
  const rivalPct    = Math.round((r.rivalScore / barMax) * 100);

  const borderPulse = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(borderPulse, { toValue: 1,    duration: 1100, useNativeDriver: true }),
        Animated.timing(borderPulse, { toValue: 0.35, duration: 1100, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const borderColor = tied ? r.color : (userWinning ? '#10B981' : '#EF4444');
  const rivalFirstName = r.rival.name.split(' ')[0];

  return (
    <View style={styles.rmcWrapper}>
      {/* Pulsing border overlay */}
      <Animated.View
        pointerEvents="none"
        style={[styles.rmcPulsingBorder, { borderColor, opacity: borderPulse }]}
      />

      <LinearGradient colors={r.gradient} style={[styles.rmcCard, { shadowColor: r.color }]}>

        {/* ── Header ── */}
        <View style={styles.rivalMatchHeader}>
          <View style={styles.rmcHeaderLeft}>
            <Text style={[styles.rivalMatchTitle, { color: r.color }]}>⚔️  {r.name}</Text>
            {!tied && (
              <View style={[styles.rmcStatusBadge, {
                backgroundColor: userWinning ? '#10B98122' : '#EF444422',
                borderColor:     userWinning ? '#10B98158' : '#EF444458',
              }]}>
                <Text style={[styles.rmcStatusBadgeText, { color: userWinning ? '#10B981' : '#EF4444' }]}>
                  {userWinning ? '⚡ DOMINANDO' : '🔴 PERIGO'}
                </Text>
              </View>
            )}
          </View>
          <View style={[styles.rivalMatchDeadline, { backgroundColor: r.color + '20', borderColor: r.color + '45' }]}>
            <Text style={[styles.rivalMatchDeadlineText, { color: r.color }]}>⏳ {r.daysLeft}d · Encerra {r.endDate}</Text>
          </View>
        </View>

        {/* ── Arena ── */}
        <View style={styles.rmcArena}>
          {/* Tension: user side glow */}
          <LinearGradient
            colors={userWinning ? ['rgba(16,185,129,0.14)', 'transparent'] : ['rgba(139,92,246,0.10)', 'transparent']}
            start={{ x: 0, y: 0.5 }} end={{ x: 0.55, y: 0.5 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          {/* Tension: rival side glow */}
          <LinearGradient
            colors={['transparent', !userWinning ? 'rgba(239,68,68,0.14)' : 'rgba(192,132,252,0.10)']}
            start={{ x: 0.45, y: 0.5 }} end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          {/* User fighter */}
          <View style={styles.rmcFighter}>
            <LinearGradient
              colors={['#8B5CF6', '#6D28D9']}
              style={[styles.rmcAvatar, userWinning && diff > 0 && styles.rmcAvatarWin]}
            >
              <Text style={styles.rmcAvatarText}>L</Text>
            </LinearGradient>
            <Text style={styles.rmcFighterName}>Você</Text>
            <Text style={styles.rmcLastWorkout}>{r.userLastWorkout}</Text>
            <Text style={[styles.rmcScore, userWinning && diff > 0 && { color: '#10B981' }]}>{r.userScore}</Text>
            <Text style={styles.rmcUnit}>treinos</Text>
            {userWinning && diff > 0 && (
              <LinearGradient colors={['#10B981', '#047857']} style={styles.rmcLeaderBadge}>
                <Text style={styles.rmcLeaderText}>👑 LÍDER</Text>
              </LinearGradient>
            )}
            <View style={styles.rmcDotsRow}>
              {r.userLast7Days.map((done, i) => (
                <Text key={i} style={[styles.rmcDot, { color: done ? '#10B981' : 'rgba(255,255,255,0.18)' }]}>
                  {done ? '●' : '○'}
                </Text>
              ))}
            </View>
          </View>

          {/* VS center */}
          <View style={styles.rmcVSBlock}>
            <LinearGradient
              colors={['rgba(255,255,255,0.14)', 'rgba(255,255,255,0.06)']}
              style={[styles.rmcVSCircle, { borderColor: r.color + '55' }]}
            >
              <Text style={[styles.rmcVSText, { color: r.color }]}>VS</Text>
            </LinearGradient>
            <Text style={styles.rmcFreq}>{r.daysPerWeek}×/sem</Text>
          </View>

          {/* Rival fighter */}
          <View style={styles.rmcFighter}>
            <LinearGradient
              colors={[r.color + 'CC', r.color + '66']}
              style={[styles.rmcAvatar, !userWinning && diff > 0 && { borderWidth: 3, borderColor: '#EF4444' }]}
            >
              <Text style={styles.rmcAvatarText}>{r.rival.avatar}</Text>
            </LinearGradient>
            <Text style={styles.rmcFighterName}>{rivalFirstName}</Text>
            <Text style={styles.rmcLastWorkout}>{r.rival.lastWorkout}</Text>
            <Text style={[styles.rmcScore, !userWinning && diff > 0 && { color: '#EF4444' }]}>{r.rivalScore}</Text>
            <Text style={styles.rmcUnit}>treinos</Text>
            {!userWinning && diff > 0 && (
              <View style={[styles.rmcLeaderBadge, { backgroundColor: '#EF444428', borderColor: '#EF444452' }]}>
                <Text style={[styles.rmcLeaderText, { color: '#EF4444' }]}>🔴 LÍDER</Text>
              </View>
            )}
            <View style={styles.rmcDotsRow}>
              {r.rival.last7Days.map((done, i) => (
                <Text key={i} style={[styles.rmcDot, { color: done ? (userWinning ? 'rgba(239,68,68,0.6)' : '#10B981') : 'rgba(255,255,255,0.18)' }]}>
                  {done ? '●' : '○'}
                </Text>
              ))}
            </View>
          </View>
        </View>

        {/* ── Footer: diff + status ── */}
        <LinearGradient
          colors={userWinning ? ['#10B98118', '#10B98108'] : tied ? ['#8B5CF620', '#8B5CF608'] : ['#EF444418', '#EF444408']}
          style={[styles.rmcFooter, { borderColor: userWinning ? '#10B98140' : tied ? '#8B5CF640' : '#EF444440' }]}
        >
          {!tied && (
            <Text style={[styles.rmcFooterDiff, { color: userWinning ? '#10B981' : '#EF4444' }]}>
              {userWinning ? `+${diff}` : `-${diff}`}
            </Text>
          )}
          <Text style={[styles.rmcFooterText, { color: userWinning ? '#10B981' : tied ? COLORS.gray : '#EF4444', flex: 1 }]}>
            {tied
              ? '🤝 Empate! Próximo treino decide!'
              : userWinning
              ? `💪 Você lidera por ${diff} treino${diff > 1 ? 's' : ''}! Não para!`
              : `😤 ${rivalFirstName} lidera por ${diff}. Vai treinar agora!`
            }
          </Text>
        </LinearGradient>

      </LinearGradient>
    </View>
  );
}

function RivaisView() {
  return (
    <View style={styles.socialContainer}>
      <View style={styles.socialHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.socialTitle}>⚔️ Rivais</Text>
          <Text style={styles.socialSub}>Duelos individuais. Quem treina mais, vence.</Text>
        </View>
        <TouchableOpacity style={styles.createBtn} activeOpacity={0.8}>
          <Text style={styles.createBtnText}>+ Criar Duelo</Text>
        </TouchableOpacity>
      </View>

      {rivalsData.map(r => <RivalMatchCard key={r.id} r={r} />)}

      <View style={styles.socialInfoBox}>
        <Text style={styles.socialInfoTitle}>Como funciona ⚔️</Text>
        <Text style={styles.socialInfoText}>
          Seu streak pessoal 🔥{' '}
          <Text style={{ fontWeight: '700', color: COLORS.white }}>não é afetado</Text>{' '}
          pelos duelos. A pontuação é o total de treinos no período — quem treinar mais ao final vence.
        </Text>
      </View>
    </View>
  );
}

// ─── FEED ────────────────────────────────────────────────────────────────────
const FEED_TYPE_COLOR = {
  record:      '#F59E0B',
  achievement: '#8B5CF6',
  water:       '#0EA5E9',
  workout:     '#10B981',
  streak:      '#EF4444',
};

const REACTIONS = [
  { key: 'party', emoji: '🎉', activeColor: '#F59E0B' },
  { key: 'fire',  emoji: '🔥', activeColor: '#EF4444' },
  { key: 'heart', emoji: '❤️', activeColor: '#EC4899' },
];

function FeedSection() {
  const [myReactions, setMyReactions] = useState({});

  const toggle = (postId, key) => {
    const id = `${postId}_${key}`;
    setMyReactions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <View style={styles.feedSection}>
      <View style={styles.feedHeader}>
        <Text style={styles.feedTitle}>📣 Feed da Comunidade</Text>
        <TouchableOpacity style={styles.shareBtn} activeOpacity={0.8}>
          <Text style={styles.shareBtnText}>+ Compartilhar</Text>
        </TouchableOpacity>
      </View>

      {feedData.map((item) => {
        const accent = FEED_TYPE_COLOR[item.type] ?? COLORS.purple;
        return (
          <View key={item.id} style={[styles.feedCard, { borderColor: accent + '28' }]}>
            {/* ── Cabeçalho: avatar + nome/tempo + badge ── */}
            <View style={styles.feedCardTop}>
              <LinearGradient colors={[accent + '55', accent + '25']} style={styles.feedAvatar}>
                <Text style={styles.feedAvatarText}>{item.avatar}</Text>
              </LinearGradient>
              <View style={styles.feedMeta}>
                <Text style={styles.feedUser}>{item.user}</Text>
                <Text style={styles.feedTime}>{item.time} atrás</Text>
              </View>
              <View style={[styles.feedBadge, { backgroundColor: accent + '20', borderColor: accent + '45' }]}>
                <Text style={styles.feedBadgeEmoji}>{item.emoji}</Text>
                <Text style={[styles.feedBadgeText, { color: accent }]} numberOfLines={1}>{item.badge}</Text>
              </View>
            </View>

            {/* ── Conteúdo principal ── */}
            <Text style={styles.feedContent}>{item.detail}</Text>

            {/* ── Reações ── */}
            <View style={styles.feedReactRow}>
              {REACTIONS.map(({ key, emoji, activeColor }) => {
                const active = !!myReactions[`${item.id}_${key}`];
                const count  = item.reactions[key] + (active ? 1 : 0);
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => toggle(item.id, key)}
                    style={[
                      styles.feedReactBtn,
                      active && { backgroundColor: activeColor + '28', borderColor: activeColor + '90' },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.feedReactEmoji}>{emoji}</Text>
                    <Text style={[styles.feedReactCount, active && { color: activeColor, fontWeight: '800' }]}>{count}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── PODIUM ──────────────────────────────────────────────────────────────────
function PodiumItem({ user, position }) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const heightMap = { 1: 80, 2: 60, 3: 50 };
  const colorMap  = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' };
  const emojiMap  = { 1: '🥇', 2: '🥈', 3: '🥉' };

  useEffect(() => {
    Animated.spring(scaleAnim, { toValue: 1, delay: position * 150, friction: 5, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View style={[styles.podiumItem, { transform: [{ scale: scaleAnim }] }]}>
      <View style={styles.podiumAvatar}>
        <LinearGradient
          colors={position === 1 ? ['#F59E0B', '#D97706'] : ['#8B5CF6', '#6D28D9']}
          style={[styles.podiumAvatarCircle, user.isUser && styles.podiumAvatarUser]}
        >
          <Text style={styles.podiumAvatarText}>{user.avatar}</Text>
        </LinearGradient>
        <Text style={styles.podiumMedal}>{emojiMap[position]}</Text>
      </View>
      <Text style={styles.podiumName} numberOfLines={1}>{user.isUser ? 'Você' : user.name.split(' ')[0]}</Text>
      <Text style={styles.podiumXP}>{(user.xp / 1000).toFixed(1)}k</Text>
      <View style={[styles.podiumBar, { height: heightMap[position], backgroundColor: colorMap[position] + '30', borderColor: colorMap[position] + '60' }]}>
        <Text style={[styles.podiumRank, { color: colorMap[position] }]}>#{position}</Text>
      </View>
    </Animated.View>
  );
}

// ─── MAIN SCREEN ─────────────────────────────────────────────────────────────
export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('Geral');
  const headerAnim = useRef(new Animated.Value(0)).current;
  const listAnim   = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(listAnim,   { toValue: 0, duration: 500, delay: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  const top3      = leaderboardData.slice(0, 3);
  const rest      = leaderboardData.slice(3);
  const userEntry = leaderboardData.find((u) => u.isUser);
  const currentLeague = LEAGUE_CONFIG[userData.league] || LEAGUE_CONFIG['Ouro'];

  const getChangeIcon = (change) => {
    if (change > 0) return { icon: 'arrow-up',   color: COLORS.green };
    if (change < 0) return { icon: 'arrow-down',  color: COLORS.red   };
    return               { icon: 'remove',       color: COLORS.gray  };
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>

        {/* HEADER */}
        <Animated.View style={{ opacity: headerAnim }}>
          <LinearGradient
            colors={['#1A1A3E', '#0A0A18']}
            style={[styles.header, { paddingTop: insets.top + 12 }]}
          >
            <Text style={styles.headerTitle}>🏆 Ranking</Text>

            <LinearGradient colors={currentLeague.gradient} style={styles.leagueCard}>
              <View style={styles.leagueLeft}>
                <Text style={styles.leagueEmoji}>{currentLeague.emoji}</Text>
                <View>
                  <Text style={styles.leagueName}>Liga {userData.league}</Text>
                  <Text style={styles.leagueSub}>Sua liga atual</Text>
                </View>
              </View>
              <View style={styles.leagueRight}>
                <Text style={styles.leagueRank}>#{userEntry?.rank}</Text>
                <Text style={styles.leagueRankLabel}>posição</Text>
              </View>
            </LinearGradient>

            <View style={styles.tabs}>
              {['Geral', 'Grupos', 'Rivais'].map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setTab(t)}
                  style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
                >
                  <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ── GERAL ── */}
        {tab === 'Geral' && (
          <>
            <View style={styles.podiumSection}>
              <View style={styles.podiumRow}>
                <PodiumItem user={top3[1]} position={2} />
                <PodiumItem user={top3[0]} position={1} />
                <PodiumItem user={top3[2]} position={3} />
              </View>
            </View>

            <Animated.View style={[styles.listSection, { transform: [{ translateY: listAnim }] }]}>
              {rest.map((user) => {
                const change = getChangeIcon(user.change);
                return (
                  <View key={user.rank} style={[styles.listItem, user.isUser && styles.listItemUser]}>
                    {user.isUser && (
                      <LinearGradient
                        colors={['rgba(139,92,246,0.15)', 'rgba(139,92,246,0.05)']}
                        style={StyleSheet.absoluteFill}
                      />
                    )}
                    <Text style={styles.rankNum}>#{user.rank}</Text>
                    <LinearGradient
                      colors={user.isUser ? ['#8B5CF6', '#6D28D9'] : ['#2A2A4A', '#1A1A3E']}
                      style={styles.listAvatar}
                    >
                      <Text style={styles.listAvatarText}>{user.avatar}</Text>
                    </LinearGradient>
                    <View style={styles.listInfo}>
                      <Text style={[styles.listName, user.isUser && styles.listNameUser]}>
                        {user.isUser ? 'Você 👑' : user.name}
                      </Text>
                      <View style={styles.listMeta}>
                        <Text style={styles.listLeague}>{user.league}</Text>
                        <Text style={styles.listStreak}>🔥 {user.streak} dias</Text>
                      </View>
                    </View>
                    <View style={styles.listRight}>
                      <Text style={styles.listXP}>{user.xp.toLocaleString()}</Text>
                      <Text style={styles.listXPLabel}>XP</Text>
                      <View style={styles.changeRow}>
                        <Ionicons name={change.icon} size={10} color={change.color} />
                        {user.change !== 0 && (
                          <Text style={[styles.changeText, { color: change.color }]}>
                            {Math.abs(user.change)}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </Animated.View>

            <View style={styles.leaguesGuide}>
              <Text style={styles.guideTitle}>🏅 Ligas</Text>
              <View style={styles.guideList}>
                {Object.entries(LEAGUE_CONFIG).map(([name, config]) => (
                  <View key={name} style={styles.guideItem}>
                    <Text style={styles.guideEmoji}>{config.emoji}</Text>
                    <Text style={[styles.guideName, { color: config.color }]}>{name}</Text>
                    {name === userData.league && (
                      <View style={styles.currentBadge}>
                        <Text style={styles.currentBadgeText}>Atual</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </View>

            <FeedSection />
          </>
        )}

        {/* ── GRUPOS ── */}
        {tab === 'Grupos' && <GruposView />}

        {/* ── RIVAIS ── */}
        {tab === 'Rivais' && <RivaisView />}

      </ScrollView>
    </View>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  // Header
  header: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.lg, gap: 14 },
  headerTitle: { color: COLORS.white, fontSize: 24, fontWeight: '800' },
  leagueCard: { borderRadius: RADIUS.lg, padding: SPACING.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  leagueLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  leagueEmoji: { fontSize: 36 },
  leagueName: { color: '#fff', fontSize: 18, fontWeight: '800' },
  leagueSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  leagueRight: { alignItems: 'center' },
  leagueRank: { color: '#fff', fontSize: 28, fontWeight: '800' },
  leagueRankLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
  tabs: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: RADIUS.md, padding: 3 },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: RADIUS.sm - 2 },
  tabBtnActive: { backgroundColor: COLORS.purple },
  tabText: { color: COLORS.gray, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#fff' },

  // Geral — Podium
  podiumSection: { paddingHorizontal: SPACING.md, paddingTop: SPACING.lg },
  podiumRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 16 },
  podiumItem: { alignItems: 'center', gap: 6, flex: 1 },
  podiumAvatar: { position: 'relative' },
  podiumAvatarCircle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  podiumAvatarUser: { borderWidth: 2, borderColor: '#fff' },
  podiumAvatarText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  podiumMedal: { position: 'absolute', bottom: -6, right: -4, fontSize: 18 },
  podiumName: { color: COLORS.white, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  podiumXP: { color: COLORS.gray, fontSize: 11 },
  podiumBar: { width: '90%', borderRadius: RADIUS.sm, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6 },
  podiumRank: { fontSize: 16, fontWeight: '800' },

  // Geral — List
  listSection: { paddingHorizontal: SPACING.md, marginTop: SPACING.md, gap: 8 },
  listItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: 12, gap: 10, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', marginBottom: 8 },
  listItemUser: { borderColor: 'rgba(139,92,246,0.5)' },
  rankNum: { color: COLORS.gray, fontSize: 14, fontWeight: '700', width: 28, textAlign: 'center' },
  listAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  listAvatarText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  listInfo: { flex: 1 },
  listName: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  listNameUser: { color: COLORS.purpleLight },
  listMeta: { flexDirection: 'row', gap: 8, marginTop: 2 },
  listLeague: { fontSize: 12 },
  listStreak: { color: COLORS.gray, fontSize: 11 },
  listRight: { alignItems: 'flex-end', gap: 2 },
  listXP: { color: COLORS.white, fontSize: 15, fontWeight: '800' },
  listXPLabel: { color: COLORS.gray, fontSize: 10 },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  changeText: { fontSize: 10, fontWeight: '700' },

  // Geral — Leagues Guide
  leaguesGuide: { margin: SPACING.md, backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, gap: 12 },
  guideTitle: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  guideList: { flexDirection: 'row', justifyContent: 'space-around', flexWrap: 'wrap', gap: 8 },
  guideItem: { alignItems: 'center', gap: 4 },
  guideEmoji: { fontSize: 24 },
  guideName: { fontSize: 11, fontWeight: '700' },
  currentBadge: { backgroundColor: COLORS.purple, borderRadius: RADIUS.full, paddingHorizontal: 6, paddingVertical: 2 },
  currentBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },

  // Shared social container
  socialContainer: { paddingHorizontal: SPACING.md, marginTop: SPACING.lg, paddingBottom: 8 },
  socialHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: SPACING.md, gap: 12 },
  socialTitle: { color: COLORS.white, fontSize: 22, fontWeight: '900' },
  socialSub: { color: COLORS.gray, fontSize: 13, marginTop: 3, lineHeight: 18 },
  createBtn: { backgroundColor: 'rgba(139,92,246,0.2)', borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(139,92,246,0.4)', marginTop: 4 },
  createBtnText: { color: COLORS.purpleLight, fontSize: 12, fontWeight: '700' },
  socialInfoBox: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginTop: 4, gap: 6 },
  socialInfoTitle: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
  socialInfoText: { color: COLORS.gray, fontSize: 12, lineHeight: 18 },

  // Group Card
  groupCard: { backgroundColor: '#12122A', borderRadius: RADIUS.xl, padding: SPACING.md, borderWidth: 1, gap: 14, marginBottom: SPACING.md, elevation: 8, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 16, overflow: 'hidden' },
  groupTopRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  groupShieldBox: { borderRadius: RADIUS.lg, borderWidth: 2, padding: 12, alignItems: 'center', gap: 2, minWidth: 76, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 10, elevation: 8 },
  groupShieldEmoji: { fontSize: 30 },
  groupShieldNum: { fontSize: 34, fontWeight: '900', lineHeight: 36 },
  groupShieldSub: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  groupTitleBlock: { flex: 1, gap: 4 },
  groupName: { color: COLORS.white, fontSize: 18, fontWeight: '900' },
  groupFreq: { color: COLORS.grayDark, fontSize: 11 },
  groupAttendBadge: { alignSelf: 'flex-start', borderRadius: RADIUS.full, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, marginTop: 2 },
  groupAttendText: { fontSize: 12, fontWeight: '800' },
  groupMembersRow: { flexDirection: 'row', gap: 8 },
  groupMemberItem: { alignItems: 'center', gap: 5, flex: 1 },
  groupMemberRing: { borderRadius: 30, borderWidth: 2, padding: 2, backgroundColor: 'rgba(255,255,255,0.02)' },
  groupMemberAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  groupMemberText: { color: '#fff', fontSize: 19, fontWeight: '900' },
  groupMemberName: { color: COLORS.gray, fontSize: 10, textAlign: 'center', fontWeight: '700' },
  groupMemberDot: { width: 8, height: 8, borderRadius: 4, position: 'absolute', bottom: -2, right: 6, borderWidth: 1.5, borderColor: '#12122A' },
  groupStatusBar: { borderRadius: RADIUS.lg, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12 },
  groupStatusText: { fontSize: 13, fontWeight: '800', textAlign: 'center' },

  // Feed
  feedSection: { paddingHorizontal: SPACING.md, marginTop: SPACING.lg, paddingBottom: 4 },
  feedHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md },
  feedTitle: { color: COLORS.white, fontSize: 18, fontWeight: '800' },
  shareBtn: { backgroundColor: 'rgba(139,92,246,0.2)', borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(139,92,246,0.4)' },
  shareBtnText: { color: COLORS.purpleLight, fontSize: 12, fontWeight: '700' },
  feedCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, borderWidth: 1, padding: SPACING.md, marginBottom: SPACING.sm, gap: 12 },
  feedCardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  feedAvatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  feedAvatarText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  feedMeta: { flex: 1, gap: 2 },
  feedUser: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  feedTime: { color: COLORS.grayDark, fontSize: 11 },
  feedBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: RADIUS.md, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 5, maxWidth: 140 },
  feedBadgeEmoji: { fontSize: 13 },
  feedBadgeText: { fontSize: 11, fontWeight: '700', flexShrink: 1 },
  feedContent: { color: COLORS.white, fontSize: 16, fontWeight: '700', lineHeight: 22 },
  feedReactRow: { flexDirection: 'row', gap: 8 },
  feedReactBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: RADIUS.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', paddingHorizontal: 11, paddingVertical: 5 },
  feedReactEmoji: { fontSize: 14 },
  feedReactCount: { color: COLORS.grayDark, fontSize: 12, fontWeight: '600' },

  // Rival Match Card
  rmcWrapper: { position: 'relative', marginBottom: SPACING.md },
  rmcPulsingBorder: { ...StyleSheet.absoluteFillObject, borderRadius: RADIUS.xl + 1, borderWidth: 2.5, zIndex: 2 },
  rmcCard: { backgroundColor: '#12122A', borderRadius: RADIUS.xl, borderWidth: 1, padding: 16, gap: 10, elevation: 8, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 16, overflow: 'hidden' },
  rivalMatchHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  rmcHeaderLeft: { flex: 1, gap: 5 },
  rivalMatchTitle: { fontSize: 15, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  rmcStatusBadge: { alignSelf: 'flex-start', borderRadius: RADIUS.full, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  rmcStatusBadgeText: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8 },
  rivalMatchDeadline: { borderRadius: RADIUS.full, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, flexShrink: 0 },
  rivalMatchDeadlineText: { fontSize: 11, fontWeight: '700' },
  // Arena
  rmcArena: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: 4, overflow: 'hidden' },
  rmcFighter: { alignItems: 'center', gap: 2, flex: 1 },
  rmcAvatar: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  rmcAvatarRing: { borderRadius: 30, borderWidth: 2, padding: 2, borderColor: 'rgba(255,255,255,0.1)' },
  rmcAvatarWin: { borderWidth: 3, borderColor: '#10B981', shadowColor: '#10B981', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 10, elevation: 10 },
  rmcAvatarText: { color: '#fff', fontSize: 20, fontWeight: '900' },
  rmcFighterName: { color: COLORS.gray, fontSize: 11, fontWeight: '700', marginTop: 2 },
  rmcLastWorkout: { color: COLORS.grayDark, fontSize: 9, fontWeight: '600' },
  rmcScorePrem: { color: COLORS.white, fontSize: 42, fontWeight: '900', lineHeight: 46 },
  rmcUnit: { color: COLORS.grayDark, fontSize: 9, fontWeight: '600' },
  rmcLeaderBadgePrem: { borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 2, marginTop: 2, borderWidth: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  rmcLeaderTextPrem: { fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  rmcLeaderText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  rmcDotsRow: { flexDirection: 'row', gap: 3, marginTop: 3 },
  rmcDot: { fontSize: 9 },
  rmcNeonDot: { width: 6, height: 6, borderRadius: 3 },
  rmcVSBlock: { alignItems: 'center', gap: 4 },
  rmcVSCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  rmcVSText: { fontSize: 13, fontWeight: '900' },
  rmcFreq: { color: COLORS.grayDark, fontSize: 8, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  // Footer (diff + status combinados)
  rmcFooterPrem: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: RADIUS.lg, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  rmcFooterDiff: { fontSize: 26, fontWeight: '900', lineHeight: 30 },
  rmcFooterText: { fontSize: 12, fontWeight: '800', lineHeight: 17 },
});
