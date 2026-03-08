import type { Metadata } from 'next';
import { getChurchSettings } from '@/lib/data';
import SectionHeading from '@/components/SectionHeading';
import MapEmbed from '@/components/MapEmbed';

export const metadata: Metadata = { title: 'Contact' };
export const revalidate = 3600;

export default async function ContactPage() {
  const settings = await getChurchSettings();
  const address = [
    settings?.address_street,
    settings?.address_city,
    settings?.address_state,
    settings?.address_zip,
  ].filter(Boolean).join(', ');

  return (
    <>
      <section
        className="py-16 sm:py-20 text-center"
        style={{ background: 'linear-gradient(135deg, #1A2744 0%, #2B4C7E 100%)' }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h1 className="text-4xl sm:text-5xl font-bold text-white">Contact Us</h1>
          <div className="w-16 h-1 bg-gold mx-auto mt-4 rounded-full" />
          <p className="text-white/70 mt-4 text-lg">We would love to hear from you</p>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Contact Info */}
            <div>
              <SectionHeading title="Get In Touch" />
              <div className="space-y-6">
                {address && (
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-navy/10 flex items-center justify-center shrink-0">
                      <svg className="w-6 h-6 text-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-navy-dark">Address</h3>
                      <p className="text-steel mt-1">{address}</p>
                    </div>
                  </div>
                )}

                {settings?.phone && (
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-navy/10 flex items-center justify-center shrink-0">
                      <svg className="w-6 h-6 text-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-navy-dark">Phone</h3>
                      <a href={`tel:${settings.phone}`} className="text-navy hover:text-navy-light transition-colors mt-1 block">
                        {settings.phone}
                      </a>
                    </div>
                  </div>
                )}

                {settings?.email && (
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-navy/10 flex items-center justify-center shrink-0">
                      <svg className="w-6 h-6 text-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-navy-dark">Email</h3>
                      <a href={`mailto:${settings.email}`} className="text-navy hover:text-navy-light transition-colors mt-1 block">
                        {settings.email}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Map */}
            <div>
              <SectionHeading title="Find Us" />
              <MapEmbed address={address} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
