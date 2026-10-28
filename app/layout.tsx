import type { Metadata } from "next";
import "@fontsource/ibm-plex-sans-arabic/400.css";
import "@fontsource/ibm-plex-sans-arabic/500.css";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { ErpCursor } from "@/components/erp-cursor";

export const metadata: Metadata = {
  title: "Spark ERP",
  description: "نظام إدارة الشركات والمشاريع والموظفين"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        <ErpCursor />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
