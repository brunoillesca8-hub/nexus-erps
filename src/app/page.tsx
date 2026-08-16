"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Package,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Calculator,
  Calendar,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { useErp } from "@/context/erp-context";
import { formatCLP } from "@/lib/utils";

export default function DashboardPage() {
  const { productos, ventas } = useErp();

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

  // 5. Gráfico Lineal de Ventas por Días de la Semana (Últimos 7 días)
  const salesWeeklyData = useMemo(() => {
    const diasSemana = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const resultado = [];

    const hoy = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(hoy);
      d.setDate(hoy.getDate() - i);
      const fechaISO = d.toISOString().slice(0, 10);
      const diaNombre = diasSemana[d.getDay()];

      const ventasDia = ventas.filter((v) => v.fecha_venta?.startsWith(fechaISO));
      const totalDia = ventasDia.reduce((acc, v) => acc + Number(v.total || 0), 0);

      resultado.push({
        dia: diaNombre,
        fecha: fechaISO,
        monto: totalDia,
        transacciones: ventasDia.length,
      });
    }

    return resultado;
  }, [ventas]);

  return (
    <div className="space-y-4 max-w-full">
      {/* Header Compacto */}
      <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-lg border border-slate-200 shadow-2xs">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-none">
            Panel de Control Ejecutivo
          </span>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-tight mt-0.5">
            Resumen Operativo & Ventas
          </h1>
        </div>

        <Link
          href="/ventas/nueva"
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#3a4d6b] hover:bg-slate-700 text-white text-xs font-bold shadow-xs transition-all"
        >
          <Calculator className="w-3.5 h-3.5" />
          <span>Abrir Punto de Venta (POS)</span>
        </Link>
      </div>

      {/* Tarjetas KPI Compactas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* KPI 1: Ventas Hoy */}
        <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Ventas de Hoy</span>
            <div className="p-1.5 rounded-md bg-slate-100 text-slate-700">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5">
            <h3 className="text-xl font-bold text-slate-900">{formatCLP(totalDineroHoy)}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {ventasHoy.length} boleta{ventasHoy.length === 1 ? "" : "s"} emitidas hoy
            </p>
          </div>
        </div>

        {/* KPI 2: Ventas del Mes */}
        <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Ventas del Mes</span>
            <div className="p-1.5 rounded-md bg-slate-100 text-slate-700">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5">
            <h3 className="text-xl font-bold text-slate-900">{formatCLP(totalDineroMes)}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {ventasMes.length} transacciones este mes
            </p>
          </div>
        </div>

        {/* KPI 3: Valor de Inventario */}
        <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Valorización Stock</span>
            <div className="p-1.5 rounded-md bg-slate-100 text-slate-700">
              <Package className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5">
            <h3 className="text-xl font-bold text-slate-900">
              {formatCLP(valorizacionInventario)}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{productos.length} productos en catálogo</p>
          </div>
        </div>

        {/* KPI 4: Stock Crítico */}
        <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Stock Crítico</span>
            <div className="p-1.5 rounded-md bg-amber-50 text-amber-600">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5">
            <h3 className="text-xl font-bold text-amber-700">
              {productosCriticos.length} SKUs
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {productosCriticos.length > 0 ? "Requieren reposición" : "Niveles óptimos"}
            </p>
          </div>
        </div>
      </div>

      {/* SECCIÓN PRINCIPAL: Gráfico Lineal de Ventas y Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* GRÁFICO LINEAL DE VENTAS */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#3a4d6b]" />
                <h2 className="font-bold text-xs sm:text-sm text-slate-900">
                  Evolución de Ventas Semanales (Lunes a Domingo)
                </h2>
              </div>
              <span className="text-[11px] font-medium text-slate-400">
                Eje X: Días • Eje Y: Dinero ($ CLP)
              </span>
            </div>

            <div className="h-56 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={salesWeeklyData}
                  margin={{ top: 10, right: 15, left: 5, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="dia"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "#e2e8f0" }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white border border-slate-300 p-2.5 rounded-lg shadow-md text-xs space-y-1">
                            <p className="font-bold text-slate-900">
                              {label} ({data.fecha})
                            </p>
                            <p className="text-emerald-700 font-bold text-xs">
                              Monto: {formatCLP(data.monto)}
                            </p>
                            <p className="text-slate-500 text-[11px]">
                              Transacciones: {data.transacciones} boletas
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="monto"
                    stroke="#3a4d6b"
                    strokeWidth={2.5}
                    dot={{ fill: "#3a4d6b", r: 3.5, strokeWidth: 1.5, stroke: "#ffffff" }}
                    activeDot={{ r: 6, fill: "#0284c7" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Sincronizado en tiempo real con Turso</span>
            <Link
              href="/ventas"
              className="font-semibold text-[#3a4d6b] hover:underline flex items-center space-x-1"
            >
              <span>Ver todas las ventas</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Alertas de Reposición */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="font-bold text-xs sm:text-sm text-slate-900">Alertas de Stock</h2>
              <Link
                href="/productos"
                className="text-[11px] font-semibold text-[#3a4d6b] hover:underline flex items-center space-x-1"
              >
                <span>Catálogo</span>
                <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="divide-y divide-slate-100 mt-1">
              {productosCriticos.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500/60 mb-1.5" />
                  <p className="font-semibold text-slate-600">Niveles de stock óptimos</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">No hay productos bajo el mínimo.</p>
                </div>
              ) : (
                productosCriticos.slice(0, 4).map((p) => (
                  <div
                    key={p.id}
                    className="py-2.5 flex items-center justify-between text-xs hover:bg-slate-50 px-1 rounded transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-slate-900 truncate max-w-[130px]">
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

          <div className="pt-2 border-t border-slate-100 mt-2">
            <Link
              href="/inventario"
              className="w-full flex items-center justify-center py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
            >
              Auditoría Kardex
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
