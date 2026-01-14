import type { Metadata } from 'next';
import { Geist, DM_Mono } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const dmMono = DM_Mono({
  variable: '--font-dm-mono',
  subsets: ['latin'],
  weight: ['300', '400', '500'],
});

export const metadata: Metadata = {
  title: 'Arc Invoice',
  description: 'Payment link generator with escrow protection on Arc blockchain',
  metadataBase: new URL('https://arcinvoice.org'),
  openGraph: {
    title: 'Arc Invoice',
    description: 'Create payment links with built-in escrow protection. Get paid securely on Arc blockchain.',
    url: 'https://arcinvoice.org',
    siteName: 'Arc Invoice',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Arc Invoice - Secure Payment Links',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Arc Invoice',
    description: 'Create payment links with built-in escrow protection. Get paid securely on Arc blockchain.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${dmMono.variable} antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
