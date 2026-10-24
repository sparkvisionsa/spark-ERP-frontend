"use client";

import AppShell from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { apiRequest, ApiError } from "@/lib/api";
import { AnalyticsOverview, CompanyAnalytics, relativeTime } from "@/lib/analytics";
import { companies, CompanyKey } from "@/lib/data";
import { AlertTriangle, ArrowLeft, CheckCircle2, ClipboardCheck, FolderKanban, Image, Loader2, PackageCheck, RefreshCw, Send, Truck, Users, Video } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";

type Filter = "all" | CompanyKey;

export default function DashboardPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>("all");
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { if (user?.role !== "SUPER_ADMIN" && user?.company) setFilter(user.company); }, [user]);
  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true); setError("");
    try { setData(await apiRequest<AnalyticsOverview>(`/analytics/overview?days=30${filter !== "all" ? `&company=${filter}` : ""}`)); }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : "تعذر تحميل مؤشرات لوحة التحكم"); }
    finally { setLoading(false); }
  }, [filter, user]);
  useEffect(() => { void load(); }, [load]);

  const filters = useMemo(() => user?.role === "SUPER_ADMIN" || !user?.company ? (["all", "spark", "pro"] as Filter[]) : ([user.company] as Filter[]), [user]);
  const summary = data?.summary;
  const cards = [
    { label: "مشاريع نشطة", value: summary?.activeProjects ?? 0, meta: `${summary?.newProjects ?? 0} جديدة خلال 30 يوماً`, icon: FolderKanban, color: "#534AB7", soft: "#EEEDFE" },
    { label: "مهام متأخرة", value: summary?.overdueTasks ?? 0, meta: summary?.overdueTasks ? "تحتاج متابعة" : "لا توجد متأخرات", icon: AlertTriangle, color: "#E24B4A", soft: "#FCE8E8" },
    { label: "تسليمات اليوم", value: summary?.deliveriesToday ?? 0, meta: `${summary?.periodDeliveries ?? 0} خلال 30 يوماً`, icon: PackageCheck, color: "#1D9E75", soft: "#E1F5EE" },
    { label: "الموظفون النشطون", value: `${summary?.activeEmployees ?? 0} / ${summary?.totalEmployees ?? 0}`, meta: `${summary?.onLeaveEmployees ?? 0} في إجازة`, icon: Users, color: "#185FA5", soft: "#E6F1FB" }
  ];

  return <AppShell title="لوحة التحكم"><div className="dashboard-compact mx-auto max-w-[1500px] space-y-6">
    <section className="flex items-center justify-between gap-2 overflow-x-auto border-b px-2 py-2" style={{ borderColor: "var(--border)" }}>
      <span className="whitespace-nowrap text-xs" style={{ color: "var(--muted)" }}>مرحباً، {user?.fullName || "مدير النظام"} · {new Intl.DateTimeFormat("ar-SA", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</span>
      <div className="flex items-center gap-1.5">{filters.map((key) => <button key={key} onClick={() => setFilter(key)} className={`chip whitespace-nowrap ${filter === key ? "chip-active" : ""}`}>{key !== "all" && <span className="h-2 w-2 rounded-full" style={{ background: companies[key].color }} />}{key === "all" ? "كل الشركات" : companies[key].name}</button>)}<button className="btn-ghost" onClick={() => void load()} aria-label="تحديث البيانات"><RefreshCw size={14} className={loading ? "animate-spin" : ""} /></button></div>
    </section>
    {error && <div className="flex items-center justify-between rounded-lg px-3 py-2 text-xs" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}><span>{error}</span><button onClick={() => void load()}>إعادة المحاولة</button></div>}
    {loading && !data ? <div className="card flex min-h-64 items-center justify-center"><Loader2 className="animate-spin text-brand" size={28} /></div> : <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ label, value, meta, icon: Icon, color, soft }) => <div className="card p-5" key={label}><div className="mb-5 flex items-start justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: soft, color }}><Icon size={20} /></span><span className="rounded-lg px-2 py-1 text-[11px]" style={{ background: "var(--surface-3)", color: "var(--muted)" }}>بيانات مباشرة</span></div><div className="text-3xl font-medium">{value}</div><div className="mt-1 text-sm font-medium">{label}</div><div className="mt-2 text-xs" style={{ color }}>{meta}</div></div>)}</section>
      <section className={`grid gap-4 ${(data?.companies.length || 0) > 1 ? "xl:grid-cols-2" : ""}`}>{data?.companies.map((company) => <CompanyPerformance key={company.key} company={company} />)}</section>
      <section className="grid gap-4 xl:grid-cols-[1.35fr_.65fr]">
        <AttentionPanel data={data} />
        <ActivityPanel data={data} />
      </section>
    </>}
  </div></AppShell>;
}

function AttentionPanel({ data }: { data: AnalyticsOverview | null }) {
  return <div className="card overflow-hidden"><div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "var(--border)" }}><div><h3 className="font-medium">يحتاج متابعتك</h3><p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>المهام المتأخرة حسب تاريخ التسليم</p></div><span className={`status ${data?.attention.length ? "status-danger" : "status-success"}`}>{data?.attention.length || 0} عناصر</span></div><div className="divide-y" style={{ borderColor: "var(--border)" }}>{data?.attention.length ? data.attention.slice(0, 4).map((entry) => <Link href={`/projects?p=${entry.projectId}&t=${entry.taskId}`} key={entry.id} className="group flex items-center gap-3 px-5 py-4 transition-colors hover:bg-[var(--surface-2)]"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}><AlertTriangle size={19} /></span><div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{entry.title}</div><div className="mt-1 truncate text-xs" style={{ color: "var(--muted)" }}>متأخرة {entry.daysOverdue} يوم · {entry.assignee} · {entry.projectName}</div></div><span className="hidden text-xs sm:block" style={{ color: "var(--subtle)" }}>{companies[entry.company].name}</span><ArrowLeft size={17} className="transition-transform group-hover:-translate-x-1" color="var(--muted)" /></Link>) : <div className="flex min-h-36 flex-col items-center justify-center gap-2 text-xs" style={{ color: "var(--muted)" }}><CheckCircle2 size={24} color="var(--success)" />لا توجد مهام متأخرة</div>}</div></div>;
}

function ActivityPanel({ data }: { data: AnalyticsOverview | null }) {
  const rows = data?.activity.slice(0, 5) || [];
  return <div className="card overflow-hidden"><div className="border-b px-5 py-4" style={{ borderColor: "var(--border)" }}><h3 className="font-medium">آخر النشاطات</h3><p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>من المشاريع والتسليمات المسجلة</p></div><div className="p-5">{rows.length ? rows.map((entry, index) => <Link href={`/projects?p=${entry.projectId}${entry.taskId ? `&t=${entry.taskId}` : ""}`} key={entry.id} className="relative flex gap-3 pb-5 last:pb-0">{index < rows.length - 1 && <span className="absolute bottom-0 end-[15px] top-8 w-px" style={{ background: "var(--border)" }} />}<span className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: entry.type === "project" ? "var(--success-soft)" : "var(--primary-soft)", color: entry.type === "project" ? "var(--success)" : "var(--primary)" }}>{entry.type === "image" ? <Image size={15} /> : entry.type === "video" ? <Video size={15} /> : entry.type === "project" ? <FolderKanban size={15} /> : <Send size={15} />}</span><div className="min-w-0 text-xs"><p><b className="font-medium">{entry.user}</b> <span style={{ color: "var(--muted)" }}>{entry.action}</span></p><p className="mt-1 truncate">{entry.subject}</p><p className="mt-1 text-[11px]" style={{ color: "var(--subtle)" }}>{relativeTime(entry.createdAt)}</p></div></Link>) : <div className="flex min-h-32 items-center justify-center text-xs" style={{ color: "var(--muted)" }}>لا توجد نشاطات خلال الفترة</div>}</div></div>;
}

function CompanyPerformance({ company }: { company: CompanyAnalytics }) {
  const item = companies[company.key]; const Icon = company.key === "spark" ? ClipboardCheck : Truck;
  const stats: Array<[string, string | number]> = [["المشاريع النشطة", company.activeProjects], ["المهام المكتملة", `${company.completedTasks}/${company.totalTasks}`], ["تسليمات الفترة", company.deliveries], ["نسبة الإنجاز", `${company.completionRate}%`]];
  const chart = company.trend.map((point) => ({ v: point.value, date: point.date }));
  return <div className="card overflow-hidden"><div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "var(--border)" }}><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${item.color}15`, color: item.color }}><Icon size={20} /></span><div><h3 className="font-medium">{item.name}</h3><p className="text-xs" style={{ color: "var(--muted)" }}>{company.activeEmployees} موظفين نشطين · {company.overdueTasks} مهام متأخرة</p></div></div><Link href={`/companies/${company.key}`} className="text-xs font-medium text-brand">عرض التفاصيل</Link></div><div className="grid sm:grid-cols-[1.15fr_.85fr]"><div className="grid grid-cols-2 gap-px p-5">{stats.map(([label, value]) => <div key={label} className="p-2"><div className="text-xs" style={{ color: "var(--muted)" }}>{label}</div><div className="mt-1 text-xl font-medium">{value}</div></div>)}</div><div className="h-44 p-4"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chart}><defs><linearGradient id={`g-${company.key}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={item.color} stopOpacity={.28} /><stop offset="100%" stopColor={item.color} stopOpacity={.02} /></linearGradient></defs><Tooltip contentStyle={{ direction: "rtl", borderRadius: 12, background: "var(--surface)", borderColor: "var(--border)", fontSize: 12 }} /><Area type="monotone" dataKey="v" stroke={item.color} strokeWidth={2.5} fill={`url(#g-${company.key})`} /></AreaChart></ResponsiveContainer></div></div></div>;
}
