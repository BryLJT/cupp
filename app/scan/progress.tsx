import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Button, colors, space } from '@/components';
import { encodeFields, scanBag } from '@/lib/scan';
import type { ScanStage } from '@/lib/data';

const GUIDE_LIGHT = '#EDE5D8';

const STAGES: { key: ScanStage; label: string }[] = [
  { key: 'uploading', label: 'Photo uploaded' },
  { key: 'reading', label: 'Reading the label…' },
  { key: 'building', label: 'Filling in your form' },
];

function stageRank(stage: ScanStage): number {
  return STAGES.findIndex((s) => s.key === stage);
}

export default function ScanProgressScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { photoUri } = useLocalSearchParams<{ photoUri: string }>();

  const [stage, setStage] = useState<ScanStage>('uploading');
  const [error, setError] = useState<string | null>(null);
  const cancelled = useRef(false);

  useEffect(() => {
    if (!photoUri) return;
    cancelled.current = false;

    const run = async () => {
      try {
        const result = await scanBag(photoUri, (s) => {
          if (!cancelled.current) setStage(s);
        });
        if (cancelled.current) return;

        if (!result.isCoffeeBag) {
          // Not a bag → drop into the blank manual form with the photo.
          router.replace({ pathname: '/log/new', params: { photoUri } });
          return;
        }
        router.replace({
          pathname: '/log/new',
          params: { photoUri, prefill: encodeFields(result.fields) },
        });
      } catch (e) {
        if (!cancelled.current) setError(e instanceof Error ? e.message : 'Scan failed.');
      }
    };
    run();

    return () => {
      cancelled.current = true;
    };
  }, [photoUri, router]);

  const toManual = () => {
    cancelled.current = true;
    router.replace({ pathname: '/log/new', params: photoUri ? { photoUri } : {} });
  };

  const currentRank = stageRank(stage);

  return (
    <View style={[styles.root, { paddingTop: insets.top + space(6), paddingBottom: insets.bottom + space(6) }]}>
      <View style={styles.content}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.thumb} contentFit="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]}>
            <Ionicons name="cafe-outline" size={28} color={GUIDE_LIGHT} />
          </View>
        )}

        {error ? (
          <View style={styles.errorBlock}>
            <AppText variant="heading" color={GUIDE_LIGHT} style={styles.center}>
              Couldn’t read the bag
            </AppText>
            <AppText variant="caption" color={GUIDE_LIGHT} style={styles.center}>
              {error}
            </AppText>
          </View>
        ) : (
          <View style={styles.stages}>
            {STAGES.map((s, index) => {
              const done = index < currentRank;
              const active = index === currentRank;
              return (
                <View key={s.key} style={styles.stageRow}>
                  <View style={[styles.dot, done && styles.dotDone, active && styles.dotActive]}>
                    {done ? <Ionicons name="checkmark" size={12} color={colors.onAccent} /> : null}
                    {active ? <View style={styles.dotPulse} /> : null}
                  </View>
                  <AppText
                    variant={active ? 'bodySemiBold' : 'body'}
                    color={index <= currentRank ? GUIDE_LIGHT : 'rgba(237,229,216,0.5)'}
                  >
                    {s.label}
                  </AppText>
                </View>
              );
            })}
          </View>
        )}

        {!error ? (
          <AppText variant="caption" color="rgba(237,229,216,0.7)" style={styles.center}>
            Usually 10–20 seconds.{'\n'}Anything it can’t read stays blank for you.
          </AppText>
        ) : null}

        <Button
          title={error ? 'Continue to manual entry' : 'Cancel — type it in instead'}
          variant="ghost"
          textColor={GUIDE_LIGHT}
          onPress={toManual}
          style={styles.cancel}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.camera,
    paddingHorizontal: space(8),
    justifyContent: 'center',
  },
  content: {
    gap: space(5),
    alignItems: 'stretch',
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: 12,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(237,229,216,0.3)',
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stages: {
    gap: space(4),
  },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(237,229,216,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  dotActive: {
    borderColor: colors.accent,
  },
  dotPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  errorBlock: {
    gap: space(2),
  },
  center: {
    textAlign: 'center',
  },
  stagesText: {
    textAlign: 'center',
  },
  cancel: {
    marginTop: space(2),
    borderColor: 'rgba(237,229,216,0.4)',
  },
});
