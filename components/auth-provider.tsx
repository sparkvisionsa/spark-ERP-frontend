"use client";

import { apiRequest } from "@/lib/api";
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";

export type AuthRole = "SUPER_ADMIN" | "SUPERVISOR" | "EMPLOYEE";
export type AuthUser = { id: string; fullName: string; phone?: string; email?: string; role: AuthRole; company: "spark" | "pro" | null; department?: string; jobTitle?: string; status: string };

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<AuthUser | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshUser = useCallback(async () => {
    try { const current = await apiRequest<AuthUser>("/auth/me"); setUser(current); return current; }
    catch { setUser(null); return null; }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refreshUser(); }, [refreshUser]);
  const login = async (identifier: string, password: string) => {
    const result = await apiRequest<{ user: AuthUser }>("/auth/login", { method: "POST", body: JSON.stringify({ identifier, password }) }, false);
    setUser(result.user); return result.user;
  };
  const logout = async () => { try { await apiRequest("/auth/logout", { method: "POST" }, false); } finally { setUser(null); } };
  return <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
