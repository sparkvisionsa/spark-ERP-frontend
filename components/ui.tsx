"use client";

import { CheckCircle2, X } from "lucide-react";
import { ReactNode, useEffect } from "react";

export function Progress({ value, danger = false, className = "" }: { value: number; danger?: boolean; className?: string }) {
  const color = value === 100 ? "var(--success)" : danger ? "var(--danger)" : "var(--primary)";
  return (
    <div className={`h-1.5 overflow-hidden rounded-full ${className}`} style={{ background: "var(--surface-3)" }} aria-label={`نسبة الإنجاز ${value}%`}>
      <div className="h-full rounded-full transition-all duration-300" style={{ width: `${value}%`, background: color }} />
    </div>
  );
}

export function Avatar({ name, color = "#534AB7", size = "md" }: { name?: string | null; color?: string; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "h-7 w-7 text-[11px]", md: "h-9 w-9 text-sm", lg: "h-12 w-12 text-lg" };
  const safeName = typeof name === "string" && name.trim() ? name.trim() : "مستخدم";
  return <span className={`${sizes[size]} inline-flex shrink-0 items-center justify-center rounded-full font-medium`} style={{ background: `${color}18`, color }} title={safeName}>{safeName.charAt(0)}</span>;
}

export function EmptyState({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <div className="flex min-h-52 flex-col items-center justify-center px-6 text-center"><span className="mb-3 rounded-2xl p-3" style={{ background: "var(--surface-3)", color: "var(--muted)" }}>{icon}</span><h3 className="mb-1 font-medium">{title}</h3><p className="max-w-xs text-sm" style={{ color: "var(--muted)" }}>{text}</p></div>;
}

export function Modal({ open, onClose, title, subtitle, children, maxWidth = "max-w-xl" }: { open: boolean; onClose: () => void; title: string; subtitle?: string; children: ReactNode; maxWidth?: string }) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", close);
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.removeEventListener("keydown", close); document.body.style.overflow = ""; };
  }, [open, onClose]);
  if (!open) return null;
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()} role="dialog" aria-modal="true" aria-label={title}><div className={`modal-panel ${maxWidth}`}><header className="flex items-start justify-between border-b px-5 py-4" style={{ borderColor: "var(--border)" }}><div><h2 className="font-medium">{title}</h2>{subtitle && <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>{subtitle}</p>}</div><button className="btn-ghost" onClick={onClose} aria-label="إغلاق"><X size={18} /></button></header>{children}</div></div>;
}

export function Toast({ message, show }: { message: string; show: boolean }) {
  if (!show) return null;
  return <div className="animate-toast fixed bottom-5 left-5 z-[70] flex items-center gap-2 rounded-xl px-4 py-3 text-sm text-white shadow-xl" style={{ background: "#26215C" }}><CheckCircle2 size={18} color="#5DCAA5" />{message}</div>;
}
