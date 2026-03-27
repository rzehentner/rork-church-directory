import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/auth-context';
import { useUser } from '@/hooks/user-context';
import { View, ActivityIndicator, StyleSheet, Text, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';

export default function IndexScreen() {
  const { user, isLoading: authLoading } = useAuth();
  const { profile, person, isLoading: userLoading } = useUser();
  const isNavigatingRef = useRef(false);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      if (!isNavigatingRef.current) {
        setShowFallback(true);
      }
    }, 15000);

    return () => clearTimeout(safetyTimer);
  }, []);

  useEffect(() => {
    if (!authLoading && !userLoading && !isNavigatingRef.current) {
      isNavigatingRef.current = true;

      if (user) {
        if ((profile?.role === 'pending' || profile?.role === 'visitor') && (!person || !person.first_name || !person.last_name)) {
          router.replace('/visitor-profile' as any);
        } else {
          router.replace('/(tabs)/dashboard' as any);
        }
      } else {
        router.replace('/(auth)/login' as any);
      }
    }
  }, [user, profile, person, authLoading, userLoading]);

  const handleGoToLogin = () => {
    if (!isNavigatingRef.current) {
      isNavigatingRef.current = true;
      router.replace('/(auth)/login' as any);
    }
  };

  const handleRetry = () => {
    setShowFallback(false);
    isNavigatingRef.current = false;
  };

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

        {showFallback ? (
          <View style={styles.fallbackSection}>
            <Text style={styles.fallbackText}>Taking longer than expected...</Text>
            <TouchableOpacity style={styles.fallbackButton} onPress={handleGoToLogin}>
              <Text style={styles.fallbackButtonText}>Go to Login</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.loadingSection}>
            <ActivityIndicator size="large" color={Colors.navy} />
            <Text style={styles.loadingText}>
              {authLoading ? 'Loading your church family...' : 'Welcome back!'}
            </Text>
          </View>
        )}
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
  fallbackSection: {
    alignItems: 'center',
    gap: 12,
  },
  fallbackText: {
    fontSize: 16,
    color: Colors.steelBlue,
    textAlign: 'center',
    marginBottom: 8,
  },
  fallbackButton: {
    backgroundColor: Colors.navy,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  fallbackButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.navy,
  },
  retryButtonText: {
    color: Colors.navy,
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
