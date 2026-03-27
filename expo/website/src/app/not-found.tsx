import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center px-4">
        <h1 className="text-6xl font-bold text-navy-dark">404</h1>
        <div className="w-16 h-1 bg-gold mx-auto mt-3 rounded-full" />
        <p className="text-steel text-lg mt-6">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-navy text-white font-semibold hover:bg-navy-light transition-colors mt-8"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
