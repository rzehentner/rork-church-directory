'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { createAdminClient } from '@/lib/supabase-admin';

interface HeroImageRow {
  id: string;
  image_path: string;
  alt_text: string | null;
  sort_order: number;
  is_active: boolean;
}

const BUCKET = 'website-images';

export default function AdminHeroPage() {
  const supabaseRef = useRef(createAdminClient());
  const [images, setImages] = useState<HeroImageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  useEffect(() => {
    loadImages();
  }, []);

  async function loadImages() {
    const { data } = await supabaseRef.current
      .from('hero_images')
      .select('*')
      .order('sort_order', { ascending: true });
    setImages((data ?? []) as HeroImageRow[]);
    setLoading(false);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError('');

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;

      const ext = file.name.split('.').pop() || 'jpg';
      const path = `hero/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: uploadErr } = await supabaseRef.current.storage
        .from(BUCKET)
        .upload(path, file, { cacheControl: '31536000', upsert: false });

      if (uploadErr) {
        setError(`Upload failed: ${uploadErr.message}`);
        continue;
      }

      const nextOrder = images.length > 0
        ? Math.max(...images.map(i => i.sort_order)) + 1
        : 0;

      const { error: insertErr } = await supabaseRef.current
        .from('hero_images')
        .insert({ image_path: path, sort_order: nextOrder, is_active: true });

      if (insertErr) {
        setError(`Save failed: ${insertErr.message}`);
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
    await loadImages();
    setUploading(false);
  }

  async function handleDelete(image: HeroImageRow) {
    if (!confirm('Delete this image?')) return;

    await supabaseRef.current.storage.from(BUCKET).remove([image.image_path]);
    await supabaseRef.current.from('hero_images').delete().eq('id', image.id);
    setImages(prev => prev.filter(i => i.id !== image.id));
  }

  async function handleToggle(image: HeroImageRow) {
    await supabaseRef.current
      .from('hero_images')
      .update({ is_active: !image.is_active })
      .eq('id', image.id);
    setImages(prev =>
      prev.map(i => (i.id === image.id ? { ...i, is_active: !i.is_active } : i))
    );
  }

  async function handleMove(image: HeroImageRow, direction: 'up' | 'down') {
    const idx = images.findIndex(i => i.id === image.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= images.length) return;

    const other = images[swapIdx];
    await Promise.all([
      supabaseRef.current.from('hero_images').update({ sort_order: other.sort_order }).eq('id', image.id),
      supabaseRef.current.from('hero_images').update({ sort_order: image.sort_order }).eq('id', other.id),
    ]);

    const updated = [...images];
    updated[idx] = { ...image, sort_order: other.sort_order };
    updated[swapIdx] = { ...other, sort_order: image.sort_order };
    updated.sort((a, b) => a.sort_order - b.sort_order);
    setImages(updated);
  }

  function imageUrl(path: string) {
    return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${path}`;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-dark">Hero Slideshow</h1>
          <p className="text-sm text-steel mt-1">
            Upload photos that cycle behind the hero text on the homepage.
          </p>
        </div>
        <label className="px-4 py-2 rounded-lg bg-navy text-white text-sm font-medium hover:bg-navy-light transition-colors cursor-pointer">
          {uploading ? 'Uploading...' : '+ Upload Photos'}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-steel text-sm">Loading...</div>
      ) : images.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-cream">
          <svg className="w-16 h-16 mx-auto text-cream" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-steel mt-4">No hero images yet.</p>
          <p className="text-steel/60 text-sm mt-1">Upload photos to create a slideshow on the homepage.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {images.map((image, idx) => (
            <div
              key={image.id}
              className={`flex items-center gap-4 bg-white rounded-xl border p-4 ${
                image.is_active ? 'border-cream' : 'border-cream opacity-50'
              }`}
            >
              <div className="relative w-32 h-20 rounded-lg overflow-hidden shrink-0 bg-cream">
                <Image
                  src={imageUrl(image.image_path)}
                  alt={image.alt_text || 'Hero image'}
                  fill
                  className="object-cover"
                  sizes="128px"
                />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm text-navy-dark font-medium truncate">
                  {image.image_path.split('/').pop()}
                </p>
                <p className="text-xs text-steel mt-0.5">
                  Position {idx + 1} · {image.is_active ? 'Active' : 'Hidden'}
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleMove(image, 'up')}
                  disabled={idx === 0}
                  className="p-1.5 rounded hover:bg-cream disabled:opacity-30 transition-colors"
                  title="Move up"
                >
                  <svg className="w-4 h-4 text-navy-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => handleMove(image, 'down')}
                  disabled={idx === images.length - 1}
                  className="p-1.5 rounded hover:bg-cream disabled:opacity-30 transition-colors"
                  title="Move down"
                >
                  <svg className="w-4 h-4 text-navy-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => handleToggle(image)}
                  className="p-1.5 rounded hover:bg-cream transition-colors"
                  title={image.is_active ? 'Hide' : 'Show'}
                >
                  {image.is_active ? (
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-steel" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => handleDelete(image)}
                  className="p-1.5 rounded hover:bg-red-50 transition-colors"
                  title="Delete"
                >
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 bg-cream/50 rounded-xl p-4 text-sm text-steel">
        <strong className="text-navy-dark">Tips:</strong> Use high-quality, landscape-oriented photos (at least 1920x800px).
        Photos will be displayed full-width behind the hero text with a dark overlay for readability.
        3-6 images work best — they cycle every 6 seconds.
      </div>
    </div>
  );
}
