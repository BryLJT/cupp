import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, PressableScale, colors, space } from '@/components';

const GUIDE_LIGHT = '#EDE5D8';

export default function ScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const goToProgress = (uri: string) => {
    router.replace({ pathname: '/scan/progress', params: { photoUri: uri } });
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera needed', 'Enable camera access in Settings, or pick a photo from your library.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
    if (!result.canceled && result.assets[0]) goToProgress(result.assets[0].uri);
  };

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Library needed', 'Enable photo access in Settings to pick a bag photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (!result.canceled && result.assets[0]) goToProgress(result.assets[0].uri);
  };

  const manual = () => {
    router.replace('/log/new');
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + space(2), paddingBottom: insets.bottom + space(4) }]}>
      <View style={styles.topBar}>
        <PressableScale onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Close scanner" hitSlop={8}>
          <Ionicons name="close" size={28} color={GUIDE_LIGHT} />
        </PressableScale>
      </View>

      <View style={styles.viewfinder}>
        <View style={styles.guide}>
          <View style={[styles.corner, styles.tl]} />
          <View style={[styles.corner, styles.tr]} />
          <View style={[styles.corner, styles.bl]} />
          <View style={[styles.corner, styles.br]} />
        </View>
        <AppText variant="caption" color={GUIDE_LIGHT} style={styles.hint}>
          Fill the frame with the label
        </AppText>
      </View>

      <View style={styles.controls}>
        <PressableScale onPress={pickPhoto} accessibilityRole="button" accessibilityLabel="Pick from gallery" style={styles.sideButton}>
          <Ionicons name="images-outline" size={24} color={GUIDE_LIGHT} />
          <AppText variant="label" color={GUIDE_LIGHT} style={styles.sideLabel}>
            Gallery
          </AppText>
        </PressableScale>

        <PressableScale onPress={takePhoto} accessibilityRole="button" accessibilityLabel="Take a photo" scaleTo={0.92} style={styles.shutter}>
          <View style={styles.shutterInner} />
        </PressableScale>

        <View style={styles.sideButton} />
      </View>

      <PressableScale onPress={manual} accessibilityRole="button" accessibilityLabel="Type it in manually" style={styles.manual}>
        <AppText variant="caption" color={GUIDE_LIGHT}>
          Or <AppText variant="bodySemiBold" color={GUIDE_LIGHT}>type it in manually</AppText>
        </AppText>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.camera,
    paddingHorizontal: space(4),
  },
  topBar: {
    flexDirection: 'row',
  },
  viewfinder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guide: {
    width: '78%',
    aspectRatio: 1.2,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: GUIDE_LIGHT,
  },
  tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
  hint: {
    marginTop: space(6),
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space(4),
    marginBottom: space(4),
  },
  sideButton: {
    width: 60,
    alignItems: 'center',
    gap: space(1),
  },
  sideLabel: {
    letterSpacing: 0.2,
  },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: GUIDE_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.accent,
  },
  manual: {
    alignItems: 'center',
    paddingVertical: space(2),
  },
});
