import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '@/hooks/user-context';
import { useAuth } from '@/hooks/auth-context';
import { useNotifications } from '@/hooks/notification-context';
import { supabase } from '@/lib/supabase';
import { User, Bell, Shield, LogOut, AlertCircle, Fingerprint, ChevronRight, Info, Code, ExternalLink, Smartphone } from 'lucide-react-native';
import { Image, Linking } from 'react-native';
import { useMe } from '@/hooks/me-context';
import { NotificationPreferencesSection } from '@/components/NotificationPreferences';
import { NotificationPreferences } from '@/lib/notification-preferences';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/colors';

export default function SettingsScreen() {
  const { profile } = useUser();
  const { myRole } = useMe();
  const { user, isBiometricAvailable, isBiometricEnabled, enableBiometric, disableBiometric } = useAuth();
  const isAdmin = myRole === 'admin' || myRole === 'leader';
  const { unreadCount } = useNotifications();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const [isEnablingBiometric, setIsEnablingBiometric] = useState(false);
  
  const isPending = profile?.role === 'pending';

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.auth.signOut();
              router.replace('/');
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  const toggleNotifications = () => {
    setNotificationsEnabled(!notificationsEnabled);
  };

  const handleNotificationPreferencesChange = (preferences: NotificationPreferences) => {
    console.log('Notification preferences updated:', preferences);
  };

  const toggleBiometric = async () => {
    if (isBiometricEnabled) {
      Alert.alert(
        'Disable Biometric Authentication',
        'Are you sure you want to disable biometric authentication?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: async () => {
              await disableBiometric();
            },
          },
        ]
      );
    } else {
      if (!user?.email) return;
      
      Alert.alert(
        'Enable Biometric Authentication',
        'You will need to re-enter your password to enable biometric authentication.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue',
            onPress: () => {
              Alert.prompt(
                'Enter Password',
                'Please enter your password to enable biometric authentication',
                async (password) => {
                  if (password) {
                    setIsEnablingBiometric(true);
                    const { error } = await enableBiometric(user.email!, password);
                    setIsEnablingBiometric(false);
                    if (error) {
                      Alert.alert('Error', error.message);
                    } else {
                      Alert.alert('Success', 'Biometric authentication enabled');
                    }
                  }
                },
                'secure-text'
              );
            },
          },
        ]
      );
    }
  };

  if (!profile) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => router.push('/notifications' as any)}
          >
            <Bell size={24} color="#6B7280" />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <User size={20} color="#6B7280" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{user?.email}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Role & Status Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Role & Status</Text>
          
          {isPending && (
            <View style={styles.pendingBanner}>
              <AlertCircle size={20} color="#F59E0B" />
              <Text style={styles.pendingText}>
                Your account is pending approval
              </Text>
            </View>
          )}
          
          <View style={styles.card}>
            <View style={styles.roleRow}>
              <View style={styles.roleInfo}>
                <Shield size={20} color="#6B7280" />
                <View style={styles.roleContent}>
                  <Text style={styles.roleLabel}>Current Role</Text>
                  <View style={styles.roleContainer}>
                    <View style={[styles.roleBadge, isPending && styles.pendingBadge]}>
                      <Text style={[styles.roleText, isPending && styles.pendingRoleText]}>
                        {profile.role?.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
            
            {profile.approved_at && (
              <View style={styles.approvedInfo}>
                <Text style={styles.approvedText}>
                  Approved on {new Date(profile.approved_at).toLocaleDateString()}
                </Text>
              </View>
            )}
            
            {isPending && (
              <View style={styles.pendingInfo}>
                <Text style={styles.pendingInfoText}>
                  Your account is awaiting approval from an administrator.
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Security Section */}
        {isBiometricAvailable && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Security</Text>
            
            <View style={styles.card}>
              <View style={styles.notificationRow}>
                <View style={styles.notificationInfo}>
                  <Fingerprint size={20} color="#6B7280" />
                  <View style={styles.settingContent}>
                    <Text style={styles.settingLabel}>Biometric Authentication</Text>
                    <Text style={styles.settingDescription}>
                      Use Face ID or Touch ID to sign in
                    </Text>
                  </View>
                </View>
                <Switch
                  value={isBiometricEnabled}
                  onValueChange={toggleBiometric}
                  trackColor={{ false: '#E5E7EB', true: '#DDD6FE' }}
                  thumbColor={isBiometricEnabled ? '#7C3AED' : '#9CA3AF'}
                  disabled={isEnablingBiometric}
                />
              </View>
            </View>
          </View>
        )}

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <View style={styles.card}>
            <View style={styles.notificationRow}>
              <View style={styles.notificationInfo}>
                <Bell size={20} color="#6B7280" />
                <View style={styles.settingContent}>
                  <Text style={styles.settingLabel}>Push Notifications</Text>
                  <Text style={styles.settingDescription}>
                    Receive updates about church events and announcements
                  </Text>
                </View>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={toggleNotifications}
                trackColor={{ false: Colors.switch.trackOff, true: Colors.switch.trackOn }}
                thumbColor={notificationsEnabled ? Colors.switch.thumbOn : Colors.switch.thumbOff}
              />
            </View>
          </View>
          
          {/* Detailed Notification Preferences */}
          {notificationsEnabled && (
            <View style={styles.preferencesContainer}>
              <NotificationPreferencesSection 
                onPreferencesChange={handleNotificationPreferencesChange}
              />
            </View>
          )}
        </View>

        {/* Admin Section */}
        {isAdmin && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Administration</Text>
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push('/(tabs)/admin' as any)}
            >
              <View style={styles.adminRow}>
                <View style={styles.adminRowLeft}>
                  <View style={styles.adminIcon}>
                    <Shield size={20} color="#E11D48" />
                  </View>
                  <View>
                    <Text style={styles.adminLabel}>Admin Panel</Text>
                    <Text style={styles.adminDescription}>Manage users, settings, and content</Text>
                  </View>
                </View>
                <ChevronRight size={20} color="#94A3B8" />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Actions Section */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <LogOut size={20} color="#EF4444" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.aboutCard}>
            <Image
              source={require('@/assets/images/ebc-icon-mark-color.png')}
              style={styles.aboutLogo}
              resizeMode="contain"
            />
            <Text style={styles.aboutAppName}>EBC Connect</Text>
            <Text style={styles.aboutChurch}>Edna Baptist Church</Text>
            <Text style={styles.aboutVersion}>Version 1.0.0</Text>
            <View style={styles.aboutDivider} />
            <View style={styles.developerRow}>
              <Code size={16} color="#6B7280" />
              <Text style={styles.developerLabel}>Developed by</Text>
            </View>
            <Text style={styles.developerName}>Caleb McWhorter</Text>
            <TouchableOpacity
              style={styles.developerLink}
              onPress={() => Linking.openURL('mailto:caleb@ednabc.org')}
            >
              <ExternalLink size={14} color="#1C2E4A" />
              <Text style={styles.developerLinkText}>caleb@ednabc.org</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: '#111827',
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500' as const,
  },
  settingContent: {
    marginLeft: 12,
  },
  settingLabel: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500' as const,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  roleContent: {
    marginLeft: 12,
    flex: 1,
  },
  roleLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  roleContainer: {
    flexDirection: 'row',
  },
  roleBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  pendingBadge: {
    backgroundColor: '#F59E0B',
  },
  roleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  pendingRoleText: {
    color: '#FFFFFF',
  },
  approvedInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  approvedText: {
    color: '#6B7280',
    fontSize: 12,
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    borderRadius: 12,
  },
  pendingText: {
    marginLeft: 8,
    color: '#92400E',
    fontSize: 14,
    fontWeight: '500' as const,
  },
  pendingInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  pendingInfoText: {
    color: '#6B7280',
    fontSize: 12,
    fontStyle: 'italic',
  },

  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notificationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#EF4444',
    marginLeft: 8,
  },
  bottomPadding: {
    height: 40,
  },
  aboutCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  aboutLogo: {
    width: 56,
    height: 56,
    marginBottom: 12,
  },
  aboutAppName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1C2E4A',
    marginBottom: 2,
  },
  aboutChurch: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  aboutVersion: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  aboutDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#F3F4F6',
    marginBottom: 16,
  },
  developerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  developerLabel: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  developerName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#111827',
    marginBottom: 8,
  },
  developerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F0F3F8',
    borderRadius: 8,
  },
  developerLinkText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#1C2E4A',
  },
  preferencesContainer: {
    marginTop: 16,
  },
  adminRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  adminRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  adminIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFF1F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#111827',
  },
  adminDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
});