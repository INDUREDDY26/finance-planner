'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

type AppHeaderProps = {
  email?: string | null;
};

const navItems = [
  { href: '/app', label: 'Dashboard' },
  { href: '/app/accounts', label: 'Accounts' },
  { href: '/app/expenses', label: 'Expenses' },
  { href: '/demo', label: 'Demo' },
];

export default function AppHeader({ email }: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) =>
    href === '/app' ? pathname === '/app' : pathname.startsWith(href);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setMenuOpen(false);
    router.replace('/');
  };

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
    </nav>
  );

  return (
    <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        {/* Brand + email */}
        <div className="min-w-0">
          <div className="text-sm font-semibold">Finance Planner</div>
          {email && (
            <div className="truncate text-xs text-neutral-500">
              Logged in as {email}
            </div>
          )}
        </div>

        {/* Desktop nav */}
        <div className="hidden items-center gap-3 sm:flex">
          <NavLinks />
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-full bg-black px-4 py-1.5 text-sm font-medium text-white"
          >
            Sign out
          </button>
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
            <button
              type="button"
              onClick={handleSignOut}
              className="mt-1 rounded-full bg-black px-4 py-2 text-sm font-medium text-white"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
