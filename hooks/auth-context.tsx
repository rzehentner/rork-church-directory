import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  sendMagicLink: (email: string) => Promise<{ error: Error | null }>;
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
        
        if (Platform.OS !== 'web') {
          try {
            const compatible = await LocalAuthentication.hasHardwareAsync();
            const enrolled = await LocalAuthentication.isEnrolledAsync();
            
            if (mounted) {
              setIsBiometricAvailable(compatible && enrolled);
            }
            
            const biometricData = await AsyncStorage.getItem('biometric_credentials');
            
            if (mounted) {
              setIsBiometricEnabled(!!biometricData);
            }
          } catch (error) {
            console.warn('Biometric setup failed:', error);
            if (mounted) {
              setIsBiometricAvailable(false);
              setIsBiometricEnabled(false);
            }
          }
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };
    
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (!mounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      
      // Handle session storage safely
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
    if (!error && isBiometricAvailable) {
      const biometricData = await AsyncStorage.getItem('biometric_credentials');
      if (!biometricData) {
        const savedEmail = await AsyncStorage.getItem('last_email');
        if (savedEmail === email) {
          await AsyncStorage.setItem('biometric_credentials', JSON.stringify({ email, password }));
          setIsBiometricEnabled(true);
        }
      }
    }
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

  const biometricSignIn = async () => {
    if (Platform.OS === 'web') {
      return { error: new Error('Biometric authentication not available on web') };
    }

    try {
      const biometricData = await AsyncStorage.getItem('biometric_credentials');
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
            await AsyncStorage.removeItem('biometric_credentials');
            setIsBiometricEnabled(false);
            return { error: new Error('Invalid biometric data. Please set up biometric authentication again.') };
          }
          const { email, password } = parsedData;
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          return { error };
        } catch (parseError) {
          console.error('Failed to parse biometric data:', parseError);
          await AsyncStorage.removeItem('biometric_credentials');
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
        await AsyncStorage.setItem('biometric_credentials', JSON.stringify({ email, password }));
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
    await AsyncStorage.removeItem('biometric_credentials');
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
    biometricSignIn,
    isBiometricAvailable,
    isBiometricEnabled,
    enableBiometric,
    disableBiometric,
  };
});