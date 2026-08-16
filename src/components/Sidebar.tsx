"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Gauge,
  Calculator,
  Receipt,
  LayoutGrid,
  ClipboardList,
  Truck,
  Users,
  BarChart2,
  Trophy,
  Activity,
  TrendingUp,
  Clock,
  Settings,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavSection {
  title?: string;
  items: {
    name: string;
    href: string;
    icon: React.ElementType;
  }[];
}

const navSections: NavSection[] = [
  {
    title: "Operaciones",
    items: [
      { name: "Dashboard", href: "/", icon: Gauge },
      { name: "POS", href: "/ventas/nueva", icon: Calculator },
      { name: "Ventas", href: "/ventas", icon: Receipt },
    ],
  },
  {
    title: "Inventario",
    items: [
      { name: "Catálogo", href: "/productos", icon: LayoutGrid },
      { name: "Kardex", href: "/inventario", icon: ClipboardList },
      { name: "Proveedores", href: "/proveedores", icon: Truck },
      { name: "Clientes", href: "/clientes", icon: Users },
    ],
  },
  {
    title: "Informes",
    items: [
      { name: "Ejecutivos", href: "/analitica/horarios", icon: BarChart2 },
      { name: "Top", href: "/analitica/horarios", icon: Trophy },
      { name: "ABC-XYZ", href: "/analitica/horarios", icon: Activity },
      { name: "Rentabilidad", href: "/analitica/horarios", icon: TrendingUp },
      { name: "Horarios", href: "/analitica/horarios", icon: Clock },
    ],
  },
  {
    title: undefined,
    items: [
      { name: "Configuración", href: "/configuracion", icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Botón flotante móvil */}
      <div className="lg:hidden fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-3.5 rounded-full bg-[#3a4d6b] text-white shadow-xl hover:bg-slate-700 transition-colors"
          aria-label="Menú"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Drawer Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Barra Lateral */}
      <aside
        className={cn(
          "fixed top-16 bottom-0 left-0 z-40 w-60 bg-white border-r border-slate-200 px-3 py-4 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 overflow-y-auto",
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        )}
      >
        <div className="space-y-5">
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              {section.title && (
                <div className="px-3 pb-1">
                  <span className="text-xs font-bold text-slate-800 tracking-tight">
                    {section.title}
                  </span>
                </div>
              )}

              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                        isActive
                          ? "bg-slate-100 text-slate-900 font-semibold shadow-xs"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      )}
                    >
                      <Icon
                        className={cn(
                          "w-4 h-4",
                          isActive ? "text-slate-800" : "text-slate-500"
                        )}
                      />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer pequeño con versión */}
        <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 px-3 flex items-center justify-between">
          <span>Nexus ERP v2.0</span>
          <span className="font-semibold text-emerald-600">Online</span>
        </div>
      </aside>
    </>
  );
}
