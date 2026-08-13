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
  '⚡': { Icon: LightningIcon, color: '#FDE047' },
  '💪': { Icon: BarbellIcon, color: '#3B82F6' },
  '🏆': { Icon: TrophyIcon, color: '#FBBF24' },
  '🏃': { Icon: PersonSimpleRunIcon, color: '#10E88C' },
  '🦁': { Icon: PawPrintIcon, color: '#F97316' },
  '👑': { Icon: StarIcon, color: '#FBBF24' },
  '⚔️': { Icon: ShieldIcon, color: '#EF4444' },
  '⚔': { Icon: ShieldIcon, color: '#EF4444' },
  '🎯': { Icon: TargetIcon, color: '#EC4899' },
  '⭐': { Icon: StarIcon, color: '#FDE047' },
  '✅': { Icon: CheckCircleIcon, color: '#10E88C' },
  '💧': { Icon: DropIcon, color: '#38BDF8' },
  '📍': { Icon: MapPinIcon, color: '#EF4444' },
  '🏋️': { Icon: BarbellIcon, color: '#A855F7' },
  '🏋': { Icon: BarbellIcon, color: '#A855F7' },
  '🦵': { Icon: PersonSimpleIcon, color: '#EC4899' },
  '🤸': { Icon: PersonSimpleIcon, color: '#FBBF24' },
  '🥊': { Icon: HandPalmIcon, color: '#EF4444' },
  '🏊': { Icon: PersonSimpleSwimIcon, color: '#06B6D4' },
  '🧘': { Icon: PersonSimpleTaiChiIcon, color: '#C084FC' },
  '🚴': { Icon: BicycleIcon, color: '#10E88C' },
  '🎽': { Icon: TShirtIcon, color: '#3B82F6' },
  '💎': { Icon: DiamondIcon, color: '#06B6D4' },
  '🛡': { Icon: ShieldCheckIcon, color: '#C084FC' },
  '🛡️': { Icon: ShieldCheckIcon, color: '#C084FC' },
  '🔴': { Icon: CircleIcon, color: '#EF4444' },
  '🤝': { Icon: UsersIcon, color: '#3B82F6' },
  '😤': { Icon: CircleIcon, color: '#EF4444' },
  '❤': { Icon: HeartIcon, color: '#EF4444' },
  '📣': { Icon: MegaphoneIcon, color: '#FBBF24' },
  '🏅': { Icon: MedalIcon, color: '#FBBF24' },
  '⚙': { Icon: GearIcon, color: '#94A3B8' },
  '📅': { Icon: CalendarIcon, color: '#3B82F6' },
  '📊': { Icon: ChartBarIcon, color: '#10E88C' },
  '👻': { Icon: SkullIcon, color: '#94A3B8' },
  '💡': { Icon: LightbulbIcon, color: '#FDE047' },
  '📋': { Icon: ClipboardIcon, color: '#A855F7' },
  '➕': { Icon: PlusCircleIcon, color: '#10E88C' },
  '🎉': { Icon: SparkleIcon, color: '#FBBF24' },
  '✨': { Icon: SparkleIcon, color: '#FDE047' },
  '🌟': { Icon: StarIcon, color: '#FDE047' },
  '🌵': { Icon: LeafIcon, color: '#10E88C' },
  '🔻': { Icon: CaretDownIcon, color: '#EF4444' },
  '⚖': { Icon: ScalesIcon, color: '#3B82F6' },
  '📈': { Icon: TrendUpIcon, color: '#10E88C' },
  '👀': { Icon: EyeIcon, color: '#C084FC' },
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
