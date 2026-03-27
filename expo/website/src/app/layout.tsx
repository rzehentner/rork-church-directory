import type { Metadata } from 'next';
import Header from '@/components/Header';
import AdminBar from '@/components/AdminBar';
import Footer from '@/components/Footer';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Edna Baptist Church',
    template: '%s | Edna Baptist Church',
  },
  description: 'Welcome to Edna Baptist Church in Edna, Texas. A place of faith, fellowship, and community.',
  metadataBase: new URL('https://ednabaptist.church'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Edna Baptist Church',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col antialiased">
        <Header />
        <AdminBar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
