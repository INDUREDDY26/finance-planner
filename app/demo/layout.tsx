'use client';

import type { ReactNode } from 'react';
import { DemoProvider } from '../../components/demo/DemoContext';

export default function DemoLayout({ children }: { children: ReactNode }) {
  // Only provide demo context; DO NOT render any header here.
  return <DemoProvider>{children}</DemoProvider>;
}
