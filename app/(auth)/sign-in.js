import { useState, useCallback } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { Text, TextInput, Button, HelperText } from 'react-native-paper';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { signIn } from '../../src/services/auth';

export default function SignInScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formKey, setFormKey] = useState(0);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Workaround for iOS Keychain autofill bug with React Native Paper TextInput.
  // When iOS autofill populates credentials, it can leave the TextInput in an
  // unresponsive state (yellow background, can't type). This happens because
  // the native autofill bypasses React's controlled input state. Forcing a
  // re-mount via key change when the screen regains focus clears this state.
  useFocusEffect(
    useCallback(() => {
      return () => {
        setFormKey((k) => k + 1);
        reset();
        setError('');
      };
    }, [reset])
  );

  const onSubmit = async (data) => {
    setIsLoading(true);
    setError('');

    try {
      await signIn(data.email, data.password);
      router.replace('/(app)');
    } catch (err) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView key={formKey} contentContainerStyle={styles.scrollContent}>
        <Text variant='headlineMedium' style={styles.title}>
          Sign In
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
              onChangeText={(text) => onChange(text)}
              value={value}
              keyboardType='email-address'
              autoCapitalize='none'
              autoComplete='email'
              textContentType='emailAddress'
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
          rules={{ required: 'Password is required' }}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label='Password'
              mode='outlined'
              onBlur={onBlur}
              onChangeText={(text) => onChange(text)}
              value={value}
              secureTextEntry
              autoComplete='password'
              textContentType='password'
              style={styles.input}
              error={!!errors.password}
            />
          )}
        />
        {errors.password && (
          <HelperText type='error'>{errors.password.message}</HelperText>
        )}

        {error ? <HelperText type='error'>{error}</HelperText> : null}

        <Button
          mode='contained'
          onPress={handleSubmit(onSubmit)}
          loading={isLoading}
          disabled={isLoading}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Sign In
        </Button>

        <Button
          mode='text'
          onPress={() => router.push('/(auth)/forgot-password')}
          style={styles.linkButton}
        >
          Forgot Password?
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
});
