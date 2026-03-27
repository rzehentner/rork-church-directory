'use client';

import { useState } from 'react';
import { createAdminClient } from '@/lib/supabase-admin';
import type { WebsiteContent } from '@/types';

const KEY_LABELS: Record<string, string> = {
  hero_title: 'Hero Title',
  hero_subtitle: 'Hero Subtitle',
  about_text: 'About Text',
  mission_statement: 'Mission Statement',
  pastor_bio: 'Pastor Bio',
  footer_tagline: 'Footer Tagline',
  home_cta_text: 'Home CTA Text',
  home_cta_description: 'Home CTA Description',
};

interface ContentEditorProps {
  items: WebsiteContent[];
}

export default function ContentEditor({ items }: ContentEditorProps) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(items.map(i => [i.id, i.value]))
  );
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const handleSave = async (item: WebsiteContent) => {
    setSaving(item.id);
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('website_content')
      .update({ value: values[item.id] })
      .eq('id', item.id);

    setSaving(null);
    if (!error) {
      setSaved(item.id);
      setTimeout(() => setSaved(null), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {items.map(item => (
        <div key={item.id} className="bg-white rounded-xl border border-cream p-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-navy-dark">
                {KEY_LABELS[item.key] || item.key}
              </h3>
              <p className="text-xs text-steel">
                Key: <code className="bg-cream px-1.5 py-0.5 rounded">{item.key}</code> · Type: {item.content_type}
              </p>
            </div>
            <button
              onClick={() => handleSave(item)}
              disabled={saving === item.id}
              className="px-4 py-2 rounded-lg bg-navy text-white text-sm font-medium hover:bg-navy-light transition-colors disabled:opacity-50"
            >
              {saving === item.id ? 'Saving...' : saved === item.id ? 'Saved!' : 'Save'}
            </button>
          </div>
          {item.content_type === 'text' || item.content_type === 'image_url' ? (
            <input
              type="text"
              value={values[item.id] || ''}
              onChange={e => setValues(v => ({ ...v, [item.id]: e.target.value }))}
              className="w-full border border-cream rounded-lg px-4 py-2.5 text-navy-dark focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
            />
          ) : (
            <textarea
              value={values[item.id] || ''}
              onChange={e => setValues(v => ({ ...v, [item.id]: e.target.value }))}
              rows={6}
              className="w-full border border-cream rounded-lg px-4 py-2.5 text-navy-dark focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy resize-y"
            />
          )}
        </div>
      ))}
    </div>
  );
}
