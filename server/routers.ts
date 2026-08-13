import { z } from "zod";
import {
  createRow,
  deleteRow,
  getDashboard,
  idSchema,
  listRows,
  monthSchema,
  profileCodeSchema,
  supabaseRequest,
  updateRow,
} from "./activecfo";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

const textField = z.string().trim().min(1).max(160);
const optionalText = z.string().trim().max(2000).optional().nullable();
const money = z.coerce.number().min(0).max(999999999999);
const positiveMoney = z.coerce.number().positive().max(999999999999);
const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const ledgerCreateSchema = z.object({
  profileCode: profileCodeSchema,
  entryDate: dateField,
  entryType: z.enum(["INCOME", "EXPENSE"]),
  bucket: z.enum(["INCOME", "NEEDS", "WANTS", "INVESTMENT", "OTHER"]),
  category: textField,
  description: textField,
  amount: positiveMoney,
  paymentMethod: optionalText,
  notes: optionalText,
});

const investmentSchema = z.object({
  profileCode: profileCodeSchema,
  recordType: z.enum(["EMERGENCY_FUND", "MUTUAL_FUND", "ETF", "CRYPTO", "CUSTOM"]),
  name: textField,
  allocationDate: dateField,
  units: z.coerce.number().min(0).optional().nullable(),
  costBasis: money,
  currentValue: money.optional().nullable(),
  platform: optionalText,
  notes: optionalText,
  isActive: z.boolean().default(true),
});

const insuranceSchema = z.object({
  profileCode: profileCodeSchema,
  insuranceType: z.enum(["TERM", "HEALTH", "CORPORATE"]),
  provider: textField,
  policyNumber: optionalText,
  coverAmount: money,
  premiumAmount: money,
  premiumFrequency: z.enum(["MONTHLY", "QUARTERLY", "SEMI_ANNUAL", "ANNUAL"]),
  renewalDate: dateField.optional().nullable(),
  coveredMembers: optionalText,
  notes: optionalText,
  isActive: z.boolean().default(true),
});

const guardrailSchema = z.object({
  profileCode: profileCodeSchema,
  guardrailType: z.enum(["SPEND_CAP", "BALANCE_FLOOR", "EMERGENCY_RUNWAY", "INVESTMENT_CAP", "INSURANCE_REVIEW"]),
  label: textField,
  category: optionalText,
  thresholdAmount: money.optional().nullable(),
  thresholdPercentage: z.coerce.number().min(0).max(100).optional().nullable(),
  status: z.enum(["ACTIVE", "PAUSED"]).default("ACTIVE"),
  notes: optionalText,
});

const strategySchema = z.object({
  profileCode: profileCodeSchema,
  title: textField,
  area: z.enum(["NEEDS", "WANTS", "INVESTMENT", "INSURANCE", "CASHFLOW"]),
  cadence: z.enum(["WEEKLY", "MONTHLY", "QUARTERLY", "ANNUAL"]),
  triggerText: optionalText,
  actionText: textField,
  status: z.enum(["ACTIVE", "PAUSED", "COMPLETE"]).default("ACTIVE"),
});

const signalSchema = z.object({
  profileCode: profileCodeSchema,
  severity: z.enum(["INFO", "ATTENTION", "ALERT"]),
  title: textField,
  message: z.string().trim().min(1).max(1000),
  relatedCategory: optionalText,
  isResolved: z.boolean().default(false),
});

const helpSchema = z.object({
  section: z.enum(["GETTING_STARTED", "MONTHLY_SETUP", "LEDGER", "INVESTMENTS", "GUARDRAILS"]),
  slug: z.string().trim().min(1).max(80).regex(/^[a-z0-9-]+$/),
  title: textField,
  summary: z.string().trim().min(1).max(500),
  body: z.string().trim().min(1).max(6000),
});

function withoutUndefined(payload: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
}

export const appRouter = router({
  system: systemRouter,
  activecfo: router({
    profiles: publicProcedure.query(async () => listRows<{ code: "saquib" | "rahat"; display_name: string }>("activecfo_profiles", undefined, "order=display_name.asc")),
    dashboard: publicProcedure.input(z.object({ profileCode: profileCodeSchema, monthStart: monthSchema })).query(({ input }) => getDashboard(input.profileCode, input.monthStart)),
    monthlySettings: router({
      get: publicProcedure.input(z.object({ profileCode: profileCodeSchema, monthStart: monthSchema })).query(async ({ input }) => {
        const rows = await supabaseRequest<Record<string, unknown>[]>(`/activecfo_monthly_settings?select=*&profile_code=eq.${input.profileCode}&month_start=eq.${input.monthStart}&limit=1`);
        return rows[0] ?? null;
      }),
      upsert: publicProcedure.input(z.object({ profileCode: profileCodeSchema, monthStart: monthSchema, openingVirtualBalance: money, targetEmergencyMonths: z.coerce.number().int().min(1).max(60), notes: optionalText })).mutation(async ({ input }) => {
        const rows = await supabaseRequest<Record<string, unknown>[]>(`/activecfo_monthly_settings?on_conflict=profile_code,month_start`, {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates,return=representation" },
          body: JSON.stringify({ profile_code: input.profileCode, month_start: input.monthStart, opening_virtual_balance: input.openingVirtualBalance, target_emergency_months: input.targetEmergencyMonths, notes: input.notes }),
        });
        return rows[0];
      }),
    }),
    thresholds: router({
      list: publicProcedure.input(z.object({ profileCode: profileCodeSchema, monthStart: monthSchema })).query(({ input }) => supabaseRequest<Record<string, unknown>[]>(`/activecfo_thresholds?select=*&profile_code=eq.${input.profileCode}&month_start=eq.${input.monthStart}&order=bucket.asc,category.asc`)),
      upsert: publicProcedure.input(z.object({ profileCode: profileCodeSchema, monthStart: monthSchema, bucket: z.enum(["NEEDS", "WANTS", "INVESTMENT"]), category: textField, thresholdAmount: money, warningPercentage: z.coerce.number().min(1).max(100), notes: optionalText })).mutation(async ({ input }) => {
        const rows = await supabaseRequest<Record<string, unknown>[]>(`/activecfo_thresholds?on_conflict=profile_code,month_start,bucket,category`, { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify({ profile_code: input.profileCode, month_start: input.monthStart, bucket: input.bucket, category: input.category, threshold_amount: input.thresholdAmount, warning_percentage: input.warningPercentage, notes: input.notes }) });
        return rows[0];
      }),
      remove: publicProcedure.input(z.object({ id: idSchema })).mutation(({ input }) => deleteRow("activecfo_thresholds", input.id)),
    }),
    ledger: router({
      list: publicProcedure.input(z.object({ profileCode: profileCodeSchema })).query(({ input }) => listRows("activecfo_ledger_entries", input.profileCode, "order=entry_date.desc,created_at.desc")),
      create: publicProcedure.input(ledgerCreateSchema).mutation(({ input }) => createRow("activecfo_ledger_entries", { profile_code: input.profileCode, entry_date: input.entryDate, entry_type: input.entryType, bucket: input.bucket, category: input.category, description: input.description, amount: input.amount, payment_method: input.paymentMethod, notes: input.notes })),
      update: publicProcedure.input(ledgerCreateSchema.partial().extend({ id: idSchema })).mutation(({ input }) => updateRow("activecfo_ledger_entries", input.id, withoutUndefined({ profile_code: input.profileCode, entry_date: input.entryDate, entry_type: input.entryType, bucket: input.bucket, category: input.category, description: input.description, amount: input.amount, payment_method: input.paymentMethod, notes: input.notes }))),
      remove: publicProcedure.input(z.object({ id: idSchema })).mutation(({ input }) => deleteRow("activecfo_ledger_entries", input.id)),
    }),
    investments: router({
      list: publicProcedure.input(z.object({ profileCode: profileCodeSchema })).query(({ input }) => listRows("activecfo_investment_records", input.profileCode, "order=allocation_date.desc")),
      create: publicProcedure.input(investmentSchema).mutation(({ input }) => createRow("activecfo_investment_records", { profile_code: input.profileCode, record_type: input.recordType, name: input.name, allocation_date: input.allocationDate, units: input.units, cost_basis: input.costBasis, current_value: input.currentValue, platform: input.platform, notes: input.notes, is_active: input.isActive })),
      update: publicProcedure.input(investmentSchema.partial().extend({ id: idSchema })).mutation(({ input }) => updateRow("activecfo_investment_records", input.id, withoutUndefined({ profile_code: input.profileCode, record_type: input.recordType, name: input.name, allocation_date: input.allocationDate, units: input.units, cost_basis: input.costBasis, current_value: input.currentValue, platform: input.platform, notes: input.notes, is_active: input.isActive }))),
      remove: publicProcedure.input(z.object({ id: idSchema })).mutation(({ input }) => deleteRow("activecfo_investment_records", input.id)),
    }),
    insurance: router({
      list: publicProcedure.input(z.object({ profileCode: profileCodeSchema })).query(({ input }) => listRows("activecfo_insurance_records", input.profileCode, "order=renewal_date.asc.nullslast")),
      create: publicProcedure.input(insuranceSchema).mutation(({ input }) => createRow("activecfo_insurance_records", { profile_code: input.profileCode, insurance_type: input.insuranceType, provider: input.provider, policy_number: input.policyNumber, cover_amount: input.coverAmount, premium_amount: input.premiumAmount, premium_frequency: input.premiumFrequency, renewal_date: input.renewalDate, covered_members: input.coveredMembers, notes: input.notes, is_active: input.isActive })),
      update: publicProcedure.input(insuranceSchema.partial().extend({ id: idSchema })).mutation(({ input }) => updateRow("activecfo_insurance_records", input.id, withoutUndefined({ profile_code: input.profileCode, insurance_type: input.insuranceType, provider: input.provider, policy_number: input.policyNumber, cover_amount: input.coverAmount, premium_amount: input.premiumAmount, premium_frequency: input.premiumFrequency, renewal_date: input.renewalDate, covered_members: input.coveredMembers, notes: input.notes, is_active: input.isActive }))),
      remove: publicProcedure.input(z.object({ id: idSchema })).mutation(({ input }) => deleteRow("activecfo_insurance_records", input.id)),
    }),
    guardrails: router({
      list: publicProcedure.input(z.object({ profileCode: profileCodeSchema })).query(({ input }) => listRows("activecfo_guardrails", input.profileCode, "order=created_at.desc")),
      create: publicProcedure.input(guardrailSchema).mutation(({ input }) => createRow("activecfo_guardrails", { profile_code: input.profileCode, guardrail_type: input.guardrailType, label: input.label, category: input.category, threshold_amount: input.thresholdAmount, threshold_percentage: input.thresholdPercentage, status: input.status, notes: input.notes })),
      update: publicProcedure.input(guardrailSchema.partial().extend({ id: idSchema })).mutation(({ input }) => updateRow("activecfo_guardrails", input.id, withoutUndefined({ profile_code: input.profileCode, guardrail_type: input.guardrailType, label: input.label, category: input.category, threshold_amount: input.thresholdAmount, threshold_percentage: input.thresholdPercentage, status: input.status, notes: input.notes }))),
      remove: publicProcedure.input(z.object({ id: idSchema })).mutation(({ input }) => deleteRow("activecfo_guardrails", input.id)),
    }),
    strategies: router({
      list: publicProcedure.input(z.object({ profileCode: profileCodeSchema })).query(({ input }) => listRows("activecfo_strategies", input.profileCode, "order=created_at.desc")),
      create: publicProcedure.input(strategySchema).mutation(({ input }) => createRow("activecfo_strategies", { profile_code: input.profileCode, title: input.title, area: input.area, cadence: input.cadence, trigger_text: input.triggerText, action_text: input.actionText, status: input.status })),
      update: publicProcedure.input(strategySchema.partial().extend({ id: idSchema })).mutation(({ input }) => updateRow("activecfo_strategies", input.id, withoutUndefined({ profile_code: input.profileCode, title: input.title, area: input.area, cadence: input.cadence, trigger_text: input.triggerText, action_text: input.actionText, status: input.status }))),
      remove: publicProcedure.input(z.object({ id: idSchema })).mutation(({ input }) => deleteRow("activecfo_strategies", input.id)),
    }),
    signals: router({
      list: publicProcedure.input(z.object({ profileCode: profileCodeSchema })).query(({ input }) => listRows("activecfo_signals", input.profileCode, "order=is_resolved.asc,created_at.desc")),
      create: publicProcedure.input(signalSchema).mutation(({ input }) => createRow("activecfo_signals", { profile_code: input.profileCode, severity: input.severity, title: input.title, message: input.message, related_category: input.relatedCategory, is_resolved: input.isResolved })),
      update: publicProcedure.input(signalSchema.partial().extend({ id: idSchema })).mutation(({ input }) => updateRow("activecfo_signals", input.id, withoutUndefined({ profile_code: input.profileCode, severity: input.severity, title: input.title, message: input.message, related_category: input.relatedCategory, is_resolved: input.isResolved }))),
      remove: publicProcedure.input(z.object({ id: idSchema })).mutation(({ input }) => deleteRow("activecfo_signals", input.id)),
    }),
    help: router({
      list: publicProcedure.query(() => supabaseRequest<Record<string, unknown>[]>("/activecfo_help_articles?select=*&order=section.asc,title.asc")),
      create: publicProcedure.input(helpSchema).mutation(({ input }) => createRow("activecfo_help_articles", { section: input.section, slug: input.slug, title: input.title, summary: input.summary, body: input.body })),
      update: publicProcedure.input(helpSchema.partial().extend({ id: idSchema })).mutation(({ input }) => updateRow("activecfo_help_articles", input.id, withoutUndefined({ section: input.section, slug: input.slug, title: input.title, summary: input.summary, body: input.body }))),
      remove: publicProcedure.input(z.object({ id: idSchema })).mutation(({ input }) => deleteRow("activecfo_help_articles", input.id)),
    }),
  }),
});

export type AppRouter = typeof appRouter;
