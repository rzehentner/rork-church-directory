import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Building2, MapPin, Phone as PhoneIcon, Globe, Save, Clock, Plus, Trash2 } from 'lucide-react-native';
import { type ServiceTime } from '@/hooks/church-settings-context';
import { styles } from '@/styles/admin.styles';

interface ChurchSettingsData {
  churchName: string;
  pastorName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  website: string;
  serviceTimes: ServiceTime[];
}

interface ChurchSettingsSectionProps {
  localSettings: ChurchSettingsData;
  setLocalSettings: React.Dispatch<React.SetStateAction<ChurchSettingsData>>;
  onSave: () => void;
  isSaving: boolean;
}

export function ChurchSettingsSection({ localSettings, setLocalSettings, onSave, isSaving }: ChurchSettingsSectionProps) {
  const addServiceTime = () => {
    const updated = [...localSettings.serviceTimes, { day: '', time: '', activity: '' }];
    setLocalSettings(prev => ({ ...prev, serviceTimes: updated }));
  };

  const removeServiceTime = (index: number) => {
    const updated = localSettings.serviceTimes.filter((_, i) => i !== index);
    setLocalSettings(prev => ({ ...prev, serviceTimes: updated }));
  };

  const updateServiceTime = (index: number, field: keyof ServiceTime, value: string) => {
    const updated = localSettings.serviceTimes.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    setLocalSettings(prev => ({ ...prev, serviceTimes: updated }));
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Church Information</Text>
      </View>

      <View style={styles.churchCard}>
        <View style={styles.churchCardHeader}>
          <Building2 size={20} color="#7C3AED" />
          <Text style={styles.churchCardTitle}>General</Text>
        </View>
        <View style={styles.churchField}>
          <Text style={styles.churchFieldLabel}>Church Name</Text>
          <TextInput style={styles.churchInput} value={localSettings.churchName} onChangeText={(v) => setLocalSettings(prev => ({ ...prev, churchName: v }))} placeholder="e.g. First Baptist Church" placeholderTextColor="#9CA3AF" />
        </View>
        <View style={styles.churchField}>
          <Text style={styles.churchFieldLabel}>Pastor / Minister</Text>
          <TextInput style={styles.churchInput} value={localSettings.pastorName} onChangeText={(v) => setLocalSettings(prev => ({ ...prev, pastorName: v }))} placeholder="e.g. Pastor John Smith" placeholderTextColor="#9CA3AF" />
        </View>
      </View>

      <View style={styles.churchCard}>
        <View style={styles.churchCardHeader}>
          <MapPin size={20} color="#3B82F6" />
          <Text style={styles.churchCardTitle}>Address</Text>
        </View>
        <View style={styles.churchField}>
          <Text style={styles.churchFieldLabel}>Street Address</Text>
          <TextInput style={styles.churchInput} value={localSettings.address} onChangeText={(v) => setLocalSettings(prev => ({ ...prev, address: v }))} placeholder="123 Main Street" placeholderTextColor="#9CA3AF" />
        </View>
        <View style={styles.churchFieldRow}>
          <View style={styles.churchFieldFlex2}>
            <Text style={styles.churchFieldLabel}>City</Text>
            <TextInput style={styles.churchInput} value={localSettings.city} onChangeText={(v) => setLocalSettings(prev => ({ ...prev, city: v }))} placeholder="City" placeholderTextColor="#9CA3AF" />
          </View>
          <View style={styles.churchFieldFlex1}>
            <Text style={styles.churchFieldLabel}>State</Text>
            <TextInput style={styles.churchInput} value={localSettings.state} onChangeText={(v) => setLocalSettings(prev => ({ ...prev, state: v }))} placeholder="ST" placeholderTextColor="#9CA3AF" maxLength={2} autoCapitalize="characters" />
          </View>
          <View style={styles.churchFieldFlex1}>
            <Text style={styles.churchFieldLabel}>ZIP</Text>
            <TextInput style={styles.churchInput} value={localSettings.zip} onChangeText={(v) => setLocalSettings(prev => ({ ...prev, zip: v }))} placeholder="12345" placeholderTextColor="#9CA3AF" keyboardType="number-pad" maxLength={10} />
          </View>
        </View>
      </View>

      <View style={styles.churchCard}>
        <View style={styles.churchCardHeader}>
          <PhoneIcon size={20} color="#10B981" />
          <Text style={styles.churchCardTitle}>Contact</Text>
        </View>
        <View style={styles.churchField}>
          <Text style={styles.churchFieldLabel}>Phone Number</Text>
          <TextInput style={styles.churchInput} value={localSettings.phone} onChangeText={(v) => setLocalSettings(prev => ({ ...prev, phone: v }))} placeholder="(555) 123-4567" placeholderTextColor="#9CA3AF" keyboardType="phone-pad" />
        </View>
        <View style={styles.churchField}>
          <Text style={styles.churchFieldLabel}>Email</Text>
          <TextInput style={styles.churchInput} value={localSettings.email} onChangeText={(v) => setLocalSettings(prev => ({ ...prev, email: v }))} placeholder="info@ourchurch.org" placeholderTextColor="#9CA3AF" keyboardType="email-address" autoCapitalize="none" />
        </View>
        <View style={styles.churchField}>
          <Text style={styles.churchFieldLabel}>Website</Text>
          <TextInput style={styles.churchInput} value={localSettings.website} onChangeText={(v) => setLocalSettings(prev => ({ ...prev, website: v }))} placeholder="https://ourchurch.org" placeholderTextColor="#9CA3AF" keyboardType="url" autoCapitalize="none" />
        </View>
      </View>

      <View style={styles.churchCard}>
        <View style={styles.churchCardHeader}>
          <Clock size={20} color="#F59E0B" />
          <Text style={styles.churchCardTitle}>Regular Service Times</Text>
        </View>
        <Text style={styles.churchHint}>These will auto-populate the weekly schedule in bulletins</Text>
        {localSettings.serviceTimes.map((item, index) => (
          <View key={index} style={styles.serviceTimeRow}>
            <TextInput style={[styles.serviceTimeInput, styles.serviceTimeDay]} value={item.day} onChangeText={(v) => updateServiceTime(index, 'day', v)} placeholder="Day" placeholderTextColor="#9CA3AF" />
            <TextInput style={[styles.serviceTimeInput, styles.serviceTimeTime]} value={item.time} onChangeText={(v) => updateServiceTime(index, 'time', v)} placeholder="Time" placeholderTextColor="#9CA3AF" />
            <TextInput style={[styles.serviceTimeInput, styles.serviceTimeActivity]} value={item.activity} onChangeText={(v) => updateServiceTime(index, 'activity', v)} placeholder="Service / Activity" placeholderTextColor="#9CA3AF" />
            <TouchableOpacity style={styles.serviceTimeRemove} onPress={() => removeServiceTime(index)}>
              <Trash2 size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity style={styles.addServiceTimeButton} onPress={addServiceTime}>
          <Plus size={16} color="#7C3AED" />
          <Text style={styles.addServiceTimeText}>Add Service Time</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={[styles.saveChurchButton, isSaving && styles.saveChurchButtonDisabled]} onPress={onSave} disabled={isSaving} activeOpacity={0.7}>
        {isSaving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Save size={18} color="#FFFFFF" />}
        <Text style={styles.saveChurchButtonText}>{isSaving ? 'Saving...' : 'Save Church Settings'}</Text>
      </TouchableOpacity>
    </View>
  );
}
