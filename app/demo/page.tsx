'use client';

import { useMemo } from 'react';
import { format } from 'date-fns';
import Link from 'next/link';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

import DemoHeader from '../../components/demo/DemoHeader';
import { useDemo } from '../../components/demo/DemoContext';

function formatCurrency(n: number) {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  });
}

const PIE_COLORS = ['#0f172a', '#64748b', '#94a3b8', '#cbd5f5', '#e5e7eb'];

export default function DemoDashboardPage() {
  const { accounts, expenses, loaded } = useDemo();

  const todayLabel = useMemo(
    () => format(new Date(), 'MM/dd/yyyy'),
    [],
  );

  const {
    totalCurrent,
    totalUpcoming,
    netAfterUpcoming,
    chartData,
    hasAccounts,
  } = useMemo(() => {
    if (!accounts || accounts.length === 0) {
      return {
        totalCurrent: 0,
        totalUpcoming: 0,
        netAfterUpcoming: 0,
        chartData: [] as { name: string; value: number }[],
        hasAccounts: false,
      };
    }

    const chart = accounts.map((acc, index) => {
      const value = acc.initial_amount ?? 0;
      return {
        name: acc.name || `Account ${index + 1}`,
        value,
      };
    });

    const totalCurrentInner = chart.reduce(
      (sum, item) => sum + (item.value || 0),
      0,
    );

    const today = new Date();
    const upcomingInner = (expenses || [])
      .filter((exp) => {
        if (!exp.due_date) return false;
        const d = new Date(exp.due_date);
        if (Number.isNaN(d.getTime())) return false;
        return d >= today;
      })
      .reduce((sum, exp) => sum + (exp.amount || 0), 0);

    return {
      totalCurrent: totalCurrentInner,
      totalUpcoming: upcomingInner,
      netAfterUpcoming: totalCurrentInner - upcomingInner,
      chartData: chart,
      hasAccounts: true,
    };
  }, [accounts, expenses]);

  const upcomingDemoExpenses = useMemo(() => {
    const today = new Date();
    return (expenses || [])
      .map((exp) => {
        const date = exp.due_date ? new Date(exp.due_date) : null;
        return {
          ...exp,
          _date: date && !Number.isNaN(date.getTime()) ? date : null,
        };
      })
      .filter((exp) => exp._date && (exp._date as Date) >= today)
      .sort(
        (a, b) =>
          (a._date as Date).getTime() - (b._date as Date).getTime(),
      )
      .slice(0, 3);
  }, [expenses]);

  if (!loaded) {
    return (
      <div className="min-h-screen bg-slate-50">
        <DemoHeader active="home" />
        <main className="mx-auto max-w-5xl px-4 pb-10 pt-6">
          <h1 className="mb-4 text-xl font-semibold">Dashboard</h1>
          <p className="mb-6 text-sm text-slate-600">
            Loading demo dashboard…
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <DemoHeader active="home" />
      <main className="mx-auto max-w-5xl px-4 pb-10 pt-6 flex w-full flex-col gap-6">
        {/* Page header – matches profile dashboard shell */}
        <header className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold">Dashboard</h1>
            <p className="text-sm text-slate-600">
              Overview of your demo accounts, upcoming demo expenses, and net
              position. This mirrors what you&apos;ll see after signing up.
            </p>
          </div>
          <div className="text-xs text-slate-500 sm:text-right">
            <div className="font-medium text-slate-400">Today</div>
            <div>{todayLabel}</div>
          </div>
        </header>

        {/* Summary cards */}
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">
              Current demo balance
            </p>
            <p className="mt-2 text-lg font-semibold">
              {formatCurrency(totalCurrent)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Across all demo accounts
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">
              Upcoming demo expenses
            </p>
            <p className="mt-2 text-lg font-semibold text-amber-700">
              {formatCurrency(totalUpcoming)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Due from today onward
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">
              Net after upcoming
            </p>
            <p
              className={`mt-2 text-lg font-semibold ${
                netAfterUpcoming >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {formatCurrency(netAfterUpcoming)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              What&apos;s left after upcoming demo expenses
            </p>
          </div>
        </section>

        {/* Main content layout – chart + upcoming expenses */}
        <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)]">
          {/* Accounts overview with pie chart */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold">
                  Accounts overview (demo)
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Your current demo balances by account and how upcoming demo
                  expenses affect them.
                </p>
              </div>
              <Link
                href="/demo/accounts"
                className="text-xs font-medium text-slate-700 hover:underline"
              >
                Manage demo accounts
              </Link>
            </div>

            {hasAccounts && chartData.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="55%"
                        outerRadius="80%"
                        paddingAngle={1}
                      >
                        {chartData.map((_entry, index) => (
                          <Cell
                            key={`slice-${index}`}
                            fill={
                              PIE_COLORS[index % PIE_COLORS.length]
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: any) =>
                          formatCurrency(Number(value) || 0)
                        }
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Total current</span>
                    <span className="font-semibold">
                      {formatCurrency(totalCurrent)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">
                      Upcoming demo expenses
                    </span>
                    <span className="font-semibold text-amber-700">
                      {formatCurrency(totalUpcoming)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">
                      Net after upcoming
                    </span>
                    <span
                      className={`font-semibold ${
                        netAfterUpcoming >= 0
                          ? 'text-emerald-700'
                          : 'text-rose-700'
                      }`}
                    >
                      {formatCurrency(netAfterUpcoming)}
                    </span>
                  </div>

                  <div className="mt-4 rounded-lg bg-slate-50 p-3 text-[11px] text-slate-600">
                    This is all demo data stored in session only. When you
                    create a real account, you&apos;ll see the same view with
                    your actual accounts and expenses.
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
                <p className="font-medium mb-2">No demo accounts yet.</p>
                <p className="mb-3">
                  Use the demo accounts and expenses pages to see how this
                  dashboard will look with real data.
                </p>
                <div className="flex flex-wrap gap-3 text-xs">
                  <Link
                    href="/demo/accounts"
                    className="rounded-full bg-black px-4 py-2 font-medium text-white hover:bg-slate-900"
                  >
                    Add a demo account
                  </Link>
                  <Link
                    href="/demo/expenses"
                    className="rounded-full border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-100"
                  >
                    Add a demo expense
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Upcoming demo expenses list */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold">
                  Upcoming demo expenses
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  The next few expenses based on their due dates.
                </p>
              </div>
              <Link
                href="/demo/expenses"
                className="text-xs font-medium text-slate-700 hover:underline"
              >
                Manage demo expenses
              </Link>
            </div>

            {upcomingDemoExpenses.length === 0 ? (
              <p className="text-xs text-slate-500">
                No upcoming demo expenses. Add some on the{' '}
                <Link
                  href="/demo/expenses"
                  className="underline"
                >
                  demo expenses
                </Link>{' '}
                page.
              </p>
            ) : (
              <div className="space-y-3 text-sm">
                {upcomingDemoExpenses.map((exp, index) => (
                  <div
                    key={exp.id ?? index}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium">
                        {exp.name || 'Demo expense'}
                      </p>
                      {exp._date && (
                        <p className="mt-1 text-xs text-slate-500">
                          Due:{' '}
                          {format(
                            exp._date as Date,
                            'MM/dd/yyyy',
                          )}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Amount
                      </p>
                      <p className="text-sm font-semibold">
                        {formatCurrency(exp.amount || 0)}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        #{index + 1} in queue
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
