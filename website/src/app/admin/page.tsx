'use client';

import Link from 'next/link';
import { useState } from 'react';
import { createAdminClient } from '@/lib/supabase-admin';

const cards = [
  {
    title: 'Hero Slideshow',
    description: 'Upload and manage the photos that cycle on the homepage hero section.',
    href: '/admin/hero',
  },
  {
    title: 'Content Blocks',
    description: 'Edit hero text, about section, mission statement, and other website content.',
    href: '/admin/content',
  },
  {
    title: 'Church Settings',
    description: 'Church name, address, phone, email, service times, and app store links.',
    href: '/admin/settings',
  },
  {
    title: 'Staff',
    description: 'Add, edit, and reorder church staff members shown on the website and app.',
    href: '/admin/staff',
  },
  {
    title: 'Custom Pages',
    description: 'Create and manage custom pages like ministries, staff, or special events.',
    href: '/admin/pages',
  },
];

export default function AdminDashboardPage() {
  const [refreshing, setRefreshing] = useState(false);
  const [refreshed, setRefreshed] = useState(false);
  const [error, setError] = useState('');

  async function handleRefresh() {
    setRefreshing(true);
    setError('');
    setRefreshed(false);

    try {
      const supabase = createAdminClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        setRefreshing(false);
        return;
      }

      const res = await fetch('/api/revalidate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error || 'Refresh failed');
      } else {
        setRefreshed(true);
        setTimeout(() => setRefreshed(false), 4000);
      }
    } catch {
      setError('Refresh failed');
    }

    setRefreshing(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-navy-dark">Website Admin</h1>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-navy text-white text-sm font-medium hover:bg-navy-light transition-colors disabled:opacity-50"
        >
          <svg
            className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {refreshing ? 'Refreshing...' : refreshed ? 'Site Refreshed!' : 'Refresh Site'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm mb-4">
          {error}
        </div>
      )}

      {refreshed && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm mb-4">
          All pages have been refreshed. Changes should be visible now.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cards.map(card => (
          <Link
            key={card.href}
            href={card.href}
            className="block bg-white rounded-xl border border-cream p-6 hover:shadow-md transition-shadow"
          >
            <h2 className="text-lg font-semibold text-navy-dark mb-2">{card.title}</h2>
            <p className="text-sm text-steel">{card.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
