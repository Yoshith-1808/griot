import './globals.css';
import type { Metadata } from 'next';
import type React from 'react';

export const metadata: Metadata = {
  title: 'Griot — Conversational Memory Layer for Alexa+',
  description:
    'Self-hosted MCP server with persistent voice-first episodic memory powered by AWS Bedrock.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen bg-[#080c14] text-slate-100 flex flex-col">
        {children}
      </body>
    </html>
  );
}
