import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Switch,
  Platform,
  Alert,
} from 'react-native'
import { Stack, useLocalSearchParams, router } from 'expo-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Trash2,
  GripVertical,
  Zap,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react-native'
import { createSignupForm, type CreateFormFieldInput } from '@/services/signup-forms'
import { useToast } from '@/hooks/toast-context'
import type { SignupFieldType } from '@/types/supabase'
import DateTimePicker from '@react-native-community/datetimepicker'
import { signupFormStyles as styles } from '@/styles/signup-form.styles'

const FIELD_TYPE_OPTIONS: { value: SignupFieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Yes/No Toggle' },
  { value: 'select', label: 'Dropdown' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'date', label: 'Date' },
]

interface FieldDraft {
  id: string
  field_key: string
  field_label: string
  field_type: SignupFieldType
  is_required: boolean
  is_standard: boolean
  options: string[]
  placeholder: string
  expanded: boolean
}

function generateId() {
  return Math.random().toString(36).substring(2, 10)
}

const STANDARD_FIELDS: Omit<FieldDraft, 'id' | 'expanded'>[] = [
  { field_key: 'name', field_label: 'Full Name', field_type: 'text', is_required: true, is_standard: true, options: [], placeholder: '' },
  { field_key: 'email', field_label: 'Email', field_type: 'email', is_required: true, is_standard: true, options: [], placeholder: '' },
  { field_key: 'phone', field_label: 'Phone', field_type: 'phone', is_required: false, is_standard: true, options: [], placeholder: '' },
]

export default function CreateSignupFormScreen() {
  const { eventId, eventTitle } = useLocalSearchParams<{ eventId: string; eventTitle?: string }>()
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  const defaultTitle = eventTitle ? `${eventTitle} Signup` : ''

  const [title, setTitle] = useState(defaultTitle)
  const [description, setDescription] = useState('')
  const [maxSignups, setMaxSignups] = useState('')
  const [hasDeadline, setHasDeadline] = useState(false)
  const [deadline, setDeadline] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [fields, setFields] = useState<FieldDraft[]>([
    { ...STANDARD_FIELDS[0], id: generateId(), expanded: false },
    { ...STANDARD_FIELDS[1], id: generateId(), expanded: false },
    { ...STANDARD_FIELDS[2], id: generateId(), expanded: false },
  ])
  const [newOption, setNewOption] = useState('')

  const hasNameField = fields.some(f => f.field_key === 'name' && f.is_standard)

  const createMutation = useMutation({
    mutationFn: createSignupForm,
    onSuccess: (data) => {
      console.log('Signup form created:', data)
      queryClient.invalidateQueries({ queryKey: ['my-signup-forms'] })
      queryClient.invalidateQueries({ queryKey: ['signup-form-summary'] })
      queryClient.invalidateQueries({ queryKey: ['event-signup-form', eventId] })
      showToast('success', 'Signup form created!')
      router.back()
    },
    onError: (error: any) => {
      console.error('Create signup form error:', error)
      showToast('error', error?.message || 'Failed to create signup form')
    },
  })

  const addStandardField = useCallback((key: string) => {
    const template = STANDARD_FIELDS.find(f => f.field_key === key)
    if (!template) return
    if (fields.some(f => f.field_key === key && f.is_standard)) {
      showToast('info', `${template.field_label} is already added`)
      return
    }
    setFields(prev => [...prev, { ...template, id: generateId(), expanded: false }])
  }, [fields, showToast])

  const addCustomField = useCallback(() => {
    setFields(prev => [
      ...prev,
      {
        id: generateId(),
        field_key: `custom_${generateId()}`,
        field_label: '',
        field_type: 'text',
        is_required: false,
        is_standard: false,
        options: [],
        placeholder: '',
        expanded: true,
      },
    ])
  }, [])

  const updateField = useCallback((id: string, updates: Partial<FieldDraft>) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f))
  }, [])

  const removeField = useCallback((id: string) => {
    setFields(prev => prev.filter(f => f.id !== id))
  }, [])

  const moveField = useCallback((id: string, direction: 'up' | 'down') => {
    setFields(prev => {
      const idx = prev.findIndex(f => f.id === id)
      if (idx < 0) return prev
      const newIdx = direction === 'up' ? idx - 1 : idx + 1
      if (newIdx < 0 || newIdx >= prev.length) return prev
      const next = [...prev]
      const tmp = next[idx]
      next[idx] = next[newIdx]
      next[newIdx] = tmp
      return next
    })
  }, [])

  const addOptionToField = useCallback((fieldId: string, option: string) => {
    if (!option.trim()) return
    setFields(prev =>
      prev.map(f =>
        f.id === fieldId ? { ...f, options: [...f.options, option.trim()] } : f
      )
    )
  }, [])

  const removeOptionFromField = useCallback((fieldId: string, optIdx: number) => {
    setFields(prev =>
      prev.map(f =>
        f.id === fieldId ? { ...f, options: f.options.filter((_, i) => i !== optIdx) } : f
      )
    )
  }, [])

  const handleSubmit = () => {
    if (!eventId) {
      showToast('error', 'Missing event ID')
      return
    }

    const nonEmptyFields = fields.filter(f => f.is_standard || f.field_label.trim())
    if (nonEmptyFields.length === 0) {
      showToast('error', 'Add at least one field')
      return
    }

    if (!hasNameField) {
      Alert.alert(
        'Missing Name Field',
        'It is strongly recommended to include the "Full Name" standard field. Continue anyway?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => doSubmit(nonEmptyFields) },
        ]
      )
      return
    }

    doSubmit(nonEmptyFields)
  }

  const doSubmit = (fieldList: FieldDraft[]) => {
    const apiFields: CreateFormFieldInput[] = fieldList.map(f => ({
      field_key: f.is_standard ? f.field_key : f.field_key,
      field_label: f.field_label,
      field_type: f.field_type,
      is_required: f.is_required,
      is_standard: f.is_standard,
      ...(f.field_type === 'select' && f.options.length > 0 ? { options: f.options } : {}),
      ...(f.placeholder ? { placeholder: f.placeholder } : {}),
    }))

    createMutation.mutate({
      eventId,
      title: title.trim() || undefined,
      description: description.trim() || undefined,
      maxSignups: maxSignups ? parseInt(maxSignups, 10) : null,
      deadline: hasDeadline ? deadline.toISOString() : null,
      fields: apiFields,
    })
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Create Signup Form' }} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Form Details</Text>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder={defaultTitle || 'Signup Form Title'}
            placeholderTextColor="#9CA3AF"
            testID="form-title-input"
          />

          <Text style={styles.label}>Description (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Instructions for people signing up"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <Text style={styles.label}>Max Signups (optional)</Text>
          <TextInput
            style={styles.input}
            value={maxSignups}
            onChangeText={setMaxSignups}
            placeholder="Leave empty for unlimited"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
          />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Set a deadline</Text>
            <Switch
              value={hasDeadline}
              onValueChange={setHasDeadline}
              trackColor={{ false: '#D1D5DB', true: '#818CF8' }}
              thumbColor={hasDeadline ? '#4338CA' : '#F3F4F6'}
            />
          </View>
          {hasDeadline && (
            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.dateBtnText}>
                Deadline: {deadline.toLocaleDateString()} {deadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </TouchableOpacity>
          )}
          {hasDeadline && showDatePicker && (
            <DateTimePicker
              value={deadline}
              mode="datetime"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, date) => {
                if (Platform.OS === 'android') setShowDatePicker(false)
                if (date) setDeadline(date)
              }}
              minimumDate={new Date()}
            />
          )}
          {hasDeadline && showDatePicker && Platform.OS === 'ios' && (
            <TouchableOpacity style={styles.doneBtn} onPress={() => setShowDatePicker(false)}>
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fields</Text>

          <View style={styles.quickAddRow}>
            <Text style={styles.quickAddLabel}>Quick add:</Text>
            {STANDARD_FIELDS.map(sf => {
              const exists = fields.some(f => f.field_key === sf.field_key && f.is_standard)
              return (
                <TouchableOpacity
                  key={sf.field_key}
                  style={[styles.quickAddBtn, exists && styles.quickAddBtnDisabled]}
                  onPress={() => addStandardField(sf.field_key)}
                  disabled={exists}
                >
                  <Zap size={12} color={exists ? '#9CA3AF' : '#4338CA'} />
                  <Text style={[styles.quickAddBtnText, exists && styles.quickAddBtnTextDisabled]}>
                    {sf.field_label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {!hasNameField && (
            <View style={styles.warningBanner}>
              <AlertTriangle size={16} color="#92400E" />
              <Text style={styles.warningText}>No "Full Name" field — this is recommended</Text>
            </View>
          )}

          {fields.map((field, idx) => (
            <View key={field.id} style={styles.fieldCard}>
              <View style={styles.fieldCardHeader}>
                <View style={styles.fieldCardLeft}>
                  {field.is_standard && (
                    <View style={styles.standardBadge}>
                      <Zap size={10} color="#4338CA" />
                      <Text style={styles.standardBadgeText}>Auto-fill</Text>
                    </View>
                  )}
                  <Text style={styles.fieldCardTitle} numberOfLines={1}>
                    {field.field_label || 'New Field'}
                  </Text>
                </View>
                <View style={styles.fieldCardActions}>
                  {idx > 0 && (
                    <TouchableOpacity onPress={() => moveField(field.id, 'up')} style={styles.iconBtn}>
                      <ChevronUp size={18} color="#6B7280" />
                    </TouchableOpacity>
                  )}
                  {idx < fields.length - 1 && (
                    <TouchableOpacity onPress={() => moveField(field.id, 'down')} style={styles.iconBtn}>
                      <ChevronDown size={18} color="#6B7280" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => updateField(field.id, { expanded: !field.expanded })}
                    style={styles.iconBtn}
                  >
                    <GripVertical size={18} color="#6B7280" />
                  </TouchableOpacity>
                  {!field.is_standard && (
                    <TouchableOpacity onPress={() => removeField(field.id)} style={styles.iconBtn}>
                      <Trash2 size={18} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {field.expanded && !field.is_standard && (
                <View style={styles.fieldCardBody}>
                  <Text style={styles.miniLabel}>Label</Text>
                  <TextInput
                    style={styles.miniInput}
                    value={field.field_label}
                    onChangeText={(v) => {
                      updateField(field.id, {
                        field_label: v,
                        field_key: v.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
                      })
                    }}
                    placeholder="Field label"
                    placeholderTextColor="#9CA3AF"
                  />

                  <Text style={styles.miniLabel}>Type</Text>
                  <View style={styles.typeRow}>
                    {FIELD_TYPE_OPTIONS.map(opt => (
                      <TouchableOpacity
                        key={opt.value}
                        style={[styles.typeChip, field.field_type === opt.value && styles.typeChipActive]}
                        onPress={() => updateField(field.id, { field_type: opt.value })}
                      >
                        <Text style={[styles.typeChipText, field.field_type === opt.value && styles.typeChipTextActive]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {field.field_type === 'select' && (
                    <View style={styles.optionsSection}>
                      <Text style={styles.miniLabel}>Options</Text>
                      {field.options.map((opt, oi) => (
                        <View key={oi} style={styles.optionRow}>
                          <Text style={styles.optionText}>{opt}</Text>
                          <TouchableOpacity onPress={() => removeOptionFromField(field.id, oi)}>
                            <Trash2 size={14} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      ))}
                      <View style={styles.addOptionRow}>
                        <TextInput
                          style={[styles.miniInput, { flex: 1 }]}
                          value={newOption}
                          onChangeText={setNewOption}
                          placeholder="Add option"
                          placeholderTextColor="#9CA3AF"
                          onSubmitEditing={() => {
                            addOptionToField(field.id, newOption)
                            setNewOption('')
                          }}
                        />
                        <TouchableOpacity
                          style={styles.addOptionBtn}
                          onPress={() => {
                            addOptionToField(field.id, newOption)
                            setNewOption('')
                          }}
                        >
                          <Plus size={16} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  <Text style={styles.miniLabel}>Placeholder (optional)</Text>
                  <TextInput
                    style={styles.miniInput}
                    value={field.placeholder}
                    onChangeText={(v) => updateField(field.id, { placeholder: v })}
                    placeholder="Hint text"
                    placeholderTextColor="#9CA3AF"
                  />

                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Required</Text>
                    <Switch
                      value={field.is_required}
                      onValueChange={(v) => updateField(field.id, { is_required: v })}
                      trackColor={{ false: '#D1D5DB', true: '#818CF8' }}
                      thumbColor={field.is_required ? '#4338CA' : '#F3F4F6'}
                    />
                  </View>
                </View>
              )}
            </View>
          ))}

          <TouchableOpacity style={styles.addFieldBtn} onPress={addCustomField}>
            <Plus size={18} color="#4338CA" />
            <Text style={styles.addFieldBtnText}>Add Custom Field</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, createMutation.isPending && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={createMutation.isPending}
          testID="create-form-submit"
        >
          {createMutation.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Create Signup Form</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}
