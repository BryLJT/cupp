import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fonts, radii, space } from '@/constants/theme';
import { AppText } from './app-text';
import { PressableScale } from './pressable-scale';

export type ChipVariant = 'default' | 'read';

export interface ChipProps {
  label: string;
  selected?: boolean;
  variant?: ChipVariant;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/** Pill used for filter values and "read ✓" grounding chips. */
export function Chip({ label, selected = false, variant = 'default', onPress, style, accessibilityLabel }: ChipProps) {
  const isRead = variant === 'read';
  const borderColor = isRead ? colors.accent : selected ? colors.ink : colors.line;
  const textColor = isRead ? colors.accent : selected ? colors.ink : colors.taupe;

  const content = (
    <AppText
      variant="caption"
      color={textColor}
      style={selected ? { fontFamily: fonts.sansSemiBold } : null}
    >
      {label}
    </AppText>
  );

  if (onPress) {
    return (
      <PressableScale
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ selected }}
        style={[styles.chip, { borderColor }, style]}
      >
        {content}
      </PressableScale>
    );
  }

  return <View style={[styles.chip, { borderColor }, style]}>{content}</View>;
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: radii.chip,
    borderWidth: 1,
    paddingVertical: space(1.5),
    paddingHorizontal: space(3),
    alignSelf: 'flex-start',
    backgroundColor: 'transparent',
  },
});
