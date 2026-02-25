import React, { useState, useMemo, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native'
import { Image } from 'expo-image'
import { Stack, useLocalSearchParams, router } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { XCircle, Filter, ChevronDown, ChevronUp, User } from 'lucide-react-native'
import { getAllFormResponses, cancelSignup, getSignupForm } from '@/services/signup-forms'
import { useToast } from '@/hooks/toast-context'
import type { SignupResponseDetail, SignupStatus } from '@/types/signup'

type StatusFilter = 'all' | SignupStatus

export default function SignupResponsesScreen() {
  const { formId, formTitle } = useLocalSearchParams<{ formId: string; formTitle?: string }>()
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const { data: form } = useQuery({
    queryKey: ['signup-form', formId],
    queryFn: () => getSignupForm(formId),
    enabled: !!formId,
  })

  const { data: responses, isLoading, error, refetch } = useQuery({
    queryKey: ['signup-form-responses', formId],
    queryFn: () => getAllFormResponses(formId),
    enabled: !!formId,
  })

  const cancelMutation = useMutation({
    mutationFn: cancelSignup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signup-form-responses', formId] })
      queryClient.invalidateQueries({ queryKey: ['my-signup-forms'] })
      showToast('success', 'Signup cancelled')
    },
    onError: (err: any) => {
      showToast('error', err?.message || 'Failed to cancel signup')
    },
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }, [refetch])

  const filtered = useMemo(() => {
    if (!responses) return []
    if (statusFilter === 'all') return responses
    return responses.filter(r => r.status === statusFilter)
  }, [responses, statusFilter])

  const counts = useMemo(() => {
    const c = { confirmed: 0, waitlisted: 0, cancelled: 0, total: 0 }
    for (const r of responses ?? []) {
      if (r.status === 'confirmed') c.confirmed++
      else if (r.status === 'waitlisted') c.waitlisted++
      else if (r.status === 'cancelled') c.cancelled++
      c.total++
    }
    return c
  }, [responses])

  const handleCancel = (responseId: string, name: string) => {
    Alert.alert(
      'Cancel Signup',
      `Cancel ${name}'s signup? If they were confirmed, the next waitlisted person will be promoted.`,
      [
        { text: 'Keep', style: 'cancel' },
        { text: 'Cancel Signup', style: 'destructive', onPress: () => cancelMutation.mutate(responseId) },
      ]
    )
  }

  const getStatusStyle = (status: SignupStatus) => {
    if (status === 'confirmed') return { bg: '#D1FAE5', color: '#065F46' }
    if (status === 'waitlisted') return { bg: '#FEF3C7', color: '#92400E' }
    return { bg: '#FEE2E2', color: '#991B1B' }
  }

  const renderItem = ({ item }: { item: SignupResponseDetail }) => {
    const isExpanded = expandedId === item.id
    const s = getStatusStyle(item.status)
    const customFields = item.custom_fields ?? {}
    const customKeys = Object.keys(customFields)

    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.cardHeader}
          onPress={() => setExpandedId(isExpanded ? null : item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.cardLeft}>
            {item.person_photo_path ? (
              <Image source={{ uri: item.person_photo_path }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <User size={18} color="#9CA3AF" />
              </View>
            )}
            <View style={styles.cardInfo}>
              <Text style={styles.cardName}>{item.respondent_name}</Text>
              {item.respondent_email && (
                <Text style={styles.cardSub}>{item.respondent_email}</Text>
              )}
            </View>
          </View>
          <View style={styles.cardRight}>
            <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
              <Text style={[styles.statusPillText, { color: s.color }]}>
                {item.status === 'confirmed' ? 'Confirmed' : item.status === 'waitlisted' ? 'Waitlisted' : 'Cancelled'}
              </Text>
            </View>
            {isExpanded ? <ChevronUp size={16} color="#9CA3AF" /> : <ChevronDown size={16} color="#9CA3AF" />}
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.cardBody}>
            {item.respondent_phone && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Phone</Text>
                <Text style={styles.detailValue}>{item.respondent_phone}</Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Signed up</Text>
              <Text style={styles.detailValue}>
                {new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            {item.submitter_name && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Submitted by</Text>
                <Text style={styles.detailValue}>{item.submitter_name}</Text>
              </View>
            )}

            {customKeys.length > 0 && (
              <View style={styles.customFieldsSection}>
                <Text style={styles.customFieldsTitle}>Custom Fields</Text>
                {customKeys.map(key => (
                  <View key={key} style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{key.replace(/_/g, ' ')}</Text>
                    <Text style={styles.detailValue}>{customFields[key]}</Text>
                  </View>
                ))}
              </View>
            )}

            {item.status !== 'cancelled' && (
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => handleCancel(item.id, item.respondent_name)}
                disabled={cancelMutation.isPending}
              >
                <XCircle size={16} color="#EF4444" />
                <Text style={styles.cancelBtnText}>Cancel Signup</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    )
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: formTitle || 'Responses' }} />
        <ActivityIndicator size="large" color="#4338CA" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: formTitle || 'Responses' }} />

      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryCount}>{counts.confirmed}</Text>
          <Text style={styles.summaryLabel}>Confirmed</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryCount}>{counts.waitlisted}</Text>
          <Text style={styles.summaryLabel}>Waitlisted</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryCount}>{counts.cancelled}</Text>
          <Text style={styles.summaryLabel}>Cancelled</Text>
        </View>
        {form?.max_signups && (
          <>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryCount}>{form.max_signups}</Text>
              <Text style={styles.summaryLabel}>Capacity</Text>
            </View>
          </>
        )}
      </View>

      <View style={styles.filterRow}>
        <Filter size={14} color="#6B7280" />
        {(['all', 'confirmed', 'waitlisted', 'cancelled'] as StatusFilter[]).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, statusFilter === f && styles.filterChipActive]}
            onPress={() => setStatusFilter(f)}
          >
            <Text style={[styles.filterChipText, statusFilter === f && styles.filterChipTextActive]}>
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4338CA" />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {statusFilter === 'all' ? 'No signups yet' : `No ${statusFilter} signups`}
            </Text>
          </View>
        }
      />
    </View>
  )
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
  },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryCount: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#111827',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '500' as const,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 2,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
  },
  filterChipActive: {
    backgroundColor: '#4338CA',
  },
  filterChipText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500' as const,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E5E7EB',
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#111827',
  },
  cardSub: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 1,
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  cardBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 13,
    color: '#6B7280',
    textTransform: 'capitalize' as const,
  },
  detailValue: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '500' as const,
    maxWidth: '60%' as any,
    textAlign: 'right' as const,
  },
  customFieldsSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  customFieldsTitle: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#6366F1',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#EF4444',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 15,
    color: '#9CA3AF',
  },
})
