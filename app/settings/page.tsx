"use client";

import AppShell from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { Toast } from "@/components/ui";
import { apiRequest, ApiError } from "@/lib/api";
import { Bell, Building2, CheckCircle2, Database, KeyRound, Loader2, LockKeyhole, Palette, Save, ShieldCheck, UserRound } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type SystemSettings = { systemName: string; timezone: string; locale: string; dateFormat: string; showPercentages: boolean; rememberLastProject: boolean; confirmSensitiveActions: boolean };
type Preferences = { notificationsEnabled: boolean; taskNotifications: boolean; deliveryNotifications: boolean; emailNotifications: boolean; theme: "system" | "light" | "dark"; compactMode: boolean };
type Profile = { fullName: string; phone?: string; email?: string; role: string; company: string | null; department?: string; jobTitle?: string; status: string; lastLoginAt?: string };
type SettingsPayload = { system: SystemSettings; preferences: Preferences; profile: Profile };

const sections = [
  { id: "general", label: "إعدادات عامة", icon: Building2 }, { id: "profile", label: "الملف الشخصي", icon: UserRound },
  { id: "security", label: "الأمان والدخول", icon: ShieldCheck }, { id: "notifications", label: "الإشعارات", icon: Bell },
  { id: "appearance", label: "المظهر", icon: Palette }, { id: "data", label: "البيانات", icon: Database }
] as const;

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [section, setSection] = useState<(typeof sections)[number]["id"]>("general");
  const [data, setData] = useState<SettingsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setData(await apiRequest<SettingsPayload>("/settings")); }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : "تعذر تحميل الإعدادات"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2600); };
  const request = async (path: string, body: unknown) => {
    setSaving(true); setError("");
    try { await apiRequest(path, { method: "PATCH", body: JSON.stringify(body) }); notify("تم حفظ التغييرات بنجاح"); await load(); }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : "تعذر حفظ التغييرات"); }
    finally { setSaving(false); }
  };
  const saveCurrent = async () => {
    if (!data) return;
    if (section === "general") await request("/settings/system", data.system);
    else if (section === "profile") { await request("/settings/profile", { fullName: data.profile.fullName, phone: data.profile.phone, email: data.profile.email }); await refreshUser(); }
    else if (section === "notifications" || section === "appearance") await request("/settings/preferences", data.preferences);
  };
  const changePassword = async () => {
    if (passwords.newPassword.length < 4) return setError("كلمة المرور الجديدة يجب ألا تقل عن 4 أحرف");
    if (passwords.newPassword !== passwords.confirmPassword) return setError("تأكيد كلمة المرور غير مطابق");
    setSaving(true); setError("");
    try { await apiRequest("/settings/change-password", { method: "POST", body: JSON.stringify({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword }) }); setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" }); notify("تم تغيير كلمة المرور بنجاح"); }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : "تعذر تغيير كلمة المرور"); }
    finally { setSaving(false); }
  };
  const updateSystem = <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => setData((current) => current ? { ...current, system: { ...current.system, [key]: value } } : current);
  const updatePreferences = <K extends keyof Preferences>(key: K, value: Preferences[K]) => setData((current) => current ? { ...current, preferences: { ...current.preferences, [key]: value } } : current);
  const updateProfile = <K extends keyof Profile>(key: K, value: Profile[K]) => setData((current) => current ? { ...current, profile: { ...current.profile, [key]: value } } : current);
  const applyTheme = (theme: Preferences["theme"]) => {
    updatePreferences("theme", theme);
    const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("spark-theme", dark ? "dark" : "light");
  };

  return <AppShell title="الإعدادات"><div className="mx-auto grid max-w-[1250px] gap-4 lg:grid-cols-[220px_1fr]">
    <nav className="card h-fit p-2">{sections.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => { setSection(id); setError(""); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-xs transition-colors" style={{ background: section === id ? "var(--primary-soft)" : "transparent", color: section === id ? "var(--primary)" : "var(--muted)" }}><Icon size={16} />{label}</button>)}</nav>
    <section className="card overflow-hidden"><header className="border-b px-5 py-4" style={{ borderColor: "var(--border)" }}><h2 className="text-sm font-medium">{sections.find((item) => item.id === section)?.label}</h2><p className="mt-0.5 text-[11px]" style={{ color: "var(--muted)" }}>تفضيلات محفوظة وآمنة مرتبطة بحسابك</p></header>
      {error && <div className="mx-5 mt-4 rounded-lg px-3 py-2 text-xs" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>{error}</div>}
      {loading && !data ? <div className="flex min-h-72 items-center justify-center"><Loader2 className="animate-spin text-brand" /></div> : data && <div className="p-5">
        {section === "general" && <div className="space-y-5"><div className="grid gap-3 md:grid-cols-2"><Field label="اسم النظام"><input className="field" value={data.system.systemName} disabled={user?.role !== "SUPER_ADMIN"} onChange={(event) => updateSystem("systemName", event.target.value)} /></Field><Field label="المنطقة الزمنية"><select className="field" value={data.system.timezone} disabled={user?.role !== "SUPER_ADMIN"} onChange={(event) => updateSystem("timezone", event.target.value)}><option value="Asia/Riyadh">الرياض (GMT+3)</option></select></Field><Field label="اللغة"><select className="field" value={data.system.locale} disabled><option value="ar-SA">العربية</option></select></Field><Field label="تنسيق التاريخ"><select className="field" value={data.system.dateFormat} disabled={user?.role !== "SUPER_ADMIN"} onChange={(event) => updateSystem("dateFormat", event.target.value)}><option value="DD/MM/YYYY">يوم / شهر / سنة</option><option value="YYYY/MM/DD">سنة / شهر / يوم</option></select></Field></div><div className="grid gap-2"><Toggle title="عرض نسب الإنجاز" text="إظهار النسب في مساحة المشاريع" checked={data.system.showPercentages} disabled={user?.role !== "SUPER_ADMIN"} onChange={(value) => updateSystem("showPercentages", value)} /><Toggle title="حفظ آخر مشروع مفتوح" text="العودة إلى آخر مشروع عند فتح النظام" checked={data.system.rememberLastProject} disabled={user?.role !== "SUPER_ADMIN"} onChange={(value) => updateSystem("rememberLastProject", value)} /><Toggle title="تأكيد الإجراءات الحساسة" text="طلب التأكيد قبل الحذف أو الأرشفة" checked={data.system.confirmSensitiveActions} disabled={user?.role !== "SUPER_ADMIN"} onChange={(value) => updateSystem("confirmSensitiveActions", value)} /></div>{user?.role !== "SUPER_ADMIN" && <p className="text-[11px]" style={{ color: "var(--muted)" }}>إعدادات النظام العامة متاحة للقراءة فقط. تعديلها خاص بمدير النظام.</p>}</div>}
        {section === "profile" && <div className="grid gap-3 md:grid-cols-2"><Field label="الاسم الكامل"><input className="field" value={data.profile.fullName} onChange={(event) => updateProfile("fullName", event.target.value)} /></Field><Field label="رقم الجوال"><input className="field" dir="ltr" value={data.profile.phone || ""} onChange={(event) => updateProfile("phone", event.target.value)} /></Field><Field label="البريد الإلكتروني"><input className="field" dir="ltr" type="email" value={data.profile.email || ""} onChange={(event) => updateProfile("email", event.target.value)} /></Field><Field label="المسمى الوظيفي"><input className="field" value={data.profile.jobTitle || "غير محدد"} disabled /></Field><Field label="القسم"><input className="field" value={data.profile.department || "غير محدد"} disabled /></Field><Field label="نوع الحساب"><input className="field" value={data.profile.role === "SUPER_ADMIN" ? "مدير النظام" : data.profile.role === "SUPERVISOR" ? "مشرف" : "موظف"} disabled /></Field></div>}
        {section === "security" && <div className="max-w-xl space-y-4"><div className="flex items-center gap-3 rounded-xl border p-4" style={{ borderColor: "var(--border)" }}><LockKeyhole size={20} color="var(--primary)" /><div><h3 className="text-sm font-medium">تغيير كلمة المرور</h3><p className="text-[11px]" style={{ color: "var(--muted)" }}>أدخل كلمة المرور الحالية ثم الجديدة، بحد أدنى 4 أحرف.</p></div></div><Field label="كلمة المرور الحالية"><input className="field" type="password" value={passwords.currentPassword} onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })} /></Field><div className="grid gap-3 sm:grid-cols-2"><Field label="كلمة المرور الجديدة"><input className="field" type="password" value={passwords.newPassword} onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })} /></Field><Field label="تأكيد كلمة المرور"><input className="field" type="password" value={passwords.confirmPassword} onChange={(event) => setPasswords({ ...passwords, confirmPassword: event.target.value })} /></Field></div><button className="btn-primary" disabled={saving || !passwords.currentPassword || !passwords.newPassword} onClick={() => void changePassword()}><KeyRound size={15} />تغيير كلمة المرور</button></div>}
        {section === "notifications" && <div className="grid gap-2"><Toggle title="تفعيل الإشعارات" text="المفتاح الرئيسي لجميع تنبيهات الحساب" checked={data.preferences.notificationsEnabled} onChange={(value) => updatePreferences("notificationsEnabled", value)} /><Toggle title="إشعارات المهام" text="عند إسناد مهمة أو تغيير حالتها" checked={data.preferences.taskNotifications} onChange={(value) => updatePreferences("taskNotifications", value)} /><Toggle title="إشعارات التسليمات" text="عند إضافة ملف أو تسليم جديد" checked={data.preferences.deliveryNotifications} onChange={(value) => updatePreferences("deliveryNotifications", value)} /><Toggle title="الإشعارات البريدية" text="إرسال نسخة إلى بريدك الإلكتروني" checked={data.preferences.emailNotifications} onChange={(value) => updatePreferences("emailNotifications", value)} /></div>}
        {section === "appearance" && <div className="space-y-5"><div className="grid gap-3 sm:grid-cols-3">{(["system", "light", "dark"] as const).map((theme) => <button key={theme} onClick={() => applyTheme(theme)} className="rounded-xl border p-5 text-center text-sm" style={{ borderColor: data.preferences.theme === theme ? "var(--primary)" : "var(--border)", background: data.preferences.theme === theme ? "var(--primary-soft)" : "transparent", color: data.preferences.theme === theme ? "var(--primary)" : "var(--text)" }}>{theme === "system" ? "حسب الجهاز" : theme === "light" ? "فاتح" : "داكن"}</button>)}</div><Toggle title="الوضع المضغوط" text="تقليل ارتفاع البطاقات والمسافات لعرض بيانات أكثر" checked={data.preferences.compactMode} onChange={(value) => updatePreferences("compactMode", value)} /></div>}
        {section === "data" && <div className="grid gap-3 sm:grid-cols-2"><InfoCard title="قاعدة البيانات" text="MongoDB متصلة — جميع المشاريع والموظفين والإحصاءات تُقرأ مباشرة." /><InfoCard title="حالة المزامنة" text="تحديث فوري عند الحفظ، مع إعادة حساب لوحة التحكم والتقارير من المصدر." /><InfoCard title="حماية البيانات" text="كلمات المرور مشفّرة، والجلسات محمية، والطلبات مقيدة حسب الدور والشركة." /><InfoCard title="آخر دخول" text={data.profile.lastLoginAt ? new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(data.profile.lastLoginAt)) : "لا توجد بيانات"} /></div>}
      </div>}
      {data && !["security", "data"].includes(section) && <footer className="flex justify-end border-t p-3" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}><button className="btn-primary" disabled={saving || (section === "general" && user?.role !== "SUPER_ADMIN")} onClick={() => void saveCurrent()}>{saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}حفظ الإعدادات</button></footer>}
    </section>
  </div><Toast show={Boolean(toast)} message={toast} /></AppShell>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label><span className="label">{label}</span>{children}</label>; }
function Toggle({ title, text, checked, onChange, disabled }: { title: string; text: string; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean }) { return <label className="flex items-center gap-3 rounded-xl border p-3" style={{ borderColor: "var(--border)", opacity: disabled ? .65 : 1 }}><span className="min-w-0 flex-1"><b className="block text-xs font-medium">{title}</b><span className="mt-0.5 block text-[11px]" style={{ color: "var(--muted)" }}>{text}</span></span><input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-brand" /></label>; }
function InfoCard({ title, text }: { title: string; text: string }) { return <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)" }}><CheckCircle2 size={19} color="var(--success)" /><h3 className="mt-3 text-sm font-medium">{title}</h3><p className="mt-1 text-xs leading-6" style={{ color: "var(--muted)" }}>{text}</p></div>; }
