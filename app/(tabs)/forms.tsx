import React, { useState, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { Stack, router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { Calendar, MapPin, Users, Clock, ChevronRight, UtensilsCrossed, ClipboardList } from 'lucide-react-native'
import { getMySignupForms, getFormSummaries } from '@/services/signup-forms'
import type { MySignupForm, SignupFormSummary } from '@/types/signup'

function getStatusBadge(status: MySignupForm['my_signup_status']) {
  if (status === 'confirmed') {
    return { label: 'Signed Up', bg: '#D1FAE5', color: '#065F46' }
  }
  if (status === 'waitlisted') {
    return { label: 'Waitlisted', bg: '#FEF3C7', color: '#92400E' }
  }
  return { label: 'Sign Up', bg: '#EEF2FF', color: '#4338CA' }
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function SpotsIndicator({ confirmed, max }: { confirmed: number; max: number | null }) {
  if (!max) return null
  const remaining = max - confirmed
  const pct = Math.min(confirmed / max, 1)

  return (
    <View style={styles.spotsContainer}>
      <View style={styles.spotsBarBg}>
        <View
          style={[
            styles.spotsBarFill,
            {
              width: `${pct * 100}%` as any,
              backgroundColor: remaining <= 0 ? '#EF4444' : remaining <= 5 ? '#F59E0B' : '#10B981',
            },
          ]}
        />
      </View>
      <Text style={[styles.spotsText, remaining <= 0 && styles.spotsTextFull]}>
        {remaining <= 0 ? 'Full — waitlist only' : `${remaining} spot${remaining !== 1 ? 's' : ''} left`}
      </Text>
    </View>
  )
}

function PotluckFormCard({ form }: { form: MySignupForm }) {
  const isPast = new Date(form.event_end) < new Date()
  const deadlinePassed = form.deadline ? new Date(form.deadline) < new Date() : false
  const totalItems = form.total_items ?? 0
  const claimed = form.fully_claimed_items ?? 0
  const pct = totalItems > 0 ? Math.min(claimed / totalItems, 1) : 0
  const myItems = form.my_claimed_items ?? []

  return (
    <TouchableOpacity
      style={[styles.card, styles.potluckCard, (isPast || deadlinePassed) && styles.cardDisabled]}
      onPress={() => {
        if (!isPast && !deadlinePassed) {
          router.push(`/potluck-sheet?formId=${form.form_id}` as any)
        }
      }}
      activeOpacity={0.7}
      testID={`form-card-${form.form_id}`}
    >
      <View style={styles.cardTop}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={2}>{form.form_title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: '#FEF3C7' }]}>
            <UtensilsCrossed size={12} color="#D97706" />
            <Text style={[styles.statusText, { color: '#D97706', marginLeft: 4 }]}>Potluck</Text>
          </View>
        </View>
        {form.event_title !== form.form_title && (
          <Text style={styles.eventName} numberOfLines={1}>{form.event_title}</Text>
        )}
      </View>

      <View style={styles.cardMeta}>
        <View style={styles.metaRow}>
          <Calendar size={15} color="#6B7280" />
          <Text style={styles.metaText}>
            {formatDate(form.event_start)} at {formatTime(form.event_start)}
          </Text>
        </View>
        {form.event_location && (
          <View style={styles.metaRow}>
            <MapPin size={15} color="#6B7280" />
            <Text style={styles.metaText} numberOfLines={1}>{form.event_location}</Text>
          </View>
        )}
        {form.deadline && (
          <View style={styles.metaRow}>
            <Clock size={15} color={deadlinePassed ? '#EF4444' : '#6B7280'} />
            <Text style={[styles.metaText, deadlinePassed && styles.metaTextDanger]}>
              {deadlinePassed ? 'Deadline passed' : `Deadline: ${formatDate(form.deadline)}`}
            </Text>
          </View>
        )}
      </View>

      {totalItems > 0 && (
        <View style={styles.spotsContainer}>
          <View style={styles.spotsBarBg}>
            <View
              style={[
                styles.spotsBarFill,
                {
                  width: `${pct * 100}%` as any,
                  backgroundColor: pct >= 1 ? '#10B981' : '#D97706',
                },
              ]}
            />
          </View>
          <Text style={styles.spotsText}>
            {claimed} of {totalItems} items fully claimed
          </Text>
        </View>
      )}

      {myItems.length > 0 && (
        <View style={styles.myItemsBanner}>
          <Text style={styles.myItemsText}>You're bringing: {myItems.join(', ')}</Text>
        </View>
      )}

      <View style={styles.cardFooter}>
        <View style={styles.metaRow}>
          <UtensilsCrossed size={14} color="#D97706" />
          <Text style={[styles.footerText, { color: '#D97706' }]}>View Items</Text>
        </View>
        <ChevronRight size={18} color="#D97706" />
      </View>
    </TouchableOpacity>
  )
}

function FormCard({ form }: { form: MySignupForm }) {
  if (form.form_type === 'potluck') {
    return <PotluckFormCard form={form} />
  }

  const badge = getStatusBadge(form.my_signup_status)
  const isPast = new Date(form.event_end) < new Date()
  const deadlinePassed = form.deadline ? new Date(form.deadline) < new Date() : false

  return (
    <TouchableOpacity
      style={[styles.card, (isPast || deadlinePassed) && styles.cardDisabled]}
      onPress={() => {
        if (!isPast && !deadlinePassed) {
          router.push(`/signup-form?formId=${form.form_id}` as any)
        }
      }}
      activeOpacity={0.7}
      testID={`form-card-${form.form_id}`}
    >
      <View style={styles.cardTop}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={2}>{form.form_title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.statusText, { color: badge.color }]}>{badge.label}</Text>
          </View>
        </View>
        {form.event_title !== form.form_title && (
          <Text style={styles.eventName} numberOfLines={1}>{form.event_title}</Text>
        )}
      </View>

      <View style={styles.cardMeta}>
        <View style={styles.metaRow}>
          <Calendar size={15} color="#6B7280" />
          <Text style={styles.metaText}>
            {formatDate(form.event_start)} at {formatTime(form.event_start)}
          </Text>
        </View>
        {form.event_location && (
          <View style={styles.metaRow}>
            <MapPin size={15} color="#6B7280" />
            <Text style={styles.metaText} numberOfLines={1}>{form.event_location}</Text>
          </View>
        )}
        {form.deadline && (
          <View style={styles.metaRow}>
            <Clock size={15} color={deadlinePassed ? '#EF4444' : '#6B7280'} />
            <Text style={[styles.metaText, deadlinePassed && styles.metaTextDanger]}>
              {deadlinePassed ? 'Deadline passed' : `Deadline: ${formatDate(form.deadline)}`}
            </Text>
          </View>
        )}
      </View>

      <SpotsIndicator confirmed={form.confirmed_count} max={form.max_signups} />

      <View style={styles.cardFooter}>
        <View style={styles.metaRow}>
          <Users size={14} color="#9CA3AF" />
          <Text style={styles.footerText}>{form.confirmed_count} signed up</Text>
        </View>
        <ChevronRight size={18} color="#9CA3AF" />
      </View>
    </TouchableOpacity>
  )
}

function summaryToMyForm(s: SignupFormSummary): MySignupForm {
  return {
    form_id: s.form_id,
    form_title: s.form_title,
    form_description: s.form_description,
    form_type: s.form_type,
    event_id: s.event_id,
    event_title: s.event_title,
    event_start: s.event_start,
    event_end: s.event_end,
    event_location: s.event_location,
    max_signups: s.max_signups,
    deadline: s.deadline,
    confirmed_count: s.confirmed_count,
    my_signup_status: null,
    total_items: s.total_items,
    fully_claimed_items: s.fully_claimed_items,
    total_claims: s.total_claims,
    my_claimed_items: null,
  }
}

export default function FormsScreen() {
  const [refreshing, setRefreshing] = useState(false)
  const insets = useSafeAreaInsets()

  const { data: myForms, isLoading: myLoading, error: myError, refetch: refetchMy } = useQuery({
    queryKey: ['my-signup-forms'],
    queryFn: getMySignupForms,
  })

  const { data: allSummaries, isLoading: summaryLoading, refetch: refetchSummaries } = useQuery({
    queryKey: ['signup-form-summary'],
    queryFn: getFormSummaries,
  })

  const forms = useMemo(() => {
    const myFormIds = new Set((myForms ?? []).map(f => f.form_id))
    const extraForms = (allSummaries ?? [])
      .filter(s => !myFormIds.has(s.form_id))
      .map(summaryToMyForm)
    const merged = [...(myForms ?? []), ...extraForms]
    merged.sort((a, b) => new Date(a.event_start).getTime() - new Date(b.event_start).getTime())
    console.log('Forms tab: myForms=', myForms?.length, 'summaries=', allSummaries?.length, 'merged=', merged.length)
    return merged
  }, [myForms, allSummaries])

  const isLoading = myLoading && summaryLoading
  const error = myError

  const refetch = useCallback(async () => {
    await Promise.all([refetchMy(), refetchSummaries()])
  }, [refetchMy, refetchSummaries])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }, [refetch])

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Calendar size={36} color="#9CA3AF" />
      </View>
      <Text style={styles.emptyTitle}>No Signup Forms</Text>
      <Text style={styles.emptySubtitle}>
        When events have signup forms available, they'll appear here.
      </Text>
    </View>
  )

  if (isLoading && !forms) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <ClipboardList size={28} color="#4338CA" />
            <Text style={styles.headerTitle}>Signups</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4338CA" />
          <Text style={styles.loadingText}>Loading forms...</Text>
        </View>
      </View>
    )
  }

  if (error) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <ClipboardList size={28} color="#4338CA" />
            <Text style={styles.headerTitle}>Signups</Text>
          </View>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Could not load forms</Text>
          <Text style={styles.errorSubtitle}>{error instanceof Error ? error.message : 'Unknown error'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const formCount = forms?.length ?? 0

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <ClipboardList size={28} color="#4338CA" />
          <Text style={styles.headerTitle}>Signups</Text>
        </View>
        {formCount > 0 && (
          <View style={styles.headerCountBadge}>
            <Text style={styles.headerCountText}>{formCount}</Text>
          </View>
        )}
      </View>
      <FlatList
        data={forms ?? []}
        keyExtractor={(item) => item.form_id}
        renderItem={({ item }) => <FormCard form={item} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4338CA" />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#1F2937',
  },
  headerCountBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  headerCountText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#4338CA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#DC2626',
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#4338CA',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600' as const,
    fontSize: 15,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardDisabled: {
    opacity: 0.55,
  },
  cardTop: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#111827',
    flex: 1,
  },
  eventName: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  cardMeta: {
    gap: 6,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
  metaTextDanger: {
    color: '#EF4444',
    fontWeight: '500' as const,
  },
  spotsContainer: {
    marginBottom: 12,
  },
  spotsBarBg: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  spotsBarFill: {
    height: 6,
    borderRadius: 3,
  },
  spotsText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500' as const,
  },
  spotsTextFull: {
    color: '#EF4444',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  footerText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#374151',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  potluckCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#D97706',
  },
  myItemsBanner: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
  },
  myItemsText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '500' as const,
  },
})
