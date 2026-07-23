import React, { useCallback } from 'react';
import { TouchableOpacity as RNTouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';

// Substitui o TouchableOpacity nativo em todo o app — dispara uma vibração bem
// sutil (a mais leve que o expo-haptics tem) em todo toque, só pra dar a
// sensação física de "cliquei de verdade" em qualquer botão.
export default function TouchableOpacity({ onPress, ...props }) {
  const handlePress = useCallback((e) => {
    Haptics.selectionAsync();
    onPress?.(e);
  }, [onPress]);

  return <RNTouchableOpacity {...props} onPress={onPress ? handlePress : undefined} />;
}
