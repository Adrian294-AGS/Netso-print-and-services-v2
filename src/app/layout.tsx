import React from 'react';
import './globals.css';

export const metadata = {
  title: 'NETSO Prints & Ads — Admin & Customer Portal',
  description:
    'Unified Admin and Customer Portal for NETSO Prints & Ads featuring print order management, GCash payment tracking, customer directory, real-time request messaging, and user activity logs.',
  openGraph: {
    title: 'NETSO Prints & Ads — Admin & Customer Portal',
    description:
      'Unified Admin and Customer Portal for NETSO Prints & Ads featuring print order management, GCash payment tracking, customer directory, real-time request messaging, and user activity logs.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;600;700;800&family=Lexend:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#0D0D0E] text-[#F4F4F5] antialiased selection:bg-[#D4A017] selection:text-black">
        {children}
      </body>
    </html>
  );
}