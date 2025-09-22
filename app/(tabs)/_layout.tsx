import { Tabs } from "expo-router";
import { Users, Home, Shield, Settings, Bell, Calendar } from "lucide-react-native";
import React from "react";
import { useUser } from "@/hooks/user-context";

export default function TabLayout() {
  const { profile, isLoading } = useUser();
  
  // Debug logging
  console.log('🔍 TabLayout - isLoading:', isLoading, 'profile:', profile, 'role:', profile?.role);
  
  const isAdmin = !isLoading && (profile?.role === 'admin' || profile?.role === 'leader');
  
  console.log('🔍 TabLayout - isAdmin:', isAdmin);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#7C3AED',
        tabBarInactiveTintColor: '#9CA3AF',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          paddingBottom: 4,
          paddingTop: 4,
          height: 56,
        },
      }}
    >
      <Tabs.Screen
        name="family"
        options={{
          title: "My Family",
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="directory"
        options={{
          title: "Directory",
          tabBarIcon: ({ color }) => <Users size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="announcements"
        options={{
          title: "Announcements",
          tabBarIcon: ({ color }) => <Bell size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: "Events",
          tabBarIcon: ({ color }) => <Calendar size={24} color={color} />,
        }}
      />
      {isAdmin && (
        <Tabs.Screen
          name="admin"
          options={{
            title: "Admin",
            tabBarIcon: ({ color }) => <Shield size={24} color={color} />,
          }}
        />
      )}
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => <Settings size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}