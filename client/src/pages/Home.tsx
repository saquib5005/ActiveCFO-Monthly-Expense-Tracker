import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  ChevronDown,
  CircleHelp,
  CreditCard,
  Crosshair,
  Eye,
  Filter,
  Gauge,
  LayoutDashboard,
  LineChart,
  ListChecks,
  Menu,
  Plus,
  Radio,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingUp,
  WalletCards,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Noir Observatory system: spacious graphite canvas, mono metadata, cyan signal dots, clipped control panels.

type UserName = "Saquib" | "Rahat";
type ViewName = "overview" | "budget" | "analytics" | "campaigns" | "strategies" | "trades" | "signals" | "help";

type Profile = {
  initials: string;
  role: string;
  netWorth: number;
  netWorthChange: number;
  monthlySpend: number;
  monthlyBudget: number;
  invested: number;
  cashBuffer: number;
  runway: number;
  allocation: { label: string; value: number; color: string }[];
  chart: number[];
  activities: { title: string; category: string; amount: number; date: string; tone: "cyan" | "blue" | "amber" }[];
};

const PROFILES: Record<UserName, Profile> = {
  Saquib: {
    initials: "SQ",
    role: "Household lead",
    netWorth: 1950000,
    netWorthChange: 6.84,
    monthlySpend: 61250,
    monthlyBudget: 83000,
    invested: 1236800,
    cashBuffer: 314000,
    runway: 5.1,
    allocation: [
      { label: "Core", value: 42, color: "cyan" },
      { label: "Equity", value: 31, color: "blue" },
      { label: "Gold", value: 14, color: "violet" },
      { label: "Cash", value: 13, color: "amber" },
    ],
    chart: [45, 44, 46, 47, 46, 49, 52, 50, 53, 55, 54, 58, 61, 60, 64, 67, 66, 69, 73, 72, 75, 78, 82, 84],
    activities: [
      { title: "SIP · UTI Nifty 50", category: "Investments", amount: -12500, date: "Today · 09:14", tone: "cyan" },
      { title: "Electricity bill", category: "Needs", amount: -3400, date: "Yesterday · 18:22", tone: "blue" },
      { title: "Salary allocation", category: "Income", amount: 145000, date: "01 Aug · 10:00", tone: "amber" },
      { title: "Gold accumulation", category: "Satellite", amount: -7600, date: "30 Jul · 16:48", tone: "cyan" },
    ],
  },
  Rahat: {
    initials: "RH",
    role: "Household member",
    netWorth: 862500,
    netWorthChange: 4.21,
    monthlySpend: 38700,
    monthlyBudget: 54000,
    invested: 534600,
    cashBuffer: 187000,
    runway: 4.8,
    allocation: [
      { label: "Core", value: 48, color: "cyan" },
      { label: "Equity", value: 24, color: "blue" },
      { label: "Gold", value: 16, color: "violet" },
      { label: "Cash", value: 12, color: "amber" },
    ],
    chart: [44, 45, 44, 46, 48, 47, 50, 52, 51, 53, 55, 56, 58, 57, 59, 61, 64, 63, 66, 67, 69, 72, 73, 76],
    activities: [
      { title: "SIP · Parag Parikh Flexi", category: "Investments", amount: -8000, date: "Today · 08:05", tone: "cyan" },
      { title: "Groceries", category: "Needs", amount: -5280, date: "Yesterday · 20:12", tone: "blue" },
      { title: "Freelance receipt", category: "Income", amount: 42000, date: "02 Aug · 11:40", tone: "amber" },
      { title: "Health insurance", category: "Protection", amount: -3200, date: "29 Jul · 13:06", tone: "cyan" },
    ],
  },
};

const NAV_ITEMS: { id: ViewName; label: string; icon: LucideIcon; section?: string }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, section: "Workspace" },
  { id: "budget", label: "Budget plan", icon: SlidersHorizontal },
  { id: "analytics", label: "Analytics", icon: LineChart, section: "Intelligence" },
  { id: "campaigns", label: "Guardrails", icon: ShieldCheck },
  { id: "strategies", label: "Strategies", icon: Crosshair, section: "Activity" },
  { id: "trades", label: "Ledger", icon: CreditCard },
  { id: "signals", label: "Signals", icon: Radio },
  { id: "help", label: "Help center", icon: CircleHelp, section: "System" },
];

function formatCurrency(value: number) {
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function formatCompact(value: number) {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return formatCurrency(value);
}

function MiniLineChart({ data, height = 120 }: { data: number[]; height?: number }) {
  const width = 640;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - 14 - ((value - min) / (max - min || 1)) * (height - 30);
      return `${x},${y}`;
    })
    .join(" ");
  const areaPoints = `0,${height} ${points} ${width},${height}`;
  return (
    <svg className="mini-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-label="Net worth trend chart" role="img">
      <defs>
        <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#65dbe3" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#65dbe3" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((line) => (
        <line key={line} x1="0" x2={width} y1={height * line} y2={height * line} className="chart-grid" />
      ))}
      <polygon points={areaPoints} fill="url(#chartFill)" />
      <polyline points={points} fill="none" stroke="#65dbe3" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={width} cy={Number(points.split(" ").at(-1)?.split(",")[1] ?? 0)} r="4" fill="#65dbe3" className="chart-endpoint" />
    </svg>
  );
}

function SignalDot({ tone = "cyan" }: { tone?: "cyan" | "blue" | "amber" | "violet" }) {
  return <span className={`signal-dot signal-${tone}`} aria-hidden="true" />;
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="section-label">{children}</div>;
}

function MetricCard({ label, value, detail, tone = "default", icon: Icon }: { label: string; value: string; detail: string; tone?: string; icon: LucideIcon }) {
  return (
    <article className={`metric-card metric-${tone}`}>
      <div className="metric-head"><span>{label}</span><Icon size={15} strokeWidth={1.6} /></div>
      <strong>{value}</strong>
      <div className="metric-detail"><SignalDot tone={tone === "positive" ? "cyan" : tone === "attention" ? "amber" : "blue"} />{detail}</div>
    </article>
  );
}

function AppHeader({ profile, user, onUserChange, onMenu }: { profile: Profile; user: UserName; onUserChange: (name: UserName) => void; onMenu: () => void }) {
  return (
    <header className="topbar">
      <button className="mobile-menu" onClick={onMenu} aria-label="Open navigation"><Menu size={20} /></button>
      <div className="breadcrumbs"><span>Control center</span><span className="breadcrumb-separator">/</span><span className="breadcrumb-current">{user}'s view</span></div>
      <div className="topbar-actions">
        <button className="icon-button" aria-label="Search"><Search size={17} /></button>
        <button className="icon-button notification-button" aria-label="Notifications"><Bell size={17} /><span className="notification-ping" /></button>
        <div className="user-switcher">
          <div className="avatar">{profile.initials}</div>
          <div className="user-select-wrap">
            <select value={user} onChange={(event) => onUserChange(event.target.value as UserName)} aria-label="Select user">
              <option value="Saquib">Saquib</option>
              <option value="Rahat">Rahat</option>
            </select>
            <ChevronDown size={13} />
          </div>
        </div>
      </div>
    </header>
  );
}

function Sidebar({ activeView, onNavigate, user, open, onClose }: { activeView: ViewName; onNavigate: (view: ViewName) => void; user: UserName; open: boolean; onClose: () => void }) {
  return (
    <>
      {open && <button className="sidebar-backdrop" onClick={onClose} aria-label="Close navigation" />}
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="brand-lockup"><div className="brand-mark"><span>◒</span></div><div className="brand-type"><strong>Active<span>CFO</span></strong><small>private wealth office</small></div><button className="sidebar-close" onClick={onClose} aria-label="Close navigation"><X size={17} /></button></div>
        <div className="sidebar-rule" />
        <div className="sidebar-context"><span className="context-eyebrow">CURRENT PROFILE</span><strong>{user}</strong><span className="context-status"><SignalDot /> Local data space</span></div>
        <nav className="sidebar-nav" aria-label="Primary navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.id}>
                {item.section && <SectionLabel>{item.section}</SectionLabel>}
                <button className={`nav-item ${activeView === item.id ? "nav-active" : ""}`} onClick={() => { onNavigate(item.id); onClose(); }}>
                  <Icon size={16} strokeWidth={activeView === item.id ? 2 : 1.6} /><span>{item.label}</span>{activeView === item.id && <span className="nav-signal"><SignalDot /></span>}
                </button>
              </div>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="balance-card"><div className="balance-head"><span>VIRTUAL BALANCE</span><Eye size={13} /></div><strong>{formatCurrency(user === "Saquib" ? 550000 : 280000)}</strong><span className="balance-note">Manual tracking mode</span></div>
          <div className="sidebar-footer"><button className="small-icon-button" aria-label="Settings"><Settings2 size={15} /></button><button className="small-icon-button" aria-label="Documentation"><BookOpen size={15} /></button><span className="version-tag">v0.9 / local</span></div>
        </div>
      </aside>
    </>
  );
}

function Overview({ profile, user, onNavigate, onAddExpense }: { profile: Profile; user: UserName; onNavigate: (view: ViewName) => void; onAddExpense: () => void }) {
  const budgetUsed = Math.round((profile.monthlySpend / profile.monthlyBudget) * 100);
  return (
    <>
      <section className="hero-panel">
        <img src="/manus-storage/activecfo-hero_0a3ef668.png" alt="" className="hero-art" />
        <div className="hero-overlay" />
        <div className="hero-content"><SectionLabel>OVERVIEW · AUGUST 2026</SectionLabel><h1>Make the next<br /><em>move visible.</em></h1><p>One calm view of your budget, portfolio, and the guardrails protecting both.</p><div className="hero-actions"><button className="primary-action" onClick={() => onNavigate("budget")}><Plus size={16} /> Add allocation</button><button className="secondary-action" onClick={onAddExpense}><CreditCard size={15} /> Log expense</button></div></div>
        <div className="hero-aside"><div className="hero-aside-label">MONTHLY PULSE</div><div className="hero-aside-value">{budgetUsed}<span>%</span></div><div className="hero-aside-copy">of your wants ceiling used</div><div className="hero-line"><span style={{ width: `${budgetUsed}%` }} /></div><div className="hero-aside-foot"><span>₹{profile.monthlySpend.toLocaleString("en-IN")}</span><span>₹{profile.monthlyBudget.toLocaleString("en-IN")}</span></div></div>
        <div className="hero-coordinates"><span>0.08.24</span><span>signal / active</span><span>no sync required</span></div>
      </section>

      <section className="metrics-grid">
        <MetricCard label="Net worth" value={formatCompact(profile.netWorth)} detail={`+${profile.netWorthChange}% this month`} tone="positive" icon={TrendingUp} />
        <MetricCard label="Invested capital" value={formatCompact(profile.invested)} detail="63.4% of total assets" icon={BriefcaseBusiness} />
        <MetricCard label="Cash buffer" value={formatCompact(profile.cashBuffer)} detail={`${profile.runway} months runway`} tone="attention" icon={Gauge} />
        <MetricCard label="Monthly outflow" value={formatCompact(profile.monthlySpend)} detail={`${100 - budgetUsed}% room remaining`} icon={ArrowDownRight} />
      </section>

      <section className="dashboard-grid">
        <article className="panel chart-panel">
          <div className="panel-head"><div><SectionLabel>PORTFOLIO TRAJECTORY</SectionLabel><h2>Net worth over time</h2></div><div className="panel-actions"><button className="filter-button"><span>Last 6 months</span><ChevronDown size={13} /></button><button className="more-button">•••</button></div></div>
          <div className="chart-summary"><strong>{formatCurrency(profile.netWorth)}</strong><span className="positive-label"><ArrowUpRight size={14} /> {profile.netWorthChange}%</span><span className="muted-copy">vs. previous period</span></div>
          <div className="chart-wrap"><MiniLineChart data={profile.chart} /></div>
          <div className="chart-axis"><span>MAR</span><span>APR</span><span>MAY</span><span>JUN</span><span>JUL</span><span>AUG</span></div>
        </article>
        <article className="panel allocation-panel">
          <div className="panel-head"><div><SectionLabel>ASSET MIX</SectionLabel><h2>Core / satellite</h2></div><button className="more-button">•••</button></div>
          <div className="allocation-visual"><div className="donut" style={{ background: `conic-gradient(#65dbe3 0 42%, #738aff 42% 73%, #b699e8 73% 87%, #d9a45c 87% 100%)` }}><div className="donut-center"><strong>100%</strong><span>mapped</span></div></div><div className="allocation-legend">{profile.allocation.map((item) => <div className="legend-row" key={item.label}><span className={`legend-color legend-${item.color}`} /> <span>{item.label}</span><strong>{item.value}%</strong></div>)}</div></div>
          <button className="panel-link" onClick={() => onNavigate("analytics")}>Read allocation analytics <ArrowUpRight size={14} /></button>
        </article>
      </section>

      <section className="lower-grid">
        <article className="panel activity-panel">
          <div className="panel-head"><div><SectionLabel>RECENT LEDGER</SectionLabel><h2>Activity around you</h2></div><button className="filter-button"><Filter size={13} /><span>Filter</span></button></div>
          <div className="activity-list">{profile.activities.map((activity) => <div className="activity-row" key={`${activity.title}-${activity.date}`}><div className="activity-icon"><SignalDot tone={activity.tone} /></div><div className="activity-copy"><strong>{activity.title}</strong><span>{activity.category} · {activity.date}</span></div><span className={`activity-amount ${activity.amount > 0 ? "amount-positive" : ""}`}>{activity.amount > 0 ? "+" : "−"}{formatCurrency(Math.abs(activity.amount))}</span></div>)}</div>
          <button className="panel-link" onClick={() => onNavigate("trades")}>View full ledger <ArrowUpRight size={14} /></button>
        </article>
        <article className="panel signal-panel"><img src="/manus-storage/activecfo-insight_f6f748c1.png" alt="" className="signal-art" /><div className="signal-shade" /><div className="signal-content"><SectionLabel>CONTEXTUAL SIGNAL</SectionLabel><div className="signal-title"><Sparkles size={18} /><h2>Buffer is steady.</h2></div><p>Your liquid reserve covers {profile.runway} months at current spending. The configured floor is 6 months. Keep this month’s emergency allocation active.</p><button className="signal-action" onClick={() => onNavigate("campaigns")}>Review guardrails <ArrowUpRight size={14} /></button></div><div className="signal-orbit"><div /></div></article>
      </section>
    </>
  );
}

function BudgetView({ profile, onAddExpense }: { profile: Profile; onAddExpense: () => void }) {
  const rows = [
    ["Emergency fund", 18000, "6 month runway"],
    ["Investments", 22000, "Core + satellite"],
    ["Insurance", 7800, "Health + term"],
    ["Wants", profile.monthlyBudget - 47800, "Flexible ceiling"],
  ] as const;
  return <div className="view-stack"><div className="page-heading"><div><SectionLabel>WORKSPACE · MONTHLY PLAN</SectionLabel><h1>Give every rupee<br /><em>a job.</em></h1><p>Set the constraints first. The ledger stays honest when the plan is visible.</p></div><button className="primary-action" onClick={onAddExpense}><Plus size={16} /> Log expense</button></div><div className="budget-command"><div><span className="command-label">AUGUST ALLOCATION</span><strong>{formatCurrency(profile.monthlyBudget)}</strong><span className="command-note">₹{(profile.monthlyBudget - profile.monthlySpend).toLocaleString("en-IN")} unassigned buffer</span></div><div className="command-status"><SignalDot /><span>PLAN ACTIVE</span></div></div><div className="budget-rows">{rows.map(([label, amount, note], index) => <div className="budget-row" key={label}><div className="budget-index">0{index + 1}</div><div className="budget-name"><strong>{label}</strong><span>{note}</span></div><div className="budget-progress"><span style={{ width: `${Math.min((amount / profile.monthlyBudget) * 100 * 2.2, 100)}%` }} /></div><strong className="budget-amount">{formatCurrency(amount)}</strong><button className="more-button">•••</button></div>)}</div><div className="guardrail-note"><ShieldCheck size={18} /><div><strong>Guardrail status: stable</strong><span>No category has crossed its configured review threshold this month.</span></div><ArrowUpRight size={15} /></div></div>;
}

function AnalyticsView({ profile }: { profile: Profile }) {
  return <div className="view-stack"><div className="page-heading"><div><SectionLabel>INTELLIGENCE · ANALYTICS</SectionLabel><h1>See the shape<br /><em>of your wealth.</em></h1><p>Read the trend without losing the context behind it.</p></div><button className="secondary-action"><Activity size={15} /> Compare periods</button></div><div className="analytics-feature panel"><div className="panel-head"><div><SectionLabel>LIFETIME TRAJECTORY</SectionLabel><h2>Capital curve</h2></div><span className="live-chip"><SignalDot /> Live model</span></div><div className="analytics-number"><strong>{formatCurrency(profile.netWorth)}</strong><span>+{profile.netWorthChange}% through current period</span></div><div className="chart-wrap analytics-chart"><MiniLineChart data={profile.chart} height={220} /></div></div><div className="analytics-cards"><MetricCard label="Core stability" value="42%" detail="Target range 35–50%" icon={ShieldCheck} /><MetricCard label="Portfolio beta" value="0.68" detail="Moderate movement" icon={LineChart} /><MetricCard label="Savings rate" value="28.4%" detail="Above household floor" tone="positive" icon={Target} /></div></div>;
}

function PlaceholderView({ view, onNavigate }: { view: ViewName; onNavigate: (view: ViewName) => void }) {
  const details: Record<string, { kicker: string; title: string; body: string; icon: LucideIcon }> = { campaigns: { kicker: "INTELLIGENCE · GUARDRAILS", title: "Control above action.", body: "Set the ceilings, floors, and review points that keep your plan deliberate. This workspace is ready for your next rule.", icon: ShieldCheck }, strategies: { kicker: "ACTIVITY · STRATEGIES", title: "Build the logic.", body: "Turn a financial intention into a repeatable move. Strategy notes stay next to the decisions they explain.", icon: Crosshair }, trades: { kicker: "ACTIVITY · LEDGER", title: "History stays legible.", body: "Every manual entry carries its category, intent, and effect on the monthly plan.", icon: ListChecks }, signals: { kicker: "ACTIVITY · SIGNALS", title: "Watch the edges.", body: "Your most useful alerts live at the boundary between plan and reality. No noise, only context.", icon: Radio }, help: { kicker: "SYSTEM · HELP CENTER", title: "A calmer operating manual.", body: "ActiveCFO is designed around a few clear rules: configure first, log deliberately, review often.", icon: CircleHelp } };
  const detail = details[view] ?? details.campaigns;
  const Icon = detail.icon;
  return <div className="empty-view"><div className="empty-orbit"><Icon size={28} strokeWidth={1.4} /></div><SectionLabel>{detail.kicker}</SectionLabel><h1>{detail.title}</h1><p>{detail.body}</p><div className="empty-actions"><button className="primary-action" onClick={() => onNavigate("overview")}>Return to overview <ArrowUpRight size={15} /></button><button className="secondary-action" onClick={() => onNavigate("budget")}>Open budget plan</button></div></div>;
}

export default function Home() {
  const [user, setUser] = useState<UserName>(() => (localStorage.getItem("activecfo-user") as UserName) || "Saquib");
  const [activeView, setActiveView] = useState<ViewName>("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showExpense, setShowExpense] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState("");
  const profile = useMemo(() => PROFILES[user], [user]);

  useEffect(() => { localStorage.setItem("activecfo-user", user); }, [user]);

  const handleUserChange = (name: UserName) => { setUser(name); toast.success(`Switched to ${name}'s local workspace`); };
  const handleExpense = () => {
    const value = Number(expenseAmount);
    if (!value || value <= 0) { toast.error("Enter a positive expense amount"); return; }
    toast.success(`${formatCurrency(value)} added to ${user}'s wants ledger`);
    setExpenseAmount(""); setShowExpense(false);
  };

  return (
    <div className="app-shell">
      <Sidebar activeView={activeView} onNavigate={setActiveView} user={user} open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="main-shell"><AppHeader profile={profile} user={user} onUserChange={handleUserChange} onMenu={() => setMenuOpen(true)} /><main className="main-content">
        <div className="mobile-profile-strip"><div><span>LOCAL PROFILE</span><strong>{user}</strong></div><div className="profile-switch-buttons"><button className={user === "Saquib" ? "selected" : ""} onClick={() => handleUserChange("Saquib")}>SQ</button><button className={user === "Rahat" ? "selected" : ""} onClick={() => handleUserChange("Rahat")}>RH</button></div></div>
        {activeView === "overview" && <Overview profile={profile} user={user} onNavigate={setActiveView} onAddExpense={() => setShowExpense(true)} />}
        {activeView === "budget" && <BudgetView profile={profile} onAddExpense={() => setShowExpense(true)} />}
        {activeView === "analytics" && <AnalyticsView profile={profile} />}
        {!(["overview", "budget", "analytics"] as ViewName[]).includes(activeView) && <PlaceholderView view={activeView} onNavigate={setActiveView} />}
      </main><footer className="main-footer"><span><SignalDot /> Private workspace · data stays in this browser</span><span>ActiveCFO / manual by design</span></footer></div>
      {showExpense && <div className="modal-layer" onClick={() => setShowExpense(false)}><div className="expense-modal" onClick={(event) => event.stopPropagation()}><div className="modal-head"><div><SectionLabel>QUICK ENTRY · {user.toUpperCase()}</SectionLabel><h2>Log an expense</h2></div><button className="more-button" onClick={() => setShowExpense(false)} aria-label="Close"><X size={16} /></button></div><label>Amount in INR<input autoFocus inputMode="decimal" value={expenseAmount} onChange={(event) => setExpenseAmount(event.target.value)} placeholder="e.g. 1200" /></label><label>Category<select defaultValue="Wants"><option>Wants</option><option>Needs</option><option>Protection</option><option>Investments</option></select></label><button className="primary-action modal-submit" onClick={handleExpense}><Plus size={16} /> Add to ledger</button><p className="modal-note">This is a local-only entry for {user}. No bank connection or authentication required.</p></div></div>}
    </div>
  );
}
