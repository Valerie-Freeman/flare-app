import { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, Card, TextInput, Dialog, Portal } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../../../src/contexts/AuthContext';
import { regeneratePassphrase, signIn } from '../../../src/services/auth';

export default function SecuritySettingsScreen() {
  const { session, getMEKFromStorage } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [copied, setCopied] = useState(false);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleReAuthenticate = async () => {
    if (!password.trim()) {
      setAuthError('Password is required');
      return;
    }

    setIsAuthenticating(true);
    setAuthError('');

    try {
      await signIn(session.user.email, password);
      setIsAuthenticated(true);
      // For demo purposes, show a placeholder passphrase
      // In production, this would fetch from secure storage
      setPassphrase('Unable to retrieve - stored securely');
    } catch {
      setAuthError('Invalid password');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const copyPassphrase = async () => {
    await Clipboard.setStringAsync(passphrase);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegeneratePassphrase = async () => {
    setIsRegenerating(true);
    try {
      const mek = await getMEKFromStorage();
      if (!mek) {
        Alert.alert('Error', 'Unable to access encryption key');
        return;
      }
      const { passphrase: newPassphrase } = await regeneratePassphrase(mek);
      setPassphrase(newPassphrase);
      setShowRegenerateDialog(false);
      Alert.alert(
        'Passphrase Regenerated',
        'Your new recovery passphrase has been generated. Make sure to save it in a safe place!'
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to regenerate passphrase');
    } finally {
      setIsRegenerating(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text variant="headlineSmall" style={styles.title}>
            Security Settings
          </Text>
          <Text variant="bodyMedium" style={styles.description}>
            Enter your password to view your recovery passphrase.
          </Text>

          <TextInput
            label="Password"
            mode="outlined"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
            error={!!authError}
          />
          {authError ? (
            <Text style={styles.errorText}>{authError}</Text>
          ) : null}

          <Button
            mode="contained"
            onPress={handleReAuthenticate}
            loading={isAuthenticating}
            disabled={isAuthenticating}
            style={styles.button}
          >
            Verify Password
          </Button>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text variant="headlineSmall" style={styles.title}>
          Recovery Passphrase
        </Text>

        <Card style={styles.passphraseCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.passphrase}>
              {passphrase}
            </Text>
          </Card.Content>
        </Card>

        <Button
          mode="outlined"
          onPress={copyPassphrase}
          style={styles.button}
          icon={copied ? 'check' : 'content-copy'}
        >
          {copied ? 'Copied!' : 'Copy to Clipboard'}
        </Button>

        <View style={styles.divider} />

        <Text variant="titleMedium" style={styles.sectionTitle}>
          Regenerate Passphrase
        </Text>
        <Text variant="bodyMedium" style={styles.warningText}>
          Warning: Generating a new passphrase will invalidate your current one.
          Make sure to save the new passphrase immediately.
        </Text>

        <Button
          mode="outlined"
          onPress={() => setShowRegenerateDialog(true)}
          style={styles.dangerButton}
          textColor="#B00020"
        >
          Generate New Passphrase
        </Button>

        <Portal>
          <Dialog
            visible={showRegenerateDialog}
            onDismiss={() => setShowRegenerateDialog(false)}
          >
            <Dialog.Title>Regenerate Passphrase?</Dialog.Title>
            <Dialog.Content>
              <Text variant="bodyMedium">
                Your current recovery passphrase will no longer work. Are you
                sure you want to generate a new one?
              </Text>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setShowRegenerateDialog(false)}>
                Cancel
              </Button>
              <Button
                onPress={handleRegeneratePassphrase}
                loading={isRegenerating}
                textColor="#B00020"
              >
                Regenerate
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
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
    marginBottom: 10,
  },
  description: {
    marginBottom: 30,
    opacity: 0.7,
  },
  input: {
    marginBottom: 10,
  },
  errorText: {
    color: '#B00020',
    marginBottom: 10,
  },
  button: {
    marginTop: 10,
  },
  passphraseCard: {
    marginVertical: 20,
  },
  passphrase: {
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 30,
  },
  sectionTitle: {
    marginBottom: 10,
  },
  warningText: {
    marginBottom: 20,
    color: '#B00020',
  },
  dangerButton: {
    borderColor: '#B00020',
  },
});
