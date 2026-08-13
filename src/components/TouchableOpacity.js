import React, { useCallback } from 'react';
import { TouchableOpacity as RNTouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';

// Substitui o TouchableOpacity nativo em todo o app — dispara uma vibração
// perceptível em todo toque, pra dar a sensação física de "cliquei de
// verdade" em qualquer botão.
export default function TouchableOpacity({ onPress, ...props }) {
  const handlePress = useCallback((e) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress?.(e);
  }, [onPress]);

  return <RNTouchableOpacity {...props} onPress={onPress ? handlePress : undefined} />;
}
