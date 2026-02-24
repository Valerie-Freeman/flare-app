import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

export default function TrackScreen() {
  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>Track</Text>
      <Text variant="bodyMedium" style={styles.subtitle}>Coming soon</Text>
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
    opacity: 0.5,
  },
});
