'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase-admin';
import { renderMarkdown } from '@/lib/utils';
import type { WebsitePage } from '@/types';

interface PageEditorProps {
  page?: WebsitePage;
  isNew?: boolean;
}

export default function PageEditor({ page, isNew }: PageEditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState(page?.title || '');
  const [slug, setSlug] = useState(page?.slug || '');
  const [body, setBody] = useState(page?.body || '');
  const [metaDescription, setMetaDescription] = useState(page?.meta_description || '');
  const [isPublished, setIsPublished] = useState(page?.is_published ?? false);
  const [showInNav, setShowInNav] = useState(page?.show_in_nav ?? false);
  const [sortOrder, setSortOrder] = useState(page?.sort_order ?? 0);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState('');

  const autoSlug = (text: string) =>
    text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (isNew && !slug) {
      setSlug(autoSlug(value));
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !slug.trim()) {
      setError('Title and slug are required');
      return;
    }

    setSaving(true);
    setError('');
    const supabase = createAdminClient();

    const payload = {
      title: title.trim(),
      slug: slug.trim(),
      body,
      meta_description: metaDescription || null,
      is_published: isPublished,
      show_in_nav: showInNav,
      sort_order: sortOrder,
    };

    if (isNew) {
      const { error: err } = await supabase.from('website_pages').insert(payload);
      if (err) {
        setError(err.message);
        setSaving(false);
        return;
      }
    } else if (page) {
      const { error: err } = await supabase.from('website_pages').update(payload).eq('id', page.id);
      if (err) {
        setError(err.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    router.push('/admin/pages');
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-navy-dark mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={e => handleTitleChange(e.target.value)}
            className="w-full border border-cream rounded-lg px-4 py-2.5 text-navy-dark focus:outline-none focus:ring-2 focus:ring-navy/20"
            placeholder="Page title"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-navy-dark mb-1">Slug</label>
          <input
            type="text"
            value={slug}
            onChange={e => setSlug(e.target.value)}
            className="w-full border border-cream rounded-lg px-4 py-2.5 text-navy-dark focus:outline-none focus:ring-2 focus:ring-navy/20"
            placeholder="url-slug"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-navy-dark mb-1">Meta Description (SEO)</label>
        <input
          type="text"
          value={metaDescription}
          onChange={e => setMetaDescription(e.target.value)}
          className="w-full border border-cream rounded-lg px-4 py-2.5 text-navy-dark focus:outline-none focus:ring-2 focus:ring-navy/20"
          placeholder="Brief description for search engines"
        />
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={isPublished} onChange={e => setIsPublished(e.target.checked)} className="w-4 h-4 rounded text-navy" />
          <span className="text-sm text-navy-dark">Published</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={showInNav} onChange={e => setShowInNav(e.target.checked)} className="w-4 h-4 rounded text-navy" />
          <span className="text-sm text-navy-dark">Show in Navigation</span>
        </label>
        <div className="flex items-center gap-2">
          <label className="text-sm text-navy-dark">Sort Order:</label>
          <input
            type="number"
            value={sortOrder}
            onChange={e => setSortOrder(parseInt(e.target.value) || 0)}
            className="w-20 border border-cream rounded-lg px-3 py-1.5 text-navy-dark text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium text-navy-dark">Body (Markdown)</label>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="text-sm text-navy hover:text-navy-light transition-colors"
          >
            {showPreview ? 'Edit' : 'Preview'}
          </button>
        </div>
        {showPreview ? (
          <div
            className="prose prose-lg max-w-none border border-cream rounded-lg p-4 min-h-[300px] bg-white"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }}
          />
        ) : (
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={15}
            className="w-full border border-cream rounded-lg px-4 py-2.5 text-navy-dark font-mono text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 resize-y"
            placeholder="Write your page content in Markdown..."
          />
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 rounded-lg bg-navy text-white font-medium hover:bg-navy-light transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : isNew ? 'Create Page' : 'Save Changes'}
        </button>
        <button
          onClick={() => router.push('/admin/pages')}
          className="px-6 py-2.5 rounded-lg border border-cream text-navy-dark font-medium hover:bg-cream transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
