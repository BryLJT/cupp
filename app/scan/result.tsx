import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppText,
  Button,
  Card,
  Chip,
  EmptyState,
  FieldRow,
  Photo,
  PressableScale,
  Screen,
  Stars,
  beanTitle,
  colors,
  space,
} from '@/components';
import { repo, type Log, type Ratings } from '@/lib/data';
import { decodeFields } from '@/lib/scan';

/** Compact community row: photo, identity, author, rating. */
function CommunityRow({ log, onPress }: { log: Log; onPress: () => void }) {
  const meta = [log.author.username, log.method].filter(Boolean).join(' · ');
  return (
    <Card style={styles.row} onPress={onPress} accessibilityLabel={`Open ${beanTitle(log)}`}>
      <View style={styles.rowInner}>
        <View style={styles.rowPhoto}>
          <Photo url={log.photoUrl} height={64} />
        </View>
        <View style={styles.rowBody}>
          <AppText variant="bodySemiBold" numberOfLines={1}>
            {beanTitle(log)}
          </AppText>
          <AppText variant="caption" numberOfLines={1}>
            {meta}
          </AppText>
          {log.notes ? (
            <AppText variant="caption" numberOfLines={1} style={styles.rowNotes}>
              “{log.notes}”
            </AppText>
          ) : null}
        </View>
        <Stars value={log.ratings.overall ?? 0} size={13} />
      </View>
    </Card>
  );
}

/** Vivino-style taste bar: label left, filled track right. Value is 1–5. */
function TasteBar({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <View style={styles.tasteRow}>
      <AppText variant="caption" style={styles.tasteLabel}>
        {label}
      </AppText>
      <View style={styles.tasteTrack}>
        <View style={[styles.tasteFill, { width: `${pct}%` }]} />
      </View>
      <AppText variant="caption" style={styles.tasteValue}>
        {value.toFixed(1)}
      </AppText>
    </View>
  );
}

export default function ScanResultScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ prefill?: string; photoUri?: string }>();

  const fields = useMemo(() => decodeFields(params.prefill), [params.prefill]);
  const photoUri = typeof params.photoUri === 'string' ? params.photoUri : null;

  const coffeeName = fields.coffee_name.value;
  const roasterName = fields.roaster.value;
  const isDecaf = fields.decaf.value === 'Decaf';
  const title = coffeeName ?? roasterName ?? 'Mystery bag';

  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<Log[]>([]);
  const [moreFromRoaster, setMoreFromRoaster] = useState<Log[]>([]);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        // Tier 1: logs matching the coffee's name (repo.search substring-matches
        // roaster/coffeeName/origin/username). Tier 2: anything else from the
        // same roaster. Both public-only via repo.search.
        const primary = coffeeName ? await repo.search(coffeeName, {}) : [];
        let exact = primary;
        if (roasterName) {
          const r = roasterName.toLowerCase();
          const both = primary.filter((l) => (l.roaster ?? '').toLowerCase().includes(r));
          if (both.length > 0) exact = both;
        }
        let more: Log[] = [];
        if (roasterName) {
          const roasterLogs = await repo.search(roasterName, {});
          const seen = new Set(exact.map((l) => l.id));
          more = roasterLogs.filter((l) => !seen.has(l.id)).slice(0, 5);
        }
        if (alive) {
          setMatches(exact);
          setMoreFromRoaster(more);
        }
      } catch {
        // Preview is best-effort: a failed lookup just shows the empty state.
      } finally {
        if (alive) setLoading(false);
      }
    };
    run();
    return () => {
      alive = false;
    };
    // fields are decoded once from params; name/roaster can't change on this screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toLogForm = () => {
    router.replace({
      pathname: '/log/new',
      params: { ...(photoUri ? { photoUri } : {}), ...(params.prefill ? { prefill: params.prefill } : {}) },
    });
  };

  const openLog = (id: string) => router.push({ pathname: '/log/[id]', params: { id } });

  // --- bean details as labeled rows (Origin: Colombia, Caldas — not chip soup)
  const origin = [fields.origin_country.value, fields.origin_region.value].filter(Boolean).join(', ');
  const originInferred =
    fields.origin_country.basis === 'inferred' || fields.origin_region.basis === 'inferred';
  const detailRows = [
    { label: 'Origin', value: origin || null, inferred: originInferred },
    { label: 'Process', value: fields.process.value, inferred: fields.process.basis === 'inferred' },
    { label: 'Variety', value: fields.variety.value, inferred: fields.variety.basis === 'inferred' },
    { label: 'Roast', value: fields.roast_level.value, inferred: fields.roast_level.basis === 'inferred' },
    { label: 'Roasted', value: fields.roast_date.value, inferred: fields.roast_date.basis === 'inferred' },
    { label: 'Weight', value: fields.weight.value, inferred: fields.weight.basis === 'inferred' },
  ].filter((r) => Boolean(r.value));

  const flavourNotes = (fields.roaster_tasting_notes.value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // --- community aggregates (Vivino-style rating + taste profile)
  const avgOf = (key: keyof Ratings): number | null => {
    const vals = matches.map((l) => l.ratings[key]).filter((v): v is number => v != null);
    if (vals.length === 0) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };
  const avgOverall = avgOf('overall');
  const tasteBars = [
    { label: 'Strength', value: avgOf('strength') },
    { label: 'Acidity', value: avgOf('acidity') },
    { label: 'Sweetness', value: avgOf('sweetness') },
    { label: 'Bitterness', value: avgOf('bitterness') },
  ].filter((b): b is { label: string; value: number } => b.value != null);

  const header = (
    <View style={styles.header}>
      <View style={styles.topBar}>
        <View style={styles.topText}>
          <AppText variant="label">Coffee preview</AppText>
          <AppText variant="caption">Nothing is saved yet — this is just what we found.</AppText>
        </View>
        <PressableScale onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Close preview" hitSlop={8}>
          <Ionicons name="close" size={22} color={colors.taupe} />
        </PressableScale>
      </View>

      <Card style={styles.beanCard}>
        <Photo url={photoUri} height={140} />
        <View style={styles.beanBody}>
          <View style={styles.identity}>
            {roasterName ? <AppText variant="label">{roasterName}</AppText> : null}
            <AppText variant="heading" numberOfLines={2}>
              {isDecaf ? `${title} · Decaf` : title}
            </AppText>
          </View>

          {!loading && avgOverall != null ? (
            <View style={styles.ratingStrip}>
              <AppText variant="heading" style={styles.ratingNumber}>
                {avgOverall.toFixed(1)}
              </AppText>
              <View style={styles.ratingMeta}>
                <Stars value={Math.round(avgOverall)} size={14} />
                <AppText variant="caption">
                  {matches.length} community {matches.length === 1 ? 'log' : 'logs'}
                </AppText>
              </View>
            </View>
          ) : null}

          {detailRows.length > 0 ? (
            <View style={styles.details}>
              {detailRows.map((r) => (
                <FieldRow
                  key={r.label}
                  label={r.label}
                  value={r.value}
                  right={
                    r.inferred ? (
                      <AppText variant="caption" color={colors.taupe} style={styles.inferred}>
                        inferred
                      </AppText>
                    ) : undefined
                  }
                />
              ))}
            </View>
          ) : (
            <AppText variant="caption">The label didn’t give much away.</AppText>
          )}

          {flavourNotes.length > 0 ? (
            <View style={styles.notesBlock}>
              <AppText variant="label">Flavour notes</AppText>
              <View style={styles.chips}>
                {flavourNotes.map((note) => (
                  <Chip key={note} label={note} />
                ))}
              </View>
            </View>
          ) : null}

          <AppText variant="caption" color={colors.taupe}>
            Read off the label — anything guessed is marked “inferred”.
          </AppText>
        </View>
      </Card>

      {!loading && tasteBars.length > 0 ? (
        <Card style={styles.tasteCard}>
          <View style={styles.tasteBody}>
            <AppText variant="label">Community taste profile</AppText>
            {tasteBars.map((b) => (
              <TasteBar key={b.label} label={b.label} value={b.value} />
            ))}
          </View>
        </Card>
      ) : null}

      <AppText variant="label" style={styles.sectionLabel}>
        From the community
      </AppText>
      {loading ? (
        <AppText variant="caption" style={styles.loading}>
          Checking what the community says…
        </AppText>
      ) : null}
    </View>
  );

  const footer = !loading && moreFromRoaster.length > 0 ? (
    <View style={styles.footerBlock}>
      <AppText variant="label" style={styles.sectionLabel}>
        More from {roasterName}
      </AppText>
      {moreFromRoaster.map((log) => (
        <CommunityRow key={log.id} log={log} onPress={() => openLog(log.id)} />
      ))}
    </View>
  ) : null;

  return (
    <Screen padded={false}>
      <FlatList
        data={loading ? [] : matches}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: space(30) }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        renderItem={({ item }) => <CommunityRow log={item} onPress={() => openLog(item.id)} />}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              icon="cafe-outline"
              title="No logs yet for this coffee"
              message="Be the first — log it and tell everyone how it tastes."
            />
          )
        }
      />

      <View style={[styles.ctaBar, { paddingBottom: insets.bottom + space(3) }]}>
        <Button title="Log this coffee" onPress={toLogForm} />
        <Button title="Done for now" variant="ghost" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: space(4),
  },
  header: {
    gap: space(3),
    paddingTop: space(2),
    paddingBottom: space(1),
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space(2),
  },
  topText: {
    flex: 1,
    gap: space(0.5),
  },
  beanCard: {
    overflow: 'hidden',
  },
  beanBody: {
    padding: space(3),
    gap: space(3),
  },
  identity: {
    gap: space(1),
  },
  ratingStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
  },
  ratingNumber: {
    fontSize: 28,
    lineHeight: 32,
  },
  ratingMeta: {
    gap: space(0.5),
  },
  details: {
    gap: space(2),
  },
  inferred: {
    fontStyle: 'italic',
  },
  notesBlock: {
    gap: space(2),
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space(1.5),
  },
  tasteCard: {
    overflow: 'hidden',
  },
  tasteBody: {
    padding: space(3),
    gap: space(2.5),
  },
  tasteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2.5),
  },
  tasteLabel: {
    width: 74,
  },
  tasteTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.line,
    overflow: 'hidden',
  },
  tasteFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  tasteValue: {
    width: 26,
    textAlign: 'right',
  },
  sectionLabel: {
    marginTop: space(2),
  },
  loading: {
    paddingVertical: space(2),
  },
  footerBlock: {
    gap: space(3),
    paddingTop: space(2),
  },
  row: {
    marginBottom: space(3),
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    padding: space(2.5),
  },
  rowPhoto: {
    width: 64,
    borderRadius: 8,
    overflow: 'hidden',
  },
  rowBody: {
    flex: 1,
    gap: space(0.5),
  },
  rowNotes: {
    fontStyle: 'italic',
  },
  ctaBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space(4),
    paddingTop: space(3),
    gap: space(2),
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
});
