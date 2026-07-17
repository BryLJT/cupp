import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, space } from '@/constants/theme';
import { AppText } from './app-text';
import { PressableScale } from './pressable-scale';

export interface FieldRowProps {
  label: string;
  value?: string | null;
  placeholder?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Form/detail row: uppercase key label, value below, optional right accessory. */
export function FieldRow({ label, value, placeholder, right, onPress, style }: FieldRowProps) {
  const hasValue = value != null && value !== '';

  const content = (
    <View style={[styles.row, style]}>
      <View style={styles.textColumn}>
        <AppText variant="label">{label}</AppText>
        {hasValue ? (
          <AppText variant="bodyMedium" style={styles.value}>
            {value}
          </AppText>
        ) : (
          <AppText variant="body" color={colors.taupe} style={[styles.value, styles.placeholder]}>
            {placeholder}
          </AppText>
        )}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );

  if (onPress) {
    return (
      <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={styles.pressable}>
        {content}
      </PressableScale>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  pressable: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.control,
    backgroundColor: colors.surface,
    paddingHorizontal: space(3),
    paddingVertical: space(2.5),
  },
  textColumn: {
    flex: 1,
  },
  value: {
    marginTop: space(1),
  },
  placeholder: {
    fontStyle: 'italic',
  },
  right: {
    marginLeft: space(2),
  },
});
