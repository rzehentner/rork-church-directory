import type { Metadata } from 'next';
import { getPublicAnnouncements } from '@/lib/data';
import AnnouncementCard from '@/components/AnnouncementCard';

export const metadata: Metadata = { title: 'Announcements' };
export const revalidate = 300;

export default async function AnnouncementsPage() {
  const announcements = await getPublicAnnouncements(50);

  return (
    <>
      <section
        className="py-16 sm:py-20 text-center"
        style={{ background: 'linear-gradient(135deg, #1A2744 0%, #2B4C7E 100%)' }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h1 className="text-4xl sm:text-5xl font-bold text-white">Announcements</h1>
          <div className="w-16 h-1 bg-gold mx-auto mt-4 rounded-full" />
          <p className="text-white/70 mt-4 text-lg">Stay up to date with our church community</p>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {announcements.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {announcements.map(a => (
                <AnnouncementCard key={a.id} announcement={a} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <svg className="w-16 h-16 mx-auto text-cream" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
              <p className="text-steel mt-4 text-lg">No announcements at this time.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
