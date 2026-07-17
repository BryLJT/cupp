import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/constants/theme';
import { AppText } from './app-text';
import { PressableScale } from './pressable-scale';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export interface DotsRatingProps {
  /** Characteristic name, e.g. "Strength". Rendered to the left when provided. */
  label?: string;
  /** 0-max, 0 = unset. */
  value: number;
  onChange?: (value: number) => void;
  max?: number;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/** One cupping characteristic on a 1-5 filled-dot scale. */
export function DotsRating({ label, value, onChange, max = 5, size = 14, style }: DotsRatingProps) {
  const isInteractive = typeof onChange === 'function';
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
                hitSlop={6}
                style={styles.dot}
              >
                <Ionicons name={icon} size={size} color={filled ? colors.accent : colors.line} />
              </PressableScale>
            );
          }

          return (
            <View key={index} style={styles.dot}>
              <Ionicons name={icon} size={size} color={filled ? colors.accent : colors.line} />
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
  dot: {
    marginLeft: 4,
  },
});
