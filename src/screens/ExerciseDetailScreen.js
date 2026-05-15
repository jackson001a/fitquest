import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Animated, ActivityIndicator, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS } from '../theme';
import { getExerciseImages, getExerciseMeta } from '../services/exerciseService';

const { width: SW } = Dimensions.get('window');
const IMG_H = SW * 0.65;

const LEVEL_COLOR = { 'Iniciante': '#10B981', 'Intermediário': '#F59E0B', 'Avançado': '#EF4444' };
const LEVEL_EMOJI = { 'Iniciante': '🌱', 'Intermediário': '💪', 'Avançado': '🔥' };

export default function ExerciseDetailScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { exerciseName, sets, reps, rest } = route.params;

  const images = getExerciseImages(exerciseName);
  const meta   = getExerciseMeta(exerciseName);

  const [imgIdx,     setImgIdx]     = useState(0);
  const [imgLoaded,  setImgLoaded]  = useState([false, false]);
  const [imgError,   setImgError]   = useState([false, false]);
  const [gifFallback, setGifFallback] = useState(null); // URL do ExerciseDB como fallback
  const [playing,    setPlaying]    = useState(true);
  const fadeAnim  = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef(null);

  // ─── Fallback ExerciseDB quando ambas as imagens falham ────────────────────
  useEffect(() => {
    if (imgError[0] && imgError[1] && !gifFallback) {
      const { fetchExerciseGifUrl } = require('../services/exerciseService');
      fetchExerciseGifUrl(exerciseName).then(url => { if (url) setGifFallback(url); }).catch(() => {});
    }
  }, [imgError]);

  // ─── Animação entre imagem 0 e 1 (simula GIF) ────────────────────────────
  useEffect(() => {
    if (!images || !playing) {
      clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
      setImgIdx(prev => prev === 0 ? 1 : 0);
    }, 900); // troca a cada 0.9s

    return () => clearInterval(intervalRef.current);
  }, [playing, images]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{exerciseName}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Imagem animada */}
        <View style={styles.imgContainer}>
          {images ? (
            <>
              {/* Pré-carrega ambas as imagens */}
              {images.map((uri, i) => (
                <Animated.Image
                  key={i}
                  source={{ uri }}
                  style={[styles.exerciseImg, {
                    opacity: i === imgIdx ? fadeAnim : 0,
                    position: i === 0 ? 'relative' : 'absolute',
                    top: 0, left: 0, right: 0,
                  }]}
                  resizeMode="contain"
                  onLoad={() => setImgLoaded(prev => { const n=[...prev]; n[i]=true; return n; })}
                  onError={() => setImgError(prev => { const n=[...prev]; n[i]=true; return n; })}
                />
              ))}
              {!imgLoaded[0] && !imgError[0] && (
                <View style={styles.imgPlaceholder}>
                  <ActivityIndicator color={COLORS.purple} size="large" />
                  <Text style={{ color: COLORS.gray, marginTop: 12, fontSize: 13 }}>Carregando demonstração...</Text>
                </View>
              )}

              {/* Fallback GIF do ExerciseDB */}
              {imgError[0] && imgError[1] && gifFallback && (
                <Image
                  source={{ uri: gifFallback }}
                  style={[styles.exerciseImg, { position: 'absolute', top: 0, left: 0, right: 0 }]}
                  resizeMode="contain"
                />
              )}
              {/* Carregando fallback */}
              {imgError[0] && imgError[1] && !gifFallback && (
                <View style={[styles.imgPlaceholder, styles.noImgPlaceholder]}>
                  <ActivityIndicator color={COLORS.purple} size="large" />
                  <Text style={{ color: COLORS.gray, marginTop: 12, fontSize: 13, textAlign: 'center' }}>
                    Buscando demonstração...
                  </Text>
                </View>
              )}

              {/* Controle de play/pause */}
              {!imgError[0] && (
              <TouchableOpacity
                style={styles.playBtn}
                onPress={() => setPlaying(p => !p)}
                activeOpacity={0.8}>
                <Ionicons name={playing ? 'pause' : 'play'} size={16} color={COLORS.white} />
                <Text style={styles.playBtnText}>{playing ? 'Pausar' : 'Animar'}</Text>
              </TouchableOpacity>
              )}

              {/* Indicador de posição */}
              <View style={styles.posIndicator}>
                <Text style={styles.posIndicatorText}>
                  {imgIdx === 0 ? '① Posição inicial' : '② Posição final'}
                </Text>
              </View>
            </>
          ) : (
            <View style={[styles.imgPlaceholder, styles.noImgPlaceholder]}>
              <Text style={{ fontSize: 64 }}>🏋️</Text>
              <Text style={{ color: COLORS.gray, marginTop: 12, fontSize: 14, textAlign: 'center' }}>
                Demonstração em breve!{'\n'}
                <Text style={{ fontSize: 12 }}>Assine o ExerciseDB para GIFs animados</Text>
              </Text>
            </View>
          )}
        </View>

        {/* Info do exercício na sessão */}
        {(sets || reps || rest) && (
          <LinearGradient colors={['#2D1B69','#1A1A2E']} style={styles.sessionCard}>
            <Text style={styles.sessionTitle}>📋 Na sua sessão de hoje</Text>
            <View style={styles.sessionRow}>
              {sets && <View style={styles.sessionStat}><Text style={styles.sessionNum}>{sets}</Text><Text style={styles.sessionLabel}>séries</Text></View>}
              {reps && <View style={styles.sessionStat}><Text style={styles.sessionNum}>{reps}</Text><Text style={styles.sessionLabel}>repetições</Text></View>}
              {rest && <View style={styles.sessionStat}><Text style={styles.sessionNum}>{rest}</Text><Text style={styles.sessionLabel}>descanso</Text></View>}
            </View>
          </LinearGradient>
        )}

        {/* Nível e equipamento */}
        <View style={styles.tagsRow}>
          <View style={[styles.tag, { backgroundColor: LEVEL_COLOR[meta.level] + '20', borderColor: LEVEL_COLOR[meta.level] + '50' }]}>
            <Text style={{ fontSize: 14 }}>{LEVEL_EMOJI[meta.level]}</Text>
            <Text style={[styles.tagText, { color: LEVEL_COLOR[meta.level] }]}>{meta.level}</Text>
          </View>
          <View style={styles.tag}>
            <Ionicons name="barbell-outline" size={14} color={COLORS.gray} />
            <Text style={styles.tagText}>{meta.equipment}</Text>
          </View>
        </View>

        {/* Músculos trabalhados */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💪 Músculos trabalhados</Text>
          <View style={styles.musclesList}>
            {meta.muscles.map((m, i) => (
              <View key={i} style={[styles.muscleTag, i === 0 && styles.musclePrimary]}>
                <Text style={[styles.muscleTagText, i === 0 && { color: COLORS.purple, fontWeight: '800' }]}>
                  {i === 0 ? '● ' : '○ '}{m}
                </Text>
                {i === 0 && <Text style={styles.primaryLabel}>principal</Text>}
              </View>
            ))}
          </View>
        </View>

        {/* Dicas de execução */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✅ Como executar corretamente</Text>
          {meta.tips.map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <View style={styles.tipNum}><Text style={styles.tipNumText}>{i + 1}</Text></View>
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>

        {/* Erros comuns */}
        <View style={styles.section}>
          <LinearGradient colors={['#2D0A0A','#1A0A0A']} style={styles.warningCard}>
            <Text style={styles.warningTitle}>⚠️ Erros comuns a evitar</Text>
            <Text style={styles.warningText}>
              • Usar peso excessivo e perder a forma{'\n'}
              • Prender a respiração durante o movimento{'\n'}
              • Movimento brusco/balístico em vez de controlado{'\n'}
              • Não completar a amplitude de movimento
            </Text>
          </LinearGradient>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.bg },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: 12 },
  backBtn:      { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle:  { flex: 1, color: COLORS.white, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  imgContainer: { height: IMG_H, backgroundColor: '#0D0D1A', position: 'relative', overflow: 'hidden' },
  exerciseImg:  { width: '100%', height: IMG_H },
  imgPlaceholder:{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  noImgPlaceholder:{ backgroundColor: '#0D0D1A' },
  playBtn:      { position: 'absolute', bottom: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 6 },
  playBtnText:  { color: COLORS.white, fontSize: 12, fontWeight: '600' },
  posIndicator: { position: 'absolute', bottom: 12, left: 12, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 6 },
  posIndicatorText: { color: COLORS.white, fontSize: 11, fontWeight: '600' },
  sessionCard:  { marginHorizontal: SPACING.md, marginTop: 16, borderRadius: RADIUS.xl, padding: 16, borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)' },
  sessionTitle: { color: COLORS.gray, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  sessionRow:   { flexDirection: 'row', justifyContent: 'space-around' },
  sessionStat:  { alignItems: 'center' },
  sessionNum:   { color: COLORS.white, fontSize: 26, fontWeight: '900' },
  sessionLabel: { color: COLORS.gray, fontSize: 11, fontWeight: '600', marginTop: 2 },
  tagsRow:      { flexDirection: 'row', gap: 8, paddingHorizontal: SPACING.md, marginTop: 14, marginBottom: 4 },
  tag:          { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.card, borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: COLORS.border },
  tagText:      { color: COLORS.gray, fontSize: 12, fontWeight: '600' },
  section:      { paddingHorizontal: SPACING.md, marginTop: 20 },
  sectionTitle: { color: COLORS.white, fontSize: 15, fontWeight: '800', marginBottom: 12 },
  musclesList:  { gap: 8 },
  muscleTag:    { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.card, borderRadius: RADIUS.lg, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.border },
  musclePrimary:{ borderColor: COLORS.purple + '60', backgroundColor: 'rgba(139,92,246,0.08)' },
  muscleTagText:{ color: COLORS.gray, fontSize: 13, flex: 1 },
  primaryLabel: { color: COLORS.purple, fontSize: 10, fontWeight: '700', backgroundColor: 'rgba(139,92,246,0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  tipRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  tipNum:       { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.purple, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  tipNumText:   { color: COLORS.white, fontSize: 11, fontWeight: '900' },
  tipText:      { color: COLORS.white, fontSize: 13, lineHeight: 20, flex: 1 },
  warningCard:  { borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  warningTitle: { color: '#F87171', fontSize: 14, fontWeight: '800', marginBottom: 10 },
  warningText:  { color: '#FCA5A5', fontSize: 13, lineHeight: 22 },
});