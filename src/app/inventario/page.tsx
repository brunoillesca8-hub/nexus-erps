"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Download,
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
} from "lucide-react";
import * as XLSX from "xlsx";
import { useErp } from "@/context/erp-context";
import { formatDateTime, matchesSearch } from "@/lib/utils";

export default function InventarioPage() {
  const { movimientos } = useErp();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTipo, setSelectedTipo] = useState("ALL");

  const filteredMovimientos = useMemo(() => {
    return movimientos.filter((m) => {
      const matchTipo = selectedTipo === "ALL" || m.tipo === selectedTipo;
      const matchSearch =
        matchesSearch(m.producto_nombre || "", searchQuery) ||
        (m.motivo && matchesSearch(m.motivo, searchQuery)) ||
        (m.producto_sku && m.producto_sku.toString().includes(searchQuery));
      return matchTipo && matchSearch;
    });
  }, [movimientos, selectedTipo, searchQuery]);

  const exportToExcel = () => {
    const dataToExport = filteredMovimientos.map((m) => ({
      Fecha: formatDateTime(m.created_at),
      SKU: m.producto_sku || "",
      Producto: m.producto_nombre || "",
      Tipo: m.tipo,
      Cantidad: m.cantidad,
      "Stock Anterior": m.stock_anterior,
      "Stock Resultante": m.stock_posterior,
      Motivo: m.motivo || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Kardex");
    XLSX.writeFile(workbook, `kardex_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Kardex & Movimientos de Inventario
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Auditoría de entradas, salidas por ventas, ajustes manuales y mermas.
          </p>
        </div>

        <button
          onClick={exportToExcel}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-[#3a4d6b] hover:bg-slate-700 text-white text-xs font-bold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exportar Kardex (CSV)</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-cyan-600 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Buscar por producto, SKU o motivo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-300 text-slate-900 placeholder-slate-400 pl-10 pr-4 py-2 rounded-lg text-xs sm:text-sm focus:ring-1 focus:ring-slate-500 focus:outline-none shadow-xs"
          />
        </div>

        <div className="relative w-full sm:w-auto">
          <select
            value={selectedTipo}
            onChange={(e) => setSelectedTipo(e.target.value)}
            className="w-full sm:w-56 appearance-none bg-white border border-slate-300 text-slate-700 text-xs sm:text-sm rounded-lg px-3.5 py-2 pr-9 focus:ring-1 focus:ring-slate-500 focus:outline-none shadow-xs"
          >
            <option value="ALL">Todos los movimientos</option>
            <option value="ENTRADA_COMPRA">Entrada por Compra</option>
            <option value="SALIDA_VENTA">Salida por Venta</option>
            <option value="AJUSTE_POSITIVO">Ajuste Positivo (+)</option>
            <option value="AJUSTE_NEGATIVO">Ajuste Negativo (-)</option>
            <option value="MERMA_DANADO">Merma o Daño</option>
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
        </div>
      </div>

      {/* Tabla Kardex */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-800 font-bold">
              <tr>
                <th className="py-3 px-4">Fecha & Hora</th>
                <th className="py-3 px-4">SKU / Producto</th>
                <th className="py-3 px-4">Tipo de Movimiento</th>
                <th className="py-3 px-4 text-center">Cantidad</th>
                <th className="py-3 px-4 text-center">Stock Antes</th>
                <th className="py-3 px-4 text-center">Stock Después</th>
                <th className="py-3 px-4">Motivo / Factura</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMovimientos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    No hay movimientos registrados en el Kardex.
                  </td>
                </tr>
              ) : (
                filteredMovimientos.map((m) => {
                  const isPositive =
                    m.tipo === "ENTRADA_COMPRA" || m.tipo === "AJUSTE_POSITIVO";

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 text-slate-600">
                        {formatDateTime(m.created_at)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">
                          {m.producto_nombre || "Producto"}
                        </div>
                        {m.producto_sku && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            SKU #{m.producto_sku}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            isPositive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {m.tipo}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold font-mono">
                        <span className={isPositive ? "text-emerald-700" : "text-rose-700"}>
                          {isPositive ? `+${m.cantidad}` : `-${m.cantidad}`}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-500">
                        {m.stock_anterior} u.
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-900">
                        {m.stock_posterior} u.
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {m.motivo || "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
