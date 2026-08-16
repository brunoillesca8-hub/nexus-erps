"use client";

import React from "react";
import {
  TrendingUp,
  DollarSign,
  Receipt,
  PiggyBank,
  ArrowUpRight,
  ShieldCheck,
  Calendar,
} from "lucide-react";
import { useErp } from "@/context/erp-context";
import { formatCLP } from "@/lib/utils";

export default function InformeEjecutivoPage() {
  const { ventas, productos } = useErp();

  // Métricas Clave
  const totalVentasBrutas = ventas.reduce((acc, v) => acc + Number(v.total || 0), 0);
  const totalIvaRecaudado = ventas.reduce((acc, v) => acc + Number(v.impuesto || 0), 0);
  const totalNeto = Math.max(0, totalVentasBrutas - totalIvaRecaudado);
  const ticketPromedio = ventas.length > 0 ? Math.round(totalVentasBrutas / ventas.length) : 0;

  // Descuentos totales
  const totalDescuentos = ventas.reduce((acc, v) => acc + Number(v.descuento || 0), 0);

  // Valorización de inventario actual
  const valorInventario = productos.reduce(
    (acc, p) => acc + Number(p.stock_actual || 0) * Number(p.precio_venta || 0),
    0
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
          <TrendingUp className="w-4 h-4 text-[#3a4d6b]" />
          <span>Informes Financieros</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-1">
          Resumen Ejecutivo de Rendimiento
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Consolidado de ventas brutas, impuestos, ticket promedio y valorización comercial.
        </p>
      </div>

      {/* Tarjetas KPI Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-lg bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Ventas Brutas</span>
            <div className="p-2 rounded-lg bg-slate-100 text-[#3a4d6b]">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-900">{formatCLP(totalVentasBrutas)}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{ventas.length} boletas emitidas</p>
          </div>
        </div>

        <div className="p-5 rounded-lg bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Venta Neta (Sin IVA)</span>
            <div className="p-2 rounded-lg bg-slate-100 text-emerald-700">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-emerald-800">{formatCLP(totalNeto)}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Base imponible consolidada</p>
          </div>
        </div>

        <div className="p-5 rounded-lg bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">IVA Débito (19%)</span>
            <div className="p-2 rounded-lg bg-slate-100 text-amber-700">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-900">{formatCLP(totalIvaRecaudado)}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Impuesto al valor agregado</p>
          </div>
        </div>

        <div className="p-5 rounded-lg bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Ticket Promedio</span>
            <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-900">{formatCLP(ticketPromedio)}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Gasto medio por cliente</p>
          </div>
        </div>
      </div>

      {/* Desglose Detallado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 pb-2 border-b border-slate-100">
            Resumen Operacional
          </h3>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-600">Total Transacciones Registradas:</span>
              <span className="font-bold font-mono text-slate-900">{ventas.length} ventas</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-600">Total Descuentos Otorgados:</span>
              <span className="font-bold font-mono text-rose-600">{formatCLP(totalDescuentos)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-600">Catálogo de Productos Activos:</span>
              <span className="font-bold font-mono text-slate-900">{productos.length} SKUs</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-600">Valorización Comercial de Inventario:</span>
              <span className="font-bold font-mono text-[#3a4d6b]">{formatCLP(valorInventario)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900 pb-2 border-b border-slate-100">
              Distribución de Métodos de Pago
            </h3>
            <div className="space-y-2 text-xs pt-2">
              {["EFECTIVO", "TARJETA_DEBITO", "TARJETA_CREDITO", "TRANSFERENCIA"].map((metodo) => {
                const ventasMetodo = ventas.filter((v) => v.metodo_pago === metodo);
                const totalMetodo = ventasMetodo.reduce((acc, v) => acc + Number(v.total || 0), 0);
                const pct = totalVentasBrutas > 0 ? ((totalMetodo / totalVentasBrutas) * 100).toFixed(1) : "0";

                return (
                  <div key={metodo} className="space-y-1">
                    <div className="flex justify-between text-slate-700">
                      <span className="font-medium">{metodo}</span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatCLP(totalMetodo)} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#3a4d6b] h-full rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
