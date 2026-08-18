"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  BarChart3,
  Menu,
  X,
  ReceiptText,
  ClipboardList,
  Users,
  Truck,
  Settings,
  CreditCard,
  LogOut,
  ChevronRight,
  TrendingUp,
  Award,
  PieChart,
  DollarSign,
  Clock,
} from "lucide-react";
import { useErp } from "@/context/erp-context";

export default function BottomNav() {
  const pathname = usePathname();
  const { logout, user } = useErp();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItemClass = (active: boolean) =>
    `flex flex-col items-center justify-center flex-1 py-1.5 transition-colors select-none ${
      active ? "text-[#3a4d6b] font-bold" : "text-slate-500 hover:text-slate-900"
    }`;

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <>
      {/* Bottom Bar para Móviles (Visible solo en pantallas pequeñas < lg) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-lg flex items-center justify-around px-1 py-1">
        {/* 1. Dashboard */}
        <Link href="/" onClick={closeMenu} className={navItemClass(pathname === "/")}>
          <LayoutDashboard className={`w-5 h-5 ${pathname === "/" ? "text-[#3a4d6b]" : ""}`} />
          <span className="text-[10px] mt-0.5">Inicio</span>
        </Link>

        {/* 2. POS */}
        <Link
          href="/ventas/nueva"
          onClick={closeMenu}
          className={navItemClass(pathname === "/ventas/nueva")}
        >
          <div className="relative">
            <ShoppingCart
              className={`w-5 h-5 ${pathname === "/ventas/nueva" ? "text-[#3a4d6b]" : ""}`}
            />
          </div>
          <span className="text-[10px] mt-0.5">POS</span>
        </Link>

        {/* 3. Catálogo */}
        <Link
          href="/productos"
          onClick={closeMenu}
          className={navItemClass(pathname === "/productos")}
        >
          <Boxes className={`w-5 h-5 ${pathname === "/productos" ? "text-[#3a4d6b]" : ""}`} />
          <span className="text-[10px] mt-0.5">Catálogo</span>
        </Link>

        {/* 4. Informes */}
        <Link
          href="/informes/ejecutivo"
          onClick={closeMenu}
          className={navItemClass(pathname.startsWith("/informes") || pathname.startsWith("/analitica"))}
        >
          <BarChart3
            className={`w-5 h-5 ${
              pathname.startsWith("/informes") || pathname.startsWith("/analitica")
                ? "text-[#3a4d6b]"
                : ""
            }`}
          />
          <span className="text-[10px] mt-0.5">Informes</span>
        </Link>

        {/* 5. Más / Menú Completo */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={`flex flex-col items-center justify-center flex-1 py-1.5 transition-colors ${
            isMenuOpen ? "text-[#3a4d6b] font-bold" : "text-slate-500"
          }`}
        >
          {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          <span className="text-[10px] mt-0.5">Más</span>
        </button>
      </nav>

      {/* Drawer Móvil para "Más" */}
      {isMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex flex-col justify-end animate-fadeIn">
          <div className="bg-white rounded-t-2xl max-h-[80vh] overflow-y-auto p-5 space-y-4 shadow-2xl pb-24">
            {/* Header Drawer */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Menú Principal</h3>
                <p className="text-[11px] text-slate-500">
                  Usuario: <span className="font-semibold text-slate-700">{user?.username || "ADMIN"}</span>
                </p>
              </div>
              <button
                onClick={closeMenu}
                className="p-1 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Secciones de Enlaces */}
            <div className="space-y-4 text-xs">
              {/* Operaciones */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Operaciones & Ventas
                </span>
                <div className="space-y-1">
                  <Link
                    href="/ventas"
                    onClick={closeMenu}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-800 font-medium"
                  >
                    <div className="flex items-center space-x-2.5">
                      <ReceiptText className="w-4 h-4 text-slate-500" />
                      <span>Historial de Ventas & Tickets</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </Link>

                  <Link
                    href="/inventario"
                    onClick={closeMenu}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-800 font-medium"
                  >
                    <div className="flex items-center space-x-2.5">
                      <ClipboardList className="w-4 h-4 text-slate-500" />
                      <span>Kardex & Movimientos de Inventario</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </Link>
                </div>
              </div>

              {/* Informes Especializados */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Informes Financieros
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <Link
                    href="/informes/top-productos"
                    onClick={closeMenu}
                    className="flex items-center space-x-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-800"
                  >
                    <Award className="w-3.5 h-3.5 text-amber-600" />
                    <span>TOP Productos</span>
                  </Link>
                  <Link
                    href="/informes/abc-xyz"
                    onClick={closeMenu}
                    className="flex items-center space-x-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-800"
                  >
                    <PieChart className="w-3.5 h-3.5 text-[#3a4d6b]" />
                    <span>Matriz ABC</span>
                  </Link>
                  <Link
                    href="/informes/rentabilidad"
                    onClick={closeMenu}
                    className="flex items-center space-x-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-800"
                  >
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Rentabilidad</span>
                  </Link>
                  <Link
                    href="/informes/horarios"
                    onClick={closeMenu}
                    className="flex items-center space-x-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-800"
                  >
                    <Clock className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Horas Punta</span>
                  </Link>
                </div>
              </div>

              {/* CRM */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Contactos
                </span>
                <div className="space-y-1">
                  <Link
                    href="/clientes"
                    onClick={closeMenu}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-800 font-medium"
                  >
                    <div className="flex items-center space-x-2.5">
                      <Users className="w-4 h-4 text-slate-500" />
                      <span>Clientes (CRM)</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </Link>

                  <Link
                    href="/proveedores"
                    onClick={closeMenu}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-800 font-medium"
                  >
                    <div className="flex items-center space-x-2.5">
                      <Truck className="w-4 h-4 text-slate-500" />
                      <span>Proveedores</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </Link>
                </div>
              </div>

              {/* Ajustes & Cuenta */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Administración
                </span>
                <div className="space-y-1">
                  <Link
                    href="/configuracion"
                    onClick={closeMenu}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-800 font-medium"
                  >
                    <div className="flex items-center space-x-2.5">
                      <Settings className="w-4 h-4 text-slate-500" />
                      <span>Configuración & Contraseña</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </Link>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    closeMenu();
                    logout();
                  }}
                  className="w-full py-2.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-bold flex items-center justify-center space-x-1.5"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
