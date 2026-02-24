import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useAuth } from '../../../src/contexts/AuthContext';

export default function HomeScreen() {
  const { session } = useAuth();

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>
        Welcome to Flare
      </Text>
      <Text variant="bodyLarge" style={styles.subtitle}>
        {session?.user?.email}
      </Text>
      <Text variant="bodyMedium" style={styles.comingSoon}>
        Dashboard coming soon
      </Text>
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
  comingSoon: {
    opacity: 0.5,
  },
});
