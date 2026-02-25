import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { router } from 'expo-router';

const BIOMETRIC_KEY = 'biometric_credentials';

async function getSecureItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  return SecureStore.getItemAsync(key);
}

async function setSecureItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') return;
  await SecureStore.setItemAsync(key, value);
}

async function deleteSecureItem(key: string): Promise<void> {
  if (Platform.OS === 'web') return;
  await SecureStore.deleteItemAsync(key);
}

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  sendMagicLink: (email: string) => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  biometricSignIn: () => Promise<{ error: Error | null }>;
  isBiometricAvailable: boolean;
  isBiometricEnabled: boolean;
  enableBiometric: () => Promise<{ error: Error | null }>;
  disableBiometric: () => Promise<void>;
}

export const [AuthProvider, useAuth] = createContextHook<AuthState>(() => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);

  useEffect(() => {
    let mounted = true;
    let biometricTimer: ReturnType<typeof setTimeout>;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);

        if (Platform.OS !== 'web') {
          biometricTimer = setTimeout(() => {
            initBiometrics().catch(error => {
              if (mounted) {
                setIsBiometricAvailable(false);
                setIsBiometricEnabled(false);
              }
            });
          }, 2000);
        }
      } catch {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    const initBiometrics = async () => {
      if (!mounted) return;

      try {
        if (!LocalAuthentication || typeof LocalAuthentication.hasHardwareAsync !== 'function') {
          if (mounted) {
            setIsBiometricAvailable(false);
            setIsBiometricEnabled(false);
          }
          return;
        }
        
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        
        if (mounted) {
          setIsBiometricAvailable(compatible && enrolled);
        }
        
        const biometricData = await getSecureItem(BIOMETRIC_KEY);

        if (mounted) {
          setIsBiometricEnabled(!!biometricData);
        }
      } catch {
        if (mounted) {
          setIsBiometricAvailable(false);
          setIsBiometricEnabled(false);
        }
      }
    };
    
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (!mounted) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (event === 'PASSWORD_RECOVERY') {
        router.replace('/reset-password' as any);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(biometricTimer);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    await deleteSecureItem(BIOMETRIC_KEY);
    setIsBiometricEnabled(false);
  }, []);

  const sendMagicLink = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({ email });
    return { error };
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://connect.ednabaptist.church/reset-password',
    });
    return { error };
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error };
  }, []);

  const biometricSignIn = useCallback(async () => {
    if (Platform.OS === 'web') {
      return { error: new Error('Biometric authentication not available on web') };
    }

    try {
      const biometricData = await getSecureItem(BIOMETRIC_KEY);
      if (!biometricData) {
        return { error: new Error('Biometric authentication not set up') };
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to sign in',
        fallbackLabel: 'Use password',
        disableDeviceFallback: false,
      });

      if (result.success) {
        try {
          const parsedData = JSON.parse(biometricData);
          if (!parsedData || typeof parsedData !== 'object' || !parsedData.refresh_token) {
            await deleteSecureItem(BIOMETRIC_KEY);
            setIsBiometricEnabled(false);
            return { error: new Error('Biometric data expired. Please sign in with your password and re-enable biometrics.') };
          }
          const { data, error } = await supabase.auth.refreshSession({
            refresh_token: parsedData.refresh_token,
          });
          if (error || !data.session) {
            await deleteSecureItem(BIOMETRIC_KEY);
            setIsBiometricEnabled(false);
            return { error: error ?? new Error('Session expired. Please sign in with your password and re-enable biometrics.') };
          }
          return { error: null };
        } catch (parseError) {
          await deleteSecureItem(BIOMETRIC_KEY);
          setIsBiometricEnabled(false);
          return { error: new Error('Biometric data expired. Please sign in with your password and re-enable biometrics.') };
        }
      } else {
        return { error: new Error('Authentication failed') };
      }
    } catch (error) {
      return { error: error as Error };
    }
  }, []);

  const enableBiometric = useCallback(async () => {
    if (Platform.OS === 'web') {
      return { error: new Error('Biometric authentication not available on web') };
    }

    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession?.refresh_token) {
        return { error: new Error('No active session. Please sign in first.') };
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Enable biometric authentication',
        fallbackLabel: 'Cancel',
        disableDeviceFallback: true,
      });

      if (result.success) {
        await setSecureItem(BIOMETRIC_KEY, JSON.stringify({
          refresh_token: currentSession.refresh_token,
        }));
        setIsBiometricEnabled(true);
        return { error: null };
      } else {
        return { error: new Error('Authentication failed') };
      }
    } catch (error) {
      return { error: error as Error };
    }
  }, []);

  const disableBiometric = useCallback(async () => {
    await deleteSecureItem(BIOMETRIC_KEY);
    setIsBiometricEnabled(false);
  }, []);

  return useMemo(() => ({
    session,
    user,
    isLoading,
    signIn,
    signUp,
    signOut,
    sendMagicLink,
    resetPassword,
    updatePassword,
    biometricSignIn,
    isBiometricAvailable,
    isBiometricEnabled,
    enableBiometric,
    disableBiometric,
  }), [
    session,
    user,
    isLoading,
    signIn,
    signUp,
    signOut,
    sendMagicLink,
    resetPassword,
    updatePassword,
    biometricSignIn,
    isBiometricAvailable,
    isBiometricEnabled,
    enableBiometric,
    disableBiometric,
  ]);
});
