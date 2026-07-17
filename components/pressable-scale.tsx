import React from 'react';
import { Pressable, type GestureResponderEvent, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  /** Scale factor to animate to on press-in. Defaults to 0.97. */
  scaleTo?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * The canonical pressable used by every other pressable primitive in the app.
 * Gives immediate press-down feedback (scale down on press-IN, not on release)
 * per the interaction spec: 100-160ms, ease-out.
 */
export function PressableScale({
  scaleTo = 0.97,
  style,
  onPressIn,
  onPressOut,
  ...rest
}: PressableScaleProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (event: GestureResponderEvent) => {
    scale.value = withTiming(scaleTo, { duration: 120, easing: Easing.out(Easing.ease) });
    onPressIn?.(event);
  };

  const handlePressOut = (event: GestureResponderEvent) => {
    scale.value = withTiming(1, { duration: 120, easing: Easing.out(Easing.ease) });
    onPressOut?.(event);
  };

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[animatedStyle, style]}
    />
  );
}
