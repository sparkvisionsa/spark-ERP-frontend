"use client";

import AppShell from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { Modal } from "@/components/ui";
import { apiRequest, ApiError } from "@/lib/api";
import { AnalyticsOverview, CompanyAnalytics, relativeTime } from "@/lib/analytics";
import { companies, CompanyKey } from "@/lib/data";
import { AlertTriangle, ArrowLeft, CheckCircle2, ClipboardCheck, Edit3, FolderKanban, Image, Loader2, PackageCheck, Plus, RefreshCw, Send, Trash2, Truck, Users, Video } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";

type Filter = "all" | CompanyKey;
type Organisation = { key: string; name: string; logoUrl?: string; color?: string; departments?: Array<{ name: string }> };

export default function DashboardPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>("all");
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [companyModal, setCompanyModal] = useState(false);
  const [companiesModal, setCompaniesModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Organisation | null>(null);

  useEffect(() => { if (user?.role !== "SUPER_ADMIN" && user?.company) setFilter(user.company); }, [user]);
  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true); setError("");
    try { setData(await apiRequest<AnalyticsOverview>(`/analytics/overview?days=30${filter !== "all" ? `&company=${filter}` : ""}`)); }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : "تعذر تحميل مؤشرات لوحة التحكم"); }
    finally { setLoading(false); }
  }, [filter, user]);
  useEffect(() => { void load(); }, [load]);
  const loadOrganisations = useCallback(async () => {
    if (!user) return;
    try { setOrganisations(await apiRequest<Organisation[]>("/companies")); } catch { /* keep the dashboard usable if organisation data is temporarily unavailable */ }
  }, [user]);
  useEffect(() => { void loadOrganisations(); }, [loadOrganisations]);

  const filters = useMemo(() => user?.role === "SUPER_ADMIN" || !user?.company ? (["all", ...organisations.map((company) => company.key)] as Filter[]) : ([user.company] as Filter[]), [user, organisations]);
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
      <div className="flex items-center gap-1.5">{filters.map((key) => { const company = organisations.find((entry) => entry.key === key) || companies[key]; return <button key={key} onClick={() => setFilter(key)} className={`chip whitespace-nowrap ${filter === key ? "chip-active" : ""}`}>{key !== "all" && <span className="h-2 w-2 rounded-full" style={{ background: company?.color || "#7A2838" }} />}{key === "all" ? "كل الشركات" : company?.name || key}</button>; })}{user?.role === "SUPER_ADMIN" && <><button className="btn h-8 px-2 text-xs" onClick={() => setCompaniesModal(true)}>عرض الشركات</button><button className="btn h-8 px-2 text-xs" onClick={() => { setEditingCompany(null); setCompanyModal(true); }}><Plus size={14} />إضافة شركة</button></>}<button className="btn-ghost" onClick={() => void load()} aria-label="تحديث البيانات"><RefreshCw size={14} className={loading ? "animate-spin" : ""} /></button></div>
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
    <CompanyModal open={companyModal} company={editingCompany} onClose={() => { setCompanyModal(false); setEditingCompany(null); }} onSave={async (payload) => { await apiRequest(editingCompany ? `/companies/${editingCompany.key}` : "/companies", { method: editingCompany ? "PATCH" : "POST", body: JSON.stringify(payload) }); setCompanyModal(false); setEditingCompany(null); await loadOrganisations(); await load(); }} />
    <CompaniesTableModal open={companiesModal} companies={organisations} onClose={() => setCompaniesModal(false)} onEdit={(company) => { setCompaniesModal(false); setEditingCompany(company); setCompanyModal(true); }} onDelete={async (company) => { if (!window.confirm(`حذف شركة «${company.name}»؟ لا يمكن التراجع عن ذلك.`)) return; await apiRequest(`/companies/${company.key}`, { method: "DELETE" }); await loadOrganisations(); await load(); }} />
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
  const item = companies[company.key] || { name: company.key, color: "#7A2838" }; const Icon = company.key === "spark" ? ClipboardCheck : Truck;
  const stats: Array<[string, string | number]> = [["المشاريع النشطة", company.activeProjects], ["المهام المكتملة", `${company.completedTasks}/${company.totalTasks}`], ["تسليمات الفترة", company.deliveries], ["نسبة الإنجاز", `${company.completionRate}%`]];
  const chart = company.trend.map((point) => ({ v: point.value, date: point.date }));
  return <div className="card overflow-hidden"><div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "var(--border)" }}><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${item.color}15`, color: item.color }}><Icon size={20} /></span><div><h3 className="font-medium">{item.name}</h3><p className="text-xs" style={{ color: "var(--muted)" }}>{company.activeEmployees} موظفين نشطين · {company.overdueTasks} مهام متأخرة</p></div></div><Link href={`/companies/${company.key}`} className="text-xs font-medium text-brand">عرض التفاصيل</Link></div><div className="grid sm:grid-cols-[1.15fr_.85fr]"><div className="grid grid-cols-2 gap-px p-5">{stats.map(([label, value]) => <div key={label} className="p-2"><div className="text-xs" style={{ color: "var(--muted)" }}>{label}</div><div className="mt-1 text-xl font-medium">{value}</div></div>)}</div><div className="h-44 p-4"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chart}><defs><linearGradient id={`g-${company.key}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={item.color} stopOpacity={.28} /><stop offset="100%" stopColor={item.color} stopOpacity={.02} /></linearGradient></defs><Tooltip contentStyle={{ direction: "rtl", borderRadius: 12, background: "var(--surface)", borderColor: "var(--border)", fontSize: 12 }} /><Area type="monotone" dataKey="v" stroke={item.color} strokeWidth={2.5} fill={`url(#g-${company.key})`} /></AreaChart></ResponsiveContainer></div></div></div>;
}

function CompaniesTableModal({ open, companies: rows, onClose, onEdit, onDelete }: { open: boolean; companies: Organisation[]; onClose: () => void; onEdit: (company: Organisation) => void; onDelete: (company: Organisation) => Promise<void> }) {
  const [deleting, setDeleting] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const remove = async (company: Organisation) => { setDeleting(company.key); setActionError(""); try { await onDelete(company); } catch (caught) { setActionError(caught instanceof ApiError ? caught.message : "تعذر حذف الشركة"); } finally { setDeleting(null); } };
  return <Modal open={open} onClose={() => !deleting && onClose()} title="عرض الشركات" subtitle="إدارة الشركات المسجلة وأقسامها">{actionError && <p className="mx-4 mt-4 rounded-lg px-3 py-2 text-xs" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>{actionError}</p>}<div className="max-h-[60vh] overflow-auto p-4"><table className="w-full min-w-[520px] text-right text-sm"><thead className="text-xs" style={{ color: "var(--muted)" }}><tr className="border-b" style={{ borderColor: "var(--border)" }}><th className="p-2 font-medium">الشركة</th><th className="p-2 font-medium">الأقسام</th><th className="p-2 font-medium">اللون</th><th className="p-2 font-medium">الإجراءات</th></tr></thead><tbody>{rows.map((company) => <tr key={company.key} className="border-b last:border-0" style={{ borderColor: "var(--border)" }}><td className="p-2.5 font-medium"><div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: company.color || "#7A2838" }} />{company.name}</div></td><td className="p-2.5 text-xs" style={{ color: "var(--muted)" }}>{company.departments?.length || 0}</td><td className="p-2.5"><code className="text-xs" style={{ color: "var(--muted)" }}>{company.color || "#7A2838"}</code></td><td className="p-2.5"><div className="flex justify-end gap-1"><button className="btn-ghost h-8 w-8 p-0" title="تعديل الشركة" onClick={() => onEdit(company)}><Edit3 size={14} /></button><button className="btn-ghost h-8 w-8 p-0" title="حذف الشركة" disabled={deleting === company.key} onClick={() => void remove(company)}>{deleting === company.key ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}</button></div></td></tr>)}{!rows.length && <tr><td colSpan={4} className="p-8 text-center text-xs" style={{ color: "var(--muted)" }}>لا توجد شركات مسجلة بعد.</td></tr>}</tbody></table></div><footer className="flex justify-end border-t p-3" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}><button className="btn" onClick={onClose} disabled={!!deleting}>إغلاق</button></footer></Modal>;
}

function CompanyModal({ open, company, onClose, onSave }: { open: boolean; company: Organisation | null; onClose: () => void; onSave: (payload: { name: string; logoUrl?: string; color?: string }) => Promise<void> }) {
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [color, setColor] = useState("#7A2838");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setName(company?.name || ""); setLogoUrl(company?.logoUrl || ""); setColor(company?.color || "#7A2838"); } }, [open, company]);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); if (!name.trim()) return; setBusy(true); try { await onSave({ name: name.trim(), logoUrl: logoUrl.trim() || undefined, color }); setName(""); setLogoUrl(""); } finally { setBusy(false); } };
  return <Modal open={open} onClose={() => !busy && onClose()} title={company ? "تعديل الشركة" : "إضافة شركة"} subtitle={company ? "عدّل بيانات الشركة ثم احفظ التغييرات." : "أدخل الاسم والشعار، ويمكن إضافة الأقسام من داخل صفحة الشركة."}><form onSubmit={(event) => void submit(event)}><div className="space-y-3 p-4"><label><span className="label">اسم الشركة *</span><input autoFocus className="field" value={name} onChange={(event) => setName(event.target.value)} required /></label><label><span className="label">رابط الشعار <small style={{ color: "var(--subtle)" }}>(اختياري)</small></span><input className="field" dir="ltr" type="url" placeholder="https://" value={logoUrl} onChange={(event) => setLogoUrl(event.target.value)} /></label><label><span className="label">اللون</span><input className="field h-10 p-1" type="color" value={color} onChange={(event) => setColor(event.target.value)} /></label></div><footer className="flex justify-end gap-2 border-t p-3" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}><button type="button" className="btn" disabled={busy} onClick={onClose}>إلغاء</button><button className="btn-primary" disabled={busy || !name.trim()}>{busy && <Loader2 size={14} className="animate-spin" />}{company ? "حفظ التعديلات" : "حفظ الشركة"}</button></footer></form></Modal>;
}
