'use client';

import DemoHeader from '../../../components/demo/DemoHeader';
import { FormEvent, useState } from 'react';
import {
  useDemo,
  type DemoAccount,
} from '../../../components/demo/DemoContext';

function formatCurrency(n: number) {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  });
}

type AccountFormState = {
  name: string;
  startDate: string;
  initialAmount: string;
  monthlyContribution: string;
  annualReturnRate: string;
  reinvestDividends: boolean;
};

const emptyForm: AccountFormState = {
  name: '',
  startDate: '',
  initialAmount: '',
  monthlyContribution: '',
  annualReturnRate: '',
  reinvestDividends: false,
};

export default function DemoAccountsPage() {
  const { accounts, expenses, setAccounts, loaded } = useDemo();
  const [projectionYears, setProjectionYears] = useState(10);
  const [form, setForm] = useState<AccountFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!loaded) {
    return (
      <div className="min-h-screen bg-slate-50">
        <DemoHeader active="accounts" />
        <main className="mx-auto max-w-5xl px-4 pb-10 pt-6">
          <h1 className="mb-4 text-xl font-semibold">Accounts</h1>
          <p className="mb-6 text-sm text-slate-600">
            Loading demo accounts…
          </p>
        </main>
      </div>
    );
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const initialAmount = Number(form.initialAmount || 0);
    const monthlyContribution = Number(form.monthlyContribution || 0);
    const annualReturn =
      form.annualReturnRate.trim() === ''
        ? null
        : Number(form.annualReturnRate);

    if (Number.isNaN(initialAmount) || initialAmount < 0) {
      alert('Initial amount must be a non-negative number.');
      return;
    }

    if (Number.isNaN(monthlyContribution) || monthlyContribution < 0) {
      alert('Monthly contribution must be a non-negative number.');
      return;
    }

    if (annualReturn !== null && (Number.isNaN(annualReturn) || annualReturn < 0 || annualReturn > 100)) {
      alert('Annual return must be a percentage between 0 and 100.');
      return;
    }

    const todayIso = new Date().toISOString().slice(0, 10);

    const newAccount: DemoAccount = {
      id: editingId ?? `demo-${crypto.randomUUID()}`,
      name: form.name.trim() || 'Untitled',
      start_date: form.startDate || todayIso,
      initial_amount: Number.isNaN(initialAmount) ? 0 : initialAmount,
      monthly_contribution: Number.isNaN(monthlyContribution)
        ? 0
        : monthlyContribution,
      annual_return_rate:
        annualReturn === null || Number.isNaN(annualReturn)
          ? null
          : annualReturn,
      reinvest_dividends: form.reinvestDividends,
    };

    setAccounts((prev) =>
      editingId
        ? prev.map((acc) => (acc.id === editingId ? newAccount : acc))
        : [...prev, newAccount],
    );

    setForm(emptyForm);
    setEditingId(null);
  };

  const handleEdit = (account: DemoAccount) => {
    setEditingId(account.id);
    setForm({
      name: account.name,
      startDate: account.start_date,
      initialAmount:
        account.initial_amount === 0
          ? ''
          : String(account.initial_amount),
      monthlyContribution:
        account.monthly_contribution === 0
          ? ''
          : String(account.monthly_contribution),
      annualReturnRate:
        account.annual_return_rate === null
          ? ''
          : String(account.annual_return_rate),
      reinvestDividends: account.reinvest_dividends,
    });
  };

  const handleRemove = (id: string) => {
    if (!confirm('Remove this demo account?')) return;
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  };

  const calculateStats = (account: DemoAccount) => {
    const current = account.initial_amount;

    const upcoming = expenses
      .filter((e) => e.account_id === account.id)
      .reduce((sum, e) => sum + e.amount, 0);

    const netAfter = current - upcoming;
    return { current, upcoming, netAfter };
  };

  const totalCurrent = accounts.reduce(
    (sum, a) => sum + a.initial_amount,
    0,
  );

  const projectBalance = (account: DemoAccount) => {
    const years = projectionYears;
    const months = years * 12;

    const r =
      account.annual_return_rate && account.annual_return_rate > 0
        ? account.annual_return_rate / 100 / 12
        : 0;

    let balance = account.initial_amount;
    for (let i = 0; i < months; i++) {
      balance += account.monthly_contribution;
      if (r > 0) {
        balance *= 1 + r;
      }
    }
    return balance;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <DemoHeader active="accounts" />

      <main className="mx-auto max-w-5xl px-4 pb-10 pt-6">
        <h1 className="mb-4 text-xl font-semibold">Accounts</h1>
        <p className="mb-6 text-sm text-slate-600">
          Add savings, investment, and goal accounts. Then link demo expenses
          so you can see how much is really left after upcoming bills.
        </p>

        <div className="space-y-6">
          {/* Top bar with projection control */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold">Demo accounts</h2>
              <p className="mt-1 text-xs text-slate-500">
                Accounts here are stored only in session storage and can be
                safely used to play with the planner.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Projection view:</span>
              <input
                type="number"
                min={1}
                max={50}
                value={projectionYears}
                onChange={(e) =>
                  setProjectionYears(
                    Math.max(1, Number(e.target.value) || 1),
                  )
                }
                className="w-14 rounded-md border border-slate-300 px-2 py-1 text-right text-xs"
              />
              <span>years</span>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-[minmax(0,1.6fr)_minmax(0,2fr)]">
            {/* Form */}
            <section className="rounded-xl border bg-white p-4">
              <h3 className="mb-3 text-sm font-medium">
                {editingId ? 'Edit demo account' : 'Add demo account'}
              </h3>

              <form
                onSubmit={handleSubmit}
                className="space-y-4 text-sm"
              >
                <div>
                  <label className="text-xs font-medium text-slate-700">
                    Account name
                  </label>
                  <input
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    placeholder="High-yield savings"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        name: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700">
                    Start date
                  </label>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    value={form.startDate}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        startDate: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700">
                    Initial amount
                  </label>
                  <input
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    placeholder="e.g. 5000"
                    value={form.initialAmount}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        initialAmount: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700">
                    Monthly contribution (optional)
                  </label>
                  <input
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    placeholder="e.g. 200"
                    value={form.monthlyContribution}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        monthlyContribution: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700">
                    Annual return rate % (optional)
                  </label>
                  <input
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    placeholder="e.g. 5 for 5%"
                    value={form.annualReturnRate}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        annualReturnRate: e.target.value,
                      }))
                    }
                  />
                </div>

                <label className="flex items-center gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.reinvestDividends}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        reinvestDividends: e.target.checked,
                      }))
                    }
                  />
                  Reinvest dividends / interest
                </label>

                <div className="flex justify-end gap-2">
                  {editingId && (
                    <button
                      type="button"
                      className="rounded-md border px-3 py-2 text-xs"
                      onClick={() => {
                        setForm(emptyForm);
                        setEditingId(null);
                      }}
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    className="rounded-md bg-black px-4 py-2 text-xs font-medium text-white hover:bg-slate-900"
                  >
                    {editingId ? 'Save changes' : 'Add account'}
                  </button>
                </div>
              </form>
            </section>

            {/* Accounts list & projection */}
            <section className="space-y-4 rounded-xl border bg-white p-4 text-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">Demo accounts overview</p>
                <p className="text-xs text-slate-500">
                  Total: {formatCurrency(totalCurrent)}
                </p>
              </div>

              {accounts.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No demo accounts yet. Add one using the form on the left.
                </p>
              ) : (
                <div className="space-y-3">
                  {accounts.map((account) => {
                    const {
                      current,
                      upcoming,
                      netAfter,
                    } = calculateStats(account);
                    const projected = projectBalance(account);

                    return (
                      <article
                        key={account.id}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold">
                              {account.name}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-500">
                              Starts:{' '}
                              {account.start_date ||
                                'Not specified'}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-500">
                              Projected in {projectionYears} year
                              {projectionYears !== 1 ? 's' : ''}:{' '}
                              <span className="font-medium">
                                {formatCurrency(projected)}
                              </span>
                            </p>
                          </div>

                          <div className="flex flex-col items-end gap-1 text-[11px]">
                            <div>
                              <span className="text-slate-500">
                                Current:
                              </span>{' '}
                              <span className="font-semibold">
                                {formatCurrency(current)}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500">
                                Upcoming expenses:
                              </span>{' '}
                              <span className="font-semibold text-amber-700">
                                {formatCurrency(upcoming)}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500">
                                After upcoming:
                              </span>{' '}
                              <span
                                className={`font-semibold ${
                                  netAfter >= 0
                                    ? 'text-emerald-700'
                                    : 'text-rose-700'
                                }`}
                              >
                                {formatCurrency(netAfter)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                          <div className="flex flex-wrap gap-2">
                            {account.monthly_contribution > 0 && (
                              <span className="rounded-full bg-slate-200 px-2 py-0.5">
                                {formatCurrency(
                                  account.monthly_contribution,
                                )}{' '}
                                / mo
                              </span>
                            )}
                            {account.annual_return_rate != null && (
                              <span className="rounded-full bg-slate-200 px-2 py-0.5">
                                {account.annual_return_rate}% expected
                              </span>
                            )}
                            {account.reinvest_dividends && (
                              <span className="rounded-full bg-slate-200 px-2 py-0.5">
                                Reinvesting dividends
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className="rounded-full border border-slate-300 px-3 py-1 text-xs"
                              onClick={() => handleEdit(account)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="rounded-full border border-rose-500 px-3 py-1 text-xs text-rose-600"
                              onClick={() => handleRemove(account.id)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
