import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { router } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';

export default function HomeScreen() {
  const { session, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text variant='headlineMedium' style={styles.title}>
        Welcome to Flare
      </Text>
      <Text variant='bodyLarge' style={styles.subtitle}>
        {session?.user?.email}
      </Text>

      <Button
        mode='contained'
        onPress={() => router.push('/(app)/settings/security')}
        style={styles.button}
      >
        Settings
      </Button>
      <Button mode='outlined' onPress={signOut} style={styles.button}>
        Sign Out
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    marginBottom: 10,
  },
  subtitle: {
    marginBottom: 30,
    opacity: 0.7,
  },
  button: {
    marginTop: 20,
  },
});
