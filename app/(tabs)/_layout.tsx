import { Tabs } from "expo-router";
import { Users, Home, Settings, Zap, Shield } from "lucide-react-native";
import React from "react";
import { useUser } from "@/hooks/user-context";

export default function TabLayout() {
  const { profile, isLoading } = useUser();
  
  const isAdmin = !isLoading && (profile?.role === 'admin' || profile?.role === 'leader');

  return (
    <Tabs
      initialRouteName="dashboard"
      screenOptions={{
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#94A3B8',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E2E8F0',
          paddingBottom: 4,
          paddingTop: 4,
          height: 56,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: "Activity",
          tabBarIcon: ({ color, size }) => <Zap size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="directory"
        options={{
          title: "Directory",
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
      {/* Hidden tabs - accessible via hub navigation */}
      <Tabs.Screen
        name="family"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="announcements"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="events"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="prayers"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="forms"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="admin"
        options={{ href: null }}
      />
    </Tabs>
  );
}
