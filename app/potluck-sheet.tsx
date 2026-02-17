import React, { useState, useMemo, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Modal,
  RefreshControl,
  Alert,
} from 'react-native'
import { Stack, useLocalSearchParams, router } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Check,
  X,
  User,
  Users,
  UserPlus,
  ChevronDown,
  UtensilsCrossed,
  Clock,
  AlertCircle,
  Plus,
  Search,
  MessageSquare,
} from 'lucide-react-native'
import {
  getPotluckFormDetail,
  claimPotluckItem,
  unclaimPotluckItem,
  addPotluckItems,
  type PotluckItemParsed,
  type PotluckGroupParsed,
} from '@/services/potluck'
import { getSignupForm } from '@/services/signup-forms'
import { useMe } from '@/hooks/me-context'
import { useUser } from '@/hooks/user-context'
import { useToast } from '@/hooks/toast-context'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'

type Person = Database['public']['Tables']['persons']['Row']
type ClaimMode = 'myself' | 'family' | 'directory' | 'manual'

interface ClaimModalState {
  visible: boolean
  item: PotluckItemParsed | null
}

interface AddItemsModalState {
  visible: boolean
  groupId: string | null
  groupTitle: string
}

export default function PotluckSheetScreen() {
  const { formId } = useLocalSearchParams<{ formId: string }>()
  const { person: myPerson, profile, myRole } = useMe()
  const { familyMembers } = useUser()
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  const isStaff = myRole === 'admin' || myRole === 'leader'

  const [refreshing, setRefreshing] = useState(false)
  const [claimModal, setClaimModal] = useState<ClaimModalState>({ visible: false, item: null })
  const [claimMode, setClaimMode] = useState<ClaimMode>('myself')
  const [selectedFamilyMemberId, setSelectedFamilyMemberId] = useState<string | null>(null)
  const [showFamilyPicker, setShowFamilyPicker] = useState(false)
  const [manualName, setManualName] = useState('')
  const [claimNote, setClaimNote] = useState('')
  const [directorySearch, setDirectorySearch] = useState('')
  const [directoryResults, setDirectoryResults] = useState<Person[]>([])
  const [selectedDirectoryPerson, setSelectedDirectoryPerson] = useState<Person | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)

  const [addItemsModal, setAddItemsModal] = useState<AddItemsModalState>({ visible: false, groupId: null, groupTitle: '' })
  const [newGroupTitle, setNewGroupTitle] = useState('')
  const [newItems, setNewItems] = useState<{ name: string; qty: number }[]>([{ name: '', qty: 1 }])

  const { data: form } = useQuery({
    queryKey: ['signup-form', formId],
    queryFn: () => getSignupForm(formId),
    enabled: !!formId,
  })

  const { data: groups, isLoading, error, refetch } = useQuery({
    queryKey: ['potluck-detail', formId],
    queryFn: () => getPotluckFormDetail(formId),
    enabled: !!formId,
  })

  const deadlinePassed = form?.deadline ? new Date(form.deadline) < new Date() : false

  const claimMutation = useMutation({
    mutationFn: claimPotluckItem,
    onSuccess: (data) => {
      console.log('Claim success:', data)
      queryClient.invalidateQueries({ queryKey: ['potluck-detail', formId] })
      queryClient.invalidateQueries({ queryKey: ['my-signup-forms'] })
      showToast('success', `${data.claimant_name} is bringing ${data.item_name}!`)
      closeClaimModal()
    },
    onError: (err: any) => {
      console.error('Claim error:', err)
      showToast('error', err?.message || 'Failed to claim item')
    },
  })

  const unclaimMutation = useMutation({
    mutationFn: unclaimPotluckItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['potluck-detail', formId] })
      queryClient.invalidateQueries({ queryKey: ['my-signup-forms'] })
      showToast('success', 'Item unclaimed')
    },
    onError: (err: any) => {
      showToast('error', err?.message || 'Failed to unclaim item')
    },
  })

  const addItemsMutation = useMutation({
    mutationFn: addPotluckItems,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['potluck-detail', formId] })
      showToast('success', 'Items added!')
      closeAddItemsModal()
    },
    onError: (err: any) => {
      showToast('error', err?.message || 'Failed to add items')
    },
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }, [refetch])

  const myPersonId = myPerson?.id
  const myProfileId = profile?.id
  const myFamilyIds = useMemo(() => {
    return new Set(familyMembers.map(m => m.id))
  }, [familyMembers])

  const isMyOrFamilyClaim = useCallback((claim: { person_id: string | null; claimed_by: string }) => {
    if (claim.claimed_by === myProfileId) return true
    if (claim.person_id && myFamilyIds.has(claim.person_id)) return true
    if (claim.person_id === myPersonId) return true
    return false
  }, [myProfileId, myPersonId, myFamilyIds])

  const totalItems = useMemo(() => {
    if (!groups) return 0
    return groups.reduce((sum, g) => sum + g.items.length, 0)
  }, [groups])

  const fullyClaimedItems = useMemo(() => {
    if (!groups) return 0
    return groups.reduce((sum, g) => sum + g.items.filter(i => i.is_full).length, 0)
  }, [groups])

  const openClaimModal = (item: PotluckItemParsed) => {
    setClaimModal({ visible: true, item })
    setClaimMode('myself')
    setSelectedFamilyMemberId(null)
    setManualName('')
    setClaimNote('')
    setDirectorySearch('')
    setDirectoryResults([])
    setSelectedDirectoryPerson(null)
    setShowFamilyPicker(false)
  }

  const closeClaimModal = () => {
    setClaimModal({ visible: false, item: null })
  }

  const handleDirectorySearch = useCallback(async (query: string) => {
    setDirectorySearch(query)
    if (query.length < 2) {
      setDirectoryResults([])
      return
    }
    setSearchLoading(true)
    try {
      const { data } = await supabase
        .from('persons')
        .select('*')
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
        .limit(10)
      setDirectoryResults((data ?? []) as Person[])
    } catch (err) {
      console.error('Directory search error:', err)
    } finally {
      setSearchLoading(false)
    }
  }, [])

  const handleClaim = () => {
    if (!claimModal.item) return

    let personId: string | null = null
    let mName: string | null = null

    if (claimMode === 'myself') {
      personId = myPersonId ?? null
    } else if (claimMode === 'family') {
      if (!selectedFamilyMemberId) {
        showToast('error', 'Select a family member')
        return
      }
      personId = selectedFamilyMemberId
    } else if (claimMode === 'directory') {
      if (!selectedDirectoryPerson) {
        showToast('error', 'Select a person from the directory')
        return
      }
      personId = selectedDirectoryPerson.id
    } else if (claimMode === 'manual') {
      if (!manualName.trim()) {
        showToast('error', 'Enter a name')
        return
      }
      mName = manualName.trim()
    }

    claimMutation.mutate({
      itemId: claimModal.item.id,
      personId,
      manualName: mName,
      note: claimNote.trim() || null,
    })
  }

  const handleUnclaim = (claimId: string, itemName: string) => {
    Alert.alert('Unclaim Item', `Remove your claim on "${itemName}"?`, [
      { text: 'Keep', style: 'cancel' },
      { text: 'Unclaim', style: 'destructive', onPress: () => unclaimMutation.mutate(claimId) },
    ])
  }

  const openAddItemsModal = (groupId: string | null, groupTitle: string) => {
    setAddItemsModal({ visible: true, groupId, groupTitle })
    setNewGroupTitle(groupId ? '' : '')
    setNewItems([{ name: '', qty: 1 }])
  }

  const closeAddItemsModal = () => {
    setAddItemsModal({ visible: false, groupId: null, groupTitle: '' })
  }

  const handleAddItems = () => {
    if (!formId) return
    const validItems = newItems.filter(i => i.name.trim())
    if (validItems.length === 0) {
      showToast('error', 'Add at least one item')
      return
    }

    const items = validItems.map(i => ({ name: i.name.trim(), quantity_needed: i.qty }))

    if (addItemsModal.groupId) {
      addItemsMutation.mutate({ formId, groupId: addItemsModal.groupId, items })
    } else {
      if (!newGroupTitle.trim()) {
        showToast('error', 'Enter a group name')
        return
      }
      addItemsMutation.mutate({ formId, groupTitle: newGroupTitle.trim(), items })
    }
  }

  const otherFamilyMembers = familyMembers.filter(m => m.id !== myPersonId)

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Potluck' }} />
        <ActivityIndicator size="large" color="#D97706" />
        <Text style={styles.loadingText}>Loading items...</Text>
      </View>
    )
  }

  if (error || !groups) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Potluck' }} />
        <AlertCircle size={40} color="#EF4444" />
        <Text style={styles.errorTitle}>Could not load potluck</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
          <Text style={styles.retryBtnText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (deadlinePassed) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: form?.title ?? 'Potluck' }} />
        <Clock size={40} color="#F59E0B" />
        <Text style={styles.errorTitle}>Sign-up Closed</Text>
        <Text style={styles.errorSub}>The deadline has passed. Below is a read-only view.</Text>
        <ReadOnlySheet groups={groups} />
      </View>
    )
  }

  const progressPct = totalItems > 0 ? fullyClaimedItems / totalItems : 0

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: form?.title ?? 'Potluck Sign-Up' }} />

      <View style={styles.progressBar}>
        <View style={styles.progressInfo}>
          <UtensilsCrossed size={16} color="#D97706" />
          <Text style={styles.progressText}>
            {fullyClaimedItems} of {totalItems} items claimed
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.min(progressPct * 100, 100)}%` as any }]} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D97706" />}
      >
        {form?.description && (
          <View style={styles.descBox}>
            <Text style={styles.descText}>{form.description}</Text>
          </View>
        )}

        {groups.map((group) => (
          <View key={group.id} style={styles.groupSection}>
            <View style={styles.groupTitleRow}>
              <Text style={styles.groupTitle}>{group.title}</Text>
              <Text style={styles.groupCount}>
                {group.items.filter(i => i.is_full).length}/{group.items.length}
              </Text>
            </View>

            {group.items.map((item) => (
              <PotluckItemCard
                key={item.id}
                item={item}
                isStaff={isStaff}
                isMyOrFamilyClaim={isMyOrFamilyClaim}
                onClaim={() => openClaimModal(item)}
                onUnclaim={handleUnclaim}
                disabled={deadlinePassed}
              />
            ))}

            {isStaff && (
              <TouchableOpacity
                style={styles.addItemInline}
                onPress={() => openAddItemsModal(group.id, group.title)}
              >
                <Plus size={14} color="#D97706" />
                <Text style={styles.addItemInlineText}>Add items to {group.title}</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        {isStaff && (
          <TouchableOpacity
            style={styles.addGroupInline}
            onPress={() => openAddItemsModal(null, '')}
          >
            <Plus size={16} color="#D97706" />
            <Text style={styles.addGroupInlineText}>Add New Group</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal visible={claimModal.visible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Claim: {claimModal.item?.name}</Text>
              <TouchableOpacity onPress={closeClaimModal} style={styles.modalClose}>
                <X size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalLabel}>Who is bringing this?</Text>
              <View style={styles.modeRow}>
                <TouchableOpacity
                  style={[styles.modeBtn, claimMode === 'myself' && styles.modeBtnActive]}
                  onPress={() => setClaimMode('myself')}
                >
                  <User size={16} color={claimMode === 'myself' ? '#fff' : '#D97706'} />
                  <Text style={[styles.modeBtnText, claimMode === 'myself' && styles.modeBtnTextActive]}>Myself</Text>
                </TouchableOpacity>
                {otherFamilyMembers.length > 0 && (
                  <TouchableOpacity
                    style={[styles.modeBtn, claimMode === 'family' && styles.modeBtnActive]}
                    onPress={() => setClaimMode('family')}
                  >
                    <Users size={16} color={claimMode === 'family' ? '#fff' : '#D97706'} />
                    <Text style={[styles.modeBtnText, claimMode === 'family' && styles.modeBtnTextActive]}>Family</Text>
                  </TouchableOpacity>
                )}
                {isStaff && (
                  <TouchableOpacity
                    style={[styles.modeBtn, claimMode === 'directory' && styles.modeBtnActive]}
                    onPress={() => setClaimMode('directory')}
                  >
                    <Search size={16} color={claimMode === 'directory' ? '#fff' : '#D97706'} />
                    <Text style={[styles.modeBtnText, claimMode === 'directory' && styles.modeBtnTextActive]}>Directory</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.modeBtn, claimMode === 'manual' && styles.modeBtnActive]}
                  onPress={() => setClaimMode('manual')}
                >
                  <UserPlus size={16} color={claimMode === 'manual' ? '#fff' : '#D97706'} />
                  <Text style={[styles.modeBtnText, claimMode === 'manual' && styles.modeBtnTextActive]}>Other</Text>
                </TouchableOpacity>
              </View>

              {claimMode === 'myself' && myPerson && (
                <View style={styles.selectedPersonCard}>
                  <User size={16} color="#D97706" />
                  <Text style={styles.selectedPersonName}>{myPerson.first_name} {myPerson.last_name}</Text>
                </View>
              )}

              {claimMode === 'family' && (
                <View>
                  <TouchableOpacity
                    style={styles.pickerBtn}
                    onPress={() => setShowFamilyPicker(!showFamilyPicker)}
                  >
                    <Text style={styles.pickerBtnText}>
                      {selectedFamilyMemberId
                        ? `${familyMembers.find(m => m.id === selectedFamilyMemberId)?.first_name ?? ''} ${familyMembers.find(m => m.id === selectedFamilyMemberId)?.last_name ?? ''}`
                        : 'Select family member'}
                    </Text>
                    <ChevronDown size={18} color="#6B7280" />
                  </TouchableOpacity>
                  {showFamilyPicker && (
                    <View style={styles.pickerList}>
                      {otherFamilyMembers.map(m => (
                        <TouchableOpacity
                          key={m.id}
                          style={[styles.pickerItem, selectedFamilyMemberId === m.id && styles.pickerItemActive]}
                          onPress={() => { setSelectedFamilyMemberId(m.id); setShowFamilyPicker(false) }}
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

              {claimMode === 'directory' && (
                <View>
                  <View style={styles.searchInputRow}>
                    <Search size={16} color="#9CA3AF" />
                    <TextInput
                      style={styles.searchInput}
                      value={directorySearch}
                      onChangeText={handleDirectorySearch}
                      placeholder="Search by name..."
                      placeholderTextColor="#9CA3AF"
                    />
                    {searchLoading && <ActivityIndicator size="small" color="#D97706" />}
                  </View>
                  {selectedDirectoryPerson && (
                    <View style={styles.selectedPersonCard}>
                      <User size={16} color="#D97706" />
                      <Text style={styles.selectedPersonName}>
                        {selectedDirectoryPerson.first_name} {selectedDirectoryPerson.last_name}
                      </Text>
                      <TouchableOpacity onPress={() => setSelectedDirectoryPerson(null)}>
                        <X size={16} color="#9CA3AF" />
                      </TouchableOpacity>
                    </View>
                  )}
                  {!selectedDirectoryPerson && directoryResults.length > 0 && (
                    <View style={styles.pickerList}>
                      {directoryResults.map(p => (
                        <TouchableOpacity
                          key={p.id}
                          style={styles.pickerItem}
                          onPress={() => { setSelectedDirectoryPerson(p); setDirectorySearch('') }}
                        >
                          <Text style={styles.pickerItemText}>{p.first_name} {p.last_name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {claimMode === 'manual' && (
                <TextInput
                  style={styles.modalInput}
                  value={manualName}
                  onChangeText={setManualName}
                  placeholder="Enter name (e.g. Mr. Smith)"
                  placeholderTextColor="#9CA3AF"
                  testID="potluck-manual-name"
                />
              )}

              <Text style={styles.modalLabel}>Note (optional)</Text>
              <TextInput
                style={[styles.modalInput, styles.noteInput]}
                value={claimNote}
                onChangeText={setClaimNote}
                placeholder="e.g. I'll bring the smoked version"
                placeholderTextColor="#9CA3AF"
                multiline
              />

              <TouchableOpacity
                style={[styles.claimSubmitBtn, claimMutation.isPending && styles.btnDisabled]}
                onPress={handleClaim}
                disabled={claimMutation.isPending}
                testID="claim-submit-btn"
              >
                {claimMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Check size={18} color="#fff" />
                    <Text style={styles.claimSubmitText}>Claim This Item</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={addItemsModal.visible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {addItemsModal.groupId ? `Add items to ${addItemsModal.groupTitle}` : 'Add New Group'}
              </Text>
              <TouchableOpacity onPress={closeAddItemsModal} style={styles.modalClose}>
                <X size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              {!addItemsModal.groupId && (
                <>
                  <Text style={styles.modalLabel}>Group Name</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={newGroupTitle}
                    onChangeText={setNewGroupTitle}
                    placeholder="e.g. Paper Goods"
                    placeholderTextColor="#9CA3AF"
                  />
                </>
              )}

              <Text style={styles.modalLabel}>Items</Text>
              {newItems.map((ni, idx) => (
                <View key={idx} style={styles.newItemRow}>
                  <TextInput
                    style={[styles.modalInput, { flex: 1, marginBottom: 0 }]}
                    value={ni.name}
                    onChangeText={(v) => {
                      const updated = [...newItems]
                      updated[idx] = { ...updated[idx], name: v }
                      setNewItems(updated)
                    }}
                    placeholder="Item name"
                    placeholderTextColor="#9CA3AF"
                  />
                  <View style={styles.miniQtyRow}>
                    <TouchableOpacity
                      style={styles.miniQtyBtn}
                      onPress={() => {
                        const updated = [...newItems]
                        updated[idx] = { ...updated[idx], qty: Math.max(1, updated[idx].qty - 1) }
                        setNewItems(updated)
                      }}
                    >
                      <Text style={styles.miniQtyBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.miniQtyValue}>{ni.qty}</Text>
                    <TouchableOpacity
                      style={styles.miniQtyBtn}
                      onPress={() => {
                        const updated = [...newItems]
                        updated[idx] = { ...updated[idx], qty: updated[idx].qty + 1 }
                        setNewItems(updated)
                      }}
                    >
                      <Text style={styles.miniQtyBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                  {newItems.length > 1 && (
                    <TouchableOpacity onPress={() => setNewItems(prev => prev.filter((_, i) => i !== idx))}>
                      <X size={16} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              <TouchableOpacity
                style={styles.addMoreItemBtn}
                onPress={() => setNewItems(prev => [...prev, { name: '', qty: 1 }])}
              >
                <Plus size={14} color="#D97706" />
                <Text style={styles.addMoreItemText}>Add Another Item</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.claimSubmitBtn, addItemsMutation.isPending && styles.btnDisabled]}
                onPress={handleAddItems}
                disabled={addItemsMutation.isPending}
              >
                {addItemsMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.claimSubmitText}>Add Items</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  )
}

function PotluckItemCard({
  item,
  isStaff,
  isMyOrFamilyClaim,
  onClaim,
  onUnclaim,
  disabled,
}: {
  item: PotluckItemParsed
  isStaff: boolean
  isMyOrFamilyClaim: (claim: { person_id: string | null; claimed_by: string }) => boolean
  onClaim: () => void
  onUnclaim: (claimId: string, itemName: string) => void
  disabled: boolean
}) {
  const hasMyClaim = item.claims.some(c => isMyOrFamilyClaim(c))
  const isFull = item.is_full

  return (
    <View style={[styles.itemCard, isFull && styles.itemCardFull, hasMyClaim && styles.itemCardMine]}>
      <View style={styles.itemCardTop}>
        <View style={styles.itemCardInfo}>
          <View style={styles.itemNameRow}>
            {isFull && <Check size={16} color="#10B981" />}
            <Text style={[styles.itemName, isFull && styles.itemNameFull]}>{item.name}</Text>
          </View>
          {item.description && (
            <Text style={styles.itemDesc}>{item.description}</Text>
          )}
          <Text style={[styles.itemStatus, isFull && styles.itemStatusFull]}>
            {isFull
              ? '✓ All claimed'
              : `${item.claim_count} of ${item.quantity_needed} claimed`
            }
          </Text>
        </View>

        {!isFull && !disabled && (
          <TouchableOpacity style={styles.claimBtn} onPress={onClaim} testID={`claim-btn-${item.id}`}>
            <Text style={styles.claimBtnText}>I'll bring this</Text>
          </TouchableOpacity>
        )}
      </View>

      {item.claims.length > 0 && (
        <View style={styles.claimsList}>
          {item.claims.map((claim) => {
            const isMine = isMyOrFamilyClaim(claim)
            return (
              <View key={claim.claim_id} style={[styles.claimRow, isMine && styles.claimRowMine]}>
                <View style={styles.claimInfo}>
                  <Text style={[styles.claimName, isMine && styles.claimNameMine]}>
                    {claim.claimant_name}
                  </Text>
                  {claim.note && (
                    <View style={styles.claimNoteRow}>
                      <MessageSquare size={11} color="#9CA3AF" />
                      <Text style={styles.claimNoteText}>{claim.note}</Text>
                    </View>
                  )}
                </View>
                {(isMine || isStaff) && !disabled && (
                  <TouchableOpacity
                    style={styles.unclaimBtn}
                    onPress={() => onUnclaim(claim.claim_id, item.name)}
                  >
                    <X size={14} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            )
          })}
        </View>
      )}
    </View>
  )
}

function ReadOnlySheet({ groups }: { groups: PotluckGroupParsed[] }) {
  return (
    <ScrollView style={{ flex: 1, width: '100%' }} contentContainerStyle={{ padding: 16 }}>
      {groups.map(g => (
        <View key={g.id} style={{ marginBottom: 16 }}>
          <Text style={styles.groupTitle}>{g.title}</Text>
          {g.items.map(item => (
            <View key={item.id} style={[styles.itemCard, item.is_full && styles.itemCardFull]}>
              <View style={styles.itemCardTop}>
                <View style={styles.itemCardInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemStatus}>
                    {item.claim_count} of {item.quantity_needed} claimed
                  </Text>
                </View>
              </View>
              {item.claims.length > 0 && (
                <View style={styles.claimsList}>
                  {item.claims.map(c => (
                    <View key={c.claim_id} style={styles.claimRow}>
                      <Text style={styles.claimName}>{c.claimant_name}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFBEB',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    padding: 32,
  },
  loadingText: {
    fontSize: 15,
    color: '#92400E',
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
    textAlign: 'center' as const,
    marginTop: 6,
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: '#D97706',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '600' as const,
    fontSize: 15,
  },
  progressBar: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  progressInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#92400E',
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#FDE68A',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    backgroundColor: '#D97706',
    borderRadius: 3,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  descBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  descText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  groupSection: {
    marginBottom: 20,
  },
  groupTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#111827',
  },
  groupCount: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#D97706',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  itemCardFull: {
    opacity: 0.7,
    borderColor: '#D1FAE5',
    backgroundColor: '#F0FDF4',
  },
  itemCardMine: {
    borderColor: '#FDE68A',
    borderWidth: 2,
  },
  itemCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  itemCardInfo: {
    flex: 1,
    marginRight: 10,
  },
  itemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#111827',
  },
  itemNameFull: {
    color: '#065F46',
  },
  itemDesc: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 3,
  },
  itemStatus: {
    fontSize: 12,
    color: '#D97706',
    fontWeight: '500' as const,
    marginTop: 4,
  },
  itemStatusFull: {
    color: '#10B981',
  },
  claimBtn: {
    backgroundColor: '#D97706',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  claimBtnText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#fff',
  },
  claimsList: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  claimRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  claimRowMine: {
    backgroundColor: '#FFFBEB',
    marginHorizontal: -14,
    paddingHorizontal: 14,
  },
  claimInfo: {
    flex: 1,
  },
  claimName: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500' as const,
  },
  claimNameMine: {
    color: '#D97706',
    fontWeight: '600' as const,
  },
  claimNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  claimNoteText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic' as const,
  },
  unclaimBtn: {
    padding: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
  },
  addItemInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#FDE68A',
    marginTop: 4,
  },
  addItemInlineText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#D97706',
  },
  addGroupInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#FDE68A',
    backgroundColor: '#FEF3C7',
  },
  addGroupInlineText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#D97706',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingBottom: 30,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#111827',
    flex: 1,
    marginRight: 12,
  },
  modalClose: {
    padding: 4,
  },
  modalScroll: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
  },
  modeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  modeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
  },
  modeBtnActive: {
    backgroundColor: '#D97706',
    borderColor: '#D97706',
  },
  modeBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#D97706',
  },
  modeBtnTextActive: {
    color: '#fff',
  },
  selectedPersonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 12,
    marginBottom: 4,
  },
  selectedPersonName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#92400E',
    flex: 1,
  },
  pickerBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginBottom: 6,
  },
  pickerBtnText: {
    fontSize: 15,
    color: '#374151',
  },
  pickerList: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    marginBottom: 6,
  },
  pickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pickerItemActive: {
    backgroundColor: '#FEF3C7',
  },
  pickerItemText: {
    fontSize: 15,
    color: '#374151',
  },
  pickerItemTextActive: {
    color: '#D97706',
    fontWeight: '600' as const,
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginBottom: 6,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  modalInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginBottom: 8,
  },
  noteInput: {
    minHeight: 60,
    paddingTop: 14,
  },
  claimSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#D97706',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  claimSubmitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  newItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  miniQtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniQtyBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  miniQtyBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#374151',
    lineHeight: 17,
  },
  miniQtyValue: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#111827',
    minWidth: 18,
    textAlign: 'center' as const,
  },
  addMoreItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#FDE68A',
    marginBottom: 8,
  },
  addMoreItemText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#D97706',
  },
})
