import type { Metadata } from "next";
import "./globals.css";
import { ErpProvider } from "@/context/erp-context";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

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
          <Navbar />
          <div className="flex-1 flex">
            <Sidebar />
            <main className="flex-1 lg:pl-60 min-w-0 transition-all duration-300 pb-16 lg:pb-8 bg-slate-50 min-h-[calc(100vh-4rem)]">
              {children}
            </main>
          </div>
        </ErpProvider>
      </body>
    </html>
  );
}
