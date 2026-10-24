"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3, Bell, Bolt, Building2, Check, ChevronDown, ChevronLeft, ChevronsLeft,
  ChevronsRight, CircleHelp, ClipboardCheck, FolderKanban, LayoutDashboard, LogOut,
  Menu, Moon, PanelRightClose, Search, Settings, Sun, Truck, Users, X,
} from "lucide-react";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { Avatar } from "./ui";
import { useAuth } from "./auth-provider";

const navItems = [
  { href: "/dashboard", label: "لوحة التحكم", description: "نظرة شاملة على الأعمال", icon: LayoutDashboard },
  { href: "/projects", label: "المشاريع والمهام", description: "التنفيذ والمتابعة والتسليم", icon: FolderKanban },
  { href: "/employees", label: "الموظفون", description: "الفريق والحسابات الوظيفية", icon: Users },
  { href: "/reports", label: "التقارير", description: "الأداء والمؤشرات والتحليلات", icon: BarChart3 },
  { href: "/settings", label: "الإعدادات", description: "تخصيص النظام والتفضيلات", icon: Settings },
];

const companyItems = [
  { href: "/companies/spark", label: "سبارك فيجن", description: "التقييم والمعاينات", color: "#534AB7", icon: ClipboardCheck },
  { href: "/companies/pro", label: "برو اوبشن", description: "اللوجستيات والتقنية", color: "#1D9E75", icon: Truck },
];

type SidebarMode = "expanded" | "collapsed" | "hidden";

export default function AppShell({ children, title, description, actions, compact = false }: { children: ReactNode; title?: string; description?: string; compact?: boolean; actions?: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const [dark, setDark] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [companiesOpen, setCompaniesOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>(compact ? "collapsed" : "expanded");

  function setMode(mode: SidebarMode) {
    setSidebarMode(mode);
    localStorage.setItem("spark-sidebar-mode", mode);
  }

  function toggleSidebar() {
    setSidebarMode((current) => {
      const next: SidebarMode = current === "expanded" ? "collapsed" : "expanded";
      localStorage.setItem("spark-sidebar-mode", next);
      return next;
    });
  }

  useEffect(() => {
    const savedTheme = localStorage.getItem("spark-theme");
    const isDark = savedTheme === "dark";
    setDark(isDark);
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    const savedMode = localStorage.getItem("spark-sidebar-mode");
    if (savedMode === "expanded" || savedMode === "collapsed" || savedMode === "hidden") setSidebarMode(savedMode);
    else if (compact) setSidebarMode("collapsed");
    const key = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setSearchOpen(true); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "b") { event.preventDefault(); toggleSidebar(); }
      if (event.key === "Escape") { setSearchOpen(false); setHelpOpen(false); setMobile(false); }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [compact]);

  useEffect(() => { setMobile(false); }, [pathname]);
  useEffect(() => {
    if (!mobile) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [mobile]);
  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    localStorage.setItem("spark-theme", next ? "dark" : "light");
  }

  function openSearch() {
    setSearchQuery("");
    setSearchOpen(true);
  }

  const collapsed = sidebarMode === "collapsed";
  const hidden = sidebarMode === "hidden";
  const compactSidebar = collapsed && !mobile;
  const sidebarWidth = hidden ? "0px" : collapsed ? "76px" : "272px";
  const allQuickLinks = useMemo(() => [...navItems, ...companyItems], []);
  const visibleQuickLinks = allQuickLinks.filter((item) => `${item.label} ${item.description}`.includes(searchQuery.trim()));
  const roleLabel = user?.role === "SUPER_ADMIN" ? "مدير النظام" : user?.role === "SUPERVISOR" ? "مشرف" : "موظف";

  return <div className="erp-shell min-h-screen" style={{ "--sidebar-width": sidebarWidth } as React.CSSProperties}>
    <aside
      data-hidden={hidden ? "true" : "false"}
      data-compact={compactSidebar ? "true" : "false"}
      className={`erp-sidebar fixed inset-y-0 right-0 z-40 flex flex-col border-l transition-[width,transform,opacity] duration-300 ease-out ${mobile ? "translate-x-0" : "translate-x-full"}`}
      aria-label="القائمة الرئيسية"
    >
      <div className="sidebar-glow" aria-hidden="true" />
      <div className={`relative flex h-[70px] shrink-0 items-center border-b ${compactSidebar ? "justify-center px-2" : "gap-2.5 px-3.5"}`} style={{ borderColor: "var(--border)" }}>
        <Link href="/dashboard" className="sidebar-brand-mark" aria-label="الذهاب إلى لوحة التحكم"><Bolt size={20} fill="currentColor" /></Link>
        {!compactSidebar && <Link href="/dashboard" className="min-w-0 flex-1 leading-tight"><strong className="block truncate text-sm font-medium tracking-wide">Spark ERP</strong><span className="sidebar-brand-subtitle mt-1 block truncate text-[10px]">مساحة إدارة الأعمال</span></Link>}
        <button className="sidebar-icon-button hidden md:inline-flex" onClick={toggleSidebar} title={collapsed ? "توسيع الشريط (Ctrl+B)" : "تصغير الشريط (Ctrl+B)"} aria-label={collapsed ? "توسيع الشريط" : "تصغير الشريط"}>{collapsed ? <ChevronsLeft size={17} /> : <ChevronsRight size={17} />}</button>
        <button className="sidebar-icon-button md:hidden" onClick={() => setMobile(false)} aria-label="إغلاق القائمة"><X size={18} /></button>
      </div>

      <nav className="sidebar-navigation relative flex-1 overflow-y-auto overflow-x-hidden">
        {!compactSidebar && <SidebarLabel>الرئيسية</SidebarLabel>}
        <NavItem {...navItems[0]} active={pathname === navItems[0].href} compact={compactSidebar} />

        {!compactSidebar && <SidebarLabel>مساحات العمل</SidebarLabel>}
        {compactSidebar ? <>
          <SidebarDivider />
          <NavIconLink {...companyItems[0]} active={pathname === companyItems[0].href} />
          <NavIconLink {...companyItems[1]} active={pathname.startsWith(companyItems[1].href)} />
        </> : <div className="sidebar-company-section">
          <button
            type="button"
            className="sidebar-nav-item w-full"
            data-active={pathname.startsWith("/companies")}
            onClick={() => setCompaniesOpen((value) => !value)}
            aria-expanded={companiesOpen}
          >
            <span className="sidebar-nav-icon"><Building2 size={18} /></span>
            <span className="min-w-0 flex-1 text-start"><strong>شركاتي</strong><small>التبديل بين مساحات الشركات</small></span>
            <ChevronDown size={15} className={`shrink-0 transition-transform duration-200 ${companiesOpen ? "rotate-180" : ""}`} />
          </button>
          <div className={`sidebar-companies-grid ${companiesOpen ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0"}`}>
            <div className="min-h-0 overflow-hidden"><div className="sidebar-company-list">
              {companyItems.map((company) => <CompanyLink key={company.href} {...company} active={pathname === company.href} />)}
            </div></div>
          </div>
        </div>}

        {compactSidebar && <SidebarDivider />}
        {navItems.slice(1, 4).map((item) => <NavItem key={item.href} {...item} active={pathname.startsWith(item.href)} compact={compactSidebar} />)}

        {!compactSidebar && <SidebarLabel>النظام</SidebarLabel>}
        {compactSidebar && <SidebarDivider />}
        <NavItem {...navItems[4]} active={pathname.startsWith(navItems[4].href)} compact={compactSidebar} />
      </nav>

      <div className={`sidebar-footer-panel relative shrink-0 border-t ${compactSidebar ? "p-2.5" : "p-3"}`}>
        <div className={`sidebar-actions grid gap-1 rounded-xl p-1 ${compactSidebar ? "grid-cols-1" : "grid-cols-4"}`} role="toolbar" aria-label="إجراءات النظام">
          <FooterAction label={dark ? "الوضع الفاتح" : "الوضع الداكن"} compact={compactSidebar} onClick={toggleTheme}>{dark ? <Sun size={16} /> : <Moon size={16} />}</FooterAction>
          <FooterAction label="إخفاء الشريط" compact={compactSidebar} onClick={() => setMode("hidden")}><PanelRightClose size={16} /></FooterAction>
          <FooterAction label="دليل الاستخدام" compact={compactSidebar} onClick={() => setHelpOpen(true)}><CircleHelp size={16} /></FooterAction>
          <FooterAction label="تسجيل الخروج" compact={compactSidebar} danger onClick={async () => { await logout(); router.replace("/login"); }}><LogOut size={16} /></FooterAction>
        </div>
        <Link href="/settings" className={`sidebar-user-card mt-2 ${compactSidebar ? "justify-center px-1.5" : "gap-2.5 px-2"}`} title={compactSidebar ? `${user?.fullName || "المستخدم"} · ${roleLabel}` : undefined}>
          <span className="relative shrink-0"><Avatar name={user?.fullName || "م"} color="#7A2838" size="sm" /><i className="absolute bottom-0 start-0 h-2.5 w-2.5 rounded-full border-2" style={{ background: "var(--success)", borderColor: "var(--surface)" }} /></span>
          {!compactSidebar && <><span className="min-w-0 flex-1"><strong className="block truncate text-xs font-medium">{user?.fullName || "جاري التحميل"}</strong><small className="sidebar-user-meta mt-0.5 block truncate text-[9px]">{user?.jobTitle || roleLabel}</small></span><ChevronLeft size={14} /></>}
        </Link>
      </div>
    </aside>

    {mobile && <button className="fixed inset-0 z-30 bg-[#121220]/45 backdrop-blur-[2px] md:hidden" onClick={() => setMobile(false)} aria-label="إغلاق القائمة" />}

    <div className="min-w-0">
      <header className="sticky top-0 z-20 flex h-12 items-center gap-2 border-b px-2" style={{ background: "color-mix(in srgb, var(--bg) 90%, transparent)", borderColor: "var(--border)", backdropFilter: "blur(16px)" }}>
        <button className="btn-ghost md:hidden" onClick={() => setMobile(true)} aria-label="فتح القائمة"><Menu size={20} /></button>
        {hidden && <button className="hidden h-9 items-center gap-2 rounded-xl border px-2.5 text-xs font-medium shadow-sm md:flex" onClick={() => setMode("expanded")} style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--primary)" }} title="إظهار الشريط الجانبي"><Bolt size={17} fill="currentColor" /><span>Spark ERP</span><ChevronsLeft size={15} /></button>}
        <div className="min-w-0 flex-1"><h1 className="truncate text-sm font-medium">{title}</h1>{description && <p className="hidden truncate text-[9px] sm:block" style={{ color: "var(--muted)" }}>{description}</p>}</div>
        <div className="flex items-center gap-1">{actions}<button className="btn hidden h-8 min-w-[140px] justify-start px-2 text-[11px] xl:flex" style={{ color: "var(--muted)" }} onClick={openSearch}><Search size={14} /><span>بحث سريع</span><kbd className="ms-auto rounded px-1 text-[9px]" style={{ background: "var(--surface-3)" }}>Ctrl K</kbd></button><button className="btn-ghost relative" aria-label="الإشعارات"><Bell size={17} /><span className="absolute end-1.5 top-1.5 h-1.5 w-1.5 rounded-full" style={{ background: "var(--danger)" }} /></button></div>
      </header>
      <main className="erp-content">{children}</main>
    </div>

    {searchOpen && <div className="modal-backdrop items-start pt-[10vh]" onMouseDown={(event) => event.target === event.currentTarget && setSearchOpen(false)}><div className="card w-full max-w-xl overflow-hidden shadow-2xl"><div className="flex items-center gap-3 border-b px-4" style={{ borderColor: "var(--border)" }}><Search size={18} color="var(--primary)" /><input autoFocus className="h-14 min-w-0 flex-1 bg-transparent text-sm outline-none" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="انتقل إلى قسم أو شركة..." /><button className="rounded-md px-2 py-1 text-[10px]" style={{ background: "var(--surface-3)", color: "var(--muted)" }} onClick={() => setSearchOpen(false)}>Esc</button></div><div className="max-h-[360px] overflow-y-auto p-2">{visibleQuickLinks.length ? visibleQuickLinks.map((item) => <button key={item.href} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start transition-colors hover:bg-[var(--surface-3)]" onClick={() => { router.push(item.href); setSearchOpen(false); }}><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}><item.icon size={17} /></span><span className="min-w-0 flex-1"><b className="block text-xs font-medium">{item.label}</b><small className="mt-0.5 block text-[10px]" style={{ color: "var(--muted)" }}>{item.description}</small></span><ChevronLeft size={14} color="var(--subtle)" /></button>) : <div className="flex min-h-32 flex-col items-center justify-center gap-2 text-xs" style={{ color: "var(--muted)" }}><Search size={22} /><span>لا توجد نتيجة مطابقة</span></div>}</div><div className="flex items-center gap-2 border-t px-4 py-2 text-[9px]" style={{ borderColor: "var(--border)", color: "var(--muted)", background: "var(--surface-2)" }}><span>اختصار البحث</span><kbd className="rounded px-1.5 py-0.5" style={{ background: "var(--surface-3)" }}>Ctrl K</kbd><span className="ms-auto">اختصار الشريط</span><kbd className="rounded px-1.5 py-0.5" style={{ background: "var(--surface-3)" }}>Ctrl B</kbd></div></div></div>}

    {helpOpen && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setHelpOpen(false)}><div className="card w-full max-w-md overflow-hidden shadow-2xl"><header className="flex items-center gap-3 border-b p-4" style={{ borderColor: "var(--border)" }}><span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}><CircleHelp size={20} /></span><span className="min-w-0 flex-1"><b className="block text-sm font-medium">دليل الشريط الجانبي</b><small className="text-[10px]" style={{ color: "var(--muted)" }}>طرق أسرع للتنقل داخل Spark ERP</small></span><button className="btn-ghost" onClick={() => setHelpOpen(false)} aria-label="إغلاق الدليل"><X size={17} /></button></header><div className="grid gap-2 p-4"><HelpTip icon={<Search size={17} />} title="انتقال سريع" text="ابحث عن أي قسم أو شركة من زر البحث." shortcut="Ctrl K" /><HelpTip icon={<ChevronsRight size={17} />} title="مساحة عمل أكبر" text="صغّر الشريط إلى أيقونات أو أعد توسيعه فورًا." shortcut="Ctrl B" /><HelpTip icon={<Building2 size={17} />} title="مساحات الشركات" text="افتح «شركاتي» للتنقل بين بيانات كل شركة." /><HelpTip icon={dark ? <Sun size={17} /> : <Moon size={17} />} title="مظهر مريح" text="بدّل بين الوضع الفاتح والداكن من أسفل الشريط." /></div><footer className="border-t p-3" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}><button className="btn-primary w-full" onClick={() => setHelpOpen(false)}>فهمت، شكرًا</button></footer></div></div>}
  </div>;
}

function SidebarLabel({ children }: { children: ReactNode }) {
  return <div className="sidebar-label text-[9px] font-medium tracking-wide">{children}</div>;
}

function SidebarDivider() {
  return <div className="h-px w-full bg-white/15" />;
}

function NavItem({ href, label, description, icon: Icon, active, compact }: { href: string; label: string; description: string; icon: typeof LayoutDashboard; active: boolean; compact: boolean }) {
  return <Link href={href} title={compact ? label : undefined} data-active={active} data-tooltip={compact ? label : undefined} aria-label={label} aria-current={active ? "page" : undefined} className={`sidebar-nav-item ${compact ? "sidebar-has-tooltip justify-center px-0" : "gap-2.5 px-2.5"}`}>
    <span className="sidebar-nav-icon"><Icon size={18} /></span>
    {!compact && <span className="min-w-0 flex-1"><strong>{label}</strong><small>{description}</small></span>}
    {active && <span className="sidebar-active-indicator" aria-hidden="true" />}
  </Link>;
}

function NavIconLink({ href, label, color, icon: Icon, active }: { href: string; label: string; description: string; color: string; icon: typeof LayoutDashboard; active: boolean }) {
  return <Link href={href} title={label} data-active={active} data-tooltip={label} aria-label={label} aria-current={active ? "page" : undefined} className="sidebar-nav-item sidebar-has-tooltip justify-center px-0"><span className="sidebar-nav-icon" style={{ color }}><Icon size={18} /></span>{active && <span className="sidebar-active-indicator" aria-hidden="true" />}</Link>;
}

function CompanyLink({ href, label, description, color, icon: Icon, active }: { href: string; label: string; description: string; color: string; icon: typeof LayoutDashboard; active: boolean }) {
  return <Link href={href} aria-current={active ? "page" : undefined} className="sidebar-company-link" data-active={active}><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ color, background: `${color}14` }}><Icon size={14} /></span><span className="min-w-0 flex-1"><strong>{label}</strong><small>{description}</small></span>{active && <Check size={13} style={{ color }} />}</Link>;
}

function FooterAction({ children, label, compact, danger = false, onClick }: { children: ReactNode; label: string; compact: boolean; danger?: boolean; onClick?: () => void | Promise<void> }) {
  return <button type="button" className={`sidebar-footer-action ${compact ? "sidebar-has-tooltip" : ""}`} data-danger={danger ? "true" : undefined} data-tooltip={compact ? label : undefined} title={compact ? undefined : label} aria-label={label} onClick={onClick}>{children}</button>;
}

function HelpTip({ icon, title, text, shortcut }: { icon: ReactNode; title: string; text: string; shortcut?: string }) {
  return <div className="flex items-center gap-3 rounded-xl border p-3" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: "var(--surface)", color: "var(--primary)" }}>{icon}</span><span className="min-w-0 flex-1"><b className="block text-xs font-medium">{title}</b><small className="mt-0.5 block text-[9px]" style={{ color: "var(--muted)" }}>{text}</small></span>{shortcut && <kbd className="shrink-0 rounded-md border px-1.5 py-1 text-[8px]" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>{shortcut}</kbd>}</div>;
}
