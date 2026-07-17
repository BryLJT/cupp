import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fonts, radii, space } from '@/constants/theme';
import { AppText } from './app-text';
import { PressableScale } from './pressable-scale';

export interface SegmentedOption {
  label: string;
  value: string;
}

export type SegmentedVariant = 'segment' | 'chips';

export interface SegmentedProps {
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  style?: StyleProp<ViewStyle>;
  /** 'segment' = boxed equal-width row. 'chips' = pill row. Defaults to 'segment'. */
  variant?: SegmentedVariant;
}

/** "Pick one of N" control: brew method selector, Public/Private toggle, feed tabs. */
export function Segmented({ options, value, onChange, style, variant = 'segment' }: SegmentedProps) {
  const isChips = variant === 'chips';

  return (
    <View style={[styles.row, isChips ? styles.chipsRow : null, style]}>
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <PressableScale
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            style={[
              isChips ? styles.chipSegment : styles.segment,
              selected ? styles.selected : styles.unselected,
            ]}
          >
            <AppText
              variant="caption"
              color={selected ? colors.ink : colors.taupe}
              style={selected ? { fontFamily: fonts.sansSemiBold } : null}
            >
              {option.label}
            </AppText>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: space(2),
  },
  chipsRow: {
    flexWrap: 'wrap',
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radii.control,
    paddingVertical: space(2.5),
  },
  chipSegment: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radii.chip,
    paddingVertical: space(1.5),
    paddingHorizontal: space(3),
  },
  selected: {
    borderColor: colors.ink,
  },
  unselected: {
    borderColor: colors.line,
  },
});
