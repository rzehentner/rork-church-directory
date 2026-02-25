import React, { useState, useCallback } from 'react'
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
  Alert,
  KeyboardAvoidingView,
} from 'react-native'
import { Stack, useLocalSearchParams, router } from 'expo-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  UtensilsCrossed,
  Package,
} from 'lucide-react-native'
import { createPotluckForm, type PotluckGroupInput } from '@/services/potluck'
import { useToast } from '@/hooks/toast-context'
import DateTimePicker from '@/components/DateTimePicker'

interface ItemDraft {
  id: string
  name: string
  description: string
  quantity_needed: number
}

interface GroupDraft {
  id: string
  title: string
  items: ItemDraft[]
  collapsed: boolean
}

function uid() {
  return Math.random().toString(36).substring(2, 10)
}

function makeItem(): ItemDraft {
  return { id: uid(), name: '', description: '', quantity_needed: 1 }
}

function makeGroup(title: string = ''): GroupDraft {
  return { id: uid(), title, items: [makeItem()], collapsed: false }
}

const SUGGESTED_GROUPS = ['Meats', 'Sides & Vegetables', 'Desserts', 'Drinks', 'Bread & Rolls', 'Paper Goods']

export default function CreatePotluckFormScreen() {
  const { eventId, eventTitle } = useLocalSearchParams<{ eventId: string; eventTitle?: string }>()
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  const [title, setTitle] = useState(eventTitle ? `${eventTitle} — Sign Up to Bring` : '')
  const [description, setDescription] = useState('')
  const [hasDeadline, setHasDeadline] = useState(false)
  const [deadline, setDeadline] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [groups, setGroups] = useState<GroupDraft[]>([makeGroup('Meats'), makeGroup('Sides'), makeGroup('Desserts')])

  const createMutation = useMutation({
    mutationFn: createPotluckForm,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-signup-forms'] })
      queryClient.invalidateQueries({ queryKey: ['signup-form-summary'] })
      queryClient.invalidateQueries({ queryKey: ['event-signup-form', eventId] })
      queryClient.invalidateQueries({ queryKey: ['potluck-detail'] })
      showToast('success', 'Potluck form created!')
      router.back()
    },
    onError: (error: any) => {
      const msg = error?.message || error?.details || 'Failed to create potluck form'
      showToast('error', msg)
    },
  })

  const addGroup = useCallback((title: string = '') => {
    setGroups(prev => [...prev, makeGroup(title)])
  }, [])

  const removeGroup = useCallback((groupId: string) => {
    Alert.alert('Remove Group', 'Remove this group and all its items?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setGroups(prev => prev.filter(g => g.id !== groupId)) },
    ])
  }, [])

  const updateGroup = useCallback((groupId: string, updates: Partial<GroupDraft>) => {
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, ...updates } : g))
  }, [])

  const moveGroup = useCallback((groupId: string, dir: 'up' | 'down') => {
    setGroups(prev => {
      const idx = prev.findIndex(g => g.id === groupId)
      if (idx < 0) return prev
      const newIdx = dir === 'up' ? idx - 1 : idx + 1
      if (newIdx < 0 || newIdx >= prev.length) return prev
      const next = [...prev]
      const tmp = next[idx]
      next[idx] = next[newIdx]
      next[newIdx] = tmp
      return next
    })
  }, [])

  const addItem = useCallback((groupId: string) => {
    setGroups(prev =>
      prev.map(g =>
        g.id === groupId ? { ...g, items: [...g.items, makeItem()] } : g
      )
    )
  }, [])

  const removeItem = useCallback((groupId: string, itemId: string) => {
    setGroups(prev =>
      prev.map(g =>
        g.id === groupId ? { ...g, items: g.items.filter(i => i.id !== itemId) } : g
      )
    )
  }, [])

  const updateItem = useCallback((groupId: string, itemId: string, updates: Partial<ItemDraft>) => {
    setGroups(prev =>
      prev.map(g =>
        g.id === groupId
          ? { ...g, items: g.items.map(i => i.id === itemId ? { ...i, ...updates } : i) }
          : g
      )
    )
  }, [])

  const handleSubmit = () => {
    if (!eventId) {
      showToast('error', 'Missing event ID')
      return
    }

    const validGroups = groups.filter(g => g.title.trim() && g.items.some(i => i.name.trim()))
    if (validGroups.length === 0) {
      showToast('error', 'Add at least one group with items')
      return
    }

    const apiGroups: PotluckGroupInput[] = validGroups.map(g => ({
      title: g.title.trim(),
      items: g.items
        .filter(i => i.name.trim())
        .map(i => ({
          name: i.name.trim(),
          description: i.description.trim() || undefined,
          quantity_needed: i.quantity_needed,
        })),
    }))

    createMutation.mutate({
      eventId,
      title: title.trim() || undefined,
      description: description.trim() || undefined,
      deadline: hasDeadline ? deadline.toISOString() : null,
      groups: apiGroups,
    })
  }

  const usedGroupTitles = groups.map(g => g.title.toLowerCase())
  const suggestionsAvailable = SUGGESTED_GROUPS.filter(
    s => !usedGroupTitles.includes(s.toLowerCase())
  )

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Create Potluck Form' }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerCard}>
          <View style={styles.headerIconRow}>
            <View style={styles.headerIcon}>
              <UtensilsCrossed size={22} color="#D97706" />
            </View>
            <Text style={styles.headerTitle}>Potluck Sign-Up</Text>
          </View>
          <Text style={styles.headerSub}>
            Create a list of items people can sign up to bring.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Form Details</Text>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Fall Festival Potluck"
            placeholderTextColor="#9CA3AF"
            testID="potluck-title-input"
          />

          <Text style={styles.label}>Description (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Sign up to bring a dish!"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Set a deadline</Text>
            <Switch
              value={hasDeadline}
              onValueChange={setHasDeadline}
              trackColor={{ false: '#D1D5DB', true: '#FCD34D' }}
              thumbColor={hasDeadline ? '#D97706' : '#F3F4F6'}
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
                if (Platform.OS !== 'ios') setShowDatePicker(false)
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
          <Text style={styles.sectionTitle}>Groups & Items</Text>

          {suggestionsAvailable.length > 0 && (
            <View style={styles.suggestRow}>
              <Text style={styles.suggestLabel}>Quick add group:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestScroll}>
                {suggestionsAvailable.map(s => (
                  <TouchableOpacity key={s} style={styles.suggestChip} onPress={() => addGroup(s)}>
                    <Plus size={12} color="#D97706" />
                    <Text style={styles.suggestChipText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {groups.map((group, gi) => (
            <View key={group.id} style={styles.groupCard}>
              <View style={styles.groupHeader}>
                <TouchableOpacity
                  style={styles.groupCollapseBtn}
                  onPress={() => updateGroup(group.id, { collapsed: !group.collapsed })}
                >
                  {group.collapsed
                    ? <ChevronDown size={18} color="#6B7280" />
                    : <ChevronUp size={18} color="#6B7280" />
                  }
                </TouchableOpacity>
                <TextInput
                  style={styles.groupTitleInput}
                  value={group.title}
                  onChangeText={(v) => updateGroup(group.id, { title: v })}
                  placeholder="Group name (e.g. Meats)"
                  placeholderTextColor="#9CA3AF"
                />
                <View style={styles.groupActions}>
                  {gi > 0 && (
                    <TouchableOpacity onPress={() => moveGroup(group.id, 'up')} style={styles.miniIconBtn}>
                      <ChevronUp size={16} color="#9CA3AF" />
                    </TouchableOpacity>
                  )}
                  {gi < groups.length - 1 && (
                    <TouchableOpacity onPress={() => moveGroup(group.id, 'down')} style={styles.miniIconBtn}>
                      <ChevronDown size={16} color="#9CA3AF" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => removeGroup(group.id)} style={styles.miniIconBtn}>
                    <Trash2 size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>

              {!group.collapsed && (
                <View style={styles.groupBody}>
                  {group.items.map((item, ii) => (
                    <View key={item.id} style={styles.itemRow}>
                      <View style={styles.itemMain}>
                        <View style={styles.itemNumberBadge}>
                          <Text style={styles.itemNumber}>{ii + 1}</Text>
                        </View>
                        <View style={styles.itemFields}>
                          <TextInput
                            style={styles.itemNameInput}
                            value={item.name}
                            onChangeText={(v) => updateItem(group.id, item.id, { name: v })}
                            placeholder="Item name"
                            placeholderTextColor="#9CA3AF"
                          />
                          <TextInput
                            style={styles.itemDescInput}
                            value={item.description}
                            onChangeText={(v) => updateItem(group.id, item.id, { description: v })}
                            placeholder="Details (optional)"
                            placeholderTextColor="#C4C4C4"
                          />
                          <View style={styles.qtyRow}>
                            <Text style={styles.qtyLabel}>Qty needed:</Text>
                            <TouchableOpacity
                              style={styles.qtyBtn}
                              onPress={() => updateItem(group.id, item.id, { quantity_needed: Math.max(1, item.quantity_needed - 1) })}
                            >
                              <Text style={styles.qtyBtnText}>−</Text>
                            </TouchableOpacity>
                            <Text style={styles.qtyValue}>{item.quantity_needed}</Text>
                            <TouchableOpacity
                              style={styles.qtyBtn}
                              onPress={() => updateItem(group.id, item.id, { quantity_needed: item.quantity_needed + 1 })}
                            >
                              <Text style={styles.qtyBtnText}>+</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={styles.itemDeleteBtn}
                          onPress={() => removeItem(group.id, item.id)}
                          disabled={group.items.length <= 1}
                        >
                          <Trash2 size={15} color={group.items.length <= 1 ? '#D1D5DB' : '#EF4444'} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}

                  <TouchableOpacity style={styles.addItemBtn} onPress={() => addItem(group.id)}>
                    <Plus size={15} color="#D97706" />
                    <Text style={styles.addItemBtnText}>Add Item</Text>
                  </TouchableOpacity>
                </View>
              )}

              {group.collapsed && (
                <View style={styles.collapsedInfo}>
                  <Package size={14} color="#9CA3AF" />
                  <Text style={styles.collapsedText}>
                    {group.items.filter(i => i.name.trim()).length} item{group.items.filter(i => i.name.trim()).length !== 1 ? 's' : ''}
                  </Text>
                </View>
              )}
            </View>
          ))}

          <TouchableOpacity style={styles.addGroupBtn} onPress={() => addGroup()}>
            <Plus size={18} color="#D97706" />
            <Text style={styles.addGroupBtnText}>Add Group</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, createMutation.isPending && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={createMutation.isPending}
          testID="create-potluck-submit"
        >
          {createMutation.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Create Potluck Form</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFBEB',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 14,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  headerIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FDE68A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#92400E',
  },
  headerSub: {
    fontSize: 14,
    color: '#A16207',
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#111827',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#374151',
    marginBottom: 6,
    marginTop: 10,
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
    minHeight: 80,
    paddingTop: 14,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
  },
  switchLabel: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500' as const,
  },
  dateBtn: {
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 14,
    marginTop: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  dateBtnText: {
    fontSize: 15,
    color: '#92400E',
    fontWeight: '500' as const,
  },
  doneBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginTop: 6,
  },
  doneBtnText: {
    color: '#D97706',
    fontWeight: '600' as const,
    fontSize: 15,
  },
  suggestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  suggestLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500' as const,
  },
  suggestScroll: {
    flexGrow: 0,
  },
  suggestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    backgroundColor: '#FEF3C7',
    marginRight: 6,
  },
  suggestChipText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#D97706',
  },
  groupCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  groupCollapseBtn: {
    padding: 4,
    marginRight: 4,
  },
  groupTitleInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#111827',
    paddingVertical: 4,
  },
  groupActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  miniIconBtn: {
    padding: 6,
  },
  groupBody: {
    padding: 12,
  },
  collapsedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  collapsedText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  itemRow: {
    marginBottom: 12,
  },
  itemMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  itemNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  itemNumber: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#D97706',
  },
  itemFields: {
    flex: 1,
  },
  itemNameInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 4,
  },
  itemDescInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 8,
    fontSize: 13,
    color: '#6B7280',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 4,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  qtyLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500' as const,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  qtyBtnText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#374151',
    lineHeight: 18,
  },
  qtyValue: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#111827',
    minWidth: 20,
    textAlign: 'center' as const,
  },
  itemDeleteBtn: {
    padding: 8,
    marginTop: 6,
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
  },
  addItemBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#D97706',
  },
  addGroupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    borderStyle: 'dashed',
    backgroundColor: '#FFFBEB',
    marginTop: 4,
  },
  addGroupBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#D97706',
  },
  submitBtn: {
    backgroundColor: '#D97706',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
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
