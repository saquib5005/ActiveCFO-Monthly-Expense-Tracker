import { describe, expect, it } from "vitest";
import { calculateDashboard, listRows } from "./activecfo";

describe("ActiveCFO dashboard calculations", () => {
  it("computes virtual balance from opening balance, income, and expenses", () => {
    const summary = calculateDashboard({
      setting: { opening_virtual_balance: 1000, target_emergency_months: 6 },
      ledger: [
        { id: "income", profile_code: "saquib", entry_date: "2026-08-01", entry_type: "INCOME", bucket: "INCOME", category: "Salary", description: "Salary", amount: 5000, payment_method: null, notes: null, created_at: "2026-08-01T00:00:00Z" },
        { id: "need", profile_code: "saquib", entry_date: "2026-08-02", entry_type: "EXPENSE", bucket: "NEEDS", category: "Fuel", description: "Fuel", amount: 750, payment_method: null, notes: null, created_at: "2026-08-02T00:00:00Z" },
        { id: "want", profile_code: "saquib", entry_date: "2026-08-03", entry_type: "EXPENSE", bucket: "WANTS", category: "Entertainment", description: "Film", amount: 250, payment_method: null, notes: null, created_at: "2026-08-03T00:00:00Z" },
      ],
      investments: [],
      thresholds: [{ id: "threshold", bucket: "WANTS", category: "Entertainment", threshold_amount: 500, warning_percentage: 80 }],
    });

    expect(summary.virtualBalance).toBe(5000);
    expect(summary.expenses).toBe(1000);
    expect(summary.wantsPercentage).toBe(50);
  });

  it("exposes exactly the two supported profile codes from Supabase", async () => {
    const profiles = await listRows<{ code: string }>("activecfo_profiles", undefined, "order=code.asc");
    expect(profiles.map((profile) => profile.code)).toEqual(["rahat", "saquib"]);
  });
});
