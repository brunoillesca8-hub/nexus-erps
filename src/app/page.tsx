"use client";

import React from "react";
import Link from "next/link";
import {
  TrendingUp,
  ShoppingCart,
  Package,
  Boxes,
  Users,
  AlertTriangle,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Store,
  Calculator,
} from "lucide-react";
import { useErp } from "@/context/erp-context";
import { formatCLP, formatDateTime } from "@/lib/utils";

export default function DashboardPage() {
  const { productos, ventas, movimientos, clientes, empresa } = useErp();

  // 1. Cálculos de Ventas Hoy
  const hoyStr = new Date().toISOString().slice(0, 10);
  const ventasHoy = ventas.filter((v) => v.fecha_venta?.startsWith(hoyStr));
  const totalDineroHoy = ventasHoy.reduce((acc, v) => acc + Number(v.total || 0), 0);

  // 2. Total Dinero del Mes
  const mesActualStr = new Date().toISOString().slice(0, 7);
  const ventasMes = ventas.filter((v) => v.fecha_venta?.startsWith(mesActualStr));
  const totalDineroMes = ventasMes.reduce((acc, v) => acc + Number(v.total || 0), 0);

  // 3. Valorización Total del Inventario
  const valorizacionInventario = productos.reduce(
    (acc, p) => acc + Number(p.stock_actual || 0) * Number(p.precio_venta || 0),
    0
  );

  // 4. Productos Bajo Stock
  const productosCriticos = productos.filter((p) => p.stock_actual <= p.stock_minimo);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-lg border border-slate-200 shadow-xs">
        <div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Panel de Control Ejecutivo
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-0.5">
            Resumen Operativo & Ventas
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Persistencia ACID en tiempo real conectada a Turso LibSQL Edge.
          </p>
        </div>

        <Link
          href="/ventas/nueva"
          className="flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-[#3a4d6b] hover:bg-slate-700 text-white text-xs font-bold shadow-xs transition-all self-start sm:self-auto"
        >
          <Calculator className="w-4 h-4" />
          <span>Abrir Punto de Venta (POS)</span>
        </Link>
      </div>

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Ventas Hoy */}
        <div className="p-5 rounded-lg bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Ventas de Hoy</span>
            <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-900">{formatCLP(totalDineroHoy)}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {ventasHoy.length} boleta{ventasHoy.length === 1 ? "" : "s"} emitidas hoy
            </p>
          </div>
        </div>

        {/* KPI 2: Ventas del Mes */}
        <div className="p-5 rounded-lg bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Ventas del Mes</span>
            <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-900">{formatCLP(totalDineroMes)}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {ventasMes.length} transacciones este mes
            </p>
          </div>
        </div>

        {/* KPI 3: Valor de Inventario */}
        <div className="p-5 rounded-lg bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Valorización Stock</span>
            <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-900">
              {formatCLP(valorizacionInventario)}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{productos.length} productos en catálogo</p>
          </div>
        </div>

        {/* KPI 4: Stock Crítico */}
        <div className="p-5 rounded-lg bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Stock Crítico</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-amber-700">
              {productosCriticos.length} SKUs
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {productosCriticos.length > 0 ? "Requieren reposición" : "Niveles óptimos"}
            </p>
          </div>
        </div>
      </div>

      {/* Tablas de Últimas Ventas y Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Últimas Ventas */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="font-bold text-sm text-slate-900">Últimas Ventas Emitidas</h2>
              <Link
                href="/ventas"
                className="text-xs font-semibold text-[#3a4d6b] hover:underline flex items-center space-x-1"
              >
                <span>Ver historial</span>
                <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="divide-y divide-slate-100 mt-1">
              {ventas.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Aún no hay ventas registradas. Abre el POS para emitir la primera boleta.
                </div>
              ) : (
                ventas.slice(0, 5).map((v) => (
                  <div
                    key={v.id}
                    className="py-3 flex items-center justify-between text-xs hover:bg-slate-50 px-2 rounded transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="font-mono font-bold text-slate-700">
                        #{v.numero_folio}
                      </span>
                      <div>
                        <p className="font-semibold text-slate-900">
                          {v.cliente_nombre || "Consumidor Final"}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {formatDateTime(v.fecha_venta)} • {v.metodo_pago}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900 text-sm">
                        {formatCLP(v.total)}
                      </p>
                      <span className="text-[10px] text-emerald-600 font-semibold">
                        {v.estado}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Alertas de Reposición */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="font-bold text-sm text-slate-900">Alertas de Stock</h2>
              <Link
                href="/productos"
                className="text-xs font-semibold text-[#3a4d6b] hover:underline flex items-center space-x-1"
              >
                <span>Catálogo</span>
                <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="divide-y divide-slate-100 mt-1">
              {productosCriticos.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No hay productos bajo el stock mínimo.
                </div>
              ) : (
                productosCriticos.slice(0, 5).map((p) => (
                  <div
                    key={p.id}
                    className="py-3 flex items-center justify-between text-xs hover:bg-slate-50 px-2 rounded transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-slate-900 truncate max-w-[140px]">
                        {p.nombre}
                      </p>
                      <p className="text-[10px] text-slate-400">Mín: {p.stock_minimo} u.</p>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-bold border border-amber-200 text-xs">
                      {p.stock_actual} u.
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 mt-3">
            <Link
              href="/inventario"
              className="w-full flex items-center justify-center py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
            >
              Auditoría Kardex
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
