// Security boundary: every Supabase operation in ActiveCFO stays server-side.
// The frontend only speaks to the public tRPC procedures; it never receives a database key.
import { z } from "zod";

const SUPABASE_URL = "https://himcjclfbzoposhxmlfg.supabase.co";
const REST_BASE = `${SUPABASE_URL}/rest/v1`;

export const profileCodeSchema = z.enum(["saquib", "rahat"]);
export const monthSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const idSchema = z.string().uuid();

export type LedgerEntry = {
  id: string;
  profile_code: "saquib" | "rahat";
  entry_date: string;
  entry_type: "INCOME" | "EXPENSE";
  bucket: "INCOME" | "NEEDS" | "WANTS" | "INVESTMENT" | "OTHER";
  category: string;
  description: string;
  amount: number | string;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
};

export type InvestmentRecord = {
  id: string;
  profile_code: "saquib" | "rahat";
  record_type: "EMERGENCY_FUND" | "MUTUAL_FUND" | "ETF" | "CRYPTO" | "CUSTOM";
  name: string;
  allocation_date: string;
  units: number | string | null;
  cost_basis: number | string;
  current_value: number | string | null;
  platform: string | null;
  notes: string | null;
  is_active: boolean;
};

type Threshold = {
  id: string;
  bucket: "NEEDS" | "WANTS" | "INVESTMENT";
  category: string;
  threshold_amount: number | string;
  warning_percentage: number | string;
};

type MonthlySetting = { opening_virtual_balance: number | string; target_emergency_months: number | string } | null;

function num(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

function nextMonth(monthStart: string) {
  const [year, month] = monthStart.split("-").map(Number);
  return new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
}

function monthStartFromParts(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

function supabaseHeaders(extra: HeadersInit = {}) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) throw new Error("ActiveCFO Supabase server credential is not configured.");
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

export async function supabaseRequest<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(`${REST_BASE}${path}`, {
    ...init,
    headers: supabaseHeaders(init.headers),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Supabase request failed (${response.status}): ${text || response.statusText}`);
  }
  return (text ? JSON.parse(text) : null) as T;
}

function encodeFilter(value: string) {
  return encodeURIComponent(value);
}

export async function listRows<T>(table: string, profileCode?: "saquib" | "rahat", additional = "") {
  const parts = ["select=*"];
  if (profileCode) parts.push(`profile_code=eq.${encodeFilter(profileCode)}`);
  if (additional) parts.push(additional);
  return supabaseRequest<T[]>(`/${table}?${parts.join("&")}`);
}

export async function createRow<T>(table: string, payload: Record<string, unknown>) {
  const rows = await supabaseRequest<T[]>(`/${table}`, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(payload),
  });
  return rows[0];
}

export async function updateRow<T>(table: string, id: string, payload: Record<string, unknown>) {
  const rows = await supabaseRequest<T[]>(`/${table}?id=eq.${encodeFilter(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(payload),
  });
  return rows[0];
}

export async function deleteRow(table: string, id: string) {
  await supabaseRequest(`/${table}?id=eq.${encodeFilter(id)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  return { id };
}

// Calculation boundary: dashboard values are deterministic summaries of saved records,
// not bank reconciliations, forecasts, investment advice, or automatically sourced data.
export function calculateDashboard(input: {
  setting: MonthlySetting;
  ledger: LedgerEntry[];
  investments: InvestmentRecord[];
  thresholds: Threshold[];
}) {
  const openingBalance = num(input.setting?.opening_virtual_balance);
  const income = input.ledger.filter((entry) => entry.entry_type === "INCOME").reduce((sum, entry) => sum + num(entry.amount), 0);
  const expenses = input.ledger.filter((entry) => entry.entry_type === "EXPENSE").reduce((sum, entry) => sum + num(entry.amount), 0);
  const virtualBalance = openingBalance + income - expenses;
  const investedCapital = input.investments.filter((record) => record.is_active).reduce((sum, record) => sum + num(record.cost_basis), 0);
  const investmentValue = input.investments.filter((record) => record.is_active).reduce((sum, record) => sum + num(record.current_value ?? record.cost_basis), 0);
  const emergencyFund = input.investments.filter((record) => record.is_active && record.record_type === "EMERGENCY_FUND").reduce((sum, record) => sum + num(record.current_value ?? record.cost_basis), 0);
  const needsSpent = input.ledger.filter((entry) => entry.entry_type === "EXPENSE" && entry.bucket === "NEEDS").reduce((sum, entry) => sum + num(entry.amount), 0);
  const wantsSpent = input.ledger.filter((entry) => entry.entry_type === "EXPENSE" && entry.bucket === "WANTS").reduce((sum, entry) => sum + num(entry.amount), 0);
  const investmentSpent = input.ledger.filter((entry) => entry.entry_type === "EXPENSE" && entry.bucket === "INVESTMENT").reduce((sum, entry) => sum + num(entry.amount), 0);
  const thresholdSummary = input.thresholds.map((threshold) => {
    const spent = input.ledger
      .filter((entry) => entry.entry_type === "EXPENSE" && entry.bucket === threshold.bucket && entry.category === threshold.category)
      .reduce((sum, entry) => sum + num(entry.amount), 0);
    const limit = num(threshold.threshold_amount);
    const usedPercentage = limit > 0 ? Math.round((spent / limit) * 100) : 0;
    return { ...threshold, spent, limit, usedPercentage };
  });
  const wantsLimit = input.thresholds.filter((threshold) => threshold.bucket === "WANTS").reduce((sum, threshold) => sum + num(threshold.threshold_amount), 0);
  const wantsPercentage = wantsLimit > 0 ? Math.round((wantsSpent / wantsLimit) * 100) : 0;

  return {
    openingBalance,
    income,
    expenses,
    virtualBalance,
    investedCapital,
    investmentValue,
    netWorth: virtualBalance + investmentValue,
    emergencyFund,
    needsSpent,
    wantsSpent,
    investmentSpent,
    wantsLimit,
    wantsPercentage,
    thresholdSummary,
  };
}

// Analysis boundary: charts aggregate only records saved in the selected calendar month.
// Zero-value days are derived from the calendar so an empty day never becomes fabricated spend.
export function calculateGlobalAnalytics(input: { ledger: LedgerEntry[]; thresholds: Threshold[]; monthStart: string }) {
  const [year, month] = input.monthStart.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const daySpending = new Map(Array.from({ length: daysInMonth }, (_, index) => [String(index + 1).padStart(2, "0"), 0]));
  const bucketSpending = new Map(["NEEDS", "WANTS", "INVESTMENT", "OTHER"].map((bucket) => [bucket, 0]));
  const categorySpending = new Map<string, number>();
  const expenses = input.ledger.filter((entry) => entry.entry_type === "EXPENSE");
  const income = input.ledger.filter((entry) => entry.entry_type === "INCOME").reduce((sum, entry) => sum + num(entry.amount), 0);

  expenses.forEach((entry) => {
    const amount = num(entry.amount);
    const day = entry.entry_date.slice(8, 10);
    daySpending.set(day, (daySpending.get(day) ?? 0) + amount);
    bucketSpending.set(entry.bucket, (bucketSpending.get(entry.bucket) ?? 0) + amount);
    categorySpending.set(entry.category, (categorySpending.get(entry.category) ?? 0) + amount);
  });

  const totalSpent = expenses.reduce((sum, entry) => sum + num(entry.amount), 0);
  const activeSpendingDays = Array.from(daySpending.values()).filter((amount) => amount > 0).length;
  const categoryRows = Array.from(categorySpending.entries())
    .map(([category, amount]) => ({ category, amount, percentage: totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0 }))
    .sort((left, right) => right.amount - left.amount);
  const thresholdPerformance = input.thresholds.map((threshold) => {
    const limit = num(threshold.threshold_amount);
    const spent = categorySpending.get(threshold.category) ?? 0;
    return { id: threshold.id, bucket: threshold.bucket, category: threshold.category, limit, spent, percentage: limit > 0 ? Math.round((spent / limit) * 100) : 0 };
  }).sort((left, right) => right.percentage - left.percentage);

  return {
    monthStart: input.monthStart,
    totalSpent,
    totalIncome: income,
    netCashFlow: income - totalSpent,
    transactionCount: expenses.length,
    activeSpendingDays,
    averageSpendOnActiveDays: activeSpendingDays > 0 ? Math.round(totalSpent / activeSpendingDays) : 0,
    topCategory: categoryRows[0] ?? null,
    bucketSpending: ["NEEDS", "WANTS", "INVESTMENT", "OTHER"].map((bucket) => ({ bucket, amount: bucketSpending.get(bucket) ?? 0 })),
    categorySpending: categoryRows,
    dailySpending: Array.from(daySpending.entries()).map(([day, amount]) => ({ day, amount })),
    thresholdPerformance,
  };
}

export async function getDashboard(profileCode: "saquib" | "rahat", monthStart: string) {
  const monthEnd = nextMonth(monthStart);
  const [settingRows, ledger, investments, thresholds, insurances, guardrails, strategies, storedSignals] = await Promise.all([
    supabaseRequest<MonthlySetting[]>(`/activecfo_monthly_settings?select=*&profile_code=eq.${profileCode}&month_start=eq.${monthStart}&limit=1`),
    supabaseRequest<LedgerEntry[]>(`/activecfo_ledger_entries?select=*&profile_code=eq.${profileCode}&entry_date=gte.${monthStart}&entry_date=lt.${monthEnd}&order=entry_date.desc,created_at.desc`),
    listRows<InvestmentRecord>("activecfo_investment_records", profileCode, "is_active=eq.true&order=allocation_date.desc"),
    supabaseRequest<Threshold[]>(`/activecfo_thresholds?select=*&profile_code=eq.${profileCode}&month_start=eq.${monthStart}&order=bucket.asc,category.asc`),
    listRows<Record<string, unknown>>("activecfo_insurance_records", profileCode, "is_active=eq.true&order=renewal_date.asc.nullslast"),
    listRows<Record<string, unknown>>("activecfo_guardrails", profileCode, "order=created_at.desc"),
    listRows<Record<string, unknown>>("activecfo_strategies", profileCode, "order=created_at.desc"),
    listRows<Record<string, unknown>>("activecfo_signals", profileCode, "order=is_resolved.asc,created_at.desc"),
  ]);
  const summary = calculateDashboard({ setting: settingRows[0] ?? null, ledger, investments, thresholds });
  const computedSignals = summary.thresholdSummary
    .filter((threshold) => threshold.limit > 0 && threshold.usedPercentage >= num(threshold.warning_percentage))
    .map((threshold) => ({
      id: `computed-${threshold.id}`,
      severity: threshold.usedPercentage >= 100 ? "ALERT" : "ATTENTION",
      title: `${threshold.category} is at ${threshold.usedPercentage}%`,
      message: `${threshold.category} has used ${threshold.spent} of the ${threshold.limit} threshold this month.`,
      related_category: threshold.category,
      is_resolved: false,
      computed: true,
    }));
  return {
    monthStart,
    setting: settingRows[0] ?? null,
    ledger,
    investments,
    thresholds,
    insurances,
    guardrails,
    strategies,
    signals: [...computedSignals, ...storedSignals],
    summary,
  };
}

export async function getGlobalDashboard(profileCode: "saquib" | "rahat", year: number, month: number) {
  const monthStart = monthStartFromParts(year, month);
  const dashboard = await getDashboard(profileCode, monthStart);
  return {
    profileCode,
    year,
    month,
    summary: dashboard.summary,
    analytics: calculateGlobalAnalytics({ ledger: dashboard.ledger, thresholds: dashboard.thresholds, monthStart }),
  };
}
