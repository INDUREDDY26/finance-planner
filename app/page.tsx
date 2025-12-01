'use client';

import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border bg-white px-6 py-8 shadow-sm space-y-5">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold">Finance Planner</h1>
          <p className="text-xs text-gray-600">
            Plan your savings & investments, and track upcoming expenses.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <button
            onClick={() => router.push('/signup')}
            className="w-full rounded-md bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            Sign up
          </button>

          <button
            onClick={() => router.push('/login')}
            className="w-full rounded-md border px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
          >
            Log in
          </button>

          <button
            onClick={() => router.push('/demo')}
            className="w-full rounded-md border px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Try demo (no account, not saved)
          </button>
        </div>

        <p className="text-[11px] text-center text-gray-400">
          Your personal data is only saved after you sign in.
        </p>
      </div>
    </main>
  );
}
