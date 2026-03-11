import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getEvent, getUpcomingEvents } from '@/lib/data';
import { storageUrl, formatEventDate } from '@/lib/utils';

const SITE_URL = 'https://ednabaptist.church';

export const revalidate = 600;

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) return { title: 'Event Not Found' };

  const description = event.description?.substring(0, 160) || 'Event at Edna Baptist Church';
  const imageUrl = storageUrl(event.image_path);

  return {
    title: event.title,
    description,
    openGraph: {
      title: event.title,
      description,
      type: 'article',
      url: `${SITE_URL}/events/${id}`,
      ...(imageUrl && {
        images: [{ url: imageUrl, width: 1200, height: 630, alt: event.title }],
      }),
    },
    twitter: {
      card: imageUrl ? 'summary_large_image' : 'summary',
      title: event.title,
      description,
      ...(imageUrl && { images: [imageUrl] }),
    },
  };
}

export async function generateStaticParams() {
  const events = await getUpcomingEvents(50);
  return events.map(e => ({ id: e.id }));
}

export default async function EventDetailPage({ params }: Props) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) notFound();

  const imageUrl = storageUrl(event.image_path);
  const dateDisplay = formatEventDate(event.start_at, event.end_at, event.is_all_day);

  return (
    <>
      {/* Hero Image */}
      <div className="relative h-64 sm:h-80 lg:h-96 bg-navy-dark">
        {imageUrl ? (
          <Image src={imageUrl} alt={event.title} fill className="object-cover" priority />
        ) : (
          <div className="h-full" style={{ background: 'linear-gradient(135deg, #1A2744 0%, #2B4C7E 50%, #3E6BAF 100%)' }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">{event.title}</h1>
          </div>
        </div>
      </div>

      <section className="py-10 sm:py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <Link
            href="/events"
            className="inline-flex items-center gap-1 text-sm text-steel hover:text-navy transition-colors mb-8"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Events
          </Link>

          {/* Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            <div className="bg-cream rounded-xl p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-navy/10 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold text-steel uppercase tracking-wider">When</p>
                <p className="text-navy-dark font-medium mt-0.5">{dateDisplay}</p>
              </div>
            </div>

            {event.location && (
              <div className="bg-cream rounded-xl p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-navy/10 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-steel uppercase tracking-wider">Where</p>
                  <p className="text-navy-dark font-medium mt-0.5">{event.location}</p>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {event.description && (
            <div>
              <h2 className="text-xl font-bold text-navy-dark mb-4">About This Event</h2>
              <div className="text-navy-dark/70 leading-relaxed whitespace-pre-wrap">
                {event.description}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
