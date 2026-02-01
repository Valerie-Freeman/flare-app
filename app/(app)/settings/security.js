import { useState } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../src/contexts/AuthContext';
import { resetPassword } from '../../../src/services/auth';

export default function SecuritySettingsScreen() {
  const { session, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChangePassword = async () => {
    if (!session?.user?.email) return;

    setIsLoading(true);
    try {
      await resetPassword(session.user.email);
      setSuccess(true);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text variant='headlineSmall' style={styles.title}>
            Check Your Email
          </Text>
          <Text variant='bodyMedium' style={styles.description}>
            We sent a password reset link to {session?.user?.email}. Click the link to reset your password.
          </Text>
          <Text variant='bodySmall' style={styles.note}>
            You will need to sign in again after resetting your password.
          </Text>
          <Button
            mode='contained'
            onPress={signOut}
            style={styles.button}
          >
            Sign Out
          </Button>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text variant='headlineSmall' style={styles.title}>
          Security Settings
        </Text>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant='titleMedium' style={styles.cardTitle}>
              Change Password
            </Text>
            <Text variant='bodyMedium' style={styles.cardDescription}>
              We will send a password reset link to your email address.
            </Text>
            <Button
              mode='outlined'
              onPress={handleChangePassword}
              loading={isLoading}
              disabled={isLoading}
              style={styles.cardButton}
            >
              Send Reset Link
            </Button>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant='titleMedium' style={styles.cardTitle}>
              Two-Factor Authentication
            </Text>
            <Text variant='bodyMedium' style={styles.cardDescription}>
              Add an extra layer of security to your account.
            </Text>
            <Button
              mode='outlined'
              disabled
              style={styles.cardButton}
            >
              Coming Soon
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    marginBottom: 20,
  },
  description: {
    marginBottom: 20,
    opacity: 0.7,
  },
  note: {
    marginBottom: 30,
    opacity: 0.5,
  },
  button: {
    marginTop: 10,
  },
  card: {
    marginBottom: 16,
  },
  cardTitle: {
    marginBottom: 8,
  },
  cardDescription: {
    marginBottom: 16,
    opacity: 0.7,
  },
  cardButton: {
    alignSelf: 'flex-start',
  },
});
