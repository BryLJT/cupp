import { Redirect, Stack } from 'expo-router';
import { View } from 'react-native';

import { colors } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';

export default function AuthLayout() {
  const { session, loading } = useSession();

  if (loading) return <View style={{ flex: 1, backgroundColor: colors.ground }} />;

  // Already signed in → send to the app.
  if (session) return <Redirect href="/(tabs)" />;

  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ground } }} />;
}
