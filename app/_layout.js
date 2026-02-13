import { Stack } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { PaperProvider, Banner } from 'react-native-paper';

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
    <PaperProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </PaperProvider>
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
