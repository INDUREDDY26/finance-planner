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
};

type Expense = {
  id: string;
  name: string;
  amount: number;
  due_date: string;
  account_id: string | null;
  is_recurring: boolean | null;
};

type ExpensesSectionProps = {
  user: User;
};

type FormErrors = {
  name?: string;
  amount?: string;
  dueDate?: string;
  accountId?: string;
  general?: string;
};

export default function ExpensesSection({ user }: ExpensesSectionProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // form state
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [accountId, setAccountId] = useState<string>('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const accountsById = useMemo(
    () =>
      accounts.reduce<Record<string, Account>>((map, a) => {
        map[a.id] = a;
        return map;
      }, {}),
    [accounts]
  );

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      const [{ data: accountRows, error: accountError }, { data: expenseRows, error: expenseError }] =
        await Promise.all([
          supabase
            .from('accounts')
            .select('id, name, start_date, initial_amount, monthly_contribution')
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

    loadData();
  }, [user.id]);

  // -------- helpers --------

  function resetForm() {
    setName('');
    setAmount('');
    setDueDate('');
    setAccountId('');
    setIsRecurring(false);
    setEditingId(null);
    setErrors({});
  }

  function monthsBetween(start: Date, end: Date) {
    return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  }

  function computeBalanceAtDate(
    account: Account,
    allExpenses: Expense[],
    candidate: {
      id?: string | null;
      amount: number;
      dueDate: string;
      isRecurring: boolean;
    }
  ) {
    const startDate = account.start_date ? new Date(account.start_date) : new Date(candidate.dueDate);
    const target = new Date(candidate.dueDate);

    const months = Math.max(0, monthsBetween(startDate, target));
    const monthlyContribution = account.monthly_contribution ?? 0;

    let balance = account.initial_amount + monthlyContribution * months;

    // collect expenses for this account (replace the old one with candidate when editing)
    const base = allExpenses.filter((e) => e.account_id === account.id);
    const effective: Expense[] = base
      .filter((e) => (candidate.id ? e.id !== candidate.id : true))
      .concat({
        id: candidate.id ?? 'candidate',
        name: 'candidate',
        amount: candidate.amount,
        account_id: account.id,
        due_date: candidate.dueDate,
        is_recurring: candidate.isRecurring,
      });

    for (const e of effective) {
      const firstDue = new Date(e.due_date);
      if (firstDue > target) continue;

      if (e.is_recurring) {
        const n = monthsBetween(firstDue, target) + 1; // include first occurrence
        balance -= e.amount * n;
      } else {
        // one-time
        if (firstDue <= target) {
          balance -= e.amount;
        }
      }
    }

    return balance;
  }

  function validateForm(): { valid: boolean; parsedAmount: number } {
    const errs: FormErrors = {};
    const amt = Number(amount);

    if (!name.trim()) {
      errs.name = 'Please enter an expense name.';
    }

    if (!amount.trim() || Number.isNaN(amt) || amt <= 0) {
      errs.amount = 'Enter a positive amount.';
    }

    if (!dueDate) {
      errs.dueDate = 'Please choose a due date.';
    }

    let due: Date | null = null;
    if (dueDate) {
      const d = new Date(dueDate);
      if (Number.isNaN(d.getTime())) {
        errs.dueDate = 'Invalid date.';
      } else {
        due = d;
      }
    }

    // account-specific checks
    if (accountId && due && !errs.amount && !errs.dueDate) {
      const account = accountsById[accountId];
      if (account) {
        if (account.start_date) {
          const start = new Date(account.start_date);
          if (due < start) {
            errs.dueDate = `This account starts on ${start.toLocaleDateString()}. Expense date must be on or after that.`;
          }
        }

        // balance check
        if (!errs.dueDate && amt > 0) {
          const bal = computeBalanceAtDate(account, expenses, {
            id: editingId,
            amount: amt,
            dueDate,
            isRecurring,
          });

          if (bal < 0) {
            errs.accountId = `This plan would make ${account.name} go negative (≈ $${bal.toFixed(
              2
            )} on ${due.toLocaleDateString()}). Reduce the amount, move the date, or increase contributions.`;
          }
        }
      }
    }

    setErrors(errs);
    return { valid: Object.keys(errs).length === 0, parsedAmount: amt };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const { valid, parsedAmount } = validateForm();
    if (!valid) {
      setSubmitting(false);
      return;
    }

    const payload = {
      user_id: user.id,
      name: name.trim(),
      amount: parsedAmount,
      due_date: dueDate,
      account_id: accountId || null,
      is_recurring: isRecurring,
    };

    try {
      if (editingId) {
        const { error } = await supabase
          .from('expenses')
          .update(payload)
          .eq('id', editingId)
          .eq('user_id', user.id);

        if (error) {
          console.error(error);
          setErrors({ general: 'Could not save changes. Please try again.' });
        } else {
          // refresh list
          const { data, error: loadError } = await supabase
            .from('expenses')
            .select('id, name, amount, due_date, account_id, is_recurring')
            .eq('user_id', user.id)
            .order('due_date', { ascending: true });

          if (!loadError && data) {
            setExpenses(data as Expense[]);
          }
          resetForm();
        }
      } else {
        const { error } = await supabase.from('expenses').insert(payload);
        if (error) {
          console.error(error);
          setErrors({ general: 'Could not add expense. Please try again.' });
        } else {
          const { data, error: loadError } = await supabase
            .from('expenses')
            .select('id, name, amount, due_date, account_id, is_recurring')
            .eq('user_id', user.id)
            .order('due_date', { ascending: true });

          if (!loadError && data) {
            setExpenses(data as Expense[]);
          }
          resetForm();
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(expense: Expense) {
    setEditingId(expense.id);
    setName(expense.name);
    setAmount(expense.amount.toString());
    setDueDate(expense.due_date.slice(0, 10));
    setAccountId(expense.account_id ?? '');
    setIsRecurring(!!expense.is_recurring);
    setErrors({});
  }

  async function handleRemove(id: string) {
    const exp = expenses.find((e) => e.id === id);
    const label = exp ? `"${exp.name}"` : 'this expense';

    if (!window.confirm(`Are you sure you want to remove ${label}?`)) return;

    const { error } = await supabase.from('expenses').delete().eq('id', id).eq('user_id', user.id);

    if (error) {
      console.error(error);
      setErrors({ general: 'Could not remove expense. Please try again.' });
      return;
    }

    setExpenses((prev) => prev.filter((e) => e.id !== id));

    if (editingId === id) {
      resetForm();
    }
  }

  // -------- UI --------

  if (loading) {
    return (
      <p className="text-center text-sm text-slate-500 py-10">
        Loading expenses…
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-2">
          {editingId ? 'Edit expense' : 'Add expense'}
        </h2>

        {editingId && (
          <p className="mb-3 text-xs text-slate-500">
            Editing an existing expense.{' '}
            <button
              type="button"
              onClick={resetForm}
              className="text-xs font-medium text-slate-700 underline underline-offset-2"
            >
              Cancel edit
            </button>
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 max-w-3xl">
          {errors.general && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {errors.general}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Expense name</label>
            <input
              type="text"
              className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${
                errors.name ? 'border-red-400' : 'border-slate-300'
              }`}
              placeholder="Trip, bill, insurance…"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">Amount</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${
                  errors.amount ? 'border-red-400' : 'border-slate-300'
                }`}
                placeholder="e.g. 500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              {errors.amount && <p className="mt-1 text-xs text-red-600">{errors.amount}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Due date</label>
              <input
                type="date"
                className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${
                  errors.dueDate ? 'border-red-400' : 'border-slate-300'
                }`}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
              {errors.dueDate && <p className="mt-1 text-xs text-red-600">{errors.dueDate}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Deduct from account <span className="text-xs text-slate-400">(optional)</span>
            </label>
            <select
              className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${
                errors.accountId ? 'border-red-400' : 'border-slate-300'
              }`}
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              <option value="">— No specific account —</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            {errors.accountId && <p className="mt-1 text-xs text-red-600">{errors.accountId}</p>}
          </div>

          <div className="flex items-start gap-2 text-xs text-slate-600">
            <input
              id="isRecurring"
              type="checkbox"
              className="mt-1"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              disabled={!accountId}
            />
            <label htmlFor="isRecurring" className={accountId ? '' : 'opacity-50'}>
              <span className="font-medium">Repeat every month</span>{' '}
              <span className="text-slate-500">
                (Only allowed when an account is selected; we block the expense if the account
                balance would drop below $0 by that date.)
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 inline-flex items-center justify-center rounded-full bg-black px-6 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {submitting ? 'Saving…' : editingId ? 'Save changes' : 'Add expense'}
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-800">Your expenses</h2>

        {expenses.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            No expenses yet. Add your first expense above to start planning.
          </p>
        ) : (
          <div className="space-y-3">
            {expenses.map((expense) => {
              const account = expense.account_id ? accountsById[expense.account_id] : null;
              const isRec = !!expense.is_recurring;

              return (
                <div
                  key={expense.id}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{expense.name}</span>
                      {isRec && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                          Recurring
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      Due: {new Date(expense.due_date).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-slate-500">
                      From:{' '}
                      {account ? (
                        <span className="font-medium text-slate-700">{account.name}</span>
                      ) : (
                        'No specific account'
                      )}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-4 md:justify-end">
                    <div className="text-right">
                      <p className="font-semibold tabular-nums">
                        ${expense.amount.toFixed(2)}
                      </p>
                      {isRec && (
                        <p className="text-[11px] text-slate-500 tabular-nums">per month</p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(expense)}
                        className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(expense.id)}
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
