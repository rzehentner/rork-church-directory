'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AdminGuard from '@/components/admin/AdminGuard';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/hero', label: 'Hero' },
  { href: '/admin/content', label: 'Content' },
  { href: '/admin/settings', label: 'Settings' },
  { href: '/admin/pages', label: 'Pages' },
  { href: '/admin/staff', label: 'Staff' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  return (
    <AdminGuard>
      <div className="min-h-[60vh]">
        <div className="bg-navy-dark text-white sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center gap-6 h-12 text-sm">
            {NAV_ITEMS.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`hover:text-gold transition-colors ${
                  pathname === item.href ? 'text-gold font-semibold' : 'text-white/80'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          {children}
        </div>
      </div>
    </AdminGuard>
  );
}
