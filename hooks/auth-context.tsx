import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  enableBiometric: (email: string, password: string) => Promise<{ error: Error | null }>;
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
    
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
        
        if (Platform.OS !== 'web') {
          setTimeout(() => {
            initBiometrics().catch(error => {
              console.warn('Biometric setup failed (non-critical):', error);
              if (mounted) {
                setIsBiometricAvailable(false);
                setIsBiometricEnabled(false);
              }
            });
          }, 2000);
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };
    
    const initBiometrics = async () => {
      if (!mounted) return;
      
      try {
        if (!LocalAuthentication || typeof LocalAuthentication.hasHardwareAsync !== 'function') {
          console.log('LocalAuthentication not available');
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
      } catch (error) {
        console.warn('Biometric initialization failed (non-critical):', error);
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

      if (session) {
        AsyncStorage.setItem('session', JSON.stringify(session)).catch(console.warn);
      } else {
        AsyncStorage.removeItem('session').catch(console.warn);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    await AsyncStorage.removeItem('session');
  };

  const sendMagicLink = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({ email });
    return { error };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://connect.ednabaptist.church/reset-password',
    });
    return { error };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error };
  };

  const biometricSignIn = async () => {
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
          if (!parsedData || typeof parsedData !== 'object' || !parsedData.email || !parsedData.password) {
            await deleteSecureItem(BIOMETRIC_KEY);
            setIsBiometricEnabled(false);
            return { error: new Error('Invalid biometric data. Please set up biometric authentication again.') };
          }
          const { email, password } = parsedData;
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          return { error };
        } catch (parseError) {
          console.error('Failed to parse biometric data:', parseError);
          await deleteSecureItem(BIOMETRIC_KEY);
          setIsBiometricEnabled(false);
          return { error: new Error('Invalid biometric data. Please set up biometric authentication again.') };
        }
      } else {
        return { error: new Error('Authentication failed') };
      }
    } catch (error) {
      return { error: error as Error };
    }
  };

  const enableBiometric = async (email: string, password: string) => {
    if (Platform.OS === 'web') {
      return { error: new Error('Biometric authentication not available on web') };
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Enable biometric authentication',
        fallbackLabel: 'Cancel',
        disableDeviceFallback: true,
      });

      if (result.success) {
        await setSecureItem(BIOMETRIC_KEY, JSON.stringify({ email, password }));
        await AsyncStorage.setItem('last_email', email);
        setIsBiometricEnabled(true);
        return { error: null };
      } else {
        return { error: new Error('Authentication failed') };
      }
    } catch (error) {
      return { error: error as Error };
    }
  };

  const disableBiometric = async () => {
    await deleteSecureItem(BIOMETRIC_KEY);
    setIsBiometricEnabled(false);
  };

  return {
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
  };
});
