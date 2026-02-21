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
  ChevronUp,
  ChevronDown,
  UtensilsCrossed,
  Package,
} from 'lucide-react-native'
import { createPotluckForm, type PotluckGroupInput } from '@/services/potluck'
import { useToast } from '@/hooks/toast-context'
import DateTimePicker from '@react-native-community/datetimepicker'
import { potluckFormStyles as styles } from '@/styles/create-potluck-form.styles'

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
    onSuccess: (data) => {
      console.log('Potluck form created successfully:', JSON.stringify(data))
      queryClient.invalidateQueries({ queryKey: ['my-signup-forms'] })
      queryClient.invalidateQueries({ queryKey: ['signup-form-summary'] })
      queryClient.invalidateQueries({ queryKey: ['event-signup-form', eventId] })
      queryClient.invalidateQueries({ queryKey: ['potluck-detail'] })
      showToast('success', 'Potluck form created!')
      router.back()
    },
    onError: (error: any) => {
      console.error('Create potluck form error:', JSON.stringify(error))
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
    </View>
  )
}
