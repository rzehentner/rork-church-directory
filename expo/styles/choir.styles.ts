import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.background.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.navy,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 5,
  },
  addButtonText: {
    color: Colors.text.inverse,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },

  // Song Library Card
  songLibraryCard: {
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
    overflow: 'hidden',
  },
  songLibraryCardDisabled: {
    opacity: 0.6,
  },
  songLibraryInner: {
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  songLibraryIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  songLibraryIconWrapperDisabled: {
    backgroundColor: Colors.background.elevated,
  },
  songLibraryTextGroup: {
    flex: 1,
  },
  songLibraryTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 2,
  },
  songLibrarySubtitle: {
    fontSize: 13,
    color: Colors.text.secondary,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    letterSpacing: 0.3,
  },
  archiveToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border.light,
    backgroundColor: Colors.background.elevated,
  },
  archiveToggleActive: {
    borderColor: Colors.navy,
    backgroundColor: Colors.navy,
  },
  archiveToggleText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
  },
  archiveToggleTextActive: {
    color: Colors.text.inverse,
  },

  // Note Card
  card: {
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    marginBottom: 14,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
    overflow: 'hidden',
  },
  cardArchived: {
    opacity: 0.55,
  },
  cardInner: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 6,
  },
  serviceDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  serviceDateText: {
    fontSize: 13,
    color: Colors.text.secondary,
    fontWeight: '500' as const,
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: Colors.background.elevated,
    alignSelf: 'flex-start' as const,
  },
  songTitle: {
    fontSize: 13,
    color: Colors.navy,
    fontWeight: '600' as const,
  },
  songTitleTappable: {
    textDecorationLine: 'underline' as const,
  },
  bodyText: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
    marginBottom: 10,
  },
  taggedMembers: {
    fontSize: 13,
    color: Colors.text.muted,
    fontStyle: 'italic' as const,
    marginBottom: 10,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border.light,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  footerMetaText: {
    fontSize: 12,
    color: Colors.text.muted,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border.light,
    backgroundColor: Colors.background.elevated,
  },
  actionButtonDelete: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
  },
  actionButtonTextDelete: {
    color: Colors.status.error,
  },

  // Skeleton
  skeletonCard: {
    backgroundColor: Colors.background.card,
    borderRadius: 16,
    marginBottom: 14,
    padding: 16,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  skeletonLine: {
    borderRadius: 4,
    backgroundColor: Colors.border.light,
    marginBottom: 8,
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 32,
    paddingVertical: 48,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.text.secondary,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.text.muted,
    textAlign: 'center' as const,
    lineHeight: 20,
  },

  // Error banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 14,
    margin: 16,
    gap: 10,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 14,
    color: '#991B1B',
    fontWeight: '500' as const,
  },
  retryButton: {
    backgroundColor: Colors.status.error,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryButtonText: {
    color: Colors.text.inverse,
    fontSize: 13,
    fontWeight: '600' as const,
  },
});
