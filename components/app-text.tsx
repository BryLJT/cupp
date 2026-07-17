import React from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';

import { colors, fonts } from '@/constants/theme';

export type AppTextVariant =
  | 'display'
  | 'title'
  | 'heading'
  | 'body'
  | 'bodyMedium'
  | 'bodySemiBold'
  | 'caption'
  | 'label'
  | 'wordmark'
  | 'bigNumber';

export interface AppTextProps extends TextProps {
  variant?: AppTextVariant;
  /** Overrides the variant's default color. */
  color?: string;
}

const variantStyles = StyleSheet.create({
  display: {
    fontFamily: fonts.serifSemiBold,
    fontSize: 28,
    lineHeight: 34,
    color: colors.ink,
  },
  title: {
    fontFamily: fonts.serifSemiBold,
    fontSize: 22,
    lineHeight: 28,
    color: colors.ink,
  },
  heading: {
    fontFamily: fonts.serifSemiBold,
    fontSize: 17,
    lineHeight: 22,
    color: colors.ink,
  },
  wordmark: {
    fontFamily: fonts.serifBold,
    fontSize: 20,
    lineHeight: 22,
    color: colors.ink,
  },
  bigNumber: {
    fontFamily: fonts.serifSemiBold,
    fontSize: 20,
    lineHeight: 24,
    color: colors.ink,
  },
  body: {
    fontFamily: fonts.sansRegular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink,
  },
  bodyMedium: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink,
  },
  bodySemiBold: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink,
  },
  caption: {
    fontFamily: fonts.sansRegular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.taupe,
  },
  label: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 11,
    lineHeight: 14,
    color: colors.taupe,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});

/**
 * Default text component for the whole app so the loaded font families and
 * type scale apply consistently. Prefer this over the raw RN <Text>.
 */
export function AppText({ variant = 'body', color, style, ...rest }: AppTextProps) {
  return (
    <Text
      {...rest}
      style={[variantStyles[variant], color ? { color } : null, style]}
    />
  );
}
