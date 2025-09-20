import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/auth-context';
import { useUser } from '@/hooks/user-context';
import { View, ActivityIndicator, StyleSheet, Text, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Home } from 'lucide-react-native';

export default function IndexScreen() {
  const { user, isLoading: authLoading } = useAuth();
  const { profile, person, isLoading: userLoading } = useUser();
  const [showSplash, setShowSplash] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Minimum splash duration for better UX
    const splashTimer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);

    return () => clearTimeout(splashTimer);
  }, [fadeAnim]);

  useEffect(() => {
    if (!authLoading && !userLoading && !showSplash) {
      if (user) {
        // Check if user is a visitor (pending) without a complete profile
        if (profile?.role === 'pending' && (!person || !person.first_name || !person.last_name)) {
          router.replace('/visitor-profile');
        } else {
          router.replace('/(tabs)/family');
        }
      } else {
        router.replace('/(auth)/login');
      }
    }
  }, [user, profile, person, authLoading, userLoading, showSplash]);

  if (authLoading || userLoading || showSplash) {
    return (
      <SafeAreaView style={styles.container}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <View style={styles.logoContainer}>
            <View style={styles.iconBackground}>
              <Home size={48} color="#FFFFFF" />
            </View>
            <Text style={styles.appName}>EBC Connect</Text>
            <Text style={styles.tagline}>Edna Baptist Church Community</Text>
          </View>
          
          <View style={styles.loadingSection}>
            <ActivityIndicator size="large" color="#7C3AED" />
            <Text style={styles.loadingText}>
              {authLoading || userLoading ? 'Loading your church family...' : 'Welcome back!'}
            </Text>
          </View>
        </Animated.View>
      </SafeAreaView>
    );
  }

  return null;
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
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#7C3AED',
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