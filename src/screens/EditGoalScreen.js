import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import TouchableOpacity from '../components/TouchableOpacity';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeftIcon, BarbellIcon, CheckIcon, ClockCountdownIcon, FireIcon, MinusCircleIcon, PlusCircleIcon, ScalesIcon, TargetIcon } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS } from '../theme';
import { useUser } from '../context/UserContext';

const GOAL_OPTIONS = [
  { id: 'lose',     Icon: FireIcon,    label: 'Emagrecer' },
  { id: 'gain',     Icon: BarbellIcon, label: 'Ganhar peso' },
  { id: 'maintain', Icon: ScalesIcon,  label: 'Manter o peso' },
];

const GOAL_TYPE_TO_ID = { emagrecer: 'lose', engordar: 'gain', manter: 'maintain' };

const FREQ_OPTIONS = [1, 2, 3, 4, 5, 6, 7];

const MIN_DAYS_BETWEEN_CHANGES = 30;

const DAY_PILLS = [
  { id: 'seg', label: 'Seg' }, { id: 'ter', label: 'Ter' },
  { id: 'qua', label: 'Qua' }, { id: 'qui', label: 'Qui' },
  { id: 'sex', label: 'Sex' }, { id: 'sab', label: 'Sáb' },
  { id: 'dom', label: 'Dom' },
];

export default function EditGoalScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, updateGoals } = useUser();

  const [goal,        setGoal]        = useState(GOAL_TYPE_TO_ID[user?.goalType] ?? 'lose');
  const [targetWeight, setTargetWeight] = useState(Math.round(user?.targetWeight ?? user?.currentWeight ?? 70));
  const [freq,        setFreq]        = useState(String(user?.weeklyFrequency ?? 3));
  const [workoutDays, setWorkoutDays] = useState(user?.plannedDays ?? []);
  const [saving,       setSaving]      = useState(false);

  const currentWeight = user?.currentWeight ?? 70;

  const daysSinceLastChange = user?.goalsUpdatedAt
    ? Math.floor((Date.now() - new Date(user.goalsUpdatedAt).getTime()) / 86400000)
    : MIN_DAYS_BETWEEN_CHANGES;
  const daysRemaining = Math.max(0, MIN_DAYS_BETWEEN_CHANGES - daysSinceLastChange);
  const isLocked = daysRemaining > 0;

  const toggleDay = (id) => {
    setWorkoutDays(prev => {
      const maxDays = Number(freq) || 7;
      if (prev.includes(id)) return prev.filter(d => d !== id);
      if (prev.length >= maxDays) return prev;
      return [...prev, id];
    });
  };

  const adjustWeight = (delta) => {
    setTargetWeight(prev => {
      const next = prev + delta;
      if (goal === 'lose')     return Math.max(30, Math.min(currentWeight - 1, next));
      if (goal === 'gain')     return Math.min(250, Math.max(currentWeight + 1, next));
      return currentWeight;
    });
  };

  const selectGoal = (id) => {
    setGoal(id);
    if (id === 'maintain') setTargetWeight(currentWeight);
    else if (id === 'lose') setTargetWeight(Math.min(targetWeight, currentWeight - 1));
    else if (id === 'gain') setTargetWeight(Math.max(targetWeight, currentWeight + 1));
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await updateGoals({ goal, targetWeight, freq, workoutDays });
      Alert.alert('Meta atualizada! 🎯', 'Sua nova meta já está valendo — sem perder nada do seu progresso.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar sua meta. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeftIcon size={20} color={COLORS.white} weight="regular" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Meta</Text>
        <View style={{ width: 38 }} />
      </View>

      {isLocked ? (
        <View style={styles.lockedWrap}>
          <View style={styles.lockedIconCircle}>
            <ClockCountdownIcon size={40} color={COLORS.purpleLight} weight="fill" />
          </View>
          <Text style={styles.lockedTitle}>Sua meta está travada</Text>
          <Text style={styles.lockedText}>
            Para manter sua consistência, metas só podem ser alteradas a cada {MIN_DAYS_BETWEEN_CHANGES} dias.{'\n\n'}
            Faltam <Text style={styles.lockedDays}>{daysRemaining} {daysRemaining === 1 ? 'dia' : 'dias'}</Text> para você poder editar novamente.
          </Text>
        </View>
      ) : (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.md, paddingBottom: 40 }}>
        <Text style={styles.headerSub}>
          Isso muda o seu objetivo em todo o app — sem zerar treinos, XP, sequência ou conquistas.
        </Text>

        {/* Objetivo */}
        <Text style={styles.sectionTitle}>Objetivo principal</Text>
        <View style={{ gap: 10, marginBottom: SPACING.lg }}>
          {GOAL_OPTIONS.map(o => {
            const sel = goal === o.id;
            return (
              <TouchableOpacity
                key={o.id}
                style={[styles.card, sel && styles.cardSel]}
                onPress={() => selectGoal(o.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.radio, sel && styles.radioSel]}>
                  {sel && <View style={styles.radioInner} />}
                </View>
                <o.Icon size={20} color={sel ? COLORS.purpleLight : COLORS.gray} weight={sel ? 'fill' : 'regular'} />
                <Text style={[styles.cardLabel, sel && styles.cardLabelSel]}>{o.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Peso desejado */}
        <Text style={styles.sectionTitle}>Peso desejado</Text>
        <View style={styles.weightCard}>
          <TouchableOpacity
            onPress={() => adjustWeight(-1)}
            disabled={goal === 'maintain'}
            style={{ opacity: goal === 'maintain' ? 0.3 : 1 }}
          >
            <MinusCircleIcon size={32} color={COLORS.purpleLight} weight="regular" />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.weightValue}>{targetWeight}<Text style={styles.weightUnit}> kg</Text></Text>
            <Text style={styles.weightHint}>Atual: {currentWeight}kg</Text>
          </View>
          <TouchableOpacity
            onPress={() => adjustWeight(1)}
            disabled={goal === 'maintain'}
            style={{ opacity: goal === 'maintain' ? 0.3 : 1 }}
          >
            <PlusCircleIcon size={32} color={COLORS.purpleLight} weight="regular" />
          </TouchableOpacity>
        </View>

        {/* Frequência semanal */}
        <Text style={styles.sectionTitle}>Dias por semana</Text>
        <View style={styles.freqRow}>
          {FREQ_OPTIONS.map(n => {
            const sel = freq === String(n);
            return (
              <TouchableOpacity
                key={n}
                style={[styles.freqPill, sel && styles.freqPillSel]}
                onPress={() => {
                  setFreq(String(n));
                  setWorkoutDays(prev => prev.slice(0, n));
                }}
              >
                <Text style={[styles.freqPillText, sel && styles.freqPillTextSel]}>{n}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Dias planejados */}
        <Text style={styles.sectionTitle}>Quais dias?</Text>
        <View style={styles.dayRow}>
          {DAY_PILLS.map(d => {
            const sel = workoutDays.includes(d.id);
            return (
              <TouchableOpacity
                key={d.id}
                style={[styles.dayPill, sel && styles.dayPillSel]}
                onPress={() => toggleDay(d.id)}
              >
                {sel && <CheckIcon size={11} color="#fff" weight="bold" />}
                <Text style={[styles.dayPillText, sel && styles.dayPillTextSel]}>{d.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.dayHint}>{workoutDays.length}/{freq} dias selecionados</Text>
      </ScrollView>
      )}

      {!isLocked && (
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity onPress={save} disabled={saving} activeOpacity={0.9}>
          <LinearGradient colors={['#8B5CF6', '#6D28D9']} style={styles.saveBtn}>
            <TargetIcon size={18} color="#fff" weight="fill" />
            <Text style={styles.saveBtnText}>{saving ? 'Salvando...' : 'Salvar meta'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingBottom: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  headerTitle: { color: COLORS.white, fontSize: 17, fontWeight: '800' },
  headerSub: { color: COLORS.gray, fontSize: 13, lineHeight: 19, marginBottom: SPACING.lg },

  lockedWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.xl },
  lockedIconCircle: { width: 84, height: 84, borderRadius: 42, backgroundColor: 'rgba(139,92,246,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg, borderWidth: 1, borderColor: 'rgba(139,92,246,0.25)' },
  lockedTitle: { color: COLORS.white, fontSize: 20, fontWeight: '800', marginBottom: 10 },
  lockedText: { color: COLORS.gray, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  lockedDays: { color: COLORS.purpleLight, fontWeight: '800' },

  sectionTitle: { color: COLORS.white, fontSize: 14, fontWeight: '800', marginBottom: 10 },

  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  cardSel: { borderColor: COLORS.purple, backgroundColor: 'rgba(139,92,246,0.1)' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: COLORS.grayDark, alignItems: 'center', justifyContent: 'center' },
  radioSel: { borderColor: COLORS.purple },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.purple },
  cardLabel: { color: COLORS.gray, fontSize: 14, fontWeight: '700' },
  cardLabelSel: { color: COLORS.white },

  weightCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 20, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.lg },
  weightValue: { color: COLORS.white, fontSize: 32, fontWeight: '900' },
  weightUnit: { fontSize: 16, fontWeight: '700', color: COLORS.gray },
  weightHint: { color: COLORS.gray, fontSize: 12, marginTop: 2 },

  freqRow: { flexDirection: 'row', gap: 8, marginBottom: SPACING.lg },
  freqPill: { flex: 1, aspectRatio: 1, borderRadius: RADIUS.md, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  freqPillSel: { backgroundColor: COLORS.purple, borderColor: COLORS.purple },
  freqPillText: { color: COLORS.gray, fontSize: 15, fontWeight: '800' },
  freqPillTextSel: { color: '#fff' },

  dayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  dayPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderRadius: RADIUS.full, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  dayPillSel: { backgroundColor: COLORS.purple, borderColor: COLORS.purple },
  dayPillText: { color: COLORS.gray, fontSize: 12, fontWeight: '700' },
  dayPillTextSel: { color: '#fff' },
  dayHint: { color: COLORS.grayDark, fontSize: 11, marginTop: 4 },

  footer: { paddingHorizontal: SPACING.md, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.bg },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: RADIUS.lg, paddingVertical: 16 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
