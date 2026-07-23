import React, { useEffect, useRef } from 'react';
import { View, Text, Modal, Animated, StyleSheet, Dimensions } from 'react-native';
import TouchableOpacity from './TouchableOpacity';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../theme';

const { width: SW, height: SH } = Dimensions.get('window');

const CATEGORY_COLORS = {
  streak:   ['#7C2D12', '#431407'],
  treinos:  ['#1E3A5F', '#0F1D33'],
  xp:       ['#1C1F4A', '#0E1022'],
  especial: ['#2D1B69', '#12072E'],
};

export default function AchievementUnlockModal({ achievement, onDismiss }) {
  const visible = !!achievement;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const cardScale    = useRef(new Animated.Value(0.5)).current;
  const cardOpacity  = useRef(new Animated.Value(0)).current;
  const glowAnim     = useRef(new Animated.Value(0)).current;
  const particles    = useRef(
    Array.from({ length: 8 }, () => ({
      y:  new Animated.Value(0),
      x:  new Animated.Value(0),
      op: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    if (!visible) {
      backdropAnim.setValue(0);
      cardScale.setValue(0.5);
      cardOpacity.setValue(0);
      glowAnim.setValue(0);
      particles.forEach(p => { p.y.setValue(0); p.x.setValue(0); p.op.setValue(0); });
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.parallel([
      Animated.timing(backdropAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(cardScale,    { toValue: 1, friction: 5, tension: 100, useNativeDriver: true }),
      Animated.timing(cardOpacity,  { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();

    Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
    ])).start();

    particles.forEach((p, i) => {
      const angle = (i / particles.length) * 2 * Math.PI;
      const dist  = 60 + Math.random() * 40;
      Animated.sequence([
        Animated.delay(i * 60),
        Animated.parallel([
          Animated.timing(p.op, { toValue: 1, duration: 100, useNativeDriver: true }),
          Animated.timing(p.y,  { toValue: -dist * Math.abs(Math.sin(angle)), duration: 900, useNativeDriver: true }),
          Animated.timing(p.x,  { toValue: dist * Math.cos(angle), duration: 900, useNativeDriver: true }),
        ]),
        Animated.timing(p.op, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    });

    // Auto-dismiss após 4 segundos
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [visible]);

  if (!achievement) return null;

  const gradient = CATEGORY_COLORS[achievement.category] ?? ['#1A1A2E', '#0A0A18'];
  const color = achievement.color ?? COLORS.purple;
  const pEmojis = ['⭐', '✨', '🏆', '💫', '🌟', '🎯', '💥', '🎉'];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onDismiss} activeOpacity={1}>
        <Animated.View style={[
          StyleSheet.absoluteFill,
          { backgroundColor: '#000', opacity: backdropAnim.interpolate({ inputRange: [0,1], outputRange: [0, 0.88] }) },
        ]} />

        {/* Partículas */}
        {particles.map((p, i) => (
          <Animated.Text
            key={i}
            style={{
              position: 'absolute',
              left: SW * 0.5 - 12,
              top:  SH * 0.42,
              fontSize: 18,
              opacity: p.op,
              transform: [{ translateX: p.x }, { translateY: p.y }],
            }}
          >{pEmojis[i % pEmojis.length]}</Animated.Text>
        ))}

        {/* Card */}
        <View style={styles.wrap}>
          <Animated.View style={{ transform: [{ scale: cardScale }], opacity: cardOpacity, width: '88%' }}>
            <LinearGradient colors={gradient} style={styles.card}>

              {/* Badge */}
              <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color + '60' }]}>
                <Text style={[styles.badgeText, { color }]}>✦ CONQUISTA DESBLOQUEADA ✦</Text>
              </View>

              {/* Emoji + glow */}
              <Animated.View style={[styles.emojiWrap, {
                shadowColor: color,
                shadowOpacity: glowAnim.interpolate({ inputRange: [0,1], outputRange: [0.3, 0.9] }),
                shadowRadius:  glowAnim.interpolate({ inputRange: [0,1], outputRange: [8, 24] }),
              }]}>
                <Text style={styles.emoji}>{achievement.emoji}</Text>
              </Animated.View>

              <Text style={[styles.name, { color }]}>{achievement.name}</Text>
              <Text style={styles.desc}>{achievement.description}</Text>

              {achievement.xp_reward > 0 && (
                <View style={[styles.xpRow, { backgroundColor: color + '20', borderColor: color + '40' }]}>
                  <Text style={[styles.xpText, { color }]}>⚡ +{achievement.xp_reward} XP</Text>
                </View>
              )}

              <Text style={styles.tap}>Toque para continuar</Text>
            </LinearGradient>
          </Animated.View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card:     { borderRadius: 28, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  badge:    { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 99, borderWidth: 1, marginBottom: 20 },
  badgeText:{ fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  emojiWrap:{ width: 88, height: 88, alignItems: 'center', justifyContent: 'center',
              borderRadius: 44, backgroundColor: 'rgba(255,255,255,0.06)',
              shadowOffset: { width: 0, height: 0 }, marginBottom: 16, elevation: 8 },
  emoji:    { fontSize: 44 },
  name:     { fontSize: 26, fontWeight: '900', marginBottom: 8, textAlign: 'center', letterSpacing: -0.5 },
  desc:     { fontSize: 15, color: COLORS.gray, textAlign: 'center', lineHeight: 21, marginBottom: 20 },
  xpRow:    { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 99, borderWidth: 1, marginBottom: 20 },
  xpText:   { fontSize: 15, fontWeight: '800' },
  tap:      { fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: '500' },
});
