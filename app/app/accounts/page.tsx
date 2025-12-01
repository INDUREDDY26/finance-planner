'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import AppHeader from '@/components/AppHeader';
import AccountsSection from '@/components/AccountsSection';

export default function PersonalAccountsPage() {
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
          <p className="text-sm text-slate-500">Loading your accounts…</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader email={user.email} />
      <main className="mx-auto max-w-5xl px-4 pb-10 pt-6">
        <h1 className="mb-4 text-xl font-semibold">Accounts</h1>
        <p className="mb-6 text-sm text-slate-600">
          Add savings, investment, and goal accounts. Then link expenses so you can see how much is
          really left after upcoming bills.
        </p>

        <AccountsSection user={user} />
      </main>
    </div>
  );
}
