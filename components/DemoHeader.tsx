'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const navItems = [
  { href: '/demo', label: 'Demo home' },
  { href: '/demo/accounts', label: 'Demo accounts' },
  { href: '/demo/expenses', label: 'Demo expenses' },
];

export default function DemoHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) =>
    href === '/demo' ? pathname === '/demo' : pathname.startsWith(href);

  const NavLinks = ({ vertical = false }: { vertical?: boolean }) => (
    <nav className={vertical ? 'flex flex-col gap-2' : 'flex items-center gap-2'}>
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setMenuOpen(false)}
          className={`rounded-full border px-3 py-1 text-sm font-medium whitespace-nowrap ${
            isActive(item.href)
              ? 'bg-black text-white border-black'
              : 'bg-white text-black border-neutral-300'
          }`}
        >
          {item.label}
        </Link>
      ))}
      <Link
        href="/login"
        onClick={() => setMenuOpen(false)}
        className="rounded-full bg-black px-4 py-1.5 text-sm font-medium text-white whitespace-nowrap"
      >
        Sign up / Log in
      </Link>
    </nav>
  );

  return (
    <header className="border-b bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        {/* Demo branding / description */}
        <div className="min-w-0">
          <div className="text-sm font-semibold">Finance Planner — Demo</div>
          <p className="mt-0.5 text-xs text-neutral-500">
            Play with sample data. Changes reset when you leave demo.
          </p>
        </div>

        {/* Desktop nav */}
        <div className="hidden sm:flex">
          <NavLinks />
        </div>

        {/* Mobile hamburger button */}
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300 sm:hidden"
          aria-label="Toggle navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="sr-only">Toggle navigation</span>
          <div className="space-y-1">
            <span className="block h-0.5 w-4 bg-black" />
            <span className="block h-0.5 w-4 bg-black" />
            <span className="block h-0.5 w-4 bg-black" />
          </div>
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="border-t bg-white sm:hidden">
          <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:px-6">
            <NavLinks vertical />
          </div>
        </div>
      )}
    </header>
  );
}
