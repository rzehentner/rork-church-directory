'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase-admin';
import PageEditor from '@/components/admin/PageEditor';
import type { WebsitePage } from '@/types';

export default function AdminEditPagePage() {
  const { id } = useParams<{ id: string }>();
  const [page, setPage] = useState<WebsitePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('website_pages')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error || !data) {
        setNotFound(true);
      } else {
        setPage(data as WebsitePage);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-4 border-navy/20 border-t-navy rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="text-center py-20">
        <h1 className="text-xl font-bold text-navy-dark">Page not found</h1>
        <p className="text-steel mt-2">This page may have been deleted.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy-dark mb-6">Edit Page</h1>
      <PageEditor page={page!} />
    </div>
  );
}
