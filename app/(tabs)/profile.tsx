import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
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

  const applyAvatar = async (localUri: string) => {
    const path = await repo.uploadPhoto(localUri);
    const updated = await repo.updateProfile({ avatarPath: path });
    setProfile(updated);
  };

  const removeAvatar = async () => {
    const updated = await repo.updateProfile({ avatarPath: null });
    setProfile(updated);
  };

  const takeAvatarPhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera needed', 'Enable camera access in Settings to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) await applyAvatar(result.assets[0].uri);
  };

  const pickAvatarFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Library needed', 'Enable photo access in Settings to pick a photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) await applyAvatar(result.assets[0].uri);
  };

  const choosePhoto = () => {
    Alert.alert('Profile photo', undefined, [
      { text: 'Take photo', onPress: takeAvatarPhoto },
      { text: 'Choose from library', onPress: pickAvatarFromLibrary },
      ...(profile?.avatarPath
        ? [{ text: 'Remove photo', style: 'destructive' as const, onPress: removeAvatar }]
        : []),
      { text: 'Cancel', style: 'cancel' as const },
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
        onAvatarPress={choosePhoto}
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
