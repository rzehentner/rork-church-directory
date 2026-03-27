'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase-admin';

const ADMIN_LINKS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/hero', label: 'Hero' },
  { href: '/admin/content', label: 'Content' },
  { href: '/admin/settings', label: 'Settings' },
  { href: '/admin/pages', label: 'Pages' },
  { href: '/admin/staff', label: 'Staff' },
];

export default function AdminBar() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const supabase = createAdminClient();

    async function check() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (profile?.role === 'admin') {
        setIsAdmin(true);
      }
    }

    check();
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    const supabase = createAdminClient();
    await supabase.auth.signOut();
    setIsAdmin(false);
    setLoggingOut(false);
  }

  if (!isAdmin) return null;

  return (
    <div className="bg-gold/90 text-navy-dark sticky top-16 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center gap-1 h-9 text-xs font-medium overflow-x-auto">
        <span className="text-navy-dark/60 mr-2 shrink-0">Admin:</span>
        {ADMIN_LINKS.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`px-2.5 py-1 rounded transition-colors shrink-0 ${
              pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
                ? 'bg-navy-dark text-white'
                : 'hover:bg-navy-dark/10'
            }`}
          >
            {item.label}
          </Link>
        ))}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="ml-auto px-2.5 py-1 rounded transition-colors shrink-0 hover:bg-red-600/20 text-red-800 disabled:opacity-50"
        >
          {loggingOut ? 'Logging out...' : 'Logout'}
        </button>
      </div>
    </div>
  );
}
