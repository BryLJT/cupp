import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, space } from '@/constants/theme';
import { AppText } from './app-text';
import { PressableScale } from './pressable-scale';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_META: Record<string, { label: string; icon: IoniconName }> = {
  index: { label: 'Feed', icon: 'reader-outline' },
  search: { label: 'Search', icon: 'search-outline' },
  create: { label: 'Create', icon: 'add-circle-outline' },
  profile: { label: 'You', icon: 'person-outline' },
};

/**
 * Custom 5-slot tab bar: Feed · Search · [raised Camera] · Create · Profile.
 * The camera slot isn't a tab route — it opens the scan flow as a modal.
 */
export function CuppTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const routeByName = Object.fromEntries(state.routes.map((r, i) => [r.name, { route: r, index: i }]));

  const renderTab = (name: string) => {
    const entry = routeByName[name];
    const meta = TAB_META[name];
    if (!entry || !meta) return null;
    const focused = state.index === entry.index;

    const onPress = () => {
      // Create opens the log form as a modal rather than becoming a focused tab.
      if (name === 'create') {
        router.push('/log/new');
        return;
      }
      const event = navigation.emit({ type: 'tabPress', target: entry.route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) {
        navigation.navigate(entry.route.name);
      }
    };

    return (
      <PressableScale
        key={name}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={meta.label}
        scaleTo={0.9}
        style={styles.tab}
      >
        <Ionicons name={meta.icon} size={22} color={focused ? colors.ink : colors.taupe} />
        <AppText variant="label" color={focused ? colors.ink : colors.taupe} style={styles.tabLabel}>
          {meta.label}
        </AppText>
      </PressableScale>
    );
  };

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom || space(2) }]}>
      {renderTab('index')}
      {renderTab('search')}

      <View style={styles.cameraSlot}>
        <PressableScale
          onPress={() => router.push('/scan')}
          accessibilityRole="button"
          accessibilityLabel="Scan a coffee bag"
          scaleTo={0.92}
          style={styles.cameraButton}
        >
          <Ionicons name="camera" size={26} color={colors.onAccent} />
        </PressableScale>
      </View>

      {renderTab('create')}
      {renderTab('profile')}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: space(2),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: space(1),
  },
  tabLabel: {
    letterSpacing: 0.2,
  },
  cameraSlot: {
    flex: 1,
    alignItems: 'center',
  },
  cameraButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
    borderWidth: 3,
    borderColor: colors.surface,
  },
});
