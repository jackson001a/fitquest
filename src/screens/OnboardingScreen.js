import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  Animated, TextInput, Dimensions, KeyboardAvoidingView,
  Platform, FlatList, Image
} from 'react-native';
import TouchableOpacity from '../components/TouchableOpacity';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { ArrowLeftIcon, ArrowsClockwiseIcon, BarbellIcon, BellIcon, BrainIcon, CalendarIcon, CheckCircleIcon, CheckIcon, CircleIcon, ClockIcon, CloudSunIcon, DropIcon, FireIcon, ForkKnifeIcon, LeafIcon, LightningIcon, LockOpenIcon, MedalIcon, MoonIcon, PersonIcon, RocketIcon, ScalesIcon, ShieldCheckIcon, StarIcon, SunIcon, SwordIcon, TrendUpIcon, TrophyIcon, WavesIcon } from 'phosphor-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../theme';
import Svg, { Circle } from 'react-native-svg';
import { useUser } from '../context/UserContext';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const { width: SW, height: SH } = Dimensions.get('window');
const TOTAL_STEPS = 28;

// ─── Data ────────────────────────────────────────────────────────────────────

const GENDER_OPTIONS = [
  { id: 'male',   label: 'Masculino' },
  { id: 'female', label: 'Feminino' },
  { id: 'other',  label: 'Outro' },
];

const GOAL_OPTIONS = [
  { id: 'lose',     Icon: FireIcon,    label: 'Emagrecer' },
  { id: 'gain',     Icon: BarbellIcon, label: 'Ganhar peso' },
  { id: 'maintain', Icon: ScalesIcon,  label: 'Manter o peso' },
];

const OBSTACLE_OPTIONS = [
  { id: 'time', label: 'Falta de tempo' },
  { id: 'motivation', label: 'Falta de motivação' },
  { id: 'consistency', label: 'Sempre desisto rápido' },
  { id: 'knowledge', label: 'Não sei como treinar' },
];

const HISTORY_OPTIONS = [
  { id: 'never', label: 'Estou começando agora' },
  { id: 'months', label: 'Alguns meses' },
  { id: 'years', label: 'Há anos' },
  { id: 'always_stop', label: 'Começo e paro constantemente' },
];

const WORKOUT_FREQ_OPTIONS = [
  { id: '1', label: '1 dia' },
  { id: '2', label: '2 dias' },
  { id: '3', label: '3 dias' },
  { id: '4', label: '4 dias' },
  { id: '5', label: '5 dias' },
  { id: '6', label: '6 dias' },
  { id: '7', label: '7 dias' },
];

const DAY_PILLS = [
  { id: 'seg', label: 'Seg' }, { id: 'ter', label: 'Ter' },
  { id: 'qua', label: 'Qua' }, { id: 'qui', label: 'Qui' },
  { id: 'sex', label: 'Sex' }, { id: 'sab', label: 'Sáb' },
  { id: 'dom', label: 'Dom' }
];

const TIME_OPTIONS = [
  { id: 'morning',   Icon: SunIcon,            label: 'Manhã' },
  { id: 'afternoon', Icon: CloudSunIcon,        label: 'Tarde' },
  { id: 'night',     Icon: MoonIcon,            label: 'Noite' },
  { id: 'varies',    Icon: ArrowsClockwiseIcon, label: 'Varia muito' },
];

const ACHIEVEMENT_OPTIONS = [
  { id: 'energy', label: 'Ter mais disposição diária' },
  { id: 'aesthetics', label: 'Melhorar o corpo' },
  { id: 'health', label: 'Mais saúde e longevidade' },
  { id: 'mind', label: 'Saúde mental e alívio do stress' },
];

const FEATURES = [
  { Icon: FireIcon,    label: 'Rotina à prova de falhas',  desc: 'Atividades que cabem no seu dia — curtas quando falta tempo, intensas quando você quer mais' },
  { Icon: BrainIcon,   label: 'Psicologia do hábito',   desc: 'XP, streaks e duelos que ativam o mesmo circuito de recompensa dos melhores jogos' },
  { Icon: TrendUpIcon, label: 'Progresso que você vê',  desc: 'Métricas reais de consistência — semana a semana, sem ilusão' },
];

const LOADING_STEPS = [
  'Definindo metas de treino na academia...',
  'Calculando calorias e macronutrientes...',
  'Montando sua rotina de streak semanal...',
  'Finalizando seu plano personalizado...'
];

const LOADING_MSGS = [
  'Analisando seu perfil...',
  'Cruzando dados de metas...',
  'Estruturando rotina...',
  'Ajustando dificuldade...',
  'Quase pronto...',
];

const TESTIMONIALS = [
  { name: 'Ricardo T.', text: '"Incrível como o aplicativo me prendeu. Nunca fui tão focado."', stars: 5 },
  { name: 'Julia M.', text: '"Acompanhar a evolução deixou de ser chato. Produto sensacional."', stars: 5 },
];

// ─── Drum Picker ─────────────────────────────────────────────────────────────

const ITEM_H = 56;
const VISIBLE = 5;
// paddingVertical = ITEM_H * 2  →  item n centered at scroll y = n * ITEM_H

function DrumPicker({ data, unit, selectedIndex, onSelect }) {
  const scrollY = useRef(new Animated.Value(selectedIndex * ITEM_H)).current;
  const lastTickIdxRef = useRef(selectedIndex);

  const handleScroll = React.useMemo(() => Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true }
  ), [scrollY]);

  // Vibração sutil a cada item que passa pelo centro — dá a sensação física
  // de "catraca" de um seletor giratório de verdade.
  useEffect(() => {
    const id = scrollY.addListener(({ value }) => {
      const idx = Math.round(value / ITEM_H);
      if (idx !== lastTickIdxRef.current && idx >= 0 && idx < data.length) {
        lastTickIdxRef.current = idx;
        Haptics.selectionAsync();
      }
    });
    return () => scrollY.removeListener(id);
  }, [scrollY, data.length]);

  const handleEnd = useCallback((e) => {
    const raw = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
    const clamped = Math.max(0, Math.min(raw, data.length - 1));
    onSelect(data[clamped]);
  }, [data, onSelect]);

  return (
    <View style={drum.wrap}>
      <View style={drum.highlight} pointerEvents="none" />
      <Animated.FlatList
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        onScroll={handleScroll}
        onMomentumScrollEnd={handleEnd}
        onScrollEndDrag={handleEnd}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingVertical: ITEM_H * 2 }}
        data={data}
        keyExtractor={(item) => String(item)}
        initialScrollIndex={selectedIndex}
        getItemLayout={(data, index) => ({ length: ITEM_H, offset: ITEM_H * index, index })}
        renderItem={({ item, index }) => {
          const inputRange = [
            (index - 2) * ITEM_H,
            (index - 1) * ITEM_H,
            index * ITEM_H,
            (index + 1) * ITEM_H,
            (index + 2) * ITEM_H,
          ];
          const opacity = scrollY.interpolate({
            inputRange,
            outputRange: [0.1, 0.4, 1, 0.4, 0.1],
            extrapolate: 'clamp',
          });
          const scale = scrollY.interpolate({
            inputRange,
            outputRange: [0.8, 0.9, 1.2, 0.9, 0.8],
            extrapolate: 'clamp',
          });
          
          return (
            <Animated.View style={[drum.item, { opacity, transform: [{ scale }] }]}>
              <Text style={drum.text}>
                {item} {unit}
              </Text>
            </Animated.View>
          );
        }}
      />
    </View>
  );
}

const drum = StyleSheet.create({
  wrap: { height: ITEM_H * VISIBLE, overflow: 'hidden', position: 'relative', alignItems: 'center', width: '100%' },
  highlight: { position: 'absolute', zIndex: -1, top: ITEM_H * 2, height: ITEM_H, width: '88%', backgroundColor: '#1E1E3A', borderRadius: 14 },
  item: { height: ITEM_H, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 21, fontWeight: '700', color: COLORS.white, paddingHorizontal: 20 },
});

// ─── Horizontal Scale ────────────────────────────────────────────────────────
const HS_ITEM_W = 12;
// paddingHorizontal = SW/2 - HS_ITEM_W/2  →  item n centered at scroll x = n * HS_ITEM_W

function InteractiveScale({ min, max, initialValue, currentWeight, onSelect }) {
  const [displayVal, setDisplayVal] = useState(initialValue);
  const valRef = useRef(initialValue);
  
  const count = max - min + 1;
  const listWidth = SW - 48; // s.body has paddingHorizontal of 24 on each side
  const PADDING = listWidth / 2 - HS_ITEM_W / 2;
  const initialIdx = Math.max(0, Math.min(initialValue - min, count - 1));

  const handleScroll = useCallback((e) => {
    const raw = Math.round(e.nativeEvent.contentOffset.x / HS_ITEM_W);
    const clamped = Math.max(0, Math.min(raw, count - 1));
    const v = min + clamped;
    if (v !== valRef.current) {
      valRef.current = v;
      setDisplayVal(v);
      Haptics.selectionAsync();
    }
  }, [min, count]);

  const handleEnd = useCallback((e) => {
    const raw = Math.round(e.nativeEvent.contentOffset.x / HS_ITEM_W);
    const clamped = Math.max(0, Math.min(raw, count - 1));
    const v = min + clamped;
    if (v !== valRef.current) {
      valRef.current = v;
      setDisplayVal(v);
    }
    onSelect(v);
  }, [min, count, onSelect]);

  const diff = displayVal - currentWeight;
  const diffColor = diff < 0 ? COLORS.redLight : COLORS.greenLight;

  return (
    <View style={{ width: '100%', alignItems: 'center' }}>
      <Text style={{ fontSize: 72, fontWeight: '800', color: COLORS.white, letterSpacing: -3, lineHeight: 80 }}>
        {displayVal} <Text style={{ fontSize: 26, fontWeight: '600', color: COLORS.gray, letterSpacing: 0 }}>kg</Text>
      </Text>
      <Text style={{ fontSize: 20, fontWeight: '800', color: diffColor, marginTop: 6, marginBottom: 28, letterSpacing: -0.5 }}>
        {diff > 0 ? '+' : ''}{diff} kg
      </Text>

      <View style={hScale.wrap}>
        <View style={hScale.centerMarker} />
        {React.useMemo(() => (
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={HS_ITEM_W}
            decelerationRate="fast"
            onScroll={handleScroll}
            onMomentumScrollEnd={handleEnd}
            onScrollEndDrag={handleEnd}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingHorizontal: PADDING }}
            data={Array.from({ length: count }, (_, i) => min + i)}
            keyExtractor={(item) => String(item)}
            initialScrollIndex={initialIdx}
            getItemLayout={(data, index) => ({ length: HS_ITEM_W, offset: HS_ITEM_W * index, index })}
            renderItem={({ item }) => {
              const isTen = item % 10 === 0;
              const isFive = item % 5 === 0 && !isTen;
              return (
                <View style={{ width: HS_ITEM_W, alignItems: 'center', justifyContent: 'flex-end', height: 80 }}>
                  <View style={[hScale.tick, isFive && hScale.tickFive, isTen && hScale.tickMajor]} />
                  {isFive && <Text style={hScale.tickLabelSm}>{item}</Text>}
                  {isTen && <Text style={hScale.tickLabel}>{item}</Text>}
                </View>
              );
            }}
          />
        ), [min, count, initialIdx, PADDING, handleScroll, handleEnd])}
      </View>
    </View>
  );
}

const hScale = StyleSheet.create({
  wrap: { height: 116, width: '100%', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  centerMarker: { position: 'absolute', width: 3, height: 58, backgroundColor: COLORS.orange, top: 10, zIndex: 10, borderRadius: 2 },
  tick: { width: 1.5, height: 16, backgroundColor: '#3A3A5A', borderRadius: 1 },
  tickFive: { height: 27, backgroundColor: '#55558A' },
  tickMajor: { height: 42, backgroundColor: '#8080B8' },
  tickLabel: { position: 'absolute', bottom: -22, color: COLORS.gray, fontSize: 13, fontWeight: '700' },
  tickLabelSm: { position: 'absolute', bottom: -18, color: '#55558A', fontSize: 9, fontWeight: '600' },
});

// ─── Stable Input Screens (fora do componente principal para evitar perda de foco) ───
// Esses componentes são definidos FORA do OnboardingScreen para que não sejam
// recriados a cada render, evitando que o TextInput perca o foco ao digitar.

function NameInputScreen({ value, onChange, onNext, disabled }) {
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 16 }}>
        <View style={{ marginBottom: 32, marginTop: 10 }}>
          <Text style={{ fontSize: 34, fontWeight: '800', color: COLORS.white, lineHeight: 40, marginBottom: 8, letterSpacing: -1 }}>
            Como devemos te chamar?
          </Text>
        </View>
        <TextInput
          style={{ backgroundColor: '#161625', borderRadius: 16, paddingVertical: 20, paddingHorizontal: 24, fontSize: 20, color: COLORS.white, fontWeight: '700' }}
          value={value}
          onChangeText={onChange}
          placeholder="Seu nome"
          placeholderTextColor="#555"
          autoCapitalize="words"
          returnKeyType="done"
          selectionColor={COLORS.white}
        />
      </View>
      <View style={{ paddingBottom: 16, paddingTop: 8, backgroundColor: COLORS.bg }}>
        <TouchableOpacity
          onPress={onNext}
          disabled={disabled}
          activeOpacity={0.85}
          style={{ borderRadius: 99, height: 56, alignItems: 'center', justifyContent: 'center', backgroundColor: disabled ? '#2A2A4A' : COLORS.purple, marginHorizontal: 0 }}
        >
          <Text style={{ color: disabled ? '#888' : COLORS.white, fontSize: 16, fontWeight: '700', letterSpacing: 0.5 }}>Continuar</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function EmailInputScreen({ value, onChange, onNext, disabled }) {
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 16 }}>
        <View style={{ marginBottom: 32, marginTop: 10 }}>
          <Text style={{ fontSize: 34, fontWeight: '800', color: COLORS.white, lineHeight: 40, marginBottom: 8, letterSpacing: -1 }}>
            Qual o seu e-mail?
          </Text>
          <Text style={{ fontSize: 17, color: COLORS.gray, lineHeight: 24, fontWeight: '500' }}>
            Para proteger sua conta e progresso.
          </Text>
        </View>
        <TextInput
          style={{ backgroundColor: '#161625', borderRadius: 16, paddingVertical: 20, paddingHorizontal: 24, fontSize: 20, color: COLORS.white, fontWeight: '700' }}
          value={value}
          onChangeText={onChange}
          placeholder="seu@email.com"
          placeholderTextColor="#555"
          keyboardType="email-address"
          autoCapitalize="none"
          returnKeyType="done"
          selectionColor={COLORS.white}
        />
      </View>
      <View style={{ paddingBottom: 16, paddingTop: 8, backgroundColor: COLORS.bg }}>
        <TouchableOpacity
          onPress={onNext}
          disabled={disabled}
          activeOpacity={0.85}
          style={{ borderRadius: 99, height: 56, alignItems: 'center', justifyContent: 'center', backgroundColor: disabled ? '#2A2A4A' : COLORS.purple }}
        >
          <Text style={{ color: disabled ? '#888' : COLORS.white, fontSize: 16, fontWeight: '700', letterSpacing: 0.5 }}>Continuar</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function PhoneInputScreen({ value, onChange, onNext }) {
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 16 }}>
        <View style={{ marginBottom: 32, marginTop: 10 }}>
          <Text style={{ fontSize: 34, fontWeight: '800', color: COLORS.white, lineHeight: 40, marginBottom: 8, letterSpacing: -1 }}>
            Qual o seu WhatsApp?
          </Text>
          <Text style={{ fontSize: 17, color: COLORS.gray, lineHeight: 24, fontWeight: '500' }}>
            Para alertas importantes (opcional).
          </Text>
        </View>
        <TextInput
          style={{ backgroundColor: '#161625', borderRadius: 16, paddingVertical: 20, paddingHorizontal: 24, fontSize: 20, color: COLORS.white, fontWeight: '700' }}
          value={value}
          onChangeText={onChange}
          placeholder="(11) 99999-9999"
          placeholderTextColor="#555"
          keyboardType="phone-pad"
          returnKeyType="done"
          selectionColor={COLORS.white}
        />
      </View>
      <View style={{ paddingBottom: 16, paddingTop: 8, backgroundColor: COLORS.bg }}>
        <TouchableOpacity
          onPress={onNext}
          activeOpacity={0.85}
          style={{ borderRadius: 99, height: 56, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.purple }}
        >
          <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: '700', letterSpacing: 0.5 }}>Continuar</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function OnboardingScreen({ navigation }) {
  const { completeOnboarding } = useUser();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({ workoutDays: [], height: '170', weight: '70', age: '25' });

  const [heightIdx, setHeightIdx] = useState(30); // 170cm
  const [weightIdx, setWeightIdx] = useState(30); // 70kg
  const [ageIdx, setAgeIdx] = useState(12); // age 25 (AGES starts at 13)

  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [loadingPct, setLoadingPct] = useState(0);
  const [xpCount, setXpCount] = useState(0);

  const HEIGHTS = Array.from({ length: 81 }, (_, i) => String(140 + i)); // 140 to 220
  const WEIGHTS = Array.from({ length: 111 }, (_, i) => String(40 + i)); // 40 to 150
  const AGES = Array.from({ length: 68 }, (_, i) => String(13 + i)); // 13 to 80

  const fadeAnim      = useRef(new Animated.Value(1)).current;
  const slideAnim     = useRef(new Animated.Value(0)).current;
  const loadingProg   = useRef(new Animated.Value(0)).current;
  const featureAnims  = useRef(FEATURES.map(() => new Animated.Value(0))).current;
  const rewardScale   = useRef(new Animated.Value(0)).current;
  const barAnim       = useRef(new Animated.Value(0)).current;

  // ── Transition ──
  const transition = useCallback((dir, fn) => {
    if (dir === 1) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: dir * -20, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      fn();
      slideAnim.setValue(dir * 20);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    });
  }, [fadeAnim, slideAnim]);

  const goNext = useCallback(async () => {
    if (step + 1 >= TOTAL_STEPS) {
      await completeOnboarding(answers);
      return;
    }
    
    let nextStep = step + 1;
    // Skip "How many kilos" (Step 6) if goal is "maintain"
    if (step === 6 && answers.goal === 'maintain') {
      nextStep = 8;
    }

    transition(1, () => setStep(nextStep));
  }, [transition, step, answers, completeOnboarding]);

  const goBack = useCallback(() => {
    if (step === 0) return;

    let prevStep = step - 1;
    // Skip back over "How many kilos" if goal is "maintain"
    if (step === 8 && answers.goal === 'maintain') {
      prevStep = 6;
    }

    transition(-1, () => setStep(prevStep));
  }, [step, transition, answers.goal]);

  const select = useCallback((key, value) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleDay = (id) => {
    setAnswers(prev => {
      const days = prev.workoutDays || [];
      const maxDays = Number(prev.freq) || 7;
      if (days.includes(id)) return { ...prev, workoutDays: days.filter(d => d !== id) };
      if (days.length >= maxDays) return prev;
      return { ...prev, workoutDays: [...days, id] };
    });
  };

  // ── Effects ──
  useEffect(() => {
    // Tela 3 (Index 2) - Animar Features
    if (step !== 2) return;
    featureAnims.forEach(a => a.setValue(0));
    featureAnims.forEach((a, i) =>
      Animated.timing(a, { toValue: 1, duration: 300, delay: i * 120, useNativeDriver: true }).start()
    );
  }, [step]);

  useEffect(() => {
    // Tela 17 (Index 18) - Reward XP
    if (step !== 18) return;
    setXpCount(0);
    rewardScale.setValue(0);
    Animated.spring(rewardScale, { toValue: 1, tension: 70, friction: 7, useNativeDriver: true }).start();
    let v = 0;
    const iv = setInterval(() => { v += 10; setXpCount(Math.min(v, 250)); if (v >= 250) clearInterval(iv); }, 30);
    return () => clearInterval(iv);
  }, [step]);

  useEffect(() => {
    // Tela 7 (Index 7) - Inicializa targetWeight com padrão baseado no objetivo
    if (step !== 7) return;
    setAnswers(prev => {
      if (prev.targetWeight !== undefined) return prev;
      const w = Number(prev.weight) || 70;
      const def = prev.goal === 'lose' ? w - 5 : prev.goal === 'gain' ? w + 5 : w;
      return { ...prev, targetWeight: def };
    });
  }, [step]);

  useEffect(() => {
    // Tela 23 (Index 26) - Loading Plan
    if (step !== 26) return;
    loadingProg.setValue(0);
    setLoadingMsgIdx(0);
    setLoadingPct(0);
    // Vibração vai ficando mais forte conforme o plano "carrega" — começa
    // bem leve e sobe de intensidade a cada 10%, terminando com uma vibração
    // de sucesso quando chega em 100%.
    let lastBucket = -1;
    const id = loadingProg.addListener(({ value }) => {
      const pct = Math.round(value * 100);
      setLoadingPct(pct);
      const bucket = Math.floor(pct / 10);
      if (bucket !== lastBucket) {
        lastBucket = bucket;
        if (pct >= 100) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else if (pct >= 70) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        } else if (pct >= 35) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }
    });
    Animated.timing(loadingProg, { toValue: 1, duration: 5000, useNativeDriver: false }).start();
    const t = setTimeout(goNext, 5500);
    return () => {
      clearTimeout(t);
      loadingProg.removeListener(id);
    };
  }, [step]);

  useEffect(() => {
    if (step !== 11) return;
    barAnim.setValue(0);
    Animated.timing(barAnim, { toValue: 1, duration: 1100, delay: 200, useNativeDriver: false }).start();
  }, [step]);

  // ─── UI Atoms ────────────────────────────────────────────────────────────────
  const Header = () => {
    const pct = Math.round(((step + 1) / TOTAL_STEPS) * 100);
    return (
      <View style={s.header}>
        <TouchableOpacity style={[s.backBtn, step === 0 && { opacity: 0 }]} onPress={goBack} disabled={step === 0} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
          <ArrowLeftIcon size={24} color={COLORS.white}  weight="regular" />
        </TouchableOpacity>
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: `${pct}%` }]} />
        </View>
        <View style={{ width: 24 }} />
      </View>
    );
  };

  const QuestionHeader = ({ text, subtext, center }) => (
    <View style={[s.questionHeaderWrap, center && {alignItems: 'center'}]}>
      <Text style={[s.heroTitle, center && {textAlign: 'center'}]}>{text}</Text>
      {subtext && <Text style={[s.heroSub, center && {textAlign: 'center'}]}>{subtext}</Text>}
    </View>
  );

  const Btn = ({ label = 'Continuar', onPress, disabled, secondary }) => {
    if (secondary) {
      return (
        <View style={s.footer}>
          <TouchableOpacity onPress={onPress || goNext} disabled={disabled} activeOpacity={0.7} style={{alignItems: 'center', paddingVertical: 16}}>
            <Text style={s.ghostBtnText}>{label}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={s.footer}>
        <TouchableOpacity onPress={onPress || goNext} disabled={disabled} activeOpacity={0.85} style={[s.btn, disabled && s.btnDisabled]}>
          <Text style={[s.btnText, disabled && { color: '#888' }]}>{label}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const OptionCard = ({ item, answerKey, showIcon }) => {
    const sel = answers[answerKey] === item.id;
    return (
      <TouchableOpacity style={[s.card, sel && s.cardSel]} onPress={() => select(answerKey, item.id)} activeOpacity={0.7}>
        <View style={s.radioWrap}>
          {sel ? (
            <View style={s.radioSel}><View style={s.radioInner} /></View>
          ) : (
             <View style={s.radio} />
          )}
        </View>
        {showIcon && item.Icon && <item.Icon size={22} color={sel ? COLORS.purpleLight : COLORS.gray} weight={sel ? 'fill' : 'regular'} style={s.iconEmoji} />}
        <View style={s.cardTextWrap}>
          <Text style={[s.cardLabel, sel && s.cardLabelSel]}>{item.label}</Text>
          {item.desc && <Text style={[s.cardDesc, sel && s.cardDescSel]}>{item.desc}</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  // ─── Steps ───────────────────────────────────────────────────────────────────

  // Tela 1: Mostra produto, agradecer, prova social
  const Step0 = () => (
    <>
      <ScrollView style={s.body} contentContainerStyle={s.bodyPad} showsVerticalScrollIndicator={false}>
        <View style={s.appImageWrap}>
           <Image source={require('../../tela_inicial.png')} style={s.appImage} resizeMode="cover" />
           <LinearGradient colors={['transparent', COLORS.bg]} style={s.appImageFade} />
        </View>
        
        <View style={{paddingHorizontal: 24}}>
          <Text style={[s.heroTitle, {textAlign: 'center'}]}>Obrigado por baixar o CapiFit.</Text>
          <Text style={[s.heroSub, {textAlign: 'center'}]}>A jornada premium para a sua melhor versão começa aqui.</Text>
          
          <View style={s.divider} />
          
          {TESTIMONIALS.map((t, i) => (
            <View key={i} style={s.testimonialCard}>
              <Text style={s.stars}>{'★★★★★'}</Text>
              <Text style={s.testimonialText}>{t.text}</Text>
              <Text style={s.testimonialAuthor}>— {t.name}</Text>
            </View>
          ))}
          <View style={{ height: 24 }} />
        </View>
      </ScrollView>
      <Btn label="Começar" />
    </>
  );

  // Tela 2: Gênero
  const Step1 = () => (
    <>
      <View style={s.body}>
        <QuestionHeader text="Como você se identifica?" subtext="Usamos isso para calcular suas taxas metabólicas base." />
        <View style={s.cardList}>
          {GENDER_OPTIONS.map(o => <OptionCard key={o.id} item={o} answerKey="gender" />)}
        </View>
      </View>
      <Btn disabled={!answers.gender} />
    </>
  );

  // Tela 3: Benefício
  const Step2 = () => (
    <>
      <ScrollView style={s.body} contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
        <View style={{ marginBottom: 32, marginTop: 10 }}>
          <Text style={{ fontSize: 36, fontWeight: '800', color: COLORS.white, lineHeight: 42, letterSpacing: -1 }}>
            Por que o <Text style={{ color: COLORS.purpleLight }}>CapiFit</Text> funciona?
          </Text>
          <Text style={{ fontSize: 18, color: '#A0A0C0', lineHeight: 26, marginTop: 12, fontWeight: '500' }}>
            A ciência do comportamento aplicada à sua evolução física.
          </Text>
        </View>

        <View style={{ gap: 14, marginBottom: 24 }}>
          {FEATURES.map((f, i) => (
            <Animated.View key={i} style={[{ opacity: featureAnims[i], transform: [{ translateX: featureAnims[i].interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A2A', borderRadius: 20, paddingVertical: 16, paddingHorizontal: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' }}>
                <LinearGradient colors={['#2A2A4A', '#161625']} style={{ width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
                  <f.Icon size={22} color={COLORS.purpleLight} weight="fill" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: COLORS.white, marginBottom: 4 }}>{f.label}</Text>
                  <Text style={{ fontSize: 13, color: '#A0A0C0', lineHeight: 18 }}>{f.desc}</Text>
                </View>
              </View>
            </Animated.View>
          ))}
        </View>

        <LinearGradient
          colors={['#1A1A2E', '#161625']}
          style={{ borderRadius: 24, padding: 22, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', shadowColor: '#000', shadowOffset: {width: 0, height: 10}, shadowOpacity: 0.3, shadowRadius: 15 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.greenLight, marginRight: 8, shadowColor: COLORS.greenLight, shadowOpacity: 0.8, shadowRadius: 6, shadowOffset: {width: 0, height: 0} }} />
            <Text style={{ color: COLORS.white, fontSize: 14, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' }}>
              Taxa de Sucesso (60 Dias)
            </Text>
          </View>

          <View style={{ gap: 16 }}>
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <Text style={{ color: '#888', fontSize: 13, fontWeight: '600' }}>Outros métodos</Text>
                <Text style={{ color: '#888', fontSize: 14, fontWeight: '800' }}>18%</Text>
              </View>
              <View style={{ height: 10, backgroundColor: '#0A0A18', borderRadius: 99 }}>
                <View style={{ width: '18%', height: '100%', backgroundColor: '#333', borderRadius: 99 }} />
              </View>
            </View>
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <Text style={{ color: COLORS.purpleLight, fontSize: 14, fontWeight: '800' }}>Método CapiFit</Text>
                <Text style={{ color: COLORS.purpleLight, fontSize: 18, fontWeight: '900' }}>71%</Text>
              </View>
              <View style={{ height: 12, backgroundColor: '#0A0A18', borderRadius: 99, overflow: 'hidden', position: 'relative' }}>
                <LinearGradient
                  colors={['#8B5CF6', '#D8B4FE']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={{ width: '71%', height: '100%', borderRadius: 99 }}
                />
                <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: '29%', backgroundColor: '#fff', opacity: 0.2 }} />
              </View>
            </View>
          </View>
          <Text style={{ color: '#555', fontSize: 10, marginTop: 16, fontStyle: 'italic', textAlign: 'center' }}>
            * Baseado na retenção de usuários ativos nos últimos 6 meses
          </Text>
        </LinearGradient>
      </ScrollView>
      <Btn />
    </>
  );

  // Tela 4: Altura e Peso
  const Step3 = () => (
    <>
      <View style={s.body}>
        <QuestionHeader text="Suas medidas corporais" subtext="Isso será usado para calibrar seu plano personalizado." />
        <View style={s.pickerRow}>
          <View style={s.pickerCol}>
            <Text style={s.pickerColTitle}>Altura</Text>
            <DrumPicker data={HEIGHTS} unit="cm" selectedIndex={heightIdx} onSelect={(v) => { setHeightIdx(HEIGHTS.indexOf(v)); setAnswers(p => ({ ...p, height: v })); }} />
          </View>
          <View style={s.pickerSeparator} />
          <View style={s.pickerCol}>
            <Text style={s.pickerColTitle}>Peso</Text>
            <DrumPicker data={WEIGHTS} unit="kg" selectedIndex={weightIdx} onSelect={(v) => { setWeightIdx(WEIGHTS.indexOf(v)); setAnswers(p => ({ ...p, weight: v })); }} />
          </View>
        </View>
      </View>
      <Btn />
    </>
  );

  // Tela 5: Idade
  const StepAge = () => (
    <>
      <View style={s.body}>
        <QuestionHeader text="Qual é a sua idade?" subtext="Usamos isso para calcular seu metabolismo basal com precisão real." />
        <View style={{ backgroundColor: '#161625', borderRadius: 20, paddingVertical: 16, marginTop: 8 }}>
          <DrumPicker
            data={AGES}
            unit="anos"
            selectedIndex={ageIdx}
            onSelect={(v) => { setAgeIdx(AGES.indexOf(v)); setAnswers(p => ({ ...p, age: v })); }}
          />
        </View>
      </View>
      <Btn />
    </>
  );

  // Tela 5.5: Aviso — meta trava por 30 dias
  const StepGoalLockInfo = () => (
    <View style={s.body}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10 }}>
        <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 30 }}>
          <View style={{ position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: COLORS.purpleLight, opacity: 0.1 }} />
          <View style={{ position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: COLORS.purpleLight, opacity: 0.15 }} />
          <LinearGradient colors={['#2A2A4A', '#161625']} style={{ width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
            <ShieldCheckIcon size={42} color={COLORS.purpleLight} weight="fill" />
          </LinearGradient>
        </View>
        <Text style={[s.heroTitle, { textAlign: 'center', fontSize: 30, lineHeight: 37 }]}>Seu plano está começando.</Text>
        <Text style={[s.heroSub, { textAlign: 'center', marginTop: 12, fontSize: 17, lineHeight: 25, color: '#A0A0C0' }]}>
          Para funcionar de verdade, seu objetivo, peso desejado, dias e frequência de treino só poderão ser alterados depois de 30 dias.
        </Text>
        <Text style={[s.heroSub, { textAlign: 'center', marginTop: 4, fontSize: 15, lineHeight: 22, color: COLORS.gray }]}>
          Escolha com calma — é isso que vai te manter consistente.
        </Text>
      </View>
      <Btn label="Entendi, vamos lá" />
    </View>
  );

  // Tela 6: Objetivo principal
  const Step4 = () => (
    <>
      <View style={s.body}>
        <QuestionHeader text="Qual é o seu objetivo principal?" subtext="Nosso algoritmo ajustará os desafios para focar no que importa para você." />
        <View style={s.cardList}>
          {GOAL_OPTIONS.map(o => <OptionCard key={o.id} item={o} answerKey="goal" showIcon />)}
        </View>
      </View>
      <Btn disabled={!answers.goal} />
    </>
  );

  // Tela 6: Qual é seu peso desejado?
  const Step5 = () => {
    const currentWeight = Number(answers.weight) || 70;

    // Range da escala baseado no objetivo
    const scaleMin = answers.goal === 'lose' ? Math.max(30, currentWeight - 70) : currentWeight + 1;
    const scaleMax = answers.goal === 'lose' ? Math.max(scaleMin + 1, currentWeight - 1) : Math.min(250, currentWeight + 100);
    const defaultTarget = answers.goal === 'lose'
      ? Math.max(scaleMin, currentWeight - 5)
      : Math.min(scaleMax, currentWeight + 5);

    const target = answers.targetWeight !== undefined
      ? Math.max(scaleMin, Math.min(scaleMax, Number(answers.targetWeight)))
      : defaultTarget;

    return (
      <>
        <View style={s.body}>
          <QuestionHeader text="Qual é seu peso desejado?" center />
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <InteractiveScale
              min={scaleMin}
              max={scaleMax}
              initialValue={target}
              currentWeight={currentWeight}
              onSelect={(v) => setAnswers(p => ({ ...p, targetWeight: v }))}
            />
            <View style={s.currentWeightBadge}>
              <PersonIcon size={16} color={COLORS.gray}  weight="regular" />
              <Text style={s.currentWeightLabel}>Seu peso atual:</Text>
              <Text style={s.currentWeightVal}>{currentWeight} kg</Text>
            </View>
          </View>
        </View>
        <Btn />
      </>
    );
  };

  // Tela 7: Realista
  const Step6 = () => {
    const currentWeight = Number(answers.weight) || 70;
    const target = answers.targetWeight !== undefined ? Number(answers.targetWeight) : currentWeight;
    const diff = Math.abs(target - currentWeight);
    const action = answers.goal === 'lose' ? 'Perder' : answers.goal === 'gain' ? 'Ganhar' : 'Manter';
    const highlight = answers.goal === 'maintain' ? `${currentWeight} kg` : `${diff.toFixed(1)} kg`;

    return (
      <>
        <View style={s.body}>
           <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
              <Text style={[s.heroTitle, {textAlign: 'center', fontSize: 34, lineHeight: 42}]}>
                 {action} <Text style={{color: COLORS.orange}}>{highlight}</Text> é uma meta REALISTA. E acredite: não é nada difícil!
              </Text>
              <Text style={[s.heroSub, {textAlign: 'center', marginTop: 20}]}>O segredo para não desistir é começar com uma meta possível como a sua.</Text>
           </View>
        </View>
        <Btn />
      </>
    );
  };

  // Tela 8: Qual problema? Obstáculo
  const Step7 = () => (
    <>
      <View style={s.body}>
        <QuestionHeader text="O que mais te atrapalha hoje?" subtext="Entender suas barreiras nos ajuda a montar um sistema anti-falhas." />
        <View style={s.cardList}>
          {OBSTACLE_OPTIONS.map(o => <OptionCard key={o.id} item={o} answerKey="obstacle" />)}
        </View>
      </View>
      <Btn disabled={!answers.obstacle} />
    </>
  );

  // Tela 9: Há quanto tempo tenta manter?
  const Step8 = () => (
    <>
      <View style={s.body}>
        <QuestionHeader text="Há quanto tempo você tenta estabelecer uma rotina?" />
        <View style={s.cardList}>
          {HISTORY_OPTIONS.map(o => <OptionCard key={o.id} item={o} answerKey="history" />)}
        </View>
      </View>
      <Btn disabled={!answers.history} />
    </>
  );

  // Tela 10: Vamos ajudar (Interlúdio)
  const Step9 = () => {
    const bars = [
      { label: 'Sem 1', pct: 0.28, color: '#6D28D9' },
      { label: 'Sem 2', pct: 0.44, color: '#7C3AED' },
      { label: 'Sem 3', pct: 0.60, color: '#8B5CF6' },
      { label: 'Sem 4', pct: 0.74, color: '#9F67FF' },
      { label: 'Sem 5', pct: 0.88, color: '#A78BFA' },
      { label: 'Sem 6', pct: 1.00, color: COLORS.gold },
    ];

    const statCards = [
      { value: '47K+', label: 'usuários\nativos' },
      { value: '92%', label: 'completam\na semana 1' },
      { value: '4.8★', label: 'avaliação\nna loja' },
    ];

    const BAR_MAX = 72;

    return (
      <View style={s.body}>
        <View style={{ flex: 1, paddingHorizontal: 22, justifyContent: 'center' }}>

          {/* Headline */}
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <Text style={{ fontSize: 30, fontWeight: '800', color: COLORS.white, textAlign: 'center', lineHeight: 37 }}>
              {'Vamos te ajudar\na '}
              <Text style={{ color: COLORS.purpleLight }}>não desistir</Text>
              {'.\nComo já ajudamos milhares.'}
            </Text>
          </View>

          {/* Bar chart */}
          <LinearGradient
            colors={['#1C1C38', '#13132A']}
            style={{ borderRadius: 20, padding: 18, borderWidth: 1, borderColor: 'rgba(139,92,246,0.25)', marginBottom: 14 }}
          >
            <Text style={{ color: COLORS.gray, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 14 }}>
              CONSISTÊNCIA MÉDIA POR SEMANA
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: BAR_MAX }}>
              {bars.map((bar, i) => (
                <View key={i} style={{ alignItems: 'center', flex: 1 }}>
                  <Animated.View style={{
                    width: '55%',
                    height: barAnim.interpolate({ inputRange: [0, 1], outputRange: [0, BAR_MAX * bar.pct] }),
                    backgroundColor: bar.color,
                    borderRadius: 5,
                  }} />
                  <Text style={{ color: COLORS.grayDark, fontSize: 9, marginTop: 5, fontWeight: '600' }}>{bar.label}</Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
              <TrendUpIcon size={13} color={COLORS.green}  weight="bold" />
              <Text style={{ color: COLORS.green, fontSize: 12, fontWeight: '700', marginLeft: 4 }}>+258% de consistência na semana 6</Text>
            </View>
          </LinearGradient>


          {/* Testimonial */}
          <LinearGradient
            colors={['#1C1C38', '#13132A']}
            style={{ borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(139,92,246,0.22)' }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <LinearGradient colors={['#8B5CF6', '#6D28D9']} style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                <Text style={{ color: COLORS.white, fontWeight: '800', fontSize: 15 }}>R</Text>
              </LinearGradient>
              <View>
                <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 13 }}>Ricardo T.</Text>
                <Text style={{ color: COLORS.gold, fontSize: 12, letterSpacing: 1 }}>★★★★★</Text>
              </View>
              <View style={{ marginLeft: 'auto', backgroundColor: 'rgba(16,185,129,0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ color: COLORS.green, fontSize: 10, fontWeight: '700' }}>✓ Verificado</Text>
              </View>
            </View>
            <Text style={{ color: '#B0B0CC', fontSize: 13, lineHeight: 20, fontStyle: 'italic' }}>
              "Em 6 semanas bati meu recorde de streak. Nunca fui consistente na academia — agora é diferente."
            </Text>
          </LinearGradient>

        </View>
        <Btn label="Quero isso também" />
      </View>
    );
  };

  // Tela 11: Treinos por semana
  const Step10 = () => (
    <>
      <View style={s.body}>
        <QuestionHeader text="Quantos dias por semana você pretende treinar?" />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.cardList}>
          {WORKOUT_FREQ_OPTIONS.map(o => (
            <TouchableOpacity
              key={o.id}
              style={[s.card, answers.freq === o.id && s.cardSel]}
              onPress={() => setAnswers(prev => ({ ...prev, freq: o.id, workoutDays: [] }))}
              activeOpacity={0.7}
            >
              <View style={s.radioWrap}>
                {answers.freq === o.id ? (
                  <View style={s.radioSel}><View style={s.radioInner} /></View>
                ) : (
                  <View style={s.radio} />
                )}
              </View>
              <View style={s.cardTextWrap}>
                <Text style={[s.cardLabel, answers.freq === o.id && s.cardLabelSel]}>{o.label}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <Btn disabled={!answers.freq} />
    </>
  );

  // Tela 12: Quais dias?
  const Step11 = () => {
    const maxDays = Number(answers.freq) || 0;
    const selectedCount = (answers.workoutDays || []).length;
    const remaining = maxDays - selectedCount;
    const isComplete = selectedCount === maxDays;

    return (
      <>
        <View style={s.body}>
          <QuestionHeader
            text="Quais dias você vai treinar?"
            subtext={isComplete
              ? '✅ Perfeito! Seus dias estão definidos.'
              : remaining === 1
                ? `Escolha mais 1 dia`
                : `Escolha ${remaining} dias (${selectedCount}/${maxDays})`}
          />
          <View style={s.pillWrap}>
            {DAY_PILLS.map(d => {
              const isSel = (answers.workoutDays || []).includes(d.id);
              const isDisabled = !isSel && selectedCount >= maxDays;
              return (
                <TouchableOpacity
                  key={d.id}
                  onPress={() => !isDisabled && toggleDay(d.id)}
                  activeOpacity={0.8}
                  style={[s.pillBtn, isSel && s.pillBtnSel, isDisabled && { opacity: 0.3 }]}
                >
                  <Text style={[s.pillText, isSel && s.pillTextSel]}>{d.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        <Btn disabled={!isComplete} onPress={goNext} />
      </>
    );
  };

  // Tela 13: Ótimos dias
  const Step12 = () => (
    <View style={s.body}>
       <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10}}>
          <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 30 }}>
            <View style={{ position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: COLORS.purpleLight, opacity: 0.1 }} />
            <View style={{ position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: COLORS.purpleLight, opacity: 0.15 }} />
            <LinearGradient colors={['#2A2A4A', '#161625']} style={{ width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
              <CalendarIcon size={42} color={COLORS.purpleLight}  weight="regular" />
            </LinearGradient>
          </View>
          <Text style={[s.heroTitle, {textAlign: 'center', fontSize: 36, lineHeight: 42}]}>Ótima escolha.</Text>
          <Text style={[s.heroSub, {textAlign: 'center', marginTop: 12, fontSize: 18, lineHeight: 26, color: '#A0A0C0'}]}>Esses dias foram separados e otimizados na sua grade de atividades.</Text>
       </View>
       <Btn label="Continuar" />
    </View>
  );

  // Tela 14: Qual horário?
  const Step13 = () => (
    <>
      <View style={s.body}>
        <QuestionHeader text="Qual horário você costuma treinar?" />
        <View style={s.cardList}>
          {TIME_OPTIONS.map(o => <OptionCard key={o.id} item={o} answerKey="time" showIcon />)}
        </View>
      </View>
      <Btn disabled={!answers.time} />
    </>
  );

  // Tela 15: O que gostaria de alcançar?
  const Step14 = () => (
    <>
      <View style={s.body}>
        <QuestionHeader text="No fundo, o que você mais gostaria de alcançar?" subtext="Além da métrica na balança." />
        <View style={s.cardList}>
          {ACHIEVEMENT_OPTIONS.map(o => <OptionCard key={o.id} item={o} answerKey="achievement" />)}
        </View>
      </View>
      <Btn disabled={!answers.achievement} />
    </>
  );

  // Tela 16: Obrigado por confiar
  const Step15 = () => (
    <View style={s.body}>
       <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <Text style={[s.heroTitle, {textAlign: 'center', fontSize: 40}]}>Obrigado pela confiança.</Text>
          <Text style={[s.heroSub, {textAlign: 'center', marginTop: 16}]}>Você acaba de dar o passo mais importante da sua jornada.</Text>
       </View>
       <Btn label="Avançar" />
    </View>
  );

  // Tela 17: Já começou / XP
  const Step16 = () => (
    <View style={s.body}>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        
        {/* Glowing Background Aura */}
        <Animated.View style={{ position: 'absolute', top: '20%', alignSelf: 'center', width: 250, height: 250, borderRadius: 125, backgroundColor: COLORS.purpleLight, opacity: 0.1, transform: [{ scale: rewardScale.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.2] }) }] }} />

        <Animated.View style={{ transform: [{ scale: rewardScale }], alignItems: 'center' }}>
          
          <View style={{ marginBottom: -15, zIndex: 10 }}>
            <LinearGradient
              colors={['#FFD700', '#F59E0B']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ paddingHorizontal: 16, paddingVertical: 6, borderRadius: 99, shadowColor: '#F59E0B', shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: {width: 0, height: 4} }}
            >
              <Text style={{ color: '#000', fontWeight: '900', fontSize: 11, letterSpacing: 1.5 }}>✦ JORNADA INICIADA ✦</Text>
            </LinearGradient>
          </View>

          <LinearGradient
            colors={['#1E1E3A', '#12122A']}
            style={{ borderRadius: 28, padding: 24, paddingBottom: 28, width: '100%', borderWidth: 1, borderColor: '#3A3A5A', shadowColor: COLORS.purpleLight, shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.25, shadowRadius: 30, elevation: 15 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
              <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(139, 92, 246, 0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                <LinearGradient
                  colors={['#8B5CF6', '#6D28D9']}
                  style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }}
                >
                  <RocketIcon size={24} color="#fff" weight="fill" />
                </LinearGradient>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: COLORS.goldLight, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' }}>Seu Perfil</Text>
                <Text style={{ color: COLORS.white, fontSize: 22, fontWeight: '900', marginTop: 2 }}>Parabéns, você já começou!</Text>
              </View>
            </View>

            <View style={{ marginBottom: 24, backgroundColor: '#0A0A18', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, alignItems: 'flex-end' }}>
                <Text style={{ color: '#A0A0C0', fontSize: 13, fontWeight: '600' }}>Experiência</Text>
                <Text style={{ color: COLORS.white, fontSize: 14, fontWeight: '800' }}><Text style={{color: COLORS.purpleLight}}>+{xpCount}</Text> / 1000 XP</Text>
              </View>
              <View style={{ height: 10, backgroundColor: '#1A1A2E', borderRadius: 99, overflow: 'hidden' }}>
                <LinearGradient
                  colors={['#8B5CF6', '#C084FC']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={{ width: `${Math.round((xpCount / 1000) * 100)}%`, height: '100%', borderRadius: 99 }}
                />
              </View>
            </View>

            <LinearGradient
              colors={['rgba(139,92,246,0.25)', 'rgba(109,40,217,0.15)']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ borderRadius: 20, paddingVertical: 20, alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.purpleLight }}
            >
              <Text style={{ fontSize: 48, fontWeight: '900', color: COLORS.purpleLight, letterSpacing: -1 }}>+{xpCount}</Text>
              <Text style={{ color: COLORS.purpleLight, fontSize: 13, marginTop: 4, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.5 }}>XP Ganho</Text>
            </LinearGradient>
          </LinearGradient>
        </Animated.View>

        <Text style={{ color: COLORS.white, fontSize: 18, textAlign: 'center', lineHeight: 26, marginTop: 32, fontWeight: '700', paddingHorizontal: 10 }}>
          Sua conta já está acumulando resultados!
        </Text>
        <Text style={{ color: '#A0A0C0', fontSize: 15, textAlign: 'center', lineHeight: 22, marginTop: 8, fontWeight: '500', paddingHorizontal: 20 }}>
          Complete seu primeiro desafio hoje e suba de nível.
        </Text>
      </View>
      <Btn label="Receber Recompensa" />
    </View>
  );

  // Tela 18: Lembrete Notificações
  const Step17 = () => (
    <>
      <View style={s.body}>
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10}}>
          <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 30 }}>
            <View style={{ position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: COLORS.purple, opacity: 0.1 }} />
            <View style={{ position: 'absolute', width: 130, height: 130, borderRadius: 65, backgroundColor: COLORS.purple, opacity: 0.15 }} />
            <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.purple, alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.purple, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 }}>
               <BellIcon size={46} color={COLORS.white}  weight="fill" />
            </View>
          </View>
          <Text style={[s.heroTitle, {textAlign: 'center', fontSize: 36, lineHeight: 42}]}>Não perca seu streak.</Text>
          <Text style={[s.heroSub, {textAlign: 'center', marginTop: 12, fontSize: 18, lineHeight: 26, color: '#A0A0C0'}]}>Ative as notificações para receber alertas de treino e recompensas exclusivas.</Text>
        </View>
      </View>
      <View style={{paddingHorizontal: 24}}>
        <Btn label="Ativar notificações" />
        <Btn label="Pular" secondary />
      </View>
    </>
  );

  // Telas 19-21: Input de nome/email/telefone
  // Obs: renderizados separadamente no return principal para evitar perda de foco


  // Tela 22: Hora de gerar plano
  const Step21 = () => (
    <View style={s.body}>
       <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <LightningIcon size={60} color={COLORS.purpleLight}  weight="fill" />
          <Text style={[s.heroTitle, {textAlign: 'center', marginTop: 32}]}>Tudo pronto.</Text>
          <Text style={[s.heroSub, {textAlign: 'center'}]}>Temos todas as informações necessárias. É hora de gerar o seu plano de ação.</Text>
       </View>
       <Btn label="Gerar Meu Plano" />
    </View>
  );

  // Tela 23: Gerando plano (Loading)
  const Step22 = () => {
    const radius = 60;
    const strokeWidth = 10;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = loadingProg.interpolate({
      inputRange: [0, 1],
      outputRange: [circumference, 0]
    });

    return (
      <View style={[s.body, {justifyContent: 'center', alignItems: 'center'}]}>
        <View style={{ position: 'relative', width: 140, height: 140, alignItems: 'center', justifyContent: 'center', marginBottom: 40 }}>
          <Svg width={140} height={140}>
            <Circle cx={70} cy={70} r={radius} stroke="#1E1E3A" strokeWidth={strokeWidth} fill="none" />
            <AnimatedCircle
              cx={70}
              cy={70}
              r={radius}
              stroke={COLORS.purpleLight}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              rotation="-90"
              origin="70, 70"
            />
          </Svg>
          <Text style={{ position: 'absolute', fontSize: 28, fontWeight: '800', color: COLORS.white }}>{loadingPct}%</Text>
        </View>

        <Text style={[s.heroTitle, {textAlign: 'center', marginBottom: 30}]}>Quase pronto! Finalizando detalhes...</Text>

        <View style={{ width: '100%', paddingHorizontal: 10 }}>
          {LOADING_STEPS.map((stepText, idx) => {
            const threshold = (idx + 1) * 25; // 25, 50, 75, 100
            const isActive = loadingPct >= (threshold - 15);
            return (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                 {isActive
                   ? <CheckCircleIcon size={24} color={COLORS.greenLight} weight="fill" />
                   : <CircleIcon size={24} color={COLORS.gray} weight="regular" />}
                 <Text style={{ marginLeft: 12, fontSize: 16, color: isActive ? COLORS.white : COLORS.gray, fontWeight: isActive ? '600' : '500' }}>
                   {stepText}
                 </Text>
              </View>
            )
          })}
        </View>
      </View>
    );
  };

  const StepPlan = () => {
    const weight = Number(answers.weight) || 70;
    const height = Number(answers.height) || 170;
    const age = Number(answers.age) || 25;
    const isMale = answers.gender !== 'female';
    const goal = answers.goal || 'maintain';
    const targetWeight = answers.targetWeight !== undefined ? Number(answers.targetWeight) : weight;
    const diff = Math.abs(targetWeight - weight);

    // BMR + TDEE
    const bmr = 10 * weight + 6.25 * height - 5 * age + (isMale ? 5 : -161);
    const freqNum = Number(answers.freq) || 3;
    const actMultiplier = freqNum >= 6 ? 1.9 : freqNum >= 5 ? 1.725 : freqNum >= 3 ? 1.55 : 1.375;
    const tdee = Math.round(bmr * actMultiplier);

    let calories = tdee;
    let weeklyRate = 0;
    let weeksToGoal = 0;

    if (goal === 'lose') {
      const deficit = diff > 15 ? 750 : diff > 5 ? 600 : 500;
      calories = Math.max(1200, tdee - deficit);
      weeklyRate = (tdee - calories) / 1100;
      weeksToGoal = Math.ceil(diff / weeklyRate);
    } else if (goal === 'gain') {
      calories = tdee + 300;
      weeklyRate = 0.25;
      weeksToGoal = Math.ceil(diff / weeklyRate);
    }

    const monthsToGoal = weeksToGoal > 0 ? Math.round(weeksToGoal / 4.3) : 0;
    const timelineLabel = goal === 'maintain'
      ? 'Manutenção'
      : monthsToGoal >= 1
        ? `~${monthsToGoal} ${monthsToGoal === 1 ? 'mês' : 'meses'}`
        : `~${weeksToGoal} semanas`;

    const waterL = (weight * 35 / 1000).toFixed(1);
    const proteinG = Math.round(weight * (goal === 'lose' ? 2.2 : goal === 'gain' ? 1.8 : 1.6));
    const fatG = Math.round(weight * 0.8);
    const carbsG = Math.max(50, Math.round((calories - proteinG * 4 - fatG * 9) / 4));
    const goalColor = goal === 'lose' ? COLORS.orange : goal === 'gain' ? COLORS.green : COLORS.purple;
    const actionLabel = goal === 'lose' ? 'Perder' : goal === 'gain' ? 'Ganhar' : 'Manter';

    // Nível de comprometimento
    let commitPct = 60;
    if (diff > 15) commitPct += 20;
    else if (diff > 5) commitPct += 12;
    else if (diff > 0) commitPct += 6;
    if (freqNum >= 5) commitPct += 10;
    else if (freqNum >= 3) commitPct += 5;
    if (answers.obstacle === 'always_stop' || answers.history === 'always_stop') commitPct += 10;
    else if (answers.obstacle === 'motivation') commitPct += 7;
    commitPct = Math.min(95, commitPct);

    const commitColor = commitPct >= 85 ? COLORS.gold : commitPct >= 70 ? COLORS.purpleLight : COLORS.greenLight;
    const CommitTierIcon = commitPct >= 85 ? TrophyIcon : commitPct >= 70 ? BarbellIcon : LeafIcon;
    const commitTier = commitPct >= 85 ? 'Elite' : commitPct >= 70 ? 'Dedicado' : 'Consistente';

    // Streak / treinos
    const workoutsPerWeek = freqNum;
    const workoutsPerMonth = freqNum * 4;
    const selectedDays = answers.workoutDays || [];
    const allDays = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
    const dayLabels = { seg: 'Seg', ter: 'Ter', qua: 'Qua', qui: 'Qui', sex: 'Sex', sab: 'Sáb', dom: 'Dom' };

    // XP projeção
    const projectedXP = workoutsPerMonth * 300 + 25 * 50 + 300;
    const projectedLevel = Math.max(2, Math.floor(projectedXP / 1000) + 1);

    // SVG arco de comprometimento
    const radius = 52;
    const strokeW = 10;
    const circ = 2 * Math.PI * radius;
    const arcOffset = circ - (commitPct / 100) * circ;

    return (
      <>
        <ScrollView style={s.body} contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={{ alignItems: 'center', marginTop: 16, marginBottom: 20 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.greenLight, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <CheckIcon size={34} color={COLORS.bg}  weight="bold" />
            </View>
            <Text style={[s.heroTitle, { textAlign: 'center', fontSize: 26, lineHeight: 33, marginBottom: 12 }]}>
              {answers.name ? `${answers.name}, ` : ''}seu plano está pronto!
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#161625', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 99 }}>
              <Text style={{ fontSize: 15, color: goalColor, fontWeight: '800' }}>
                {actionLabel}{diff > 0 ? ` ${diff} kg` : ''}
              </Text>
              {goal !== 'maintain' && (
                <>
                  <Text style={{ color: '#2A2A4A', fontSize: 18 }}>|</Text>
                  <ClockIcon size={14} color={COLORS.gray}  weight="regular" />
                  <Text style={{ fontSize: 14, color: COLORS.gray, fontWeight: '600' }}>{timelineLabel}</Text>
                </>
              )}
            </View>
          </View>

          {/* COMPROMETIMENTO */}
          <LinearGradient colors={['#1E0A4A', '#12122A']} style={pl.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <BarbellIcon size={15} color={COLORS.white} weight="fill" />
              <Text style={pl.cardTitle}>Nível de Comprometimento</Text>
            </View>
            <Text style={pl.cardSub}>Calculado pela sua meta, histórico e frequência</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 18 }}>
              <View style={{ alignItems: 'center', justifyContent: 'center', width: 124, height: 124, position: 'relative' }}>
                <Svg width={124} height={124}>
                  <Circle cx={62} cy={62} r={radius} stroke="#1E1E3A" strokeWidth={strokeW} fill="none" />
                  <Circle
                    cx={62} cy={62} r={radius}
                    stroke={commitColor}
                    strokeWidth={strokeW}
                    fill="none"
                    strokeDasharray={circ}
                    strokeDashoffset={arcOffset}
                    strokeLinecap="round"
                    rotation="-90"
                    origin="62, 62"
                  />
                </Svg>
                <View style={{ position: 'absolute', alignItems: 'center' }}>
                  <Text style={{ fontSize: 28, fontWeight: '800', color: COLORS.white }}>{commitPct}%</Text>
                  <Text style={{ fontSize: 10, color: COLORS.gray, fontWeight: '600' }}>necessário</Text>
                </View>
              </View>
              <View style={{ flex: 1, gap: 10 }}>
                <View style={{ backgroundColor: '#0D0D20', borderRadius: 12, padding: 12 }}>
                  <Text style={{ color: COLORS.gray, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>Seu perfil</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
                    <CommitTierIcon size={16} color={commitColor} weight="fill" />
                    <Text style={{ color: commitColor, fontSize: 18, fontWeight: '800' }}>{commitTier}</Text>
                  </View>
                </View>
                <Text style={{ color: COLORS.gray, fontSize: 12, lineHeight: 18 }}>
                  Para alcançar <Text style={{ color: COLORS.white, fontWeight: '700' }}>{goal !== 'maintain' ? `${targetWeight} kg` : 'seu objetivo'}</Text> em <Text style={{ color: COLORS.purpleLight, fontWeight: '700' }}>{timelineLabel}</Text>, esse é o comprometimento mínimo.
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* STREAK 🔥 - principal */}
          <LinearGradient colors={['#1A0A00', '#16131A']} style={pl.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <FireIcon size={28} color="#F97316" weight="fill" />
              <View>
                <Text style={pl.cardTitle}>Streak — o coração do FitQuest</Text>
                <Text style={pl.cardSub}>Consistência bate intensidade, sempre</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 16 }}>
              <View style={[pl.metaBox, { borderColor: COLORS.orange }]}>
                <Text style={{ fontSize: 26, fontWeight: '800', color: COLORS.orange }}>{workoutsPerMonth}</Text>
                <Text style={pl.metaLbl}>dias/mês</Text>
              </View>
              <View style={pl.metaBox}>
                <Text style={{ fontSize: 26, fontWeight: '800', color: COLORS.white }}>{workoutsPerWeek}×</Text>
                <Text style={pl.metaLbl}>por semana</Text>
              </View>
              <View style={[pl.metaBox, { borderColor: COLORS.purpleLight }]}>
                <Text style={{ fontSize: 22, fontWeight: '800', color: COLORS.purpleLight }}>1+</Text>
                <Text style={pl.metaLbl}>desafio/sem</Text>
              </View>
            </View>

            <Text style={{ color: COLORS.gray, fontSize: 12, fontWeight: '600', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Seus dias de treino:</Text>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              {allDays.map(d => {
                const active = selectedDays.includes(d);
                return (
                  <View key={d} style={[pl.dayDot, active && pl.dayDotActive]}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: active ? COLORS.white : COLORS.gray }}>{dayLabels[d]}</Text>
                    {active && <FireIcon size={9} color="#F97316" weight="fill" />}
                  </View>
                );
              })}
            </View>

            <View style={[pl.infoBox, { marginTop: 14, borderLeftWidth: 3, borderLeftColor: COLORS.orange }]}>
              <Text style={pl.infoText}>
                Não precisa ser perfeito. <Text style={{ color: COLORS.white, fontWeight: '700' }}>Precisa ser consistente.</Text> Mesmo 20 minutos contam. A sequência é o que transforma treino em hábito.
              </Text>
            </View>
          </LinearGradient>

          {/* NUTRIÇÃO DIÁRIA */}
          <View style={pl.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <ForkKnifeIcon size={15} color={COLORS.white} weight="fill" />
              <Text style={pl.cardTitle}>Nutrição Diária</Text>
            </View>
            <Text style={pl.cardSub}>Calculado pelo seu perfil, idade e nível de atividade</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14, justifyContent: 'space-between' }}>
              {[
                { label: 'Calorias', val: `${calories}`, color: COLORS.white, pct: 0.75 },
                { label: 'Proteína', val: `${proteinG}g`, color: '#FF6B6B', pct: 0.8 },
                { label: 'Carboidratos', val: `${carbsG}g`, color: COLORS.orange, pct: 0.6 },
                { label: 'Gorduras', val: `${fatG}g`, color: COLORS.blue, pct: 0.5 },
              ].map(m => {
                const r = 30; const sw = 5;
                const c = 2 * Math.PI * r;
                const off = c - m.pct * c;
                return (
                  <View key={m.label} style={{ width: '48%', backgroundColor: '#0D0D20', borderRadius: 16, padding: 14, alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.gray, marginBottom: 8, textTransform: 'capitalize' }}>{m.label}</Text>
                    <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center', width: 70, height: 70 }}>
                      <Svg width={70} height={70}>
                        <Circle cx={35} cy={35} r={r} stroke="#1E1E3A" strokeWidth={sw} fill="none" />
                        <Circle cx={35} cy={35} r={r} stroke={m.color} strokeWidth={sw} fill="none"
                          strokeDasharray={c} strokeDashoffset={off}
                          strokeLinecap="round" rotation="-90" origin="35, 35" />
                      </Svg>
                      <Text style={{ position: 'absolute', fontSize: 13, fontWeight: '800', color: COLORS.white }}>{m.val}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
            <View style={[pl.infoBox, { marginTop: 10 }]}>
              <DropIcon size={16} color={COLORS.blue}  weight="fill" />
              <Text style={pl.infoText}>
                Água: <Text style={{ color: COLORS.white, fontWeight: '700' }}>{waterL}L/dia</Text> — hidratação essencial para acelerar resultados
              </Text>
            </View>
          </View>

          {/* ROTINA SEMANAL */}
          <View style={pl.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <CalendarIcon size={15} color={COLORS.white} weight="fill" />
              <Text style={pl.cardTitle}>O Que Fazer Cada Semana</Text>
            </View>
            <View style={{ gap: 10, marginTop: 14 }}>
              {[
                {
                  Icon: BarbellIcon,
                  label: `${workoutsPerWeek} treino${workoutsPerWeek > 1 ? 's' : ''} no app`,
                  desc: 'Use os treinos do FitQuest — completos e prontos para você',
                  badge: `+${workoutsPerWeek * 300} XP/sem`,
                  badgeColor: COLORS.gold,
                },
                {
                  Icon: WavesIcon,
                  label: 'Complete desafios diários',
                  desc: 'Treino, hidratação ou caminhada — pelo menos 1 por dia',
                  badge: '+50 XP/dia',
                  badgeColor: COLORS.purpleLight,
                },
                {
                  Icon: SwordIcon,
                  label: 'Enfrente o Boss Semanal',
                  desc: 'Desafio épico toda semana. Não perca.',
                  badge: 'XP extra',
                  badgeColor: COLORS.orange,
                },
                {
                  Icon: TrophyIcon,
                  label: 'Cheque o Ranking',
                  desc: 'Veja seu streak e XP versus amigos e rivais',
                  badge: 'Motivação',
                  badgeColor: COLORS.greenLight,
                },
              ].map((item, i) => (
                <View key={i} style={pl.featureRow}>
                  <View style={{ width: 28, alignItems: 'center' }}>
                    <item.Icon size={20} color={COLORS.white} weight="fill" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ color: COLORS.white, fontSize: 13, fontWeight: '700', flex: 1 }}>{item.label}</Text>
                      <View style={{ backgroundColor: '#0D0D20', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, marginLeft: 8 }}>
                        <Text style={{ color: item.badgeColor, fontSize: 11, fontWeight: '700' }}>{item.badge}</Text>
                      </View>
                    </View>
                    <Text style={{ color: COLORS.gray, fontSize: 12, marginTop: 2, lineHeight: 17 }}>{item.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* PROJEÇÃO XP */}
          <View style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <TrendUpIcon size={15} color={COLORS.white} weight="fill" />
              <Text style={pl.cardTitle}>Projeção de 30 Dias</Text>
            </View>
            <LinearGradient colors={['#2D1B69', '#12122A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 20, padding: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 14 }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ color: COLORS.gray, fontSize: 11, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>XP total</Text>
                  <Text style={{ color: COLORS.gold, fontSize: 26, fontWeight: '800', letterSpacing: -1 }}>~{projectedXP.toLocaleString('pt-BR')}</Text>
                </View>
                <View style={{ width: 1, backgroundColor: '#2A2A4A' }} />
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ color: COLORS.gray, fontSize: 11, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Nível proj.</Text>
                  <Text style={{ color: COLORS.purpleLight, fontSize: 26, fontWeight: '800' }}>Lv {projectedLevel}</Text>
                </View>
                <View style={{ width: 1, backgroundColor: '#2A2A4A' }} />
                <View style={{ alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 4 }}>
                    <FireIcon size={10} color={COLORS.gray} weight="fill" />
                    <Text style={{ color: COLORS.gray, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>Streak</Text>
                  </View>
                  <Text style={{ color: COLORS.orange, fontSize: 26, fontWeight: '800' }}>{workoutsPerMonth}d</Text>
                </View>
              </View>
              <Text style={{ color: '#4A4A7A', fontSize: 11, textAlign: 'center' }}>
                {workoutsPerMonth} treinos × 300 XP + desafios diários + bônus de streak
              </Text>
            </LinearGradient>
          </View>

        </ScrollView>
        <View style={{ paddingHorizontal: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 }}>
            <CheckIcon size={16} color={COLORS.gray}  weight="bold" />
            <Text style={{ color: COLORS.gray, fontSize: 14, fontWeight: '600' }}>Você não paga nada agora</Text>
          </View>
          <Btn label="Experimente grátis" />
        </View>
      </>
    );
  };

  // Tela 24: Realmente comprometida?
  const Step23 = () => (
    <View style={s.body}>
       <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <Text style={[s.heroTitle, {textAlign: 'center', fontSize: 36}]}>Você está realmente comprometido(a)?</Text>
          <Text style={[s.heroSub, {textAlign: 'center', marginTop: 24}]}>Nosso método funciona, mas exige que você siga o plano. Não há atalhos.</Text>
       </View>
       <View style={{width: '100%'}}>
         <Btn label="Eu me comprometo 100%" />
         <Btn label="Ainda não tenho certeza" secondary />
       </View>
    </View>
  );

  // Tela 25: Prova social
  const Step24 = () => (
    <>
      <ScrollView style={s.body} contentContainerStyle={s.bodyPad} showsVerticalScrollIndicator={false}>
        <View style={{paddingHorizontal: 24}}>
          <Text style={[s.heroTitle, {marginTop: 10, fontSize: 34}]}>Junte-se a uma comunidade de pessoas como você</Text>
        </View>
        
        <View style={s.communityStatsWrap}>
          <View style={s.communityStatCol}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
               <Text style={s.communityStatMain}>4.8</Text>
               <StarIcon size={26} color={COLORS.goldLight}  weight="fill" />
            </View>
            <Text style={s.communityStatSub}>avaliação média</Text>
            <Text style={s.communityStatSubMin}>250K+ avaliações do app</Text>
          </View>
          
          <View style={[s.communityStatCol, {alignItems: 'flex-end'}]}>
             <View style={s.userAvatarsWrapSm}>
               {[1,2,3].map((_, i) => (
                 <View key={i} style={[s.avatarCircleSm, { zIndex: 3-i, marginLeft: i === 0 ? 0 : -12 }]} />
               ))}
             </View>
             <Text style={[s.communityStatSubMin, {marginTop: 12}]}>Usuários do CapiFit</Text>
          </View>
        </View>

        <View style={s.reviewList}>
           <View style={s.reviewCard}>
              <View style={s.reviewHeader}>
                 <View style={s.reviewAvatar}><PersonIcon size={20} color={COLORS.gray}  weight="fill" /></View>
                 <Text style={s.reviewName}>Jake Sullivan</Text>
                 <View style={{flex: 1}} />
                 <Text style={{color: COLORS.goldLight, fontSize: 12, letterSpacing: 2}}>★★★★★</Text>
              </View>
              <Text style={s.reviewText}>Perdi 7 kg em 2 meses! Eu estava prestes a tentar outras coisas, mas decidi tentar este app e funcionou :)</Text>
           </View>

           <View style={s.reviewCard}>
              <View style={s.reviewHeader}>
                 <View style={s.reviewAvatar}><PersonIcon size={20} color={COLORS.gray}  weight="fill" /></View>
                 <Text style={s.reviewName}>Benny Marcs</Text>
                 <View style={{flex: 1}} />
                 <Text style={{color: COLORS.goldLight, fontSize: 12, letterSpacing: 2}}>★★★★★</Text>
              </View>
              <Text style={s.reviewText}>O tempo que economizei por automatizar minha rotina foi inestimável. Tempo é dinheiro, e com certeza valeu a pena.</Text>
           </View>

           <View style={s.reviewCard}>
              <View style={s.reviewHeader}>
                 <View style={s.reviewAvatar}><PersonIcon size={20} color={COLORS.gray}  weight="fill" /></View>
                 <Text style={s.reviewName}>Karel Carter</Text>
                 <View style={{flex: 1}} />
                 <Text style={{color: COLORS.goldLight, fontSize: 12, letterSpacing: 2}}>★★★★★</Text>
              </View>
              <Text style={s.reviewText}>Já estou muito feliz com este app e usei por apenas um dia. Fiquei realmente impressionado.</Text>
           </View>
        </View>
        <View style={{height: 24}}/>
      </ScrollView>
      <Btn />
    </>
  );

  const STEPS = [
    Step0, Step1, Step2, Step3, StepAge, StepGoalLockInfo, Step4, Step5, Step6, Step7,
    Step8, Step9, Step10, Step11, Step12, Step13, Step14, Step15,
    Step16, Step24, Step17, null, null, null, Step23, Step21,
    Step22, StepPlan
  ];
  const StepComponent = STEPS[step];

  const renderStep = () => {
    if (step === 21) {
      return (
        <NameInputScreen
          value={answers.name || ''}
          onChange={(v) => setAnswers(p => ({ ...p, name: v }))}
          onNext={goNext}
          disabled={!answers.name || answers.name.length < 2}
        />
      );
    }
    if (step === 22) {
      return (
        <EmailInputScreen
          value={answers.email || ''}
          onChange={(v) => setAnswers(p => ({ ...p, email: v }))}
          onNext={goNext}
          disabled={!answers.email || !answers.email.includes('@')}
        />
      );
    }
    if (step === 23) {
      return (
        <PhoneInputScreen
          value={answers.phone || ''}
          onChange={(v) => setAnswers(p => ({ ...p, phone: v }))}
          onNext={goNext}
        />
      );
    }
    return StepComponent ? StepComponent() : null;
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <Header />
      <Animated.View style={[s.screen, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}>
        {renderStep()}
      </Animated.View>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: COLORS.bg },
  screen: { flex: 1 },
  body:   { flex: 1, paddingHorizontal: 24, paddingTop: 16 },
  bodyPad: { paddingHorizontal: 0 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 16 },
  backBtn: { padding: 4 },
  progressTrack: { flex: 1, height: 4, backgroundColor: '#1E1E3A', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.purple, borderRadius: 2 },

  // Typography
  questionHeaderWrap: { marginBottom: 32, marginTop: 10 },
  heroTitle: { fontSize: 34, fontWeight: '800', color: COLORS.white, lineHeight: 40, marginBottom: 8, letterSpacing: -1 },
  heroSub: { fontSize: 17, color: COLORS.gray, lineHeight: 24, marginBottom: 32, fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#1E1E3A', marginVertical: 24 },

  // Footer & Buttons
  footer: { paddingBottom: 16, paddingTop: 8, backgroundColor: COLORS.bg },
  btn: { borderRadius: 99, height: 56, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.purple },
  btnDisabled: { backgroundColor: '#2A2A4A' },
  btnText: { color: COLORS.white, fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  ghostBtnText: { color: COLORS.gray, fontSize: 15, fontWeight: '600', letterSpacing: 0.5 },

  // Form Cards
  cardList: { gap: 12 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161625', borderRadius: 16, paddingVertical: 18, paddingHorizontal: 20, minHeight: 76 },
  cardSel: { backgroundColor: COLORS.purple },
  iconEmoji: { fontSize: 24, marginRight: 16 },
  cardTextWrap: { flex: 1, justifyContent: 'center' },
  cardLabel: { fontSize: 16, fontWeight: '600', color: COLORS.white },
  cardLabelSel: { color: COLORS.white, fontWeight: '700' },
  cardDesc: { fontSize: 13, color: COLORS.gray, marginTop: 4 },
  cardDescSel: { color: 'rgba(255,255,255,0.8)' },
  
  radioWrap: { marginRight: 16, alignItems: 'center', justifyContent: 'center' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#2A2A4A' },
  radioSel: { width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.purple, borderWidth: 2, borderColor: COLORS.purple, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.white },

  // Input Field
  textInput: { backgroundColor: '#161625', borderRadius: 16, paddingVertical: 20, paddingHorizontal: 24, fontSize: 20, color: COLORS.white, fontWeight: '700' },

  // Screens UI
  appImageWrap: { height: 400, width: '100%', position: 'relative', overflow: 'hidden' },
  appImage: { width: '100%', height: '100%' },
  appImageFade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 150 },
  testimonialCard: { backgroundColor: '#161625', borderRadius: 16, padding: 20, marginBottom: 12 },
  stars: { fontSize: 14, color: COLORS.goldLight, marginBottom: 8, letterSpacing: 2 },
  testimonialText: { fontSize: 15, color: COLORS.white, lineHeight: 22, fontWeight: '500' },
  testimonialAuthor: { fontSize: 13, fontWeight: '600', color: COLORS.gray, marginTop: 12 },

  // Features (Tela 3)
  featureList: { gap: 16 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 18, backgroundColor: '#161625', borderRadius: 16, paddingVertical: 18, paddingHorizontal: 20 },
  featureIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#202035', alignItems: 'center', justifyContent: 'center' },
  featureEmoji: { fontSize: 24 },
  featureText: { flex: 1 },
  featureLabel: { fontSize: 16, fontWeight: '700', color: COLORS.white, letterSpacing: -0.2 },
  featureDesc: { fontSize: 14, color: COLORS.gray, marginTop: 4, fontWeight: '400' },

  // Pickers (Tela 4, 6)
  pickerRow: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#161625', borderRadius: 20, paddingVertical: 16 },
  pickerCol: { flex: 1, alignItems: 'center' },
  pickerColTitle: { fontSize: 14, fontWeight: '600', color: COLORS.gray, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
  pickerSeparator: { width: 1, backgroundColor: '#2A2A4A', alignSelf: 'stretch', marginVertical: 8 },

  // Target Weight (Tela 6)
  currentWeightBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#161625', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 16, marginTop: 28 },
  currentWeightLabel: { fontSize: 14, color: COLORS.gray, fontWeight: '500' },
  currentWeightVal: { fontSize: 16, fontWeight: '800', color: COLORS.white },

  // Graph (Tela 7)
  graphCard: { backgroundColor: '#161625', borderRadius: 20, padding: 24, marginTop: 10 },
  graphCardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.white, marginBottom: 24, textAlign: 'center' },
  barGraphWrap: { flexDirection: 'row', height: 200, justifyContent: 'space-around', alignItems: 'flex-end', paddingTop: 30 },
  barCol: { alignItems: 'center', justifyContent: 'flex-end', flex: 1, position: 'relative' },
  bar: { width: 60, borderRadius: 8, marginBottom: 10 },
  barLabel: { fontSize: 14, color: COLORS.gray, fontWeight: '600' },
  badgeFloat: { position: 'absolute', top: -30, backgroundColor: COLORS.bg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  badgeFloatText: { color: COLORS.purpleLight, fontSize: 12, fontWeight: '800' },

  // Icons / Circle
  circleIcon: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#161625', alignItems: 'center', justifyContent: 'center' },
  bellIconWrap: { width: 120, height: 120, borderRadius: 60, backgroundColor: COLORS.purple, alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.purple, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 20 },

  // Pills (Tela 12)
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  pillBtn: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 99, backgroundColor: '#161625', borderWidth: 2, borderColor: '#161625' },
  pillBtnSel: { backgroundColor: COLORS.purple, borderColor: COLORS.purpleLight },
  pillText: { fontSize: 16, fontWeight: '600', color: COLORS.gray },
  pillTextSel: { color: COLORS.white, fontWeight: '700' },

  // XP / Reward (Tela 17)
  xpBubble: { flexDirection: 'row', alignItems: 'baseline', gap: 8, backgroundColor: '#161625', borderRadius: 16, paddingHorizontal: 24, paddingVertical: 16, marginTop: 20 },
  xpNum: { fontSize: 40, fontWeight: '800', color: COLORS.white },
  xpLabel: { fontSize: 18, fontWeight: '700', color: COLORS.gray },

  // Loading (Tela 23)
  loadingMsg: { fontSize: 16, color: COLORS.gray, fontWeight: '500', marginTop: 20 },
  loadingTrack: { width: '80%', height: 6, backgroundColor: '#1E1E3A', borderRadius: 3, overflow: 'hidden' },
  loadingBar: { height: '100%', borderRadius: 3, backgroundColor: COLORS.purpleLight },

  // Plan Card
  planCard: { width: '48%', backgroundColor: '#1E1E3A', borderRadius: 16, padding: 16, alignItems: 'center', position: 'relative' },
  planCardTitle: { fontSize: 14, fontWeight: '600', color: COLORS.gray, textTransform: 'capitalize' },
  planEditIcon: { position: 'absolute', bottom: 16, right: 16, width: 24, height: 24, borderRadius: 12, backgroundColor: '#2A2A4A', alignItems: 'center', justifyContent: 'center' },

  // Social Proof (Tela 25)
  socialBigCard: { backgroundColor: '#161625', padding: 32, borderRadius: 20, alignItems: 'center', marginTop: 20 },
  socialBigNum: { fontSize: 56, fontWeight: '800', color: COLORS.white, letterSpacing: -2 },
  socialBigLbl: { fontSize: 16, color: COLORS.gray, textAlign: 'center', marginTop: 8, fontWeight: '500', lineHeight: 24 },
  userAvatarsWrap: { flexDirection: 'row', justifyContent: 'center', marginTop: 30 },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#2A2A4A', borderWidth: 2, borderColor: COLORS.bg },

  // Product Showcase (Tela 26)
  productShowcase: { width: '80%', height: 350, backgroundColor: '#161625', borderRadius: 24, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', padding: 20 },
  productImageSm: { width: '100%', height: '100%' },

  // Paywall (Tela 28) Timeline & Plans

  // Plan Card
  planCard: { width: '48%', backgroundColor: '#1E1E3A', borderRadius: 16, padding: 16, alignItems: 'center', position: 'relative' },
  planCardTitle: { fontSize: 14, fontWeight: '600', color: COLORS.gray, textTransform: 'capitalize' },
  planEditIcon: { position: 'absolute', bottom: 16, right: 16, width: 24, height: 24, borderRadius: 12, backgroundColor: '#2A2A4A', alignItems: 'center', justifyContent: 'center' },

  // Community (Tela 25)
  communityStatsWrap: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, marginVertical: 30 },
  communityStatCol: { flex: 1 },
  communityStatMain: { fontSize: 40, fontWeight: '800', color: COLORS.white },
  communityStatSub: { fontSize: 14, color: COLORS.gray, fontWeight: '600', marginTop: 4 },
  communityStatSubMin: { fontSize: 12, color: '#64748B', marginTop: 4 },
  userAvatarsWrapSm: { flexDirection: 'row' },
  avatarCircleSm: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#2A2A4A', borderWidth: 2, borderColor: COLORS.bg },
  reviewList: { paddingHorizontal: 24, gap: 12 },
  reviewCard: { backgroundColor: '#161625', padding: 20, borderRadius: 16 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  reviewAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2A2A4A', alignItems: 'center', justifyContent: 'center' },
  reviewName: { fontSize: 15, fontWeight: '700', color: COLORS.white },
  reviewText: { fontSize: 14, color: COLORS.gray, lineHeight: 22 },
});

// ─── Plan Screen Styles (pl) ─────────────────────────────────────────────────
const pl = StyleSheet.create({
  card: { backgroundColor: '#161625', borderRadius: 20, padding: 20, marginBottom: 14 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: COLORS.white, letterSpacing: -0.3 },
  cardSub: { fontSize: 13, color: COLORS.gray, marginTop: 4, fontWeight: '500' },
  metaBox: { flex: 1, backgroundColor: '#0D0D20', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#2A2A4A' },
  metaLbl: { fontSize: 10, color: COLORS.gray, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 4 },
  metaVal: { fontSize: 18, fontWeight: '800', color: COLORS.white, marginTop: 4 },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#0D0D20', borderRadius: 12, padding: 12, marginTop: 12 },
  infoText: { flex: 1, fontSize: 13, color: COLORS.gray, lineHeight: 19 },
  macroBox: { flex: 1, minWidth: '45%', backgroundColor: '#0D0D20', borderRadius: 14, padding: 14, alignItems: 'center' },
  macroVal: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  macroLbl: { fontSize: 11, color: COLORS.gray, fontWeight: '600', marginTop: 3, textTransform: 'capitalize' },
  freqCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#2D1B69', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.purple },
  chip: { backgroundColor: '#2D1B69', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#0D0D20', borderRadius: 12, padding: 12 },

  // Hero Banner
  heroBanner: { borderRadius: 24, padding: 24, marginBottom: 14, overflow: 'hidden', position: 'relative' },
  heroGlowOrb: { position: 'absolute', top: -70, right: -70, width: 240, height: 240, borderRadius: 120, backgroundColor: COLORS.purple, opacity: 0.18 },
  heroGlowOrb2: { position: 'absolute', bottom: -50, left: -50, width: 180, height: 180, borderRadius: 90, backgroundColor: COLORS.purpleLight, opacity: 0.09 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, marginBottom: 18 },
  heroBadgeText: { color: 'white', fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  heroTitle: { fontSize: 34, fontWeight: '900', color: COLORS.white, letterSpacing: -1, lineHeight: 40 },
  heroPill: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 99, alignSelf: 'flex-start', marginTop: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  heroPillGoal: { fontSize: 15, fontWeight: '800' },
  heroPillSep: { width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.2)' },
  heroPillTime: { fontSize: 14, color: COLORS.gray, fontWeight: '600' },

  // Commitment
  tierPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.35)', paddingHorizontal: 22, paddingVertical: 11, borderRadius: 99, marginTop: 18, borderWidth: 1 },
  commitDesc: { color: COLORS.gray, fontSize: 13, lineHeight: 20, marginTop: 16, textAlign: 'center', paddingHorizontal: 8 },

  // Section label
  sectionLabel: { color: COLORS.gray, fontSize: 11, fontWeight: '700', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },

  // Day dots
  dayDot: { paddingVertical: 6, paddingHorizontal: 8, borderRadius: 10, backgroundColor: '#0D0D20', alignItems: 'center', borderWidth: 1, borderColor: '#1E1E3A' },
  dayDotActive: { backgroundColor: '#2A1200', borderColor: COLORS.orange },

  // Nutrition
  calorieBox: { borderRadius: 16, padding: 18, marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  calorieLabel: { color: COLORS.gray, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  calorieVal: { color: COLORS.white, fontSize: 38, fontWeight: '900', letterSpacing: -2 },
  calorieIcon: { width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  macroCard: { flex: 1, backgroundColor: '#0D0D20', borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  macroVal2: { fontSize: 19, fontWeight: '900', marginTop: 6, letterSpacing: -0.5 },
  macroLbl2: { color: COLORS.gray, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginTop: 3, letterSpacing: 0.4 },
});
