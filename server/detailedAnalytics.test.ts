import { describe, expect, it } from "vitest";
import { createDetailedMonthlyAnalytics, createTrailingTrend } from "./detailedAnalytics";

const ledger = [
  { id: "income", profile_code: "saquib" as const, entry_date: "2026-08-01", entry_type: "INCOME" as const, bucket: "INCOME" as const, category: "Salary", description: "Salary", amount: 10000, payment_method: null, notes: null, created_at: "2026-08-01T00:00:00Z" },
  { id: "rent", profile_code: "saquib" as const, entry_date: "2026-08-02", entry_type: "EXPENSE" as const, bucket: "NEEDS" as const, category: "Housing", description: "Rent", amount: 3000, payment_method: null, notes: null, created_at: "2026-08-02T00:00:00Z" },
  { id: "dinner", profile_code: "saquib" as const, entry_date: "2026-08-02", entry_type: "EXPENSE" as const, bucket: "WANTS" as const, category: "Dining", description: "Dinner", amount: 500, payment_method: null, notes: null, created_at: "2026-08-02T00:00:00Z" },
];

describe("detailed monthly analytics", () => {
  it("uses saved records for budget, savings, hierarchy, cumulative chart, and heatmap values", () => {
    const analytics = createDetailedMonthlyAnalytics({
      monthStart: "2026-08-01",
      ledger,
      thresholds: [{ id: "housing", bucket: "NEEDS", category: "Housing", threshold_amount: 4000 }],
    });

    expect(analytics.totalExpenses).toBe(3500);
    expect(analytics.netCashFlow).toBe(6500);
    expect(analytics.plannedBudget).toBe(4000);
    expect(analytics.budgetConsumption).toBe(88);
    expect(analytics.savingsTarget).toBe(2000);
    expect(analytics.variance).toEqual(expect.arrayContaining([
      expect.objectContaining({ category: "Housing", variance: 1000 }),
      expect.objectContaining({ category: "Dining", budgeted: 0, variance: -500 }),
    ]));
    expect(analytics.accumulation.find((row) => row.day === "02")).toMatchObject({ needs: 3000, wants: 500 });
    expect(analytics.heatmap.find((row) => row.day === "02")).toMatchObject({ amount: 3500, intensity: 4 });
    expect(analytics.hierarchy[0]).toMatchObject({ name: "NEEDS", categories: [expect.objectContaining({ name: "Housing", descriptions: [expect.objectContaining({ name: "Rent", value: 3000 })] })] });
  });

  it("creates a twelve-month trend with zero values only when no rows exist in that month", () => {
    const trend = createTrailingTrend([...ledger, { id: "may", profile_code: "saquib" as const, entry_date: "2026-05-01", entry_type: "INCOME" as const, bucket: "INCOME" as const, category: "Salary", description: "Salary", amount: 9000, payment_method: null, notes: null, created_at: "2026-05-01T00:00:00Z" }], 2026, 8);
    expect(trend).toHaveLength(12);
    expect(trend.find((row) => row.key === "2026-05")).toMatchObject({ income: 9000, expenses: 0 });
    expect(trend.find((row) => row.key === "2026-08")).toMatchObject({ income: 10000, expenses: 3500 });
  });
});
