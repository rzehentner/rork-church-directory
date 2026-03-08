import Link from 'next/link';
import HeroSlideshow from './HeroSlideshow';

interface HeroSectionProps {
  title: string;
  subtitle: string;
  images?: string[];
}

export default function HeroSection({ title, subtitle, images = [] }: HeroSectionProps) {
  const hasImages = images.length > 0;

  return (
    <section
      className="relative py-24 sm:py-32 lg:py-40"
      style={hasImages ? undefined : { background: 'linear-gradient(135deg, #1A2744 0%, #2B4C7E 50%, #3E6BAF 100%)' }}
    >
      {hasImages ? (
        <HeroSlideshow images={images} />
      ) : (
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 25% 50%, rgba(212, 168, 67, 0.3) 0%, transparent 50%), radial-gradient(circle at 75% 50%, rgba(212, 168, 67, 0.15) 0%, transparent 50%)',
          }} />
        </div>
      )}

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight tracking-tight drop-shadow-lg">
          {title}
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed drop-shadow">
          {subtitle}
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/contact"
            className="inline-flex items-center justify-center px-8 py-3.5 rounded-lg bg-gold text-navy-dark font-semibold text-base hover:bg-gold/90 transition-colors shadow-lg"
          >
            Visit Us This Sunday
          </Link>
          <Link
            href="/events"
            className="inline-flex items-center justify-center px-8 py-3.5 rounded-lg bg-white/10 text-white font-semibold text-base hover:bg-white/20 transition-colors border border-white/20"
          >
            Upcoming Events
          </Link>
        </div>
      </div>
    </section>
  );
}
