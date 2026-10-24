"use client";

import AppShell from "@/components/app-shell";
import { AnalyticsOverview } from "@/lib/analytics";
import { apiRequest, ApiError } from "@/lib/api";
import { companies, CompanyKey } from "@/lib/data";
import { AlertTriangle, ClipboardCheck, Code2, FolderKanban, Loader2, MapPin, RefreshCw, Truck, Users } from "lucide-react";
import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";

export default function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const route = use(params);
  const key: CompanyKey = route.id === "pro" ? "pro" : "spark";
  const company = companies[key];
  const Icon = key === "spark" ? ClipboardCheck : Truck;
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setData(await apiRequest<AnalyticsOverview>(`/analytics/overview?company=${key}&days=30`)); }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : "تعذر تحميل بيانات الشركة"); }
    finally { setLoading(false); }
  }, [key]);
  useEffect(() => { void load(); }, [load]);
  const stats = data?.companies.find((entry) => entry.key === key);
  const projects = data?.projects.filter((project) => project.company === key) || [];

  return <AppShell title={company.name} actions={<button className="btn-ghost" onClick={() => void load()} aria-label="تحديث"><RefreshCw size={15} className={loading ? "animate-spin" : ""} /></button>}><div className="mx-auto max-w-[1400px] space-y-4">
    <section className="card relative overflow-hidden p-5"><div className="absolute inset-y-0 end-0 w-1.5" style={{ background: company.color }} /><div className="flex flex-wrap items-center gap-4"><span className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: `${company.color}15`, color: company.color }}><Icon size={24} /></span><div className="flex-1"><div className="flex items-center gap-2"><h2 className="text-lg font-medium">{company.name}</h2><span className="status status-success">نشطة</span></div><p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>{company.subtitle} · المملكة العربية السعودية</p></div><span className="text-[11px]" style={{ color: "var(--muted)" }}>آخر تحديث {data ? new Intl.DateTimeFormat("ar-SA", { hour: "numeric", minute: "2-digit" }).format(new Date(data.generatedAt)) : "—"}</span></div></section>
    {error && <div className="rounded-lg px-3 py-2 text-xs" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>{error}</div>}
    {loading && !data ? <div className="card flex min-h-52 items-center justify-center"><Loader2 className="animate-spin text-brand" /></div> : !stats ? <div className="card p-10 text-center text-sm" style={{ color: "var(--muted)" }}>لا تملك صلاحية عرض بيانات هذه الشركة أو لا توجد بيانات مسجلة.</div> : <>
      <section className="grid gap-3 sm:grid-cols-4"><CompanyStat label="المشاريع النشطة" value={String(stats.activeProjects)} icon={<FolderKanban size={18} />} color={company.color} /><CompanyStat label="الموظفون النشطون" value={`${stats.activeEmployees}/${stats.employees}`} icon={<Users size={18} />} color="#1D9E75" /><CompanyStat label="نسبة الإنجاز" value={`${stats.completionRate}%`} icon={<ClipboardCheck size={18} />} color="#BA7517" /><CompanyStat label="المهام المتأخرة" value={String(stats.overdueTasks)} icon={<AlertTriangle size={18} />} color="#E24B4A" /></section>
      {key === "pro" && <section id="tech" className="card p-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E6F1FB] text-[#185FA5]"><Code2 size={18} /></span><div><h3 className="text-sm font-medium">القسم التقني</h3><p className="text-[11px]" style={{ color: "var(--muted)" }}>تطوير البرامج والتطبيقات والمواقع الداعمة للشركتين</p></div></div></section>}
      <section className="card overflow-hidden"><div className="flex items-center justify-between border-b p-4" style={{ borderColor: "var(--border)" }}><div><h3 className="text-sm font-medium">مشاريع الشركة</h3><p className="text-[11px]" style={{ color: "var(--muted)" }}>{stats.projects} مشروع · {stats.totalTasks} مهمة · {stats.deliveries} تسليم خلال 30 يوماً</p></div><Link href={`/projects?c=${key}`} className="text-xs font-medium text-brand">عرض في مساحة العمل</Link></div><div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">{projects.length ? projects.map((project) => <Link key={project.id} href={`/projects?p=${project.id}`} className="rounded-xl border p-3 transition hover:border-brand" style={{ borderColor: "var(--border)" }}><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: company.color }} /><h4 className="min-w-0 flex-1 truncate text-xs font-medium">{project.name}</h4><span className="text-xs">{project.progress}%</span></div><div className="mt-2 flex items-center gap-1 truncate text-[11px]" style={{ color: "var(--muted)" }}><MapPin size={12} />{project.client || "لا يوجد عميل محدد"}</div><div className="mt-2 h-1 overflow-hidden rounded-full" style={{ background: "var(--surface-3)" }}><i className="block h-full" style={{ width: `${project.progress}%`, background: company.color }} /></div></Link>) : <div className="col-span-full p-8 text-center text-xs" style={{ color: "var(--muted)" }}>لم تُسجل مشاريع لهذه الشركة بعد</div>}</div></section>
    </>}
  </div></AppShell>;
}

function CompanyStat({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  return <div className="card flex items-center gap-3 p-4"><span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: `${color}15`, color }}>{icon}</span><div><div className="text-xl font-medium">{value}</div><div className="text-[11px]" style={{ color: "var(--muted)" }}>{label}</div></div></div>;
}
