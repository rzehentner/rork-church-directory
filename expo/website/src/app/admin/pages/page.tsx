'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase-admin';
import type { WebsitePage } from '@/types';

export default function AdminPagesListPage() {
  const [pages, setPages] = useState<WebsitePage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createAdminClient();
      const { data } = await supabase
        .from('website_pages')
        .select('*')
        .order('sort_order', { ascending: true });
      setPages((data ?? []) as WebsitePage[]);
      setLoading(false);
    }
    load();
  }, []);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    const supabase = createAdminClient();
    await supabase.from('website_pages').delete().eq('id', id);
    setPages(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-navy-dark">Custom Pages</h1>
        <Link
          href="/admin/pages/new"
          className="px-4 py-2 rounded-lg bg-navy text-white text-sm font-medium hover:bg-navy-light transition-colors"
        >
          + New Page
        </Link>
      </div>

      {loading ? (
        <div className="text-steel text-sm">Loading...</div>
      ) : pages.length === 0 ? (
        <div className="text-steel text-sm">No custom pages yet.</div>
      ) : (
        <div className="bg-white rounded-xl border border-cream overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cream bg-cream/30">
                <th className="text-left px-4 py-3 font-medium text-navy-dark">Title</th>
                <th className="text-left px-4 py-3 font-medium text-navy-dark hidden sm:table-cell">Slug</th>
                <th className="text-center px-4 py-3 font-medium text-navy-dark">Published</th>
                <th className="text-center px-4 py-3 font-medium text-navy-dark hidden sm:table-cell">Nav</th>
                <th className="text-right px-4 py-3 font-medium text-navy-dark">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pages.map(page => (
                <tr key={page.id} className="border-b border-cream last:border-0">
                  <td className="px-4 py-3 text-navy-dark font-medium">{page.title}</td>
                  <td className="px-4 py-3 text-steel hidden sm:table-cell">/{page.slug}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${page.is_published ? 'bg-green-500' : 'bg-gray-300'}`} />
                  </td>
                  <td className="px-4 py-3 text-center hidden sm:table-cell">
                    {page.show_in_nav ? 'Yes' : '—'}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <Link
                      href={`/admin/pages/${page.id}`}
                      className="text-navy hover:text-navy-light transition-colors"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(page.id, page.title)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
