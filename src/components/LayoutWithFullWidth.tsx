'use client';

import { ReactNode } from 'react';

interface LayoutWithFullWidthProps {
  children: ReactNode;
}

export default function LayoutWithFullWidth({ children }: LayoutWithFullWidthProps) {
  return (
    <div className="flex-1 flex flex-col">
      {/* Main content - full width, below header */}
      <main className="flex-1 transition-all duration-300">
        <div className="container mx-auto px-6 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}