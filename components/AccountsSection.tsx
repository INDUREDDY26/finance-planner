'use client';

import { useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

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

type AccountsSectionProps = {
  user: User;
};

type FormErrors = {
  name?: string;
  startDate?: string;
  initialAmount?: string;
  monthlyContribution?: string;
  annualReturnRate?: string;
  general?: string;
};

export default function AccountsSection({ user }: AccountsSectionProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // form state
  const [accountName, setAccountName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [initialAmount, setInitialAmount] = useState('');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [annualReturnRate, setAnnualReturnRate] = useState('');
  const [reinvestDividends, setReinvestDividends] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const expensesByAccount = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const e of expenses) {
      if (!e.account_id) continue;
      if (!map.has(e.account_id)) map.set(e.account_id, []);
      map.get(e.account_id)!.push(e);
    }
    return map;
  }, [expenses]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);

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
          .eq('user_id', user.id),
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

    loadData();
  }, [user.id]);

  // ---- helpers ----

  function resetForm() {
    setAccountName('');
    setStartDate('');
    setInitialAmount('');
    setMonthlyContribution('');
    setAnnualReturnRate('');
    setReinvestDividends(true);
    setEditingId(null);
    setErrors({});
  }

  function validateForm(): {
    valid: boolean;
    initial: number;
    monthly: number | null;
    annual: number | null;
  } {
    const errs: FormErrors = {};
    const name = accountName.trim();
    const start = startDate;
    const init = Number(initialAmount);
    const monthly = monthlyContribution.trim()
      ? Number(monthlyContribution)
      : null;
    const annual = annualReturnRate.trim() ? Number(annualReturnRate) : null;

    if (!name) {
      errs.name = 'Please enter an account name.';
    }

    if (!start) {
      errs.startDate = 'Please choose a start date.';
    } else {
      const d = new Date(start);
      if (Number.isNaN(d.getTime())) {
        errs.startDate = 'Invalid date.';
      }
    }

    if (!initialAmount.trim() || Number.isNaN(init) || init < 0) {
      errs.initialAmount = 'Initial amount must be zero or positive.';
    }

    if (monthlyContribution.trim()) {
      if (Number.isNaN(monthly!) || (monthly as number) < 0) {
        errs.monthlyContribution = 'Monthly contribution must be zero or positive.';
      }
    }

    if (annualReturnRate.trim()) {
      if (Number.isNaN(annual!) || annual! < 0) {
        errs.annualReturnRate = 'Annual return rate must be zero or positive.';
      }
    }

    setErrors(errs);
    const valid = Object.keys(errs).length === 0;

    return {
      valid,
      initial: init,
      monthly,
      annual,
    };
  }

  async function refreshAccounts() {
    const { data, error } = await supabase
      .from('accounts')
      .select(
        'id, name, start_date, initial_amount, monthly_contribution, annual_return_rate, reinvest_dividends'
      )
      .eq('user_id', user.id)
      .order('start_date', { ascending: true });

    if (!error && data) {
      setAccounts(data as Account[]);
    } else if (error) {
      console.error('Error refreshing accounts', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const { valid, initial, monthly, annual } = validateForm();
    if (!valid) {
      setSubmitting(false);
      return;
    }

    const payload = {
      user_id: user.id,
      name: accountName.trim(),
      start_date: startDate,
      initial_amount: initial,
      monthly_contribution: monthly,
      annual_return_rate: annual,
      reinvest_dividends: reinvestDividends,
    };

    try {
      if (editingId) {
        const { error } = await supabase
          .from('accounts')
          .update(payload)
          .eq('id', editingId)
          .eq('user_id', user.id);

        if (error) {
          console.error(error);
          setErrors({ general: 'Could not save changes. Please try again.' });
        } else {
          await refreshAccounts();
          resetForm();
        }
      } else {
        const { error } = await supabase.from('accounts').insert(payload);
        if (error) {
          console.error(error);
          setErrors({ general: 'Could not add account. Please try again.' });
        } else {
          await refreshAccounts();
          resetForm();
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(account: Account) {
    setEditingId(account.id);
    setAccountName(account.name);
    setStartDate(account.start_date ? account.start_date.slice(0, 10) : '');
    setInitialAmount(account.initial_amount.toString());
    setMonthlyContribution(
      account.monthly_contribution != null ? account.monthly_contribution.toString() : ''
    );
    setAnnualReturnRate(
      account.annual_return_rate != null ? account.annual_return_rate.toString() : ''
    );
    setReinvestDividends(account.reinvest_dividends ?? true);
    setErrors({});
  }

  async function handleRemove(id: string) {
    const account = accounts.find((a) => a.id === id);
    const label = account ? `"${account.name}"` : 'this account';

    if (!window.confirm(`Are you sure you want to remove ${label}?`)) return;

    const { error } = await supabase.from('accounts').delete().eq('id', id).eq('user_id', user.id);
    if (error) {
      console.error(error);
      setErrors({ general: 'Could not remove account. Please try again.' });
      return;
    }

    setAccounts((prev) => prev.filter((a) => a.id !== id));

    if (editingId === id) {
      resetForm();
    }
  }

  // simple stats: “current today”, “upcoming planned”, “net after”
  const today = new Date();

  function getAccountStats(account: Account) {
    const related = expensesByAccount.get(account.id) ?? [];
    let current = account.initial_amount;
    let upcoming = 0;

    for (const e of related) {
      const due = new Date(e.due_date);

      // Treat one instance for recurring – simpler and matches card UI
      if (due <= today) {
        current -= e.amount;
      } else {
        upcoming += e.amount;
      }
    }

    const netAfter = current - upcoming;
    return { current, upcoming, netAfter };
  }

  // ---- UI ----

  if (loading) {
    return (
      <p className="py-10 text-center text-sm text-slate-500">
        Loading accounts…
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">
              {editingId ? 'Edit account' : 'Add account'}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Use separate accounts for savings, investments, or specific goals (HYSA, 401k, travel
              fund, etc.).
            </p>
          </div>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-xs font-medium text-slate-700 underline underline-offset-2"
            >
              Cancel edit
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 max-w-3xl">
          {errors.general && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {errors.general}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium">Account name</label>
            <input
              type="text"
              className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${
                errors.name ? 'border-red-400' : 'border-slate-300'
              }`}
              placeholder="HYSA, 401k, travel fund…"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Start date</label>
              <input
                type="date"
                className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${
                  errors.startDate ? 'border-red-400' : 'border-slate-300'
                }`}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              {errors.startDate && <p className="mt-1 text-xs text-red-600">{errors.startDate}</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Initial amount</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${
                  errors.initialAmount ? 'border-red-400' : 'border-slate-300'
                }`}
                placeholder="e.g. 5000"
                value={initialAmount}
                onChange={(e) => setInitialAmount(e.target.value)}
              />
              {errors.initialAmount && (
                <p className="mt-1 text-xs text-red-600">{errors.initialAmount}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Monthly contribution <span className="text-xs text-slate-400">(optional)</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${
                  errors.monthlyContribution ? 'border-red-400' : 'border-slate-300'
                }`}
                placeholder="e.g. 200"
                value={monthlyContribution}
                onChange={(e) => setMonthlyContribution(e.target.value)}
              />
              {errors.monthlyContribution && (
                <p className="mt-1 text-xs text-red-600">{errors.monthlyContribution}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Annual return rate % <span className="text-xs text-slate-400">(optional)</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${
                  errors.annualReturnRate ? 'border-red-400' : 'border-slate-300'
                }`}
                placeholder="e.g. 5"
                value={annualReturnRate}
                onChange={(e) => setAnnualReturnRate(e.target.value)}
              />
              {errors.annualReturnRate && (
                <p className="mt-1 text-xs text-red-600">{errors.annualReturnRate}</p>
              )}
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={reinvestDividends}
              onChange={(e) => setReinvestDividends(e.target.checked)}
            />
            <span>
              Reinvest dividends / interest{' '}
              <span className="text-slate-500">(keeps growth compounding in projections)</span>
            </span>
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 inline-flex items-center justify-center rounded-full bg-black px-6 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {submitting ? 'Saving…' : editingId ? 'Save changes' : 'Add account'}
          </button>
        </form>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Your accounts</h2>
        </div>

        {accounts.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            No accounts yet. Add an account above to see balances and link expenses.
          </p>
        ) : (
          <div className="space-y-3">
            {accounts.map((account) => {
              const { current, upcoming, netAfter } = getAccountStats(account);

              return (
                <div
                  key={account.id}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1 text-sm">
                    <p className="font-semibold">{account.name}</p>
                    <p className="text-xs text-slate-500">
                      Start: {account.start_date ? new Date(account.start_date).toLocaleDateString() : '—'}
                    </p>
                    <p className="text-xs text-slate-500">
                      In 10 years:{' '}
                      <span className="italic text-slate-400">
                        projection not yet implemented
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-4 md:justify-end">
                    <div className="text-right text-xs text-slate-600">
                      <p>
                        Current (today):{' '}
                        <span className="font-semibold text-slate-900 tabular-nums">
                          ${current.toFixed(2)}
                        </span>
                      </p>
                      <p>
                        Upcoming planned expenses:{' '}
                        <span className="tabular-nums text-slate-900">
                          ${upcoming.toFixed(2)}
                        </span>
                      </p>
                      <p>
                        Net after upcoming:{' '}
                        <span
                          className={`tabular-nums ${
                            netAfter < 0 ? 'text-red-600' : 'text-slate-900'
                          }`}
                        >
                          ${netAfter.toFixed(2)}
                        </span>
                      </p>
                      {account.monthly_contribution != null && account.monthly_contribution > 0 && (
                        <p className="mt-1 text-[11px] text-slate-500 tabular-nums">
                          + ${account.monthly_contribution.toFixed(2)}/mo
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(account)}
                        className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(account.id)}
                        className="rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
