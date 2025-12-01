'use client';

import DemoHeader from '../../../components/demo/DemoHeader';
import { FormEvent, useState } from 'react';
import {
  useDemo,
  type DemoExpense,
} from '../../../components/demo/DemoContext';

function formatCurrency(n: number) {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  });
}

type ExpenseFormState = {
  name: string;
  amount: string;
  dueDate: string;
  accountId: string;
  isRecurring: boolean;
};

const emptyForm: ExpenseFormState = {
  name: '',
  amount: '',
  dueDate: '',
  accountId: '',
  isRecurring: false,
};

export default function DemoExpensesPage() {
  const { accounts, expenses, setExpenses, loaded } = useDemo();
  const [form, setForm] = useState<ExpenseFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!loaded) {
    return (
      <div className="min-h-screen bg-slate-50">
        <DemoHeader active="expenses" />
        <main className="mx-auto max-w-5xl px-4 pb-10 pt-6">
          <h1 className="mb-4 text-xl font-semibold">Expenses</h1>
          <p className="mb-6 text-sm text-slate-600">
            Loading demo expenses…
          </p>
        </main>
      </div>
    );
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const amount = Number(form.amount || 0);
    if (Number.isNaN(amount) || amount <= 0) {
      alert('Enter a positive amount.');
      return;
    }

    const selectedAccount =
      form.accountId === ''
        ? null
        : accounts.find((a) => a.id === form.accountId) ?? null;

    if (selectedAccount && form.dueDate) {
      const due = new Date(form.dueDate);
      const start = new Date(selectedAccount.start_date);
      if (due < start) {
        alert(
          `This account starts on ${start.toLocaleDateString()}. You cannot schedule an expense before that date.`,
        );
        return;
      }
    }

    const newExpense: DemoExpense = {
      id: editingId ?? `demo-exp-${crypto.randomUUID()}`,
      name: form.name.trim() || 'Untitled',
      amount,
      due_date: form.dueDate,
      account_id: form.accountId || null,
      is_recurring: form.isRecurring,
    };

    setExpenses((prev) =>
      editingId
        ? prev.map((e) => (e.id === editingId ? newExpense : e))
        : [...prev, newExpense],
    );

    setForm(emptyForm);
    setEditingId(null);
  };

  const handleEdit = (expense: DemoExpense) => {
    setEditingId(expense.id);
    setForm({
      name: expense.name,
      amount: String(expense.amount),
      dueDate: expense.due_date ?? '',
      accountId: expense.account_id ?? '',
      isRecurring: expense.is_recurring,
    });
  };

  const handleRemove = (id: string) => {
    if (!confirm('Remove this demo expense?')) return;
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const sortedExpenses = [...expenses].sort((a, b) => {
    if (!a.due_date && !b.due_date) return 0;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return a.due_date.localeCompare(b.due_date);
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <DemoHeader active="expenses" />

      <main className="mx-auto max-w-5xl px-4 pb-10 pt-6">
        <h1 className="mb-4 text-xl font-semibold">Expenses</h1>
        <p className="mb-6 text-sm text-slate-600">
          Add trips, bills, and other costs and link them to your demo
          accounts. Recurring expenses repeat every month and are checked so
          your account never hits zero.
        </p>

        <div className="space-y-6">
          {/* Add / edit form */}
          <section className="rounded-xl border bg-white p-4">
            <h2 className="mb-4 text-sm font-medium">
              {editingId ? 'Edit demo expense' : 'Add demo expense'}
            </h2>

            <form
              onSubmit={handleSubmit}
              className="space-y-4 text-sm"
            >
              <div>
                <label className="text-xs font-medium text-slate-700">
                  Expense name
                </label>
                <input
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="Trip to New York"
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
                  Amount
                </label>
                <input
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="e.g. 1200"
                  value={form.amount}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      amount: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-slate-700">
                    Due date
                  </label>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    value={form.dueDate}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        dueDate: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700">
                    Pay from account (optional)
                  </label>
                  <select
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    value={form.accountId}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        accountId: e.target.value,
                      }))
                    }
                  >
                    <option value="">Unassigned</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={form.isRecurring}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      isRecurring: e.target.checked,
                    }))
                  }
                />
                Repeat every month{' '}
                <span className="text-[11px] text-slate-500">
                  (Demo-only recurring logic)
                </span>
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
                  {editingId ? 'Save changes' : 'Add expense'}
                </button>
              </div>
            </form>
          </section>

          {/* Upcoming demo expenses list */}
          <section className="rounded-xl border bg-white p-4 text-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-medium">
                Upcoming demo expenses
              </h2>
              <p className="text-xs text-slate-500">
                Total:{' '}
                {formatCurrency(
                  sortedExpenses.reduce(
                    (sum, e) => sum + e.amount,
                    0,
                  ),
                )}
              </p>
            </div>

            {sortedExpenses.length === 0 ? (
              <p className="text-xs text-slate-500">
                No demo expenses yet. Add one using the form above.
              </p>
            ) : (
              <div className="space-y-3">
                {sortedExpenses.map((expense) => {
                  const account = expense.account_id
                    ? accounts.find(
                        (a) => a.id === expense.account_id,
                      )
                    : null;

                  return (
                    <article
                      key={expense.id}
                      className="flex flex-col justify-between gap-3 rounded-xl border bg-slate-50 p-4 text-sm md:flex-row md:items-center"
                    >
                      <div>
                        <p className="font-medium">{expense.name}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Due:{' '}
                          {expense.due_date
                            ? new Date(
                                expense.due_date,
                              ).toLocaleDateString()
                            : 'Not set'}
                        </p>
                        {account && (
                          <p className="mt-1 text-[11px] text-slate-500">
                            From: {account.name}
                          </p>
                        )}
                        {expense.is_recurring && (
                          <p className="mt-1 text-[11px] font-medium text-indigo-600">
                            Recurring every month
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-6">
                        <p className="text-sm font-semibold">
                          {formatCurrency(expense.amount)}
                        </p>

                        <div className="flex gap-2 text-xs">
                          <button
                            type="button"
                            className="rounded-full border border-slate-300 px-3 py-1 text-xs"
                            onClick={() => handleEdit(expense)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="rounded-full border border-rose-500 px-3 py-1 text-xs text-rose-600"
                            onClick={() => handleRemove(expense.id)}
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
      </main>
    </div>
  );
}
