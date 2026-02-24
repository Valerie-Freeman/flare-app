import { Stack } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { PaperProvider, Banner } from 'react-native-paper';
import queryClient from '../src/lib/queryClient';

function OfflineBanner() {
  const { isOnline } = useAuth();

  if (isOnline) return null;

  return (
    <Banner
      visible={!isOnline}
      icon="wifi-off"
      style={styles.offlineBanner}
    >
      No internet connection. Some features may be unavailable.
    </Banner>
  );
}

function AppContent() {
  return (
    <View style={styles.container}>
      <OfflineBanner />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </PaperProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  offlineBanner: {
    backgroundColor: '#FFF3E0',
  },
});
