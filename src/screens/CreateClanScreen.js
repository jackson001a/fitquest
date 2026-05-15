import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS } from '../theme';
import { useUser } from '../context/UserContext';
import { createSquad, buildSquadInviteLink, shareExternal } from '../services/socialService';

const DURATIONS = [
  { label: '7 dias',  value: 7 },
  { label: '14 dias', value: 14 },
  { label: '30 dias', value: 30 },
];

const FREQ_OPTIONS = [2, 3, 4, 5];

const EMOJI_OPTIONS = ['🛡️', '⚔️', '🔥', '💪', '👑', '🏆', '🦁', '🚀'];

export default function CreateClanScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const isDuoRoute = route?.params?.isDuo ?? false;

  const [step,         setStep]         = useState(0); // 0=tipo, 1=config, 2=criado
  const [mode,         setMode]         = useState('friends'); // 'friends' | 'battle'
  const [isDuo,        setIsDuo]        = useState(isDuoRoute);
  const [clanName,     setClanName]     = useState('');
  const [emoji,        setEmoji]        = useState('🛡️');
  const [duration,     setDuration]     = useState(30);
  const [freq,         setFreq]         = useState(3);
  const [loading,      setLoading]      = useState(false);
  const [createdSquad, setCreatedSquad] = useState(null);

  // ─── Step 0: Escolha do tipo ─────────────────────────────────────────────
  function StepTipo() {
    return (
      <ScrollView contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.stepTitle}>Que tipo de desafio?</Text>

        {/* Duo toggle */}
        <View style={styles.duoToggle}>
          <TouchableOpacity style={[styles.duoBtn, !isDuo && styles.duoBtnActive]}
            onPress={() => setIsDuo(false)} activeOpacity={0.8}>
            <Text style={styles.duoBtnEmoji}>👥</Text>
            <Text style={[styles.duoBtnText, !isDuo && styles.duoBtnTextActive]}>Grupo (2–4)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.duoBtn, isDuo && styles.duoBtnActive]}
            onPress={() => setIsDuo(true)} activeOpacity={0.8}>
            <Text style={styles.duoBtnEmoji}>🤝</Text>
            <Text style={[styles.duoBtnText, isDuo && styles.duoBtnTextActive]}>Dupla (2 pes.)</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>Modo de jogo</Text>

        {/* Modo Amigos */}
        <TouchableOpacity style={[styles.modeCard, mode === 'friends' && styles.modeCardActive]}
          onPress={() => setMode('friends')} activeOpacity={0.85}>
          <LinearGradient
            colors={mode === 'friends' ? ['#1E3A5F','#0F2647'] : ['#1A1A2E','#12122A']}
            style={styles.modeCardInner}>
            <Text style={styles.modeEmoji}>🛡️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.modeName}>{isDuo ? 'Dupla Colaborativa' : 'Clã Amigos'}</Text>
              <Text style={styles.modeDesc}>
                {isDuo
                  ? 'Ambos precisam treinar para manter o foguinho da dupla aceso. Um falha = os dois perdem.'
                  : 'Todos colaboram. Se qualquer um falhar na semana, o foguinho do grupo apaga para todos.'}
              </Text>
            </View>
            {mode === 'friends' && <Ionicons name="checkmark-circle" size={24} color={COLORS.blue} />}
          </LinearGradient>
        </TouchableOpacity>

        {/* Modo Batalha */}
        <TouchableOpacity style={[styles.modeCard, mode === 'battle' && styles.modeCardActive]}
          onPress={() => setMode('battle')} activeOpacity={0.85}>
          <LinearGradient
            colors={mode === 'battle' ? ['#3B0000','#1A0000'] : ['#1A1A2E','#12122A']}
            style={styles.modeCardInner}>
            <Text style={styles.modeEmoji}>⚔️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.modeName}>{isDuo ? 'Dupla Rival' : 'Clã Batalha'}</Text>
              <Text style={styles.modeDesc}>
                {isDuo
                  ? 'Você vs seu rival. Quem treinar mais na duração vence. Faltar = perde pontos.'
                  : 'Todos rivais. Quem não cumprir os dias perde pontos. Mais consistente vence no final.'}
              </Text>
            </View>
            {mode === 'battle' && <Ionicons name="checkmark-circle" size={24} color={COLORS.red} />}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.nextBtn} onPress={() => setStep(1)} activeOpacity={0.85}>
          <Text style={styles.nextBtnText}>Próximo →</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ─── Step 1: Configuração ─────────────────────────────────────────────────
  function StepConfig() {
    return (
      <ScrollView contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.stepTitle}>Configure o {isDuo ? 'duelo' : 'clã'}</Text>

        {/* Nome */}
        <Text style={styles.sectionLabel}>Nome do {isDuo ? 'duelo' : 'clã'}</Text>
        <TextInput
          style={styles.nameInput}
          placeholder={isDuo ? 'Ex: Duelo do Mês' : 'Ex: Os Invencíveis'}
          placeholderTextColor={COLORS.gray}
          value={clanName}
          onChangeText={setClanName}
          maxLength={30}
        />

        {/* Emoji */}
        <Text style={styles.sectionLabel}>Ícone</Text>
        <View style={styles.emojiRow}>
          {EMOJI_OPTIONS.map(e => (
            <TouchableOpacity key={e} style={[styles.emojiBtn, emoji === e && styles.emojiBtnActive]}
              onPress={() => setEmoji(e)}>
              <Text style={styles.emojiText}>{e}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Duração */}
        <Text style={styles.sectionLabel}>Duração</Text>
        <View style={styles.optionsRow}>
          {DURATIONS.map(d => (
            <TouchableOpacity key={d.value} style={[styles.optionBtn, duration === d.value && styles.optionBtnActive]}
              onPress={() => setDuration(d.value)}>
              <Text style={[styles.optionText, duration === d.value && styles.optionTextActive]}>{d.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Frequência semanal */}
        <Text style={styles.sectionLabel}>Dias obrigatórios por semana</Text>
        <View style={styles.optionsRow}>
          {FREQ_OPTIONS.map(f => (
            <TouchableOpacity key={f} style={[styles.optionBtn, freq === f && styles.optionBtnActive]}
              onPress={() => setFreq(f)}>
              <Text style={[styles.optionText, freq === f && styles.optionTextActive]}>{f}x</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Resumo */}
        <LinearGradient colors={['#1A1A2E','#12122A']} style={styles.summary}>
          <Text style={styles.summaryTitle}>📋 Resumo</Text>
          <Text style={styles.summaryLine}>{emoji} {clanName || `Meu ${isDuo ? 'Duelo' : 'Clã'}`}</Text>
          <Text style={styles.summaryLine}>
            {mode === 'friends' ? '🛡️ Modo Amigos' : '⚔️ Modo Batalha'} · {isDuo ? 'Dupla' : 'Grupo'}
          </Text>
          <Text style={styles.summaryLine}>⏱ {duration} dias · {freq}x por semana</Text>
        </LinearGradient>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity style={styles.backBtn2} onPress={() => setStep(0)}>
            <Text style={styles.backBtn2Text}>← Voltar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.createBtn, !clanName && { opacity: 0.5 }]}
            disabled={!clanName || loading}
            onPress={handleCreate} activeOpacity={0.85}>
            <Text style={styles.createBtnText}>{loading ? 'Criando...' : `Criar ${isDuo ? 'Duelo' : 'Clã'}`}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // ─── Step 2: Criado com sucesso ──────────────────────────────────────────
  function StepCreated() {
    if (!createdSquad) return null;
    const inviteLink = buildSquadInviteLink(createdSquad.id, createdSquad.invite_code);

    async function handleShare() {
      await shareExternal(
        `🔥 Entra no meu ${isDuo ? 'duelo' : 'clã'} "${createdSquad.name}" no CapiFit!\nCódigo: ${createdSquad.invite_code}`,
        inviteLink,
      );
    }

    return (
      <View style={styles.createdContainer}>
        <Text style={{ fontSize: 72, marginBottom: 16 }}>{emoji}</Text>
        <Text style={styles.createdTitle}>{createdSquad.name}</Text>
        <Text style={styles.createdSub}>
          {isDuo ? 'Duelo' : 'Clã'} criado com sucesso! Convide {isDuo ? 'seu rival' : 'seus amigos'}.
        </Text>

        <LinearGradient colors={['#2D1B69','#1A1A2E']} style={styles.inviteBox}>
          <Text style={styles.inviteLabel}>Código de convite</Text>
          <Text style={styles.inviteCode}>{createdSquad.invite_code}</Text>
        </LinearGradient>

        <TouchableOpacity style={styles.shareSquadBtn} onPress={handleShare} activeOpacity={0.85}>
          <Ionicons name="share-outline" size={20} color={COLORS.white} />
          <Text style={styles.shareSquadText}>Compartilhar convite</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
          <Text style={styles.doneBtnText}>Pronto!</Text>
        </TouchableOpacity>
      </View>
    );
  }

  async function handleCreate() {
    if (!clanName.trim()) return;
    setLoading(true);
    try {
      const squad = await createSquad(user.id, {
        name: clanName.trim(), emoji, mode, isDuo,
        durationDays: duration, minWeeklyCheckins: freq,
      });
      setCreatedSquad(squad);
      setStep(2);
    } catch (e) {
      Alert.alert('Erro', e.message ?? 'Não foi possível criar o clã.');
    } finally {
      setLoading(false);
    }
  }

  const steps = [StepTipo, StepConfig, StepCreated];
  const StepComponent = steps[step];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {step < 2 && (
        <View style={styles.header}>
          <TouchableOpacity onPress={() => step === 0 ? navigation.goBack() : setStep(s => s-1)}
            style={styles.closeBtn}>
            <Ionicons name={step === 0 ? 'close' : 'arrow-back'} size={22} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isDuo ? 'Criar Duelo' : 'Criar Clã'} {step > 0 ? '· Configurar' : '· Tipo'}
          </Text>
          {/* Progress */}
          <View style={styles.progressDots}>
            {[0,1].map(i => (
              <View key={i} style={[styles.dot, step >= i && styles.dotActive]} />
            ))}
          </View>
        </View>
      )}
      <StepComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.bg },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: 12 },
  closeBtn:     { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle:  { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  progressDots: { flexDirection: 'row', gap: 6 },
  dot:          { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.border },
  dotActive:    { backgroundColor: COLORS.purple },
  stepContent:  { paddingHorizontal: SPACING.md, paddingBottom: 40, paddingTop: 8 },
  stepTitle:    { fontSize: 26, fontWeight: '900', color: COLORS.white, marginBottom: 20, letterSpacing: -0.5 },
  sectionLabel: { color: COLORS.gray, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, marginTop: 16 },
  duoToggle:    { flexDirection: 'row', gap: 10, marginBottom: 16 },
  duoBtn:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.card, borderRadius: RADIUS.lg, paddingVertical: 12, borderWidth: 1, borderColor: COLORS.border },
  duoBtnActive: { backgroundColor: 'rgba(139,92,246,0.2)', borderColor: COLORS.purple },
  duoBtnEmoji:  { fontSize: 20 },
  duoBtnText:   { color: COLORS.gray, fontWeight: '600', fontSize: 13 },
  duoBtnTextActive: { color: COLORS.white },
  modeCard:     { marginBottom: 10, borderRadius: RADIUS.lg, overflow: 'hidden', borderWidth: 1.5, borderColor: 'transparent' },
  modeCardActive:{ borderColor: COLORS.purple },
  modeCardInner:{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  modeEmoji:    { fontSize: 32 },
  modeName:     { color: COLORS.white, fontSize: 16, fontWeight: '800', marginBottom: 4 },
  modeDesc:     { color: COLORS.gray, fontSize: 12, lineHeight: 17 },
  nextBtn:      { marginTop: 24, backgroundColor: COLORS.purple, borderRadius: RADIUS.full, paddingVertical: 16, alignItems: 'center' },
  nextBtnText:  { color: COLORS.white, fontSize: 16, fontWeight: '800' },
  nameInput:    { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, paddingHorizontal: 16, paddingVertical: 14, color: COLORS.white, fontSize: 16, borderWidth: 1, borderColor: COLORS.border },
  emojiRow:     { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  emojiBtn:     { width: 48, height: 48, borderRadius: RADIUS.md, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  emojiBtnActive:{ borderColor: COLORS.purple, backgroundColor: 'rgba(139,92,246,0.2)' },
  emojiText:    { fontSize: 24 },
  optionsRow:   { flexDirection: 'row', gap: 8 },
  optionBtn:    { flex: 1, paddingVertical: 10, borderRadius: RADIUS.lg, backgroundColor: COLORS.card, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  optionBtnActive:{ backgroundColor: 'rgba(139,92,246,0.2)', borderColor: COLORS.purple },
  optionText:   { color: COLORS.gray, fontWeight: '600', fontSize: 13 },
  optionTextActive:{ color: COLORS.white, fontWeight: '700' },
  summary:      { borderRadius: RADIUS.lg, padding: 16, marginTop: 20, borderWidth: 1, borderColor: COLORS.border },
  summaryTitle: { color: COLORS.gray, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  summaryLine:  { color: COLORS.white, fontSize: 14, fontWeight: '600', marginBottom: 6 },
  backBtn2:     { flex: 1, paddingVertical: 14, borderRadius: RADIUS.full, backgroundColor: COLORS.card, alignItems: 'center', marginTop: 16, borderWidth: 1, borderColor: COLORS.border },
  backBtn2Text: { color: COLORS.gray, fontWeight: '700' },
  createBtn:    { flex: 2, paddingVertical: 14, borderRadius: RADIUS.full, backgroundColor: COLORS.purple, alignItems: 'center', marginTop: 16 },
  createBtnText:{ color: COLORS.white, fontSize: 15, fontWeight: '800' },
  // Criado
  createdContainer:{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  createdTitle: { fontSize: 28, fontWeight: '900', color: COLORS.white, marginBottom: 8, textAlign: 'center' },
  createdSub:   { color: COLORS.gray, fontSize: 15, textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  inviteBox:    { borderRadius: RADIUS.xl, padding: 24, alignItems: 'center', width: '100%', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(139,92,246,0.4)' },
  inviteLabel:  { color: COLORS.gray, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  inviteCode:   { color: COLORS.white, fontSize: 36, fontWeight: '900', letterSpacing: 6 },
  shareSquadBtn:{ flexDirection: 'row', gap: 10, backgroundColor: COLORS.purple, borderRadius: RADIUS.full, paddingHorizontal: 28, paddingVertical: 14, alignItems: 'center', marginBottom: 12 },
  shareSquadText:{ color: COLORS.white, fontSize: 15, fontWeight: '700' },
  doneBtn:      { paddingHorizontal: 28, paddingVertical: 14 },
  doneBtnText:  { color: COLORS.gray, fontSize: 15, fontWeight: '600' },
});
