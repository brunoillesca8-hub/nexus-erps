"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useErp } from "@/context/erp-context";
import { Store, RefreshCw, ShoppingCart, LogOut, User } from "lucide-react";

export default function Navbar() {
  const { empresa, isSyncing, recargarDatos, user, logout } = useErp();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 bg-[#3a4d6b] text-white shadow-xs border-b border-slate-700/50">
      <div className="w-full px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
        {/* Logo e Identificador */}
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <Link href="/" className="flex items-center space-x-2 sm:space-x-3 group min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-white/10 flex items-center justify-center text-white border border-white/20 shadow-inner group-hover:scale-105 transition-transform flex-shrink-0">
              <Store className="w-4 h-4 sm:w-6 sm:h-6 text-amber-300" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-sm sm:text-base lg:text-lg tracking-tight text-white truncate">
                  NEXUS ERP
                </span>
                <span className="hidden sm:inline text-xs text-slate-300 font-normal truncate">
                  - {empresa?.nombre || "Mi Negocio Comercial"}
                </span>
              </div>
              <p className="hidden md:block text-[11px] text-slate-200/90 font-medium">
                Tienda R.U.T. {empresa?.rut_identificador || "76.123.456-7"}
              </p>
            </div>
          </Link>
        </div>

        {/* Acciones Derecha */}
        <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
          {/* Botón Acceso Rápido POS (Desktop) */}
          {pathname !== "/ventas/nueva" && (
            <Link
              href="/ventas/nueva"
              className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-all"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Abrir POS</span>
            </Link>
          )}

          {/* Sincronización Turso */}
          <button
            onClick={() => recargarDatos()}
            title="Sincronizar con Turso Database"
            className="flex items-center space-x-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs transition-colors border border-white/10"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-cyan-300" : ""}`}
            />
            <span className="hidden lg:inline text-[11px]">
              {isSyncing ? "Sincronizando..." : "Turso Conectado"}
            </span>
          </button>

          {/* Usuario y Botón Cerrar Sesión */}
          <div className="flex items-center space-x-2 sm:space-x-3 pl-1.5 sm:pl-2 border-l border-white/20">
            <div className="flex items-center space-x-1.5 bg-white/10 px-2 py-1 rounded-md">
              <User className="w-3.5 h-3.5 text-slate-200" />
              <span className="text-xs font-bold text-white tracking-wide">
                {user?.username || "ADMIN"}
              </span>
            </div>

            <button
              onClick={logout}
              title="Cerrar Sesión Segura"
              className="flex items-center space-x-1 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-white text-slate-800 hover:bg-slate-100 text-xs font-bold shadow-xs transition-all border border-slate-200"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
