import type { Metadata } from 'next';
import { getChurchSettings, getContentMap } from '@/lib/data';
import SectionHeading from '@/components/SectionHeading';
import ServiceTimes from '@/components/ServiceTimes';
import { renderMarkdown } from '@/lib/utils';
import type { ServiceTime } from '@/types';

export const metadata: Metadata = { title: 'About' };
export const revalidate = 3600;

export default async function AboutPage() {
  const [settings, content] = await Promise.all([
    getChurchSettings(),
    getContentMap(),
  ]);

  const serviceTimes = (settings?.service_times ?? []) as ServiceTime[];
  const aboutText = content.about_text || '';
  const mission = content.mission_statement || '';
  const pastorBio = content.pastor_bio || '';

  return (
    <>
      {/* Header */}
      <section
        className="py-16 sm:py-20 text-center"
        style={{ background: 'linear-gradient(135deg, #1A2744 0%, #2B4C7E 100%)' }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h1 className="text-4xl sm:text-5xl font-bold text-white">About Our Church</h1>
          <div className="w-16 h-1 bg-gold mx-auto mt-4 rounded-full" />
        </div>
      </section>

      {/* Mission */}
      {mission && (
        <section className="bg-cream py-16">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <p className="text-sm font-bold text-gold uppercase tracking-wider mb-3">Our Mission</p>
            <p className="text-2xl sm:text-3xl font-serif text-navy-dark italic leading-relaxed">
              &ldquo;{mission}&rdquo;
            </p>
          </div>
        </section>
      )}

      {/* About */}
      {aboutText && (
        <section className="py-16">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <SectionHeading title="Who We Are" />
            <div
              className="prose prose-lg max-w-none text-navy-dark/80"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(aboutText) }}
            />
          </div>
        </section>
      )}

      {/* Pastor */}
      {pastorBio && (
        <section className="bg-cream py-16">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <SectionHeading
              title="Our Pastor"
            />
            <div
              className="prose prose-lg max-w-none text-navy-dark/80"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(pastorBio) }}
            />
          </div>
        </section>
      )}

      {/* Service Times */}
      {serviceTimes.length > 0 && (
        <section className="py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <SectionHeading title="Service Times" />
            <ServiceTimes times={serviceTimes} />
          </div>
        </section>
      )}
    </>
  );
}
