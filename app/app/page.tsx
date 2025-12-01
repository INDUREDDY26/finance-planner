'use client';

import { useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import AppHeader from '@/components/AppHeader';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

type Account = {
  id: string;
  name: string;
  start_date: string | null;
  initial_amount: number;
  monthly_contribution: number | null;
  annual_return_rate: number | null;
  reinvest_dividends: boolean | null;
};

type Expense = {
  id: string;
  name: string;
  amount: number;
  due_date: string;
  account_id: string | null;
  is_recurring: boolean | null;
};

type AccountStat = {
  id: string;
  name: string;
  current: number;
  upcoming: number;
  netAfter: number;
};

const PIE_COLORS = ['#0f766e', '#1d4ed8', '#7c3aed', '#ea580c', '#15803d', '#b91c1c'];

function monthsBetween(start: Date, end: Date) {
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
}

function computeAccountStatsForDashboard(
  accounts: Account[],
  expenses: Expense[],
  today: Date
): AccountStat[] {
  const byAccount = new Map<string, Expense[]>();
  for (const e of expenses) {
    if (!e.account_id) continue;
    if (!byAccount.has(e.account_id)) byAccount.set(e.account_id, []);
    byAccount.get(e.account_id)!.push(e);
  }

  return accounts.map((account) => {
    const related = byAccount.get(account.id) ?? [];
    const start = account.start_date ? new Date(account.start_date) : today;
    const months = Math.max(0, monthsBetween(start, today));
    const monthly = account.monthly_contribution ?? 0;

    let current =
      account.initial_amount +
      monthly * months;

    let upcoming = 0;

    for (const e of related) {
      const firstDue = new Date(e.due_date);
      if (firstDue <= today) {
        // past and today
        if (e.is_recurring) {
          const n = monthsBetween(firstDue, today) + 1;
          current -= e.amount * n;
        } else {
          current -= e.amount;
        }
      } else {
        // future — for dashboard overview we just count one upcoming occurrence
        upcoming += e.amount;
      }
    }

    const netAfter = current - upcoming;

    return {
      id: account.id,
      name: account.name,
      current,
      upcoming,
      netAfter,
    };
  });
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/login');
        return;
      }

      setUser(user);

      const [
        { data: accountRows, error: accountError },
        { data: expenseRows, error: expenseError },
      ] = await Promise.all([
        supabase
          .from('accounts')
          .select(
            'id, name, start_date, initial_amount, monthly_contribution, annual_return_rate, reinvest_dividends'
          )
          .eq('user_id', user.id)
          .order('start_date', { ascending: true }),
        supabase
          .from('expenses')
          .select('id, name, amount, due_date, account_id, is_recurring')
          .eq('user_id', user.id)
          .order('due_date', { ascending: true }),
      ]);

      if (accountError) {
        console.error('Error loading accounts', accountError);
      } else if (accountRows) {
        setAccounts(accountRows as Account[]);
      }

      if (expenseError) {
        console.error('Error loading expenses', expenseError);
      } else if (expenseRows) {
        setExpenses(expenseRows as Expense[]);
      }

      setLoading(false);
    }

    load();
  }, [router]);

  const today = new Date();

  const accountStats = useMemo(
    () => computeAccountStatsForDashboard(accounts, expenses, today),
    [accounts, expenses]
  );

  const totalCurrent = accountStats.reduce((sum, a) => sum + a.current, 0);
  const totalUpcoming = accountStats.reduce((sum, a) => sum + a.upcoming, 0);
  const netAfter = totalCurrent - totalUpcoming;

  const pieData = accountStats
    .filter((a) => a.current > 0.01)
    .map((a) => ({
      name: a.name,
      value: Number(a.current.toFixed(2)),
    }));

  const upcomingExpenses = useMemo(() => {
    const now = new Date();
    return expenses
      .filter((e) => new Date(e.due_date) >= now)
  }, [expenses]);

  if (!user && loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <AppHeader />
        <main className="mx-auto max-w-5xl px-4 pb-10 pt-6">
          <p className="text-sm text-slate-500">Loading dashboard…</p>
        </main>
      </div>
    );
  }

  if (!user) {
    // just in case, but normally we already redirected
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader email={user.email} />
      <main className="mx-auto max-w-5xl px-4 pb-10 pt-6">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold">Dashboard</h1>
            <p className="text-sm text-slate-600">
              Overview of your accounts, upcoming expenses, and net position.
            </p>
          </div>

          <div className="flex gap-2 text-xs text-slate-500">
            <span>Today: {today.toLocaleDateString()}</span>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading dashboard…</p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr),minmax(0,1.4fr)]">
            {/* Accounts overview */}
            <section className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Accounts overview
                  </h2>
                  <p className="text-xs text-slate-500">
                    Your current balances by account and how upcoming expenses affect them.
                  </p>
                </div>
                <Link
                  href="/app/accounts"
                  className="text-xs font-medium text-slate-700 underline underline-offset-2"
                >
                  Manage accounts
                </Link>
              </div>

              {accounts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  No accounts yet.{" "}
                  <Link
                    href="/app/accounts"
                    className="font-medium text-slate-800 underline underline-offset-2"
                  >
                    Add your first account
                  </Link>{" "}
                  to start tracking balances and projections.
                </div>
              ) : (
                <>
                  {/* Totals row */}
                  <div className="mb-4 grid gap-3 text-xs text-slate-600 sm:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">
                        Total current
                      </p>
                      <p className="text-base font-semibold tabular-nums">
                        ${totalCurrent.toFixed(2)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">
                        Upcoming expenses
                      </p>
                      <p className="text-base font-semibold tabular-nums">
                        ${totalUpcoming.toFixed(2)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">
                        Net after upcoming
                      </p>
                      <p
                        className={`text-base font-semibold tabular-nums ${
                          netAfter < 0 ? 'text-red-600' : 'text-slate-900'
                        }`}
                      >
                        ${netAfter.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-[minmax(0,1.4fr),minmax(0,1.6fr)]">
                    {/* Pie chart */}
                    <div className="h-56">
                      {pieData.length === 0 ? (
                        <div className="flex h-full items-center justify-center rounded-xl bg-slate-50 text-xs text-slate-500">
                          No positive balances to show yet.
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieData}
                              dataKey="value"
                              nameKey="name"
                              innerRadius={45}
                              outerRadius={80}
                              paddingAngle={2}
                            >
                              {pieData.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={PIE_COLORS[index % PIE_COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value: number) => `$${value.toFixed(2)}`}
                            />
                            <Legend verticalAlign="bottom" height={36} />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>

                    {/* Per-account quick list */}
                    <div className="space-y-2 text-xs text-slate-600">
                      {accountStats.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                        >
                          <div>
                            <p className="text-xs font-semibold text-slate-900">{a.name}</p>
                            <p className="text-[11px] text-slate-500">
                              Upcoming: ${a.upcoming.toFixed(2)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-500">Current</p>
                            <p className="text-sm font-semibold tabular-nums">
                              ${a.current.toFixed(2)}
                            </p>
                            <p
                              className={`mt-0.5 text-[11px] tabular-nums ${
                                a.netAfter < 0 ? 'text-red-600' : 'text-slate-500'
                              }`}
                            >
                              After upcoming: ${a.netAfter.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </section>

            {/* Upcoming expenses */}
            <section className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Next expenses
                  </h2>
                  <p className="text-xs text-slate-500">
                    The next few upcoming expenses from all your accounts.
                  </p>
                </div>
                <Link
                  href="/app/expenses"
                  className="text-xs font-medium text-slate-700 underline underline-offset-2"
                >
                  Manage expenses
                </Link>
              </div>

              {expenses.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  No expenses yet.{" "}
                  <Link
                    href="/app/expenses"
                    className="font-medium text-slate-800 underline underline-offset-2"
                  >
                    Add your first expense
                  </Link>{" "}
                  to see how they affect your plan.
                </div>
              ) : upcomingExpenses.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No upcoming expenses after today. Nice and calm for now.
                </p>
              ) : (
                <div className="space-y-2 text-sm">
                  {upcomingExpenses.map((e, index) => (
                    <div
                      key={e.id}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{e.name}</span>
                          {e.is_recurring && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                              Recurring
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          Due {new Date(e.due_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold tabular-nums">
                          ${e.amount.toFixed(2)}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          #{index + 1} in queue
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
