import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { colors, space } from '@/constants/theme';
import type { Log, Profile, ProfileStats } from '@/lib/data';
import { AppText } from './app-text';
import { Avatar } from './avatar';
import { Card } from './card';
import { EmptyState } from './empty-state';
import { Photo } from './photo';
import { beanTitle } from './log-card';

export interface ProfileViewProps {
  profile: Profile;
  stats: ProfileStats;
  logs: Log[];
  /** Action area under the stats (sign out for self, follow button for others). */
  action?: React.ReactNode;
  /** Header accessory in the top-right (e.g. a settings gear for self). */
  headerRight?: React.ReactNode;
  emptyMessage?: string;
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <AppText variant="bigNumber">{value}</AppText>
      <AppText variant="label">{label}</AppText>
    </View>
  );
}

interface Cell {
  key: string;
  log: Log | null; // null = spacer to keep the last row left-aligned
}

/** Shared profile layout: identity, stats, an action slot, and a 3-up log grid. */
export function ProfileView({ profile, stats, logs, action, headerRight, emptyMessage }: ProfileViewProps) {
  const router = useRouter();

  const cells: Cell[] = logs.map((log) => ({ key: log.id, log }));
  const remainder = cells.length % 3;
  if (remainder !== 0) {
    for (let i = 0; i < 3 - remainder; i++) cells.push({ key: `spacer-${i}`, log: null });
  }

  return (
    <FlatList
      data={logs.length === 0 ? [] : cells}
      keyExtractor={(item) => item.key}
      numColumns={3}
      columnWrapperStyle={styles.gridRow}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.topRow}>
            <AppText variant="bodySemiBold" style={styles.handle}>
              {profile.username}
            </AppText>
            {headerRight}
          </View>

          <View style={styles.identity}>
            <Avatar url={profile.avatarUrl} name={profile.displayName ?? profile.username} size={56} />
            <View style={styles.identityText}>
              {profile.displayName ? <AppText variant="heading">{profile.displayName}</AppText> : null}
              {profile.bio ? (
                <AppText variant="caption" style={styles.bio}>
                  {profile.bio}
                </AppText>
              ) : null}
            </View>
          </View>

          <View style={styles.stats}>
            <Stat value={stats.logCount} label="logs" />
            <Stat value={stats.followerCount} label="followers" />
            <Stat value={stats.followingCount} label="following" />
          </View>

          {action ? <View style={styles.action}>{action}</View> : null}

          <AppText variant="label" style={styles.sectionLabel}>
            Logs
          </AppText>
        </View>
      }
      renderItem={({ item }) => {
        if (!item.log) return <View style={styles.cell} />;
        const log = item.log;
        return (
          <Card
            style={styles.cell}
            onPress={() => router.push({ pathname: '/log/[id]', params: { id: log.id } })}
            accessibilityLabel={`Open ${beanTitle(log)}`}
          >
            <Photo url={log.photoUrl} height={104} />
          </Card>
        );
      }}
      ListEmptyComponent={<EmptyState title="No logs yet" message={emptyMessage} />}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: space(4),
    paddingBottom: space(6),
    flexGrow: 1,
  },
  header: {
    gap: space(4),
    paddingBottom: space(2),
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: space(1),
  },
  handle: {
    fontSize: 16,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(4),
  },
  identityText: {
    flex: 1,
    gap: space(1),
  },
  bio: {
    lineHeight: 18,
  },
  stats: {
    flexDirection: 'row',
    gap: space(2),
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: space(1),
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: space(2),
    paddingVertical: space(2.5),
    backgroundColor: colors.surface,
  },
  action: {
    gap: space(2),
  },
  sectionLabel: {
    marginTop: space(1),
  },
  gridRow: {
    gap: space(2),
    marginBottom: space(2),
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
  },
});
