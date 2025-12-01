// lib/demoStorage.ts

const DEMO_ACCOUNTS_KEY = 'finance-demo-accounts';
const DEMO_EXPENSES_KEY = 'finance-demo-expenses';

export function saveDemoAccounts(data: unknown) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(DEMO_ACCOUNTS_KEY, JSON.stringify(data));
}

export function loadDemoAccounts<T>(fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const raw = window.sessionStorage.getItem(DEMO_ACCOUNTS_KEY);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveDemoExpenses(data: unknown) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(DEMO_EXPENSES_KEY, JSON.stringify(data));
}

export function loadDemoExpenses<T>(fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const raw = window.sessionStorage.getItem(DEMO_EXPENSES_KEY);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function clearDemoData() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(DEMO_ACCOUNTS_KEY);
  window.sessionStorage.removeItem(DEMO_EXPENSES_KEY);
}
