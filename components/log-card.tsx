import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { colors, space } from '@/constants/theme';
import { repo } from '@/lib/data';
import type { Log } from '@/lib/data';
import { AppText } from './app-text';
import { Avatar } from './avatar';
import { Card } from './card';
import { Chip } from './chip';
import { Photo } from './photo';
import { PressableScale } from './pressable-scale';
import { Stars } from './stars';

export interface LogCardProps {
  log: Log;
  onPress: () => void;
  onAuthorPress?: () => void;
}

/** Coffee identity line: "Huila · Decaf" style, falling back gracefully. */
export function beanTitle(log: Log): string {
  const name = log.coffeeName ?? log.roaster ?? 'Untitled coffee';
  return log.decaf ? `${name} · Decaf` : name;
}

export function originLine(log: Log): string {
  const parts = [log.roaster, log.originCountry].filter(Boolean);
  return parts.join(' — ');
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const day = 86_400_000;
  if (diff < day) return 'Today';
  if (diff < 2 * day) return 'Yesterday';
  const days = Math.floor(diff / day);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** The feed post: author header, photo, coffee identity, rating, brew, social row. */
export function LogCard({ log, onPress, onAuthorPress }: LogCardProps) {
  const [liked, setLiked] = useState(log.likedByMe);
  const [likeCount, setLikeCount] = useState(log.likeCount);

  const toggleLike = async () => {
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => Math.max(0, c + (next ? 1 : -1)));
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    try {
      if (next) await repo.like(log.id);
      else await repo.unlike(log.id);
    } catch {
      // revert on failure
      setLiked(!next);
      setLikeCount((c) => Math.max(0, c + (next ? -1 : 1)));
    }
  };

  const brewChips = [log.method, log.doseG && log.yieldG ? `${log.doseG}g : ${log.yieldG}g` : null].filter(
    (v): v is string => Boolean(v)
  );

  return (
    <Card style={styles.card}>
      <PressableScale
        onPress={onAuthorPress}
        disabled={!onAuthorPress}
        accessibilityRole={onAuthorPress ? 'button' : undefined}
        accessibilityLabel={`View ${log.author.username}`}
        scaleTo={0.99}
        style={styles.header}
      >
        <Avatar url={log.author.avatarUrl} name={log.author.displayName ?? log.author.username} size={28} />
        <View style={styles.headerText}>
          <AppText variant="bodySemiBold" style={styles.username}>
            {log.author.username}
          </AppText>
        </View>
        {log.visibility === 'private' ? (
          <Ionicons name="lock-closed" size={13} color={colors.taupe} style={styles.lock} />
        ) : null}
        <AppText variant="caption">{relativeTime(log.createdAt)}</AppText>
      </PressableScale>

      <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={`Open ${beanTitle(log)}`} scaleTo={0.99}>
        <Photo url={log.photoUrl} height={150} />
        <View style={styles.body}>
          <View style={styles.identityRow}>
            <View style={styles.identity}>
              <AppText variant="heading" numberOfLines={1}>
                {beanTitle(log)}
              </AppText>
              <AppText variant="caption" numberOfLines={1}>
                {originLine(log)}
              </AppText>
            </View>
            <Stars value={log.ratings.overall ?? 0} size={15} />
          </View>

          {brewChips.length > 0 ? (
            <View style={styles.chips}>
              {brewChips.map((c) => (
                <Chip key={c} label={c} />
              ))}
            </View>
          ) : null}

          {log.notes ? (
            <AppText variant="caption" style={styles.notes} numberOfLines={2}>
              “{log.notes}”
            </AppText>
          ) : null}
        </View>
      </PressableScale>

      <View style={styles.social}>
        <PressableScale
          onPress={toggleLike}
          accessibilityRole="button"
          accessibilityLabel={liked ? 'Unlike' : 'Like'}
          hitSlop={8}
          style={styles.socialItem}
        >
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={18} color={liked ? colors.accent : colors.taupe} />
          <AppText variant="caption" color={liked ? colors.accent : colors.taupe} style={styles.count}>
            {likeCount}
          </AppText>
        </PressableScale>
        <PressableScale
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel="View comments"
          hitSlop={8}
          style={styles.socialItem}
        >
          <Ionicons name="chatbubble-outline" size={17} color={colors.taupe} />
          <AppText variant="caption" style={styles.count}>
            {log.commentCount}
          </AppText>
        </PressableScale>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: space(4),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: space(2.5),
    gap: space(2),
  },
  headerText: {
    flex: 1,
  },
  username: {
    fontSize: 13,
  },
  lock: {
    marginRight: space(1),
  },
  body: {
    padding: space(3),
    gap: space(2),
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space(2),
  },
  identity: {
    flex: 1,
    gap: space(0.5),
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space(1.5),
  },
  notes: {
    fontStyle: 'italic',
  },
  social: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(5),
    paddingHorizontal: space(3),
    paddingBottom: space(3),
  },
  socialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1.5),
  },
  count: {
    marginTop: 1,
  },
});
