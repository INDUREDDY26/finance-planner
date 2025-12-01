'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

export interface DemoAccount {
  id: string;
  name: string;
  start_date: string; // yyyy-mm-dd
  initial_amount: number;
  monthly_contribution: number;
  annual_return_rate: number | null;
  reinvest_dividends: boolean;
}

export interface DemoExpense {
  id: string;
  name: string;
  amount: number;
  due_date: string; // yyyy-mm-dd
  account_id: string | null;
  is_recurring: boolean;
}

const DEMO_ACCOUNTS_KEY = 'fp_demo_accounts_v1';
const DEMO_EXPENSES_KEY = 'fp_demo_expenses_v1';

type DemoContextValue = {
  accounts: DemoAccount[];
  setAccounts: React.Dispatch<React.SetStateAction<DemoAccount[]>>;
  expenses: DemoExpense[];
  setExpenses: React.Dispatch<React.SetStateAction<DemoExpense[]>>;
  loaded: boolean;
};

const DemoContext = createContext<DemoContextValue | undefined>(undefined);

function loadFromSession<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const raw = window.sessionStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<DemoAccount[]>([]);
  const [expenses, setExpenses] = useState<DemoExpense[]>([]);
  const [loaded, setLoaded] = useState(false);

  // initial load
  useEffect(() => {
    const todayIso = new Date().toISOString().slice(0, 10);

    const defaultAccounts: DemoAccount[] = [
      {
        id: 'demo-hysa',
        name: 'Demo HYSA',
        start_date: todayIso,
        initial_amount: 5000,
        monthly_contribution: 200,
        annual_return_rate: 5,
        reinvest_dividends: true,
      },
    ];

    const defaultExpenses: DemoExpense[] = [];

    setAccounts(loadFromSession(DEMO_ACCOUNTS_KEY, defaultAccounts));
    setExpenses(loadFromSession(DEMO_EXPENSES_KEY, defaultExpenses));
    setLoaded(true);
  }, []);

  // persist when changed
  useEffect(() => {
    if (!loaded || typeof window === 'undefined') return;
    window.sessionStorage.setItem(DEMO_ACCOUNTS_KEY, JSON.stringify(accounts));
  }, [accounts, loaded]);

  useEffect(() => {
    if (!loaded || typeof window === 'undefined') return;
    window.sessionStorage.setItem(DEMO_EXPENSES_KEY, JSON.stringify(expenses));
  }, [expenses, loaded]);

  return (
    <DemoContext.Provider
      value={{ accounts, setAccounts, expenses, setExpenses, loaded }}
    >
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) {
    throw new Error('useDemo must be used inside <DemoProvider>');
  }
  return ctx;
}
