import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StyleSheet, Platform } from "react-native";
import { AuthProvider } from "@/hooks/auth-context";
import { UserProvider } from "@/hooks/user-context";
import { MeProvider } from "@/hooks/me-context";
import { ToastProvider, ToastRenderer } from "@/hooks/toast-context";

// Prevent auto hide only on native platforms
if (Platform.OS !== 'web') {
  SplashScreen.preventAutoHideAsync();
}

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="visitor-profile" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [isReady, setIsReady] = useState(Platform.OS === 'web');

  useEffect(() => {
    if (Platform.OS === 'web') {
      // On web, we're immediately ready
      return;
    }

    // On native, hide splash screen after a short delay
    const timer = setTimeout(() => {
      SplashScreen.hideAsync().finally(() => {
        setIsReady(true);
      });
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // On native, don't render until splash is handled
  if (!isReady) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <GestureHandlerRootView style={styles.container}>
          <AuthProvider>
            <UserProvider>
              <MeProvider>
                <RootLayoutNav />
                <ToastRenderer />
              </MeProvider>
            </UserProvider>
          </AuthProvider>
        </GestureHandlerRootView>
      </ToastProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});