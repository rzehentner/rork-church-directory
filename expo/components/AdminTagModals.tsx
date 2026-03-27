import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { styles } from '@/styles/admin.styles';

const TAG_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308',
  '#84CC16', '#22C55E', '#10B981', '#14B8A6',
  '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
  '#8B5CF6', '#A855F7', '#D946EF', '#EC4899',
  '#F43F5E', '#6B7280', '#374151', '#1F2937',
];

interface TagFormData {
  name: string;
  namespace: string;
  color: string;
  description: string;
  self_assignable: boolean;
  assign_min_role: 'member' | 'leader' | 'admin';
}

interface EditTagFormData extends TagFormData {
  id: string;
}

interface CreateTagModalProps {
  visible: boolean;
  onClose: () => void;
  tagForm: TagFormData;
  setTagForm: React.Dispatch<React.SetStateAction<TagFormData>>;
  onCreate: () => void;
  isPending: boolean;
}

export function CreateTagModal({ visible, onClose, tagForm, setTagForm, onCreate, isPending }: CreateTagModalProps) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Create New Tag</Text>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalContent}>
          <TagFormFields form={tagForm} setForm={setTagForm as any} />
        </ScrollView>
        <View style={styles.modalFooter}>
          <TouchableOpacity style={styles.modalCancelButton} onPress={onClose}>
            <Text style={styles.modalCancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.modalCreateButton} onPress={onCreate} disabled={isPending}>
            {isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.modalCreateButtonText}>Create Tag</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

interface EditTagModalProps {
  visible: boolean;
  onClose: () => void;
  editTagForm: EditTagFormData;
  setEditTagForm: React.Dispatch<React.SetStateAction<EditTagFormData>>;
  onUpdate: () => void;
  isPending: boolean;
}

export function EditTagModal({ visible, onClose, editTagForm, setEditTagForm, onUpdate, isPending }: EditTagModalProps) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Edit Tag</Text>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalContent}>
          <TagFormFields form={editTagForm} setForm={setEditTagForm as any} />
        </ScrollView>
        <View style={styles.modalFooter}>
          <TouchableOpacity style={styles.modalCancelButton} onPress={onClose}>
            <Text style={styles.modalCancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.modalCreateButton} onPress={onUpdate} disabled={isPending}>
            {isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.modalCreateButtonText}>Update Tag</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function TagFormFields({ form, setForm }: { form: TagFormData; setForm: React.Dispatch<React.SetStateAction<TagFormData>> }) {
  return (
    <>
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Name *</Text>
        <TextInput
          style={styles.formInput}
          value={form.name}
          onChangeText={(text) => setForm(prev => ({ ...prev, name: text }))}
          placeholder="Enter tag name"
          placeholderTextColor="#9CA3AF"
        />
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Namespace</Text>
        <TextInput
          style={styles.formInput}
          value={form.namespace}
          onChangeText={(text) => setForm(prev => ({ ...prev, namespace: text }))}
          placeholder="e.g., ministry, age, skill (optional)"
          placeholderTextColor="#9CA3AF"
        />
        <Text style={styles.formHint}>Groups related tags together for organization</Text>
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Color</Text>
        <View style={styles.colorPickerContainer}>
          <View style={styles.colorGrid}>
            {TAG_COLORS.map((color) => (
              <TouchableOpacity
                key={color}
                style={[styles.colorOption, { backgroundColor: color }, form.color === color && styles.selectedColorOption]}
                onPress={() => setForm(prev => ({ ...prev, color }))}
              >
                {form.color === color && (
                  <View style={styles.colorCheckmark}>
                    <Text style={styles.colorCheckmarkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.customColorRow}>
            <Text style={styles.customColorLabel}>Custom:</Text>
            <View style={styles.customColorInputContainer}>
              <View style={[styles.colorPreview, { backgroundColor: form.color }]} />
              <TextInput
                style={styles.customColorInput}
                value={form.color}
                onChangeText={(text) => setForm(prev => ({ ...prev, color: text }))}
                placeholder="#6B7280"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>
        </View>
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Description</Text>
        <TextInput
          style={[styles.formInput, styles.textArea]}
          value={form.description}
          onChangeText={(text) => setForm(prev => ({ ...prev, description: text }))}
          placeholder="Optional description"
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={3}
        />
      </View>
      <View style={styles.formGroup}>
        <View style={styles.formSwitchRow}>
          <View style={styles.formSwitchInfo}>
            <Text style={styles.formLabel}>Self-assignable</Text>
            <Text style={styles.formHint}>Allow members to assign this tag to themselves</Text>
          </View>
          <Switch
            value={form.self_assignable}
            onValueChange={(value) => setForm(prev => ({ ...prev, self_assignable: value }))}
            trackColor={{ false: '#E5E7EB', true: '#10B981' }}
            thumbColor={form.self_assignable ? '#FFFFFF' : '#9CA3AF'}
          />
        </View>
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Minimum Role Required</Text>
        <Text style={styles.formHint}>Who can assign this tag to others</Text>
        <View style={styles.roleButtonsForm}>
          {(['member', 'leader', 'admin'] as const).map((role) => (
            <TouchableOpacity
              key={role}
              style={[styles.roleButtonForm, form.assign_min_role === role && styles.activeRoleButtonForm]}
              onPress={() => setForm(prev => ({ ...prev, assign_min_role: role }))}
            >
              <Text style={[styles.roleButtonTextForm, form.assign_min_role === role && styles.activeRoleButtonTextForm]}>
                {role}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </>
  );
}
