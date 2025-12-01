'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import AppHeader from '@/components/AppHeader';
import ExpensesSection from '@/components/ExpensesSection';

export default function PersonalExpensesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    async function getUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/login');
      } else {
        setUser(user);
        setLoadingUser(false);
      }
    }

    getUser();
  }, [router]);

  if (loadingUser || !user) {
    return (
      <div className="min-h-screen bg-slate-50">
        <AppHeader />
        <main className="mx-auto max-w-5xl px-4 pb-10 pt-6">
          <p className="text-sm text-slate-500">Loading your expenses…</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader email={user.email} />
      <main className="mx-auto max-w-5xl px-4 pb-10 pt-6">
        <h1 className="mb-4 text-xl font-semibold">Expenses</h1>
        <p className="mb-6 text-sm text-slate-600">
          Add trips, bills, and other costs and link them to your accounts. Recurring expenses
          repeat every month and are checked so your account never hits zero.
        </p>

        <ExpensesSection user={user} />
      </main>
    </div>
  );
}
