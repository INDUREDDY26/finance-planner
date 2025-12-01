// lib/finance.ts
export type Account = {
  id: string;
  user_id?: string;
  name: string;
  start_date: string; // ISO date string
  initial_amount: number;
  monthly_contribution: number | null;
  annual_return_rate: number | null;
  reinvest_dividends: boolean;
};

export type Expense = {
  id: string;
  user_id?: string;
  name: string;
  amount: number;
  due_date: string; // ISO date string
  account_id: string | null;
};

function parseISODate(value: string): Date {
  const d = new Date(value);
  // normalise time to midnight
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function monthsBetween(startISO: string, endISO: string): number {
  const start = parseISODate(startISO);
  const end = parseISODate(endISO);

  let months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());

  // If end day is before start day, subtract one month
  if (end.getDate() < start.getDate()) {
    months -= 1;
  }

  return Math.max(months, 0);
}

/**
 * Approximate balance of an account at a given date,
 * **before** subtracting any expenses.
 */
export function computeAccountBalanceAtDate(
  account: Account,
  targetDate: Date
): number {
  const start = parseISODate(account.start_date);
  if (targetDate < start) return 0;

  const months = monthsBetween(
    account.start_date,
    targetDate.toISOString().slice(0, 10)
  );

  const monthlyContribution = account.monthly_contribution ?? 0;
  const annualRate = (account.annual_return_rate ?? 0) / 100;
  const monthlyRate = annualRate / 12;

  let balance = account.initial_amount || 0;

  for (let i = 0; i < months; i++) {
    balance += monthlyContribution;

    if (account.reinvest_dividends && monthlyRate > 0) {
      balance *= 1 + monthlyRate;
    }
  }

  if (!account.reinvest_dividends && annualRate > 0 && months > 0) {
    // simple interest on average balance (very rough, but OK for planning)
    const years = months / 12;
    balance += balance * annualRate * years;
  }

  return Math.max(balance, 0);
}

/**
 * Sum of upcoming expenses for an account from a given date (inclusive).
 */
export function sumUpcomingExpensesForAccount(
  account: Account,
  expenses: Expense[],
  fromDate: Date
): number {
  const from = parseISODate(fromDate.toISOString().slice(0, 10));

  return expenses
    .filter(
      (e) =>
        e.account_id === account.id &&
        parseISODate(e.due_date) >= from
    )
    .reduce((sum, e) => sum + e.amount, 0);
}

/**
 * How much can we afford for a single expense on a given date,
 * after accounting for other expenses up to that date.
 */
export function computeMaxAffordableForExpense(
  account: Account,
  expenses: Expense[],
  dueDate: Date,
  ignoreExpenseId?: string
): number {
  const due = parseISODate(dueDate.toISOString().slice(0, 10));
  const grossBalance = computeAccountBalanceAtDate(account, due);

  const spentBefore = expenses
    .filter(
      (e) =>
        e.account_id === account.id &&
        e.id !== ignoreExpenseId &&
        parseISODate(e.due_date) <= due
    )
    .reduce((sum, e) => sum + e.amount, 0);

  const available = grossBalance - spentBefore;
  return Math.max(available, 0);
}
