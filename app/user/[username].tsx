import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, EmptyState, PressableScale, ProfileView, Screen, colors, space } from '@/components';
import { useSession } from '@/hooks/use-session';
import { repo, type Log, type Profile, type ProfileStats } from '@/lib/data';

export default function UserProfileScreen() {
  const router = useRouter();
  const { session } = useSession();
  const { username } = useLocalSearchParams<{ username: string }>();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<ProfileStats>({ logCount: 0, followerCount: 0, followingCount: 0 });
  const [logs, setLogs] = useState<Log[]>([]);
  const [following, setFollowing] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!username) return;
      const load = async () => {
        const p = await repo.getProfileByUsername(username);
        if (!p) {
          setNotFound(true);
          return;
        }
        setProfile(p);
        const [s, l, f] = await Promise.all([
          repo.getProfileStats(p.id),
          repo.logsByUser(p.id),
          repo.isFollowing(p.id),
        ]);
        setStats(s);
        setLogs(l);
        setFollowing(f);
      };
      load();
    }, [username])
  );

  if (notFound) {
    return (
      <Screen edges={['top', 'bottom']}>
        <BackRow onBack={() => router.back()} />
        <EmptyState icon="person-outline" title="User not found" />
      </Screen>
    );
  }

  if (!profile) return <Screen edges={['top']} />;

  const isSelf = session?.userId === profile.id;

  const toggleFollow = async () => {
    const next = !following;
    setFollowing(next);
    setStats((s) => ({ ...s, followerCount: Math.max(0, s.followerCount + (next ? 1 : -1)) }));
    if (next) await repo.follow(profile.id);
    else await repo.unfollow(profile.id);
  };

  return (
    <Screen edges={['top', 'bottom']} padded={false}>
      <View style={styles.backRowPadded}>
        <PressableScale onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </PressableScale>
      </View>
      <ProfileView
        profile={profile}
        stats={stats}
        logs={logs}
        emptyMessage="No public logs yet."
        action={
          isSelf ? null : (
            <Button
              title={following ? 'Following' : 'Follow'}
              variant={following ? 'ghost' : 'primary'}
              onPress={toggleFollow}
            />
          )
        }
      />
    </Screen>
  );
}

function BackRow({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.backRowPadded}>
      <PressableScale onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8}>
        <Ionicons name="chevron-back" size={24} color={colors.ink} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  backRowPadded: {
    paddingHorizontal: space(4),
    paddingVertical: space(2),
  },
});
