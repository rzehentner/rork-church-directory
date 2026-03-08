import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPageBySlug, getNavPages } from '@/lib/data';
import { renderMarkdown } from '@/lib/utils';

export const revalidate = 3600;

const RESERVED_SLUGS = ['about', 'events', 'announcements', 'contact', 'privacy-policy', 'admin'];

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (RESERVED_SLUGS.includes(slug)) return {};
  const page = await getPageBySlug(slug);
  if (!page) return { title: 'Page Not Found' };
  return {
    title: page.title,
    description: page.meta_description || undefined,
  };
}

export async function generateStaticParams() {
  const pages = await getNavPages();
  return pages
    .filter(p => !RESERVED_SLUGS.includes(p.slug))
    .map(p => ({ slug: p.slug }));
}

export default async function CustomPage({ params }: Props) {
  const { slug } = await params;
  if (RESERVED_SLUGS.includes(slug)) notFound();

  const page = await getPageBySlug(slug);
  if (!page) notFound();

  return (
    <>
      <section
        className="py-16 sm:py-20 text-center"
        style={{ background: 'linear-gradient(135deg, #1A2744 0%, #2B4C7E 100%)' }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h1 className="text-4xl sm:text-5xl font-bold text-white">{page.title}</h1>
          <div className="w-16 h-1 bg-gold mx-auto mt-4 rounded-full" />
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div
            className="prose prose-lg max-w-none text-navy-dark/80"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(page.body) }}
          />
        </div>
      </section>
    </>
  );
}
