import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/auth-context';
import { useUser } from '@/hooks/user-context';
import { View, ActivityIndicator, StyleSheet, Text, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';

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
          <Image
            source={require('@/assets/images/ebc-logo-stacked-color.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.tagline}>Edna Baptist Church</Text>
        </View>

        <View style={styles.loadingSection}>
          <ActivityIndicator size="large" color={Colors.navy} />
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
    backgroundColor: Colors.warmWhite,
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
  logoImage: {
    width: 160,
    height: 160,
    marginBottom: 16,
  },
  tagline: {
    fontSize: 16,
    color: Colors.steelBlue,
    textAlign: 'center',
    lineHeight: 24,
  },
  loadingSection: {
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.steelBlue,
    textAlign: 'center',
  },
});
