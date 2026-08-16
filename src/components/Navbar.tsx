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
    <header className="sticky top-0 z-30 bg-[#3a4d6b] text-white shadow-sm border-b border-slate-700/50">
      <div className="w-full px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo e Identificador de Empresa */}
        <div className="flex items-center space-x-3">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-white border border-white/20 shadow-inner group-hover:scale-105 transition-transform">
              <Store className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-base sm:text-lg tracking-tight text-white">
                  NEXUS ERP - {empresa?.nombre || "Mi Negocio Comercial"}
                </span>
              </div>
              <p className="text-xs text-slate-200/90 font-medium">
                Tienda R.U.T. {empresa?.rut_identificador || "76.123.456-7"}
              </p>
            </div>
          </Link>
        </div>

        {/* Acciones Derecha */}
        <div className="flex items-center space-x-4">
          {/* Botón Acceso Rápido POS */}
          {pathname !== "/ventas/nueva" && (
            <Link
              href="/ventas/nueva"
              className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-all"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Abrir POS</span>
            </Link>
          )}

          {/* Sincronización Turso */}
          <button
            onClick={() => recargarDatos()}
            title="Sincronizar con Turso Database"
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs transition-colors border border-white/10"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-cyan-300" : ""}`}
            />
            <span className="hidden md:inline text-[11px]">
              {isSyncing ? "Sincronizando..." : "Turso Conectado"}
            </span>
          </button>

          {/* Usuario y Botón Cerrar Sesión */}
          <div className="flex items-center space-x-3 pl-2 border-l border-white/20">
            <div className="hidden sm:block text-right">
              <span className="text-[11px] text-slate-300 block leading-tight">Usuario:</span>
              <span className="text-xs font-bold text-white tracking-wide">
                {user?.username || "ADMIN"}
              </span>
            </div>

            <button
              onClick={logout}
              title="Cerrar Sesión Segura"
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-white text-slate-800 hover:bg-slate-100 text-xs font-bold shadow-sm transition-all border border-slate-200"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-600" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
