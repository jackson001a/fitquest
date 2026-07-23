import React from 'react';
import { View, Text } from 'react-native';
import {
  FireIcon, LightningIcon, BarbellIcon, TrophyIcon, PersonSimpleRunIcon, PawPrintIcon,
  StarIcon, ShieldIcon, TargetIcon, CheckCircleIcon, DropIcon, MapPinIcon,
  PersonSimpleIcon, HandPalmIcon, PersonSimpleSwimIcon, PersonSimpleTaiChiIcon, BicycleIcon,
  TShirtIcon, DiamondIcon, ShieldCheckIcon, CircleIcon, UsersIcon, HeartIcon, MegaphoneIcon,
  MedalIcon, GearIcon, CalendarIcon, ChartBarIcon, SkullIcon, LightbulbIcon, ClipboardIcon,
  PlusCircleIcon, SparkleIcon, LeafIcon, CaretDownIcon, ScalesIcon, TrendUpIcon, EyeIcon,
} from 'phosphor-react-native';

const EMOJI_TO_ICON = {
  '🔥': { Icon: FireIcon, color: '#F97316' },
  '⚡': { Icon: LightningIcon, color: '#FCD34D' },
  '💪': { Icon: BarbellIcon, color: '#3B82F6' },
  '🏆': { Icon: TrophyIcon, color: '#F59E0B' },
  '🏃': { Icon: PersonSimpleRunIcon, color: '#10B981' },
  '🦁': { Icon: PawPrintIcon, color: '#F97316' },
  '👑': { Icon: StarIcon, color: '#F59E0B' },
  '⚔️': { Icon: ShieldIcon, color: '#EF4444' },
  '⚔': { Icon: ShieldIcon, color: '#EF4444' },
  '🎯': { Icon: TargetIcon, color: '#EC4899' },
  '⭐': { Icon: StarIcon, color: '#FCD34D' },
  '✅': { Icon: CheckCircleIcon, color: '#10B981' },
  '💧': { Icon: DropIcon, color: '#38BDF8' },
  '📍': { Icon: MapPinIcon, color: '#EF4444' },
  '🏋️': { Icon: BarbellIcon, color: '#8B5CF6' },
  '🏋': { Icon: BarbellIcon, color: '#8B5CF6' },
  '🦵': { Icon: PersonSimpleIcon, color: '#EC4899' },
  '🤸': { Icon: PersonSimpleIcon, color: '#F59E0B' },
  '🥊': { Icon: HandPalmIcon, color: '#EF4444' },
  '🏊': { Icon: PersonSimpleSwimIcon, color: '#06B6D4' },
  '🧘': { Icon: PersonSimpleTaiChiIcon, color: '#A78BFA' },
  '🚴': { Icon: BicycleIcon, color: '#10B981' },
  '🎽': { Icon: TShirtIcon, color: '#3B82F6' },
  '💎': { Icon: DiamondIcon, color: '#06B6D4' },
  '🛡': { Icon: ShieldCheckIcon, color: '#A78BFA' },
  '🛡️': { Icon: ShieldCheckIcon, color: '#A78BFA' },
  '🔴': { Icon: CircleIcon, color: '#EF4444' },
  '🤝': { Icon: UsersIcon, color: '#3B82F6' },
  '😤': { Icon: CircleIcon, color: '#EF4444' },
  '❤': { Icon: HeartIcon, color: '#EF4444' },
  '📣': { Icon: MegaphoneIcon, color: '#F59E0B' },
  '🏅': { Icon: MedalIcon, color: '#F59E0B' },
  '⚙': { Icon: GearIcon, color: '#94A3B8' },
  '📅': { Icon: CalendarIcon, color: '#3B82F6' },
  '📊': { Icon: ChartBarIcon, color: '#10B981' },
  '👻': { Icon: SkullIcon, color: '#94A3B8' },
  '💡': { Icon: LightbulbIcon, color: '#FCD34D' },
  '📋': { Icon: ClipboardIcon, color: '#8B5CF6' },
  '➕': { Icon: PlusCircleIcon, color: '#10B981' },
  '🎉': { Icon: SparkleIcon, color: '#F59E0B' },
  '✨': { Icon: SparkleIcon, color: '#FCD34D' },
  '🌟': { Icon: StarIcon, color: '#FCD34D' },
  '🌵': { Icon: LeafIcon, color: '#10B981' },
  '🔻': { Icon: CaretDownIcon, color: '#EF4444' },
  '⚖': { Icon: ScalesIcon, color: '#3B82F6' },
  '📈': { Icon: TrendUpIcon, color: '#10B981' },
  '👀': { Icon: EyeIcon, color: '#A78BFA' },
  '👹': { Icon: SkullIcon, color: '#EF4444' },
};

export default function EmojiIcon({ emoji, size = 24, style, glow = true, weight = 'fill' }) {
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
      <iconData.Icon size={size} color={iconData.color} weight={weight} />
    </View>
  );
}
