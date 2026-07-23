import React, { useEffect, useRef } from 'react';
import { View, Text, Modal, Animated, StyleSheet, Dimensions } from 'react-native';
import TouchableOpacity from './TouchableOpacity';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAudioPlayer } from 'expo-audio';
import { TrendUpIcon } from 'phosphor-react-native';
import { COLORS } from '../theme';

const { width: SW, height: SH } = Dimensions.get('window');

// Comemoração de subir de nível — sem isso o usuário só descobria que subiu
// de nível olhando o número na tela, sem nenhum feedback no momento.
// Componente puramente apresentacional: quem decide QUANDO mostrar (e garante
// que não apareça ao mesmo tempo que outro popup de comemoração) é o
// CelebrationOverlay, que lê a fila unificada do UserContext.
export default function LevelUpModal({ level, onDismiss }) {
  const visible = level != null;
  const sound = useAudioPlayer(require('../../assets/sounds/level-up.wav'));
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const scale        = useRef(new Animated.Value(0.5)).current;
  const opacity       = useRef(new Animated.Value(0)).current;
  const glowAnim      = useRef(new Animated.Value(0)).current;
  const rays          = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      backdropAnim.setValue(0); scale.setValue(0.5); opacity.setValue(0); glowAnim.setValue(0); rays.setValue(0);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    sound.seekTo(0);
    sound.play();
    Animated.parallel([
      Animated.timing(backdropAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(scale,        { toValue: 1, friction: 5, tension: 100, useNativeDriver: true }),
      Animated.timing(opacity,      { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
    Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
    ])).start();
    Animated.loop(
      Animated.timing(rays, { toValue: 1, duration: 6000, useNativeDriver: true })
    ).start();

    const t = setTimeout(onDismiss, 3800);
    return () => clearTimeout(t);
  }, [level]);

  if (level == null) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onDismiss} activeOpacity={1}>
        <Animated.View style={[
          StyleSheet.absoluteFill,
          { backgroundColor: '#000', opacity: backdropAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.88] }) },
        ]} />

        <Animated.View pointerEvents="none" style={[styles.raysWrap, {
          transform: [{ rotate: rays.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
        }]}>
          <LinearGradient
            colors={['rgba(139,92,246,0.35)', 'transparent']}
            style={styles.ray}
          />
        </Animated.View>

        <View style={styles.wrap}>
          <Animated.View style={{ transform: [{ scale }], opacity, width: '86%' }}>
            <LinearGradient colors={['#4C1D95', '#1E1044', '#0A0A18']} style={styles.card}>
              <Animated.View style={[styles.badgeGlow, {
                shadowOpacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.95] }),
                shadowRadius:  glowAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 28] }),
              }]}>
                <LinearGradient colors={[COLORS.gold, '#F59E0B']} style={styles.badge}>
                  <TrendUpIcon size={36} color="#fff" weight="bold" />
                </LinearGradient>
              </Animated.View>

              <Text style={styles.subtitle}>✦ VOCÊ SUBIU DE NÍVEL ✦</Text>
              <Text style={styles.level}>Nível {level}</Text>
              <Text style={styles.desc}>Continue treinando para chegar ainda mais longe!</Text>

              <Text style={styles.tap}>Toque para continuar</Text>
            </LinearGradient>
          </Animated.View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  raysWrap: { position: 'absolute', left: SW / 2 - SW, top: SH / 2 - SW, width: SW * 2, height: SW * 2, alignItems: 'center', justifyContent: 'center' },
  ray: { width: '100%', height: '100%', borderRadius: SW },
  card: { borderRadius: 28, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  badgeGlow: { shadowColor: COLORS.gold, shadowOffset: { width: 0, height: 0 }, elevation: 10, marginBottom: 18 },
  badge: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
  subtitle: { color: COLORS.purpleLight, fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginBottom: 6 },
  level: { color: '#fff', fontSize: 36, fontWeight: '900', marginBottom: 10, letterSpacing: -0.5 },
  desc: { fontSize: 14, color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 20, marginBottom: 18 },
  tap: { fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: '500' },
});
