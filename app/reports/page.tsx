"use client";

import AppShell from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { AnalyticsOverview } from "@/lib/analytics";
import { apiRequest, ApiError } from "@/lib/api";
import { companies, CompanyKey } from "@/lib/data";
import { BarChart3, CalendarRange, CheckCircle2, Download, FolderKanban, Loader2, RefreshCw, TimerReset, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type CompanyFilter = "all" | CompanyKey;

export default function ReportsPage() {
  const { user } = useAuth();
  const [company, setCompany] = useState<CompanyFilter>("all");
  const [days, setDays] = useState(30);
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { if (user?.role !== "SUPER_ADMIN" && user?.company) setCompany(user.company); }, [user]);
  const filters = useMemo<CompanyFilter[]>(() => user?.role === "SUPER_ADMIN" || !user?.company ? ["all", "spark", "pro"] : [user.company], [user]);
  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true); setError("");
    try { setData(await apiRequest<AnalyticsOverview>(`/analytics/overview?days=${days}${company !== "all" ? `&company=${company}` : ""}`)); }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : "تعذر تحميل التقرير"); }
    finally { setLoading(false); }
  }, [company, days, user]);
  useEffect(() => { void load(); }, [load]);

  const exportCsv = () => {
    if (!data) return;
    const rows = [
      ["المشروع", "الشركة", "العميل", "الحالة", "نسبة الإنجاز", "المهام المكتملة", "إجمالي المهام", "تاريخ التسليم"],
      ...data.projects.map((project) => [project.name, companies[project.company].name, project.client, project.status, project.progress, project.completedTasks, project.totalTasks, project.dueDate])
    ];
    const csv = `\ufeff${rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `spark-erp-report-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click(); URL.revokeObjectURL(url);
  };

  const summary = data?.summary;
  const cards = [
    { label: "نسبة الإنجاز", value: `${summary?.completionRate ?? 0}%`, detail: "محسوبة من المهام الفعلية", icon: TrendingUp, color: "#1D9E75" },
    { label: "المهام المكتملة", value: summary?.completedTasks ?? 0, detail: `من أصل ${summary?.totalTasks ?? 0} مهمة`, icon: CheckCircle2, color: "#534AB7" },
    { label: "متوسط عمر المهمة", value: `${summary?.averageTaskAgeDays ?? 0} يوم`, detail: "للمهام غير المكتملة", icon: TimerReset, color: "#185FA5" },
    { label: "مشاريع نشطة", value: summary?.activeProjects ?? 0, detail: `${summary?.newProjects ?? 0} جديدة خلال الفترة`, icon: FolderKanban, color: "#BA7517" }
  ];
  const weekly = (data?.weekly || []).map((row) => ({ ...row, day: new Intl.DateTimeFormat("ar-SA", { weekday: "short" }).format(new Date(`${row.date}T12:00:00`)) }));

  return <AppShell title="التقارير" actions={<button className="btn hidden sm:flex" onClick={exportCsv} disabled={!data}><Download size={15} />تصدير CSV</button>}><div className="mx-auto max-w-[1500px] space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b p-2" style={{ borderColor: "var(--border)" }}>
      <div className="flex gap-1">{filters.map((key) => <button key={key} className={`chip ${company === key ? "chip-active" : ""}`} onClick={() => setCompany(key)}>{key === "all" ? "كل الشركات" : companies[key].name}</button>)}</div>
      <div className="flex gap-1"><CalendarRange size={15} className="m-2" color="var(--muted)" />{[7, 30, 90].map((value) => <button key={value} className={`chip ${days === value ? "chip-active" : ""}`} onClick={() => setDays(value)}>{value} يوم</button>)}<button className="btn-ghost" onClick={() => void load()} aria-label="تحديث"><RefreshCw size={14} className={loading ? "animate-spin" : ""} /></button></div>
    </div>
    {error && <div className="rounded-lg px-3 py-2 text-xs" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>{error}</div>}
    {loading && !data ? <div className="card flex min-h-64 items-center justify-center"><Loader2 className="animate-spin text-brand" /></div> : <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ label, value, detail, icon: Icon, color }) => <div key={label} className="card flex items-center gap-3 p-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ color, background: `${color}15` }}><Icon size={18} /></span><div className="min-w-0"><div className="text-xl font-medium">{value}</div><div className="text-xs">{label}</div><div className="mt-0.5 truncate text-[11px]" style={{ color: "var(--muted)" }}>{detail}</div></div></div>)}</section>
      <section className="grid gap-4 xl:grid-cols-[1.35fr_.65fr]"><div className="card p-4"><div className="mb-3 flex items-center gap-2"><BarChart3 size={17} color="var(--primary)" /><div><h3 className="text-sm font-medium">حركة المهام الأسبوعية</h3><p className="text-[11px]" style={{ color: "var(--muted)" }}>المضافة مقارنة بالمكتملة من قاعدة البيانات</p></div></div><div className="h-[280px]" dir="ltr"><ResponsiveContainer width="100%" height="100%"><BarChart data={weekly} barGap={4}><CartesianGrid vertical={false} stroke="var(--border)" /><XAxis dataKey="day" tick={{ fill: "var(--muted)", fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fill: "var(--muted)", fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ borderRadius: 10, background: "var(--surface)", borderColor: "var(--border)", fontSize: 12 }} /><Bar dataKey="added" name="مضافة" fill="#CECBF6" radius={[5,5,0,0]} /><Bar dataKey="done" name="مكتملة" fill="#534AB7" radius={[5,5,0,0]} /></BarChart></ResponsiveContainer></div></div><div className="card overflow-hidden"><div className="border-b p-4" style={{ borderColor: "var(--border)" }}><h3 className="text-sm font-medium">أداء المشاريع</h3><p className="text-[11px]" style={{ color: "var(--muted)" }}>مرتبة حسب نسبة الإنجاز</p></div><div className="max-h-[330px] divide-y overflow-y-auto" style={{ borderColor: "var(--border)" }}>{data?.projects.length ? data.projects.map((project) => <Link href={`/projects?p=${project.id}`} key={project.id} className="block p-3 hover:bg-[var(--surface-2)]"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: companies[project.company].color }} /><span className="min-w-0 flex-1 truncate text-xs font-medium">{project.name}</span><span className="text-xs font-medium">{project.progress}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--surface-3)" }}><i className="block h-full rounded-full" style={{ width: `${project.progress}%`, background: project.progress === 100 ? "var(--success)" : "var(--primary)" }} /></div></Link>) : <div className="p-8 text-center text-xs" style={{ color: "var(--muted)" }}>لا توجد مشاريع ضمن هذا النطاق</div>}</div></div></section>
    </>}
  </div></AppShell>;
}
