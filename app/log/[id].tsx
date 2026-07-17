import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';

import {
  AppText,
  Avatar,
  DotsRating,
  EmptyState,
  Photo,
  PressableScale,
  Screen,
  Stars,
  beanTitle,
  colors,
  radii,
  space,
} from '@/components';
import { useSession } from '@/hooks/use-session';
import { repo, type Comment, type Log } from '@/lib/data';

function KV({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.kvCell}>
      <AppText variant="label">{label}</AppText>
      <AppText variant="bodyMedium" style={styles.kvValue}>
        {value}
      </AppText>
    </View>
  );
}

export default function LogDetailScreen() {
  const router = useRouter();
  const { session } = useSession();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [log, setLog] = useState<Log | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState('');
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [notFound, setNotFound] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      const load = async () => {
        const found = await repo.getLog(id);
        if (!found) {
          setNotFound(true);
          return;
        }
        setLog(found);
        setLiked(found.likedByMe);
        setLikeCount(found.likeCount);
        setComments(await repo.listComments(id));
      };
      load();
    }, [id])
  );

  if (notFound) {
    return (
      <Screen edges={['top', 'bottom']}>
        <BackRow onBack={() => router.back()} />
        <EmptyState title="Log not found" message="It may have been removed." />
      </Screen>
    );
  }

  if (!log) return <Screen edges={['top']} />;

  const toggleLike = async () => {
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => Math.max(0, c + (next ? 1 : -1)));
    if (next) await repo.like(log.id);
    else await repo.unlike(log.id);
  };

  const submitComment = async () => {
    const body = draft.trim();
    if (!body) return;
    const c = await repo.addComment(log.id, body);
    setComments((prev) => [...prev, c]);
    setDraft('');
  };

  const ratio = log.doseG && log.yieldG ? `${log.doseG} g : ${log.yieldG} g` : '—';
  const isOwn = session?.userId === log.userId;

  return (
    <Screen edges={['top', 'bottom']} padded={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
        keyboardVerticalOffset={8}
      >
        <Screen scroll padded contentContainerStyle={styles.content}>
          <View style={styles.postHeader}>
            <PressableScale onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8}>
              <Ionicons name="chevron-back" size={24} color={colors.ink} />
            </PressableScale>
            <PressableScale
              onPress={() => router.push({ pathname: '/user/[username]', params: { username: log.author.username } })}
              accessibilityRole="button"
              accessibilityLabel={`View ${log.author.username}`}
              style={styles.authorChip}
            >
              <Avatar url={log.author.avatarUrl} name={log.author.displayName ?? log.author.username} size={24} />
              <AppText variant="bodySemiBold" style={styles.authorName}>
                {log.author.username}
              </AppText>
            </PressableScale>
            <View style={{ width: 24 }} />
          </View>

          <Photo url={log.photoUrl} height={200} style={styles.photo} />

          <View style={styles.identityRow}>
            <View style={styles.identity}>
              <AppText variant="title">{beanTitle(log)}</AppText>
              <AppText variant="caption">
                {[log.roaster, log.originCountry, log.originRegion].filter(Boolean).join(' — ')}
              </AppText>
            </View>
            <Stars value={log.ratings.overall ?? 0} size={18} />
          </View>

          <View style={styles.kvGrid}>
            <KV label="Method" value={log.method ?? '—'} />
            <KV label="Ratio" value={ratio} />
            <KV label="Process" value={log.process ?? '—'} />
            <KV label="Variety" value={log.variety ?? '—'} />
          </View>

          <View style={styles.characteristics}>
            <DotsRating label="Strength" value={log.ratings.strength ?? 0} />
            <DotsRating label="Acidity" value={log.ratings.acidity ?? 0} />
            <DotsRating label="Sweetness" value={log.ratings.sweetness ?? 0} />
            <DotsRating label="Bitterness" value={log.ratings.bitterness ?? 0} />
          </View>

          {log.notes ? (
            <View style={styles.notesBlock}>
              <AppText variant="label">{isOwn ? 'Your notes' : 'Their notes'}</AppText>
              <AppText variant="body" style={styles.notesText}>
                {log.notes}
              </AppText>
            </View>
          ) : null}

          {log.roasterTastingNotes.length > 0 ? (
            <View style={styles.notesBlock}>
              <AppText variant="label">Roaster says</AppText>
              <AppText variant="body" style={styles.notesText}>
                {log.roasterTastingNotes.join(' · ')}
              </AppText>
            </View>
          ) : null}

          <View style={styles.socialRow}>
            <PressableScale
              onPress={toggleLike}
              accessibilityRole="button"
              accessibilityLabel={liked ? 'Unlike' : 'Like'}
              style={styles.socialItem}
              hitSlop={8}
            >
              <Ionicons name={liked ? 'heart' : 'heart-outline'} size={20} color={liked ? colors.accent : colors.taupe} />
              <AppText variant="caption" color={liked ? colors.accent : colors.taupe}>
                {likeCount}
              </AppText>
            </PressableScale>
            <View style={styles.socialItem}>
              <Ionicons name="chatbubble-outline" size={18} color={colors.taupe} />
              <AppText variant="caption">{comments.length}</AppText>
            </View>
          </View>

          <View style={styles.comments}>
            {comments.map((c) => (
              <View key={c.id} style={styles.comment}>
                <Avatar url={c.author.avatarUrl} name={c.author.displayName ?? c.author.username} size={24} />
                <View style={styles.commentBody}>
                  <AppText variant="bodySemiBold" style={styles.commentAuthor}>
                    {c.author.username}
                  </AppText>
                  <AppText variant="body">{c.body}</AppText>
                </View>
              </View>
            ))}
          </View>
        </Screen>

        <View style={styles.commentBar}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Add a comment…"
            placeholderTextColor={colors.taupe}
            style={styles.commentInput}
            accessibilityLabel="Add a comment"
            returnKeyType="send"
            onSubmitEditing={submitComment}
          />
          <PressableScale
            onPress={submitComment}
            accessibilityRole="button"
            accessibilityLabel="Post comment"
            disabled={!draft.trim()}
            style={styles.sendButton}
          >
            <Ionicons name="arrow-up" size={20} color={colors.onAccent} />
          </PressableScale>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function BackRow({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.backRow}>
      <PressableScale onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8}>
        <Ionicons name="chevron-back" size={24} color={colors.ink} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingBottom: space(6),
    gap: space(3),
  },
  backRow: {
    paddingVertical: space(2),
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: space(1),
  },
  authorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2),
  },
  authorName: {
    fontSize: 13,
  },
  photo: {
    borderRadius: 10,
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
  kvGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space(2),
  },
  kvCell: {
    width: '48%',
    flexGrow: 1,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.control,
    backgroundColor: colors.surface,
    padding: space(2.5),
    gap: space(1),
  },
  kvValue: {
    marginTop: space(0.5),
  },
  characteristics: {
    gap: space(2.5),
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    backgroundColor: colors.surface,
    padding: space(4),
  },
  notesBlock: {
    gap: space(1.5),
  },
  notesText: {
    lineHeight: 22,
  },
  socialRow: {
    flexDirection: 'row',
    gap: space(5),
    paddingVertical: space(1),
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: space(1),
  },
  socialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1.5),
    paddingVertical: space(1),
  },
  comments: {
    gap: space(3),
  },
  comment: {
    flexDirection: 'row',
    gap: space(2),
    alignItems: 'flex-start',
  },
  commentBody: {
    flex: 1,
    gap: space(0.5),
  },
  commentAuthor: {
    fontSize: 13,
  },
  commentBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2),
    paddingHorizontal: space(4),
    paddingTop: space(2),
    paddingBottom: space(1),
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.surface,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.chip,
    paddingHorizontal: space(3.5),
    paddingVertical: space(2.5),
    color: colors.ink,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    backgroundColor: colors.ground,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
