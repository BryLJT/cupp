import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { AppText, Button, Screen, TextField, colors, space } from '@/components';
import { friendlyAuthError } from '@/lib/auth-errors';
import { isDemoMode, repo } from '@/lib/data';

export default function SignInScreen() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setFormError(null);
    setBusy(true);
    try {
      await repo.signIn(identifier.trim(), password);
      router.replace('/(tabs)');
    } catch (e) {
      setFormError(e instanceof Error ? friendlyAuthError(e.message) : 'Could not sign in.');
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
              label="Email or username"
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="you@example.com or elliot.brews"
            />
            <TextField
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              placeholder="••••••••"
            />
            {formError ? (
              <AppText variant="caption" color={colors.accent} style={styles.formError}>
                {formError}
              </AppText>
            ) : null}
            <Button title="Sign in" onPress={submit} loading={busy} />

            {isDemoMode ? (
              <AppText variant="caption" style={styles.demoHint}>
                Demo mode — any email/username and password signs you in.
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
  formError: {
    textAlign: 'center',
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
