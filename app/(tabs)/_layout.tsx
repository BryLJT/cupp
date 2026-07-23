import { Redirect, Tabs } from 'expo-router';
import { View } from 'react-native';

import { CuppTabBar } from '@/components/tab-bar';
import { colors } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';

export default function TabLayout() {
  const { session, loading } = useSession();

  if (loading) return <View style={{ flex: 1, backgroundColor: colors.ground }} />;

  // Not signed in → gate to auth.
  if (!session) return <Redirect href="/(auth)/sign-in" />;

  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.ground } }}
      tabBar={(props) => <CuppTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: 'Feed' }} />
      <Tabs.Screen name="search" options={{ title: 'Search' }} />
      <Tabs.Screen name="create" options={{ title: 'Create' }} />
      <Tabs.Screen name="profile" options={{ title: 'You' }} />
    </Tabs>
  );
}
