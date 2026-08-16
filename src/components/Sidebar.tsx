"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  ReceiptText,
  Boxes,
  ClipboardList,
  BarChart3,
  Users,
  Truck,
  Settings,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Award,
  PieChart,
  DollarSign,
  Clock,
  CreditCard,
  Sparkles,
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const [informesOpen, setInformesOpen] = useState(true);

  const navItemClass = (active: boolean) =>
    `flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
      active
        ? "bg-slate-100 text-[#3a4d6b] font-bold shadow-xs border-l-3 border-[#3a4d6b]"
        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
    }`;

  const subNavItemClass = (active: boolean) =>
    `flex items-center space-x-2 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
      active
        ? "bg-slate-100 text-[#3a4d6b] font-bold"
        : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
    }`;

  return (
    <aside className="w-52 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col justify-between select-none min-h-[calc(100vh-4rem)]">
      <div className="p-3 space-y-4">
        {/* GRUPO: OPERACIONES */}
        <div className="space-y-0.5">
          <span className="px-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Operaciones
          </span>
          <div className="space-y-0.5 pt-0.5">
            <Link href="/" className={navItemClass(pathname === "/")}>
              <LayoutDashboard className="w-3.5 h-3.5 text-slate-500" />
              <span>Dashboard</span>
            </Link>

            <Link
              href="/ventas/nueva"
              className={navItemClass(pathname === "/ventas/nueva")}
            >
              <ShoppingCart className="w-3.5 h-3.5 text-slate-500" />
              <span>Punto de Venta (POS)</span>
            </Link>

            <Link href="/ventas" className={navItemClass(pathname === "/ventas")}>
              <ReceiptText className="w-3.5 h-3.5 text-slate-500" />
              <span>Historial de Ventas</span>
            </Link>
          </div>
        </div>

        {/* GRUPO: INVENTARIO & CATÁLOGO */}
        <div className="space-y-0.5">
          <span className="px-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Inventario
          </span>
          <div className="space-y-0.5 pt-0.5">
            <Link
              href="/productos"
              className={navItemClass(pathname === "/productos")}
            >
              <Boxes className="w-3.5 h-3.5 text-slate-500" />
              <span>Catálogo de Productos</span>
            </Link>

            <Link
              href="/inventario"
              className={navItemClass(pathname === "/inventario")}
            >
              <ClipboardList className="w-3.5 h-3.5 text-slate-500" />
              <span>Kardex & Movimientos</span>
            </Link>
          </div>
        </div>

        {/* GRUPO: INFORMES Y ANALÍTICA */}
        <div className="space-y-0.5">
          <span className="px-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Informes
          </span>
          <div className="space-y-0.5 pt-0.5">
            <button
              onClick={() => setInformesOpen(!informesOpen)}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center space-x-2.5">
                <BarChart3 className="w-3.5 h-3.5 text-slate-500" />
                <span>Analítica & Reportes</span>
              </div>
              {informesOpen ? (
                <ChevronDown className="w-3 h-3 text-slate-400" />
              ) : (
                <ChevronRight className="w-3 h-3 text-slate-400" />
              )}
            </button>

            {informesOpen && (
              <div className="pl-4 space-y-0.5 pt-0.5 border-l-2 border-slate-100 ml-3">
                <Link
                  href="/informes/ejecutivo"
                  className={subNavItemClass(pathname === "/informes/ejecutivo")}
                >
                  <TrendingUp className="w-3 h-3 text-slate-400" />
                  <span>Resumen Ejecutivo</span>
                </Link>

                <Link
                  href="/informes/top-productos"
                  className={subNavItemClass(pathname === "/informes/top-productos")}
                >
                  <Award className="w-3 h-3 text-slate-400" />
                  <span>TOP Productos</span>
                </Link>

                <Link
                  href="/informes/abc-xyz"
                  className={subNavItemClass(pathname === "/informes/abc-xyz")}
                >
                  <PieChart className="w-3 h-3 text-slate-400" />
                  <span>Matriz ABC-XYZ</span>
                </Link>

                <Link
                  href="/informes/rentabilidad"
                  className={subNavItemClass(pathname === "/informes/rentabilidad")}
                >
                  <DollarSign className="w-3 h-3 text-slate-400" />
                  <span>Rentabilidad & Margen</span>
                </Link>

                <Link
                  href="/informes/horarios"
                  className={subNavItemClass(
                    pathname === "/informes/horarios" || pathname === "/analitica/horarios"
                  )}
                >
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>Horarios & Demanda</span>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* GRUPO: RELACIONES CRM */}
        <div className="space-y-0.5">
          <span className="px-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Contactos
          </span>
          <div className="space-y-0.5 pt-0.5">
            <Link
              href="/clientes"
              className={navItemClass(pathname === "/clientes")}
            >
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>Clientes (CRM)</span>
            </Link>

            <Link
              href="/proveedores"
              className={navItemClass(pathname === "/proveedores")}
            >
              <Truck className="w-3.5 h-3.5 text-slate-500" />
              <span>Proveedores</span>
            </Link>
          </div>
        </div>

        {/* GRUPO: ADMINISTRACIÓN */}
        <div className="space-y-0.5">
          <span className="px-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Administración
          </span>
          <div className="space-y-0.5 pt-0.5">
            <Link
              href="/configuracion"
              className={navItemClass(pathname === "/configuracion")}
            >
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              <span>Configuración</span>
            </Link>

            <Link
              href="/suscripciones"
              className={navItemClass(pathname === "/suscripciones")}
            >
              <CreditCard className="w-3.5 h-3.5 text-slate-500" />
              <div className="flex items-center space-x-1.5">
                <span>Suscripciones</span>
                <span className="px-1 py-0.1 rounded bg-amber-100 text-amber-800 text-[9px] font-bold">
                  PRO
                </span>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer Lateral */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center space-x-1.5 text-[11px] text-slate-500">
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span className="font-semibold text-slate-700">Nexus ERP v1.2</span>
        </div>
        <p className="text-[10px] text-slate-400 mt-0.5">Turso Edge LibSQL • 0ms Lag</p>
      </div>
    </aside>
  );
}
