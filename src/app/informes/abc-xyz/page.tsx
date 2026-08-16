"use client";

import React, { useMemo } from "react";
import { PieChart, Info, Layers } from "lucide-react";
import { useErp } from "@/context/erp-context";
import { formatCLP } from "@/lib/utils";

export default function MatrizAbcXyzPage() {
  const { productos, movimientos } = useErp();

  // Clasificación Pareto ABC basada en valorización de inventario / rotación
  const classifiedProducts = useMemo(() => {
    const totalVal = productos.reduce(
      (acc, p) => acc + Number(p.stock_actual || 0) * Number(p.precio_venta || 0),
      0
    );

    const sorted = [...productos]
      .map((p) => {
        const valorItem = Number(p.stock_actual || 0) * Number(p.precio_venta || 0);
        const pctValor = totalVal > 0 ? (valorItem / totalVal) * 100 : 0;
        return {
          ...p,
          valorItem,
          pctValor,
        };
      })
      .sort((a, b) => b.valorItem - a.valorItem);

    let acumulado = 0;
    return sorted.map((p) => {
      acumulado += p.pctValor;
      let clase = "C";
      if (acumulado <= 80) {
        clase = "A";
      } else if (acumulado <= 95) {
        clase = "B";
      }
      return {
        ...p,
        clase,
        acumulado: acumulado.toFixed(1),
      };
    });
  }, [productos]);

  const countA = classifiedProducts.filter((p) => p.clase === "A").length;
  const countB = classifiedProducts.filter((p) => p.clase === "B").length;
  const countC = classifiedProducts.filter((p) => p.clase === "C").length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
          <PieChart className="w-4 h-4 text-[#3a4d6b]" />
          <span>Gestión de Inventarios</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-1">
          Matriz ABC de Rotación e Inventario
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Principio de Pareto 80/20: Clasificación de productos según su impacto financiero.
        </p>
      </div>

      {/* Resumen de Categorías */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-lg bg-white border border-slate-200 shadow-xs flex flex-col justify-between border-l-4 border-l-emerald-500">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Clase A (Alto Impacto • ~80% Valor)
          </span>
          <h3 className="text-2xl font-bold text-emerald-800 mt-2">{countA} SKUs</h3>
          <p className="text-xs text-slate-500 mt-1">
            Productos estratégicos críticos. Requieren control estricto de stock.
          </p>
        </div>

        <div className="p-5 rounded-lg bg-white border border-slate-200 shadow-xs flex flex-col justify-between border-l-4 border-l-amber-500">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Clase B (Impacto Medio • ~15% Valor)
          </span>
          <h3 className="text-2xl font-bold text-amber-800 mt-2">{countB} SKUs</h3>
          <p className="text-xs text-slate-500 mt-1">
            Artículos de rotación intermedia con control periódico.
          </p>
        </div>

        <div className="p-5 rounded-lg bg-white border border-slate-200 shadow-xs flex flex-col justify-between border-l-4 border-l-slate-400">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Clase C (Bajo Impacto • ~5% Valor)
          </span>
          <h3 className="text-2xl font-bold text-slate-700 mt-2">{countC} SKUs</h3>
          <p className="text-xs text-slate-500 mt-1">
            Artículos de menor valor financiero. Reabastecimiento por lotes grandes.
          </p>
        </div>
      </div>

      {/* Tabla Matriz ABC */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-800 font-bold">
              <tr>
                <th className="py-3 px-4 text-center">Clasificación</th>
                <th className="py-3 px-4">SKU / Producto</th>
                <th className="py-3 px-4">Categoría</th>
                <th className="py-3 px-4 text-right">Precio Venta</th>
                <th className="py-3 px-4 text-center">Stock Actual</th>
                <th className="py-3 px-4 text-right">Valorización Total</th>
                <th className="py-3 px-4 text-right">% Acumulado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classifiedProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    No hay productos en el catálogo.
                  </td>
                </tr>
              ) : (
                classifiedProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded font-bold text-xs ${
                          p.clase === "A"
                            ? "bg-emerald-100 text-emerald-800"
                            : p.clase === "B"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        Clase {p.clase}
                      </span>
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
                    <td className="py-3 px-4 text-center font-mono text-slate-800">
                      {p.stock_actual} u.
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatCLP(p.valorItem)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">
                      {p.acumulado}%
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
