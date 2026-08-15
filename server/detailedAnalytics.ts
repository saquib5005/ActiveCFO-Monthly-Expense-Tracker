import type { LedgerEntry } from "./activecfo";

type Bucket = "NEEDS" | "WANTS" | "INVESTMENT" | "OTHER";
type Threshold = { id: string; bucket: "NEEDS" | "WANTS" | "INVESTMENT"; category: string; threshold_amount: number | string };

const BUCKETS: Bucket[] = ["NEEDS", "WANTS", "INVESTMENT", "OTHER"];
const asNumber = (value: number | string | null | undefined) => Number(value ?? 0);
const asBucket = (value: LedgerEntry["bucket"]): Bucket => value === "INCOME" ? "OTHER" : value;

/**
 * Produces visual-ready values from persisted rows only. Reference percentages are display
 * comparators, not financial recommendations; empty days remain zero because no row exists.
 */
export function createDetailedMonthlyAnalytics(input: { ledger: LedgerEntry[]; thresholds: Threshold[]; monthStart: string }) {
  const [year, month] = input.monthStart.split("-").map(Number);
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const daily = Array.from({ length: days }, (_, index) => ({ day: String(index + 1).padStart(2, "0"), NEEDS: 0, WANTS: 0, INVESTMENT: 0, OTHER: 0 }));
  const dailyIndex = new Map(daily.map((row) => [row.day, row]));
  const buckets = new Map<Bucket, number>(BUCKETS.map((bucket) => [bucket, 0]));
  const categories = new Map<string, { bucket: Bucket; category: string; actual: number }>();
  const descriptors = new Map<string, { bucket: Bucket; category: string; description: string; actual: number }>();
  const expenses = input.ledger.filter((entry) => entry.entry_type === "EXPENSE");
  const totalIncome = input.ledger.filter((entry) => entry.entry_type === "INCOME").reduce((sum, entry) => sum + asNumber(entry.amount), 0);

  expenses.forEach((entry) => {
    const amount = asNumber(entry.amount);
    const bucket = asBucket(entry.bucket);
    const day = dailyIndex.get(entry.entry_date.slice(8, 10));
    if (day) day[bucket] += amount;
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + amount);
    const categoryKey = `${bucket}::${entry.category}`;
    const description = entry.description.trim() || "Unlabelled entry";
    const descriptorKey = `${categoryKey}::${description}`;
    const existingCategory = categories.get(categoryKey);
    categories.set(categoryKey, { bucket, category: entry.category, actual: (existingCategory?.actual ?? 0) + amount });
    const existingDescriptor = descriptors.get(descriptorKey);
    descriptors.set(descriptorKey, { bucket, category: entry.category, description, actual: (existingDescriptor?.actual ?? 0) + amount });
  });

  const totalExpenses = expenses.reduce((sum, entry) => sum + asNumber(entry.amount), 0);
  const netCashFlow = totalIncome - totalExpenses;
  const categoryRows = Array.from(categories.values()).map((row) => ({ ...row, share: totalExpenses > 0 ? Math.round((row.actual / totalExpenses) * 100) : 0 })).sort((a, b) => b.actual - a.actual);
  const budgetKeys = new Set(input.thresholds.map((threshold) => `${threshold.bucket}::${threshold.category}`));
  const variance: Array<{ id: string; bucket: Bucket; category: string; budgeted: number; actual: number; variance: number; usage: number; isBudgeted: boolean }> = input.thresholds.map((threshold) => {
    const actual = categories.get(`${threshold.bucket}::${threshold.category}`)?.actual ?? 0;
    const budgeted = asNumber(threshold.threshold_amount);
    return { id: threshold.id, bucket: threshold.bucket, category: threshold.category, budgeted, actual, variance: budgeted - actual, usage: budgeted > 0 ? Math.round((actual / budgeted) * 100) : 0, isBudgeted: true };
  });
  categoryRows.filter((row) => !budgetKeys.has(`${row.bucket}::${row.category}`)).forEach((row) => variance.push({ id: `unbudgeted-${row.bucket}-${row.category}`, bucket: row.bucket, category: row.category, budgeted: 0, actual: row.actual, variance: -row.actual, usage: 0, isBudgeted: false }));
  variance.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));

  let accumulatedNeeds = 0;
  let accumulatedWants = 0;
  let accumulatedInvestment = 0;
  let accumulatedOther = 0;
  const accumulation = daily.map((row) => {
    accumulatedNeeds += row.NEEDS;
    accumulatedWants += row.WANTS;
    accumulatedInvestment += row.INVESTMENT;
    accumulatedOther += row.OTHER;
    return { day: row.day, needs: accumulatedNeeds, wants: accumulatedWants, investment: accumulatedInvestment, other: accumulatedOther };
  });
  const dailyTotals = daily.map((row) => ({ day: row.day, amount: row.NEEDS + row.WANTS + row.INVESTMENT + row.OTHER }));
  const highestDay = Math.max(...dailyTotals.map((row) => row.amount), 0);
  const hierarchy = BUCKETS.map((bucket) => ({
    name: bucket,
    value: buckets.get(bucket) ?? 0,
    categories: categoryRows.filter((row) => row.bucket === bucket).map((category) => ({
      name: category.category,
      value: category.actual,
      descriptions: Array.from(descriptors.values()).filter((row) => row.bucket === bucket && row.category === category.category).sort((a, b) => b.actual - a.actual).map((row) => ({ name: row.description, value: row.actual })),
    })),
  })).filter((bucket) => bucket.value > 0);
  const plannedBudget = input.thresholds.reduce((sum, threshold) => sum + asNumber(threshold.threshold_amount), 0);
  const needs = buckets.get("NEEDS") ?? 0;
  const wants = buckets.get("WANTS") ?? 0;

  return {
    totalIncome,
    totalExpenses,
    netCashFlow,
    transactionCount: expenses.length,
    plannedBudget,
    budgetConsumption: plannedBudget > 0 ? Math.round((totalExpenses / plannedBudget) * 100) : 0,
    budgetRemaining: plannedBudget - totalExpenses,
    savingsTarget: totalIncome > 0 ? Math.round(totalIncome * 0.2) : 0,
    savingsRate: totalIncome > 0 ? Math.round((netCashFlow / totalIncome) * 100) : 0,
    actualSavings: netCashFlow,
    bucketMix: BUCKETS.map((bucket) => ({ bucket, amount: buckets.get(bucket) ?? 0 })),
    referenceSplit: totalIncome > 0 ? [
      { label: "Needs", target: Math.round(totalIncome * 0.5), actual: needs },
      { label: "Wants", target: Math.round(totalIncome * 0.3), actual: wants },
      { label: "Savings", target: Math.round(totalIncome * 0.2), actual: netCashFlow },
    ] : [],
    categoryRows,
    variance,
    dailyTotals,
    accumulation,
    heatmap: dailyTotals.map((row) => ({ ...row, intensity: row.amount <= 0 || highestDay === 0 ? 0 : Math.max(1, Math.ceil((row.amount / highestDay) * 4)) })),
    hierarchy,
  };
}

export function createTrailingTrend(ledger: LedgerEntry[], year: number, month: number) {
  const series = new Map<string, { key: string; label: string; income: number; expenses: number }>();
  for (let offset = 11; offset >= 0; offset -= 1) {
    const cursor = new Date(Date.UTC(year, month - 1 - offset, 1));
    const key = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`;
    series.set(key, { key, label: new Intl.DateTimeFormat("en-IN", { month: "short", year: "2-digit", timeZone: "UTC" }).format(cursor), income: 0, expenses: 0 });
  }
  ledger.forEach((entry) => {
    const row = series.get(entry.entry_date.slice(0, 7));
    if (!row) return;
    if (entry.entry_type === "INCOME") row.income += asNumber(entry.amount);
    if (entry.entry_type === "EXPENSE") row.expenses += asNumber(entry.amount);
  });
  return Array.from(series.values());
}
