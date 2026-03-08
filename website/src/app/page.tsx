import Link from 'next/link';
import { getChurchSettings, getUpcomingEvents, getPublicAnnouncements, getContentMap, getHeroImages } from '@/lib/data';
import HeroSection from '@/components/HeroSection';
import ServiceTimes from '@/components/ServiceTimes';
import SectionHeading from '@/components/SectionHeading';
import EventCard from '@/components/EventCard';
import AnnouncementCard from '@/components/AnnouncementCard';
import type { ServiceTime } from '@/types';

export const revalidate = 300;

export default async function HomePage() {
  const [settings, events, announcements, content, heroImages] = await Promise.all([
    getChurchSettings(),
    getUpcomingEvents(3),
    getPublicAnnouncements(3),
    getContentMap(),
    getHeroImages(),
  ]);

  const serviceTimes = (settings?.service_times ?? []) as ServiceTime[];

  return (
    <>
      <HeroSection
        title={content.hero_title || 'Welcome to Edna Baptist Church'}
        subtitle={content.hero_subtitle || 'A place of faith, fellowship, and community'}
        images={heroImages}
      />

      {/* Service Times */}
      {serviceTimes.length > 0 && (
        <section className="bg-cream py-16 sm:py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <SectionHeading title="Service Times" subtitle="Join us for worship and fellowship" />
            <ServiceTimes times={serviceTimes} />
          </div>
        </section>
      )}

      {/* Upcoming Events */}
      {events.length > 0 && (
        <section className="py-16 sm:py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <SectionHeading title="Upcoming Events" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map(event => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
            <div className="text-center mt-10">
              <Link
                href="/events"
                className="inline-flex items-center gap-2 text-navy font-semibold hover:text-navy-light transition-colors"
              >
                View All Events
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Latest Announcements */}
      {announcements.length > 0 && (
        <section className="bg-cream py-16 sm:py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <SectionHeading title="Latest Announcements" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {announcements.map(a => (
                <AnnouncementCard key={a.id} announcement={a} />
              ))}
            </div>
            <div className="text-center mt-10">
              <Link
                href="/announcements"
                className="inline-flex items-center gap-2 text-navy font-semibold hover:text-navy-light transition-colors"
              >
                View All Announcements
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl font-bold text-navy-dark">
            {content.home_cta_text || 'Join Us This Sunday'}
          </h2>
          <div className="w-16 h-1 bg-gold mx-auto mt-3 rounded-full" />
          <p className="text-steel mt-6 text-lg leading-relaxed">
            {content.home_cta_description || 'We would love to have you and your family worship with us. All are welcome!'}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center px-8 py-3.5 rounded-lg bg-navy text-white font-semibold hover:bg-navy-light transition-colors"
            >
              Plan Your Visit
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center justify-center px-8 py-3.5 rounded-lg border-2 border-navy text-navy font-semibold hover:bg-navy hover:text-white transition-colors"
            >
              Learn More About Us
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
