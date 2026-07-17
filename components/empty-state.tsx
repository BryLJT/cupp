import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, space } from '@/constants/theme';
import { AppText } from './app-text';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export interface EmptyStateProps {
  icon?: IoniconName;
  title: string;
  message?: string;
}

/** Centered placeholder for empty feeds, search results, and profiles. */
export function EmptyState({ icon = 'cafe-outline', title, message }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={40} color={colors.line} />
      <AppText variant="heading" style={styles.title}>
        {title}
      </AppText>
      {message ? (
        <AppText variant="caption" style={styles.message}>
          {message}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space(12),
    paddingHorizontal: space(6),
  },
  title: {
    marginTop: space(3),
    textAlign: 'center',
  },
  message: {
    marginTop: space(1.5),
    textAlign: 'center',
  },
});
