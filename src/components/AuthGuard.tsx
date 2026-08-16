"use client";

import React, { useState } from "react";
import { Store, Lock, User, KeyRound, AlertCircle, ArrowRight, ShieldCheck } from "lucide-react";
import { useErp } from "@/context/erp-context";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, login, isLoading } = useErp();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-3 border-[#3a4d6b] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 font-medium">Iniciando Nexus ERP...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    const handleLoginSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!username.trim() || !password.trim()) {
        setErrorMsg("Ingresa tu usuario y contraseña.");
        return;
      }

      setIsSubmitting(true);
      setErrorMsg(null);

      const res = await login(username, password);
      setIsSubmitting(false);

      if (!res.success) {
        setErrorMsg(res.error || "Credenciales incorrectas.");
      }
    };

    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          {/* Header Superior Corporativo */}
          <div className="bg-[#3a4d6b] p-8 text-white text-center relative">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/10 border border-white/20 mb-3 backdrop-blur-xs">
              <Store className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">NEXUS ERP</h1>
            <p className="text-xs text-slate-300 mt-1">
              Plataforma Centralizada de Ventas & Gestión de Inventarios
            </p>
          </div>

          {/* Formulario de Login */}
          <div className="p-8 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Iniciar Sesión</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Ingresa tus credenciales de acceso para entrar al sistema.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Usuario o Email</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="admin o admin@minegocio.cl"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg pl-9 pr-3.5 py-2.5 text-xs focus:bg-white focus:ring-1 focus:ring-slate-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Contraseña</label>
                  <span className="text-[10px] text-slate-400">Default: admin123</span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg pl-9 pr-3.5 py-2.5 text-xs focus:bg-white focus:ring-1 focus:ring-slate-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-lg bg-[#3a4d6b] hover:bg-slate-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 mt-2"
              >
                <span>{isSubmitting ? "Autenticando..." : "Ingresar al ERP"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-center space-x-1.5 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Conexión segura cifrada con Turso LibSQL Edge</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
