"use client";

import React, { useMemo } from "react";
import { DollarSign, Percent, TrendingUp } from "lucide-react";
import { useErp } from "@/context/erp-context";
import { formatCLP } from "@/lib/utils";

export default function RentabilidadPage() {
  const { productos } = useErp();

  const profitabilityData = useMemo(() => {
    return productos
      .map((p) => {
        const costo = Number(p.precio_compra) || 0;
        const venta = Number(p.precio_venta) || 0;
        const gananciaUnitaria = Math.max(0, venta - costo);
        const margenPct = venta > 0 ? ((gananciaUnitaria / venta) * 100).toFixed(1) : "0.0";
        const gananciaPotencialStock = gananciaUnitaria * Number(p.stock_actual || 0);

        return {
          ...p,
          costo,
          venta,
          gananciaUnitaria,
          margenPct: Number(margenPct),
          gananciaPotencialStock,
        };
      })
      .sort((a, b) => b.margenPct - a.margenPct);
  }, [productos]);

  const margenPromedio = useMemo(() => {
    if (profitabilityData.length === 0) return 0;
    const sum = profitabilityData.reduce((acc, p) => acc + p.margenPct, 0);
    return (sum / profitabilityData.length).toFixed(1);
  }, [profitabilityData]);

  const gananciaTotalPotencial = useMemo(() => {
    return profitabilityData.reduce((acc, p) => acc + p.gananciaPotencialStock, 0);
  }, [profitabilityData]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
          <DollarSign className="w-4 h-4 text-emerald-600" />
          <span>Márgenes & Rendimiento</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-1">
          Rentabilidad y Margen Comercial
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Análisis de margen porcentual unitario y utilidad potencial por stock.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 rounded-lg bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Margen Promedio Global
            </span>
            <h3 className="text-3xl font-bold text-emerald-800 mt-1">{margenPromedio}%</h3>
            <p className="text-xs text-slate-500 mt-0.5">Calculado sobre {productos.length} productos</p>
          </div>
          <div className="p-3 rounded-lg bg-emerald-50 text-emerald-700">
            <Percent className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-lg bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Utilidad Potencial en Stock
            </span>
            <h3 className="text-3xl font-bold text-slate-900 mt-1">
              {formatCLP(gananciaTotalPotencial)}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Ganancia bruta de todo el inventario</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-100 text-slate-700">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-800 font-bold">
              <tr>
                <th className="py-3 px-4">SKU / Producto</th>
                <th className="py-3 px-4">Categoría</th>
                <th className="py-3 px-4 text-right">Costo Compra</th>
                <th className="py-3 px-4 text-right">Precio Venta</th>
                <th className="py-3 px-4 text-right">Ganancia Unitaria</th>
                <th className="py-3 px-4 text-right font-bold">Margen (%)</th>
                <th className="py-3 px-4 text-right">Ganancia Total Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {profitabilityData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    No hay productos en el catálogo.
                  </td>
                </tr>
              ) : (
                profitabilityData.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div>{p.nombre}</div>
                      <span className="text-[10px] text-slate-400 font-mono font-normal">
                        SKU #{p.sku}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{p.categoria_nombre || "General"}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">
                      {formatCLP(p.costo)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                      {formatCLP(p.venta)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                      +{formatCLP(p.gananciaUnitaria)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold">
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          p.margenPct >= 35
                            ? "bg-emerald-100 text-emerald-800"
                            : p.margenPct >= 20
                            ? "bg-amber-100 text-amber-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {p.margenPct}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatCLP(p.gananciaPotencialStock)}
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
