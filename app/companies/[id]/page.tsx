"use client";

import AppShell from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { Modal } from "@/components/ui";
import { AnalyticsOverview } from "@/lib/analytics";
import { apiRequest, ApiError } from "@/lib/api";
import { companies, CompanyKey } from "@/lib/data";
import { AlertTriangle, Check, ClipboardCheck, Edit3, ExternalLink, FolderKanban, Loader2, Mail, MapPin, Phone, Plus, RefreshCw, Search, Trash2, Truck, UserRound, Users, X } from "lucide-react";
import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useState } from "react";

type CompanyEmployee = {
  _id?: string;
  id?: string;
  fullName: string;
  company: string | null;
  department?: string;
  jobTitle?: string;
  phone?: string;
  email?: string;
  status: "ACTIVE" | "ON_LEAVE" | "INACTIVE";
  role: "SUPER_ADMIN" | "SUPERVISOR" | "EMPLOYEE";
};

const employeeId = (employee: CompanyEmployee) => employee._id || employee.id || "";
const employeeStatusLabel: Record<CompanyEmployee["status"], string> = {
  ACTIVE: "نشط",
  ON_LEAVE: "في إجازة",
  INACTIVE: "غير نشط",
};
const employeeRoleLabel: Record<CompanyEmployee["role"], string> = {
  SUPER_ADMIN: "مدير النظام",
  SUPERVISOR: "مشرف",
  EMPLOYEE: "موظف",
};

export default function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const route = use(params);
  const key: CompanyKey = route.id;
  const { user } = useAuth();
  const [organisation, setOrganisation] = useState<{ key: string; name: string; logoUrl?: string; color?: string; departments?: Array<{ name: string }> } | null>(null);
  const [departmentName, setDepartmentName] = useState("");
  const [editingDepartment, setEditingDepartment] = useState<string | null>(null);
  const [editingDepartmentName, setEditingDepartmentName] = useState("");
  const company = organisation || companies[key] || { id: key, name: key, subtitle: "", color: "#7A2838", icon: "Building2" };
  const companyColor = company.color || "#7A2838";
  const Icon = key === "spark" ? ClipboardCheck : Truck;
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [employeesOpen, setEmployeesOpen] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setData(await apiRequest<AnalyticsOverview>(`/analytics/overview?company=${key}&days=30`)); }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : "تعذر تحميل بيانات الشركة"); }
    finally { setLoading(false); }
  }, [key]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void apiRequest<Array<{ key: string; name: string; logoUrl?: string; color?: string; departments?: Array<{ name: string }> }>>("/companies").then((rows) => setOrganisation(rows.find((entry) => entry.key === key) || null)).catch(() => undefined); }, [key]);
  const stats = data?.companies.find((entry) => entry.key === key);
  const projects = data?.projects.filter((project) => project.company === key) || [];

  const addDepartment = async () => { if (!departmentName.trim()) return; try { const updated = await apiRequest<typeof organisation>(`/companies/${key}/departments`, { method: "POST", body: JSON.stringify({ name: departmentName.trim() }) }); setOrganisation(updated); setDepartmentName(""); } catch (caught) { setError(caught instanceof ApiError ? caught.message : "تعذر إضافة القسم"); } };
  const updateDepartment = async (currentName: string) => { if (!editingDepartmentName.trim()) return; try { const updated = await apiRequest<typeof organisation>(`/companies/${key}/departments/${encodeURIComponent(currentName)}`, { method: "PATCH", body: JSON.stringify({ name: editingDepartmentName.trim() }) }); setOrganisation(updated); setEditingDepartment(null); setEditingDepartmentName(""); } catch (caught) { setError(caught instanceof ApiError ? caught.message : "تعذر تعديل القسم"); } };
  const removeDepartment = async (name: string) => { if (!window.confirm(`حذف قسم «${name}»؟`)) return; try { const updated = await apiRequest<typeof organisation>(`/companies/${key}/departments/${encodeURIComponent(name)}`, { method: "DELETE" }); setOrganisation(updated); } catch (caught) { setError(caught instanceof ApiError ? caught.message : "تعذر حذف القسم"); } };
  return <AppShell title={company.name} actions={<><button className="btn h-8 px-2.5 text-[11px]" onClick={() => setEmployeesOpen(true)}><Users size={14} />عرض الموظفين{stats ? <span className="status status-neutral px-1.5 py-0.5">{stats.employees}</span> : null}</button><button className="btn-ghost" onClick={() => void load()} aria-label="تحديث"><RefreshCw size={15} className={loading ? "animate-spin" : ""} /></button></>}><div className="mx-auto max-w-[1400px] space-y-4">
    <section className="card relative overflow-hidden p-5"><div className="absolute inset-y-0 end-0 w-1.5" style={{ background: companyColor }} /><div className="flex flex-wrap items-center gap-4"><span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl" style={{ background: `${companyColor}15`, color: companyColor }}>{organisation?.logoUrl ? <img src={organisation.logoUrl} alt={`شعار ${company.name}`} className="h-full w-full object-contain" /> : <Icon size={24} />}</span><div className="flex-1"><div className="flex items-center gap-2"><h2 className="text-lg font-medium">{company.name}</h2><span className="status status-success">نشطة</span></div><p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>مساحة عمل الشركة</p></div><span className="text-[11px]" style={{ color: "var(--muted)" }}>آخر تحديث {data ? new Intl.DateTimeFormat("ar-SA", { hour: "numeric", minute: "2-digit" }).format(new Date(data.generatedAt)) : "—"}</span></div></section>
    {error && <div className="rounded-lg px-3 py-2 text-xs" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>{error}</div>}
    {loading && !data ? <div className="card flex min-h-52 items-center justify-center"><Loader2 className="animate-spin text-brand" /></div> : !stats ? <div className="card p-10 text-center text-sm" style={{ color: "var(--muted)" }}>لا تملك صلاحية عرض بيانات هذه الشركة أو لا توجد بيانات مسجلة.</div> : <>
      <section className="grid gap-3 sm:grid-cols-4"><CompanyStat label="المشاريع النشطة" value={String(stats.activeProjects)} icon={<FolderKanban size={18} />} color={companyColor} /><CompanyStat label="الموظفون النشطون" value={`${stats.activeEmployees}/${stats.employees}`} icon={<Users size={18} />} color="#1D9E75" /><CompanyStat label="نسبة الإنجاز" value={`${stats.completionRate}%`} icon={<ClipboardCheck size={18} />} color="#BA7517" /><CompanyStat label="المهام المتأخرة" value={String(stats.overdueTasks)} icon={<AlertTriangle size={18} />} color="#E24B4A" /></section>
      <section className="card p-4"><div className="mb-3 flex items-center justify-between"><div><h3 className="text-sm font-medium">الأقسام</h3><p className="text-[11px]" style={{ color: "var(--muted)" }}>تنظيم الموظفين حسب أقسام الشركة</p></div></div><div className="flex flex-wrap gap-1.5">{organisation?.departments?.length ? organisation.departments.map((department) => <div key={department.name} className="chip gap-1.5">{editingDepartment === department.name ? <><input autoFocus className="h-6 w-32 rounded border bg-transparent px-1 text-xs outline-none" style={{ borderColor: "var(--border)" }} value={editingDepartmentName} onChange={(event) => setEditingDepartmentName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void updateDepartment(department.name); if (event.key === "Escape") setEditingDepartment(null); }} /><button className="rounded p-0.5 hover:bg-black/5" title="حفظ" onClick={() => void updateDepartment(department.name)}><Check size={13} /></button><button className="rounded p-0.5 hover:bg-black/5" title="إلغاء" onClick={() => { setEditingDepartment(null); setEditingDepartmentName(""); }}><X size={13} /></button></> : <><span>{department.name}</span>{user?.role === "SUPER_ADMIN" && <span className="mr-1 flex gap-0.5 border-r pr-1" style={{ borderColor: "var(--border)" }}><button className="rounded p-0.5 hover:bg-black/5" title="تعديل القسم" onClick={() => { setEditingDepartment(department.name); setEditingDepartmentName(department.name); }}><Edit3 size={12} /></button><button className="rounded p-0.5 hover:bg-black/5" title="حذف القسم" onClick={() => void removeDepartment(department.name)}><Trash2 size={12} /></button></span>}</>}</div>) : <span className="text-xs" style={{ color: "var(--muted)" }}>لا توجد أقسام بعد</span>}</div>{user?.role === "SUPER_ADMIN" && <div className="mt-3 flex gap-2"><input className="field h-9 text-xs" value={departmentName} onChange={(event) => setDepartmentName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void addDepartment(); }} placeholder="اسم القسم الجديد" /><button className="btn h-9 px-3 text-xs" onClick={() => void addDepartment()} disabled={!departmentName.trim()}><Plus size={14} />إضافة قسم</button></div>}</section>
      <section className="card overflow-hidden"><div className="flex items-center justify-between border-b p-4" style={{ borderColor: "var(--border)" }}><div><h3 className="text-sm font-medium">مشاريع الشركة</h3><p className="text-[11px]" style={{ color: "var(--muted)" }}>{stats.projects} مشروع · {stats.totalTasks} مهمة · {stats.deliveries} تسليم خلال 30 يوماً</p></div><Link href={`/projects?c=${key}`} className="text-xs font-medium text-brand">عرض في مساحة العمل</Link></div><div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">{projects.length ? projects.map((project) => <Link key={project.id} href={`/projects?p=${project.id}`} className="rounded-xl border p-3 transition hover:border-brand" style={{ borderColor: "var(--border)" }}><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: companyColor }} /><h4 className="min-w-0 flex-1 truncate text-xs font-medium">{project.name}</h4><span className="text-xs">{project.progress}%</span></div><div className="mt-2 flex items-center gap-1 truncate text-[11px]" style={{ color: "var(--muted)" }}><MapPin size={12} />{project.client || "لا يوجد عميل محدد"}</div><div className="mt-2 h-1 overflow-hidden rounded-full" style={{ background: "var(--surface-3)" }}><i className="block h-full" style={{ width: `${project.progress}%`, background: companyColor }} /></div></Link>) : <div className="col-span-full p-8 text-center text-xs" style={{ color: "var(--muted)" }}>لم تُسجل مشاريع لهذه الشركة بعد</div>}</div></section>
    </>}
  </div><CompanyEmployeesModal open={employeesOpen} onClose={() => setEmployeesOpen(false)} onChanged={() => void load()} companyKey={key} companyName={company.name} companyColor={companyColor} canManage={user?.role === "SUPER_ADMIN"} /></AppShell>;
}

function CompanyStat({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  return <div className="card flex items-center gap-3 p-4"><span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: `${color}15`, color }}>{icon}</span><div><div className="text-xl font-medium">{value}</div><div className="text-[11px]" style={{ color: "var(--muted)" }}>{label}</div></div></div>;
}

function CompanyEmployeesModal({
  open,
  onClose,
  onChanged,
  companyKey,
  companyName,
  companyColor,
  canManage,
}: {
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
  companyKey: string;
  companyName: string;
  companyColor: string;
  canManage: boolean;
}) {
  const [employees, setEmployees] = useState<CompanyEmployee[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await apiRequest<CompanyEmployee[]>("/employees");
      setEmployees(rows.filter((employee) => employee.company === companyKey));
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "تعذر تحميل موظفي الشركة",
      );
    } finally {
      setLoading(false);
    }
  }, [companyKey]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    void loadEmployees();
  }, [open, loadEmployees]);

  const visibleEmployees = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ar");
    if (!normalizedQuery) return employees;
    return employees.filter((employee) =>
      [
        employee.fullName,
        employee.department,
        employee.jobTitle,
        employee.email,
        employee.phone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("ar")
        .includes(normalizedQuery),
    );
  }, [employees, query]);

  const updateStatus = async (
    employee: CompanyEmployee,
    status: CompanyEmployee["status"],
  ) => {
    const id = employeeId(employee);
    if (!id || busyId) return;
    setBusyId(id);
    setError("");
    try {
      const updated = await apiRequest<CompanyEmployee>(
        `/employees/${id}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ status }),
        },
      );
      setEmployees((current) =>
        current.map((entry) => (employeeId(entry) === id ? updated : entry)),
      );
      onChanged();
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : "تعذر تحديث حالة الموظف",
      );
    } finally {
      setBusyId("");
    }
  };

  const removeEmployee = async (employee: CompanyEmployee) => {
    const id = employeeId(employee);
    if (
      !id ||
      busyId ||
      !window.confirm(`هل تريد حذف حساب الموظف «${employee.fullName}»؟`)
    )
      return;
    setBusyId(id);
    setError("");
    try {
      await apiRequest(`/employees/${id}`, { method: "DELETE" });
      setEmployees((current) =>
        current.filter((entry) => employeeId(entry) !== id),
      );
      onChanged();
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : "تعذر حذف الموظف",
      );
    } finally {
      setBusyId("");
    }
  };

  const activeCount = employees.filter(
    (employee) => employee.status === "ACTIVE",
  ).length;
  const leaveCount = employees.filter(
    (employee) => employee.status === "ON_LEAVE",
  ).length;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`موظفو ${companyName}`}
      subtitle="عرض بيانات الفريق والتواصل وإدارة حالة الحساب"
      maxWidth="max-w-5xl"
    >
      <div className="border-b p-4" style={{ borderColor: "var(--border)" }}>
        <div className="grid gap-2 sm:grid-cols-3">
          <EmployeeSummary
            label="إجمالي الموظفين"
            value={employees.length}
            color={companyColor}
          />
          <EmployeeSummary
            label="النشطون"
            value={activeCount}
            color="var(--success)"
          />
          <EmployeeSummary
            label="في إجازة أو غير نشط"
            value={employees.length - activeCount}
            color="var(--warning)"
          />
        </div>
        <div className="relative mt-3">
          <Search
            className="absolute end-3 top-1/2 -translate-y-1/2"
            size={15}
            color="var(--muted)"
          />
          <input
            className="field h-9 pe-9 text-xs"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث بالاسم أو القسم أو المسمى أو بيانات التواصل"
            aria-label="البحث في موظفي الشركة"
          />
        </div>
      </div>

      <div className="max-h-[62vh] overflow-y-auto p-4">
        {error && (
          <div
            className="mb-3 flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-xs"
            style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
          >
            <span>{error}</span>
            <button className="shrink-0 underline" onClick={() => void loadEmployees()}>
              إعادة المحاولة
            </button>
          </div>
        )}

        {loading ? (
          <div className="grid gap-3 md:grid-cols-2">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-40 animate-pulse rounded-xl"
                style={{ background: "var(--surface-3)" }}
              />
            ))}
          </div>
        ) : visibleEmployees.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {visibleEmployees.map((employee) => {
              const id = employeeId(employee);
              const isBusy = busyId === id;
              return (
                <article
                  key={id}
                  className="overflow-hidden rounded-xl border"
                  style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                >
                  <div className="flex items-start gap-3 p-4">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                      style={{ background: `${companyColor}15`, color: companyColor }}
                    >
                      <UserRound size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="min-w-0 truncate text-sm font-medium">
                          {employee.fullName}
                        </h3>
                        <span className="status status-neutral">
                          {employeeRoleLabel[employee.role]}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-[11px]" style={{ color: "var(--muted)" }}>
                        {employee.jobTitle || "مسمى وظيفي غير محدد"} · {employee.department || "قسم غير محدد"}
                      </p>
                    </div>
                  </div>

                  <div
                    className="grid gap-2 border-y px-4 py-3 text-[11px] sm:grid-cols-2"
                    style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
                  >
                    <span className="flex min-w-0 items-center gap-1.5" dir="ltr">
                      <Mail size={12} className="shrink-0" color="var(--muted)" />
                      <span className="truncate">{employee.email || "لا يوجد بريد"}</span>
                    </span>
                    <span className="flex min-w-0 items-center gap-1.5" dir="ltr">
                      <Phone size={12} className="shrink-0" color="var(--muted)" />
                      <span className="truncate">{employee.phone || "لا يوجد رقم"}</span>
                    </span>
                  </div>

                  <footer className="flex flex-wrap items-center justify-between gap-2 p-3">
                    {canManage && employee.role !== "SUPER_ADMIN" ? (
                      <select
                        className={`status border-0 outline-none ${employee.status === "ACTIVE" ? "status-success" : employee.status === "ON_LEAVE" ? "status-warning" : "status-neutral"}`}
                        value={employee.status}
                        disabled={isBusy}
                        onChange={(event) =>
                          void updateStatus(
                            employee,
                            event.target.value as CompanyEmployee["status"],
                          )
                        }
                        aria-label={`حالة ${employee.fullName}`}
                      >
                        <option value="ACTIVE">نشط</option>
                        <option value="ON_LEAVE">في إجازة</option>
                        <option value="INACTIVE">غير نشط</option>
                      </select>
                    ) : (
                      <span
                        className={`status ${employee.status === "ACTIVE" ? "status-success" : employee.status === "ON_LEAVE" ? "status-warning" : "status-neutral"}`}
                      >
                        {employeeStatusLabel[employee.status]}
                      </span>
                    )}

                    <div className="flex items-center gap-1">
                      {employee.email && (
                        <a
                          className="btn-ghost"
                          href={`mailto:${employee.email}`}
                          title={`مراسلة ${employee.fullName}`}
                        >
                          <Mail size={14} />
                        </a>
                      )}
                      {employee.phone && (
                        <a
                          className="btn-ghost"
                          href={`tel:${employee.phone}`}
                          title={`الاتصال بـ ${employee.fullName}`}
                        >
                          <Phone size={14} />
                        </a>
                      )}
                      <Link
                        className="btn h-8 px-2 text-[10px]"
                        href={`/employees?employee=${encodeURIComponent(id)}`}
                        title="فتح ملف الموظف"
                      >
                        <ExternalLink size={13} />
                        الملف
                      </Link>
                      {canManage && employee.role !== "SUPER_ADMIN" && (
                        <button
                          className="btn-ghost text-danger"
                          disabled={isBusy}
                          onClick={() => void removeEmployee(employee)}
                          title={`حذف ${employee.fullName}`}
                        >
                          {isBusy ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      )}
                    </div>
                  </footer>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="flex min-h-48 flex-col items-center justify-center text-center">
            <Users size={28} color="var(--muted)" />
            <p className="mt-3 text-sm font-medium">
              {employees.length ? "لا توجد نتائج مطابقة" : "لا يوجد موظفون في هذه الشركة"}
            </p>
            <p className="mt-1 text-[11px]" style={{ color: "var(--muted)" }}>
              {employees.length
                ? "جرّب البحث باسم أو قسم مختلف."
                : "يمكن إضافة الموظفين وإسنادهم إلى الشركة من صفحة الموظفين."}
            </p>
          </div>
        )}
      </div>

      <footer
        className="flex items-center justify-between border-t px-4 py-3"
        style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
      >
        <span className="text-[10px]" style={{ color: "var(--muted)" }}>
          {activeCount} نشط · {leaveCount} في إجازة
        </span>
        <button className="btn" onClick={onClose}>إغلاق</button>
      </footer>
    </Modal>
  );
}

function EmployeeSummary({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      className="flex items-center justify-between rounded-lg border px-3 py-2"
      style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
    >
      <span className="text-[11px]" style={{ color: "var(--muted)" }}>{label}</span>
      <b className="text-sm" style={{ color }}>{value}</b>
    </div>
  );
}
