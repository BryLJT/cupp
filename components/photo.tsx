import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, View, type DimensionValue, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/constants/theme';

export interface PhotoProps {
  url?: string | null;
  height?: DimensionValue;
  style?: StyleProp<ViewStyle>;
}

/**
 * Bag-photo surface with a coffee-bag placeholder when no image resolves
 * (the demo repo never resolves a real URL, so this is the common case).
 */
export function Photo({ url, height = 180, style }: PhotoProps) {
  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={[styles.base, { height }, style] as StyleProp<ImageStyle>}
        contentFit="cover"
        accessibilityIgnoresInvertColors
      />
    );
  }

  return (
    <View style={[styles.base, styles.placeholder, { height }, style]}>
      <Ionicons name="cafe-outline" size={28} color={colors.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    backgroundColor: colors.ground,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
