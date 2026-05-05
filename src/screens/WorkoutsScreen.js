import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput,
  Animated, Dimensions, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS } from '../theme';
import { allWorkouts, categories } from '../data/mockData';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - SPACING.md * 2 - 12) / 2;

const WORKOUT_EMOJIS = ['💪', '🔥', '⚡', '🏋️', '🦵', '🏃', '🤸', '🥊', '🎯', '⭐', '🏊', '🧘', '🚴', '🎽', '🦁', '🏆'];

const ALL_MUSCLES = [
  'Peito', 'Costas', 'Ombros', 'Bíceps', 'Tríceps',
  'Pernas', 'Glúteos', 'Panturrilha', 'Core', 'Cardio', 'Full Body',
];

const MUSCLE_COLORS = {
  Peito: '#8B5CF6', Costas: '#3B82F6', Ombros: '#06B6D4', Bíceps: '#10B981',
  Tríceps: '#F97316', Pernas: '#EF4444', Glúteos: '#EC4899', Panturrilha: '#F59E0B',
  Core: '#F97316', Cardio: '#EF4444', 'Full Body': '#8B5CF6',
};

const EXERCISE_BANK = {
  Peito:       ['Supino Reto', 'Supino Inclinado', 'Supino Declinado', 'Crossover', 'Flexão', 'Mergulho', 'Fly com Halteres', 'Peck Deck'],
  Costas:      ['Puxada Frontal', 'Remada Curvada', 'Remada Unilateral', 'Remada Sentado', 'Pulldown', 'Deadlift', 'Hiperextensão', 'Face Pull'],
  Ombros:      ['Desenvolvimento', 'Elevação Lateral', 'Elevação Frontal', 'Arnold Press', 'Remada Alta', 'Face Pull'],
  Bíceps:      ['Rosca Direta', 'Rosca Martelo', 'Rosca Scott', 'Rosca Concentrada', 'Rosca 21'],
  Tríceps:     ['Tríceps Pulley', 'Tríceps Testa', 'Tríceps Francês', 'Kickback', 'Tríceps Coice'],
  Pernas:      ['Agachamento', 'Leg Press', 'Cadeira Extensora', 'Mesa Flexora', 'Stiff', 'Agachamento Sumô', 'Afundo', 'Agachamento Búlgaro'],
  Glúteos:     ['Hip Thrust', 'Glúteo no Cross', 'Afundo Lateral', 'Cadeira Abdutora'],
  Panturrilha: ['Panturrilha em Pé', 'Panturrilha Sentado', 'Panturrilha no Leg Press'],
  Core:        ['Prancha', 'Crunch', 'Crunch Bicicleta', 'Russian Twist', 'Leg Raise', 'Ab Wheel', 'Prancha Lateral', 'Sit Up'],
  Cardio:      ['Esteira', 'Bicicleta', 'Corda', 'Burpee', 'Jump Squat', 'Mountain Climber', 'High Knees', 'Box Jump'],
  'Full Body': ['Deadlift', 'Clean', 'Kettlebell Swing', 'Thruster', 'Burpee', 'Agachamento'],
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

function WorkoutCard({ workout, onPress }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const onIn  = () => Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true }).start();
  const onOut = () => Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }).start();

  return (
    <Animated.View style={[s.cardWrap, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity onPress={onPress} onPressIn={onIn} onPressOut={onOut} activeOpacity={1}>
        <LinearGradient colors={workout.gradient} style={s.card}>
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
              <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.6)" />
              <Text style={s.cardStatText}>{workout.duration}min</Text>
            </View>
            <View style={s.cardStat}>
              <Ionicons name="barbell-outline" size={12} color="rgba(255,255,255,0.6)" />
              <Text style={s.cardStatText}>{workout.exercises?.length || 0} exerc.</Text>
            </View>
          </View>
          <View style={s.cardXP}>
            <Text style={s.cardXPText}>⚡ +{workout.xp} XP</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function WorkoutsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [search, setSearch]               = useState('');
  const [selectedCat, setSelectedCat]     = useState('Todos');
  const [userWorkouts, setUserWorkouts]   = useState([]);
  const [showCreate, setShowCreate]       = useState(false);
  const [nw, setNw]                       = useState({ name: '', emoji: '💪', difficulty: 'MÉDIO', muscles: [], exercises: [] });
  const [exForm, setExForm]               = useState({ name: '', sets: '3', reps: '10', rest: '60s' });
  const [showBank, setShowBank]           = useState(false);

  const filtered = allWorkouts.filter(w => {
    const ms = w.name.toLowerCase().includes(search.toLowerCase()) || w.category.toLowerCase().includes(search.toLowerCase());
    const mc = selectedCat === 'Todos' || w.category === selectedCat;
    return ms && mc;
  });

  const featured = allWorkouts.find(w => w.difficulty === 'DIFÍCIL' && w.xp >= 120);

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
      id: `user_${Date.now()}`,
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
    setUserWorkouts(p => [w, ...p]);
    setNw({ name: '', emoji: '💪', difficulty: 'MÉDIO', muscles: [], exercises: [] });
    setExForm({ name: '', sets: '3', reps: '10', rest: '60s' });
    setShowBank(false);
    setShowCreate(false);
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
              <Text style={s.headerTitle}>🏋️ Biblioteca de Treinos</Text>
              <Text style={s.headerSub}>{allWorkouts.length + userWorkouts.length} treinos disponíveis</Text>
            </View>
            <TouchableOpacity onPress={() => setShowCreate(true)} activeOpacity={0.85}>
              <LinearGradient colors={['#8B5CF6', '#6D28D9']} style={s.createBtn}>
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={s.createBtnText}>Criar Treino</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
          <View style={s.searchBar}>
            <Ionicons name="search-outline" size={18} color={COLORS.gray} />
            <TextInput
              style={s.searchInput}
              placeholder="Buscar treino..."
              placeholderTextColor={COLORS.grayDark}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color={COLORS.gray} />
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
              <Text style={s.sectionTitle}>✨ Meus Treinos</Text>
              <View style={s.countPill}><Text style={s.countPillText}>{userWorkouts.length}</Text></View>
            </View>
            <View style={s.grid}>
              {userWorkouts.map(w => (
                <WorkoutCard
                  key={w.id}
                  workout={w}
                  onPress={() => navigation.navigate('WorkoutDetail', { workout: w, isUserCreated: true })}
                />
              ))}
            </View>
          </View>
        )}

        {/* FEATURED */}
        {selectedCat === 'Todos' && !search && featured && (
          <View style={s.section}>
            <View style={s.sectionHeaderRow}>
              <Text style={s.sectionTitle}>🔥 Desafio da Semana</Text>
              <View style={s.hotBadge}><Text style={s.hotBadgeText}>QUENTE</Text></View>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('WorkoutDetail', { workout: featured })} activeOpacity={0.9}>
              <LinearGradient colors={featured.gradient} style={s.featCard}>
                <View style={s.featContent}>
                  <Text style={s.featEmoji}>{featured.emoji}</Text>
                  <View style={s.featInfo}>
                    <View style={[s.diffBadge, { backgroundColor: featured.difficultyColor + '30' }]}>
                      <Text style={[s.diffText, { color: featured.difficultyColor }]}>{featured.difficulty}</Text>
                    </View>
                    <Text style={s.featName}>{featured.name}</Text>
                    <Text style={s.featSub}>{featured.category}</Text>
                    <View style={s.featStats}>
                      <Text style={s.featStatText}>⏱ {featured.duration}min</Text>
                      <Text style={s.featStatText}>🔥 {featured.calories}kcal</Text>
                      <Text style={s.featStatText}>⚡ +{featured.xp} XP</Text>
                    </View>
                  </View>
                </View>
                <View style={s.muscleTags}>
                  {featured.muscles.map(m => (
                    <View key={m} style={s.muscleTag}><Text style={s.muscleTagText}>{m}</Text></View>
                  ))}
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* ALL WORKOUTS */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>
            {selectedCat === 'Todos' ? '💪 Todos os Treinos' : `💪 ${selectedCat}`}
            <Text style={s.countText}>  ({filtered.length})</Text>
          </Text>
          {filtered.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyEmoji}>🔍</Text>
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

      {/* ── CREATE WORKOUT MODAL ── */}
      <Modal visible={showCreate} animationType="slide">
        <View style={[s.modalBg, { paddingTop: insets.top }]}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>

            {/* Modal header */}
            <LinearGradient colors={['#1A1A3E', '#12122A']} style={s.mHeader}>
              <TouchableOpacity onPress={() => setShowCreate(false)} style={s.mCloseBtn}>
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
              <Text style={s.mHeaderTitle}>✨ Criar Treino</Text>
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
                        {active && <Ionicons name="checkmark" size={11} color={col} />}
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
                    <Ionicons name={showBank ? 'chevron-up-outline' : 'list-outline'} size={14} color={COLORS.purpleLight} />
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
                            <Ionicons
                              name={added ? 'checkmark-circle' : 'add-circle-outline'}
                              size={12}
                              color={added ? COLORS.green : COLORS.gray}
                            />
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
                        <Ionicons name="trash-outline" size={16} color={COLORS.red} />
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
                    <Ionicons name="add-circle" size={16} color={COLORS.purpleLight} />
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
                  <Ionicons name="save-outline" size={20} color="#fff" />
                  <Text style={s.saveBigText}>Salvar Treino</Text>
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
