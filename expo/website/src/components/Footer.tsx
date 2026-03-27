import Link from 'next/link';
import Image from 'next/image';
import { getChurchSettings, getContentMap } from '@/lib/data';

export default async function Footer() {
  const [settings, content] = await Promise.all([
    getChurchSettings(),
    getContentMap(),
  ]);

  const tagline = content.footer_tagline || '';
  const appStoreUrl = content.app_store_url || '';
  const googlePlayUrl = content.google_play_url || '';
  const address = [
    settings?.address_street,
    settings?.address_city,
    settings?.address_state,
    settings?.address_zip,
  ].filter(Boolean).join(', ');

  return (
    <footer className="bg-navy-dark text-white/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Branding */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Image
                src="/images/ebc-logo-stacked-white.png"
                alt="Edna Baptist Church"
                width={48}
                height={48}
              />
              <div>
                <h3 className="font-bold text-white text-lg">Edna Baptist Church</h3>
                {tagline && <p className="text-sm text-white/60">{tagline}</p>}
              </div>
            </div>
            {address && <p className="text-sm mt-2">{address}</p>}
            {settings?.phone && <p className="text-sm mt-1">{settings.phone}</p>}
            {settings?.email && (
              <a href={`mailto:${settings.email}`} className="text-sm text-gold hover:underline mt-1 block">
                {settings.email}
              </a>
            )}
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-white mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="hover:text-gold transition-colors">About</Link></li>
              <li><Link href="/staff" className="hover:text-gold transition-colors">Staff</Link></li>
              <li><Link href="/events" className="hover:text-gold transition-colors">Events</Link></li>
              <li><Link href="/announcements" className="hover:text-gold transition-colors">Announcements</Link></li>
              <li><Link href="/contact" className="hover:text-gold transition-colors">Contact</Link></li>
              <li><Link href="/privacy-policy" className="hover:text-gold transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>

          {/* Download the App */}
          {(appStoreUrl || googlePlayUrl) && (
            <div>
              <h4 className="font-semibold text-white mb-4">Get the App</h4>
              <p className="text-sm mb-4">
                Stay connected with our church community. Download EBC Connect for event updates, prayer requests, and more.
              </p>
              <div className="flex flex-col gap-2">
                {appStoreUrl && (
                  <a
                    href={appStoreUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-lg px-4 py-2.5 transition-colors text-sm"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 21.99 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 21.99C7.79 22.03 6.8 20.68 5.96 19.47C4.25 16.99 2.97 12.5 4.7 9.45C5.56 7.93 7.13 6.95 8.82 6.93C10.1 6.91 11.32 7.8 12.12 7.8C12.91 7.8 14.39 6.73 15.91 6.89C16.55 6.92 18.33 7.15 19.48 8.8C19.38 8.87 17.08 10.23 17.11 13.04C17.14 16.39 20.01 17.5 20.04 17.51C20.01 17.59 19.56 19.12 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z"/></svg>
                    App Store
                  </a>
                )}
                {googlePlayUrl && (
                  <a
                    href={googlePlayUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-lg px-4 py-2.5 transition-colors text-sm"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.61 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/></svg>
                    Google Play
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-white/10 mt-8 pt-6 text-center text-sm text-white/40">
          <p>&copy; {new Date().getFullYear()} Edna Baptist Church. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
