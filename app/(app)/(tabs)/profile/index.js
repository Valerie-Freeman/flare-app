import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { router } from 'expo-router';
import { useAuth } from '../../../../src/contexts/AuthContext';

export default function ProfileScreen() {
  const { session, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>
        Profile
      </Text>
      <Text variant="bodyLarge" style={styles.email}>
        {session?.user?.email}
      </Text>

      <Button
        mode="contained"
        onPress={() => router.push('/profile/security')}
        style={styles.button}
      >
        Security Settings
      </Button>
      <Button mode="outlined" onPress={signOut} style={styles.button}>
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
  email: {
    marginBottom: 30,
    opacity: 0.7,
  },
  button: {
    marginTop: 20,
  },
});
