import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { AppText, Button, Screen, TextField, colors, space } from '@/components';
import { friendlyAuthError } from '@/lib/auth-errors';
import { repo } from '@/lib/data';

const USERNAME_RE = /^[a-z0-9_.]{3,24}$/;

export default function SignUpScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setUsernameError(null);
    setFormError(null);
    const handle = username.trim().toLowerCase();
    if (!USERNAME_RE.test(handle)) {
      setUsernameError('3–24 characters: lowercase letters, numbers, _ or . only.');
      return;
    }
    setBusy(true);
    try {
      const existing = await repo.getProfileByUsername(handle);
      if (existing) {
        setUsernameError('That username is taken — try another.');
        return;
      }
      await repo.signUp({
        email: email.trim(),
        password,
        username: handle,
        displayName: displayName.trim() || undefined,
      });
      router.replace('/(tabs)');
    } catch (e) {
      setFormError(e instanceof Error ? friendlyAuthError(e.message) : 'Could not create account.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']} scroll>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.container}>
          <View style={styles.brand}>
            <AppText variant="title">Create your account</AppText>
            <AppText variant="caption">Start your coffee journal.</AppText>
          </View>

          <View style={styles.form}>
            <TextField
              label="Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="elliot.brews"
              error={usernameError ?? undefined}
            />
            <TextField
              label="Display name (optional)"
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Elliot N."
            />
            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              placeholder="you@example.com"
            />
            <TextField
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="At least 8 characters"
            />
            {formError ? (
              <AppText variant="caption" color={colors.accent} style={styles.formError}>
                {formError}
              </AppText>
            ) : null}
            <Button title="Create account" onPress={submit} loading={busy} />
          </View>

          <View style={styles.footer}>
            <AppText variant="caption">Already have an account? </AppText>
            <Link href="/(auth)/sign-in" accessibilityRole="link">
              <AppText variant="caption" color={colors.accent}>
                Sign in
              </AppText>
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    justifyContent: 'center',
    gap: space(6),
    paddingVertical: space(8),
  },
  brand: {
    alignItems: 'center',
    gap: space(1.5),
  },
  form: {
    gap: space(3),
  },
  formError: {
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
