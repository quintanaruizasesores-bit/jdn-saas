import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { Providers } from './providers';
import './globals.css';

const inter = localFont({
  src: [
    { path: '../../public/fonts/inter-400.ttf', weight: '400' },
    { path: '../../public/fonts/inter-500.ttf', weight: '500' },
    { path: '../../public/fonts/inter-600.ttf', weight: '600' },
    { path: '../../public/fonts/inter-700.ttf', weight: '700' },
  ],
  variable: '--font-inter',
  display: 'swap',
});

const poppins = localFont({
  src: [
    { path: '../../public/fonts/poppins-500.ttf', weight: '500' },
    { path: '../../public/fonts/poppins-600.ttf', weight: '600' },
    { path: '../../public/fonts/poppins-700.ttf', weight: '700' },
  ],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Quintana Ruiz | Gestión de cartera',
  description: 'Gestión de cartera de Quintana Ruiz Asesores de Seguros',
  icons: {
    icon: '/brand/quintana-ruiz/favicon.png',
    apple: '/brand/quintana-ruiz/favicon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-AR" className={`${inter.variable} ${poppins.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
