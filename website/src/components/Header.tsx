import Link from 'next/link';
import Image from 'next/image';
import { getNavPages } from '@/lib/data';
import MobileNav from './MobileNav';

const STATIC_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/staff', label: 'Staff' },
  { href: '/events', label: 'Events' },
  { href: '/announcements', label: 'Announcements' },
  { href: '/contact', label: 'Contact' },
];

export default async function Header() {
  const navPages = await getNavPages();
  const dynamicLinks = navPages.map(p => ({ href: `/${p.slug}`, label: p.title }));
  const allLinks = [...STATIC_LINKS, ...dynamicLinks];

  return (
    <header className="bg-navy-dark text-white sticky top-0 z-50 shadow-lg">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <Image
              src="/images/ebc-icon-mark-color.png"
              alt="EBC"
              width={36}
              height={36}
              className="rounded-sm"
            />
            <span className="font-bold text-lg hidden sm:block">Edna Baptist Church</span>
            <span className="font-bold text-lg sm:hidden">EBC</span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {allLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-2 rounded-md text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <a
              href="https://connect.ednabaptist.church"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 px-4 py-1.5 rounded-md text-sm font-semibold bg-gold text-navy-dark hover:bg-gold/90 transition-colors"
            >
              EBC Connect
            </a>
          </nav>

          <MobileNav links={allLinks} connectUrl="https://connect.ednabaptist.church" />
        </div>
      </div>
    </header>
  );
}
