import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, View } from 'react-native';

import { Button, PressableScale, ProfileView, Screen, colors, space } from '@/components';
import { useSession } from '@/hooks/use-session';
import { repo, type Log, type Profile, type ProfileStats } from '@/lib/data';

export default function ProfileScreen() {
  const { session } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<ProfileStats>({ logCount: 0, followerCount: 0, followingCount: 0 });
  const [logs, setLogs] = useState<Log[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!session) return;
      const load = async () => {
        const [p, s, l] = await Promise.all([
          repo.getProfile(session.userId),
          repo.getProfileStats(session.userId),
          repo.logsByUser(session.userId, { includePrivate: true }),
        ]);
        setProfile(p);
        setStats(s);
        setLogs(l);
      };
      load();
    }, [session])
  );

  const confirmSignOut = () => {
    Alert.alert('Sign out', 'Sign out of Cupp?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => repo.signOut() },
    ]);
  };

  if (!profile) return <Screen />;

  return (
    <Screen padded={false}>
      <ProfileView
        profile={profile}
        stats={stats}
        logs={logs}
        emptyMessage="Scan a bag or tap Create to log your first coffee."
        headerRight={
          <PressableScale
            onPress={confirmSignOut}
            accessibilityRole="button"
            accessibilityLabel="Account settings"
            hitSlop={8}
            style={{ padding: space(1) }}
          >
            <Ionicons name="settings-outline" size={22} color={colors.ink} />
          </PressableScale>
        }
        action={
          <View>
            <Button title="Sign out" variant="danger" onPress={confirmSignOut} />
          </View>
        }
      />
    </Screen>
  );
}
