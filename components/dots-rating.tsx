import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/constants/theme';
import { AppText } from './app-text';
import { PressableScale } from './pressable-scale';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

// Interactive dots must meet the 44pt platform minimum touch target, so each
// pressable dot pads its icon out to 44x44. Display-only dots stay compact
// for cards and detail rows.
const TOUCH_TARGET = 44;
const INTERACTIVE_ICON_SIZE = 20;
const DISPLAY_ICON_SIZE = 14;

export interface DotsRatingProps {
  /** Characteristic name, e.g. "Strength". Rendered to the left when provided. */
  label?: string;
  /** 0-max, 0 = unset. */
  value: number;
  onChange?: (value: number) => void;
  max?: number;
  /** Icon size override. Defaults to 20 when interactive, 14 for display. */
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/** One cupping characteristic on a 1-5 filled-dot scale. */
export function DotsRating({ label, value, onChange, max = 5, size, style }: DotsRatingProps) {
  const isInteractive = typeof onChange === 'function';
  const iconSize = size ?? (isInteractive ? INTERACTIVE_ICON_SIZE : DISPLAY_ICON_SIZE);
  const touchPadding = Math.max(0, (TOUCH_TARGET - iconSize) / 2);
  const indices = Array.from({ length: max }, (_, i) => i);
  const accessibilityLabel = label ? `${label} rating, ${value} of ${max}` : `Rating, ${value} of ${max}`;

  return (
    <View
      style={[styles.row, style]}
      accessibilityRole={isInteractive ? 'adjustable' : undefined}
      accessibilityLabel={isInteractive ? accessibilityLabel : undefined}
    >
      {label ? (
        <View style={styles.labelContainer}>
          <AppText variant="body">{label}</AppText>
        </View>
      ) : null}
      <View style={styles.dots}>
        {indices.map((index) => {
          const filled = index < value;
          const icon: IoniconName = filled ? 'ellipse' : 'ellipse-outline';
          const n = index + 1;

          if (isInteractive) {
            return (
              <PressableScale
                key={index}
                onPress={() => onChange?.(n)}
                accessibilityRole="button"
                accessibilityLabel={`Set ${label ?? 'rating'} to ${n}`}
                style={{ padding: touchPadding }}
              >
                <Ionicons name={icon} size={iconSize} color={filled ? colors.accent : colors.line} />
              </PressableScale>
            );
          }

          return (
            <View key={index} style={styles.displayDot}>
              <Ionicons name={icon} size={iconSize} color={filled ? colors.accent : colors.line} />
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  labelContainer: {
    flex: 1,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  displayDot: {
    marginLeft: 4,
  },
});
