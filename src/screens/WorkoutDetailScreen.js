import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Modal, Dimensions, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS } from '../theme';

const { width } = Dimensions.get('window');

const PERSONAL_RECORDS = {
  'Supino Reto': 70, 'Supino Inclinado': 60, 'Crossover': 25,
  'Tríceps Pulley': 35, 'Tríceps Testa': 30, 'Rosca Direta': 32,
  'Rosca Martelo': 24, 'Agachamento': 100, 'Leg Press': 180,
  'Cadeira Extensora': 60, 'Mesa Flexora': 50, 'Panturrilha': 80,
  'Deadlift': 120, 'Remada Curvada': 70, 'Puxada Frontal': 65,
  'Desenvolvimento': 50, 'Elevação Lateral': 18, 'Hip Thrust': 90,
};

const REST_PRESETS = ['30s', '45s', '60s', '90s', '120s', '2min'];

export default function WorkoutDetailScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { workout, isUserCreated } = route.params;

  const [started, setStarted]             = useState(false);
  const [completed, setCompleted]         = useState(false);
  const [seconds, setSeconds]             = useState(0);
  const [showXPModal, setShowXPModal]     = useState(false);
  const [allExercises, setAllExercises]   = useState([...workout.exercises]);
  const [logs, setLogs]                   = useState({});
  const [restTimer, setRestTimer]         = useState({ active: false, total: 60, remaining: 60 });
  const [showAddModal, setShowAddModal]   = useState(false);
  const [newEx, setNewEx]                 = useState({ name: '', sets: '3', reps: '10', kg: '', rest: '60s' });
  const [prAlert, setPrAlert]             = useState(null);
  const [editingRestIdx, setEditingRestIdx] = useState(null);

  const progressAnim    = useRef(new Animated.Value(0)).current;
  const xpModalScale    = useRef(new Animated.Value(0)).current;
  const xpModalOpacity  = useRef(new Animated.Value(0)).current;
  const headerAnim      = useRef(new Animated.Value(0)).current;
  const prAlertAnim     = useRef(new Animated.Value(0)).current;
  const timerRef        = useRef(null);
  const restIntervalRef = useRef(null);

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (started && !completed) {
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [started, completed]);

  useEffect(() => {
    if (!started) return;
    const init = {};
    allExercises.forEach((ex, i) => {
      const lastKg = PERSONAL_RECORDS[ex.name];
      const repsArr = String(ex.reps).split(',').map(r => r.trim());
      init[i] = Array.from({ length: ex.sets }, (_, si) => ({
        kg: lastKg ? String(lastKg) : '',
        reps: repsArr[si] || repsArr[repsArr.length - 1] || '10',
        done: false,
      }));
    });
    setLogs(init);
  }, [started]);

  const doneCount      = Object.values(logs).filter(sets => sets.length > 0 && sets.every(s => s.done)).length;
  const totalExercises = allExercises.length;
  const exercisePct    = totalExercises > 0 ? doneCount / totalExercises : 0;

  useEffect(() => {
    Animated.timing(progressAnim, { toValue: exercisePct, duration: 300, useNativeDriver: false }).start();
    if (doneCount === totalExercises && totalExercises > 0 && started && !completed) finishWorkout();
  }, [doneCount]);

  const formatTime = s =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const startWorkout = () => { setStarted(true); setSeconds(0); };

  const finishWorkout = () => {
    clearInterval(timerRef.current);
    clearInterval(restIntervalRef.current);
    setCompleted(true);
    setShowXPModal(true);
    Animated.parallel([
      Animated.spring(xpModalScale,   { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
      Animated.timing(xpModalOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const dismissModal = () => {
    Animated.parallel([
      Animated.timing(xpModalScale,   { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(xpModalOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => { setShowXPModal(false); navigation.goBack(); });
  };

  const updateSet = (exIdx, setIdx, field, value) => {
    setLogs(prev => {
      const updated = { ...prev, [exIdx]: [...(prev[exIdx] || [])] };
      updated[exIdx][setIdx] = { ...updated[exIdx][setIdx], [field]: value };
      return updated;
    });
  };

  const toggleSetDone = (exIdx, setIdx) => {
    const set = logs[exIdx]?.[setIdx];
    if (!set) return;
    const nowDone = !set.done;
    if (nowDone && set.kg) {
      const kg = parseFloat(set.kg);
      const exercise = allExercises[exIdx];
      const prev = PERSONAL_RECORDS[exercise.name];
      if (!isNaN(kg) && prev && kg > prev) {
        PERSONAL_RECORDS[exercise.name] = kg;
        setPrAlert({ exerciseName: exercise.name, kg });
        prAlertAnim.setValue(0);
        Animated.sequence([
          Animated.timing(prAlertAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.delay(2800),
          Animated.timing(prAlertAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start(() => setPrAlert(null));
      }
    }
    updateSet(exIdx, setIdx, 'done', nowDone);
    if (nowDone) {
      const ex = allExercises[exIdx];
      const secs = parseInt(ex.rest) || 60;
      startRestTimer(isNaN(secs) ? 60 : secs);
    }
  };

  const addSet = exIdx => {
    setLogs(prev => {
      const prevSets = prev[exIdx] || [];
      const last = prevSets[prevSets.length - 1] || { kg: '', reps: '10', done: false };
      return { ...prev, [exIdx]: [...prevSets, { kg: last.kg, reps: last.reps, done: false }] };
    });
    setAllExercises(prev => prev.map((ex, i) => i === exIdx ? { ...ex, sets: ex.sets + 1 } : ex));
  };

  const deleteSet = (exIdx, setIdx) => {
    setLogs(prev => {
      const prevSets = prev[exIdx] || [];
      if (prevSets.length <= 1) return prev;
      return { ...prev, [exIdx]: prevSets.filter((_, i) => i !== setIdx) };
    });
    setAllExercises(prev => prev.map((ex, i) => i === exIdx ? { ...ex, sets: Math.max(1, ex.sets - 1) } : ex));
  };

  const deleteExercise = idx => {
    setAllExercises(prev => prev.filter((_, i) => i !== idx));
    setLogs(prev => {
      const newLogs = {};
      Object.entries(prev).forEach(([key, val]) => {
        const k = parseInt(key);
        if (k < idx) newLogs[k] = val;
        else if (k > idx) newLogs[k - 1] = val;
      });
      return newLogs;
    });
  };

  const resetToDefault = () => {
    setAllExercises([...workout.exercises]);
    setLogs({});
    setStarted(false);
    setCompleted(false);
    setSeconds(0);
    clearInterval(timerRef.current);
    clearInterval(restIntervalRef.current);
    setRestTimer({ active: false, total: 60, remaining: 60 });
  };

  const updateExerciseRest = (idx, restVal) => {
    setAllExercises(prev => prev.map((ex, i) => i === idx ? { ...ex, rest: restVal } : ex));
    setEditingRestIdx(null);
  };

  const startRestTimer = secs => {
    clearInterval(restIntervalRef.current);
    setRestTimer({ active: true, total: secs, remaining: secs });
    restIntervalRef.current = setInterval(() => {
      setRestTimer(p => {
        if (p.remaining <= 1) { clearInterval(restIntervalRef.current); return { ...p, active: false, remaining: 0 }; }
        return { ...p, remaining: p.remaining - 1 };
      });
    }, 1000);
  };

  const skipRest = () => { clearInterval(restIntervalRef.current); setRestTimer(p => ({ ...p, active: false })); };

  const addCustomExercise = () => {
    if (!newEx.name.trim()) return;
    const ex = { name: newEx.name.trim(), sets: parseInt(newEx.sets) || 3, reps: newEx.reps || '10', rest: newEx.rest || '60s' };
    const newIdx = allExercises.length;
    setAllExercises(prev => [...prev, ex]);
    if (started) {
      setLogs(prev => ({
        ...prev,
        [newIdx]: Array.from({ length: ex.sets }, () => ({ kg: newEx.kg || '', reps: ex.reps, done: false })),
      }));
    }
    setNewEx({ name: '', sets: '3', reps: '10', kg: '', rest: '60s' });
    setShowAddModal(false);
  };

  const totalSetsDone = Object.values(logs).reduce((acc, sets) => acc + sets.filter(s => s.done).length, 0);

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: started ? 220 : 120 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* HERO */}
        <Animated.View style={{ opacity: headerAnim }}>
          <LinearGradient colors={workout.gradient} style={[styles.hero, { paddingTop: insets.top + 12 }]}>
            <View style={styles.heroTopRow}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={22} color="#fff" />
              </TouchableOpacity>
              <View style={styles.heroBadgeRow}>
                {isUserCreated && (
                  <View style={styles.myCreatedBadge}>
                    <Ionicons name="star" size={11} color="#FCD34D" />
                    <Text style={styles.myCreatedText}>Meu treino</Text>
                  </View>
                )}
                {!isUserCreated && (
                  <TouchableOpacity style={styles.resetBtn} onPress={resetToDefault}>
                    <Ionicons name="refresh-outline" size={13} color="rgba(255,255,255,0.7)" />
                    <Text style={styles.resetBtnText}>Restaurar padrão</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            <Text style={styles.heroEmoji}>{workout.emoji}</Text>
            <Text style={styles.heroName}>{workout.name}</Text>
            <Text style={styles.heroCategory}>{workout.category}</Text>
            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Ionicons name="time" size={16} color="rgba(255,255,255,0.8)" />
                <Text style={styles.heroStatText}>{workout.duration} min</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStat}>
                <Ionicons name="flame" size={16} color="rgba(255,255,255,0.8)" />
                <Text style={styles.heroStatText}>{workout.calories} kcal</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <Text style={styles.heroStatText}>⚡ +{workout.xp} XP</Text>
              <View style={styles.heroStatDivider} />
              <View style={[styles.diffBadge, { backgroundColor: workout.difficultyColor + '30' }]}>
                <Text style={[styles.diffText, { color: workout.difficultyColor }]}>{workout.difficulty}</Text>
              </View>
            </View>
            <View style={styles.musclesTags}>
              {workout.muscles.map(m => (
                <View key={m} style={styles.muscleTag}>
                  <Text style={styles.muscleTagText}>{m}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </Animated.View>

        {/* TIMER CARD */}
        {started && !completed && (
          <LinearGradient colors={['#1A1A3E', '#12122A']} style={styles.timerCard}>
            <View style={styles.timerRow}>
              <View style={styles.timerBlock}>
                <Ionicons name="timer" size={20} color={COLORS.purpleLight} />
                <Text style={styles.timerLabel}>Tempo</Text>
                <Text style={styles.timerValue}>{formatTime(seconds)}</Text>
              </View>
              <View style={styles.timerDivider} />
              <View style={styles.timerBlock}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.green} />
                <Text style={styles.timerLabel}>Exercícios</Text>
                <Text style={styles.timerValue}>{doneCount}/{totalExercises}</Text>
              </View>
              <View style={styles.timerDivider} />
              <View style={styles.timerBlock}>
                <Ionicons name="trending-up" size={20} color={COLORS.gold} />
                <Text style={styles.timerLabel}>Progresso</Text>
                <Text style={styles.timerValue}>{Math.round(exercisePct * 100)}%</Text>
              </View>
            </View>
            <View style={styles.activeBarBg}>
              <Animated.View style={[styles.activeBarFill, {
                width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              }]} />
            </View>
          </LinearGradient>
        )}

        {/* EXERCISES */}
        <View style={styles.exercisesSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{started ? '✅ Exercícios' : '📋 Lista de Exercícios'}</Text>
            <TouchableOpacity style={styles.addExBtn} onPress={() => setShowAddModal(true)} activeOpacity={0.8}>
              <Ionicons name="add" size={15} color={COLORS.purpleLight} />
              <Text style={styles.addExBtnText}>Adicionar</Text>
            </TouchableOpacity>
          </View>

          {allExercises.length === 0 && (
            <View style={styles.noExState}>
              <Text style={styles.noExText}>Nenhum exercício. Adicione um! 💪</Text>
            </View>
          )}

          {allExercises.map((exercise, idx) => {
            const exLogs = logs[idx] || [];
            const isDone = started && exLogs.length > 0 && exLogs.every(s => s.done);
            const lastPR = PERSONAL_RECORDS[exercise.name];
            const isEditingRest = editingRestIdx === idx;

            return (
              <View key={idx} style={[styles.exerciseItem, isDone && styles.exerciseItemDone]}>
                {/* Header */}
                <View style={styles.exerciseHeader}>
                  <View style={styles.exerciseLeft}>
                    <View style={[styles.exNumCircle, isDone && styles.exNumCircleDone]}>
                      {isDone
                        ? <Ionicons name="checkmark" size={14} color="#fff" />
                        : <Text style={styles.exNum}>{idx + 1}</Text>
                      }
                    </View>
                    <View style={styles.exInfo}>
                      <Text style={[styles.exName, isDone && styles.exNameDone]}>{exercise.name}</Text>
                      <Text style={styles.exDetail}>{exercise.sets} séries  ·  {exercise.reps}</Text>
                    </View>
                  </View>
                  <View style={styles.exRightCol}>
                    {lastPR != null && (
                      <View style={styles.lastPRBadge}>
                        <Text style={styles.lastPRText}>último: {lastPR}kg</Text>
                      </View>
                    )}
                    {/* EDITABLE REST */}
                    <TouchableOpacity
                      style={[styles.restBadge, isEditingRest && styles.restBadgeActive]}
                      onPress={() => setEditingRestIdx(isEditingRest ? null : idx)}
                    >
                      <Ionicons name="time-outline" size={11} color={isEditingRest ? COLORS.purpleLight : COLORS.gray} />
                      <Text style={[styles.restText, isEditingRest && { color: COLORS.purpleLight }]}>{exercise.rest}</Text>
                      <Ionicons name="pencil-outline" size={9} color={isEditingRest ? COLORS.purpleLight : COLORS.grayDark} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Rest picker (inline) */}
                {isEditingRest && (
                  <View style={styles.restPickerRow}>
                    <Text style={styles.restPickerLabel}>Descanso:</Text>
                    {REST_PRESETS.map(opt => (
                      <TouchableOpacity
                        key={opt}
                        style={[styles.restPickerOpt, exercise.rest === opt && styles.restPickerOptActive]}
                        onPress={() => updateExerciseRest(idx, opt)}
                      >
                        <Text style={[styles.restPickerText, exercise.rest === opt && styles.restPickerTextActive]}>{opt}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Set logger */}
                {started && exLogs.length > 0 && (
                  <View style={styles.setLoggerWrap}>
                    <View style={styles.setLogHeader}>
                      <Text style={[styles.setLogHeaderText, styles.setColNum]}>Série</Text>
                      <Text style={[styles.setLogHeaderText, styles.setColInput]}>Kg</Text>
                      <Text style={[styles.setLogHeaderText, styles.setColInput]}>Reps</Text>
                      <View style={styles.setColCheck} />
                      <View style={styles.setColDel} />
                    </View>
                    {exLogs.map((set, si) => (
                      <View key={si} style={[styles.setRow, set.done && styles.setRowDone]}>
                        <Text style={[styles.setNum, set.done && { color: COLORS.green }]}>{si + 1}</Text>
                        <TextInput
                          style={[styles.setInput, set.done && styles.setInputDone]}
                          value={String(set.kg)}
                          onChangeText={v => updateSet(idx, si, 'kg', v)}
                          placeholder="kg"
                          placeholderTextColor={COLORS.grayDark}
                          keyboardType="decimal-pad"
                          editable={!set.done}
                          selectTextOnFocus
                        />
                        <TextInput
                          style={[styles.setInput, set.done && styles.setInputDone]}
                          value={String(set.reps)}
                          onChangeText={v => updateSet(idx, si, 'reps', v)}
                          placeholder="reps"
                          placeholderTextColor={COLORS.grayDark}
                          keyboardType="number-pad"
                          editable={!set.done}
                          selectTextOnFocus
                        />
                        <TouchableOpacity style={styles.setDoneBtn} onPress={() => toggleSetDone(idx, si)}>
                          <Ionicons
                            name={set.done ? 'checkmark-circle' : 'ellipse-outline'}
                            size={26}
                            color={set.done ? COLORS.green : COLORS.grayDark}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.setDelBtn}
                          onPress={() => deleteSet(idx, si)}
                          disabled={exLogs.length <= 1}
                        >
                          <Ionicons
                            name="remove-circle-outline"
                            size={18}
                            color={exLogs.length <= 1 ? 'transparent' : COLORS.red + '99'}
                          />
                        </TouchableOpacity>
                      </View>
                    ))}
                    <View style={styles.setActionsRow}>
                      <TouchableOpacity style={styles.addSetBtn} onPress={() => addSet(idx)}>
                        <Ionicons name="add-circle-outline" size={14} color={COLORS.purpleLight} />
                        <Text style={styles.addSetBtnText}>Adicionar série</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.delExBtn} onPress={() => deleteExercise(idx)}>
                        <Ionicons name="trash-outline" size={13} color={COLORS.red} />
                        <Text style={styles.delExBtnText}>Remover exercício</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Delete button when NOT started */}
                {!started && (
                  <TouchableOpacity style={styles.delExBtnStatic} onPress={() => deleteExercise(idx)}>
                    <Ionicons name="trash-outline" size={14} color={COLORS.red + 'CC'} />
                    <Text style={styles.delExBtnStaticText}>Remover</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

        {/* TIPS */}
        {!started && (
          <View style={styles.tipsSection}>
            <LinearGradient colors={['#1A1A2E', '#0D0D1A']} style={styles.tipsCard}>
              <Text style={styles.tipsTitle}>💡 Dicas do Treino</Text>
              <Text style={styles.tipText}>• Aqueça por 5 minutos antes de começar</Text>
              <Text style={styles.tipText}>• Mantenha a forma correta em todos os exercícios</Text>
              <Text style={styles.tipText}>• Hidrate-se durante o treino</Text>
              <Text style={styles.tipText}>• Respeite os tempos de descanso</Text>
            </LinearGradient>
          </View>
        )}
      </ScrollView>

      {/* REST TIMER BAR */}
      {restTimer.active && (
        <View style={[styles.restTimerBar, { bottom: insets.bottom + 88 }]}>
          <LinearGradient colors={['#1E1B4B', '#12122A']} style={styles.restTimerInner}>
            <View style={styles.restTimerLeft}>
              <Text style={styles.restTimerEmoji}>⏸</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.restTimerLabel}>Tempo de descanso</Text>
                <View style={styles.restBarBg}>
                  <View style={[styles.restBarFill, { width: `${(restTimer.remaining / restTimer.total) * 100}%` }]} />
                </View>
              </View>
            </View>
            <Text style={styles.restTimerCount}>{formatTime(restTimer.remaining)}</Text>
            <TouchableOpacity style={styles.skipRestBtn} onPress={skipRest}>
              <Text style={styles.skipRestText}>Pular</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      )}

      {/* PR ALERT */}
      {prAlert && (
        <Animated.View style={[styles.prAlert, {
          top: insets.top + 8,
          opacity: prAlertAnim,
          transform: [{ translateY: prAlertAnim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }],
        }]}>
          <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.prAlertInner}>
            <Text style={styles.prAlertEmoji}>🏆</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.prAlertTitle}>NOVO RECORDE PESSOAL!</Text>
              <Text style={styles.prAlertSub}>{prAlert.exerciseName} · {prAlert.kg}kg</Text>
            </View>
            <TouchableOpacity style={styles.prShareBtn} activeOpacity={0.8}>
              <Ionicons name="share-outline" size={16} color="#92400E" />
              <Text style={styles.prShareText}>Compartilhar</Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      )}

      {/* BOTTOM BUTTON */}
      {!completed && (
        <View style={[styles.bottomAction, { paddingBottom: insets.bottom + 16 }]}>
          {!started ? (
            <TouchableOpacity onPress={startWorkout} activeOpacity={0.9} disabled={allExercises.length === 0}>
              <LinearGradient
                colors={allExercises.length === 0 ? ['#2A2A4A', '#1A1A3E'] : workout.gradient}
                style={styles.startBtn}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                <Ionicons name="play-circle" size={24} color="#fff" />
                <Text style={styles.startBtnText}>Iniciar Treino</Text>
                <View style={styles.startXPBadge}>
                  <Text style={styles.startXPText}>+{workout.xp} XP</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={finishWorkout} activeOpacity={0.9}>
              <LinearGradient colors={['#10B981', '#047857']} style={styles.startBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Ionicons name="trophy" size={24} color="#fff" />
                <Text style={styles.startBtnText}>Concluir Treino</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ADD EXERCISE MODAL */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableOpacity style={styles.addModalOverlay} activeOpacity={1} onPress={() => setShowAddModal(false)} />
          <View style={styles.addModalSheet}>
            <LinearGradient colors={['#1A1A3E', '#0A0A18']} style={styles.addModalContent}>
              <View style={styles.addModalHandle} />
              <Text style={styles.addModalTitle}>➕ Adicionar Exercício</Text>

              <View style={styles.addModalField}>
                <Text style={styles.addModalLabel}>Nome do exercício</Text>
                <TextInput
                  style={styles.addModalInput}
                  value={newEx.name}
                  onChangeText={v => setNewEx(p => ({ ...p, name: v }))}
                  placeholder="Ex: Supino Reto"
                  placeholderTextColor={COLORS.grayDark}
                />
              </View>

              <View style={styles.addModalRow}>
                <View style={[styles.addModalField, { flex: 1 }]}>
                  <Text style={styles.addModalLabel}>Séries</Text>
                  <TextInput
                    style={styles.addModalInput}
                    value={newEx.sets}
                    onChangeText={v => setNewEx(p => ({ ...p, sets: v }))}
                    keyboardType="number-pad"
                    placeholder="3"
                    placeholderTextColor={COLORS.grayDark}
                  />
                </View>
                <View style={[styles.addModalField, { flex: 1 }]}>
                  <Text style={styles.addModalLabel}>Repetições</Text>
                  <TextInput
                    style={styles.addModalInput}
                    value={newEx.reps}
                    onChangeText={v => setNewEx(p => ({ ...p, reps: v }))}
                    keyboardType="number-pad"
                    placeholder="10"
                    placeholderTextColor={COLORS.grayDark}
                  />
                </View>
                <View style={[styles.addModalField, { flex: 1 }]}>
                  <Text style={styles.addModalLabel}>Peso (kg)</Text>
                  <TextInput
                    style={styles.addModalInput}
                    value={newEx.kg}
                    onChangeText={v => setNewEx(p => ({ ...p, kg: v }))}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={COLORS.grayDark}
                  />
                </View>
              </View>

              <View style={styles.addModalField}>
                <Text style={styles.addModalLabel}>Descanso entre séries</Text>
                <View style={styles.restOptions}>
                  {REST_PRESETS.map(opt => (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.restOpt, newEx.rest === opt && styles.restOptActive]}
                      onPress={() => setNewEx(p => ({ ...p, rest: opt }))}
                    >
                      <Text style={[styles.restOptText, newEx.rest === opt && styles.restOptTextActive]}>{opt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity onPress={addCustomExercise} activeOpacity={0.9}>
                <LinearGradient colors={['#8B5CF6', '#6D28D9']} style={styles.addModalBtn}>
                  <Text style={styles.addModalBtnText}>Adicionar ao Treino</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* XP MODAL */}
      <Modal visible={showXPModal} transparent animationType="none">
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalContent, { opacity: xpModalOpacity, transform: [{ scale: xpModalScale }] }]}>
            <Text style={styles.modalConfetti}>🎉</Text>
            <Text style={styles.modalTitle}>Treino Concluído!</Text>
            <Text style={styles.modalSub}>Você arrasou hoje!</Text>
            <LinearGradient colors={['#8B5CF6', '#6D28D9']} style={styles.modalXP}>
              <Text style={styles.modalXPText}>+{workout.xp} XP</Text>
            </LinearGradient>
            <View style={styles.modalStats}>
              <View style={styles.modalStat}>
                <Text style={styles.modalStatVal}>{formatTime(seconds)}</Text>
                <Text style={styles.modalStatLabel}>Tempo total</Text>
              </View>
              <View style={styles.modalStatDivider} />
              <View style={styles.modalStat}>
                <Text style={styles.modalStatVal}>{allExercises.length}</Text>
                <Text style={styles.modalStatLabel}>Exercícios</Text>
              </View>
              <View style={styles.modalStatDivider} />
              <View style={styles.modalStat}>
                <Text style={styles.modalStatVal}>{totalSetsDone}</Text>
                <Text style={styles.modalStatLabel}>Séries feitas</Text>
              </View>
            </View>
            <View style={styles.modalBonus}>
              <Text style={styles.modalBonusText}>🔥  Sequência mantida!  +10 XP</Text>
            </View>
            <TouchableOpacity style={styles.modalShareBtn} activeOpacity={0.8}>
              <Ionicons name="share-social-outline" size={18} color={COLORS.purpleLight} />
              <Text style={styles.modalShareText}>Compartilhar no Feed</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={dismissModal} style={styles.modalBtn}>
              <LinearGradient colors={['#8B5CF6', '#6D28D9']} style={styles.modalBtnGrad}>
                <Text style={styles.modalBtnText}>Continuar  →</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  // Hero
  hero: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.xl, gap: 6 },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  heroBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  myCreatedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 5 },
  myCreatedText: { color: '#FCD34D', fontSize: 12, fontWeight: '700' },
  resetBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 5 },
  resetBtnText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' },
  heroEmoji: { fontSize: 52 },
  heroName: { color: '#fff', fontSize: 26, fontWeight: '800' },
  heroCategory: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
  heroStats: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' },
  heroStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroStatText: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },
  heroStatDivider: { width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.25)' },
  diffBadge: { borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3 },
  diffText: { fontSize: 10, fontWeight: '800' },
  musclesTags: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  muscleTag: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  muscleTagText: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600' },

  // Timer card
  timerCard: { margin: SPACING.md, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)', gap: 12 },
  timerRow: { flexDirection: 'row', alignItems: 'center' },
  timerBlock: { flex: 1, alignItems: 'center', gap: 2 },
  timerDivider: { width: 1, height: 40, backgroundColor: COLORS.border },
  timerLabel: { color: COLORS.gray, fontSize: 11 },
  timerValue: { color: COLORS.white, fontSize: 18, fontWeight: '800' },
  activeBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: RADIUS.full, overflow: 'hidden' },
  activeBarFill: { height: '100%', backgroundColor: COLORS.purple, borderRadius: RADIUS.full },

  // Exercises
  exercisesSection: { paddingHorizontal: SPACING.md, marginTop: SPACING.md },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md },
  sectionTitle: { color: COLORS.white, fontSize: 17, fontWeight: '800' },
  addExBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(139,92,246,0.15)', borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(139,92,246,0.35)' },
  addExBtnText: { color: COLORS.purpleLight, fontSize: 12, fontWeight: '700' },
  noExState: { alignItems: 'center', paddingVertical: 32 },
  noExText: { color: COLORS.gray, fontSize: 14 },

  exerciseItem: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  exerciseItemDone: { backgroundColor: 'rgba(16,185,129,0.07)', borderColor: 'rgba(16,185,129,0.3)' },
  exerciseHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  exerciseLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  exNumCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  exNumCircleDone: { backgroundColor: COLORS.green },
  exNum: { color: COLORS.gray, fontSize: 13, fontWeight: '700' },
  exInfo: { flex: 1 },
  exName: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  exNameDone: { textDecorationLine: 'line-through', color: COLORS.gray },
  exDetail: { color: COLORS.gray, fontSize: 12, marginTop: 2 },
  exRightCol: { alignItems: 'flex-end', gap: 5 },
  lastPRBadge: { backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(245,158,11,0.35)' },
  lastPRText: { color: '#F59E0B', fontSize: 10, fontWeight: '700' },
  restBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: COLORS.bgSecondary, borderRadius: RADIUS.sm, paddingHorizontal: 7, paddingVertical: 4 },
  restBadgeActive: { backgroundColor: 'rgba(139,92,246,0.15)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.4)' },
  restText: { color: COLORS.gray, fontSize: 11 },

  // Rest picker
  restPickerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', flexWrap: 'wrap' },
  restPickerLabel: { color: COLORS.gray, fontSize: 11, fontWeight: '600' },
  restPickerOpt: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full, backgroundColor: COLORS.bgSecondary, borderWidth: 1, borderColor: COLORS.border },
  restPickerOptActive: { backgroundColor: COLORS.purple, borderColor: COLORS.purple },
  restPickerText: { color: COLORS.gray, fontSize: 11, fontWeight: '700' },
  restPickerTextActive: { color: '#fff' },

  // Set logger
  setLoggerWrap: { marginTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 10, gap: 4 },
  setLogHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, paddingHorizontal: 2 },
  setLogHeaderText: { color: COLORS.grayDark, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  setColNum: { width: 44, textAlign: 'center' },
  setColInput: { flex: 1, textAlign: 'center' },
  setColCheck: { width: 40 },
  setColDel: { width: 28 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, borderRadius: RADIUS.sm },
  setRowDone: { backgroundColor: 'rgba(16,185,129,0.07)' },
  setNum: { width: 44, textAlign: 'center', color: COLORS.gray, fontSize: 13, fontWeight: '700' },
  setInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: RADIUS.sm, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', paddingHorizontal: 8, paddingVertical: 7, color: COLORS.white, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  setInputDone: { backgroundColor: 'rgba(16,185,129,0.10)', borderColor: 'rgba(16,185,129,0.25)', color: COLORS.green },
  setDoneBtn: { width: 40, alignItems: 'center' },
  setDelBtn: { width: 28, alignItems: 'center' },
  setActionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  addSetBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4 },
  addSetBtnText: { color: COLORS.purpleLight, fontSize: 12, fontWeight: '600' },
  delExBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  delExBtnText: { color: COLORS.red + 'BB', fontSize: 12, fontWeight: '600' },

  // Delete when not started
  delExBtnStatic: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  delExBtnStaticText: { color: COLORS.red + 'BB', fontSize: 12, fontWeight: '600' },

  // Tips
  tipsSection: { paddingHorizontal: SPACING.md, marginTop: SPACING.md },
  tipsCard: { borderRadius: RADIUS.lg, padding: SPACING.md, gap: 8, borderWidth: 1, borderColor: COLORS.border },
  tipsTitle: { color: COLORS.white, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  tipText: { color: COLORS.gray, fontSize: 13, lineHeight: 20 },

  // Rest timer bar
  restTimerBar: { position: 'absolute', left: SPACING.md, right: SPACING.md, zIndex: 10 },
  restTimerInner: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: RADIUS.lg, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(139,92,246,0.4)' },
  restTimerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  restTimerEmoji: { fontSize: 20 },
  restTimerLabel: { color: COLORS.gray, fontSize: 11, fontWeight: '600', marginBottom: 4 },
  restBarBg: { height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: RADIUS.full, overflow: 'hidden' },
  restBarFill: { height: '100%', backgroundColor: COLORS.purple, borderRadius: RADIUS.full },
  restTimerCount: { color: COLORS.white, fontSize: 20, fontWeight: '900' },
  skipRestBtn: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 6 },
  skipRestText: { color: COLORS.gray, fontSize: 12, fontWeight: '700' },

  // PR alert
  prAlert: { position: 'absolute', left: SPACING.md, right: SPACING.md, zIndex: 20 },
  prAlertInner: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: RADIUS.lg, paddingHorizontal: 14, paddingVertical: 12 },
  prAlertEmoji: { fontSize: 24 },
  prAlertTitle: { color: '#000', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  prAlertSub: { color: '#7C2D12', fontSize: 13, fontWeight: '700', marginTop: 1 },
  prShareBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 5 },
  prShareText: { color: '#92400E', fontSize: 11, fontWeight: '700' },

  // Bottom button
  bottomAction: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: SPACING.md, paddingTop: 12, backgroundColor: COLORS.bg, borderTopWidth: 1, borderTopColor: COLORS.border },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.lg, paddingVertical: 16, gap: 10 },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  startXPBadge: { backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3 },
  startXPText: { color: '#FCD34D', fontSize: 12, fontWeight: '700' },

  // Add exercise modal
  addModalOverlay: { flex: 1 },
  addModalSheet: { backgroundColor: 'transparent' },
  addModalContent: { borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.lg, gap: 16, borderTopWidth: 1, borderColor: 'rgba(139,92,246,0.3)' },
  addModalHandle: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
  addModalTitle: { color: COLORS.white, fontSize: 18, fontWeight: '800' },
  addModalField: { gap: 6 },
  addModalRow: { flexDirection: 'row', gap: 10 },
  addModalLabel: { color: COLORS.gray, fontSize: 12, fontWeight: '600' },
  addModalInput: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 10, color: COLORS.white, fontSize: 14, fontWeight: '600' },
  restOptions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  restOpt: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  restOptActive: { backgroundColor: COLORS.purple, borderColor: COLORS.purple },
  restOptText: { color: COLORS.gray, fontSize: 12, fontWeight: '700' },
  restOptTextActive: { color: '#fff' },
  addModalBtn: { borderRadius: RADIUS.lg, paddingVertical: 14, alignItems: 'center' },
  addModalBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  // XP Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', alignItems: 'center', justifyContent: 'center' },
  modalContent: { backgroundColor: '#1A1A2E', borderRadius: RADIUS.xl, padding: SPACING.xl, width: width * 0.88, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(139,92,246,0.4)', gap: 12 },
  modalConfetti: { fontSize: 56 },
  modalTitle: { color: COLORS.white, fontSize: 24, fontWeight: '800' },
  modalSub: { color: COLORS.gray, fontSize: 14 },
  modalXP: { borderRadius: RADIUS.lg, paddingHorizontal: 24, paddingVertical: 10, marginVertical: 4 },
  modalXPText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  modalStats: { flexDirection: 'row', width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: RADIUS.md, padding: 16, alignItems: 'center' },
  modalStat: { flex: 1, alignItems: 'center', gap: 2 },
  modalStatVal: { color: COLORS.white, fontSize: 18, fontWeight: '800' },
  modalStatLabel: { color: COLORS.gray, fontSize: 11 },
  modalStatDivider: { width: 1, height: 30, backgroundColor: COLORS.border },
  modalBonus: { backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: RADIUS.md, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  modalBonusText: { color: '#F87171', fontSize: 13, fontWeight: '600' },
  modalShareBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(139,92,246,0.15)', borderRadius: RADIUS.full, paddingHorizontal: 18, paddingVertical: 9, borderWidth: 1, borderColor: 'rgba(139,92,246,0.35)' },
  modalShareText: { color: COLORS.purpleLight, fontSize: 13, fontWeight: '700' },
  modalBtn: { width: '100%', borderRadius: RADIUS.lg, overflow: 'hidden', marginTop: 4 },
  modalBtnGrad: { paddingVertical: 14, alignItems: 'center', borderRadius: RADIUS.lg },
  modalBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
