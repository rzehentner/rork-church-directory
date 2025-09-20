import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
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
        if (person.photo_url) {
          try {
            const url = await getSignedUrl(person.photo_url);
            if (url) {
              setAvatarUrl(`${url}&t=${Date.now()}`);
            }
          } catch (error) {
            console.error('Error loading avatar:', error);
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
      console.log('Starting avatar upload for person:', person.id);
      const url = await uploadPersonAvatar(person.id, file);
      console.log('Avatar uploaded successfully, URL:', url);
      
      if (!url) {
        throw new Error('Upload failed - no URL returned');
      }
      
      // Immediately update the UI with the new URL
      setAvatarUrl(url);
      
      // Refresh the user data to get the updated photo_url
      await refetch();
      
      return url;
    } catch (error) {
      console.error('Error uploading avatar:', error);
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
      console.log('💾 Saving profile data:', {
        profileForm,
        personExists: !!person,
        userId: profile?.id
      });

      if (person) {
        // Update existing person record
        console.log('📝 Updating existing person record:', person.id);
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

        if (error) {
          console.error('❌ Update error:', error);
          throw error;
        }
        console.log('✅ Person updated successfully:', data);
      } else {
        // Create new person record
        console.log('🆕 Creating new person record for user:', profile?.id);
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

        if (error) {
          console.error('❌ Insert error:', error);
          throw error;
        }
        console.log('✅ Person created successfully:', data);
      }

      // Refresh user data
      console.log('🔄 Refreshing user data...');
      await refetch();
      console.log('✅ Profile saved and data refreshed successfully');
      
      Alert.alert(
        'Success',
        'Your profile has been saved! You can now create or join a family.',
        [
          {
            text: 'Continue',
            onPress: () => router.replace('/(tabs)/family'),
          },
        ]
      );
    } catch (error) {
      console.error('❌ Error saving profile:', error);
      
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
          onPress: () => router.replace('/(tabs)/family'),
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

  // If user is not pending, redirect to family tab
  if (profile?.role !== 'pending') {
    router.replace('/(tabs)/family');
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
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
                    if (Platform.OS === 'android') {
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
  header: {
    paddingHorizontal: 20,
    paddingVertical: 32,
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold' as const,
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#1F2937',
  },
  cardContent: {
    padding: 20,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarHelp: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputContainer: {
    flex: 1,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  inputIcon: {
    marginLeft: 12,
  },
  inputWithIconText: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  datePickerText: {
    fontSize: 16,
    color: '#1F2937',
    flex: 1,
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  pendingNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  pendingNoticeText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  actions: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 12,
  },
  saveButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  skipButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '500' as const,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-end',
  },
  datePickerModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    minHeight: Platform.OS === 'ios' ? 350 : 'auto',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  datePickerCancel: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '400' as const,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#1F2937',
  },
  datePickerDone: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '600' as const,
  },
  datePickerContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  datePickerStyle: {
    backgroundColor: '#FFFFFF',
    height: Platform.OS === 'ios' ? 200 : 'auto' as any,
  },
});