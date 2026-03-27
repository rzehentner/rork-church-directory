import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Linking,
  Animated,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, Mail, Phone, Edit3, AlertCircle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { getSignedUrl } from '@/lib/storage';
import { useMe } from '@/hooks/me-context';
import { Colors } from '@/constants/colors';
import { styles } from '@/styles/staff.styles';

interface StaffMember {
  id: string;
  title: string | null;
  first_name: string | null;
  last_name: string | null;
  public_email: string | null;
  public_phone: string | null;
  bio: string | null;
  photo_path: string | null;
  sort_order: number;
}

async function fetchStaff(): Promise<StaffMember[]> {
  const { data, error } = await supabase
    .from('public_staff' as any)
    .select('id, title, first_name, last_name, public_email, public_phone, bio, photo_path, sort_order')
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return (data ?? []) as StaffMember[];
}

function getInitials(member: StaffMember): string {
  const first = member.first_name?.[0] ?? '';
  const last = member.last_name?.[0] ?? '';
  return `${first}${last}`.toUpperCase() || '?';
}

function getFullName(member: StaffMember): string {
  return `${member.first_name ?? ''} ${member.last_name ?? ''}`.trim() || 'Staff Member';
}

function StaffCardSkeleton() {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 900, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View style={[styles.skeletonCard, { opacity }]}>
      <View style={styles.skeletonTopRow}>
        <View style={styles.skeletonAvatar} />
        <View style={styles.skeletonInfo}>
          <View style={[styles.skeletonLine, { width: '55%', height: 14 }]} />
          <View style={[styles.skeletonLine, { width: '40%', height: 12 }]} />
        </View>
      </View>
      <View style={[styles.skeletonBio, { width: '100%', height: 12 }]} />
      <View style={[styles.skeletonBio, { width: '85%', height: 12 }]} />
      <View style={[styles.skeletonBio, { width: '70%', height: 12 }]} />
    </Animated.View>
  );
}

interface StaffPhotoProps {
  member: StaffMember;
}

function StaffPhoto({ member }: StaffPhotoProps) {
  const [photoUrl, setPhotoUrl] = React.useState<string | null>(null);

  useEffect(() => {
    if (!member.photo_path) return;
    let cancelled = false;
    getSignedUrl(member.photo_path).then((url) => {
      if (!cancelled) setPhotoUrl(url);
    });
    return () => { cancelled = true; };
  }, [member.photo_path]);

  if (photoUrl) {
    return (
      <Image
        source={{ uri: photoUrl }}
        style={styles.photo}
        contentFit="cover"
        transition={200}
      />
    );
  }

  return (
    <View style={styles.avatarFallback}>
      <Text style={styles.avatarInitials}>{getInitials(member)}</Text>
    </View>
  );
}

interface StaffCardProps {
  member: StaffMember;
  isAdminOrLeader: boolean;
}

function StaffCard({ member, isAdminOrLeader }: StaffCardProps) {
  const handleEmail = useCallback(() => {
    if (!member.public_email) return;
    Linking.openURL(`mailto:${member.public_email}`).catch(() =>
      Alert.alert('Error', 'Could not open email client.')
    );
  }, [member.public_email]);

  const handlePhone = useCallback(() => {
    if (!member.public_phone) return;
    Linking.openURL(`tel:${member.public_phone}`).catch(() =>
      Alert.alert('Error', 'Could not open phone dialer.')
    );
  }, [member.public_phone]);

  const handleEdit = useCallback(() => {
    router.push({ pathname: '/edit-staff', params: { id: member.id } } as any);
  }, [member.id]);

  const hasContact = !!(member.public_email || member.public_phone);

  return (
    <View style={styles.card}>
      <View style={styles.cardInner}>
        <View style={styles.cardTopRow}>
          <View style={styles.photoWrapper}>
            <StaffPhoto member={member} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.staffName} numberOfLines={2}>
              {getFullName(member)}
            </Text>
            {!!member.title && (
              <Text style={styles.staffTitle} numberOfLines={1}>
                {member.title}
              </Text>
            )}
            {isAdminOrLeader && (
              <TouchableOpacity style={styles.editButton} onPress={handleEdit} activeOpacity={0.7}>
                <Edit3 size={12} color={Colors.text.secondary} />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {!!member.bio && (
          <>
            <View style={styles.divider} />
            <Text style={styles.bio} numberOfLines={3}>
              {member.bio}
            </Text>
          </>
        )}

        {hasContact && (
          <>
            {!member.bio && <View style={styles.divider} />}
            {!!member.public_email && (
              <TouchableOpacity style={styles.contactRow} onPress={handleEmail} activeOpacity={0.7}>
                <Mail size={16} color={Colors.steelBlue} />
                <Text style={styles.contactText} numberOfLines={1}>
                  {member.public_email}
                </Text>
              </TouchableOpacity>
            )}
            {!!member.public_phone && (
              <TouchableOpacity style={styles.contactRow} onPress={handlePhone} activeOpacity={0.7}>
                <Phone size={16} color={Colors.steelBlue} />
                <Text style={styles.contactText} numberOfLines={1}>
                  {member.public_phone}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </View>
  );
}

export default function StaffScreen() {
  const insets = useSafeAreaInsets();
  const { isAdminOrLeader } = useMe();
  const queryClient = useQueryClient();

  const { data: staff = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['staff'],
    queryFn: fetchStaff,
    staleTime: 5 * 60 * 1000,
  });

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['staff'] });
  }, [queryClient]);

  const renderItem = useCallback(
    ({ item }: { item: StaffMember }) => (
      <StaffCard member={item} isAdminOrLeader={isAdminOrLeader} />
    ),
    [isAdminOrLeader]
  );

  const keyExtractor = useCallback((item: StaffMember) => item.id, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Users size={22} color={Colors.navy} />
          <Text style={styles.headerTitle}>Staff</Text>
        </View>
      </View>

      {isLoading ? (
        <FlatList
          data={[1, 2, 3]}
          keyExtractor={(item) => String(item)}
          renderItem={() => <StaffCardSkeleton />}
          contentContainerStyle={styles.list}
          scrollEnabled={false}
        />
      ) : isError ? (
        <View style={styles.errorBanner}>
          <AlertCircle size={18} color={Colors.status.error} />
          <Text style={styles.errorBannerText}>
            Could not load staff. Check your connection and try again.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : staff.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Users size={48} color={Colors.border.light} />
          <Text style={styles.emptyTitle}>No Staff Listed</Text>
          <Text style={styles.emptySubtext}>
            Staff directory information has not been added yet.
          </Text>
        </View>
      ) : (
        <FlatList
          data={staff}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 16 }]}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={handleRefresh}
              tintColor={Colors.navy}
              colors={[Colors.navy]}
            />
          }
        />
      )}
    </View>
  );
}
