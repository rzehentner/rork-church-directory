import Link from 'next/link';
import Image from 'next/image';
import type { PublicEvent } from '@/types';
import { storageUrl, formatEventDate, formatShortDate } from '@/lib/utils';

interface EventCardProps {
  event: PublicEvent;
}

export default function EventCard({ event }: EventCardProps) {
  const imageUrl = storageUrl(event.image_path);
  const { month, day } = formatShortDate(event.start_at);
  const dateDisplay = formatEventDate(event.start_at, event.end_at, event.is_all_day);

  return (
    <Link href={`/events/${event.id}`} className="group block">
      <article className="bg-white rounded-xl overflow-hidden border border-cream shadow-sm hover:shadow-lg transition-all duration-200">
        <div className="relative h-48 bg-cream">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={event.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="flex items-center justify-center h-full" style={{ background: 'linear-gradient(135deg, #2B4C7E 0%, #3E6BAF 100%)' }}>
              <svg className="w-12 h-12 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          <div className="absolute top-3 left-3 bg-white rounded-lg shadow-md px-3 py-1.5 text-center">
            <p className="text-xs font-bold text-gold leading-none">{month}</p>
            <p className="text-lg font-bold text-navy-dark leading-none mt-0.5">{day}</p>
          </div>
        </div>

        <div className="p-5">
          <h3 className="font-bold text-navy-dark text-lg group-hover:text-navy-light transition-colors line-clamp-2">
            {event.title}
          </h3>
          <p className="text-steel text-sm mt-2 flex items-center gap-1.5">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {dateDisplay}
          </p>
          {event.location && (
            <p className="text-steel text-sm mt-1 flex items-center gap-1.5">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="truncate">{event.location}</span>
            </p>
          )}
          {event.description && (
            <p className="text-navy-dark/60 text-sm mt-3 line-clamp-2">{event.description}</p>
          )}
        </div>
      </article>
    </Link>
  );
}
