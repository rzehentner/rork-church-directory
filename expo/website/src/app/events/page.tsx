import type { Metadata } from 'next';
import { getUpcomingEvents } from '@/lib/data';
import EventCard from '@/components/EventCard';

export const metadata: Metadata = { title: 'Events' };
export const revalidate = 300;

export default async function EventsPage() {
  const events = await getUpcomingEvents(50);

  return (
    <>
      <section
        className="py-16 sm:py-20 text-center"
        style={{ background: 'linear-gradient(135deg, #1A2744 0%, #2B4C7E 100%)' }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h1 className="text-4xl sm:text-5xl font-bold text-white">Upcoming Events</h1>
          <div className="w-16 h-1 bg-gold mx-auto mt-4 rounded-full" />
          <p className="text-white/70 mt-4 text-lg">Join us for worship, fellowship, and community</p>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {events.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map(event => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <svg className="w-16 h-16 mx-auto text-cream" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-steel mt-4 text-lg">No upcoming events at this time.</p>
              <p className="text-steel/60 mt-1">Check back soon for new events!</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
