// Product boundary: this UI intentionally provides a two-profile workspace only.
// Do not introduce authentication, login redirects, or browser Supabase credentials here.
import { trpc } from "@/lib/trpc";
import DetailedAnalyticsDashboard from "@/components/DetailedAnalyticsDashboard";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  ArrowUpRight,
  BadgeCheck,
  BookOpen,
  CircleDollarSign,
  CircleHelp,
  ClipboardList,
  CreditCard,
  Edit3,
  FilePlus2,
  HandCoins,
  HeartPulse,
  Landmark,
  Lightbulb,
  ListChecks,
  Loader2,
  Menu,
  Plus,
  Radio,
  ReceiptText,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  TrendingUp,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type ProfileCode = "saquib" | "rahat";
type ViewId = "overview" | "global" | "setup" | "ledger" | "investments" | "insurance" | "guardrails" | "strategies" | "signals" | "help";
type ModalType = "settings" | "threshold" | "ledger" | "investment" | "insurance" | "guardrail" | "strategy" | "signal" | "help";
type AnyRecord = Record<string, unknown>;
type ModalState = { type: ModalType; record?: AnyRecord } | null;

type Summary = {
  openingBalance: number;
  income: number;
  expenses: number;
  virtualBalance: number;
  investedCapital: number;
  investmentValue: number;
  netWorth: number;
  emergencyFund: number;
  needsSpent: number;
  wantsSpent: number;
  investmentSpent: number;
  wantsLimit: number;
  wantsPercentage: number;
  thresholdSummary: Array<AnyRecord & { spent: number; limit: number; usedPercentage: number }>;
};

type Dashboard = {
  setting: AnyRecord | null;
  ledger: AnyRecord[];
  investments: AnyRecord[];
  thresholds: AnyRecord[];
  insurances: AnyRecord[];
  guardrails: AnyRecord[];
  strategies: AnyRecord[];
  signals: AnyRecord[];
  summary: Summary;
};

type GlobalDashboardData = {
  profileCode: ProfileCode;
  year: number;
  month: number;
  analytics: {
    totalSpent: number;
    totalIncome: number;
    netCashFlow: number;
    transactionCount: number;
    activeSpendingDays: number;
    averageSpendOnActiveDays: number;
    topCategory: { category: string; amount: number; percentage: number } | null;
    bucketSpending: Array<{ bucket: string; amount: number }>;
    categorySpending: Array<{ category: string; amount: number; percentage: number }>;
    dailySpending: Array<{ day: string; amount: number }>;
    thresholdPerformance: Array<{ id: string; bucket: string; category: string; limit: number; spent: number; percentage: number }>;
  };
};

const CATEGORY_GROUPS = {
  NEEDS: ["Housing", "Groceries", "Utilities", "Fuel", "Transport", "Healthcare", "Education", "Insurance", "Household", "Debt repayment"],
  WANTS: ["Entertainment", "Dining", "Shopping", "Travel", "Personal care", "Subscriptions", "Gifts", "Hobbies"],
  INVESTMENT: ["Emergency Fund", "Mutual Funds", "ETFs", "Crypto", "Custom allocation"],
} as const;

const NAV_ITEMS: Array<{ id: ViewId; label: string; icon: LucideIcon; section?: string }> = [
  { id: "overview", label: "Overview", icon: Target, section: "Control center" },
  { id: "global", label: "Global dashboard", icon: TrendingUp },
  { id: "setup", label: "Monthly setup", icon: SlidersHorizontal },
  { id: "ledger", label: "Ledger", icon: ReceiptText, section: "Records" },
  { id: "investments", label: "Investments", icon: WalletCards },
  { id: "insurance", label: "Insurance", icon: HeartPulse },
  { id: "guardrails", label: "Guardrails", icon: ShieldCheck, section: "Decisions" },
  { id: "strategies", label: "Strategies", icon: Lightbulb },
  { id: "signals", label: "Signals", icon: Radio },
  { id: "help", label: "Help center", icon: CircleHelp, section: "System" },
];

function numberValue(value: unknown) {
  return Number(value ?? 0);
}

function textValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function formatCurrency(value: unknown) {
  return `₹${numberValue(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function currentMonthStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString().slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function monthLabel(monthStart: string) {
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(new Date(`${monthStart}T00:00:00`));
}

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => ({ value: index + 1, label: new Intl.DateTimeFormat("en-IN", { month: "long" }).format(new Date(Date.UTC(2026, index, 1))) }));
const CHART_COLORS = ["#65dbe3", "#b99af0", "#e1a85e", "#778cff"];

function signalTone(severity: unknown) {
  if (severity === "ALERT") return "tone-alert";
  if (severity === "ATTENTION") return "tone-attention";
  return "tone-info";
}

function bucketTone(bucket: unknown) {
  if (bucket === "WANTS") return "bucket-wants";
  if (bucket === "INVESTMENT") return "bucket-investment";
  return "bucket-needs";
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="section-label">{children}</div>;
}

function SignalDot({ tone = "cyan" }: { tone?: "cyan" | "amber" | "violet" | "red" }) {
  return <span className={`signal-dot signal-${tone}`} aria-hidden="true" />;
}

function LoadingPane() {
  return <div className="loading-pane"><Loader2 size={21} className="spin" /><span>Reading your workspace…</span></div>;
}

function EmptyState({ icon: Icon, title, body, action }: { icon: LucideIcon; title: string; body: string; action?: ReactNode }) {
  return <div className="empty-state"><div className="empty-icon"><Icon size={22} /></div><strong>{title}</strong><p>{body}</p>{action}</div>;
}

function MetricCard({ label, value, detail, icon: Icon, accent = "cyan" }: { label: string; value: string; detail: string; icon: LucideIcon; accent?: "cyan" | "amber" | "violet" }) {
  return <article className={`metric-card accent-${accent}`}><div className="metric-head"><span>{label}</span><Icon size={15} /></div><strong>{value}</strong><div className="metric-detail"><SignalDot tone={accent === "amber" ? "amber" : accent === "violet" ? "violet" : "cyan"} />{detail}</div></article>;
}

function ProfileSelect({ profileCode, onChange }: { profileCode: ProfileCode; onChange: (value: ProfileCode) => void }) {
  return <div className="profile-select"><span>WORKSPACE</span><select value={profileCode} onChange={(event) => onChange(event.target.value as ProfileCode)} aria-label="Select ActiveCFO profile"><option value="saquib">Saquib</option><option value="rahat">Rahat</option></select></div>;
}

function Sidebar({ activeView, onNavigate, profileCode, summary, open, onClose }: { activeView: ViewId; onNavigate: (view: ViewId) => void; profileCode: ProfileCode; summary: Summary; open: boolean; onClose: () => void }) {
  return <>
    {open && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={onClose} />}
    <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
      <div className="brand-lockup"><div className="brand-mark">◒</div><div><strong className="brand-word">Active<span>CFO</span></strong><small>PRIVATE WEALTH OFFICE</small></div><button className="sidebar-close" aria-label="Close navigation" onClick={onClose}><X size={17} /></button></div>
      <div className="sidebar-rule" />
      <div className="sidebar-context"><SectionLabel>ACTIVE PROFILE</SectionLabel><strong>{profileCode === "saquib" ? "Saquib" : "Rahat"}</strong><span><SignalDot /> Supabase workspace</span></div>
      <nav className="sidebar-nav" aria-label="ActiveCFO navigation">{NAV_ITEMS.map((item) => { const Icon = item.icon; return <div key={item.id}>{item.section && <SectionLabel>{item.section}</SectionLabel>}<button className={`nav-item ${activeView === item.id ? "nav-active" : ""}`} onClick={() => { onNavigate(item.id); onClose(); }}><Icon size={16} /><span>{item.label}</span>{activeView === item.id && <SignalDot />}</button></div>; })}</nav>
      <div className="sidebar-bottom"><div className="balance-card"><div className="balance-head"><span>VIRTUAL BALANCE</span><CircleDollarSign size={14} /></div><strong>{formatCurrency(summary.virtualBalance)}</strong><span>{formatCurrency(summary.income)} in · {formatCurrency(summary.expenses)} out</span></div><div className="sidebar-footer"><button aria-label="Open monthly setup" onClick={() => onNavigate("setup")}><Settings2 size={14} /></button><button aria-label="Open help center" onClick={() => onNavigate("help")}><BookOpen size={14} /></button><small>SERVER DATA</small></div></div>
    </aside>
  </>;
}

function AppHeader({ profileCode, onProfileChange, onMenu, monthStart, onMonthChange }: { profileCode: ProfileCode; onProfileChange: (value: ProfileCode) => void; onMenu: () => void; monthStart: string; onMonthChange: (value: string) => void }) {
  return <header className="topbar"><button className="mobile-menu" onClick={onMenu} aria-label="Open navigation"><Menu size={19} /></button><div className="breadcrumbs">CONTROL CENTER <span>/</span> {profileCode.toUpperCase()}</div><div className="header-actions"><label className="month-switch"><span>MONTH</span><input type="month" value={monthStart.slice(0, 7)} onChange={(event) => onMonthChange(`${event.target.value}-01`)} /></label><ProfileSelect profileCode={profileCode} onChange={onProfileChange} /></div></header>;
}

function Overview({ dashboard, profileCode, monthStart, setView, openModal }: { dashboard: Dashboard; profileCode: ProfileCode; monthStart: string; setView: (view: ViewId) => void; openModal: (type: ModalType) => void }) {
  const { summary, thresholds, ledger, investments, signals } = dashboard;
  const activeSignals = signals.filter((signal) => !Boolean(signal.is_resolved));
  return <>
    <section className="hero-panel"><img src="/manus-storage/activecfo-hero_0a3ef668.png" alt="" /><div className="hero-shade" /><div className="hero-content"><SectionLabel>OVERVIEW · {monthLabel(monthStart).toUpperCase()}</SectionLabel><h1>Make the next<br /><em>move visible.</em></h1><p>Every number comes from {profileCode === "saquib" ? "Saquib" : "Rahat"}’s Supabase records. Start with a monthly setup, then let the ledger do the counting.</p><div className="hero-actions"><button className="primary-action" onClick={() => setView("setup")}><SlidersHorizontal size={15} /> Set monthly thresholds</button><button className="secondary-action" onClick={() => openModal("ledger")}><Plus size={15} /> Add ledger entry</button></div></div><div className="hero-aside"><SectionLabel>MONTHLY WANTS</SectionLabel><strong>{summary.wantsLimit > 0 ? `${summary.wantsPercentage}%` : "—"}</strong><p>{summary.wantsLimit > 0 ? `${formatCurrency(summary.wantsSpent)} of ${formatCurrency(summary.wantsLimit)}` : "Set a wants threshold to begin."}</p><div className="progress-line"><span style={{ width: `${Math.min(summary.wantsPercentage, 100)}%` }} /></div></div><div className="hero-footer"><span>DATA / SUPABASE</span><span>NO BANK SYNC</span><span>NO LOGIN</span></div></section>
    <section className="metrics-grid"><MetricCard label="Virtual balance" value={formatCurrency(summary.virtualBalance)} detail="Opening balance + income − expenses" icon={CircleDollarSign} /><MetricCard label="Invested capital" value={formatCurrency(summary.investedCapital)} detail={`${investments.length} active record${investments.length === 1 ? "" : "s"}`} icon={Landmark} accent="violet" /><MetricCard label="Emergency fund" value={formatCurrency(summary.emergencyFund)} detail="Manual allocation records" icon={ShieldCheck} accent="amber" /><MetricCard label="Monthly outflow" value={formatCurrency(summary.expenses)} detail={`${ledger.filter((entry) => entry.entry_type === "EXPENSE").length} expense record${ledger.filter((entry) => entry.entry_type === "EXPENSE").length === 1 ? "" : "s"}`} icon={TrendingUp} /></section>
    <section className="overview-grid"><article className="panel threshold-panel"><div className="panel-head"><div><SectionLabel>THRESHOLD PULSE</SectionLabel><h2>Needs, wants & investment</h2></div><button className="text-action" onClick={() => setView("setup")}>Manage <ArrowUpRight size={14} /></button></div>{thresholds.length === 0 ? <EmptyState icon={SlidersHorizontal} title="No monthly thresholds yet" body="Add limits for detailed categories such as Fuel, Entertainment, Shopping, or your own Investment targets." action={<button className="secondary-action" onClick={() => setView("setup")}>Open monthly setup</button>} /> : <div className="threshold-list">{summary.thresholdSummary.map((threshold) => <div className="threshold-row" key={textValue(threshold.id)}><div className="threshold-row-top"><span className={`bucket-tag ${bucketTone(threshold.bucket)}`}>{textValue(threshold.bucket)}</span><strong>{textValue(threshold.category)}</strong><span>{formatCurrency(threshold.spent)} / {formatCurrency(threshold.limit)}</span></div><div className="progress-line"><span className={threshold.usedPercentage >= 100 ? "over-limit" : ""} style={{ width: `${Math.min(threshold.usedPercentage, 100)}%` }} /></div><small>{threshold.usedPercentage}% used · review at {numberValue(threshold.warning_percentage)}%</small></div>)}</div>}</article>
      <article className="panel signals-preview"><div className="panel-head"><div><SectionLabel>SIGNALS</SectionLabel><h2>What needs attention</h2></div><button className="text-action" onClick={() => setView("signals")}>Open <ArrowUpRight size={14} /></button></div>{activeSignals.length === 0 ? <EmptyState icon={BadgeCheck} title="No active signals" body="Signals will appear when a threshold reaches its configured warning point or when you add a manual reminder." /> : <div className="signal-list">{activeSignals.slice(0, 3).map((signal) => <div className="signal-row" key={textValue(signal.id)}><span className={`severity-dot ${signalTone(signal.severity)}`} /><div><strong>{textValue(signal.title)}</strong><p>{textValue(signal.message)}</p></div></div>)}</div>}</article></section>
  </>;
}

function GlobalDashboard({ data, isLoading, isError, year, month, onYearChange, onMonthChange, setView }: { data?: GlobalDashboardData; isLoading: boolean; isError: boolean; year: number; month: number; onYearChange: (year: number) => void; onMonthChange: (month: number) => void; setView: (view: ViewId) => void }) {
  const years = Array.from({ length: 31 }, (_, index) => new Date().getFullYear() - 15 + index);
  const selectedMonth = `${year}-${String(month).padStart(2, "0")}-01`;
  if (isLoading) return <LoadingPane />;
  if (isError || !data) return <EmptyState icon={CircleHelp} title="Global analysis could not load" body="Check the Supabase connection and choose the period again." />;
  const { analytics } = data;
  const hasSpending = analytics.totalSpent > 0;
  const visibleBuckets = analytics.bucketSpending.filter((row) => row.amount > 0);

  return <div className="view-stack global-view"><div className="page-heading global-heading"><div><SectionLabel>CONTROL CENTER · GLOBAL DASHBOARD</SectionLabel><h1>See the month<br /><em>as a whole.</em></h1><p>All graphs are derived from {data.profileCode === "saquib" ? "Saquib" : "Rahat"}’s saved Supabase ledger entries for the selected calendar month.</p></div><div className="global-toolbar"><label><span>YEAR</span><select value={year} onChange={(event) => onYearChange(Number(event.target.value))}>{years.map((option) => <option key={option} value={option}>{option}</option>)}</select></label><label><span>MONTH</span><select value={month} onChange={(event) => onMonthChange(Number(event.target.value))}>{MONTH_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label></div></div><div className="analysis-period"><SignalDot /><span>SELECTED PERIOD</span><strong>{monthLabel(selectedMonth)}</strong><small>· records update from Supabase</small></div><div className="metrics-grid global-metrics"><MetricCard label="Monthly spend" value={formatCurrency(analytics.totalSpent)} detail={`${analytics.transactionCount} expense record${analytics.transactionCount === 1 ? "" : "s"}`} icon={ReceiptText} accent="amber" /><MetricCard label="Monthly income" value={formatCurrency(analytics.totalIncome)} detail="Income records in selected month" icon={CircleDollarSign} /><MetricCard label="Net cash flow" value={formatCurrency(analytics.netCashFlow)} detail="Income minus recorded expenses" icon={TrendingUp} accent="violet" /><MetricCard label="Top category" value={analytics.topCategory ? formatCurrency(analytics.topCategory.amount) : "—"} detail={analytics.topCategory ? `${analytics.topCategory.category} · ${analytics.topCategory.percentage}% of spend` : "No expense categories yet"} icon={Target} /></div>{!hasSpending ? <article className="panel global-empty"><EmptyState icon={TrendingUp} title="No monthly spending records" body="Add expense records in the Ledger for this selected period. The daily trend, bucket mix, categories, and threshold analysis will then populate from Supabase." action={<button className="primary-action" onClick={() => setView("ledger")}><Plus size={15} /> Add ledger record</button>} /></article> : <section className="analytics-grid"><article className="panel analysis-panel analysis-wide"><div className="panel-head"><div><SectionLabel>SPENDING TREND</SectionLabel><h2>Daily outflow across {monthLabel(selectedMonth)}</h2></div><span className="analysis-note">{analytics.activeSpendingDays} active spending day{analytics.activeSpendingDays === 1 ? "" : "s"} · average {formatCurrency(analytics.averageSpendOnActiveDays)}</span></div><div className="chart-canvas"><ResponsiveContainer width="100%" height={270}><AreaChart data={analytics.dailySpending} margin={{ top: 12, right: 10, left: 0, bottom: 0 }}><defs><linearGradient id="spendGradient" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#65dbe3" stopOpacity={0.44} /><stop offset="100%" stopColor="#65dbe3" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="rgba(160,189,210,.12)" vertical={false} /><XAxis dataKey="day" tick={{ fill: "#778794", fontSize: 9 }} axisLine={false} tickLine={false} interval="preserveStartEnd" /><YAxis tickFormatter={(value) => `₹${Number(value).toLocaleString("en-IN")}`} tick={{ fill: "#778794", fontSize: 9 }} axisLine={false} tickLine={false} width={68} /><Tooltip contentStyle={{ background: "#101821", border: "1px solid rgba(160,189,210,.24)", fontSize: 11 }} labelStyle={{ color: "#8a99a4" }} formatter={(value) => formatCurrency(value)} /><Area type="monotone" dataKey="amount" name="Daily spend" stroke="#65dbe3" strokeWidth={2} fill="url(#spendGradient)" /></AreaChart></ResponsiveContainer></div></article><article className="panel analysis-panel"><div className="panel-head"><div><SectionLabel>ALLOCATION MIX</SectionLabel><h2>Where spending went</h2></div></div><div className="chart-canvas pie-chart"><ResponsiveContainer width="100%" height={210}><PieChart><Pie data={visibleBuckets} dataKey="amount" nameKey="bucket" innerRadius={57} outerRadius={79} paddingAngle={3}>{visibleBuckets.map((row, index) => <Cell key={row.bucket} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}</Pie><Tooltip contentStyle={{ background: "#101821", border: "1px solid rgba(160,189,210,.24)", fontSize: 11 }} formatter={(value) => formatCurrency(value)} /></PieChart></ResponsiveContainer></div><div className="bucket-legend">{visibleBuckets.map((row, index) => <div key={row.bucket}><span style={{ background: CHART_COLORS[index % CHART_COLORS.length] }} /><strong>{row.bucket}</strong><small>{formatCurrency(row.amount)}</small></div>)}</div></article><article className="panel analysis-panel"><div className="panel-head"><div><SectionLabel>CATEGORY DETAIL</SectionLabel><h2>Largest monthly categories</h2></div></div><div className="chart-canvas"><ResponsiveContainer width="100%" height={250}><BarChart data={analytics.categorySpending.slice(0, 7)} layout="vertical" margin={{ top: 8, right: 10, left: 5, bottom: 0 }}><CartesianGrid stroke="rgba(160,189,210,.1)" horizontal={false} /><XAxis type="number" hide /><YAxis type="category" dataKey="category" width={88} tick={{ fill: "#a5b3bd", fontSize: 9 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: "#101821", border: "1px solid rgba(160,189,210,.24)", fontSize: 11 }} formatter={(value) => formatCurrency(value)} /><Bar dataKey="amount" name="Spend" fill="#b99af0" radius={[0, 3, 3, 0]} /></BarChart></ResponsiveContainer></div></article><article className="panel analysis-panel"><div className="panel-head"><div><SectionLabel>THRESHOLD HEALTH</SectionLabel><h2>Plan versus actual</h2></div></div>{analytics.thresholdPerformance.length === 0 ? <div className="chart-empty"><SlidersHorizontal size={19} /><p>Set category thresholds in Monthly Setup to compare planned and actual monthly spending.</p></div> : <div className="chart-canvas"><ResponsiveContainer width="100%" height={250}><BarChart data={analytics.thresholdPerformance.slice(0, 7)} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}><CartesianGrid stroke="rgba(160,189,210,.1)" vertical={false} /><XAxis dataKey="category" tick={{ fill: "#a5b3bd", fontSize: 9 }} axisLine={false} tickLine={false} /><YAxis tickFormatter={(value) => `₹${Number(value).toLocaleString("en-IN")}`} tick={{ fill: "#778794", fontSize: 9 }} axisLine={false} tickLine={false} width={58} /><Tooltip contentStyle={{ background: "#101821", border: "1px solid rgba(160,189,210,.24)", fontSize: 11 }} formatter={(value) => formatCurrency(value)} /><Bar dataKey="limit" name="Monthly limit" fill="rgba(119,140,255,.55)" radius={[3, 3, 0, 0]} /><Bar dataKey="spent" name="Actual spend" fill="#e1a85e" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div>}</article></section>}</div>;
}

function MonthlySetup({ dashboard, monthStart, openModal, removeThreshold }: { dashboard: Dashboard; monthStart: string; openModal: (type: ModalType, record?: AnyRecord) => void; removeThreshold: (id: string) => void }) {
  const settings = dashboard.setting;
  const thresholds = dashboard.thresholds;
  return <div className="view-stack"><div className="page-heading"><div><SectionLabel>MONTHLY SETUP · {monthLabel(monthStart).toUpperCase()}</SectionLabel><h1>Plan before you<br /><em>start spending.</em></h1><p>Set your opening balance and the monthly category thresholds. Your ledger and signals will update from these limits.</p></div><button className="primary-action" onClick={() => openModal("settings", settings ?? undefined)}><Settings2 size={15} /> {settings ? "Edit month settings" : "Set month settings"}</button></div><div className="setup-summary panel"><div><SectionLabel>VIRTUAL BALANCE BASE</SectionLabel><strong>{settings ? formatCurrency(settings.opening_virtual_balance) : "Not set"}</strong><span>Opening balance for this month</span></div><div><SectionLabel>EMERGENCY TARGET</SectionLabel><strong>{settings ? `${numberValue(settings.target_emergency_months)} months` : "Not set"}</strong><span>Used by your guardrail reviews</span></div><button className="secondary-action" onClick={() => openModal("threshold")}><Plus size={15} /> Add threshold</button></div><section className="category-board">{(["NEEDS", "WANTS", "INVESTMENT"] as const).map((bucket) => <article className="category-column" key={bucket}><div className="category-column-head"><div><span className={`bucket-tag ${bucketTone(bucket)}`}>{bucket}</span><h2>{bucket === "NEEDS" ? "Essential spending" : bucket === "WANTS" ? "Discretionary spending" : "Future capital"}</h2></div><button className="small-plus" onClick={() => openModal("threshold", { bucket })} aria-label={`Add ${bucket.toLowerCase()} threshold`}><Plus size={15} /></button></div><div className="category-presets">{CATEGORY_GROUPS[bucket].map((category) => <span key={category}>{category}</span>)}</div><div className="threshold-rows">{thresholds.filter((threshold) => threshold.bucket === bucket).length === 0 ? <p className="empty-row">No thresholds created for {bucket.toLowerCase()}.</p> : thresholds.filter((threshold) => threshold.bucket === bucket).map((threshold) => <div className="threshold-card" key={textValue(threshold.id)}><div><strong>{textValue(threshold.category)}</strong><span>Review at {numberValue(threshold.warning_percentage)}%</span></div><div><strong>{formatCurrency(threshold.threshold_amount)}</strong><button aria-label={`Edit ${textValue(threshold.category)} threshold`} onClick={() => openModal("threshold", threshold)}><Edit3 size={14} /></button><button aria-label={`Delete ${textValue(threshold.category)} threshold`} onClick={() => removeThreshold(textValue(threshold.id))}><Trash2 size={14} /></button></div></div>)}</div></article>)}</section></div>;
}

function LedgerView({ dashboard, openModal, removeRecord }: { dashboard: Dashboard; openModal: (type: ModalType, record?: AnyRecord) => void; removeRecord: (id: string) => void }) {
  const entries = dashboard.ledger;
  return <div className="view-stack"><div className="page-heading"><div><SectionLabel>RECORDS · LEDGER</SectionLabel><h1>Every rupee has<br /><em>a history.</em></h1><p>Log income and expenses with a bucket, detailed category, payment method, and a clear description.</p></div><button className="primary-action" onClick={() => openModal("ledger")}><Plus size={15} /> Add record</button></div><div className="ledger-toolbar"><div><span>INCOME</span><strong>{formatCurrency(dashboard.summary.income)}</strong></div><div><span>EXPENSES</span><strong>{formatCurrency(dashboard.summary.expenses)}</strong></div><div><span>VIRTUAL BALANCE</span><strong>{formatCurrency(dashboard.summary.virtualBalance)}</strong></div></div><article className="panel table-panel">{entries.length === 0 ? <EmptyState icon={ReceiptText} title="Your ledger is empty" body="Create an income or expense record. The overview and virtual balance will calculate from it immediately." action={<button className="primary-action" onClick={() => openModal("ledger")}><Plus size={15} /> Add first record</button>} /> : <div className="data-table"><div className="table-head"><span>Date</span><span>Record</span><span>Bucket / category</span><span>Amount</span><span /></div>{entries.map((entry) => <div className="table-row" key={textValue(entry.id)}><span>{textValue(entry.entry_date)}</span><div><strong>{textValue(entry.description)}</strong><small>{textValue(entry.payment_method, "Manual")}</small></div><div><span className={`bucket-tag ${bucketTone(entry.bucket)}`}>{textValue(entry.bucket)}</span><small>{textValue(entry.category)}</small></div><strong className={entry.entry_type === "INCOME" ? "income-amount" : "expense-amount"}>{entry.entry_type === "INCOME" ? "+" : "−"}{formatCurrency(entry.amount)}</strong><div className="row-actions"><button aria-label="Edit ledger record" onClick={() => openModal("ledger", entry)}><Edit3 size={14} /></button><button aria-label="Delete ledger record" onClick={() => removeRecord(textValue(entry.id))}><Trash2 size={14} /></button></div></div>)}</div>}</article></div>;
}

function InvestmentsView({ dashboard, openModal, removeRecord }: { dashboard: Dashboard; openModal: (type: ModalType, record?: AnyRecord) => void; removeRecord: (id: string) => void }) {
  const investmentGroups: Array<{ type: string; title: string; description: string }> = [{ type: "EMERGENCY_FUND", title: "Emergency fund", description: "Cash reserves allocated by you." }, { type: "MUTUAL_FUND", title: "Mutual funds", description: "Manual fund and SIP records." }, { type: "ETF", title: "ETFs", description: "Exchange-traded fund positions." }, { type: "CRYPTO", title: "Crypto", description: "Manual token cost records." }, { type: "CUSTOM", title: "Custom allocation", description: "Add any future allocation type." }];
  return <div className="view-stack"><div className="page-heading"><div><SectionLabel>RECORDS · INVESTMENTS</SectionLabel><h1>Build capital<br /><em>on your terms.</em></h1><p>ActiveCFO does not assume you have started investing. Add or remove only the allocations you choose to track.</p></div><button className="primary-action" onClick={() => openModal("investment")}><Plus size={15} /> Add allocation</button></div><div className="investment-totals"><MetricCard label="Recorded cost" value={formatCurrency(dashboard.summary.investedCapital)} detail="Active investment records" icon={Landmark} accent="violet" /><MetricCard label="Current value" value={formatCurrency(dashboard.summary.investmentValue)} detail="Uses your own entered values" icon={TrendingUp} /><MetricCard label="Emergency reserve" value={formatCurrency(dashboard.summary.emergencyFund)} detail="Emergency fund records only" icon={ShieldCheck} accent="amber" /></div><div className="investment-grid">{investmentGroups.map((group) => { const records = dashboard.investments.filter((record) => record.record_type === group.type); return <article className="investment-section" key={group.type}><div className="investment-section-head"><div><SectionLabel>{group.type.replaceAll("_", " ")}</SectionLabel><h2>{group.title}</h2><p>{group.description}</p></div><button className="small-plus" onClick={() => openModal("investment", { record_type: group.type })} aria-label={`Add ${group.title} record`}><Plus size={15} /></button></div>{records.length === 0 ? <p className="empty-row">No records yet.</p> : <div className="record-stack">{records.map((record) => <div className="record-line" key={textValue(record.id)}><div><strong>{textValue(record.name)}</strong><span>{textValue(record.platform, "Manual record")} · {textValue(record.allocation_date)}</span></div><div><strong>{formatCurrency(record.current_value ?? record.cost_basis)}</strong><span>Cost {formatCurrency(record.cost_basis)}</span></div><div className="row-actions"><button aria-label="Edit investment record" onClick={() => openModal("investment", record)}><Edit3 size={14} /></button><button aria-label="Delete investment record" onClick={() => removeRecord(textValue(record.id))}><Trash2 size={14} /></button></div></div>)}</div>}</article>; })}</div></div>;
}

function InsuranceView({ dashboard, openModal, removeRecord }: { dashboard: Dashboard; openModal: (type: ModalType, record?: AnyRecord) => void; removeRecord: (id: string) => void }) {
  const blocks: Array<{ type: string; title: string; copy: string }> = [{ type: "TERM", title: "Term insurance", copy: "Life cover, policy details, premium and renewal data." }, { type: "HEALTH", title: "Health insurance", copy: "Health policies, covered members and renewal records." }, { type: "CORPORATE", title: "Corporate insurance", copy: "Employer or corporate coverage details." }];
  return <div className="view-stack"><div className="page-heading"><div><SectionLabel>RECORDS · INSURANCE</SectionLabel><h1>Protection, kept<br /><em>in context.</em></h1><p>Keep term, health, and corporate insurance in distinct sections with the renewal and coverage details you care about.</p></div><button className="primary-action" onClick={() => openModal("insurance")}><Plus size={15} /> Add policy</button></div><div className="insurance-grid">{blocks.map((block) => { const records = dashboard.insurances.filter((record) => record.insurance_type === block.type); return <article className="insurance-section" key={block.type}><div className="insurance-head"><div><SectionLabel>{block.type}</SectionLabel><h2>{block.title}</h2><p>{block.copy}</p></div><button className="small-plus" onClick={() => openModal("insurance", { insurance_type: block.type })}><Plus size={15} /></button></div>{records.length === 0 ? <p className="empty-row">No active policy records.</p> : records.map((record) => <div className="policy-card" key={textValue(record.id)}><strong>{textValue(record.provider)}</strong><span>{textValue(record.policy_number, "Policy number not added")}</span><div><span>Cover <b>{formatCurrency(record.cover_amount)}</b></span><span>Premium <b>{formatCurrency(record.premium_amount)}</b></span></div><small>Renewal: {textValue(record.renewal_date, "Not set")}</small><div className="policy-actions"><button onClick={() => openModal("insurance", record)}><Edit3 size={14} /> Edit</button><button onClick={() => removeRecord(textValue(record.id))}><Trash2 size={14} /> Remove</button></div></div>)}</article>; })}</div></div>;
}

function GuardrailsView({ dashboard, openModal, removeRecord }: { dashboard: Dashboard; openModal: (type: ModalType, record?: AnyRecord) => void; removeRecord: (id: string) => void }) {
  return <div className="view-stack"><div className="page-heading"><div><SectionLabel>DECISIONS · GUARDRAILS</SectionLabel><h1>Control above<br /><em>action.</em></h1><p>Guardrails are your standing decision rules. Thresholds monitor actual monthly spending; guardrails define the habits and limits you want to maintain.</p></div><button className="primary-action" onClick={() => openModal("guardrail")}><Plus size={15} /> Add guardrail</button></div><div className="guardrail-guide"><div><ShieldCheck size={19} /><strong>How guardrails work</strong></div><p>Create a spend cap, balance floor, emergency runway target, investment cap, or insurance review. Keep it active, pause it, edit it, or delete it as your household plan changes.</p></div><article className="panel cards-panel">{dashboard.guardrails.length === 0 ? <EmptyState icon={ShieldCheck} title="No guardrails recorded" body="Start with one rule that makes a future decision easier—for example, a cash-balance floor or a Shopping cap." action={<button className="primary-action" onClick={() => openModal("guardrail")}><Plus size={15} /> Add guardrail</button>} /> : <div className="card-grid">{dashboard.guardrails.map((record) => <div className="control-card" key={textValue(record.id)}><div className="control-card-head"><span className={`status-pill ${record.status === "PAUSED" ? "status-paused" : ""}`}>{textValue(record.status)}</span><div className="row-actions"><button onClick={() => openModal("guardrail", record)} aria-label="Edit guardrail"><Edit3 size={14} /></button><button onClick={() => removeRecord(textValue(record.id))} aria-label="Delete guardrail"><Trash2 size={14} /></button></div></div><h3>{textValue(record.label)}</h3><p>{textValue(record.notes, "No supporting note added.")}</p><div className="control-card-foot"><span>{textValue(record.guardrail_type).replaceAll("_", " ")}</span><strong>{record.threshold_amount ? formatCurrency(record.threshold_amount) : record.threshold_percentage ? `${numberValue(record.threshold_percentage)}%` : "Review"}</strong></div></div>)}</div>}</article></div>;
}

function StrategiesView({ dashboard, openModal, removeRecord }: { dashboard: Dashboard; openModal: (type: ModalType, record?: AnyRecord) => void; removeRecord: (id: string) => void }) {
  return <div className="view-stack"><div className="page-heading"><div><SectionLabel>DECISIONS · STRATEGIES</SectionLabel><h1>Make recurring<br /><em>choices explicit.</em></h1><p>Strategies are your repeatable operating notes: what triggers a review, which area it affects, how often you check, and what action to take.</p></div><button className="primary-action" onClick={() => openModal("strategy")}><Plus size={15} /> Add strategy</button></div><article className="panel cards-panel">{dashboard.strategies.length === 0 ? <EmptyState icon={Lightbulb} title="No strategies recorded" body="Create a rule such as a monthly investment review or a weekly groceries check." action={<button className="primary-action" onClick={() => openModal("strategy")}><Plus size={15} /> Add strategy</button>} /> : <div className="strategy-list">{dashboard.strategies.map((record) => <div className="strategy-row" key={textValue(record.id)}><div className="strategy-marker"><Lightbulb size={17} /></div><div className="strategy-body"><div><span className={`status-pill ${record.status === "PAUSED" ? "status-paused" : ""}`}>{textValue(record.status)}</span><span className="strategy-meta">{textValue(record.area)} · {textValue(record.cadence)}</span></div><h3>{textValue(record.title)}</h3><p><b>When:</b> {textValue(record.trigger_text, "Every review cycle")}</p><p><b>Do:</b> {textValue(record.action_text)}</p></div><div className="row-actions"><button onClick={() => openModal("strategy", record)} aria-label="Edit strategy"><Edit3 size={14} /></button><button onClick={() => removeRecord(textValue(record.id))} aria-label="Delete strategy"><Trash2 size={14} /></button></div></div>)}</div>}</article></div>;
}

function SignalsView({ dashboard, openModal, removeRecord, updateSignal }: { dashboard: Dashboard; openModal: (type: ModalType, record?: AnyRecord) => void; removeRecord: (id: string) => void; updateSignal: (record: AnyRecord) => void }) {
  return <div className="view-stack"><div className="page-heading"><div><SectionLabel>DECISIONS · SIGNALS</SectionLabel><h1>Watch the edges,<br /><em>not the noise.</em></h1><p>Signals combine automatic threshold warnings with the manual reminders you add for yourself. Automatic threshold signals update from the ledger; manual signals can be resolved or removed.</p></div><button className="primary-action" onClick={() => openModal("signal")}><Plus size={15} /> Add manual signal</button></div><article className="panel signals-board">{dashboard.signals.length === 0 ? <EmptyState icon={Radio} title="No active signals" body="Set a monthly threshold or add a manual reminder. Signals stay focused on the records that need a review." action={<button className="primary-action" onClick={() => openModal("signal")}><Plus size={15} /> Add signal</button>} /> : dashboard.signals.map((signal) => { const computed = Boolean(signal.computed); const relatedCategory = textValue(signal.related_category); return <div className={`signal-card ${signalTone(signal.severity)}`} key={textValue(signal.id)}><div className="signal-card-main"><span className={`severity-dot ${signalTone(signal.severity)}`} /><div><div className="signal-card-title"><h3>{textValue(signal.title)}</h3>{computed && <span className="system-label">AUTO</span>}</div><p>{textValue(signal.message)}</p>{relatedCategory ? <small>{relatedCategory}</small> : null}</div></div>{computed ? <span className="system-label">FROM THRESHOLD</span> : <div className="signal-controls">{!Boolean(signal.is_resolved) && <button onClick={() => updateSignal({ ...signal, is_resolved: true })}><BadgeCheck size={14} /> Resolve</button>}<button onClick={() => openModal("signal", signal)} aria-label="Edit manual signal"><Edit3 size={14} /></button><button onClick={() => removeRecord(textValue(signal.id))} aria-label="Delete manual signal"><Trash2 size={14} /></button></div>}</div>; })}</article></div>;
}

function HelpView({ helpArticles, openModal, removeRecord }: { helpArticles: AnyRecord[]; openModal: (type: ModalType, record?: AnyRecord) => void; removeRecord: (id: string) => void }) {
  return <div className="view-stack"><div className="page-heading"><div><SectionLabel>SYSTEM · HELP CENTER</SectionLabel><h1>A calmer<br /><em>operating manual.</em></h1><p>ActiveCFO is manual by design. Set a monthly plan, log the facts, maintain your allocations, and review the signals that your own rules produce.</p></div><button className="primary-action" onClick={() => openModal("help")}><Plus size={15} /> Add help article</button></div><div className="help-quick-grid"><article><FilePlus2 size={18} /><h3>1. Set the month</h3><p>Enter your opening virtual balance and category thresholds first.</p></article><article><ClipboardList size={18} /><h3>2. Keep the ledger</h3><p>Record income and expenses using Needs, Wants, or Investment buckets.</p></article><article><HandCoins size={18} /><h3>3. Map capital</h3><p>Add emergency fund, mutual fund, ETF, crypto, or custom allocations only when you make them.</p></article><article><ShieldCheck size={18} /><h3>4. Review signals</h3><p>Use thresholds and guardrails to spot where a review is due.</p></article></div><article className="panel articles-panel"><div className="panel-head"><div><SectionLabel>YOUR HELP ARTICLES</SectionLabel><h2>Editable workspace notes</h2></div></div>{helpArticles.length === 0 ? <EmptyState icon={BookOpen} title="No custom help articles" body="Add household-specific instructions, recurring checklists, or explanations that should stay with the workspace." action={<button className="secondary-action" onClick={() => openModal("help")}><Plus size={15} /> Write an article</button>} /> : <div className="article-list">{helpArticles.map((article) => <div className="article-row" key={textValue(article.id)}><div><span className="bucket-tag bucket-investment">{textValue(article.section).replaceAll("_", " ")}</span><h3>{textValue(article.title)}</h3><p>{textValue(article.summary)}</p></div><div className="row-actions"><button onClick={() => openModal("help", article)} aria-label="Edit help article"><Edit3 size={14} /></button><button onClick={() => removeRecord(textValue(article.id))} aria-label="Delete help article"><Trash2 size={14} /></button></div></div>)}</div>}</article></div>;
}

function Field({ label, name, type = "text", defaultValue, required = false, placeholder }: { label: string; name: string; type?: string; defaultValue?: unknown; required?: boolean; placeholder?: string }) {
  return <label className="form-field"><span>{label}</span><input name={name} type={type} defaultValue={defaultValue == null ? "" : String(defaultValue)} required={required} placeholder={placeholder} /></label>;
}

function SelectField({ label, name, options, defaultValue }: { label: string; name: string; options: Array<{ value: string; label?: string }>; defaultValue?: unknown }) {
  return <label className="form-field"><span>{label}</span><select name={name} defaultValue={defaultValue == null ? options[0]?.value : String(defaultValue)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label ?? option.value.replaceAll("_", " ")}</option>)}</select></label>;
}

function TextareaField({ label, name, defaultValue, placeholder }: { label: string; name: string; defaultValue?: unknown; placeholder?: string }) {
  return <label className="form-field form-field-wide"><span>{label}</span><textarea name={name} defaultValue={defaultValue == null ? "" : String(defaultValue)} placeholder={placeholder} rows={3} /></label>;
}

function CrudModal({ modal, onClose, onSave, monthStart, saving }: { modal: ModalState; onClose: () => void; onSave: (type: ModalType, record: AnyRecord | undefined, form: FormData) => void | Promise<void>; monthStart: string; saving: boolean }) {
  if (!modal) return null;
  const record = modal.record ?? {};
  const title: Record<ModalType, string> = { settings: "Monthly settings", threshold: "Monthly threshold", ledger: "Ledger record", investment: "Investment allocation", insurance: "Insurance policy", guardrail: "Guardrail", strategy: "Strategy", signal: "Manual signal", help: "Help article" };
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void onSave(modal.type, modal.record, new FormData(event.currentTarget)); };
  return <div className="modal-layer" onMouseDown={onClose}><form className="crud-modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><SectionLabel>{modal.record ? "EDIT RECORD" : "CREATE RECORD"}</SectionLabel><h2>{title[modal.type]}</h2></div><button type="button" aria-label="Close" onClick={onClose}><X size={17} /></button></div><div className="form-grid">
    {modal.type === "settings" && <><Field label="Opening virtual balance" name="openingVirtualBalance" type="number" required defaultValue={record.opening_virtual_balance} placeholder="0" /><Field label="Target emergency months" name="targetEmergencyMonths" type="number" required defaultValue={record.target_emergency_months ?? 6} /><TextareaField label="Notes" name="notes" defaultValue={record.notes} placeholder="Optional month note" /></>}
    {modal.type === "threshold" && <><SelectField label="Budget bucket" name="bucket" defaultValue={record.bucket} options={[{ value: "NEEDS" }, { value: "WANTS" }, { value: "INVESTMENT" }]} /><Field label="Detailed category" name="category" required defaultValue={record.category} placeholder="Fuel, Entertainment, Mutual Funds…" /><Field label="Monthly threshold" name="thresholdAmount" type="number" required defaultValue={record.threshold_amount} placeholder="0" /><Field label="Warning at (%)" name="warningPercentage" type="number" required defaultValue={record.warning_percentage ?? 80} /><TextareaField label="Notes" name="notes" defaultValue={record.notes} placeholder="Optional context" /></>}
    {modal.type === "ledger" && <><Field label="Date" name="entryDate" type="date" required defaultValue={record.entry_date ?? today()} /><SelectField label="Entry type" name="entryType" defaultValue={record.entry_type} options={[{ value: "EXPENSE" }, { value: "INCOME" }]} /><SelectField label="First grouping" name="bucket" defaultValue={record.bucket} options={[{ value: "NEEDS" }, { value: "WANTS" }, { value: "INVESTMENT" }, { value: "INCOME" }, { value: "OTHER" }]} /><Field label="Detailed category" name="category" required defaultValue={record.category} placeholder="Fuel, Shopping, Salary…" /><Field label="Description" name="description" required defaultValue={record.description} placeholder="What was this for?" /><Field label="Amount" name="amount" type="number" required defaultValue={record.amount} placeholder="0" /><Field label="Payment method" name="paymentMethod" defaultValue={record.payment_method} placeholder="UPI, Cash, Card…" /><TextareaField label="Notes" name="notes" defaultValue={record.notes} placeholder="Optional note" /></>}
    {modal.type === "investment" && <><SelectField label="Allocation type" name="recordType" defaultValue={record.record_type} options={[{ value: "EMERGENCY_FUND", label: "Emergency fund" }, { value: "MUTUAL_FUND", label: "Mutual fund" }, { value: "ETF" }, { value: "CRYPTO", label: "Crypto" }, { value: "CUSTOM", label: "Custom allocation" }]} /><Field label="Name" name="name" required defaultValue={record.name} placeholder="e.g. Emergency cash, Nifty ETF" /><Field label="Allocation date" name="allocationDate" type="date" required defaultValue={record.allocation_date ?? today()} /><Field label="Units (optional)" name="units" type="number" defaultValue={record.units} placeholder="0" /><Field label="Cost basis" name="costBasis" type="number" required defaultValue={record.cost_basis} placeholder="0" /><Field label="Current value (optional)" name="currentValue" type="number" defaultValue={record.current_value} placeholder="0" /><Field label="Platform / location" name="platform" defaultValue={record.platform} placeholder="e.g. Bank, broker, wallet" /><TextareaField label="Notes" name="notes" defaultValue={record.notes} placeholder="Optional note" /></>}
    {modal.type === "insurance" && <><SelectField label="Insurance section" name="insuranceType" defaultValue={record.insurance_type} options={[{ value: "TERM", label: "Term insurance" }, { value: "HEALTH", label: "Health insurance" }, { value: "CORPORATE", label: "Corporate insurance" }]} /><Field label="Provider" name="provider" required defaultValue={record.provider} placeholder="Insurer / employer" /><Field label="Policy number" name="policyNumber" defaultValue={record.policy_number} placeholder="Optional" /><Field label="Cover amount" name="coverAmount" type="number" required defaultValue={record.cover_amount} placeholder="0" /><Field label="Premium amount" name="premiumAmount" type="number" required defaultValue={record.premium_amount} placeholder="0" /><SelectField label="Premium frequency" name="premiumFrequency" defaultValue={record.premium_frequency} options={[{ value: "MONTHLY" }, { value: "QUARTERLY" }, { value: "SEMI_ANNUAL", label: "Semi-annual" }, { value: "ANNUAL" }]} /><Field label="Renewal date" name="renewalDate" type="date" defaultValue={record.renewal_date} /><Field label="Covered members" name="coveredMembers" defaultValue={record.covered_members} placeholder="Optional" /><TextareaField label="Notes" name="notes" defaultValue={record.notes} placeholder="Optional policy notes" /></>}
    {modal.type === "guardrail" && <><SelectField label="Guardrail type" name="guardrailType" defaultValue={record.guardrail_type} options={[{ value: "SPEND_CAP", label: "Spend cap" }, { value: "BALANCE_FLOOR", label: "Balance floor" }, { value: "EMERGENCY_RUNWAY", label: "Emergency runway" }, { value: "INVESTMENT_CAP", label: "Investment cap" }, { value: "INSURANCE_REVIEW", label: "Insurance review" }]} /><Field label="Label" name="label" required defaultValue={record.label} placeholder="e.g. Shopping spend cap" /><Field label="Related category" name="category" defaultValue={record.category} placeholder="Optional" /><Field label="Threshold amount" name="thresholdAmount" type="number" defaultValue={record.threshold_amount} placeholder="Optional" /><Field label="Threshold percentage" name="thresholdPercentage" type="number" defaultValue={record.threshold_percentage} placeholder="Optional" /><SelectField label="Status" name="status" defaultValue={record.status} options={[{ value: "ACTIVE" }, { value: "PAUSED" }]} /><TextareaField label="What should this rule protect?" name="notes" defaultValue={record.notes} placeholder="Describe the decision rule" /></>}
    {modal.type === "strategy" && <><Field label="Strategy title" name="title" required defaultValue={record.title} placeholder="e.g. Monthly investments review" /><SelectField label="Area" name="area" defaultValue={record.area} options={[{ value: "NEEDS" }, { value: "WANTS" }, { value: "INVESTMENT" }, { value: "INSURANCE" }, { value: "CASHFLOW" }]} /><SelectField label="Cadence" name="cadence" defaultValue={record.cadence} options={[{ value: "WEEKLY" }, { value: "MONTHLY" }, { value: "QUARTERLY" }, { value: "ANNUAL" }]} /><SelectField label="Status" name="status" defaultValue={record.status} options={[{ value: "ACTIVE" }, { value: "PAUSED" }, { value: "COMPLETE" }]} /><TextareaField label="Review trigger" name="triggerText" defaultValue={record.trigger_text} placeholder="When should this be reviewed?" /><TextareaField label="Action" name="actionText" defaultValue={record.action_text} placeholder="What should you do?" /></>}
    {modal.type === "signal" && <><SelectField label="Severity" name="severity" defaultValue={record.severity} options={[{ value: "INFO" }, { value: "ATTENTION" }, { value: "ALERT" }]} /><Field label="Signal title" name="title" required defaultValue={record.title} placeholder="What needs attention?" /><Field label="Related category" name="relatedCategory" defaultValue={record.related_category} placeholder="Optional" /><TextareaField label="Message" name="message" defaultValue={record.message} placeholder="Add the context you need to remember" /></>}
    {modal.type === "help" && <><SelectField label="Help section" name="section" defaultValue={record.section} options={[{ value: "GETTING_STARTED", label: "Getting started" }, { value: "MONTHLY_SETUP", label: "Monthly setup" }, { value: "LEDGER" }, { value: "INVESTMENTS" }, { value: "GUARDRAILS" }]} /><Field label="Title" name="title" required defaultValue={record.title} placeholder="Article title" /><Field label="Slug" name="slug" required defaultValue={record.slug} placeholder="monthly-setup-checklist" /><TextareaField label="Summary" name="summary" defaultValue={record.summary} placeholder="Short description" /><TextareaField label="Article body" name="body" defaultValue={record.body} placeholder="Write instructions for this workspace" /></>}
  </div><div className="modal-actions"><button type="button" className="secondary-action" onClick={onClose} disabled={saving}>Cancel</button><button type="submit" className="primary-action" disabled={saving}>{saving ? <><Loader2 size={15} className="spin" /> Saving…</> : <><BadgeCheck size={15} /> Save record</>}</button></div><small className="modal-caption">{modal.type === "settings" || modal.type === "threshold" ? `Applies to ${monthLabel(monthStart)}.` : "Saved directly to the ActiveCFO Supabase workspace."}</small></form></div>;
}

export default function Home() {
  const [profileCode, setProfileCode] = useState<ProfileCode>("saquib");
  const [monthStart, setMonthStart] = useState(currentMonthStart);
  const [globalYear, setGlobalYear] = useState(() => new Date().getFullYear());
  const [globalMonth, setGlobalMonth] = useState(() => new Date().getMonth() + 1);
  const [activeView, setActiveView] = useState<ViewId>(() => new URLSearchParams(window.location.search).get("view") === "global" ? "global" : "overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);
  const [isSaving, setIsSaving] = useState(false);
  const queryInput = useMemo(() => ({ profileCode, monthStart }), [profileCode, monthStart]);
  const globalQueryInput = useMemo(() => ({ profileCode, year: globalYear, month: globalMonth }), [profileCode, globalYear, globalMonth]);
  const dashboardQuery = trpc.activecfo.dashboard.useQuery(queryInput);
  // The Global Dashboard fetches the selected calendar period only while its menu view is open.
  const globalDashboardQuery = trpc.activecfo.globalDashboard.useQuery(globalQueryInput, { enabled: activeView === "global" });
  const helpQuery = trpc.activecfo.help.list.useQuery();
  const utils = trpc.useUtils();
  const refresh = async () => { await Promise.all([utils.activecfo.dashboard.invalidate(queryInput), utils.activecfo.globalDashboard.invalidate(globalQueryInput), utils.activecfo.help.invalidate()]); };
  const settingsMutation = trpc.activecfo.monthlySettings.upsert.useMutation({ onSuccess: () => void refresh() });
  const thresholdMutation = trpc.activecfo.thresholds.upsert.useMutation({ onSuccess: () => void refresh() });
  const thresholdRemoveMutation = trpc.activecfo.thresholds.remove.useMutation({ onSuccess: () => void refresh() });
  const ledgerCreateMutation = trpc.activecfo.ledger.create.useMutation({ onSuccess: () => void refresh() });
  const ledgerUpdateMutation = trpc.activecfo.ledger.update.useMutation({ onSuccess: () => void refresh() });
  const ledgerRemoveMutation = trpc.activecfo.ledger.remove.useMutation({ onSuccess: () => void refresh() });
  const investmentCreateMutation = trpc.activecfo.investments.create.useMutation({ onSuccess: () => void refresh() });
  const investmentUpdateMutation = trpc.activecfo.investments.update.useMutation({ onSuccess: () => void refresh() });
  const investmentRemoveMutation = trpc.activecfo.investments.remove.useMutation({ onSuccess: () => void refresh() });
  const insuranceCreateMutation = trpc.activecfo.insurance.create.useMutation({ onSuccess: () => void refresh() });
  const insuranceUpdateMutation = trpc.activecfo.insurance.update.useMutation({ onSuccess: () => void refresh() });
  const insuranceRemoveMutation = trpc.activecfo.insurance.remove.useMutation({ onSuccess: () => void refresh() });
  const guardrailCreateMutation = trpc.activecfo.guardrails.create.useMutation({ onSuccess: () => void refresh() });
  const guardrailUpdateMutation = trpc.activecfo.guardrails.update.useMutation({ onSuccess: () => void refresh() });
  const guardrailRemoveMutation = trpc.activecfo.guardrails.remove.useMutation({ onSuccess: () => void refresh() });
  const strategyCreateMutation = trpc.activecfo.strategies.create.useMutation({ onSuccess: () => void refresh() });
  const strategyUpdateMutation = trpc.activecfo.strategies.update.useMutation({ onSuccess: () => void refresh() });
  const strategyRemoveMutation = trpc.activecfo.strategies.remove.useMutation({ onSuccess: () => void refresh() });
  const signalCreateMutation = trpc.activecfo.signals.create.useMutation({ onSuccess: () => void refresh() });
  const signalUpdateMutation = trpc.activecfo.signals.update.useMutation({ onSuccess: () => void refresh() });
  const signalRemoveMutation = trpc.activecfo.signals.remove.useMutation({ onSuccess: () => void refresh() });
  const helpCreateMutation = trpc.activecfo.help.create.useMutation({ onSuccess: () => void refresh() });
  const helpUpdateMutation = trpc.activecfo.help.update.useMutation({ onSuccess: () => void refresh() });
  const helpRemoveMutation = trpc.activecfo.help.remove.useMutation({ onSuccess: () => void refresh() });
  const dashboard = (dashboardQuery.data as Dashboard | undefined);
  const zeroSummary: Summary = { openingBalance: 0, income: 0, expenses: 0, virtualBalance: 0, investedCapital: 0, investmentValue: 0, netWorth: 0, emergencyFund: 0, needsSpent: 0, wantsSpent: 0, investmentSpent: 0, wantsLimit: 0, wantsPercentage: 0, thresholdSummary: [] };

  const openModal = (type: ModalType, record?: AnyRecord) => setModal({ type, record });
  const changeProfile = (value: ProfileCode) => { setProfileCode(value); setActiveView("overview"); toast.success(`Opened ${value === "saquib" ? "Saquib" : "Rahat"}’s workspace`); };
  const optionalText = (form: FormData, field: string) => { const value = String(form.get(field) ?? "").trim(); return value || null; };
  const optionalNumber = (form: FormData, field: string) => { const value = String(form.get(field) ?? "").trim(); return value === "" ? null : Number(value); };
  const requiredText = (form: FormData, field: string) => String(form.get(field) ?? "").trim();
  const requiredNumber = (form: FormData, field: string) => Number(form.get(field) ?? 0);
  const complete = (message: string) => { toast.success(message); setModal(null); };
  const reportError = (error: unknown) => toast.error(error instanceof Error ? error.message.replace(/^Supabase request failed \(\d+\):\s*/, "") : "The record could not be saved. Please try again.");

  const saveModal = async (type: ModalType, record: AnyRecord | undefined, form: FormData) => {
    setIsSaving(true);
    try {
      if (type === "settings") { await settingsMutation.mutateAsync({ profileCode, monthStart, openingVirtualBalance: requiredNumber(form, "openingVirtualBalance"), targetEmergencyMonths: requiredNumber(form, "targetEmergencyMonths"), notes: optionalText(form, "notes") }); complete("Monthly settings saved"); return; }
      if (type === "threshold") { await thresholdMutation.mutateAsync({ profileCode, monthStart, bucket: requiredText(form, "bucket") as "NEEDS" | "WANTS" | "INVESTMENT", category: requiredText(form, "category"), thresholdAmount: requiredNumber(form, "thresholdAmount"), warningPercentage: requiredNumber(form, "warningPercentage"), notes: optionalText(form, "notes") }); complete("Monthly threshold saved"); return; }
      if (type === "ledger") { const payload = { profileCode, entryDate: requiredText(form, "entryDate"), entryType: requiredText(form, "entryType") as "INCOME" | "EXPENSE", bucket: requiredText(form, "bucket") as "INCOME" | "NEEDS" | "WANTS" | "INVESTMENT" | "OTHER", category: requiredText(form, "category"), description: requiredText(form, "description"), amount: requiredNumber(form, "amount"), paymentMethod: optionalText(form, "paymentMethod"), notes: optionalText(form, "notes") }; if (record?.id) await ledgerUpdateMutation.mutateAsync({ id: textValue(record.id), ...payload }); else await ledgerCreateMutation.mutateAsync(payload); complete(record ? "Ledger record updated" : "Ledger record added"); return; }
      if (type === "investment") { const payload = { profileCode, recordType: requiredText(form, "recordType") as "EMERGENCY_FUND" | "MUTUAL_FUND" | "ETF" | "CRYPTO" | "CUSTOM", name: requiredText(form, "name"), allocationDate: requiredText(form, "allocationDate"), units: optionalNumber(form, "units"), costBasis: requiredNumber(form, "costBasis"), currentValue: optionalNumber(form, "currentValue"), platform: optionalText(form, "platform"), notes: optionalText(form, "notes"), isActive: true }; if (record?.id) await investmentUpdateMutation.mutateAsync({ id: textValue(record.id), ...payload }); else await investmentCreateMutation.mutateAsync(payload); complete(record?.id ? "Allocation updated" : "Allocation added"); return; }
      if (type === "insurance") { const payload = { profileCode, insuranceType: requiredText(form, "insuranceType") as "TERM" | "HEALTH" | "CORPORATE", provider: requiredText(form, "provider"), policyNumber: optionalText(form, "policyNumber"), coverAmount: requiredNumber(form, "coverAmount"), premiumAmount: requiredNumber(form, "premiumAmount"), premiumFrequency: requiredText(form, "premiumFrequency") as "MONTHLY" | "QUARTERLY" | "SEMI_ANNUAL" | "ANNUAL", renewalDate: optionalText(form, "renewalDate"), coveredMembers: optionalText(form, "coveredMembers"), notes: optionalText(form, "notes"), isActive: true }; if (record?.id) await insuranceUpdateMutation.mutateAsync({ id: textValue(record.id), ...payload }); else await insuranceCreateMutation.mutateAsync(payload); complete(record?.id ? "Policy updated" : "Policy added"); return; }
      if (type === "guardrail") { const payload = { profileCode, guardrailType: requiredText(form, "guardrailType") as "SPEND_CAP" | "BALANCE_FLOOR" | "EMERGENCY_RUNWAY" | "INVESTMENT_CAP" | "INSURANCE_REVIEW", label: requiredText(form, "label"), category: optionalText(form, "category"), thresholdAmount: optionalNumber(form, "thresholdAmount"), thresholdPercentage: optionalNumber(form, "thresholdPercentage"), status: requiredText(form, "status") as "ACTIVE" | "PAUSED", notes: optionalText(form, "notes") }; if (record?.id) await guardrailUpdateMutation.mutateAsync({ id: textValue(record.id), ...payload }); else await guardrailCreateMutation.mutateAsync(payload); complete(record?.id ? "Guardrail updated" : "Guardrail added"); return; }
      if (type === "strategy") { const payload = { profileCode, title: requiredText(form, "title"), area: requiredText(form, "area") as "NEEDS" | "WANTS" | "INVESTMENT" | "INSURANCE" | "CASHFLOW", cadence: requiredText(form, "cadence") as "WEEKLY" | "MONTHLY" | "QUARTERLY" | "ANNUAL", triggerText: optionalText(form, "triggerText"), actionText: requiredText(form, "actionText"), status: requiredText(form, "status") as "ACTIVE" | "PAUSED" | "COMPLETE" }; if (record?.id) await strategyUpdateMutation.mutateAsync({ id: textValue(record.id), ...payload }); else await strategyCreateMutation.mutateAsync(payload); complete(record?.id ? "Strategy updated" : "Strategy added"); return; }
      if (type === "signal") { const payload = { profileCode, severity: requiredText(form, "severity") as "INFO" | "ATTENTION" | "ALERT", title: requiredText(form, "title"), message: requiredText(form, "message"), relatedCategory: optionalText(form, "relatedCategory"), isResolved: Boolean(record?.is_resolved) }; if (record?.id) await signalUpdateMutation.mutateAsync({ id: textValue(record.id), ...payload }); else await signalCreateMutation.mutateAsync(payload); complete(record?.id ? "Signal updated" : "Signal added"); return; }
      if (type === "help") { const payload = { section: requiredText(form, "section") as "GETTING_STARTED" | "MONTHLY_SETUP" | "LEDGER" | "INVESTMENTS" | "GUARDRAILS", slug: requiredText(form, "slug"), title: requiredText(form, "title"), summary: requiredText(form, "summary"), body: requiredText(form, "body") }; if (record?.id) await helpUpdateMutation.mutateAsync({ id: textValue(record.id), ...payload }); else await helpCreateMutation.mutateAsync(payload); complete(record?.id ? "Help article updated" : "Help article added"); }
    } catch (error) { reportError(error); } finally { setIsSaving(false); }
  };

  const remove = async (kind: "threshold" | "ledger" | "investment" | "insurance" | "guardrail" | "strategy" | "signal" | "help", id: string) => { if (!window.confirm("Remove this record? This cannot be undone.")) return; const map = { threshold: thresholdRemoveMutation, ledger: ledgerRemoveMutation, investment: investmentRemoveMutation, insurance: insuranceRemoveMutation, guardrail: guardrailRemoveMutation, strategy: strategyRemoveMutation, signal: signalRemoveMutation, help: helpRemoveMutation }; try { await map[kind].mutateAsync({ id }); toast.success("Record removed"); } catch (error) { reportError(error); } };
  const updateSignal = async (record: AnyRecord) => { try { await signalUpdateMutation.mutateAsync({ id: textValue(record.id), profileCode, severity: textValue(record.severity) as "INFO" | "ATTENTION" | "ALERT", title: textValue(record.title), message: textValue(record.message), relatedCategory: textValue(record.related_category) || null, isResolved: Boolean(record.is_resolved) }); toast.success("Signal resolved"); } catch (error) { reportError(error); } };

  const renderView = () => {
    if (!dashboard) return <LoadingPane />;
    if (activeView === "global") return <DetailedAnalyticsDashboard data={globalDashboardQuery.data} isLoading={globalDashboardQuery.isLoading} isError={globalDashboardQuery.isError} year={globalYear} month={globalMonth} onYearChange={setGlobalYear} onMonthChange={setGlobalMonth} onAddLedger={() => setActiveView("ledger")} />;
    if (activeView === "overview") return <Overview dashboard={dashboard} profileCode={profileCode} monthStart={monthStart} setView={setActiveView} openModal={openModal} />;
    if (activeView === "setup") return <MonthlySetup dashboard={dashboard} monthStart={monthStart} openModal={openModal} removeThreshold={(id) => remove("threshold", id)} />;
    if (activeView === "ledger") return <LedgerView dashboard={dashboard} openModal={openModal} removeRecord={(id) => remove("ledger", id)} />;
    if (activeView === "investments") return <InvestmentsView dashboard={dashboard} openModal={openModal} removeRecord={(id) => remove("investment", id)} />;
    if (activeView === "insurance") return <InsuranceView dashboard={dashboard} openModal={openModal} removeRecord={(id) => remove("insurance", id)} />;
    if (activeView === "guardrails") return <GuardrailsView dashboard={dashboard} openModal={openModal} removeRecord={(id) => remove("guardrail", id)} />;
    if (activeView === "strategies") return <StrategiesView dashboard={dashboard} openModal={openModal} removeRecord={(id) => remove("strategy", id)} />;
    if (activeView === "signals") return <SignalsView dashboard={dashboard} openModal={openModal} removeRecord={(id) => remove("signal", id)} updateSignal={updateSignal} />;
    return <HelpView helpArticles={(helpQuery.data as AnyRecord[] | undefined) ?? []} openModal={openModal} removeRecord={(id) => remove("help", id)} />;
  };

  return <div className="app-shell"><Sidebar activeView={activeView} onNavigate={setActiveView} profileCode={profileCode} summary={dashboard?.summary ?? zeroSummary} open={menuOpen} onClose={() => setMenuOpen(false)} /><div className="main-shell"><AppHeader profileCode={profileCode} onProfileChange={changeProfile} onMenu={() => setMenuOpen(true)} monthStart={monthStart} onMonthChange={setMonthStart} /><main className="main-content">{dashboardQuery.isError ? <EmptyState icon={CircleHelp} title="The workspace could not load" body="Check the Supabase connection and try again." action={<button className="primary-action" onClick={() => void dashboardQuery.refetch()}>Retry</button>} /> : renderView()}</main><footer className="main-footer"><span><SignalDot /> Private two-profile workspace · data stored in Supabase</span><span>ActiveCFO / manual by design</span></footer></div><CrudModal modal={modal} onClose={() => setModal(null)} onSave={saveModal} monthStart={monthStart} saving={isSaving} /></div>;
}
