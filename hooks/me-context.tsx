import createContextHook from '@nkzw/create-context-hook';
import { useAuth } from '@/hooks/auth-context';
import { useUser } from '@/hooks/user-context';

interface MeState {
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLeader: boolean;
  isAdminOrLeader: boolean;
  userId: string | null;
  displayName: string;
  initials: string;
}

export const [MeProvider, useMe] = createContextHook<MeState>(() => {
  const { user, session } = useAuth();
  const { profile, person } = useUser();

  const isAuthenticated = !!session && !!user;
  const isAdmin = profile?.role === 'admin';
  const isLeader = profile?.role === 'leader';
  const isAdminOrLeader = isAdmin || isLeader;

  const displayName = person
    ? `${person.first_name || ''} ${person.last_name || ''}`.trim()
    : user?.email || 'User';

  const getInitials = () => {
    if (person?.first_name && person?.last_name) {
      return `${person.first_name[0]}${person.last_name[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  return {
    isAuthenticated,
    isAdmin,
    isLeader,
    isAdminOrLeader,
    userId: user?.id || null,
    displayName,
    initials: getInitials(),
  };
});
