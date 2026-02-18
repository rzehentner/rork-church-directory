import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/auth-context';
import { useUser } from '@/hooks/user-context';
import { View, ActivityIndicator, StyleSheet, Text, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Home } from 'lucide-react-native';

export default function IndexScreen() {
  const { user, isLoading: authLoading } = useAuth();
  const { profile, person, isLoading: userLoading } = useUser();
  const isNavigatingRef = useRef(false);

  useEffect(() => {
    const timeout = Platform.OS === 'web' ? 2000 : 5000;

    const forceTimer = setTimeout(() => {
      console.log('[IndexScreen] Force timeout triggered');
      if (!isNavigatingRef.current) {
        isNavigatingRef.current = true;
        router.replace('/(auth)/login' as any);
      }
    }, timeout);

    return () => clearTimeout(forceTimer);
  }, []);

  useEffect(() => {
    console.log(`[IndexScreen] Auth loading: ${authLoading}, User loading: ${userLoading}`);
    console.log(`[IndexScreen] User: ${user ? 'exists' : 'null'}, Profile: ${profile ? profile.role : 'null'}`);

    if (!authLoading && !userLoading && !isNavigatingRef.current) {
      isNavigatingRef.current = true;

      if (user) {
        if ((profile?.role === 'pending' || profile?.role === 'visitor') && (!person || !person.first_name || !person.last_name)) {
          console.log('[IndexScreen] Navigating to visitor profile');
          router.replace('/visitor-profile' as any);
        } else {
          console.log('[IndexScreen] Navigating to dashboard');
          router.replace('/(tabs)/dashboard' as any);
        }
      } else {
        console.log('[IndexScreen] Navigating to login');
        router.replace('/(auth)/login' as any);
      }
    }
  }, [user, profile, person, authLoading, userLoading]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.iconBackground}>
            <Home size={48} color="#FFFFFF" />
          </View>
          <Text style={styles.appName}>EBC Connect</Text>
          <Text style={styles.tagline}>Edna Baptist Church Community</Text>
        </View>

        <View style={styles.loadingSection}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>
            {authLoading ? 'Loading your church family...' : 'Welcome back!'}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 64,
  },
  iconBackground: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold' as const,
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  loadingSection: {
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
});
