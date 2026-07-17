import React from 'react';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii } from '@/constants/theme';
import { AppText } from './app-text';
import { PressableScale } from './pressable-scale';

export type ButtonVariant = 'primary' | 'ghost' | 'danger';

export interface ButtonProps {
  title?: string;
  children?: React.ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  /** Optional leading icon, rendered before the label. */
  icon?: React.ReactNode;
}

/** Primary action control. One accent (primary) per screen is a caller concern. */
export function Button({
  title,
  children,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  accessibilityLabel,
  style,
  icon,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const textColor = variant === 'primary' ? colors.onAccent : variant === 'danger' ? colors.accent : colors.ink;
  const indicatorColor = variant === 'primary' ? colors.onAccent : colors.accent;

  return (
    <PressableScale
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: isDisabled }}
      style={[
        styles.base,
        variantStyles[variant],
        isDisabled ? styles.disabled : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={indicatorColor} />
      ) : (
        <View style={styles.content}>
          {icon ? <View style={styles.icon}>{icon}</View> : null}
          {title ? (
            <AppText variant="bodySemiBold" color={textColor}>
              {title}
            </AppText>
          ) : (
            children
          )}
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 48,
    borderRadius: radii.control,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 8,
  },
  disabled: {
    opacity: 0.5,
  },
});

const variantStyles = StyleSheet.create({
  primary: {
    backgroundColor: colors.accent,
    borderWidth: 0,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.line,
  },
  danger: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.line,
  },
});
