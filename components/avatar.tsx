import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fonts } from '@/constants/theme';
import { AppText } from './app-text';

export interface AvatarProps {
  /** Displayable URL; when null, initials are shown. */
  url?: string | null;
  /** Used to derive initials when there's no image. */
  name?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

function initialsOf(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/[\s.]+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Round profile image with an initials fallback. */
export function Avatar({ url, name, size = 32, style }: AvatarProps) {
  const dimensions: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={[styles.base, dimensions, style] as StyleProp<ImageStyle>}
        contentFit="cover"
        accessibilityIgnoresInvertColors
      />
    );
  }

  return (
    <View style={[styles.base, styles.fallback, dimensions, style]}>
      <AppText
        style={{ fontFamily: fonts.sansSemiBold, fontSize: Math.max(10, size * 0.38) }}
        color={colors.taupe}
      >
        {initialsOf(name)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.ground,
    borderWidth: 1,
    borderColor: colors.line,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
