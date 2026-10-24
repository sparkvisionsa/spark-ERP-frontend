"use client";

import { ArrowLeft, BarChart3, Bolt, CheckCircle2, Eye, EyeOff, FolderKanban, LockKeyhole, ShieldCheck, Sparkles, Users } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!identifier.trim() || !password.trim()) { setError("أدخل بيانات الدخول للمتابعة"); return; }
    setLoading(true); setError("");
    try { await login(identifier, password); router.replace("/dashboard"); }
    catch (error) { setError(error instanceof ApiError ? error.message : "تعذر الاتصال بالخادم، تأكد من تشغيل الباك إند"); setLoading(false); }
  };

  return <main className="relative min-h-screen overflow-hidden bg-[#f8f8fb] p-3 md:p-6" dir="rtl">
    <div className="pointer-events-none absolute -start-24 -top-24 h-72 w-72 rounded-full bg-[#EEEDFE] blur-3xl" />
    <div className="mx-auto grid min-h-[calc(100vh-24px)] max-w-[1380px] overflow-hidden rounded-3xl border border-[#e6e5eb] bg-white shadow-[0_24px_80px_rgba(38,33,92,.12)] md:min-h-[calc(100vh-48px)] md:grid-cols-[1.02fr_.98fr]">
      <section className="relative hidden overflow-hidden bg-[#26215C] p-12 text-white md:flex md:flex-col md:justify-between">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 18% 20%, #AFA9EC 0, transparent 28%), radial-gradient(circle at 85% 75%, #1D9E75 0, transparent 24%)" }} />
        <div className="relative"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10"><Bolt size={23} fill="currentColor" /></span><span className="text-xl font-medium">Spark ERP</span></div></div>
        <div className="relative max-w-lg"><span className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs text-[#CECBF6]"><Sparkles size={14} />منصة واحدة لإدارة كل أعمالك</span><h1 className="text-4xl font-medium leading-[1.45] lg:text-5xl">كل شركاتك،<br />كل مشاريعك،<br /><span className="text-[#AFA9EC]">في مكان واحد.</span></h1><p className="mt-5 max-w-md text-sm leading-7 text-[#CECBF6]">رؤية شاملة للأداء، متابعة أدق للفرق، وإنجاز أسرع للمشاريع من لوحة عمل عربية متكاملة.</p></div>
        <div className="relative grid grid-cols-3 gap-3">
          {[{ icon: FolderKanban, value: "17", label: "مشروعاً نشطاً" }, { icon: Users, value: "4", label: "موظفين" }, { icon: BarChart3, value: "64%", label: "متوسط الإنجاز" }].map(({ icon: Icon, value, label }) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[.07] p-4 backdrop-blur"><Icon size={18} className="mb-4 text-[#AFA9EC]" /><div className="text-xl font-medium">{value}</div><div className="mt-1 text-[11px] text-[#AFA9EC]">{label}</div></div>)}
        </div>
      </section>
      <section className="flex items-center justify-center p-6 md:p-10 lg:p-16">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 md:hidden"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white"><Bolt size={21} fill="currentColor" /></span><span className="text-lg font-medium text-[#1A1A2E]">Spark ERP</span></div>
          <div className="mb-8"><div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EEEDFE] text-[#534AB7]"><LockKeyhole size={21} /></div><h2 className="text-3xl font-medium text-[#1A1A2E]">أهلاً بعودتك</h2><p className="mt-2 text-sm text-[#64636D]">سجّل دخولك لإدارة شركاتك ومشاريعك</p></div>
          <form onSubmit={submit} className="space-y-5">
            <div><label className="mb-2 block text-sm font-medium text-[#393845]">رقم الهوية أو الجوال أو البريد</label><input className="h-12 w-full rounded-xl border border-[#dedde5] px-4 text-sm text-[#1A1A2E] outline-none transition focus:border-[#534AB7] focus:ring-4 focus:ring-[#534AB7]/10" dir="ltr" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="05xxxxxxxx أو name@email.com" /></div>
            <div><div className="mb-2 flex items-center justify-between"><label className="text-sm font-medium text-[#393845]">الرقم السري</label><button type="button" className="text-xs font-medium text-[#534AB7]">نسيت الرقم السري؟</button></div><div className="relative"><input className="h-12 w-full rounded-xl border border-[#dedde5] px-4 pe-12 text-sm text-[#1A1A2E] outline-none transition focus:border-[#534AB7] focus:ring-4 focus:ring-[#534AB7]/10" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} type={showPassword ? "text" : "password"} placeholder="••••••••" /><button type="button" className="absolute inset-y-0 end-0 flex w-12 items-center justify-center text-[#777581]" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "إخفاء الرقم السري" : "إظهار الرقم السري"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
            <label className="flex items-center gap-2 text-sm text-[#64636D]"><input type="checkbox" className="h-4 w-4 accent-[#534AB7]" />تذكرني على هذا الجهاز</label>
            {error && <div className="rounded-xl bg-[#FCE8E8] px-3 py-2.5 text-sm text-[#A32D2D]">{error}</div>}
            <button disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#534AB7] font-medium text-white shadow-[0_8px_24px_rgba(83,74,183,.25)] transition hover:bg-[#3C3489] disabled:opacity-70">{loading ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <>تسجيل الدخول<ArrowLeft size={18} /></>}</button>
          </form>
          <div className="mt-7 flex items-center justify-center gap-2 rounded-xl bg-[#F8F8FB] px-3 py-3 text-xs text-[#64636D]"><ShieldCheck size={16} color="#1D9E75" />الحسابات تُنشأ من مدير النظام فقط</div>
          <div className="mt-8 flex items-center justify-center gap-2 text-[11px] text-[#9896A1]"><CheckCircle2 size={13} />بياناتك محمية ومشفرة بالكامل</div>
        </div>
      </section>
    </div>
  </main>;
}
