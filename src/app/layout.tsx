import type { Metadata } from 'next';
import './globals.css';
import { PeridexProvider } from '@/context/PeridexContext';
import Navigation from '@/components/Navigation';

export const metadata: Metadata = {
  title: 'Peridex | Dual-VM BaaS for Portaldot Network V3.0',
  description:
    'Instant Indexed REST & GraphQL APIs, TypeScript SDK, and Model Context Protocol (MCP) server for Portaldot Network V3.0 EVM and ink! WASM contracts.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-white text-zinc-950 antialiased flex flex-col overflow-hidden">
        <PeridexProvider>
          <Navigation />
          <div className="flex-1 flex overflow-hidden">{children}</div>
        </PeridexProvider>
      </body>
    </html>
  );
}
