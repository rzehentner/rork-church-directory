import type { MetadataRoute } from 'next';
import { createPublicClient } from '@/lib/supabase';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createPublicClient();

  const [events, pages] = await Promise.all([
    supabase.from('events').select('id, updated_at').eq('is_public', true).eq('is_archived', false),
    supabase.from('website_pages').select('slug, updated_at').eq('is_published', true),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: 'https://ednabaptist.church', lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: 'https://ednabaptist.church/about', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: 'https://ednabaptist.church/events', lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: 'https://ednabaptist.church/announcements', lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: 'https://ednabaptist.church/contact', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: 'https://ednabaptist.church/privacy-policy', lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ];

  const eventPages: MetadataRoute.Sitemap = (events.data ?? []).map(e => ({
    url: `https://ednabaptist.church/events/${e.id}`,
    lastModified: new Date(e.updated_at),
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  const customPages: MetadataRoute.Sitemap = (pages.data ?? []).map(p => ({
    url: `https://ednabaptist.church/${p.slug}`,
    lastModified: new Date(p.updated_at),
    changeFrequency: 'monthly',
    priority: 0.5,
  }));

  return [...staticPages, ...eventPages, ...customPages];
}
