import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';

import {
  AppText,
  Card,
  Chip,
  EmptyState,
  Photo,
  Screen,
  Stars,
  beanTitle,
  colors,
  radii,
  space,
} from '@/components';
import { repo, type DiscoveryFacets, type Log } from '@/lib/data';

const ALL = '__all__';

function FilterRow({
  label,
  values,
  selected,
  onSelect,
}: {
  label: string;
  values: string[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <View style={styles.filterRow}>
      <AppText variant="label" style={styles.filterLabel}>
        {label}
      </AppText>
      <FlatList
        data={[ALL, ...values]}
        horizontal
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        renderItem={({ item }) => (
          <Chip
            label={item === ALL ? 'All' : item}
            selected={selected === item}
            onPress={() => onSelect(item)}
          />
        )}
      />
    </View>
  );
}

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [facets, setFacets] = useState<DiscoveryFacets>({ origins: [], roasters: [], methods: [] });
  const [origin, setOrigin] = useState(ALL);
  const [roaster, setRoaster] = useState(ALL);
  const [method, setMethod] = useState(ALL);
  const [results, setResults] = useState<Log[]>([]);

  useFocusEffect(
    useCallback(() => {
      repo.discoveryFacets().then(setFacets);
    }, [])
  );

  useEffect(() => {
    const run = async () => {
      const data = await repo.search(query, {
        origin: origin === ALL ? null : origin,
        roaster: roaster === ALL ? null : roaster,
        method: method === ALL ? null : method,
      });
      setResults(data);
    };
    run();
  }, [query, origin, roaster, method]);

  return (
    <Screen padded={false}>
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={17} color={colors.taupe} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search beans, roasters, people…"
            placeholderTextColor={colors.placeholder}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Search public logs"
            returnKeyType="search"
          />
        </View>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.filters}>
            <FilterRow label="Origin" values={facets.origins} selected={origin} onSelect={setOrigin} />
            <FilterRow label="Roaster" values={facets.roasters} selected={roaster} onSelect={setRoaster} />
            <FilterRow label="Method" values={facets.methods} selected={method} onSelect={setMethod} />
          </View>
        }
        renderItem={({ item }) => (
          <Card
            style={styles.tile}
            onPress={() => router.push({ pathname: '/log/[id]', params: { id: item.id } })}
            accessibilityLabel={`Open ${beanTitle(item)}`}
          >
            <Photo url={item.photoUrl} height={96} />
            <View style={styles.tileBody}>
              <AppText variant="bodySemiBold" numberOfLines={1}>
                {beanTitle(item)}
              </AppText>
              <View style={styles.tileMeta}>
                <AppText variant="caption" numberOfLines={1} style={styles.tileRoaster}>
                  {item.roaster ?? '—'}
                </AppText>
                <Stars value={item.ratings.overall ?? 0} size={12} />
              </View>
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <EmptyState icon="search-outline" title="No matches" message="Try a different search or clear the filters." />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    paddingHorizontal: space(4),
    paddingTop: space(2),
    paddingBottom: space(2),
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2),
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.chip,
    backgroundColor: colors.surface,
    paddingHorizontal: space(3.5),
    paddingVertical: space(2.5),
  },
  searchInput: {
    flex: 1,
    color: colors.ink,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    padding: 0,
  },
  filters: {
    gap: space(3),
    paddingBottom: space(4),
  },
  filterRow: {
    gap: space(2),
  },
  filterLabel: {
    paddingHorizontal: space(4),
  },
  chipRow: {
    gap: space(2),
    paddingHorizontal: space(4),
  },
  grid: {
    paddingHorizontal: space(4),
    paddingBottom: space(6),
    flexGrow: 1,
  },
  gridRow: {
    gap: space(3),
  },
  tile: {
    flex: 1,
    marginBottom: space(3),
  },
  tileBody: {
    padding: space(2.5),
    gap: space(1),
  },
  tileMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space(1),
  },
  tileRoaster: {
    flex: 1,
  },
});
