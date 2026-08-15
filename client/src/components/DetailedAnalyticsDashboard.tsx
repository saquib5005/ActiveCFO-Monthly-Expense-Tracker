import { Download, FileText, Loader2, Plus, SlidersHorizontal, TrendingUp } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, RadialBar, RadialBarChart, ResponsiveContainer, Tooltip, Treemap, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

type ProfileCode = "saquib" | "rahat";
type ExpenseRecord = { id: string; entry_date: string; bucket: string; category: string; description: string; amount: number | string; payment_method: string | null; notes: string | null };
type DetailedData = {
  profileCode: ProfileCode;
  detailed: {
    totalIncome: number; totalExpenses: number; netCashFlow: number; transactionCount: number;
    plannedBudget: number; budgetConsumption: number; budgetRemaining: number;
    savingsTarget: number; savingsRate: number; actualSavings: number;
    bucketMix: Array<{ bucket: string; amount: number }>;
    referenceSplit: Array<{ label: string; target: number; actual: number }>;
    categoryRows: Array<{ bucket: string; category: string; actual: number; share: number }>;
    variance: Array<{ id: string; bucket: string; category: string; budgeted: number; actual: number; variance: number; usage: number; isBudgeted: boolean }>;
    dailyTotals: Array<{ day: string; amount: number }>;
    accumulation: Array<{ day: string; needs: number; wants: number; investment: number; other: number }>;
    heatmap: Array<{ day: string; amount: number; intensity: number }>;
    hierarchy: Array<{ name: string; value: number; categories: Array<{ name: string; value: number; descriptions: Array<{ name: string; value: number }> }> }>;
  };
  trailing: Array<{ key: string; label: string; income: number; expenses: number }>;
  expenseRecords: ExpenseRecord[];
};

type Props = {
  data?: DetailedData;
  isLoading: boolean;
  isError: boolean;
  year: number;
  month: number;
  onYearChange: (value: number) => void;
  onMonthChange: (value: number) => void;
  onAddLedger: () => void;
};

const COLORS = ["#65dbe3", "#b99af0", "#e1a85e", "#778cff"];
const MONTHS = Array.from({ length: 12 }, (_, index) => ({ value: index + 1, label: new Intl.DateTimeFormat("en-IN", { month: "long" }).format(new Date(Date.UTC(2026, index, 1))) }));
const currency = (value: unknown) => `₹${Number(value ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const monthLabel = (year: number, month: number) => new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(new Date(Date.UTC(year, month - 1, 1)));
const tooltipStyle = { background: "#101821", border: "1px solid rgba(160,189,210,.24)", fontSize: 11 };

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""').replaceAll(/\r?\n/g, " ")}"`;
}

function exportCsv(data: DetailedData, year: number, month: number) {
  if (!data.expenseRecords.length) return toast.error("No monthly expense records are available to export.");
  const rows = [["Date", "Bucket", "Category", "Description", "Payment method", "Notes", "Amount"], ...data.expenseRecords.map((row) => [row.entry_date, row.bucket, row.category, row.description, row.payment_method ?? "", row.notes ?? "", row.amount])];
  const url = URL.createObjectURL(new Blob([rows.map((row) => row.map(csvCell).join(",")).join("\n")], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `activecfo-${data.profileCode}-${year}-${String(month).padStart(2, "0")}-expenses.csv`;
  link.click();
  URL.revokeObjectURL(url);
  toast.success("Monthly expense CSV downloaded.");
}

async function exportPdf(data: DetailedData, year: number, month: number) {
  if (!data.expenseRecords.length) return toast.error("No monthly expense records are available to export.");
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  let y = 48;
  const line = (value: string, fontSize = 8) => { if (y > 748) { doc.addPage(); y = 48; } doc.setFontSize(fontSize); doc.text(value, 38, y); y += fontSize + 8; };
  doc.setTextColor(13, 28, 39);
  doc.setFontSize(17); doc.text("ActiveCFO · Monthly expense export", 38, y); y += 25;
  line(`${data.profileCode === "saquib" ? "Saquib" : "Rahat"} · ${monthLabel(year, month)}`, 10);
  line(`Total expenses ${currency(data.detailed.totalExpenses)} · ${data.detailed.transactionCount} records · Net cash flow ${currency(data.detailed.netCashFlow)}`, 9);
  y += 6; doc.line(38, y, 558, y); y += 16;
  line("DATE        BUCKET       CATEGORY                 DESCRIPTION                          AMOUNT", 8);
  data.expenseRecords.forEach((row) => line(`${row.entry_date.padEnd(11)} ${row.bucket.padEnd(12)} ${row.category.slice(0, 23).padEnd(24)} ${row.description.slice(0, 34).padEnd(35)} ${currency(row.amount)}`, 8));
  doc.save(`activecfo-${data.profileCode}-${year}-${String(month).padStart(2, "0")}-expenses.pdf`);
  toast.success("Monthly expense PDF downloaded.");
}

function Empty({ onAddLedger }: { onAddLedger: () => void }) {
  return <article className="panel analytics-empty"><div><TrendingUp size={22} /><h2>No monthly expense records</h2><p>Add selected-month expense rows in the Ledger. This detailed dashboard and its exports remain empty until Supabase contains real data.</p><button className="primary-action" onClick={onAddLedger}><Plus size={15} /> Add ledger record</button></div></article>;
}

export default function DetailedAnalyticsDashboard({ data, isLoading, isError, year, month, onYearChange, onMonthChange, onAddLedger }: Props) {
  if (isLoading) return <div className="analytics-loading"><Loader2 className="spin" size={20} /> Loading detailed analysis…</div>;
  if (isError || !data) return <article className="panel analytics-empty"><div><TrendingUp size={22} /><h2>Detailed analysis could not load</h2><p>Re-select the month or check the Supabase connection.</p></div></article>;
  const { detailed } = data;
  const hasExpenses = detailed.totalExpenses > 0;
  const period = monthLabel(year, month);
  const heatOffset = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const variance = detailed.variance.slice(0, 8);
  const tree = detailed.hierarchy.map((bucket) => ({ name: bucket.name, children: bucket.categories.map((category) => ({ name: `${bucket.name} · ${category.name}`, size: category.value })) }));
  const outerRing = detailed.hierarchy.flatMap((bucket) => bucket.categories.map((category) => ({ name: `${bucket.name} · ${category.name}`, value: category.value })));
  const years = Array.from({ length: 31 }, (_, index) => new Date().getFullYear() - 15 + index);

  return <div className="detailed-analytics">
    <header className="analytics-header">
      <div><p>CONTROL CENTER · DETAILED ANALYTICS</p><h1>Monthly money<br /><em>under a lens.</em></h1><span>Selected records only · no bank sync · no inferred transactions</span></div>
      <div className="analytics-filters"><label>YEAR<select value={year} onChange={(event) => onYearChange(Number(event.target.value))}>{years.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label>MONTH<select value={month} onChange={(event) => onMonthChange(Number(event.target.value))}>{MONTHS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label></div>
    </header>
    <div className="analytics-commandbar"><span>{period} · {data.profileCode === "saquib" ? "Saquib" : "Rahat"} · Supabase data</span><div><button className="secondary-action" disabled={!hasExpenses} onClick={() => exportCsv(data, year, month)}><Download size={14} /> CSV</button><button className="secondary-action" disabled={!hasExpenses} onClick={() => void exportPdf(data, year, month)}><FileText size={14} /> PDF</button></div></div>
    <section className="analytics-kpis"><article><span>NET INCOME</span><strong>{currency(detailed.netCashFlow)}</strong><small>Income less recorded expenses</small></article><article><span>TOTAL EXPENSES</span><strong>{currency(detailed.totalExpenses)}</strong><small>{detailed.transactionCount} saved expense record{detailed.transactionCount === 1 ? "" : "s"}</small></article><article><span>SAVINGS RATE</span><strong>{detailed.totalIncome ? `${detailed.savingsRate}%` : "—"}</strong><small>{detailed.totalIncome ? `${currency(detailed.actualSavings)} retained from income` : "Add income to calculate"}</small></article><article><span>BUDGET REMAINING</span><strong>{detailed.plannedBudget ? currency(detailed.budgetRemaining) : "—"}</strong><small>{detailed.plannedBudget ? `${detailed.budgetConsumption}% of saved thresholds` : "Set thresholds to compare"}</small></article></section>
    {!hasExpenses ? <Empty onAddLedger={onAddLedger} /> : <>
      <section className="analytics-grid detail-grid-top"><article className="panel gauge-panel"><div className="panel-title"><span>BUDGET CONSUMPTION</span><h2>Plan usage</h2></div>{detailed.plannedBudget ? <div className="gauge-wrap"><ResponsiveContainer width="100%" height={210}><RadialBarChart innerRadius="62%" outerRadius="94%" startAngle={210} endAngle={-30} data={[{ value: Math.min(Math.max(detailed.budgetConsumption, 0), 100), fill: detailed.budgetConsumption > 100 ? "#ef7b82" : "#65dbe3" }]}><RadialBar background={{ fill: "rgba(160,189,210,.12)" }} dataKey="value" cornerRadius={6} /></RadialBarChart></ResponsiveContainer><div><strong>{detailed.budgetConsumption}%</strong><span>{currency(detailed.totalExpenses)} of {currency(detailed.plannedBudget)}</span><small>{detailed.budgetRemaining >= 0 ? `${currency(detailed.budgetRemaining)} remaining` : `${currency(Math.abs(detailed.budgetRemaining))} over plan`}</small></div></div> : <div className="chart-empty"><SlidersHorizontal size={18} /> Set monthly thresholds to calculate budget consumption.</div>}</article><article className="panel bullet-panel"><div className="panel-title"><span>SAVINGS BULLET</span><h2>Target versus actual</h2></div>{detailed.totalIncome ? <><div className="bullet-copy"><strong>{currency(detailed.actualSavings)}</strong><span>actual net cash flow · reference target {currency(detailed.savingsTarget)}</span></div><div className="bullet-track"><i style={{ left: "20%" }} /><b style={{ width: `${Math.min(Math.max((detailed.actualSavings / detailed.totalIncome) * 100, 0), 100)}%` }} /></div><div className="bullet-rows">{detailed.referenceSplit.map((row) => <div key={row.label}><span>{row.label}</span><progress value={Math.max(row.actual, 0)} max={Math.max(row.target, 1)} /><small>{currency(row.actual)} / {currency(row.target)}</small></div>)}</div></> : <div className="chart-empty"><SlidersHorizontal size={18} /> Add income to calculate this reference comparison.</div>}</article><article className="panel wide-panel"><div className="panel-title"><span>CASH FLOW WATERFALL</span><h2>Opening balance to end balance</h2></div><ResponsiveContainer width="100%" height={250}><BarChart data={[{ stage: "Opening", value: data.detailed.netCashFlow - data.detailed.netCashFlow + (data.detailed.totalIncome - data.detailed.totalExpenses - data.detailed.netCashFlow) }, { stage: "Income", value: data.detailed.totalIncome }, { stage: "Expenses", value: -data.detailed.totalExpenses }, { stage: "Net flow", value: data.detailed.netCashFlow }]}><CartesianGrid stroke="rgba(160,189,210,.1)" vertical={false} /><XAxis dataKey="stage" tick={{ fill: "#a5b3bd", fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis tickFormatter={(value) => `₹${Number(value).toLocaleString("en-IN")}`} tick={{ fill: "#778794", fontSize: 9 }} axisLine={false} tickLine={false} width={70} /><Tooltip contentStyle={tooltipStyle} formatter={(value) => currency(Math.abs(Number(value)))} /><Bar dataKey="value" radius={[4, 4, 0, 0]}>{["#778cff", "#79d5aa", "#ef7b82", "#65dbe3"].map((color, index) => <Cell key={color} fill={color} />)}</Bar></BarChart></ResponsiveContainer></article></section>
      <section className="analytics-grid"><article className="panel"><div className="panel-title"><span>50 / 30 / 20 REFERENCE</span><h2>Needs, wants, retained cash</h2></div><ResponsiveContainer width="100%" height={230}><PieChart><Pie data={detailed.referenceSplit.map((row) => ({ name: row.label, value: Math.max(row.actual, 0) }))} dataKey="value" nameKey="name" innerRadius={54} outerRadius={82} paddingAngle={3}>{detailed.referenceSplit.map((row, index) => <Cell key={row.label} fill={COLORS[index]} />)}</Pie><Tooltip contentStyle={tooltipStyle} formatter={(value) => currency(value)} /></PieChart></ResponsiveContainer><div className="mini-legend">{detailed.referenceSplit.map((row, index) => <span key={row.label}><i style={{ background: COLORS[index] }} />{row.label} {currency(row.actual)}</span>)}</div></article><article className="panel"><div className="panel-title"><span>BUCKET MIX</span><h2>Recorded allocation</h2></div><ResponsiveContainer width="100%" height={230}><PieChart><Pie data={detailed.bucketMix.filter((row) => row.amount > 0)} dataKey="amount" nameKey="bucket" innerRadius={54} outerRadius={82} paddingAngle={3}>{detailed.bucketMix.filter((row) => row.amount > 0).map((row, index) => <Cell key={row.bucket} fill={COLORS[index]} />)}</Pie><Tooltip contentStyle={tooltipStyle} formatter={(value) => currency(value)} /></PieChart></ResponsiveContainer><div className="mini-legend">{detailed.bucketMix.filter((row) => row.amount > 0).map((row, index) => <span key={row.bucket}><i style={{ background: COLORS[index] }} />{row.bucket} {currency(row.amount)}</span>)}</div></article><article className="panel wide-panel"><div className="panel-title"><span>BUDGETED VS ACTUAL</span><h2>Category comparison</h2></div>{variance.length ? <ResponsiveContainer width="100%" height={280}><BarChart data={variance}><CartesianGrid stroke="rgba(160,189,210,.1)" vertical={false} /><XAxis dataKey="category" tick={{ fill: "#a5b3bd", fontSize: 9 }} axisLine={false} tickLine={false} /><YAxis tickFormatter={(value) => `₹${Number(value).toLocaleString("en-IN")}`} tick={{ fill: "#778794", fontSize: 9 }} axisLine={false} tickLine={false} width={70} /><Tooltip contentStyle={tooltipStyle} formatter={(value) => currency(value)} /><Legend wrapperStyle={{ fontSize: 10 }} /><Bar dataKey="budgeted" name="Budgeted" fill="#778cff99" radius={[3, 3, 0, 0]} /><Bar dataKey="actual" name="Actual" fill="#e1a85e" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer> : <div className="chart-empty">Set thresholds to compare category plans and actuals.</div>}</article><article className="panel wide-panel"><div className="panel-title"><span>VARIANCE DIRECTION</span><h2>Remaining budget versus overspend</h2></div>{variance.length ? <ResponsiveContainer width="100%" height={280}><BarChart data={variance} layout="vertical"><CartesianGrid stroke="rgba(160,189,210,.1)" horizontal={false} /><XAxis type="number" tickFormatter={(value) => `₹${Number(value).toLocaleString("en-IN")}`} tick={{ fill: "#778794", fontSize: 9 }} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="category" width={105} tick={{ fill: "#a5b3bd", fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={tooltipStyle} formatter={(value) => currency(value)} /><Bar dataKey="variance" name="Remaining / overspend" radius={[0, 4, 4, 0]}>{variance.map((row) => <Cell key={row.id} fill={row.variance >= 0 ? "#79d5aa" : "#ef7b82"} />)}</Bar></BarChart></ResponsiveContainer> : null}</article></section>
      <section className="analytics-grid"><article className="panel wide-panel"><div className="panel-title"><span>TRAILING 12 MONTHS</span><h2>Income and expense trend</h2></div><ResponsiveContainer width="100%" height={280}><LineChart data={data.trailing}><CartesianGrid stroke="rgba(160,189,210,.1)" vertical={false} /><XAxis dataKey="label" tick={{ fill: "#778794", fontSize: 9 }} axisLine={false} tickLine={false} /><YAxis yAxisId="income" tickFormatter={(value) => `₹${Number(value).toLocaleString("en-IN")}`} tick={{ fill: "#79d5aa", fontSize: 9 }} axisLine={false} tickLine={false} width={70} /><YAxis yAxisId="expense" orientation="right" tickFormatter={(value) => `₹${Number(value).toLocaleString("en-IN")}`} tick={{ fill: "#e1a85e", fontSize: 9 }} axisLine={false} tickLine={false} width={70} /><Tooltip contentStyle={tooltipStyle} formatter={(value) => currency(value)} /><Legend wrapperStyle={{ fontSize: 10 }} /><Line yAxisId="income" type="monotone" dataKey="income" name="Income" stroke="#79d5aa" strokeWidth={2} dot={false} /><Line yAxisId="expense" type="monotone" dataKey="expenses" name="Expenses" stroke="#e1a85e" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></article><article className="panel wide-panel"><div className="panel-title"><span>DAILY ACCUMULATION</span><h2>Stacked expense build-up</h2></div><ResponsiveContainer width="100%" height={280}><AreaChart data={detailed.accumulation}><CartesianGrid stroke="rgba(160,189,210,.1)" vertical={false} /><XAxis dataKey="day" tick={{ fill: "#778794", fontSize: 9 }} axisLine={false} tickLine={false} interval="preserveStartEnd" /><YAxis tickFormatter={(value) => `₹${Number(value).toLocaleString("en-IN")}`} tick={{ fill: "#778794", fontSize: 9 }} axisLine={false} tickLine={false} width={70} /><Tooltip contentStyle={tooltipStyle} formatter={(value) => currency(value)} /><Legend wrapperStyle={{ fontSize: 10 }} /><Area type="monotone" dataKey="needs" name="Needs" stackId="1" stroke="#65dbe3" fill="#65dbe366" /><Area type="monotone" dataKey="wants" name="Wants" stackId="1" stroke="#e1a85e" fill="#e1a85e66" /><Area type="monotone" dataKey="investment" name="Investment" stackId="1" stroke="#b99af0" fill="#b99af066" /><Area type="monotone" dataKey="other" name="Other" stackId="1" stroke="#778cff" fill="#778cff66" /></AreaChart></ResponsiveContainer></article></section>
      <section className="analytics-grid"><article className="panel wide-panel"><div className="panel-title"><span>DAILY SPENDING INTENSITY</span><h2>Calendar heatmap · {period}</h2></div><div className="heat-weekdays">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}</div><div className="spend-heatmap">{Array.from({ length: heatOffset }).map((_, index) => <i key={`blank-${index}`} />)}{detailed.heatmap.map((row) => <div className={`heat-${row.intensity}`} key={row.day} title={`${period} ${row.day}: ${currency(row.amount)}`}><b>{Number(row.day)}</b><small>{row.amount ? currency(row.amount) : ""}</small></div>)}</div></article><article className="panel wide-panel"><div className="panel-title"><span>EXPENSE TREEMAP</span><h2>Bucket and category hierarchy</h2></div><ResponsiveContainer width="100%" height={300}><Treemap data={tree} dataKey="size" aspectRatio={4 / 3} stroke="rgba(8,11,16,.86)" fill="#65dbe3" /></ResponsiveContainer></article><article className="panel"><div className="panel-title"><span>SUNBURST BREAKDOWN</span><h2>Category layers</h2></div><ResponsiveContainer width="100%" height={275}><PieChart><Pie data={detailed.hierarchy} dataKey="value" nameKey="name" innerRadius={28} outerRadius={57}>{detailed.hierarchy.map((row, index) => <Cell key={row.name} fill={COLORS[index]} />)}</Pie><Pie data={outerRing} dataKey="value" nameKey="name" innerRadius={64} outerRadius={91}>{outerRing.map((row, index) => <Cell key={row.name} fill={COLORS[(index + 1) % COLORS.length]} fillOpacity={.75} />)}</Pie><Tooltip contentStyle={tooltipStyle} formatter={(value) => currency(value)} /></PieChart></ResponsiveContainer><p className="chart-note">Ledger descriptions provide third-level detail because the current data model has no merchant field.</p></article><article className="panel"><div className="panel-title"><span>HIERARCHY DETAIL</span><h2>Saved granular entries</h2></div><div className="hierarchy-list">{detailed.hierarchy.flatMap((bucket) => bucket.categories.map((category) => <div key={`${bucket.name}-${category.name}`}><span>{bucket.name}</span><strong>{category.name}</strong><b>{currency(category.value)}</b><small>{category.descriptions.slice(0, 2).map((item) => `${item.name} · ${currency(item.value)}`).join(" · ")}</small></div>))}</div></article></section>
    </>}
  </div>;
}
