import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { AppText, EmptyState, LogCard, Screen, Segmented, colors, space } from '@/components';
import { repo, type Log } from '@/lib/data';

type FeedTab = 'forYou' | 'following' | 'mine';

const TABS = [
  { label: 'For You', value: 'forYou' },
  { label: 'Following', value: 'following' },
  { label: 'Mine', value: 'mine' },
];

const EMPTY: Record<FeedTab, { title: string; message: string }> = {
  forYou: { title: 'No logs yet', message: 'Public logs from the community will show up here.' },
  following: { title: 'Nothing from your follows', message: 'Follow other people to see their logs here.' },
  mine: { title: 'Your journal is empty', message: 'Scan a bag or tap Create to log your first coffee.' },
};

export default function FeedScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<FeedTab>('forYou');
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (which: FeedTab) => {
    setLoading(true);
    const data =
      which === 'following'
        ? await repo.feedFollowing()
        : which === 'mine'
        ? await repo.feedMine()
        : await repo.feedForYou();
    setLogs(data);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(tab);
    }, [load, tab])
  );

  const onTabChange = (value: string) => {
    const next = value as FeedTab;
    setTab(next);
    load(next);
  };

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <AppText variant="wordmark">Cupp</AppText>
      </View>
      <View style={styles.tabs}>
        <Segmented options={TABS} value={tab} onChange={onTabChange} variant="chips" />
      </View>

      <FlatList
        data={logs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <LogCard
            log={item}
            onPress={() => router.push({ pathname: '/log/[id]', params: { id: item.id } })}
            onAuthorPress={() =>
              router.push({ pathname: '/user/[username]', params: { username: item.author.username } })
            }
          />
        )}
        ListEmptyComponent={loading ? null : <EmptyState title={EMPTY[tab].title} message={EMPTY[tab].message} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: space(4),
    paddingTop: space(1),
    paddingBottom: space(2),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  tabs: {
    paddingHorizontal: space(4),
    paddingVertical: space(3),
  },
  list: {
    paddingHorizontal: space(4),
    paddingBottom: space(6),
    flexGrow: 1,
  },
});
