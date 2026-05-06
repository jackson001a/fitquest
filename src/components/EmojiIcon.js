import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const EMOJI_TO_ICON = {
  '🔥': { name: 'flame', color: '#F97316' },
  '⚡': { name: 'flash', color: '#FCD34D' },
  '💪': { name: 'barbell', color: '#3B82F6' },
  '🏆': { name: 'trophy', color: '#F59E0B' },
  '🏃': { name: 'walk', color: '#10B981' },
  '🦁': { name: 'paw', color: '#F97316' },
  '👑': { name: 'star', color: '#F59E0B' }, 
  '⚔️': { name: 'shield', color: '#EF4444' },
  '⚔': { name: 'shield', color: '#EF4444' },
  '🎯': { name: 'bullseye', color: '#EC4899' },
  '⭐': { name: 'star', color: '#FCD34D' },
  '✅': { name: 'checkmark-circle', color: '#10B981' },
  '💧': { name: 'water', color: '#38BDF8' },
  '📍': { name: 'location', color: '#EF4444' },
  '🏋️': { name: 'barbell', color: '#8B5CF6' },
  '🏋': { name: 'barbell', color: '#8B5CF6' },
  '🦵': { name: 'body', color: '#EC4899' },
  '🤸': { name: 'body-outline', color: '#F59E0B' },
  '🥊': { name: 'hand-left', color: '#EF4444' },
  '🏊': { name: 'water-outline', color: '#06B6D4' },
  '🧘': { name: 'body', color: '#A78BFA' },
  '🚴': { name: 'bicycle', color: '#10B981' },
  '🎽': { name: 'shirt', color: '#3B82F6' },
  '💎': { name: 'diamond', color: '#06B6D4' },
  '🛡': { name: 'shield-checkmark', color: '#A78BFA' },
  '🛡️': { name: 'shield-checkmark', color: '#A78BFA' },
  '🔴': { name: 'ellipse', color: '#EF4444' },
  '🤝': { name: 'people', color: '#3B82F6' },
  '😤': { name: 'sad', color: '#EF4444' },
  '❤': { name: 'heart', color: '#EF4444' },
  '📣': { name: 'megaphone', color: '#F59E0B' },
  '🏅': { name: 'medal', color: '#F59E0B' },
  '⚙': { name: 'settings', color: '#94A3B8' },
  '📅': { name: 'calendar', color: '#3B82F6' },
  '📊': { name: 'stats-chart', color: '#10B981' },
  '👻': { name: 'skull', color: '#94A3B8' },
  '💡': { name: 'bulb', color: '#FCD34D' },
  '📋': { name: 'clipboard', color: '#8B5CF6' },
  '➕': { name: 'add-circle', color: '#10B981' },
  '🎉': { name: 'sparkles', color: '#F59E0B' }, 
  '✨': { name: 'sparkles', color: '#FCD34D' },
  '🌟': { name: 'star', color: '#FCD34D' },
  '🌵': { name: 'leaf', color: '#10B981' },
  '🔻': { name: 'caret-down', color: '#EF4444' },
  '⚖': { name: 'scale', color: '#3B82F6' },
  '📈': { name: 'trending-up', color: '#10B981' },
  '👀': { name: 'eye', color: '#A78BFA' },
  '👹': { name: 'skull', color: '#EF4444' },
};

export default function EmojiIcon({ emoji, size = 24, style, glow = true }) {
  const iconData = EMOJI_TO_ICON[emoji?.trim()];

  if (!iconData) {
    // Fallback if emoji not found in map
    return <Text style={[{ fontSize: size }, style]}>{emoji}</Text>;
  }

  const glowStyle = glow ? {
    shadowColor: iconData.color,
    shadowOpacity: 0.6,
    shadowRadius: size * 0.4,
    shadowOffset: { width: 0, height: 0 },
  } : {};

  return (
    <View style={[glowStyle, style, { alignItems: 'center', justifyContent: 'center' }]}>
      <Ionicons name={iconData.name} size={size} color={iconData.color} />
    </View>
  );
}
