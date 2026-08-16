import type { Metadata } from "next";
import "./globals.css";
import { ErpProvider } from "@/context/erp-context";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import AuthGuard from "@/components/AuthGuard";

export const metadata: Metadata = {
  title: "Nexus ERP • Gestión Centralizada de Negocios",
  description:
    "Sistema ERP, POS táctil e inventario en tiempo real con transacciones ACID en Turso Database",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="light">
      <body className="bg-slate-50 text-slate-900 min-h-screen flex flex-col antialiased selection:bg-slate-700 selection:text-white font-sans">
        <ErpProvider>
          <AuthGuard>
            <Navbar />
            <div className="flex-1 flex min-h-[calc(100vh-3.5rem)] sm:min-h-[calc(100vh-4rem)]">
              <Sidebar />
              <main className="flex-1 min-w-0 bg-slate-50 p-3 sm:p-5 pb-20 lg:pb-6 overflow-x-hidden">
                {children}
              </main>
            </div>
            <BottomNav />
          </AuthGuard>
        </ErpProvider>
      </body>
    </html>
  );
}
