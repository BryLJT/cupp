import React from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, space } from '@/constants/theme';

export type ScreenEdge = 'top' | 'bottom' | 'left' | 'right';

export interface ScreenProps {
  children?: React.ReactNode;
  /** Wraps children in a ScrollView when true. Defaults to false. */
  scroll?: boolean;
  /**
   * Makes the ScrollView give way to the keyboard (iOS) so focused inputs near
   * the bottom aren't covered. Opt-in per screen; only meaningful with scroll.
   */
  keyboard?: boolean;
  /** Applies horizontal padding of space(4). Defaults to true. */
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Which safe-area insets to honor as padding. Defaults to ['top']. */
  edges?: ScreenEdge[];
}

/**
 * Safe-area page wrapper shared by every screen. Background is colors.ground.
 */
export function Screen({
  children,
  scroll = false,
  keyboard = false,
  padded = true,
  style,
  contentContainerStyle,
  edges = ['top'],
}: ScreenProps) {
  const insets = useSafeAreaInsets();

  const insetStyle: ViewStyle = {
    paddingTop: edges.includes('top') ? insets.top : 0,
    paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: edges.includes('left') ? insets.left : 0,
    paddingRight: edges.includes('right') ? insets.right : 0,
  };

  const paddedStyle: ViewStyle = padded ? { paddingHorizontal: space(4) } : {};

  if (scroll) {
    return (
      <View style={[styles.root, insetStyle, style]}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={keyboard}
          contentContainerStyle={[paddedStyle, contentContainerStyle]}
        >
          {children}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.root, insetStyle, paddedStyle, style, contentContainerStyle]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.ground,
  },
});
