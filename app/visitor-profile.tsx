import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@/components/DateTimePicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '@/hooks/user-context';
import { useAuth } from '@/hooks/auth-context';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import {
  User,
  Mail,
  Phone,
  Calendar,
  ArrowRight,
  AlertCircle,
} from 'lucide-react-native';
import ImageUploader from '@/components/ImageUploader';
import { uploadPersonAvatar, getSignedUrl } from '@/lib/storage';
import { visitorProfileStyles as styles } from '@/styles/visitor-profile.styles';

export default function VisitorProfileScreen() {
  const { profile, person, refetch, isLoading } = useUser();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
  });

  // Load existing person data if available, or pre-populate with user email
  useEffect(() => {
    if (person) {
      setProfileForm({
        first_name: person.first_name || '',
        last_name: person.last_name || '',
        email: person.email || user?.email || '',
        phone: person.phone || '',
        date_of_birth: person.date_of_birth || '',
      });
      
      // Load avatar if exists
      const loadAvatar = async () => {
        if (person.photo_path) {
          try {
            const url = await getSignedUrl(person.photo_path);
            if (url) {
              setAvatarUrl(`${url}&t=${Date.now()}`);
            }
          } catch {
          }
        }
      };
      loadAvatar();
    } else if (user?.email && !profileForm.email) {
      // Pre-populate email from user registration if no person record exists
      setProfileForm(prev => ({
        ...prev,
        email: user.email || ''
      }));
    }
  }, [person, user?.email]);

  const handleUploadAvatar = async (file: any): Promise<string> => {
    if (!person) {
      Alert.alert('Error', 'Please save your profile first');
      throw new Error('No person record found');
    }
    
    try {
      const url = await uploadPersonAvatar(person.id, file);
      
      if (!url) {
        throw new Error('Upload failed - no URL returned');
      }
      
      // Immediately update the UI with the new URL
      setAvatarUrl(url);
      
      // Refresh the user data to get the updated photo_path
      await refetch();
      
      return url;
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('Upload Failed', error.message);
      }
      throw error;
    }
  };

  const handleSaveProfile = async () => {
    if (!profileForm.first_name.trim() || !profileForm.last_name.trim()) {
      Alert.alert('Error', 'Please enter your first and last name');
      return;
    }

    if (!profileForm.email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setIsSaving(true);

    try {
      if (person) {
        const { data, error } = await supabase
          .from('persons')
          .update({
            first_name: profileForm.first_name.trim(),
            last_name: profileForm.last_name.trim(),
            email: profileForm.email.trim(),
            phone: profileForm.phone?.trim() || null,
            date_of_birth: profileForm.date_of_birth || null,
          })
          .eq('id', person.id)
          .select();

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('persons')
          .insert({
            first_name: profileForm.first_name.trim(),
            last_name: profileForm.last_name.trim(),
            email: profileForm.email.trim(),
            phone: profileForm.phone?.trim() || null,
            date_of_birth: profileForm.date_of_birth || null,
            user_id: profile?.id,
            family_id: null, // Will be set when they join/create a family
          })
          .select();

        if (error) throw error;
      }

      await refetch();
      
      Alert.alert(
        'Success',
        'Your profile has been saved! You can now create or join a family.',
        [
          {
            text: 'Continue',
            onPress: () => router.replace('/(tabs)/family' as any),
          },
        ]
      );
    } catch (error) {
      let errorMessage = 'Failed to save profile. Please try again.';
      if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = `Failed to save profile: ${error.message}`;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Profile Setup',
      'You can complete your profile later in the Family tab. Continue to the app?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: () => router.replace('/(tabs)/family' as any),
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      </SafeAreaView>
    );
  }

  // If user is not pending/visitor, redirect to family tab
  if (profile?.role !== 'pending' && profile?.role !== 'visitor') {
    router.replace('/(tabs)/family' as any);
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.iconContainer}>
              <User size={32} color="#7C3AED" />
            </View>
            <Text style={styles.title}>Complete Your Profile</Text>
            <Text style={styles.subtitle}>
              Help your church family get to know you better
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Profile Photo</Text>
          </View>
          <View style={styles.cardContent}>
            <View style={styles.avatarContainer}>
              <ImageUploader
                currentImageUrl={avatarUrl}
                onUpload={handleUploadAvatar}
                placeholder="Add Photo"
                size={120}
                isCircular={true}
              />
            </View>
            <Text style={styles.avatarHelp}>
              Add a photo so your church family can recognize you
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Personal Information</Text>
          </View>
          <View style={styles.cardContent}>
            <View style={styles.formRow}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>First Name *</Text>
                <TextInput
                  style={styles.input}
                  value={profileForm.first_name}
                  onChangeText={(text) => setProfileForm({ ...profileForm, first_name: text })}
                  placeholder="Enter your first name"
                  testID="first-name-input"
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Last Name *</Text>
                <TextInput
                  style={styles.input}
                  value={profileForm.last_name}
                  onChangeText={(text) => setProfileForm({ ...profileForm, last_name: text })}
                  placeholder="Enter your last name"
                  testID="last-name-input"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email Address *</Text>
              <View style={styles.inputWithIcon}>
                <Mail size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.inputWithIconText}
                  value={profileForm.email}
                  onChangeText={(text) => setProfileForm({ ...profileForm, email: text })}
                  placeholder="Enter your email address"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  testID="email-input"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <View style={styles.inputWithIcon}>
                <Phone size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.inputWithIconText}
                  value={profileForm.phone}
                  onChangeText={(text) => setProfileForm({ ...profileForm, phone: text })}
                  placeholder="Enter your phone number"
                  keyboardType="phone-pad"
                  testID="phone-input"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Date of Birth</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => {
                  setSelectedDate(profileForm.date_of_birth ? new Date(profileForm.date_of_birth) : new Date());
                  setShowDatePicker(true);
                }}
              >
                <Text style={[styles.datePickerText, !profileForm.date_of_birth && styles.placeholderText]}>
                  {profileForm.date_of_birth ? new Date(profileForm.date_of_birth).toLocaleDateString() : 'Select your date of birth'}
                </Text>
                <Calendar size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.pendingNotice}>
          <AlertCircle size={20} color="#F59E0B" />
          <Text style={styles.pendingNoticeText}>
            Your account is pending approval. You can complete your profile and join a family while waiting for approval.
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSaveProfile}
            disabled={isSaving}
            testID="save-profile-button"
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Text style={styles.saveButtonText}>Save Profile</Text>
                <ArrowRight size={20} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            testID="skip-button"
          >
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <Modal
          transparent={true}
          animationType="slide"
          visible={showDatePicker}
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.datePickerModal}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.datePickerCancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.datePickerTitle}>Select Date</Text>
                <TouchableOpacity
                  onPress={() => {
                    const dateString = selectedDate.toISOString().split('T')[0];
                    setProfileForm({ ...profileForm, date_of_birth: dateString });
                    setShowDatePicker(false);
                  }}
                >
                  <Text style={styles.datePickerDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.datePickerContainer}>
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, date) => {
                    if (date) {
                      setSelectedDate(date);
                    }
                    if (Platform.OS !== 'ios') {
                      setShowDatePicker(false);
                      if (date) {
                        const dateString = date.toISOString().split('T')[0];
                        setProfileForm({ ...profileForm, date_of_birth: dateString });
                      }
                    }
                  }}
                  maximumDate={new Date()}
                  textColor="#1F2937"
                  style={styles.datePickerStyle}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}