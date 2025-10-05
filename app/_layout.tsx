import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState, Component, ErrorInfo, ReactNode } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StyleSheet, Platform, View, Text, TouchableOpacity, ScrollView } from "react-native";
import { AuthProvider } from "@/hooks/auth-context";
import { UserProvider } from "@/hooks/user-context";
import { MeProvider } from "@/hooks/me-context";
import { ToastProvider, ToastRenderer } from "@/hooks/toast-context";
import { NotificationProvider } from "@/hooks/notification-context";

// Prevent auto hide only on native platforms
if (Platform.OS !== 'web') {
  SplashScreen.preventAutoHideAsync().catch(() => {
    // Ignore errors on web or if already prevented
  });
}

// Error Boundary Component
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={errorStyles.container}>
          <View style={errorStyles.content}>
            <Text style={errorStyles.title}>Something went wrong</Text>
            <Text style={errorStyles.message}>
              The app encountered an error during initialization.
            </Text>
            <ScrollView style={errorStyles.errorBox}>
              <Text style={errorStyles.errorText}>
                {this.state.error?.toString()}
              </Text>
              {this.state.errorInfo && (
                <Text style={errorStyles.errorText}>
                  {this.state.errorInfo.componentStack}
                </Text>
              )}
            </ScrollView>
            <TouchableOpacity
              style={errorStyles.button}
              onPress={() => {
                this.setState({ hasError: false, error: null, errorInfo: null });
              }}
            >
              <Text style={errorStyles.buttonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 400,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#DC2626',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 24,
  },
  errorBox: {
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    maxHeight: 300,
  },
  errorText: {
    color: '#F87171',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  button: {
    backgroundColor: '#7C3AED',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000, // 30 seconds
      refetchOnWindowFocus: false,
    },
  },
});

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="visitor-profile" options={{ headerShown: false }} />
      <Stack.Screen name="event-detail" options={{ title: "Event Details" }} />
      <Stack.Screen name="create-event" options={{ title: "Create Event" }} />
      <Stack.Screen name="edit-event" options={{ title: "Edit Event" }} />
      <Stack.Screen name="create-announcement" options={{ title: "Create Announcement" }} />
      <Stack.Screen name="join-family" options={{ title: "Join Family" }} />
      <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        if (Platform.OS !== 'web') {
          // Small delay to ensure everything is loaded
          await new Promise(resolve => setTimeout(resolve, 200));
          await SplashScreen.hideAsync();
        }
      } catch (error) {
        console.warn('Error hiding splash screen:', error);
      } finally {
        setIsReady(true);
      }
    };

    initializeApp();
  }, []);

  // Don't render until ready
  if (!isReady) {
    return null;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <GestureHandlerRootView style={styles.container}>
            <AuthProvider>
              <UserProvider>
                <MeProvider>
                  <NotificationProvider>
                    <RootLayoutNav />
                    <ToastRenderer />
                  </NotificationProvider>
                </MeProvider>
              </UserProvider>
            </AuthProvider>
          </GestureHandlerRootView>
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});