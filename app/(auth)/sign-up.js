import { useState } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { Text, TextInput, Button, HelperText } from 'react-native-paper';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { signUp } from '../../src/services/auth';

export default function SignUpScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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
      await signUp(data.email, data.password);
      router.replace('/(app)');
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text variant='headlineMedium' style={styles.title}>
          Create Account
        </Text>

        <Controller
          control={control}
          name='email'
          rules={{
            required: 'Email is required',
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: 'Invalid email format',
            },
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label='Email'
              mode='outlined'
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              keyboardType='email-address'
              autoCapitalize='none'
              autoComplete='email'
              style={styles.input}
              error={!!errors.email}
            />
          )}
        />
        {errors.email && (
          <HelperText type='error'>{errors.email.message}</HelperText>
        )}

        <Controller
          control={control}
          name='password'
          rules={{
            required: 'Password is required',
            validate: validatePassword,
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label='Password'
              mode='outlined'
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              secureTextEntry
              autoComplete='password-new'
              style={styles.input}
              error={!!errors.password}
            />
          )}
        />
        {errors.password && (
          <HelperText type='error'>{errors.password.message}</HelperText>
        )}

        <Controller
          control={control}
          name='confirmPassword'
          rules={{ required: 'Please confirm your password' }}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label='Confirm Password'
              mode='outlined'
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
          <HelperText type='error'>{errors.confirmPassword.message}</HelperText>
        )}

        <Text variant='bodySmall' style={styles.requirements}>
          Password must be at least 8 characters with uppercase, lowercase, and a digit
        </Text>

        {error ? <HelperText type='error'>{error}</HelperText> : null}

        <Button
          mode='contained'
          onPress={handleSubmit(onSubmit)}
          loading={isLoading}
          disabled={isLoading}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Create Account
        </Button>

        <Button
          mode='text'
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
});
