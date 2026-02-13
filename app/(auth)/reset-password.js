import { useState, useEffect } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { Text, TextInput, Button, HelperText } from 'react-native-paper';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { supabase } from '../../src/services/supabase';

export default function ResetPasswordScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm({
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const password = watch('password');

  useEffect(() => {
    // Check if we have a valid recovery session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsReady(true);
      } else {
        setError('Invalid or expired reset link. Please request a new one.');
      }
    };

    // Listen for auth state changes (recovery session)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'PASSWORD_RECOVERY' && session) {
          setIsReady(true);
          setError('');
        }
      }
    );

    checkSession();

    return () => subscription.unsubscribe();
  }, []);

  const onSubmit = async (data) => {
    setIsLoading(true);
    setError('');

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (updateError) {
        throw updateError;
      }

      // Sign out after password change
      await supabase.auth.signOut();
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text variant='headlineMedium' style={styles.title}>
            Password Reset Complete
          </Text>
          <Text variant='bodyLarge' style={styles.successText}>
            Your password has been successfully reset. You can now sign in with your new password.
          </Text>
          <Button
            mode='contained'
            onPress={() => router.replace('/(auth)/sign-in')}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            Sign In
          </Button>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text variant='headlineMedium' style={styles.title}>
          Set New Password
        </Text>

        {!isReady && error ? (
          <>
            <Text variant='bodyMedium' style={styles.errorText}>
              {error}
            </Text>
            <Button
              mode='contained'
              onPress={() => router.replace('/(auth)/forgot-password')}
              style={styles.button}
              contentStyle={styles.buttonContent}
            >
              Request New Link
            </Button>
          </>
        ) : (
          <>
            <Controller
              control={control}
              name='password'
              rules={{
                required: 'Password is required',
                minLength: {
                  value: 8,
                  message: 'Password must be at least 8 characters',
                },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label='New Password'
                  mode='outlined'
                  onBlur={onBlur}
                  onChangeText={(text) => onChange(text)}
                  value={value}
                  secureTextEntry
                  autoComplete='new-password'
                  textContentType='newPassword'
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
              rules={{
                required: 'Please confirm your password',
                validate: (value) =>
                  value === password || 'Passwords do not match',
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label='Confirm Password'
                  mode='outlined'
                  onBlur={onBlur}
                  onChangeText={(text) => onChange(text)}
                  value={value}
                  secureTextEntry
                  autoComplete='new-password'
                  textContentType='newPassword'
                  style={styles.input}
                  error={!!errors.confirmPassword}
                />
              )}
            />
            {errors.confirmPassword && (
              <HelperText type='error'>
                {errors.confirmPassword.message}
              </HelperText>
            )}

            {error ? <HelperText type='error'>{error}</HelperText> : null}

            <Button
              mode='contained'
              onPress={handleSubmit(onSubmit)}
              loading={isLoading}
              disabled={isLoading || !isReady}
              style={styles.button}
              contentStyle={styles.buttonContent}
            >
              Reset Password
            </Button>
          </>
        )}

        <Button
          mode='text'
          onPress={() => router.replace('/(auth)/sign-in')}
          style={styles.linkButton}
        >
          Back to Sign In
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
  successText: {
    marginBottom: 30,
    textAlign: 'center',
  },
  errorText: {
    marginBottom: 20,
    textAlign: 'center',
    opacity: 0.7,
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
