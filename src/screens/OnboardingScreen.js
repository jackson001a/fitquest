import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Animated, TextInput, Dimensions, KeyboardAvoidingView,
  Platform, FlatList, Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../theme';

const { width: SW, height: SH } = Dimensions.get('window');
const TOTAL_STEPS = 28;

// ─── Data ────────────────────────────────────────────────────────────────────

const GENDER_OPTIONS = [
  { id: 'male',   label: 'Masculino' },
  { id: 'female', label: 'Feminino' },
  { id: 'other',  label: 'Outro' },
];

const GOAL_OPTIONS = [
  { id: 'lose',     icon: '🔥', label: 'Emagrecer' },
  { id: 'gain',     icon: '💪', label: 'Ganhar peso' },
  { id: 'maintain', icon: '⚖️', label: 'Manter o peso' },
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
  { id: '1-2', label: '1 a 2 treinos' },
  { id: '3-4', label: '3 a 4 treinos' },
  { id: '5+', label: '5+ treinos' },
];

const DAY_PILLS = [
  { id: 'seg', label: 'Seg' }, { id: 'ter', label: 'Ter' },
  { id: 'qua', label: 'Qua' }, { id: 'qui', label: 'Qui' },
  { id: 'sex', label: 'Sex' }, { id: 'sab', label: 'Sáb' },
  { id: 'dom', label: 'Dom' }
];

const TIME_OPTIONS = [
  { id: 'morning',   icon: '☀️', label: 'Manhã' },
  { id: 'afternoon', icon: '🌤️', label: 'Tarde' },
  { id: 'night',     icon: '🌙', label: 'Noite' },
  { id: 'varies',    icon: '🔄', label: 'Varia muito' },
];

const ACHIEVEMENT_OPTIONS = [
  { id: 'energy', label: 'Ter mais disposição diária' },
  { id: 'aesthetics', label: 'Melhorar o corpo' },
  { id: 'health', label: 'Mais saúde e longevidade' },
  { id: 'mind', label: 'Saúde mental e alívio do stress' },
];

const FEATURES = [
  { icon: '🔥', label: 'Rotina à prova de falhas',  desc: 'Planos que se adaptam ao seu dia' },
  { icon: '🧠', label: 'Psicologia do hábito',   desc: 'Técnicas de gamificação para viciar em treinar' },
  { icon: '📈', label: 'Resultados visíveis',        desc: 'Acompanhe métricas de evolução real' },
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

const ITEM_H = 44;
const VISIBLE = 5;

function DrumPicker({ data, unit, selectedIndex, onSelect }) {
  const flatRef = useRef(null);
  const [idx, setIdx] = useState(selectedIndex);

  useEffect(() => {
    setTimeout(() => {
      flatRef.current?.scrollToIndex({ index: selectedIndex, animated: false });
    }, 80);
  }, []);

  const onScroll = (e) => {
    const offset = e.nativeEvent.contentOffset.y;
    const newIdx = Math.round(offset / ITEM_H);
    const clamped = Math.max(0, Math.min(newIdx, data.length - 1));
    if (clamped !== idx) { setIdx(clamped); onSelect(data[clamped]); }
  };

  const pad = (VISIBLE - 1) / 2;
  const paddedData = [
    ...Array(pad).fill(''),
    ...data,
    ...Array(pad).fill(''),
  ];

  return (
    <View style={drum.wrap}>
      <View style={drum.highlight} pointerEvents="none" />
      <FlatList
        ref={flatRef}
        data={paddedData}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item, index }) => {
          const realIdx = index - pad;
          const dist = Math.abs(realIdx - idx);
          const op = realIdx < 0 || realIdx >= data.length ? 0 :
            dist === 0 ? 1 : dist === 1 ? 0.3 : 0.1;
          const scale = dist === 0 ? 1.05 : 0.9;
          const isActive = realIdx === idx;
          return (
            <View style={[drum.item, isActive && drum.itemActive]}>
              <Text style={[drum.text, { opacity: op, transform: [{ scale }] },
                isActive && drum.textActive]}>
                {item}{item !== '' ? (isActive ? ` ${unit}` : '') : ''}
              </Text>
            </View>
          );
        }}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        onMomentumScrollEnd={onScroll}
        onScrollEndDrag={onScroll}
        getItemLayout={(_, index) => ({ length: ITEM_H, offset: ITEM_H * index, index })}
        style={{ height: ITEM_H * VISIBLE }}
        contentContainerStyle={{ paddingVertical: 0 }}
      />
    </View>
  );
}

const drum = StyleSheet.create({
  wrap: { flex: 1, overflow: 'hidden', position: 'relative', alignItems: 'center', width: '100%' },
  highlight: { position: 'absolute', zIndex: -1, top: ITEM_H * 2, height: ITEM_H, width: '90%', backgroundColor: '#1E1E3A', borderRadius: 14 },
  item: { height: ITEM_H, alignItems: 'center', justifyContent: 'center' },
  itemActive: {},
  text: { fontSize: 20, fontWeight: '500', color: COLORS.white },
  textActive: { fontSize: 24, fontWeight: '700', color: COLORS.purpleLight },
});

// ─── Main Component ──────────────────────────────────────────────────────────

export default function OnboardingScreen({ navigation }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({ workoutDays: [] });
  
  const [heightIdx, setHeightIdx] = useState(30); // 170cm
  const [weightIdx, setWeightIdx] = useState(30); // 70kg
  const [kilosIdx, setKilosIdx] = useState(4); // 5kg

  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [xpCount, setXpCount] = useState(0);

  const HEIGHTS = Array.from({ length: 81 }, (_, i) => String(140 + i)); // 140 to 220
  const WEIGHTS = Array.from({ length: 111 }, (_, i) => String(40 + i)); // 40 to 150
  const KILOS = Array.from({ length: 40 }, (_, i) => String(1 + i)); // 1 to 40

  const fadeAnim      = useRef(new Animated.Value(1)).current;
  const slideAnim     = useRef(new Animated.Value(0)).current;
  const loadingProg   = useRef(new Animated.Value(0)).current;
  const featureAnims  = useRef(FEATURES.map(() => new Animated.Value(0))).current;
  const rewardScale   = useRef(new Animated.Value(0)).current;

  // ── Transition ──
  const transition = useCallback((dir, fn) => {
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

  const goNext = useCallback(() => {
    if (step + 1 >= TOTAL_STEPS) {
      navigation.replace('Main');
      return;
    }
    
    let nextStep = step + 1;
    // Condition: Skip "How many kilos" (Step 5) if goal is "maintain"
    if (step === 4 && answers.goal === 'maintain') {
      nextStep = 6;
    }

    transition(1, () => setStep(nextStep));
  }, [transition, navigation, step, answers.goal]);

  const goBack = useCallback(() => {
    if (step === 0) return;

    let prevStep = step - 1;
    // Condition: Skip back over "How many kilos" if goal is "maintain"
    if (step === 6 && answers.goal === 'maintain') {
      prevStep = 4;
    }

    transition(-1, () => setStep(prevStep));
  }, [step, transition, answers.goal]);

  const select = useCallback((key, value, autoAdvance = true) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
    if (autoAdvance) {
      setTimeout(goNext, 350);
    }
  }, [goNext]);

  const toggleDay = (id) => {
    setAnswers(prev => {
      const days = prev.workoutDays || [];
      if (days.includes(id)) return { ...prev, workoutDays: days.filter(d => d !== id) };
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
    // Tela 17 (Index 16) - Reward XP
    if (step !== 16) return;
    setXpCount(0);
    rewardScale.setValue(0);
    Animated.spring(rewardScale, { toValue: 1, tension: 70, friction: 7, useNativeDriver: true }).start();
    let v = 0;
    const iv = setInterval(() => { v += 10; setXpCount(Math.min(v, 250)); if (v >= 250) clearInterval(iv); }, 30);
    return () => clearInterval(iv);
  }, [step]);

  useEffect(() => {
    // Tela 23 (Index 22) - Loading Plan
    if (step !== 22) return;
    loadingProg.setValue(0);
    setLoadingMsgIdx(0);
    Animated.timing(loadingProg, { toValue: 1, duration: 4000, useNativeDriver: false }).start();
    let i = 0;
    const iv = setInterval(() => { i++; setLoadingMsgIdx(Math.min(i, LOADING_MSGS.length - 1)); }, 800);
    const t = setTimeout(goNext, 4500);
    return () => { clearInterval(iv); clearTimeout(t); };
  }, [step]);

  // ─── UI Atoms ────────────────────────────────────────────────────────────────
  const Header = () => {
    const pct = Math.round(((step + 1) / TOTAL_STEPS) * 100);
    return (
      <View style={s.header}>
        <TouchableOpacity style={[s.backBtn, step === 0 && { opacity: 0 }]} onPress={goBack} disabled={step === 0} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
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
        {showIcon && item.icon && <Text style={s.iconEmoji}>{item.icon}</Text>}
        <View style={s.cardTextWrap}>
          <Text style={[s.cardLabel, sel && s.cardLabelSel]}>{item.label}</Text>
          {item.desc && <Text style={[s.cardDesc, sel && s.cardDescSel]}>{item.desc}</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  const InputField = ({ valueKey, placeholder, keyboardType = 'default', autoCapitalize = 'none' }) => (
    <TextInput
      style={s.textInput}
      value={answers[valueKey] || ''}
      onChangeText={(v) => setAnswers(p => ({ ...p, [valueKey]: v }))}
      placeholder={placeholder}
      placeholderTextColor={COLORS.grayDark}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      returnKeyType="done"
      onSubmitEditing={goNext}
      selectionColor={COLORS.white}
    />
  );

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
      <View style={s.body}>
        <QuestionHeader text="Por que o CapiFit funciona?" subtext="A maioria dos apps são apenas listas. Nós construímos sistemas de recompensa." />
        <View style={s.featureList}>
          {FEATURES.map((f, i) => (
            <Animated.View key={i} style={[s.featureRow, { opacity: featureAnims[i], transform: [{ translateX: featureAnims[i].interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }]}>
              <View style={s.featureIcon}><Text style={s.featureEmoji}>{f.icon}</Text></View>
              <View style={s.featureText}>
                <Text style={s.featureLabel}>{f.label}</Text>
                <Text style={s.featureDesc}>{f.desc}</Text>
              </View>
            </Animated.View>
          ))}
        </View>
      </View>
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
          <View style={s.pickerCol}>
            <Text style={s.pickerColTitle}>Peso</Text>
            <DrumPicker data={WEIGHTS} unit="kg" selectedIndex={weightIdx} onSelect={(v) => { setWeightIdx(WEIGHTS.indexOf(v)); setAnswers(p => ({ ...p, weight: v })); }} />
          </View>
        </View>
      </View>
      <Btn />
    </>
  );

  // Tela 5: Objetivo principal
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

  // Tela 6: Quantos kilos? (Condicional)
  const Step5 = () => (
    <>
      <View style={s.body}>
        <QuestionHeader text={`Quantos quilos você quer ${answers.goal === 'lose' ? 'perder' : 'ganhar'}?`} />
        <View style={{flex: 1, justifyContent: 'center'}}>
           <View style={[s.pickerRow, {width: '60%', alignSelf: 'center'}]}>
              <View style={s.pickerCol}>
                <Text style={s.pickerColTitle}>Quilos</Text>
                <DrumPicker data={KILOS} unit="kg" selectedIndex={kilosIdx} onSelect={(v) => { setKilosIdx(KILOS.indexOf(v)); setAnswers(p => ({ ...p, kilos_target: v })); }} />
              </View>
           </View>
        </View>
      </View>
      <Btn />
    </>
  );

  // Tela 7: Realista / Grafico Sucesso
  const Step6 = () => (
    <>
      <View style={s.body}>
        <QuestionHeader text="Essa é uma meta realista." subtext="Com a nossa metodologia gamificada, suas chances de sucesso disparam." />
        <View style={s.graphCard}>
          <Text style={s.graphCardTitle}>Taxa de Sucesso (6 Meses)</Text>
          <View style={s.barGraphWrap}>
            <View style={s.barCol}>
               <View style={[s.bar, {height: '40%', backgroundColor: COLORS.grayDark}]}></View>
               <Text style={s.barLabel}>Sozinho</Text>
            </View>
            <View style={s.barCol}>
               <View style={s.badgeFloat}><Text style={s.badgeFloatText}>2x Maior</Text></View>
               <View style={[s.bar, {height: '90%', backgroundColor: COLORS.purple}]}></View>
               <Text style={[s.barLabel, {color: COLORS.white, fontWeight: '700'}]}>CapiFit</Text>
            </View>
          </View>
        </View>
      </View>
      <Btn />
    </>
  );

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
  const Step9 = () => (
    <View style={s.body}>
       <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <View style={s.circleIcon}><Ionicons name="shield-checkmark" size={48} color={COLORS.purpleLight} /></View>
          <Text style={[s.heroTitle, {textAlign: 'center', marginTop: 32}]}>Nós vamos te ajudar.</Text>
          <Text style={[s.heroSub, {textAlign: 'center'}]}>O CapiFit não exige motivação diária. Ele exige apenas compromisso. O sistema cuida do resto.</Text>
       </View>
       <Btn label="Vamos lá" />
    </View>
  );

  // Tela 11: Treinos por semana
  const Step10 = () => (
    <>
      <View style={s.body}>
        <QuestionHeader text="Quantos treinos por semana você pretende fazer?" />
        <View style={s.cardList}>
          {WORKOUT_FREQ_OPTIONS.map(o => <OptionCard key={o.id} item={o} answerKey="freq" />)}
        </View>
      </View>
      <Btn disabled={!answers.freq} />
    </>
  );

  // Tela 12: Quais dias?
  const Step11 = () => (
    <>
      <View style={s.body}>
        <QuestionHeader text="Quais são os dias que você vai treinar?" subtext="Isso configurará suas proteções de streak e XP semanal." />
        <View style={s.pillWrap}>
          {DAY_PILLS.map(d => {
            const isSel = (answers.workoutDays || []).includes(d.id);
            return (
              <TouchableOpacity key={d.id} onPress={() => toggleDay(d.id)} activeOpacity={0.8}
                style={[s.pillBtn, isSel && s.pillBtnSel]}>
                <Text style={[s.pillText, isSel && s.pillTextSel]}>{d.label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>
      <Btn disabled={(answers.workoutDays || []).length === 0} onPress={goNext} />
    </>
  );

  // Tela 13: Ótimos dias
  const Step12 = () => (
    <View style={s.body}>
       <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <View style={s.circleIcon}><Ionicons name="calendar-outline" size={48} color={COLORS.purpleLight} /></View>
          <Text style={[s.heroTitle, {textAlign: 'center', marginTop: 32}]}>Ótima escolha.</Text>
          <Text style={[s.heroSub, {textAlign: 'center'}]}>Esses dias foram separados e otimizados na sua grade de atividades.</Text>
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
       <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <Animated.View style={{ transform: [{ scale: rewardScale }] }}>
            <Ionicons name="medal" size={80} color={COLORS.gold} />
          </Animated.View>
          <Text style={[s.heroTitle, {textAlign: 'center', marginTop: 24, color: COLORS.goldLight}]}>Você já começou!</Text>
          <Text style={[s.heroSub, {textAlign: 'center', marginBottom: 12}]}>Apenas por planejar, você ganhou sua primeira recompensa.</Text>
          
          <View style={s.xpBubble}>
            <Text style={s.xpNum}>+{xpCount}</Text>
            <Text style={s.xpLabel}>XP Base</Text>
          </View>
       </View>
       <Btn label="Receber Recompensa" />
    </View>
  );

  // Tela 18: Lembrete Notificações
  const Step17 = () => (
    <>
      <View style={s.body}>
        <QuestionHeader text="Não perca seu streak." subtext="Ative as notificações para receber alertas de treino e recompensas." center />
        <View style={{alignItems: 'center', marginTop: 30}}>
            <View style={s.bellIconWrap}>
               <Ionicons name="notifications" size={60} color={COLORS.white} />
            </View>
        </View>
      </View>
      <View style={{paddingHorizontal: 24}}>
        <Btn label="Ativar notificações" />
        <Btn label="Pular" secondary />
      </View>
    </>
  );

  // Tela 19: Loguin Nome
  const Step18 = () => (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={s.body}>
        <QuestionHeader text="Como devemos te chamar?" />
        <InputField valueKey="name" placeholder="Seu nome" autoCapitalize="words" />
      </View>
      <Btn disabled={!answers.name || answers.name.length < 2} />
    </KeyboardAvoidingView>
  );

  // Tela 20: Loguin Email
  const Step19 = () => (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={s.body}>
        <QuestionHeader text="Qual o seu e-mail?" subtext="Para proteger sua conta e progresso." />
        <InputField valueKey="email" placeholder="seu@email.com" keyboardType="email-address" />
      </View>
      <Btn disabled={!answers.email || !answers.email.includes('@')} />
    </KeyboardAvoidingView>
  );

  // Tela 21: Loguin Telefone
  const Step20 = () => (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={s.body}>
        <QuestionHeader text="Qual o seu WhatsApp?" subtext="Para alertas importantes (opcional)." />
        <InputField valueKey="phone" placeholder="(11) 99999-9999" keyboardType="phone-pad" />
      </View>
      <Btn />
    </KeyboardAvoidingView>
  );

  // Tela 22: Hora de gerar plano
  const Step21 = () => (
    <View style={s.body}>
       <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <Ionicons name="flash" size={60} color={COLORS.purpleLight} />
          <Text style={[s.heroTitle, {textAlign: 'center', marginTop: 32}]}>Tudo pronto.</Text>
          <Text style={[s.heroSub, {textAlign: 'center'}]}>Temos todas as informações necessárias. É hora de gerar o seu plano de ação.</Text>
       </View>
       <Btn label="Gerar Meu Plano" />
    </View>
  );

  // Tela 23: Gerando plano (Loading)
  const Step22 = () => (
    <View style={[s.body, {justifyContent: 'center', alignItems: 'center'}]}>
      <Text style={[s.heroTitle, {textAlign: 'center', marginBottom: 30}]}>Processando...</Text>
      <View style={s.loadingTrack}>
        <Animated.View style={[s.loadingBar, { width: loadingProg.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
      </View>
      <Text style={s.loadingMsg}>{LOADING_MSGS[loadingMsgIdx]}</Text>
    </View>
  );

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

  // Tela 25: Prova social (8k+)
  const Step24 = () => (
    <>
      <View style={s.body}>
        <QuestionHeader text="Junte-se a uma comunidade de alta performance." center />
        <View style={s.socialBigCard}>
           <Text style={s.socialBigNum}>8.432</Text>
           <Text style={s.socialBigLbl}>pessoas já estão ativas usando o CapiFit agora.</Text>
        </View>
        <View style={s.userAvatarsWrap}>
           {[1,2,3,4,5].map((_, i) => (
             <View key={i} style={[s.avatarCircle, { zIndex: 5-i, marginLeft: i === 0 ? 0 : -15 }]} />
           ))}
        </View>
      </View>
      <Btn label="Fazer Parte" />
    </>
  );

  // Tela 26: Testar agora grátis
  const Step25 = () => (
    <>
      <View style={[s.body, {alignItems: 'center'}]}>
        <View style={s.productShowcase}>
           <Image source={require('../../tela_inicial.png')} style={s.productImageSm} resizeMode="contain" />
        </View>
        <Text style={[s.heroTitle, {textAlign: 'center', marginTop: 20}]}>Experimente o CapiFit Premium.</Text>
        <Text style={[s.heroSub, {textAlign: 'center'}]}>Acesse todos os recursos avançados sem pagar nada hoje.</Text>
      </View>
      <View style={{paddingHorizontal: 24}}>
        <Btn label="Testar agora" />
      </View>
    </>
  );

  // Tela 27: Notificação antes de acabar
  const Step26 = () => (
    <View style={s.body}>
       <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <View style={s.circleIcon}><Ionicons name="mail-open" size={48} color={COLORS.greenLight} /></View>
          <Text style={[s.heroTitle, {textAlign: 'center', marginTop: 32}]}>Aviso de Transparência.</Text>
          <Text style={[s.heroSub, {textAlign: 'center'}]}>Nós te enviaremos uma notificação antes do seu período de teste acabar. Você tem o controle total.</Text>
       </View>
       <View style={{width: '100%'}}>
         <Btn label="Continuar Free" />
       </View>
    </View>
  );

  // Tela 28: Paywall
  const Step27 = () => (
    <ScrollView style={s.body} contentContainerStyle={s.bodyPad} showsVerticalScrollIndicator={false}>
      <View style={s.paywallHero}>
        <Text style={[s.heroTitle, {textAlign: 'center', marginTop: 16}]}>CapiFit Pro.</Text>
        <Text style={[s.heroSub, {textAlign: 'center'}]}>Garanta sua vaga com desconto especial de lançamento.</Text>
      </View>

      <View style={s.paywallFeatures}>
        {[
          'Acesso vitalício ao plano adaptativo',
          'Recuperações de streak ilimitadas',
          'Métricas avançadas e ranking VIP',
          'Sem anúncios, foco total',
        ].map((f, i) => (
          <View key={i} style={s.paywallFeatureRow}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.purple} />
            <Text style={s.paywallFeatureText}>{f}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity onPress={goNext} activeOpacity={0.9} style={{ marginBottom: 12, paddingHorizontal: 24 }}>
        <View style={s.paywallPlanA}>
          <View style={s.paywallBadge}>
            <Text style={s.paywallBadgeText}>MELHOR ESCOLHA</Text>
          </View>
          <Text style={s.paywallPlanName}>Anual</Text>
          <Text style={s.paywallPlanPrice}>R$ 149,00<Text style={s.paywallPlanPer}>/ano</Text></Text>
          <Text style={s.paywallPlanTotal}>Faturado uma vez por ano</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity onPress={goNext} activeOpacity={0.9} style={[s.paywallPlanB, {marginHorizontal: 24}]}>
        <Text style={s.paywallPlanBName}>Mensal</Text>
        <Text style={s.paywallPlanBPrice}>R$ 29,90<Text style={s.paywallPlanPer}>/mês</Text></Text>
      </TouchableOpacity>

      <View style={{paddingVertical: 10, alignItems: 'center', paddingHorizontal: 24}}>
        <Btn label="Assinar agora" />
        <Btn label="Restaurar compra" secondary />
      </View>
      <View style={{ height: 48 }} />
    </ScrollView>
  );

  const STEPS = [
    Step0, Step1, Step2, Step3, Step4, Step5, Step6, Step7,
    Step8, Step9, Step10, Step11, Step12, Step13, Step14, Step15,
    Step16, Step17, Step18, Step19, Step20, Step21, Step22, Step23,
    Step24, Step25, Step26, Step27
  ];
  const StepComponent = STEPS[step] || STEPS[0];

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <Header />
      <Animated.View style={[s.screen, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}>
        <StepComponent />
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
  pickerRow: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#161625', borderRadius: 20, paddingVertical: 10 },
  pickerCol: { flex: 1, alignItems: 'center' },
  pickerColTitle: { fontSize: 14, fontWeight: '600', color: COLORS.gray, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },

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

  // Social Proof (Tela 25)
  socialBigCard: { backgroundColor: '#161625', padding: 32, borderRadius: 20, alignItems: 'center', marginTop: 20 },
  socialBigNum: { fontSize: 56, fontWeight: '800', color: COLORS.white, letterSpacing: -2 },
  socialBigLbl: { fontSize: 16, color: COLORS.gray, textAlign: 'center', marginTop: 8, fontWeight: '500', lineHeight: 24 },
  userAvatarsWrap: { flexDirection: 'row', justifyContent: 'center', marginTop: 30 },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#2A2A4A', borderWidth: 2, borderColor: COLORS.bg },

  // Product Showcase (Tela 26)
  productShowcase: { width: '80%', height: 350, backgroundColor: '#161625', borderRadius: 24, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', padding: 20 },
  productImageSm: { width: '100%', height: '100%' },

  // Paywall (Tela 28)
  paywallHero: { alignItems: 'center', marginBottom: 24, marginTop: 10, paddingHorizontal: 24 },
  paywallFeatures: { backgroundColor: '#161625', borderRadius: 20, padding: 24, marginBottom: 24, gap: 16, marginHorizontal: 24 },
  paywallFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  paywallFeatureText: { fontSize: 15, color: COLORS.white, fontWeight: '600' },
  paywallPlanA: { borderRadius: 20, padding: 24, alignItems: 'center', position: 'relative', backgroundColor: '#1E1E30', borderWidth: 1, borderColor: COLORS.purple },
  paywallBadge: { position: 'absolute', top: -12, backgroundColor: COLORS.purple, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  paywallBadgeText: { fontSize: 10, fontWeight: '800', color: COLORS.white, letterSpacing: 0.5 },
  paywallPlanName: { fontSize: 16, fontWeight: '700', color: COLORS.gray, marginBottom: 6 },
  paywallPlanPrice: { fontSize: 36, fontWeight: '800', color: COLORS.white, letterSpacing: -1 },
  paywallPlanPer: { fontSize: 16, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  paywallPlanTotal: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 8, fontWeight: '600' },
  paywallPlanB: { backgroundColor: '#161625', borderRadius: 20, padding: 20, alignItems: 'center', marginBottom: 24 },
  paywallPlanBName: { fontSize: 15, color: COLORS.gray, marginBottom: 6, fontWeight: '600' },
  paywallPlanBPrice: { fontSize: 24, fontWeight: '700', color: COLORS.white, letterSpacing: -0.5 },
});
