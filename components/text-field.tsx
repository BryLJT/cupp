import React from 'react';
import { StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

import { colors, fonts, radii, space } from '@/constants/theme';
import { AppText } from './app-text';

export interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

/** Labeled text input. The label is always visible — never placeholder-only. */
export function TextField({ label, error, containerStyle, style, ...rest }: TextFieldProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      <AppText variant="label" style={styles.label}>
        {label}
      </AppText>
      <TextInput
        {...rest}
        accessibilityLabel={label}
        placeholderTextColor={colors.taupe}
        style={[styles.input, style]}
      />
      {error ? (
        <AppText variant="caption" color={colors.accent} style={styles.error}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    marginBottom: space(1.5),
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.control,
    backgroundColor: colors.surface,
    color: colors.ink,
    fontFamily: fonts.sansRegular,
    fontSize: 15,
    paddingHorizontal: space(3),
    paddingVertical: space(2.5),
  },
  error: {
    marginTop: space(1),
  },
});
