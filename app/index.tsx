import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/auth-context';
import { useUser } from '@/hooks/user-context';
import { View, ActivityIndicator, StyleSheet, Text, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Home } from 'lucide-react-native';

export default function IndexScreen() {
  const { user, isLoading: authLoading } = useAuth();
  const { profile, person, isLoading: userLoading } = useUser();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    // Shorter timeout for web to prevent hydration issues
    const timeout = Platform.OS === 'web' ? 3000 : 8000;
    
    const forceTimer = setTimeout(() => {
      console.warn('Forcing navigation due to timeout');
      if (!isNavigating) {
        setIsNavigating(true);
        router.replace('/(auth)/login');
      }
    }, timeout);

    return () => clearTimeout(forceTimer);
  }, [isNavigating]);

  useEffect(() => {
    if (!authLoading && !isNavigating) {
      setIsNavigating(true);
      
      if (user) {
        // Check if user is a visitor (pending) without a complete profile
        if (profile?.role === 'pending' && (!person || !person.first_name || !person.last_name)) {
          router.replace('/visitor-profile');
        } else {
          router.replace('/(tabs)/dashboard');
        }
      } else {
        router.replace('/(auth)/login');
      }
    }
  }, [user, profile, person, authLoading, userLoading, isNavigating]);

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
          <ActivityIndicator size="large" color="#7C3AED" />
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