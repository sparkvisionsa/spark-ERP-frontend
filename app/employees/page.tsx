"use client";

import AppShell from "@/components/app-shell";
import { Avatar, EmptyState, Modal, Toast } from "@/components/ui";
import { companies, Employee } from "@/lib/data";
import {
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  FileText,
  IdCard,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserRoundPlus,
  XCircle,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest, ApiError } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";

type ApiEmployee = {
  _id?: string;
  id?: string;
  fullName: string;
  company: string | null;
  department?: string;
  jobTitle?: string;
  status: "ACTIVE" | "ON_LEAVE" | "INACTIVE";
  phone?: string;
  email?: string;
  nationalId?: string;
  directManagerId?: string;
  hireDate?: string;
  birthDate?: string;
  contractType?: string;
  gender?: string;
  role: "SUPER_ADMIN" | "SUPERVISOR" | "EMPLOYEE";
};
type Organisation = {
  key: string;
  name: string;
  color?: string;
  departments?: Array<{ name: string }>;
};
type CreateEmployeePayload = {
  fullName?: string;
  phone?: string;
  email?: string;
  nationalId?: string;
  password: string;
  role: "SUPERVISOR" | "EMPLOYEE";
  company: string;
  department?: string;
};
type LeaveRecord = {
  _id: string;
  type: string;
  startDate: string;
  endDate: string;
  notes?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
};
type AttendanceRecord = {
  _id: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  notes?: string;
};
type DocumentRecord = {
  _id: string;
  name: string;
  type: string;
  url?: string;
  expiresAt?: string;
  notes?: string;
};
type HrRecord = {
  leaves: LeaveRecord[];
  attendance: AttendanceRecord[];
  documents: DocumentRecord[];
};

const toEmployee = (employee: ApiEmployee): Employee => ({
  id: employee._id || employee.id || "",
  name: employee.fullName,
  company: employee.company,
  department: employee.department || "",
  title:
    employee.jobTitle ||
    (employee.role === "SUPER_ADMIN"
      ? "مدير النظام"
      : employee.role === "SUPERVISOR"
        ? "مشرف"
        : "موظف"),
  status:
    employee.status === "ACTIVE"
      ? "نشط"
      : employee.status === "ON_LEAVE"
        ? "في إجازة"
        : "غير نشط",
  phone: employee.phone || "",
  email: employee.email || "",
  nationalId: employee.nationalId || "",
  manager: employee.directManagerId || "",
  hireDate: employee.hireDate?.slice(0, 10) || "",
  birthDate: employee.birthDate?.slice(0, 10) || "",
  contract: employee.contractType || "دوام كامل",
  gender: employee.gender || "ذكر",
  color:
    employee.role === "SUPER_ADMIN"
      ? "#534AB7"
      : employee.role === "SUPERVISOR"
        ? "#185FA5"
        : "#0F6E56",
  role: employee.role,
});

const tabs = [
  { id: "work", label: "البيانات الوظيفية", icon: BriefcaseBusiness },
  { id: "leave", label: "الإجازات", icon: CalendarDays },
  { id: "attendance", label: "الحضور والانصراف", icon: Clock3 },
  { id: "docs", label: "المستندات", icon: FileText },
];

export default function EmployeesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "SUPER_ADMIN";
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [filter, setFilter] = useState<"all" | string>("all");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("work");
  const [modal, setModal] = useState(false);
  const [toast, setToast] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const selected =
    employees.find((employee) => employee.id === selectedId) || employees[0];
  const visible = useMemo(
    () =>
      employees.filter(
        (employee) =>
          (filter === "all" || employee.company === filter) &&
          `${employee.name} ${employee.department}`.includes(query.trim()),
      ),
    [employees, filter, query],
  );

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [result, companyRows] = await Promise.all([
        apiRequest<ApiEmployee[]>("/employees"),
        apiRequest<Organisation[]>("/companies"),
      ]);
      companyRows.forEach((organisation) => {
        companies[organisation.key] = {
          id: organisation.key,
          name: organisation.name,
          subtitle: "",
          color: organisation.color || "#7A2838",
          icon: "Building2",
        };
      });
      setOrganisations(companyRows);
      const mapped = result.map(toEmployee);
      setEmployees(mapped);
      const requestedEmployeeId = new URLSearchParams(
        window.location.search,
      ).get("employee");
      setSelectedId((current) =>
        requestedEmployeeId &&
        mapped.some((employee) => employee.id === requestedEmployeeId)
          ? requestedEmployeeId
          : current && mapped.some((employee) => employee.id === current)
            ? current
            : mapped[0]?.id || "",
      );
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "تعذر تحميل الموظفين",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);

  const addEmployee = async (payload: CreateEmployeePayload) => {
    const created = toEmployee(
      await apiRequest<ApiEmployee>("/employees", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );
    setEmployees((current) => [created, ...current]);
    setSelectedId(created.id);
    setModal(false);
    setToast(true);
    setTimeout(() => setToast(false), 2600);
  };

  return (
    <AppShell
      title="الموظفون"
      description={isAdmin ? "إدارة بيانات فرق الشركات" : "دليل موظفي شركتك"}
    >
      <div className="mx-auto grid max-w-[1500px] gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <section className="card overflow-hidden xl:sticky xl:top-[52px] xl:h-[calc(100vh-56px)]">
          <div
            className="border-b p-3"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "var(--muted)" }}>
                {employees.length} حسابات مسجلة
              </span>
            </div>
            <div className="relative mt-2">
              <Search
                className="absolute end-3 top-1/2 -translate-y-1/2"
                size={16}
                color="var(--muted)"
              />
              <input
                className="field pe-10"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ابحث بالاسم أو القسم"
              />
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              {isAdmin && (
                <button
                  className="btn-primary h-8 shrink-0 px-2 text-[11px]"
                  onClick={() => setModal(true)}
                >
                  <Plus size={15} />
                  إضافة موظف
                </button>
              )}
              <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
                {[
                  { key: "all", name: "الكل" },
                  ...organisations,
                ].map(({ key, name }) => (
                  <button
                    key={key}
                    className={`chip whitespace-nowrap ${filter === key ? "chip-active" : ""}`}
                    onClick={() => setFilter(key)}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="overflow-y-auto xl:h-[calc(100%-190px)]">
            <div
              className="grid grid-cols-[1.2fr_.8fr_70px] gap-2 border-b px-5 py-2.5 text-[11px]"
              style={{
                borderColor: "var(--border)",
                color: "var(--subtle)",
                background: "var(--surface-2)",
              }}
            >
              <span>الموظف</span>
              <span>الشركة / القسم</span>
              <span>الحالة</span>
            </div>
            {loading ? (
              <div className="space-y-3 p-5">
                {[1, 2, 3, 4].map((item) => (
                  <div
                    key={item}
                    className="h-14 animate-pulse rounded-xl"
                    style={{ background: "var(--surface-3)" }}
                  />
                ))}
              </div>
            ) : error ? (
              <div className="flex min-h-52 flex-col items-center justify-center p-6 text-center">
                <p className="text-sm text-danger">{error}</p>
                <button
                  className="btn mt-4"
                  onClick={() => void loadEmployees()}
                >
                  إعادة المحاولة
                </button>
              </div>
            ) : visible.length ? (
              visible.map((employee) => (
                <button
                  key={employee.id}
                  onClick={() => setSelectedId(employee.id)}
                  className="grid w-full grid-cols-[1.2fr_.8fr_70px] items-center gap-2 border-b px-5 py-3 text-start transition-colors"
                  style={{
                    borderColor: "var(--border)",
                    background:
                      selectedId === employee.id
                        ? "var(--primary-soft)"
                        : "transparent",
                    boxShadow:
                      selectedId === employee.id
                        ? "inset -3px 0 var(--primary)"
                        : "none",
                  }}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <Avatar name={employee.name} color={employee.color} />
                    <span className="truncate text-sm font-medium">
                      {employee.name}
                    </span>
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs">
                      {employee.company
                        ? companies[employee.company]?.name || employee.company
                        : "الإدارة العامة"}
                    </span>
                    <span
                      className="mt-1 block truncate text-[10px]"
                      style={{ color: "var(--muted)" }}
                    >
                      {employee.department || "غير محدد"}
                    </span>
                  </span>
                  <span
                    className="flex items-center gap-1 text-[11px]"
                    style={{
                      color:
                        employee.status === "نشط"
                          ? "var(--success)"
                          : employee.status === "في إجازة"
                            ? "var(--warning)"
                            : "var(--muted)",
                    }}
                  >
                    <i className="h-1.5 w-1.5 rounded-full bg-current" />
                    {employee.status}
                  </span>
                </button>
              ))
            ) : (
              <EmptyState
                icon={<Search size={20} />}
                title="لا توجد نتائج"
                text="جرّب تغيير عبارة البحث أو مرشح الشركة."
              />
            )}
          </div>
        </section>
        {selected && (
          <section className="card min-w-0 overflow-hidden">
            <div
              className="flex flex-wrap items-center justify-between gap-4 border-b p-5 md:p-6"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex items-center gap-3">
                <Avatar name={selected.name} color={selected.color} size="lg" />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-medium">{selected.name}</h2>
                    <span className="status status-neutral">
                      {selected.role === "SUPER_ADMIN"
                        ? "مدير النظام"
                        : selected.role === "SUPERVISOR"
                          ? "مشرف"
                          : "موظف"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
                    {selected.title} ·{" "}
                    {selected.company
                      ? companies[selected.company]?.name || selected.company
                      : "الإدارة العامة"}{" "}
                    · {selected.department || "غير محدد"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && selected.role !== "SUPER_ADMIN" ? (
                  <select
                    className={`status border-0 outline-none ${selected.status === "نشط" ? "status-success" : selected.status === "في إجازة" ? "status-warning" : "status-neutral"}`}
                    value={selected.status}
                    onChange={async (event) => {
                      const nextStatus = event.target
                        .value as Employee["status"];
                      const apiStatus =
                        nextStatus === "نشط"
                          ? "ACTIVE"
                          : nextStatus === "في إجازة"
                            ? "ON_LEAVE"
                            : "INACTIVE";
                      const updated = toEmployee(
                        await apiRequest<ApiEmployee>(
                          `/employees/${selected.id}/status`,
                          {
                            method: "PATCH",
                            body: JSON.stringify({ status: apiStatus }),
                          },
                        ),
                      );
                      setEmployees((current) =>
                        current.map((item) =>
                          item.id === updated.id ? updated : item,
                        ),
                      );
                    }}
                  >
                    <option>نشط</option>
                    <option>في إجازة</option>
                    <option>غير نشط</option>
                  </select>
                ) : (
                  <span
                    className={`status ${selected.status === "نشط" ? "status-success" : "status-warning"}`}
                  >
                    {selected.status}
                  </span>
                )}
                {isAdmin && selected.role !== "SUPER_ADMIN" && (
                  <button
                    className="btn-ghost text-danger"
                    title="حذف الموظف"
                    onClick={async () => {
                      if (!window.confirm(`هل تريد حذف حساب ${selected.name}؟`))
                        return;
                      await apiRequest(`/employees/${selected.id}`, {
                        method: "DELETE",
                      });
                      setEmployees((current) =>
                        current.filter((item) => item.id !== selected.id),
                      );
                      setSelectedId(
                        employees.find((item) => item.id !== selected.id)?.id ||
                          "",
                      );
                    }}
                  >
                    <Trash2 size={18} />
                  </button>
                )}
                <button className="btn-ghost">
                  <MoreHorizontal size={19} />
                </button>
              </div>
            </div>
            <div
              className="overflow-x-auto border-b px-3"
              style={{
                borderColor: "var(--border)",
                background: "var(--surface-2)",
              }}
            >
              <div className="grid w-full min-w-[480px] grid-cols-4 md:min-w-0">
                {tabs.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    className="flex min-w-0 items-center justify-center gap-1.5 border-b-2 px-2 py-3 text-xs font-medium transition-colors"
                    style={{
                      color: tab === id ? "var(--primary)" : "var(--muted)",
                      borderColor:
                        tab === id ? "var(--primary)" : "transparent",
                    }}
                  >
                    <Icon className="shrink-0" size={16} />
                    <span className="truncate">{label}</span>
                  </button>
                ))}
              </div>
            </div>
            {tab === "work" ? (
              <EmployeeForm
                key={selected.id}
                employee={selected}
                organisations={organisations}
                canManage={isAdmin && selected.role !== "SUPER_ADMIN"}
                onSave={async (updated) => {
                  const saved = toEmployee(
                    await apiRequest<ApiEmployee>(`/employees/${updated.id}`, {
                      method: "PATCH",
                      body: JSON.stringify({
                        fullName: updated.name,
                        company: updated.company,
                        nationalId: updated.nationalId || undefined,
                        phone: updated.phone || undefined,
                        email: updated.email || undefined,
                        department: updated.department,
                        jobTitle: updated.title,
                        directManagerId: updated.manager || undefined,
                        birthDate: updated.birthDate || undefined,
                        hireDate: updated.hireDate || undefined,
                        gender: updated.gender,
                        contractType: updated.contract,
                        role: updated.role,
                      }),
                    }),
                  );
                  setEmployees((current) =>
                    current.map((employee) =>
                      employee.id === saved.id ? saved : employee,
                    ),
                  );
                  setToast(true);
                  setTimeout(() => setToast(false), 2500);
                }}
              />
            ) : (
              <HrPanel
                key={`${selected.id}-${tab}`}
                employeeId={selected.id}
                tab={tab as "leave" | "attendance" | "docs"}
                canManage={Boolean(isAdmin)}
              />
            )}
          </section>
        )}
      </div>
      {isAdmin && (
        <AddEmployeeModal
          open={modal}
          onClose={() => setModal(false)}
          onAdd={addEmployee}
          organisations={organisations}
        />
      )}
      <Toast show={toast} message="تم حفظ البيانات بنجاح" />
    </AppShell>
  );
}

function EmployeeForm({
  employee,
  organisations,
  canManage,
  onSave,
}: {
  employee: Employee;
  organisations: Organisation[];
  canManage: boolean;
  onSave: (employee: Employee) => Promise<void>;
}) {
  const [form, setForm] = useState(employee);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const set = (key: keyof Employee, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canManage) return;
    setSaving(true);
    setFormError("");
    try {
      await onSave(form);
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.message : "تعذر حفظ بيانات الموظف",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <form className="p-5 md:p-7" onSubmit={submit}>
      <div className="mb-6 flex items-center gap-3">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ background: "var(--primary-soft)", color: "var(--primary)" }}
        >
          <IdCard size={19} />
        </span>
        <div>
          <h3 className="font-medium">البيانات الأساسية</h3>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            {canManage
              ? "حدّث بيانات الموظف ومعلوماته الوظيفية"
              : "يمكنك الاطلاع على البيانات، والتعديل متاح لمدير النظام فقط"}
          </p>
        </div>
      </div>
      <fieldset
        disabled={!canManage || saving}
        className="grid gap-4 disabled:opacity-75 md:grid-cols-2"
      >
        {[
          { key: "name", label: "الاسم الكامل", required: true },
          { key: "nationalId", label: "رقم الهوية", ltr: true },
          { key: "phone", label: "رقم الجوال", ltr: true },
          { key: "email", label: "البريد الإلكتروني", ltr: true },
          { key: "title", label: "المسمى الوظيفي" },
          { key: "manager", label: "المدير المباشر" },
          { key: "birthDate", label: "تاريخ الميلاد", type: "date" },
          { key: "hireDate", label: "تاريخ المباشرة", type: "date" },
        ].map(({ key, label, required, ltr, type }) => (
          <label key={key}>
            <span className="label">
              {label}
              {required && <b className="ms-1 text-danger">*</b>}
            </span>
            <input
              required={required}
              dir={ltr ? "ltr" : "rtl"}
              type={type || "text"}
              className="field"
              value={String(form[key as keyof Employee] ?? "")}
              onChange={(event) =>
                set(key as keyof Employee, event.target.value)
              }
            />
          </label>
        ))}
        <label>
          <span className="label">الشركة</span>
          <select
            className="field"
            value={form.company || ""}
            onChange={(event) => {
              const company = event.target.value;
              setForm((current) => ({ ...current, company, department: "" }));
            }}
          >
            <option value="" disabled>اختر الشركة</option>
            {organisations.map((organisation) => (
              <option key={organisation.key} value={organisation.key}>
                {organisation.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">القسم</span>
          <select
            className="field"
            value={form.department}
            onChange={(event) => set("department", event.target.value)}
            disabled={!form.company}
          >
            <option value="">بدون قسم</option>
            {(organisations.find((organisation) => organisation.key === form.company)?.departments || []).map((department) => (
              <option key={department.name} value={department.name}>
                {department.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">نوع الحساب</span>
          <select
            className="field"
            value={form.role}
            onChange={(event) => set("role", event.target.value)}
          >
            <option value="SUPERVISOR">مشرف</option>
            <option value="EMPLOYEE">موظف</option>
          </select>
        </label>
        <label>
          <span className="label">نوع العقد</span>
          <select
            className="field"
            value={form.contract}
            onChange={(event) => set("contract", event.target.value)}
          >
            <option>دوام كامل</option>
            <option>دوام جزئي</option>
            <option>عقد مؤقت</option>
          </select>
        </label>
      </fieldset>
      {formError && (
        <p className="mt-4 rounded-xl bg-[var(--danger-soft)] p-3 text-sm text-danger">
          {formError}
        </p>
      )}
      {canManage && (
        <div className="mt-7 flex justify-end gap-2">
          <button
            type="button"
            className="btn"
            onClick={() => setForm(employee)}
          >
            إلغاء التغييرات
          </button>
          <button disabled={saving} className="btn-primary">
            {saving ? "جاري الحفظ..." : "حفظ البيانات"}
          </button>
        </div>
      )}
    </form>
  );
}

function HrPanel({
  employeeId,
  tab,
  canManage,
}: {
  employeeId: string;
  tab: "leave" | "attendance" | "docs";
  canManage: boolean;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [data, setData] = useState<HrRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [leave, setLeave] = useState({
    type: "سنوية",
    startDate: today,
    endDate: today,
    notes: "",
  });
  const [attendance, setAttendance] = useState({
    date: today,
    checkIn: "08:00",
    checkOut: "17:00",
    notes: "",
  });
  const [document, setDocument] = useState({
    name: "",
    type: "هوية",
    url: "",
    expiresAt: "",
    notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await apiRequest<HrRecord>(`/hr/employees/${employeeId}`));
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : "تعذر تحميل سجلات الموظف",
      );
    } finally {
      setLoading(false);
    }
  }, [employeeId]);
  useEffect(() => {
    void load();
  }, [load]);
  const mutate = async (
    path: string,
    method: "POST" | "PATCH" | "DELETE",
    body?: unknown,
  ) => {
    setBusy(true);
    setError("");
    try {
      setData(
        await apiRequest<HrRecord>(path, {
          method,
          ...(body ? { body: JSON.stringify(body) } : {}),
        }),
      );
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "تعذر حفظ السجل");
      throw caught;
    } finally {
      setBusy(false);
    }
  };
  const remove = (
    collection: "leaves" | "attendance" | "documents",
    id: string,
  ) => mutate(`/hr/employees/${employeeId}/${collection}/${id}`, "DELETE");
  const formatDate = (value: string) =>
    new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium" }).format(
      new Date(value),
    );

  if (loading)
    return (
      <div className="flex min-h-72 items-center justify-center">
        <Loader2 size={22} className="animate-spin text-brand" />
      </div>
    );
  return (
    <div className="space-y-4 p-4 md:p-5">
      {error && (
        <div
          className="rounded-lg px-3 py-2 text-xs"
          style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
        >
          {error}
        </div>
      )}
      {canManage && tab === "leave" && (
        <form
          className="grid items-end gap-2 rounded-xl border p-3 md:grid-cols-[1fr_1fr_1fr_1.3fr_auto]"
          style={{
            borderColor: "var(--border)",
            background: "var(--surface-2)",
          }}
          onSubmit={async (event) => {
            event.preventDefault();
            try {
              await mutate(`/hr/employees/${employeeId}/leaves`, "POST", leave);
              setLeave({ ...leave, notes: "" });
            } catch {}
          }}
        >
          <MiniField label="نوع الإجازة">
            <select
              className="field"
              value={leave.type}
              onChange={(event) =>
                setLeave({ ...leave, type: event.target.value })
              }
            >
              <option>سنوية</option>
              <option>مرضية</option>
              <option>اضطرارية</option>
              <option>بدون راتب</option>
            </select>
          </MiniField>
          <MiniField label="من">
            <input
              className="field"
              type="date"
              value={leave.startDate}
              onChange={(event) =>
                setLeave({ ...leave, startDate: event.target.value })
              }
            />
          </MiniField>
          <MiniField label="إلى">
            <input
              className="field"
              type="date"
              value={leave.endDate}
              onChange={(event) =>
                setLeave({ ...leave, endDate: event.target.value })
              }
            />
          </MiniField>
          <MiniField label="ملاحظات">
            <input
              className="field"
              value={leave.notes}
              onChange={(event) =>
                setLeave({ ...leave, notes: event.target.value })
              }
            />
          </MiniField>
          <button className="btn-primary h-10" disabled={busy}>
            <Plus size={15} />
            إضافة
          </button>
        </form>
      )}
      {canManage && tab === "attendance" && (
        <form
          className="grid items-end gap-2 rounded-xl border p-3 md:grid-cols-[1fr_.8fr_.8fr_1.4fr_auto]"
          style={{
            borderColor: "var(--border)",
            background: "var(--surface-2)",
          }}
          onSubmit={async (event) => {
            event.preventDefault();
            try {
              await mutate(
                `/hr/employees/${employeeId}/attendance`,
                "POST",
                attendance,
              );
              setAttendance({ ...attendance, notes: "" });
            } catch {}
          }}
        >
          <MiniField label="التاريخ">
            <input
              className="field"
              type="date"
              value={attendance.date}
              onChange={(event) =>
                setAttendance({ ...attendance, date: event.target.value })
              }
            />
          </MiniField>
          <MiniField label="الحضور">
            <input
              className="field"
              type="time"
              value={attendance.checkIn}
              onChange={(event) =>
                setAttendance({ ...attendance, checkIn: event.target.value })
              }
            />
          </MiniField>
          <MiniField label="الانصراف">
            <input
              className="field"
              type="time"
              value={attendance.checkOut}
              onChange={(event) =>
                setAttendance({ ...attendance, checkOut: event.target.value })
              }
            />
          </MiniField>
          <MiniField label="ملاحظات">
            <input
              className="field"
              value={attendance.notes}
              onChange={(event) =>
                setAttendance({ ...attendance, notes: event.target.value })
              }
            />
          </MiniField>
          <button className="btn-primary h-10" disabled={busy}>
            <Plus size={15} />
            تسجيل
          </button>
        </form>
      )}
      {canManage && tab === "docs" && (
        <form
          className="grid items-end gap-2 rounded-xl border p-3 md:grid-cols-[1fr_.8fr_1.4fr_1fr_auto]"
          style={{
            borderColor: "var(--border)",
            background: "var(--surface-2)",
          }}
          onSubmit={async (event) => {
            event.preventDefault();
            try {
              await mutate(`/hr/employees/${employeeId}/documents`, "POST", {
                ...document,
                expiresAt: document.expiresAt || undefined,
                url: document.url || undefined,
              });
              setDocument({ ...document, name: "", url: "", notes: "" });
            } catch {}
          }}
        >
          <MiniField label="اسم المستند">
            <input
              required
              className="field"
              value={document.name}
              onChange={(event) =>
                setDocument({ ...document, name: event.target.value })
              }
            />
          </MiniField>
          <MiniField label="النوع">
            <select
              className="field"
              value={document.type}
              onChange={(event) =>
                setDocument({ ...document, type: event.target.value })
              }
            >
              <option>هوية</option>
              <option>عقد</option>
              <option>شهادة</option>
              <option>أخرى</option>
            </select>
          </MiniField>
          <MiniField label="رابط الملف">
            <input
              dir="ltr"
              className="field"
              type="url"
              placeholder="https://"
              value={document.url}
              onChange={(event) =>
                setDocument({ ...document, url: event.target.value })
              }
            />
          </MiniField>
          <MiniField label="تاريخ الانتهاء">
            <input
              className="field"
              type="date"
              value={document.expiresAt}
              onChange={(event) =>
                setDocument({ ...document, expiresAt: event.target.value })
              }
            />
          </MiniField>
          <button className="btn-primary h-10" disabled={busy}>
            <Plus size={15} />
            إضافة
          </button>
        </form>
      )}

      {tab === "leave" && (
        <div
          className="overflow-hidden rounded-xl border"
          style={{ borderColor: "var(--border)" }}
        >
          <div
            className="grid grid-cols-[1fr_1.3fr_110px_90px] gap-2 px-4 py-2 text-[11px]"
            style={{ background: "var(--surface-2)", color: "var(--muted)" }}
          >
            <span>النوع</span>
            <span>الفترة</span>
            <span>الحالة</span>
            <span>الإجراء</span>
          </div>
          {data?.leaves.length ? (
            [...data.leaves].reverse().map((entry) => (
              <div
                key={entry._id}
                className="grid grid-cols-[1fr_1.3fr_110px_90px] items-center gap-2 border-t px-4 py-3 text-xs"
                style={{ borderColor: "var(--border)" }}
              >
                <span>{entry.type}</span>
                <span>
                  {formatDate(entry.startDate)} — {formatDate(entry.endDate)}
                </span>
                <span
                  className={`status w-fit ${entry.status === "APPROVED" ? "status-success" : entry.status === "REJECTED" ? "status-danger" : "status-warning"}`}
                >
                  {entry.status === "APPROVED"
                    ? "معتمدة"
                    : entry.status === "REJECTED"
                      ? "مرفوضة"
                      : "معلّقة"}
                </span>
                <span className="flex gap-1">
                  {canManage && entry.status === "PENDING" && (
                    <>
                      <button
                        title="اعتماد"
                        className="btn-ghost"
                        onClick={() =>
                          void mutate(
                            `/hr/employees/${employeeId}/leaves/${entry._id}`,
                            "PATCH",
                            { status: "APPROVED" },
                          )
                        }
                      >
                        <CheckCircle2 size={15} color="var(--success)" />
                      </button>
                      <button
                        title="رفض"
                        className="btn-ghost"
                        onClick={() =>
                          void mutate(
                            `/hr/employees/${employeeId}/leaves/${entry._id}`,
                            "PATCH",
                            { status: "REJECTED" },
                          )
                        }
                      >
                        <XCircle size={15} color="var(--danger)" />
                      </button>
                    </>
                  )}
                  {canManage && (
                    <button
                      title="حذف"
                      className="btn-ghost"
                      onClick={() => void remove("leaves", entry._id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </span>
              </div>
            ))
          ) : (
            <EmptyRow text="لا توجد إجازات مسجلة" />
          )}
        </div>
      )}
      {tab === "attendance" && (
        <div
          className="overflow-hidden rounded-xl border"
          style={{ borderColor: "var(--border)" }}
        >
          <div
            className="grid grid-cols-[1fr_1fr_1fr_1.4fr_50px] gap-2 px-4 py-2 text-[11px]"
            style={{ background: "var(--surface-2)", color: "var(--muted)" }}
          >
            <span>التاريخ</span>
            <span>الحضور</span>
            <span>الانصراف</span>
            <span>ملاحظات</span>
            <span />
          </div>
          {data?.attendance.length ? (
            [...data.attendance].reverse().map((entry) => (
              <div
                key={entry._id}
                className="grid grid-cols-[1fr_1fr_1fr_1.4fr_50px] items-center gap-2 border-t px-4 py-3 text-xs"
                style={{ borderColor: "var(--border)" }}
              >
                <span>{formatDate(entry.date)}</span>
                <span dir="ltr">{entry.checkIn || "—"}</span>
                <span dir="ltr">{entry.checkOut || "—"}</span>
                <span className="truncate" style={{ color: "var(--muted)" }}>
                  {entry.notes || "—"}
                </span>
                {canManage ? (
                  <button
                    className="btn-ghost"
                    onClick={() => void remove("attendance", entry._id)}
                  >
                    <Trash2 size={14} />
                  </button>
                ) : (
                  <span />
                )}
              </div>
            ))
          ) : (
            <EmptyRow text="لا توجد سجلات حضور" />
          )}
        </div>
      )}
      {tab === "docs" && (
        <div className="grid gap-3 md:grid-cols-2">
          {data?.documents.length ? (
            [...data.documents].reverse().map((entry) => (
              <div
                key={entry._id}
                className="flex items-center gap-3 rounded-xl border p-3"
                style={{ borderColor: "var(--border)" }}
              >
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{
                    background: "var(--primary-soft)",
                    color: "var(--primary)",
                  }}
                >
                  <FileText size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium">
                    {entry.name}
                  </div>
                  <div
                    className="mt-0.5 text-[11px]"
                    style={{ color: "var(--muted)" }}
                  >
                    {entry.type}
                    {entry.expiresAt
                      ? ` · ينتهي ${formatDate(entry.expiresAt)}`
                      : ""}
                  </div>
                </div>
                {entry.url && (
                  <a
                    href={entry.url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-ghost"
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
                {canManage && (
                  <button
                    className="btn-ghost"
                    onClick={() => void remove("documents", entry._id)}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))
          ) : (
            <div className="col-span-full">
              <EmptyRow text="لا توجد مستندات محفوظة" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MiniField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="min-w-0">
      <span className="label text-[10px]">{label}</span>
      {children}
    </label>
  );
}
function EmptyRow({ text }: { text: string }) {
  return (
    <div className="p-8 text-center text-xs" style={{ color: "var(--muted)" }}>
      {text}
    </div>
  );
}

function AddEmployeeModal({
  open,
  onClose,
  onAdd,
  organisations,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (payload: CreateEmployeePayload) => Promise<void>;
  organisations: Organisation[];
}) {
  const [method, setMethod] = useState<"national" | "phone" | "email">("phone");
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("Spark@2026");
  const [company, setCompany] = useState("spark");
  const [department, setDepartment] = useState("");
  const [role, setRole] = useState<"SUPERVISOR" | "EMPLOYEE">("EMPLOYEE");
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");
  useEffect(() => {
    if (!open || organisations.some((entry) => entry.key === company)) return;
    setCompany(organisations[0]?.key || "");
    setDepartment("");
  }, [open, organisations, company]);
  const valid =
    identifier.trim().length >=
      (method === "national" ? 10 : method === "phone" ? 9 : 5) &&
    password.length >= 4;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    setSubmitting(true);
    setModalError("");
    try {
      await onAdd({
        fullName: name.trim() || undefined,
        company,
        department: department || undefined,
        role,
        password,
        phone: method === "phone" ? identifier : undefined,
        email: method === "email" ? identifier : undefined,
        nationalId: method === "national" ? identifier : undefined,
      });
      setName("");
      setIdentifier("");
    } catch (error) {
      setModalError(
        error instanceof ApiError ? error.message : "تعذر إنشاء حساب الموظف",
      );
    } finally {
      setSubmitting(false);
    }
  };
  const generate = () =>
    setPassword(`Sp${Math.random().toString(36).slice(2, 8)}!7`);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="إضافة موظف جديد"
      subtitle="أنشئ حساب موظف أو مشرف، ثم أكمل ملفه الوظيفي"
    >
      <form onSubmit={submit}>
        <div className="space-y-5 p-5">
          <label>
            <span className="label">
              اسم الموظف{" "}
              <span style={{ color: "var(--subtle)" }}>(اختياري)</span>
            </span>
            <input
              className="field"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="يمكن إضافته لاحقاً"
            />
          </label>
          <div>
            <span className="label">نوع الحساب</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole("EMPLOYEE")}
                className={`chip h-11 justify-center ${role === "EMPLOYEE" ? "chip-active" : ""}`}
              >
                موظف
              </button>
              <button
                type="button"
                onClick={() => setRole("SUPERVISOR")}
                className={`chip h-11 justify-center ${role === "SUPERVISOR" ? "chip-active" : ""}`}
              >
                مشرف مشاريع
              </button>
            </div>
            <p className="mt-2 text-[11px]" style={{ color: "var(--muted)" }}>
              {role === "SUPERVISOR"
                ? "يمكنه إدارة مشاريع شركته وتعيين الموظفين، ولا يمكنه إدارة حسابات الموظفين."
                : "يمكنه رؤية المشاريع المعيّن فيها والعمل عليها فقط."}
            </p>
          </div>
          <div>
            <span className="label">بيانات الدخول</span>
            <div className="mb-3 grid grid-cols-3 gap-2">
              {(
                [
                  ["national", "هوية / إقامة"],
                  ["phone", "جوال"],
                  ["email", "بريد"],
                ] as const
              ).map(([key, label]) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => {
                    setMethod(key);
                    setIdentifier("");
                  }}
                  className={`chip justify-center ${method === key ? "chip-active" : ""}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="relative">
              {method === "phone" && (
                <span
                  className="absolute inset-y-0 start-3 flex items-center border-e pe-3 text-sm"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--muted)",
                  }}
                  dir="ltr"
                >
                  +966
                </span>
              )}
              <input
                className={`field ${method === "phone" ? "ps-[76px]" : ""}`}
                dir="ltr"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder={
                  method === "national"
                    ? "10 أرقام"
                    : method === "phone"
                      ? "5xxxxxxxx"
                      : "name@email.com"
                }
              />
            </div>
          </div>
          <div>
            <span className="label">الشركة</span>
            <div className="grid grid-cols-2 gap-2">
              {organisations.map((organisation) => (
                <button
                  key={organisation.key}
                  type="button"
                  onClick={() => { setCompany(organisation.key); setDepartment(""); }}
                  className={`chip h-12 justify-center ${company === organisation.key ? "chip-active" : ""}`}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: organisation.color || "#7A2838" }}
                  />
                  {organisation.name}
                </button>
              ))}
            </div>
          </div>
          <label>
            <span className="label">القسم</span>
            <select className="field" value={department} onChange={(event) => setDepartment(event.target.value)} disabled={!company}>
              <option value="">اختر القسم</option>
              {(organisations.find((organisation) => organisation.key === company)?.departments || []).map((entry) => <option key={entry.name} value={entry.name}>{entry.name}</option>)}
            </select>
          </label>
          <div>
            <span className="label">
              الرقم السري{" "}
              <span style={{ color: "var(--subtle)" }}>(4 أحرف على الأقل)</span>
            </span>
            <div className="flex gap-2">
              <input
                className="field"
                dir="ltr"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button type="button" className="btn shrink-0" onClick={generate}>
                توليد
              </button>
              <button
                type="button"
                className="btn-ghost shrink-0"
                onClick={() => navigator.clipboard?.writeText(password)}
                aria-label="نسخ الرقم السري"
              >
                <Copy size={17} />
              </button>
            </div>
            <div className="mt-2 grid grid-cols-4 gap-1">
              {[0, 1, 2, 3].map((item) => (
                <i
                  key={item}
                  className="h-1 rounded-full"
                  style={{
                    background:
                      password.length >= (item + 1) * 2
                        ? "var(--success)"
                        : "var(--surface-3)",
                  }}
                />
              ))}
            </div>
          </div>
          {modalError && (
            <div className="rounded-xl bg-[var(--danger-soft)] p-3 text-sm text-danger">
              {modalError}
            </div>
          )}
          <div
            className="flex gap-2 rounded-xl p-3 text-xs"
            style={{ background: "var(--surface-2)", color: "var(--muted)" }}
          >
            <ShieldCheck size={17} className="shrink-0 text-success" />
            سيتمكن المستخدم من تسجيل الدخول بهذه البيانات فور إنشاء الحساب.
          </div>
        </div>
        <footer
          className="flex justify-end gap-2 border-t p-4"
          style={{
            borderColor: "var(--border)",
            background: "var(--surface-2)",
          }}
        >
          <button type="button" className="btn" onClick={onClose}>
            إلغاء
          </button>
          <button disabled={!valid || submitting} className="btn-primary">
            <UserRoundPlus size={17} />
            {submitting ? "جاري الإنشاء..." : "إضافة الحساب"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
