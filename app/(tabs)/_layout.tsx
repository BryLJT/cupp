import { Tabs } from 'expo-router';

// Placeholder tabs layout — replaced by WP8 (5-slot tab bar).
export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Feed' }} />
    </Tabs>
  );
}
