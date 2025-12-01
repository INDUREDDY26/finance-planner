'use client';

import Link from 'next/link';
import { useState } from 'react';

type DemoHeaderProps = {
  active?: 'home' | 'accounts' | 'expenses';
};

const navItems = [
  { key: 'home', label: 'Demo home', href: '/demo' },
  { key: 'accounts', label: 'Demo accounts', href: '/demo/accounts' },
  { key: 'expenses', label: 'Demo expenses', href: '/demo/expenses' },
];

export default function DemoHeader({ active = 'home' }: DemoHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3">
        {/* Brand + tagline */}
        <div className="min-w-0">
          <div className="text-sm font-semibold tracking-tight">
            Finance Planner — Demo
          </div>
          <div className="mt-0.5 truncate text-xs text-gray-500">
            Play with sample data. Changes reset when you leave demo.
          </div>
        </div>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-2 sm:flex">
          {navItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`rounded-full border px-4 py-1.5 text-xs font-medium transition ${
                active === item.key
                  ? 'border-black bg-black text-white'
                  : 'border-gray-300 bg-white text-gray-800 hover:border-gray-400'
              }`}
            >
              {item.label}
            </Link>
          ))}

          {/* ONLY exit from demo -> real app */}
          <Link
            href="/login"
            className="rounded-full bg-black px-4 py-1.5 text-xs font-medium text-white hover:bg-gray-900"
          >
            Sign up / Log in
          </Link>
        </nav>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 sm:hidden"
          aria-label="Toggle navigation"
        >
          <span className="flex flex-col gap-1.5">
            <span className="block h-[2px] w-4 rounded bg-gray-800" />
            <span className="block h-[2px] w-4 rounded bg-gray-800" />
          </span>
        </button>
      </div>

      {/* Mobile nav dropdown */}
      {menuOpen && (
        <nav className="border-t border-gray-200 bg-white px-4 pb-3 pt-2 sm:hidden">
          <div className="flex flex-col gap-2">
            {navItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  active === item.key
                    ? 'border-black bg-black text-white'
                    : 'border-gray-300 bg-white text-gray-800 hover:border-gray-400'
                }`}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}

            <Link
              href="/login"
              className="rounded-full bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-900"
              onClick={() => setMenuOpen(false)}
            >
              Sign up / Log in
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
