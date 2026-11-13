import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '../src/styles.css';

export const metadata: Metadata = {
  title: 'AVISHKAR 2K26 — Innovation Hackathon',
  description: 'IMAGINE. BUILD. INNOVATE. 25–26 November 2026 at BGS Seminar Hall, AIT, Chikkamagaluru.',
  applicationName: 'AVISHKAR 2K26',
};
export const viewport: Viewport = { themeColor: '#071935' };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en"><head><link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/><link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800;900&family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/></head><body>{children}</body></html>;
}
