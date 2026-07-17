import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/constants/theme';
import { PressableScale } from './pressable-scale';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export interface StarsProps {
  /** Overall rating, 0-5. */
  value: number;
  /** Provide to make the control interactive (input mode). */
  onChange?: (value: number) => void;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

const STAR_INDICES = [0, 1, 2, 3, 4];

/** Overall rating: 0-5 stars. Display-only when onChange is omitted. */
export function Stars({ value, onChange, size = 18, style }: StarsProps) {
  const isInteractive = typeof onChange === 'function';

  return (
    <View
      style={[styles.row, style]}
      accessibilityRole={isInteractive ? 'adjustable' : undefined}
      accessibilityLabel={isInteractive ? `Overall rating, ${value} of 5` : `Overall rating, ${value} of 5 stars`}
    >
      {STAR_INDICES.map((index) => {
        const filled = index < value;
        const icon: IoniconName = filled ? 'star' : 'star-outline';
        const n = index + 1;

        if (isInteractive) {
          return (
            <PressableScale
              key={index}
              onPress={() => onChange?.(n)}
              accessibilityRole="button"
              accessibilityLabel={`Rate ${n} star${n === 1 ? '' : 's'}`}
              hitSlop={4}
              style={styles.starButton}
            >
              <Ionicons name={icon} size={size} color={colors.accent} />
            </PressableScale>
          );
        }

        return (
          <View key={index} style={styles.starButton}>
            <Ionicons name={icon} size={size} color={colors.accent} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starButton: {
    marginRight: 2,
  },
});
