import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LightningIcon } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADIUS } from '../theme';
import { useUser } from '../context/UserContext';

// Toast global de "+N XP" — mostra sempre que XP é ganho fora do fluxo de
// treino (que já tem seu próprio modal), junto com a origem do ganho, para
// nunca mais deixar o usuário sem saber de onde veio um XP que apareceu.
export default function XPToast() {
  const { xpToast, clearXpToast } = useUser();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity     = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!xpToast) return;
    translateY.setValue(-80);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, friction: 7, tension: 80, useNativeDriver: true }),
      Animated.timing(opacity,    { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -80, duration: 220, useNativeDriver: true }),
        Animated.timing(opacity,    { toValue: 0,   duration: 220, useNativeDriver: true }),
      ]).start(() => clearXpToast());
    }, 2600);

    return () => clearTimeout(t);
  }, [xpToast?.id]);

  if (!xpToast) return null;

  return (
    <View pointerEvents="none" style={[styles.wrap, { top: insets.top + 8 }]}>
      <Animated.View style={{ opacity, transform: [{ translateY }] }}>
        <LinearGradient colors={['#8B5CF6', '#6D28D9']} style={styles.card}>
          <LightningIcon size={18} color="#FCD34D" weight="fill" />
          <View>
            <Text style={styles.amount}>+{xpToast.amount} XP</Text>
            {xpToast.source ? <Text style={styles.source}>{xpToast.source}</Text> : null}
          </View>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 999 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: RADIUS.full, paddingHorizontal: 16, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    shadowColor: COLORS.purple, shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  amount: { color: '#fff', fontSize: 15, fontWeight: '900' },
  source: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '600', marginTop: 1 },
});
