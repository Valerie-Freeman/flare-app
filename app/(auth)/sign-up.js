import { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, TextInput, Button, HelperText, Card, Checkbox } from 'react-native-paper';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import * as Clipboard from 'expo-clipboard';
import { signUp } from '../../src/services/auth';

export default function SignUpScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('form'); // 'form' | 'passphrase' | 'confirm'
  const [recoveryPassphrase, setRecoveryPassphrase] = useState('');
  const [passphraseConfirmed, setPassphraseConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const validatePassword = (value) => {
    if (value.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(value)) return 'Password must contain an uppercase letter';
    if (!/[a-z]/.test(value)) return 'Password must contain a lowercase letter';
    if (!/[0-9]/.test(value)) return 'Password must contain a digit';
    return true;
  };

  const onSubmit = async (data) => {
    if (data.password !== data.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { passphrase } = await signUp(data.email, data.password);
      setRecoveryPassphrase(passphrase);
      setStep('passphrase');
    } catch (err) {
      if (err.message?.includes('already registered')) {
        setError('An account with this email already exists');
      } else {
        setError(err.message || 'Failed to create account');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const copyPassphrase = async () => {
    await Clipboard.setStringAsync(recoveryPassphrase);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmAndContinue = () => {
    if (passphraseConfirmed) {
      router.replace('/(app)');
    }
  };

  if (step === 'passphrase') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text variant="headlineMedium" style={styles.title}>
            Save Your Recovery Passphrase
          </Text>

          <Text variant="bodyMedium" style={styles.warning}>
            Write down these 6 words and store them safely. You will need them to recover your account if you forget your password.
          </Text>

          <Card style={styles.passphraseCard}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.passphrase}>
                {recoveryPassphrase}
              </Text>
            </Card.Content>
          </Card>

          <Button
            mode="outlined"
            onPress={copyPassphrase}
            style={styles.copyButton}
            icon={copied ? 'check' : 'content-copy'}
          >
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </Button>

          <View style={styles.checkboxRow}>
            <Checkbox
              status={passphraseConfirmed ? 'checked' : 'unchecked'}
              onPress={() => setPassphraseConfirmed(!passphraseConfirmed)}
            />
            <Text
              variant="bodyMedium"
              style={styles.checkboxLabel}
              onPress={() => setPassphraseConfirmed(!passphraseConfirmed)}
            >
              I have saved my recovery passphrase in a safe place
            </Text>
          </View>

          <Button
            mode="contained"
            onPress={handleConfirmAndContinue}
            disabled={!passphraseConfirmed}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            Continue to App
          </Button>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text variant="headlineMedium" style={styles.title}>
          Create Account
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
          rules={{
            required: 'Password is required',
            validate: validatePassword,
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Password"
              mode="outlined"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              secureTextEntry
              autoComplete="password-new"
              style={styles.input}
              error={!!errors.password}
            />
          )}
        />
        {errors.password && (
          <HelperText type="error">{errors.password.message}</HelperText>
        )}

        <Controller
          control={control}
          name="confirmPassword"
          rules={{ required: 'Please confirm your password' }}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Confirm Password"
              mode="outlined"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              secureTextEntry
              style={styles.input}
              error={!!errors.confirmPassword}
            />
          )}
        />
        {errors.confirmPassword && (
          <HelperText type="error">{errors.confirmPassword.message}</HelperText>
        )}

        <Text variant="bodySmall" style={styles.requirements}>
          Password must be at least 8 characters with uppercase, lowercase, and a digit
        </Text>

        {error ? <HelperText type="error">{error}</HelperText> : null}

        <Button
          mode="contained"
          onPress={handleSubmit(onSubmit)}
          loading={isLoading}
          disabled={isLoading}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Create Account
        </Button>

        <Button
          mode="text"
          onPress={() => router.back()}
          style={styles.linkButton}
        >
          Back
        </Button>
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
    flexGrow: 1,
  },
  title: {
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    marginBottom: 5,
  },
  requirements: {
    opacity: 0.6,
    marginTop: 5,
    marginBottom: 10,
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
  warning: {
    marginBottom: 20,
    textAlign: 'center',
    color: '#B00020',
  },
  passphraseCard: {
    marginVertical: 20,
  },
  passphrase: {
    textAlign: 'center',
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  copyButton: {
    marginBottom: 20,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkboxLabel: {
    flex: 1,
  },
});
