import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, ScrollView, StyleSheet, TextInput,
  Animated, Dimensions, Modal, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import TouchableOpacity from '../components/TouchableOpacity';
import { LinearGradient } from 'expo-linear-gradient';
import { BarbellIcon, CaretRightIcon, CaretUpIcon, CheckCircleIcon, CheckIcon, ClipboardTextIcon, ClockIcon, DotsThreeVerticalIcon, FireIcon, FloppyDiskIcon, LightningIcon, ListBulletsIcon, MagnifyingGlassIcon, PencilSimpleIcon, PlayIcon, PlusCircleIcon, PlusIcon, SparkleIcon, TrashIcon, TrophyIcon, XCircleIcon, XIcon } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS } from '../theme';
import { allWorkouts, categories, getWeeklyWorkoutChallenge } from '../data/mockData';
import { useUser } from '../context/UserContext';
import { supabase } from '../services/supabase';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - SPACING.md * 2 - 12) / 2;

const WORKOUT_EMOJIS = ['💪', '🔥', '⚡', '🏋️', '🦵', '🏃', '🤸', '🥊', '🎯', '⭐', '🏊', '🧘', '🚴', '🎽', '🦁', '🏆'];

const ALL_MUSCLES = [
  'Peito', 'Costas', 'Ombros', 'Bíceps', 'Tríceps', 'Antebraço',
  'Pernas', 'Glúteos', 'Panturrilha', 'Core', 'Lombar', 'Cardio', 'Full Body',
];

const MUSCLE_COLORS = {
  Peito: '#8B5CF6', Costas: '#3B82F6', Ombros: '#06B6D4', Bíceps: '#10B981',
  Tríceps: '#F97316', Antebraço: '#84CC16', Pernas: '#EF4444', Glúteos: '#EC4899',
  Panturrilha: '#F59E0B', Core: '#F97316', Lombar: '#A78BFA', Cardio: '#EF4444', 'Full Body': '#8B5CF6',
};

const EXERCISE_BANK = {
  Peito:       ['Supino Reto', 'Supino Inclinado', 'Supino Declinado', 'Supino com Halteres', 'Crossover', 'Flexão', 'Flexão Inclinada', 'Mergulho', 'Fly com Halteres', 'Peck Deck', 'Pullover'],
  Costas:      ['Puxada Frontal', 'Puxada Fechada', 'Remada Curvada', 'Remada Unilateral', 'Remada Sentado', 'Remada Cavalo', 'Pulldown', 'Barra Fixa', 'Deadlift', 'Hiperextensão', 'Face Pull', 'Remada Alta'],
  Ombros:      ['Desenvolvimento', 'Desenvolvimento Halteres', 'Elevação Lateral', 'Elevação Frontal', 'Elevação Posterior', 'Encolhimento', 'Arnold Press', 'Remada Alta', 'Face Pull', 'Crucifixo Inverso'],
  Bíceps:      ['Rosca Direta', 'Rosca Direta Halteres', 'Rosca Martelo', 'Rosca Scott', 'Rosca Concentrada', 'Rosca 21', 'Rosca Inversa', 'Rosca Cabo'],
  Tríceps:     ['Tríceps Pulley', 'Tríceps Corda', 'Tríceps Testa', 'Tríceps Francês', 'Tríceps Coice', 'Mergulho', 'Extensão Unilateral', 'Tríceps Máquina'],
  Antebraço:   ['Rosca Punho', 'Rosca Punho Inversa', 'Farmer Walk', 'Aperto de Mão', 'Extensão de Punho', 'Rosca Inversa'],
  Pernas:      ['Agachamento', 'Agachamento Sumô', 'Agachamento Hack', 'Agachamento Búlgaro', 'Leg Press', 'Cadeira Extensora', 'Mesa Flexora', 'Stiff', 'Afundo', 'Afundo com Halteres', 'Avanço', 'Leg Press 45°'],
  Glúteos:     ['Hip Thrust', 'Glúteo 4 Apoios', 'Afundo Lateral', 'Abdução de Quadril', 'Cadeira Abdutora', 'Elevação Quadril', 'Agachamento Sumô', 'Step Up'],
  Panturrilha: ['Panturrilha', 'Panturrilha Sentado', 'Panturrilha no Leg Press', 'Panturrilha em Pé Unilateral', 'Panturrilha no Hack'],
  Core:        ['Prancha', 'Prancha Lateral', 'Prancha com Alternância', 'Crunch', 'Crunch Bicicleta', 'Russian Twist', 'Leg Raise', 'Elevação de Pernas', 'Abdominal Infra', 'Superman', 'Dragon Flag', 'Ab Rollout', 'Sit Up'],
  Lombar:      ['Hiperextensão', 'Deadlift Romeno', 'Superman', 'Bird Dog', 'Good Morning', 'Stiff', 'Extensão Lombar'],
  Cardio:      ['Burpee', 'Jump Squat', 'Mountain Climber', 'High Knees', 'Box Jump', 'Polichinelo', 'Corrida', 'Pular Corda', 'Kettlebell Swing', 'Thruster', 'Rowing', 'Bicicleta', 'Elíptico', 'Esteira'],
  'Full Body': ['Deadlift', 'Kettlebell Swing', 'Thruster', 'Burpee', 'Agachamento', 'Clean', 'Snatch', 'Turkish Get-Up'],
};

const DIFFICULTY_OPTIONS = [
  { label: 'FÁCIL',  color: '#10B981' },
  { label: 'MÉDIO',  color: '#F59E0B' },
  { label: 'DIFÍCIL', color: '#EF4444' },
];

const GRADIENTS_BY_DIFF = {
  'FÁCIL':  ['#10B981', '#047857'],
  'MÉDIO':  ['#8B5CF6', '#6D28D9'],
  'DIFÍCIL': ['#EF4444', '#991B1B'],
};

const REST_OPTS = ['30s', '45s', '60s', '90s', '120s', '2min'];

function WorkoutCard({ workout, onPress, onMenu }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const onIn  = () => Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true }).start();
  const onOut = () => Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }).start();

  return (
    <Animated.View style={[s.cardWrap, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity onPress={onPress} onPressIn={onIn} onPressOut={onOut} activeOpacity={1}>
        <LinearGradient colors={workout.gradient} style={s.card}>
          {onMenu && (
            <TouchableOpacity
              style={s.menuBtn}
              onPress={onMenu}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <DotsThreeVerticalIcon size={16} color="#fff" weight="bold" />
            </TouchableOpacity>
          )}
          <View style={s.cardTopRow}>
            <Text style={s.cardEmoji}>{workout.emoji}</Text>
            <View style={{ gap: 4, alignItems: 'flex-end' }}>
              <View style={[s.diffBadge, { backgroundColor: workout.difficultyColor + '30' }]}>
                <Text style={[s.diffText, { color: workout.difficultyColor }]}>{workout.difficulty}</Text>
              </View>
              {workout.isUserCreated && (
                <View style={s.myPill}><Text style={s.myPillText}>Meu treino</Text></View>
              )}
            </View>
          </View>
          <Text style={s.cardName}>{workout.name}</Text>
          <Text style={s.cardCat}>{workout.muscles?.slice(0, 2).join(' · ') || workout.category}</Text>
          <View style={s.cardStats}>
            <View style={s.cardStat}>
              <ClockIcon size={12} color="rgba(255,255,255,0.6)"  weight="regular" />
              <Text style={s.cardStatText}>{workout.duration}min</Text>
            </View>
            <View style={s.cardStat}>
              <BarbellIcon size={12} color="rgba(255,255,255,0.6)"  weight="regular" />
              <Text style={s.cardStatText}>{workout.exercises?.length || 0} exerc.</Text>
            </View>
          </View>
          <View style={[s.cardXP, s.iconLabelRow]}>
            <LightningIcon size={11} color="#FCD34D" weight="fill" />
            <Text style={s.cardXPText}>+{workout.xp} XP</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function WorkoutsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const [search, setSearch]               = useState('');
  const [selectedCat, setSelectedCat]     = useState('Todos');
  const [userWorkouts, setUserWorkouts]   = useState([]);
  const [showCreate, setShowCreate]       = useState(false);

  const [nw, setNw]           = useState({ name: '', emoji: '💪', difficulty: 'MÉDIO', muscles: [], exercises: [] });
  const [exForm, setExForm]   = useState({ name: '', sets: '3', reps: '10', rest: '60s' });
  const [showBank, setShowBank] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [menuFor, setMenuFor]     = useState(null);

  const [weeklyChallenge]                = useState(() => getWeeklyWorkoutChallenge());
  const [weeklyChallengeDone, setWCD]  = useState(false);
  const [history,             setHistory]        = useState([]);
  const [showAllHistory,      setShowAllHistory] = useState(false);

  // Recarrega ao entrar em foco (captura conclusão de treino que veio de WorkoutDetail)
  useFocusEffect(useCallback(() => {
    if (!user?.id) return;
    const AS = require('@react-native-async-storage/async-storage').default;
    const wKey = `@capifit_weekly_challenge_${weeklyChallenge.weekNum}`;
    AS.getItem(wKey).then(v => { setWCD(v === 'done'); }).catch(() => {});

    // Meus treinos criados
    supabase.from('user_workouts').select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data?.length) setUserWorkouts(data.map(w => ({ ...w.workout_data, id: w.id, isUserCreated: true })));
      }).catch(() => {});

    // Histórico de treinos concluídos
    supabase.from('workout_completions').select('*').eq('user_id', user.id)
      .order('completed_at', { ascending: false }).limit(30)
      .then(({ data }) => { if (data) setHistory(data); })
      .catch(() => {});
  }, [user?.id]));

  const filtered = allWorkouts.filter(w => {
    const ms = w.name.toLowerCase().includes(search.toLowerCase()) || w.category.toLowerCase().includes(search.toLowerCase());
    const mc = selectedCat === 'Todos' || w.category === selectedCat;
    return ms && mc;
  });

  const toggleMuscle = m => setNw(p => ({
    ...p, muscles: p.muscles.includes(m) ? p.muscles.filter(x => x !== m) : [...p.muscles, m],
  }));

  const addFromBank = name => {
    if (nw.exercises.find(e => e.name === name)) return;
    setNw(p => ({ ...p, exercises: [...p.exercises, { name, sets: 3, reps: '10', rest: '60s' }] }));
  };

  const addCustomEx = () => {
    if (!exForm.name.trim()) return;
    setNw(p => ({
      ...p,
      exercises: [...p.exercises, {
        name: exForm.name.trim(),
        sets: parseInt(exForm.sets) || 3,
        reps: exForm.reps || '10',
        rest: exForm.rest,
      }],
    }));
    setExForm({ name: '', sets: '3', reps: '10', rest: '60s' });
  };

  const removeNewEx = idx => setNw(p => ({ ...p, exercises: p.exercises.filter((_, i) => i !== idx) }));

  const updateNewEx = (idx, field, val) => setNw(p => ({
    ...p, exercises: p.exercises.map((e, i) => i === idx ? { ...e, [field]: val } : e),
  }));

  const saveWorkout = () => {
    if (!nw.name.trim() || nw.exercises.length === 0) return;
    const diff = DIFFICULTY_OPTIONS.find(d => d.label === nw.difficulty) || DIFFICULTY_OPTIONS[1];
    const totalSets = nw.exercises.reduce((a, e) => a + (parseInt(e.sets) || 3), 0);
    const avgRest = nw.exercises.reduce((a, e) => a + (parseInt(e.rest) || 60), 0) / nw.exercises.length;
    const w = {
      id: editingId || `user_${Date.now()}`,
      name: nw.name.trim(),
      emoji: nw.emoji,
      difficulty: nw.difficulty,
      difficultyColor: diff.color,
      gradient: GRADIENTS_BY_DIFF[nw.difficulty] || ['#8B5CF6', '#6D28D9'],
      category: nw.muscles[0] || 'Custom',
      muscles: nw.muscles.length > 0 ? nw.muscles : ['Custom'],
      calories: Math.round(totalSets * 12),
      xp: Math.round(totalSets * 5 + 20),
      duration: Math.round(totalSets * (avgRest / 60 + 1.2)),
      exercises: nw.exercises,
      isUserCreated: true,
    };
    if (editingId) {
      setUserWorkouts(p => p.map(x => x.id === editingId ? w : x));
      if (user?.id) {
        supabase.from('user_workouts').update({ workout_data: w }).eq('id', editingId).eq('user_id', user.id).then(() => {}).catch(() => {});
      }
    } else {
      setUserWorkouts(p => [w, ...p]);
      if (user?.id) {
        supabase.from('user_workouts').insert({ user_id: user.id, workout_data: w }).then(() => {}).catch(() => {});
      }
    }
    setNw({ name: '', emoji: '💪', difficulty: 'MÉDIO', muscles: [], exercises: [] });
    setExForm({ name: '', sets: '3', reps: '10', rest: '60s' });
    setShowBank(false);
    setEditingId(null);
    setShowCreate(false);
  };

  const openEditWorkout = w => {
    setMenuFor(null);
    setEditingId(w.id);
    setNw({
      name: w.name, emoji: w.emoji, difficulty: w.difficulty,
      muscles: (w.muscles ?? []).filter(m => m !== 'Custom'),
      exercises: w.exercises ?? [],
    });
    setShowCreate(true);
  };

  const deleteUserWorkout = w => {
    setMenuFor(null);
    Alert.alert(
      'Excluir treino',
      `Deseja excluir "${w.name}"? Essa ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            setUserWorkouts(p => p.filter(x => x.id !== w.id));
            if (user?.id) {
              supabase.from('user_workouts').delete().eq('id', w.id).eq('user_id', user.id).then(() => {}).catch(() => {});
            }
          },
        },
      ],
    );
  };

  const bankList = [...new Set(
    (nw.muscles.length > 0 ? nw.muscles : ALL_MUSCLES).flatMap(m => EXERCISE_BANK[m] || [])
  )];

  const canSave = nw.name.trim().length > 0 && nw.exercises.length > 0;

  return (
    <View style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>

        {/* HEADER */}
        <LinearGradient colors={['#1A1A3E', '#0A0A18']} style={[s.header, { paddingTop: insets.top + 12 }]}>
          <View style={s.headerRow}>
            <View style={{ flex: 1 }}>
              <View style={s.iconLabelRow}>
                <BarbellIcon size={20} color={COLORS.white} weight="fill" />
                <Text style={s.headerTitle}>Biblioteca de Treinos</Text>
              </View>
              <Text style={s.headerSub}>{allWorkouts.length + userWorkouts.length} treinos disponíveis</Text>
            </View>
            {/* Botão histórico */}
            <TouchableOpacity onPress={() => setShowAllHistory(true)} activeOpacity={0.8} style={s.histBtn}>
              <ClockIcon size={18} color={COLORS.purpleLight}  weight="regular" />
              {history.length > 0 && (
                <View style={s.histBtnBadge}><Text style={s.histBtnBadgeText}>{history.length}</Text></View>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowCreate(true)} activeOpacity={0.85}>
              <LinearGradient colors={['#8B5CF6', '#6D28D9']} style={s.createBtn}>
                <PlusIcon size={16} color="#fff"  weight="fill" />
                <Text style={s.createBtnText}>Criar Treino</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
          <View style={s.searchBar}>
            <MagnifyingGlassIcon size={18} color={COLORS.gray}  weight="regular" />
            <TextInput
              style={s.searchInput}
              placeholder="Buscar treino..."
              placeholderTextColor={COLORS.grayDark}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <XCircleIcon size={18} color={COLORS.gray}  weight="fill" />
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>

        {/* CATEGORY */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catScroll}>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat}
              onPress={() => setSelectedCat(cat)}
              style={[s.catBtn, selectedCat === cat && s.catBtnActive]}
            >
              <Text style={[s.catText, selectedCat === cat && s.catTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* MY WORKOUTS */}
        {userWorkouts.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeaderRow}>
              <View style={s.iconLabelRow}>
                <SparkleIcon size={16} color={COLORS.white} weight="fill" />
                <Text style={s.sectionTitle}>Meus Treinos</Text>
              </View>
              <View style={s.countPill}><Text style={s.countPillText}>{userWorkouts.length}</Text></View>
            </View>
            <View style={s.grid}>
              {userWorkouts.map(w => (
                <WorkoutCard
                  key={w.id}
                  workout={w}
                  onPress={() => navigation.navigate('WorkoutDetail', { workout: w, isUserCreated: true })}
                  onMenu={() => setMenuFor(w)}
                />
              ))}
            </View>
          </View>
        )}

        {/* DESAFIO SEMANAL DINÂMICO */}
        {selectedCat === 'Todos' && !search && (() => {
          // Encontra treino compatível com o desafio da semana
          const challengeWorkout = allWorkouts.find(w =>
            w.category === weeklyChallenge.targetWorkoutCategory ||
            (w.muscles ?? []).some(m => m === weeklyChallenge.targetWorkoutCategory)
          ) ?? allWorkouts[0];
          return (
            <View style={s.section}>
              <View style={s.sectionHeaderRow}>
                <View style={s.iconLabelRow}>
                  <FireIcon size={16} color="#F97316" weight="fill" />
                  <Text style={s.sectionTitle}>Desafio da Semana</Text>
                </View>
                {weeklyChallengeDone
                  ? <View style={[s.hotBadge, { backgroundColor: '#10B981' }]}><Text style={s.hotBadgeText}>✓ CONCLUÍDO</Text></View>
                  : <View style={s.hotBadge}><Text style={s.hotBadgeText}>{weeklyChallenge.daysLeft}d restantes</Text></View>}
              </View>
              <TouchableOpacity
                activeOpacity={weeklyChallengeDone ? 1 : 0.9}
                onPress={() => !weeklyChallengeDone && navigation.navigate('WorkoutDetail', { workout: challengeWorkout })}
              >
                <LinearGradient colors={weeklyChallengeDone ? ['#064E3B','#022C22'] : weeklyChallenge.gradient} style={s.featCard}>
                  <View style={s.featContent}>
                    {weeklyChallengeDone
                      ? <TrophyIcon size={44} color="#FCD34D" weight="fill" style={s.featEmoji} />
                      : <Text style={s.featEmoji}>{weeklyChallenge.emoji}</Text>}
                    <View style={s.featInfo}>
                      <View style={[s.diffBadge, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                        <Text style={[s.diffText, { color: '#fff' }]}>{weeklyChallenge.difficulty}</Text>
                      </View>
                      <Text style={s.featName}>{weeklyChallengeDone ? 'Desafio Concluído!' : weeklyChallenge.name}</Text>
                      <Text style={s.featSub}>{weeklyChallengeDone ? 'Você completou o desafio desta semana 🎉' : weeklyChallenge.description}</Text>
                      <View style={s.featStats}>
                        <View style={s.iconLabelRow}>
                          <LightningIcon size={12} color="#fff" weight="fill" />
                          <Text style={s.featStatText}>+{weeklyChallenge.xp} XP bônus</Text>
                        </View>
                        {!weeklyChallengeDone && (
                          <View style={s.iconLabelRow}>
                            <PlayIcon size={11} color="#fff" weight="fill" />
                            <Text style={s.featStatText}>{challengeWorkout.name}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          );
        })()}

        {/* ALL WORKOUTS */}
        <View style={s.section}>
          <View style={s.iconLabelRow}>
            <BarbellIcon size={16} color={COLORS.white} weight="fill" />
            <Text style={s.sectionTitle}>
              {selectedCat === 'Todos' ? 'Todos os Treinos' : selectedCat}
              <Text style={s.countText}>  ({filtered.length})</Text>
            </Text>
          </View>
          {filtered.length === 0 ? (
            <View style={s.empty}>
              <MagnifyingGlassIcon size={36} color={COLORS.gray} weight="regular" style={s.emptyEmoji} />
              <Text style={s.emptyText}>Nenhum treino encontrado</Text>
              <Text style={s.emptySub}>Tente outro filtro ou busca</Text>
            </View>
          ) : (
            <View style={s.grid}>
              {filtered.map(w => (
                <WorkoutCard key={w.id} workout={w} onPress={() => navigation.navigate('WorkoutDetail', { workout: w })} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── HISTÓRICO COMPLETO MODAL ── */}
      <Modal visible={showAllHistory} animationType="slide" onRequestClose={() => setShowAllHistory(false)}>
        <View style={[s.modalBg, { paddingTop: insets.top }]}>
          <LinearGradient colors={['#1A1A3E', '#12122A']} style={s.mHeader}>
            <TouchableOpacity onPress={() => setShowAllHistory(false)} style={s.mCloseBtn}>
              <XIcon size={22} color="#fff"  weight="bold" />
            </TouchableOpacity>
            <View style={s.iconLabelRow}>
              <ClipboardTextIcon size={18} color="#fff" weight="fill" />
              <Text style={s.mHeaderTitle}>Histórico de Treinos</Text>
            </View>
            <View style={{ width: 40 }} />
          </LinearGradient>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.md, paddingBottom: 40 }}>
            {history.length === 0 ? (
              <View style={{ alignItems: 'center', paddingTop: 60 }}>
                <ClipboardTextIcon size={44} color={COLORS.gray} weight="regular" />
                <Text style={{ color: COLORS.gray, marginTop: 12 }}>Nenhum treino concluído ainda</Text>
              </View>
            ) : history.map((h, i) => {
              const wdata = h.workout_data ?? {};
              const mins  = h.duration_seconds ? Math.round(h.duration_seconds / 60) : null;
              const date  = h.completed_at
                ? new Date(h.completed_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                : '';
              const original   = allWorkouts.find(w => w.name === h.workout_name);
              const fullWorkout = {
                ...(original ?? {}),
                ...(wdata ?? {}),
                id:        h.id,
                name:      h.workout_name  ?? wdata?.name  ?? 'Treino',
                emoji:     h.workout_emoji ?? wdata?.emoji ?? '💪',
                xp:        h.xp_earned     ?? wdata?.xp    ?? 0,
                exercises: wdata?.exercises?.length ? wdata.exercises : (original?.exercises ?? []),
                gradient:  wdata?.gradient  ?? original?.gradient ?? ['#8B5CF6','#6D28D9'],
                muscles:   wdata?.muscles   ?? original?.muscles  ?? [],
              };
              return (
                <TouchableOpacity
                  key={h.id ?? i}
                  style={[s.histRow, { marginBottom: 10 }]}
                  onPress={() => {
                    setShowAllHistory(false);
                    setTimeout(() => navigation.navigate('WorkoutDetail', { workout: fullWorkout, isHistory: true }), 300);
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={s.histEmoji}>{h.workout_emoji ?? '💪'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.histName}>{h.workout_name ?? 'Treino'}</Text>
                    <Text style={s.histMeta}>{date}{mins ? `  ·  ${mins}min` : ''}</Text>
                    <Text style={s.histMeta}>+{h.xp_earned ?? 0} XP{wdata.exercises?.length ? `  ·  ${wdata.exercises.length} exercícios` : ''}</Text>
                  </View>
                  <View style={s.histXPBadge}><Text style={s.histXPText}>✓</Text></View>
                  <CaretRightIcon size={14} color={COLORS.grayDark}  weight="bold" />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>

      {/* ── MENU DE AÇÕES DO TREINO (editar/excluir) ── */}
      <Modal visible={!!menuFor} transparent animationType="fade" onRequestClose={() => setMenuFor(null)}>
        <TouchableOpacity style={s.menuBackdrop} activeOpacity={1} onPress={() => setMenuFor(null)}>
          <TouchableOpacity activeOpacity={1} style={s.menuCard}>
            <TouchableOpacity style={s.menuOpt} onPress={() => openEditWorkout(menuFor)} activeOpacity={0.8}>
              <PencilSimpleIcon size={18} color={COLORS.white} weight="regular" />
              <Text style={s.menuOptText}>Editar</Text>
            </TouchableOpacity>
            <View style={s.menuDivider} />
            <TouchableOpacity style={s.menuOpt} onPress={() => deleteUserWorkout(menuFor)} activeOpacity={0.8}>
              <TrashIcon size={18} color={COLORS.red} weight="regular" />
              <Text style={[s.menuOptText, { color: COLORS.red }]}>Excluir</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── CREATE WORKOUT MODAL ── */}
      <Modal visible={showCreate} animationType="slide">
        <View style={[s.modalBg, { paddingTop: insets.top }]}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>

            {/* Modal header */}
            <LinearGradient colors={['#1A1A3E', '#12122A']} style={s.mHeader}>
              <TouchableOpacity onPress={() => { setShowCreate(false); setEditingId(null); }} style={s.mCloseBtn}>
                <XIcon size={22} color="#fff"  weight="bold" />
              </TouchableOpacity>
              <View style={s.iconLabelRow}>
                <SparkleIcon size={18} color="#fff" weight="fill" />
                <Text style={s.mHeaderTitle}>{editingId ? 'Editar Treino' : 'Criar Treino'}</Text>
              </View>
              <TouchableOpacity onPress={saveWorkout} disabled={!canSave}>
                <Text style={[s.mSaveText, { opacity: canSave ? 1 : 0.3 }]}>Salvar</Text>
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.mScroll} keyboardShouldPersistTaps="handled">

              {/* EMOJI */}
              <View style={s.formBlock}>
                <Text style={s.formLabel}>Ícone</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.emojiRow}>
                  {WORKOUT_EMOJIS.map(em => (
                    <TouchableOpacity
                      key={em}
                      style={[s.emojiOpt, nw.emoji === em && s.emojiOptActive]}
                      onPress={() => setNw(p => ({ ...p, emoji: em }))}
                    >
                      <Text style={s.emojiOptText}>{em}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* NAME */}
              <View style={s.formBlock}>
                <Text style={s.formLabel}>Nome do treino *</Text>
                <TextInput
                  style={s.formInput}
                  value={nw.name}
                  onChangeText={v => setNw(p => ({ ...p, name: v }))}
                  placeholder="Ex: Peito & Tríceps — Segunda"
                  placeholderTextColor={COLORS.grayDark}
                />
              </View>

              {/* DIFFICULTY */}
              <View style={s.formBlock}>
                <Text style={s.formLabel}>Dificuldade</Text>
                <View style={s.diffRow}>
                  {DIFFICULTY_OPTIONS.map(d => (
                    <TouchableOpacity
                      key={d.label}
                      style={[s.diffOpt, nw.difficulty === d.label && { backgroundColor: d.color + '25', borderColor: d.color }]}
                      onPress={() => setNw(p => ({ ...p, difficulty: d.label }))}
                    >
                      <Text style={[s.diffOptText, nw.difficulty === d.label && { color: d.color }]}>{d.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* MUSCLES */}
              <View style={s.formBlock}>
                <Text style={s.formLabel}>Músculos trabalhados</Text>
                <Text style={s.formHint}>Selecione um ou mais grupos — filtra o banco de exercícios</Text>
                <View style={s.muscleChips}>
                  {ALL_MUSCLES.map(m => {
                    const active = nw.muscles.includes(m);
                    const col = MUSCLE_COLORS[m] || COLORS.purple;
                    return (
                      <TouchableOpacity
                        key={m}
                        style={[s.muscleChip, active && { backgroundColor: col + '20', borderColor: col }]}
                        onPress={() => toggleMuscle(m)}
                      >
                        {active && <CheckIcon size={11} color={col}  weight="bold" />}
                        <Text style={[s.muscleChipText, active && { color: col, fontWeight: '700' }]}>{m}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* EXERCISES */}
              <View style={s.formBlock}>
                <View style={s.formBlockHeader}>
                  <Text style={s.formLabel}>
                    Exercícios{nw.exercises.length > 0 ? ` (${nw.exercises.length})` : ' *'}
                  </Text>
                  <TouchableOpacity style={s.bankToggleBtn} onPress={() => setShowBank(p => !p)}>
                    {showBank
                      ? <CaretUpIcon size={14} color={COLORS.purpleLight} weight="regular" />
                      : <ListBulletsIcon size={14} color={COLORS.purpleLight} weight="regular" />}
                    <Text style={s.bankToggleText}>{showBank ? 'Fechar banco' : 'Banco de exercícios'}</Text>
                  </TouchableOpacity>
                </View>

                {/* EXERCISE BANK */}
                {showBank && (
                  <View style={s.bankWrap}>
                    <Text style={s.bankLabel}>
                      {nw.muscles.length > 0 ? nw.muscles.join(' · ') : 'Todos os grupos musculares'}
                    </Text>
                    <View style={s.bankGrid}>
                      {bankList.map(ex => {
                        const added = !!nw.exercises.find(e => e.name === ex);
                        return (
                          <TouchableOpacity
                            key={ex}
                            style={[s.bankChip, added && s.bankChipAdded]}
                            onPress={() => addFromBank(ex)}
                          >
                            {added
                              ? <CheckCircleIcon size={12} color={COLORS.green} weight="fill" />
                              : <PlusCircleIcon size={12} color={COLORS.gray} weight="regular" />}
                            <Text style={[s.bankChipText, added && { color: COLORS.green }]}>{ex}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* EXERCISES LIST */}
                {nw.exercises.map((ex, idx) => (
                  <View key={idx} style={s.exItem}>
                    <View style={s.exItemHeader}>
                      <View style={s.exNumCircle}><Text style={s.exNumText}>{idx + 1}</Text></View>
                      <Text style={s.exItemName} numberOfLines={1}>{ex.name}</Text>
                      <TouchableOpacity onPress={() => removeNewEx(idx)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <TrashIcon size={16} color={COLORS.red}  weight="regular" />
                      </TouchableOpacity>
                    </View>
                    <View style={s.exItemConfig}>
                      <View style={s.exConfigBox}>
                        <Text style={s.exConfigLabel}>Séries</Text>
                        <TextInput
                          style={s.exConfigInput}
                          value={String(ex.sets)}
                          onChangeText={v => updateNewEx(idx, 'sets', parseInt(v) || 1)}
                          keyboardType="number-pad"
                          selectTextOnFocus
                        />
                      </View>
                      <View style={s.exConfigBox}>
                        <Text style={s.exConfigLabel}>Repetições</Text>
                        <TextInput
                          style={s.exConfigInput}
                          value={ex.reps}
                          onChangeText={v => updateNewEx(idx, 'reps', v)}
                          selectTextOnFocus
                        />
                      </View>
                      <View style={[s.exConfigBox, { flex: 2 }]}>
                        <Text style={s.exConfigLabel}>Descanso</Text>
                        <View style={s.restMiniRow}>
                          {['30s', '60s', '90s', '120s'].map(opt => (
                            <TouchableOpacity
                              key={opt}
                              style={[s.restMini, ex.rest === opt && s.restMiniActive]}
                              onPress={() => updateNewEx(idx, 'rest', opt)}
                            >
                              <Text style={[s.restMiniText, ex.rest === opt && s.restMiniActiveText]}>{opt}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    </View>
                  </View>
                ))}

                {/* CUSTOM EXERCISE FORM */}
                <View style={s.customExWrap}>
                  <Text style={s.customExTitle}>+ Exercício personalizado</Text>
                  <TextInput
                    style={s.formInput}
                    value={exForm.name}
                    onChangeText={v => setExForm(p => ({ ...p, name: v }))}
                    placeholder="Nome do exercício"
                    placeholderTextColor={COLORS.grayDark}
                  />
                  <View style={s.customExRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.exConfigLabel}>Séries</Text>
                      <TextInput
                        style={s.exConfigInput}
                        value={exForm.sets}
                        onChangeText={v => setExForm(p => ({ ...p, sets: v }))}
                        keyboardType="number-pad"
                        placeholder="3"
                        placeholderTextColor={COLORS.grayDark}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.exConfigLabel}>Repetições</Text>
                      <TextInput
                        style={s.exConfigInput}
                        value={exForm.reps}
                        onChangeText={v => setExForm(p => ({ ...p, reps: v }))}
                        placeholder="10"
                        placeholderTextColor={COLORS.grayDark}
                      />
                    </View>
                  </View>
                  <View style={s.restRow}>
                    <Text style={s.exConfigLabel}>Descanso:</Text>
                    {REST_OPTS.map(opt => (
                      <TouchableOpacity
                        key={opt}
                        style={[s.restOpt, exForm.rest === opt && s.restOptActive]}
                        onPress={() => setExForm(p => ({ ...p, rest: opt }))}
                      >
                        <Text style={[s.restOptText, exForm.rest === opt && s.restOptActiveText]}>{opt}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity style={s.addExBtn} onPress={addCustomEx} activeOpacity={0.85}>
                    <PlusCircleIcon size={16} color={COLORS.purpleLight}  weight="fill" />
                    <Text style={s.addExBtnText}>Adicionar ao treino</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* SAVE */}
              <TouchableOpacity onPress={saveWorkout} activeOpacity={0.9} style={{ marginBottom: 40 }}>
                <LinearGradient
                  colors={canSave ? ['#8B5CF6', '#6D28D9'] : ['#2A2A4A', '#1E1E38']}
                  style={s.saveBigBtn}
                >
                  <FloppyDiskIcon size={20} color="#fff"  weight="regular" />
                  <Text style={s.saveBigText}>{editingId ? 'Salvar Alterações' : 'Salvar Treino'}</Text>
                  {nw.exercises.length > 0 && (
                    <View style={s.saveBadge}><Text style={s.saveBadgeText}>{nw.exercises.length} exerc.</Text></View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  // Header
  header: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.lg, gap: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { color: COLORS.white, fontSize: 22, fontWeight: '800' },
  headerSub: { color: COLORS.gray, fontSize: 13, marginTop: 2 },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 9 },
  histBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(139,92,246,0.15)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)', alignItems: 'center', justifyContent: 'center' },
  histBtnBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: COLORS.purple, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  histBtnBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  createBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 10, gap: 8, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, color: COLORS.white, fontSize: 14 },

  // Categories
  catScroll: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, gap: 8 },
  catBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.full, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  catBtnActive: { backgroundColor: COLORS.purple, borderColor: COLORS.purple },
  catText: { color: COLORS.gray, fontSize: 13, fontWeight: '600' },
  catTextActive: { color: COLORS.white },

  // Section
  section: { paddingHorizontal: SPACING.md, marginBottom: SPACING.md },
  iconLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { color: COLORS.white, fontSize: 17, fontWeight: '800', marginBottom: SPACING.sm },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.sm },
  countText: { color: COLORS.gray, fontSize: 13, fontWeight: '400' },
  countPill: { backgroundColor: COLORS.purple, borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 2 },
  countPillText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  hotBadge: { backgroundColor: '#EF4444', borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 2 },
  hotBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  // Grid / Card
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cardWrap: { width: CARD_WIDTH, borderRadius: RADIUS.lg, overflow: 'hidden', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  card: { padding: SPACING.md, borderRadius: RADIUS.lg, minHeight: 190, gap: 6 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  menuBtn: { position: 'absolute', top: 8, right: 8, zIndex: 10, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  menuBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  menuCard: { width: 220, backgroundColor: '#1A1A2E', borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  menuOpt: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  menuOptText: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  menuDivider: { height: 1, backgroundColor: COLORS.border },
  cardEmoji: { fontSize: 30 },
  diffBadge: { alignSelf: 'flex-start', borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3 },
  diffText: { fontSize: 10, fontWeight: '800' },
  myPill: { backgroundColor: 'rgba(139,92,246,0.4)', borderRadius: RADIUS.full, paddingHorizontal: 6, paddingVertical: 2 },
  myPillText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  cardName: { color: '#fff', fontSize: 13, fontWeight: '800', lineHeight: 17 },
  cardCat: { color: 'rgba(255,255,255,0.55)', fontSize: 11 },
  cardStats: { flexDirection: 'row', gap: 8, marginTop: 4 },
  cardStat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cardStatText: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
  cardXP: { marginTop: 'auto', backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: RADIUS.sm, padding: 5, alignSelf: 'flex-start' },
  cardXPText: { color: '#FCD34D', fontSize: 11, fontWeight: '700' },

  // Featured
  featCard: { borderRadius: RADIUS.xl, padding: SPACING.md, overflow: 'hidden' },
  featContent: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  featEmoji: { fontSize: 52 },
  featInfo: { flex: 1, gap: 4 },
  featName: { color: '#fff', fontSize: 18, fontWeight: '800' },
  featSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  featStats: { flexDirection: 'row', gap: 10, marginTop: 4 },
  featStatText: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' },
  muscleTags: { flexDirection: 'row', gap: 6, marginTop: 12, flexWrap: 'wrap' },
  muscleTag: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  muscleTagText: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600' },

  // Histórico
  histRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  histEmoji:   { fontSize: 22, width: 32, textAlign: 'center' },
  histName:    { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  histMeta:    { color: COLORS.gray, fontSize: 12, marginTop: 2 },
  histXPBadge: { backgroundColor: 'rgba(16,185,129,0.15)', borderRadius: RADIUS.full, width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)' },
  histXPText:  { color: COLORS.green, fontSize: 12, fontWeight: '800' },

  // Empty
  empty: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyEmoji: { fontSize: 40 },
  emptyText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  emptySub: { color: COLORS.gray, fontSize: 13 },

  // ── Modal styles ──
  modalBg: { flex: 1, backgroundColor: COLORS.bg },
  mHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  mCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  mHeaderTitle: { flex: 1, color: COLORS.white, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  mSaveText: { color: COLORS.purpleLight, fontSize: 16, fontWeight: '800' },
  mScroll: { padding: SPACING.md, gap: 4 },

  // Form blocks
  formBlock: { marginBottom: SPACING.lg },
  formBlockHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  formLabel: { color: COLORS.white, fontSize: 14, fontWeight: '700', marginBottom: 10 },
  formHint: { color: COLORS.gray, fontSize: 12, marginTop: -6, marginBottom: 10 },
  formInput: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 14, paddingVertical: 12, color: COLORS.white, fontSize: 14, fontWeight: '600' },

  // Emoji
  emojiRow: { gap: 8, paddingBottom: 4 },
  emojiOpt: { width: 46, height: 46, borderRadius: RADIUS.md, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  emojiOptActive: { borderColor: COLORS.purple, backgroundColor: 'rgba(139,92,246,0.2)' },
  emojiOptText: { fontSize: 24 },

  // Difficulty
  diffRow: { flexDirection: 'row', gap: 10 },
  diffOpt: { flex: 1, borderRadius: RADIUS.md, paddingVertical: 10, alignItems: 'center', backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  diffOptText: { color: COLORS.gray, fontSize: 12, fontWeight: '800' },

  // Muscles
  muscleChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  muscleChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.full, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  muscleChipText: { color: COLORS.gray, fontSize: 13, fontWeight: '600' },

  // Bank
  bankToggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(139,92,246,0.12)', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)' },
  bankToggleText: { color: COLORS.purpleLight, fontSize: 11, fontWeight: '700' },
  bankWrap: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  bankLabel: { color: COLORS.gray, fontSize: 12, fontWeight: '700', marginBottom: 10 },
  bankGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  bankChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.full, backgroundColor: COLORS.bgSecondary, borderWidth: 1, borderColor: COLORS.border },
  bankChipAdded: { backgroundColor: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.4)' },
  bankChipText: { color: COLORS.gray, fontSize: 12, fontWeight: '600' },

  // Exercise item in create modal
  exItem: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  exItemHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  exNumCircle: { width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.purple, alignItems: 'center', justifyContent: 'center' },
  exNumText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  exItemName: { flex: 1, color: COLORS.white, fontSize: 13, fontWeight: '700' },
  exItemConfig: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  exConfigBox: { flex: 1 },
  exConfigLabel: { color: COLORS.gray, fontSize: 11, fontWeight: '600', marginBottom: 4 },
  exConfigInput: { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: RADIUS.sm, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 8, paddingVertical: 8, color: COLORS.white, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  restMiniRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  restMini: { paddingHorizontal: 7, paddingVertical: 5, borderRadius: RADIUS.sm, backgroundColor: COLORS.bgSecondary, borderWidth: 1, borderColor: COLORS.border },
  restMiniActive: { backgroundColor: COLORS.purple, borderColor: COLORS.purple },
  restMiniText: { color: COLORS.gray, fontSize: 10, fontWeight: '700' },
  restMiniActiveText: { color: '#fff' },

  // Custom exercise form
  customExWrap: { backgroundColor: 'rgba(139,92,246,0.06)', borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)', gap: 10, marginTop: 4 },
  customExTitle: { color: COLORS.purpleLight, fontSize: 13, fontWeight: '700' },
  customExRow: { flexDirection: 'row', gap: 10 },
  restRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  restOpt: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.full, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  restOptActive: { backgroundColor: COLORS.purple, borderColor: COLORS.purple },
  restOptText: { color: COLORS.gray, fontSize: 11, fontWeight: '700' },
  restOptActiveText: { color: '#fff' },
  addExBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: 'rgba(139,92,246,0.12)', borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)' },
  addExBtnText: { color: COLORS.purpleLight, fontSize: 13, fontWeight: '700' },

  // Save
  saveBigBtn: { borderRadius: RADIUS.lg, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  saveBigText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  saveBadge: { backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3 },
  saveBadgeText: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '700' },
});
