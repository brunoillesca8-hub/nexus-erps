"use client";

import React, { useMemo } from "react";
import { Award, Package, TrendingUp } from "lucide-react";
import { useErp } from "@/context/erp-context";
import { formatCLP } from "@/lib/utils";

export default function TopProductosPage() {
  const { productos, movimientos } = useErp();

  // Calcular ventas acumuladas por producto a partir de movimientos de salida
  const topProducts = useMemo(() => {
    const map: { [prodId: string]: { unidadesVendidas: number; recaudacionEst: number } } = {};

    movimientos.forEach((m) => {
      if (m.tipo === "SALIDA_VENTA") {
        if (!map[m.producto_id]) {
          map[m.producto_id] = { unidadesVendidas: 0, recaudacionEst: 0 };
        }
        map[m.producto_id].unidadesVendidas += Number(m.cantidad || 0);
      }
    });

    return productos
      .map((p) => {
        const stats = map[p.id] || { unidadesVendidas: 0, recaudacionEst: 0 };
        const recaudacion = stats.unidadesVendidas * Number(p.precio_venta || 0);
        return {
          ...p,
          unidadesVendidas: stats.unidadesVendidas,
          recaudacion,
        };
      })
      .sort((a, b) => b.unidadesVendidas - a.unidadesVendidas);
  }, [productos, movimientos]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
          <Award className="w-4 h-4 text-amber-500" />
          <span>Ranking de Ventas</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-1">
          Top Productos Más Vendidos
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Clasificación por volumen de unidades despachadas y facturación estimada.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-800 font-bold">
              <tr>
                <th className="py-3 px-4 text-center w-12">#</th>
                <th className="py-3 px-4">SKU / Producto</th>
                <th className="py-3 px-4">Categoría</th>
                <th className="py-3 px-4 text-right">Precio Venta</th>
                <th className="py-3 px-4 text-center font-bold">Unidades Vendidas</th>
                <th className="py-3 px-4 text-right font-bold">Recaudación Total</th>
                <th className="py-3 px-4 text-center">Stock Disponible</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    No hay registros de ventas para calcular el ranking.
                  </td>
                </tr>
              ) : (
                topProducts.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-400">
                      {idx === 0 ? (
                        <span className="p-1 rounded bg-amber-100 text-amber-800 text-xs">🥇 1</span>
                      ) : idx === 1 ? (
                        <span className="p-1 rounded bg-slate-200 text-slate-700 text-xs">🥈 2</span>
                      ) : idx === 2 ? (
                        <span className="p-1 rounded bg-amber-50 text-amber-900 text-xs">🥉 3</span>
                      ) : (
                        idx + 1
                      )}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div>{p.nombre}</div>
                      <span className="text-[10px] text-slate-400 font-mono font-normal">
                        SKU #{p.sku}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{p.categoria_nombre || "General"}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-800">
                      {formatCLP(p.precio_venta)}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-[#3a4d6b] text-sm">
                      {p.unidadesVendidas} u.
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-800">
                      {formatCLP(p.recaudacion)}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-700">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          p.stock_actual <= p.stock_minimo
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-slate-100 text-slate-800"
                        }`}
                      >
                        {p.stock_actual} u.
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
