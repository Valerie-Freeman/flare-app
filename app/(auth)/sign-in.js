import { useState } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import {
  Text,
  TextInput,
  Button,
  HelperText,
  Portal,
  Dialog,
} from 'react-native-paper';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import {
  signIn,
  recoverWithPassphrase,
  checkLoginLockout,
  recordFailedLogin,
  clearLoginAttempts,
} from '../../src/services/auth';
import { useAuth } from '../../src/contexts/AuthContext';

const MAX_PASSPHRASE_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export default function SignInScreen() {
  const { needsRecoveryPassphrase, clearRecoveryFlag } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Recovery passphrase modal state
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryPassphrase, setRecoveryPassphrase] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [recoveryAttempts, setRecoveryAttempts] = useState(0);
  const [recoveryLockoutUntil, setRecoveryLockoutUntil] = useState(null);
  const [pendingPassword, setPendingPassword] = useState('');

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const isRecoveryLocked = () => {
    if (!recoveryLockoutUntil) return false;
    if (Date.now() > recoveryLockoutUntil) {
      setRecoveryLockoutUntil(null);
      setRecoveryAttempts(0);
      return false;
    }
    return true;
  };

  const getRemainingLockoutTime = () => {
    if (!recoveryLockoutUntil) return 0;
    const remaining = Math.ceil((recoveryLockoutUntil - Date.now()) / 1000 / 60);
    return Math.max(0, remaining);
  };

  const onSubmit = async (data) => {
    setIsLoading(true);
    setError('');

    // Check if locked out
    const lockout = await checkLoginLockout(data.email);
    if (lockout.locked) {
      setError(`Too many failed attempts. Try again in ${Math.ceil(lockout.remainingMs / 1000 / 60)} minutes.`);
      setIsLoading(false);
      return;
    }

    try {
      await signIn(data.email, data.password);

      // Clear login attempts on success
      await clearLoginAttempts(data.email);

      // Check if user needs to enter recovery passphrase (after password reset)
      if (needsRecoveryPassphrase) {
        setPendingPassword(data.password);
        setShowRecoveryModal(true);
        setIsLoading(false);
        return;
      }

      router.replace('/(app)');
    } catch (err) {
      // Check if this is a "keys not found" error indicating password reset
      if (err.message?.includes('Failed to retrieve keys')) {
        setPendingPassword(data.password);
        setShowRecoveryModal(true);
      } else {
        // Record failed login attempt
        const result = await recordFailedLogin(data.email);
        if (result.locked) {
          setError(`Too many failed attempts. Try again in ${Math.ceil(result.remainingMs / 1000 / 60)} minutes.`);
        } else {
          setError(`Invalid email or password. ${result.remaining} attempt${result.remaining === 1 ? '' : 's'} remaining.`);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecoverySubmit = async () => {
    if (isRecoveryLocked()) {
      setRecoveryError(
        `Too many attempts. Try again in ${getRemainingLockoutTime()} minutes.`
      );
      return;
    }

    if (!recoveryPassphrase.trim()) {
      setRecoveryError('Please enter your recovery passphrase');
      return;
    }

    setIsLoading(true);
    setRecoveryError('');

    try {
      await recoverWithPassphrase(
        recoveryPassphrase.toLowerCase().trim(),
        pendingPassword
      );
      await clearRecoveryFlag();
      setShowRecoveryModal(false);
      setRecoveryPassphrase('');
      setRecoveryAttempts(0);
      router.replace('/(app)');
    } catch (err) {
      const newAttempts = recoveryAttempts + 1;
      setRecoveryAttempts(newAttempts);

      if (newAttempts >= MAX_PASSPHRASE_ATTEMPTS) {
        setRecoveryLockoutUntil(Date.now() + LOCKOUT_DURATION_MS);
        setRecoveryError(
          `Too many incorrect attempts. Please wait ${LOCKOUT_DURATION_MS / 1000 / 60} minutes before trying again.`
        );
      } else {
        const remaining = MAX_PASSPHRASE_ATTEMPTS - newAttempts;
        setRecoveryError(
          `Invalid recovery passphrase. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelRecovery = () => {
    setShowRecoveryModal(false);
    setRecoveryPassphrase('');
    setRecoveryError('');
    setPendingPassword('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text variant="headlineMedium" style={styles.title}>
          Sign In
        </Text>

        <Controller
          control={control}
          name="email"
          rules={{
            required: 'Email is required',
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: 'Invalid email format',
            },
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Email"
              mode="outlined"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              style={styles.input}
              error={!!errors.email}
            />
          )}
        />
        {errors.email && (
          <HelperText type="error">{errors.email.message}</HelperText>
        )}

        <Controller
          control={control}
          name="password"
          rules={{ required: 'Password is required' }}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Password"
              mode="outlined"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              secureTextEntry
              autoComplete="password"
              style={styles.input}
              error={!!errors.password}
            />
          )}
        />
        {errors.password && (
          <HelperText type="error">{errors.password.message}</HelperText>
        )}

        {error ? <HelperText type="error">{error}</HelperText> : null}

        <Button
          mode="contained"
          onPress={handleSubmit(onSubmit)}
          loading={isLoading}
          disabled={isLoading}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Sign In
        </Button>

        <Button
          mode="text"
          onPress={() => router.push('/(auth)/forgot-password')}
          style={styles.linkButton}
        >
          Forgot Password?
        </Button>

        <Button
          mode="text"
          onPress={() => router.back()}
          style={styles.linkButton}
        >
          Back
        </Button>
      </ScrollView>

      {/* Recovery Passphrase Modal */}
      <Portal>
        <Dialog
          visible={showRecoveryModal}
          onDismiss={handleCancelRecovery}
          dismissable={!isLoading}
        >
          <Dialog.Title>Enter Recovery Passphrase</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.recoveryDescription}>
              Your password was recently reset. Enter your 6-word recovery
              passphrase to restore access to your encrypted data.
            </Text>
            <TextInput
              label="Recovery Passphrase"
              mode="outlined"
              value={recoveryPassphrase}
              onChangeText={setRecoveryPassphrase}
              placeholder="word1 word2 word3 word4 word5 word6"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.recoveryInput}
              error={!!recoveryError}
              disabled={isRecoveryLocked()}
            />
            {recoveryError ? (
              <HelperText type="error">{recoveryError}</HelperText>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleCancelRecovery} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              onPress={handleRecoverySubmit}
              loading={isLoading}
              disabled={isLoading || isRecoveryLocked()}
            >
              Restore Access
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    flexGrow: 1,
  },
  title: {
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    marginBottom: 5,
  },
  button: {
    marginTop: 20,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  linkButton: {
    marginTop: 10,
  },
  recoveryDescription: {
    marginBottom: 15,
  },
  recoveryInput: {
    marginTop: 10,
  },
});
