import React, { useState, useMemo, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Switch,
  Platform,
  KeyboardAvoidingView,
} from 'react-native'
import { Stack, useLocalSearchParams, router } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { User, Users, UserPlus, ChevronDown, AlertCircle, CheckCircle, Clock } from 'lucide-react-native'
import { getFormFields, getSignupForm, submitSignup, getEventSignupForm } from '@/services/signup-forms'
import { useMe } from '@/hooks/me-context'
import { useUser } from '@/hooks/user-context'
import { useToast } from '@/hooks/toast-context'
import type { SignupFormField, SignupFieldType } from '@/types/signup'

type SignupMode = 'myself' | 'family' | 'other'

export default function SignupFormScreen() {
  const { formId, eventId } = useLocalSearchParams<{ formId?: string; eventId?: string }>()
  const { person: myPerson } = useMe()
  const { familyMembers } = useUser()
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  const [mode, setMode] = useState<SignupMode>('myself')
  const [selectedFamilyMemberId, setSelectedFamilyMemberId] = useState<string | null>(null)
  const [showFamilyPicker, setShowFamilyPicker] = useState(false)
  const [manualName, setManualName] = useState('')
  const [manualEmail, setManualEmail] = useState('')
  const [manualPhone, setManualPhone] = useState('')
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})

  const resolvedFormIdQuery = useQuery({
    queryKey: ['signup-form-by-event', eventId],
    queryFn: () => getEventSignupForm(eventId!),
    enabled: !!eventId && !formId,
  })

  const actualFormId = formId ?? resolvedFormIdQuery.data?.id

  const { data: form, isLoading: formLoading } = useQuery({
    queryKey: ['signup-form', actualFormId],
    queryFn: () => getSignupForm(actualFormId!),
    enabled: !!actualFormId,
  })

  const { data: fields, isLoading: fieldsLoading } = useQuery({
    queryKey: ['signup-form-fields', actualFormId],
    queryFn: () => getFormFields(actualFormId!),
    enabled: !!actualFormId,
  })

  const submitMutation = useMutation({
    mutationFn: submitSignup,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['my-signup-forms'] })
      queryClient.invalidateQueries({ queryKey: ['signup-form-responses'] })
      const statusMsg = data.status === 'waitlisted'
        ? `${data.respondent_name} has been added to the waitlist.`
        : `${data.respondent_name} has been signed up!`
      showToast('success', statusMsg)
      router.back()
    },
    onError: (error: any) => {
      const msg = error?.message || 'Failed to submit signup'
      showToast('error', msg)
    },
  })

  const selectedPerson = useMemo(() => {
    if (mode === 'myself') return myPerson
    if (mode === 'family' && selectedFamilyMemberId) {
      return familyMembers.find(m => m.id === selectedFamilyMemberId) ?? null
    }
    return null
  }, [mode, myPerson, selectedFamilyMemberId, familyMembers])

  const customFields = useMemo(() => {
    return (fields ?? []).filter(f => !f.is_standard)
  }, [fields])

  const standardFields = useMemo(() => {
    return (fields ?? []).filter(f => f.is_standard)
  }, [fields])

  const deadlinePassed = form?.deadline ? new Date(form.deadline) < new Date() : false

  const handleFieldChange = useCallback((key: string, value: string) => {
    setFieldValues(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleSubmit = () => {
    if (!actualFormId) return

    if (mode === 'other') {
      if (!manualName.trim()) {
        showToast('error', 'Please enter a name')
        return
      }
    }

    const requiredCustom = customFields.filter(f => f.is_required)
    for (const field of requiredCustom) {
      const val = fieldValues[field.field_key]
      if (!val || !val.trim()) {
        showToast('error', `"${field.field_label}" is required`)
        return
      }
    }

    const customFieldPayload: Record<string, string> = {}
    for (const field of customFields) {
      const val = fieldValues[field.field_key]
      if (val && val.trim()) {
        customFieldPayload[field.field_key] = val.trim()
      }
    }

    submitMutation.mutate({
      formId: actualFormId,
      personId: mode === 'other' ? null : (selectedPerson?.id ?? null),
      manualName: mode === 'other' ? manualName.trim() : null,
      manualEmail: mode === 'other' ? (manualEmail.trim() || null) : null,
      manualPhone: mode === 'other' ? (manualPhone.trim() || null) : null,
      fieldValues: customFieldPayload,
    })
  }

  const isLoading = formLoading || fieldsLoading || resolvedFormIdQuery.isLoading

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Sign Up' }} />
        <ActivityIndicator size="large" color="#4338CA" />
        <Text style={styles.loadingText}>Loading form...</Text>
      </View>
    )
  }

  if (!form || !actualFormId) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Sign Up' }} />
        <AlertCircle size={40} color="#EF4444" />
        <Text style={styles.errorTitle}>Form not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (deadlinePassed) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: form.title }} />
        <Clock size={40} color="#F59E0B" />
        <Text style={styles.errorTitle}>Registration Closed</Text>
        <Text style={styles.errorSub}>The deadline for this signup form has passed.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (!form.is_active) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: form.title }} />
        <AlertCircle size={40} color="#9CA3AF" />
        <Text style={styles.errorTitle}>Form Inactive</Text>
        <Text style={styles.errorSub}>This signup form is no longer accepting registrations.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const otherFamilyMembers = familyMembers.filter(m => m.id !== myPerson?.id)

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: form.title }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {form.description && (
          <View style={styles.descriptionBox}>
            <Text style={styles.descriptionText}>{form.description}</Text>
          </View>
        )}

        {form.max_signups && (
          <View style={styles.capacityBanner}>
            <Users size={16} color="#4338CA" />
            <Text style={styles.capacityText}>
              {form.max_signups} spots total
            </Text>
          </View>
        )}

        <Text style={styles.sectionLabel}>Who are you signing up?</Text>
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'myself' && styles.modeBtnActive]}
            onPress={() => setMode('myself')}
          >
            <User size={18} color={mode === 'myself' ? '#fff' : '#4338CA'} />
            <Text style={[styles.modeBtnText, mode === 'myself' && styles.modeBtnTextActive]}>Myself</Text>
          </TouchableOpacity>
          {otherFamilyMembers.length > 0 && (
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'family' && styles.modeBtnActive]}
              onPress={() => setMode('family')}
            >
              <Users size={18} color={mode === 'family' ? '#fff' : '#4338CA'} />
              <Text style={[styles.modeBtnText, mode === 'family' && styles.modeBtnTextActive]}>Family</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'other' && styles.modeBtnActive]}
            onPress={() => setMode('other')}
          >
            <UserPlus size={18} color={mode === 'other' ? '#fff' : '#4338CA'} />
            <Text style={[styles.modeBtnText, mode === 'other' && styles.modeBtnTextActive]}>Other</Text>
          </TouchableOpacity>
        </View>

        {mode === 'family' && (
          <View style={styles.familyPicker}>
            <TouchableOpacity
              style={styles.pickerBtn}
              onPress={() => setShowFamilyPicker(!showFamilyPicker)}
            >
              <Text style={styles.pickerBtnText}>
                {selectedPerson
                  ? `${selectedPerson.first_name} ${selectedPerson.last_name}`
                  : 'Select a family member'}
              </Text>
              <ChevronDown size={18} color="#6B7280" />
            </TouchableOpacity>
            {showFamilyPicker && (
              <View style={styles.pickerList}>
                {otherFamilyMembers.map(m => (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.pickerItem, selectedFamilyMemberId === m.id && styles.pickerItemActive]}
                    onPress={() => {
                      setSelectedFamilyMemberId(m.id)
                      setShowFamilyPicker(false)
                    }}
                  >
                    <Text style={[styles.pickerItemText, selectedFamilyMemberId === m.id && styles.pickerItemTextActive]}>
                      {m.first_name} {m.last_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {standardFields.length > 0 && (mode === 'myself' || mode === 'family') && selectedPerson && (
          <View style={styles.standardFieldsCard}>
            <Text style={styles.standardFieldsTitle}>Auto-filled from directory</Text>
            {standardFields.map(f => {
              let value = ''
              if (f.field_key === 'name') value = `${selectedPerson.first_name} ${selectedPerson.last_name}`
              else if (f.field_key === 'email') value = selectedPerson.email ?? ''
              else if (f.field_key === 'phone') value = selectedPerson.phone ?? ''
              return (
                <View key={f.id} style={styles.standardFieldRow}>
                  <Text style={styles.standardFieldLabel}>{f.field_label}</Text>
                  <Text style={styles.standardFieldValue}>{value || '—'}</Text>
                </View>
              )
            })}
          </View>
        )}

        {mode === 'other' && (
          <View style={styles.manualSection}>
            <Text style={styles.fieldLabel}>Full Name *</Text>
            <TextInput
              style={styles.input}
              value={manualName}
              onChangeText={setManualName}
              placeholder="Enter full name"
              placeholderTextColor="#9CA3AF"
              testID="manual-name-input"
            />
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={manualEmail}
              onChangeText={setManualEmail}
              placeholder="Enter email"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              testID="manual-email-input"
            />
            <Text style={styles.fieldLabel}>Phone</Text>
            <TextInput
              style={styles.input}
              value={manualPhone}
              onChangeText={setManualPhone}
              placeholder="Enter phone number"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              testID="manual-phone-input"
            />
          </View>
        )}

        {customFields.length > 0 && (
          <View style={styles.customSection}>
            <Text style={styles.sectionLabel}>Additional Information</Text>
            {customFields.map(field => (
              <FieldRenderer
                key={field.id}
                field={field}
                value={fieldValues[field.field_key] ?? ''}
                onChange={(val) => handleFieldChange(field.field_key, val)}
              />
            ))}
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, submitMutation.isPending && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitMutation.isPending}
          testID="submit-signup-btn"
        >
          {submitMutation.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <CheckCircle size={20} color="#fff" />
              <Text style={styles.submitBtnText}>Submit Signup</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

function FieldRenderer({
  field,
  value,
  onChange,
}: {
  field: SignupFormField
  value: string
  onChange: (val: string) => void
}) {
  const renderByType = () => {
    switch (field.field_type) {
      case 'boolean':
        return (
          <View style={styles.booleanRow}>
            <Text style={styles.booleanLabel}>{field.field_label}{field.is_required ? ' *' : ''}</Text>
            <Switch
              value={value === 'true'}
              onValueChange={(v) => onChange(v ? 'true' : 'false')}
              trackColor={{ false: '#D1D5DB', true: '#818CF8' }}
              thumbColor={value === 'true' ? '#4338CA' : '#F3F4F6'}
            />
          </View>
        )

      case 'select':
        return (
          <View>
            <Text style={styles.fieldLabel}>{field.field_label}{field.is_required ? ' *' : ''}</Text>
            <View style={styles.selectOptions}>
              {(field.options ?? []).map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.selectChip, value === opt && styles.selectChipActive]}
                  onPress={() => onChange(opt)}
                >
                  <Text style={[styles.selectChipText, value === opt && styles.selectChipTextActive]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )

      case 'textarea':
        return (
          <View>
            <Text style={styles.fieldLabel}>{field.field_label}{field.is_required ? ' *' : ''}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={value}
              onChangeText={onChange}
              placeholder={field.placeholder || ''}
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        )

      case 'number':
        return (
          <View>
            <Text style={styles.fieldLabel}>{field.field_label}{field.is_required ? ' *' : ''}</Text>
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={onChange}
              placeholder={field.placeholder || ''}
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />
          </View>
        )

      case 'email':
        return (
          <View>
            <Text style={styles.fieldLabel}>{field.field_label}{field.is_required ? ' *' : ''}</Text>
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={onChange}
              placeholder={field.placeholder || ''}
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        )

      case 'phone':
        return (
          <View>
            <Text style={styles.fieldLabel}>{field.field_label}{field.is_required ? ' *' : ''}</Text>
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={onChange}
              placeholder={field.placeholder || ''}
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
            />
          </View>
        )

      case 'date':
        return (
          <View>
            <Text style={styles.fieldLabel}>{field.field_label}{field.is_required ? ' *' : ''}</Text>
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={onChange}
              placeholder={field.placeholder || 'YYYY-MM-DD'}
              placeholderTextColor="#9CA3AF"
            />
          </View>
        )

      default:
        return (
          <View>
            <Text style={styles.fieldLabel}>{field.field_label}{field.is_required ? ' *' : ''}</Text>
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={onChange}
              placeholder={field.placeholder || ''}
              placeholderTextColor="#9CA3AF"
            />
          </View>
        )
    }
  }

  return <View style={styles.fieldGroup}>{renderByType()}</View>
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 32,
  },
  loadingText: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#374151',
    marginTop: 12,
  },
  errorSub: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  backBtn: {
    backgroundColor: '#4338CA',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  backBtnText: {
    color: '#fff',
    fontWeight: '600' as const,
    fontSize: 15,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  descriptionBox: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  descriptionText: {
    fontSize: 14,
    color: '#3730A3',
    lineHeight: 20,
  },
  capacityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  capacityText: {
    fontSize: 14,
    color: '#4338CA',
    fontWeight: '500' as const,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#374151',
    marginBottom: 10,
    marginTop: 4,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    backgroundColor: '#fff',
  },
  modeBtnActive: {
    backgroundColor: '#4338CA',
    borderColor: '#4338CA',
  },
  modeBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#4338CA',
  },
  modeBtnTextActive: {
    color: '#fff',
  },
  familyPicker: {
    marginBottom: 16,
  },
  pickerBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  pickerBtnText: {
    fontSize: 15,
    color: '#374151',
  },
  pickerList: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  pickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pickerItemActive: {
    backgroundColor: '#EEF2FF',
  },
  pickerItemText: {
    fontSize: 15,
    color: '#374151',
  },
  pickerItemTextActive: {
    color: '#4338CA',
    fontWeight: '600' as const,
  },
  standardFieldsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  standardFieldsTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#6366F1',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  standardFieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  standardFieldLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  standardFieldValue: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#111827',
  },
  manualSection: {
    marginBottom: 8,
  },
  customSection: {
    marginTop: 8,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  booleanRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  booleanLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#374151',
    flex: 1,
    marginRight: 12,
  },
  selectOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#fff',
  },
  selectChipActive: {
    backgroundColor: '#4338CA',
    borderColor: '#4338CA',
  },
  selectChipText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500' as const,
  },
  selectChipTextActive: {
    color: '#fff',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#4338CA',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 24,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700' as const,
  },
})
