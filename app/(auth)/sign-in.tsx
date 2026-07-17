import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { AppText, Button, Screen, TextField, colors, space } from '@/components';
import { isDemoMode, repo } from '@/lib/data';

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      await repo.signIn(email.trim(), password);
      router.replace('/(tabs)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.container}>
          <View style={styles.brand}>
            <AppText variant="display" style={styles.wordmark}>
              Cupp
            </AppText>
            <AppText variant="caption" style={styles.tagline}>
              Your coffee, remembered.
            </AppText>
          </View>

          <View style={styles.form}>
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
              autoComplete="password"
              placeholder="••••••••"
              error={error ?? undefined}
            />
            <Button title="Sign in" onPress={submit} loading={busy} />

            {isDemoMode ? (
              <AppText variant="caption" style={styles.demoHint}>
                Demo mode — any email and password signs you in.
              </AppText>
            ) : null}
          </View>

          <View style={styles.footer}>
            <AppText variant="caption">First time here? </AppText>
            <Link href="/(auth)/sign-up" accessibilityRole="link">
              <AppText variant="caption" color={colors.accent}>
                Create account
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
    gap: space(8),
  },
  brand: {
    alignItems: 'center',
    gap: space(1.5),
  },
  wordmark: {
    fontSize: 40,
    lineHeight: 46,
  },
  tagline: {
    textAlign: 'center',
  },
  form: {
    gap: space(3),
  },
  demoHint: {
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
