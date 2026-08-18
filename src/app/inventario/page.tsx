"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Download,
  ChevronDown,
  FileText,
} from "lucide-react";
import * as XLSX from "xlsx";
import { useErp } from "@/context/erp-context";
import { formatDateTime, matchesSearch } from "@/lib/utils";
import ModalImportarFactura from "@/components/ModalImportarFactura";

export default function InventarioPage() {
  const { movimientos, productos } = useErp();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTipo, setSelectedTipo] = useState("ALL");
  const [isFacturaModalOpen, setIsFacturaModalOpen] = useState(false);

  // Mapeo rápido de productoId -> producto completo para obtener codigo_barras
  const productosMap = useMemo(() => {
    const map = new Map<string, any>();
    productos.forEach((p) => {
      map.set(p.id, p);
    });
    return map;
  }, [productos]);

  const filteredMovimientos = useMemo(() => {
    return movimientos.filter((m) => {
      const matchTipo = selectedTipo === "ALL" || m.tipo === selectedTipo;
      const prod = productosMap.get(m.producto_id);
      const codigoCompleto = prod?.codigo_barras || m.producto_sku?.toString() || "";

      const matchSearch =
        matchesSearch(m.producto_nombre || "", searchQuery) ||
        (m.motivo && matchesSearch(m.motivo, searchQuery)) ||
        codigoCompleto.includes(searchQuery);
      return matchTipo && matchSearch;
    });
  }, [movimientos, selectedTipo, searchQuery, productosMap]);

  const exportToExcel = () => {
    const dataToExport = filteredMovimientos.map((m) => {
      const prod = productosMap.get(m.producto_id);
      const codigoCompleto = prod?.codigo_barras || m.producto_sku || "";

      return {
        Fecha: formatDateTime(m.created_at),
        "Código / SKU": codigoCompleto,
        Producto: m.producto_nombre || "",
        Tipo: m.tipo,
        Cantidad: m.cantidad,
        "Stock Anterior": m.stock_anterior,
        "Stock Resultante": m.stock_posterior,
        Motivo: m.motivo || "",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Kardex");
    XLSX.writeFile(workbook, `kardex_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-4 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-lg border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Kardex & Movimientos de Inventario
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Auditoría cronológica de entradas, ventas y reposiciones en tiempo real.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Botón Cargar Factura Proveedor */}
          <button
            onClick={() => setIsFacturaModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300 shadow-2xs transition-colors"
            title="Importar Factura Electrónica del SII (XML) o Excel"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-700" />
            <span>Cargar Factura</span>
          </button>

          <button
            onClick={exportToExcel}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-[#3a4d6b] hover:bg-slate-700 text-white text-xs font-bold shadow-xs transition-colors self-start sm:self-auto"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Kardex (CSV)</span>
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row items-center gap-2.5">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-cyan-600 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por producto, código completo o motivo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-300 text-slate-900 placeholder-slate-400 pl-9 pr-3 py-1.5 rounded-lg text-xs sm:text-sm focus:ring-1 focus:ring-slate-500 focus:outline-none shadow-2xs"
          />
        </div>

        <div className="relative w-full sm:w-auto">
          <select
            value={selectedTipo}
            onChange={(e) => setSelectedTipo(e.target.value)}
            className="w-full sm:w-56 appearance-none bg-white border border-slate-300 text-slate-700 text-xs rounded-lg px-3 py-1.5 pr-8 focus:ring-1 focus:ring-slate-500 focus:outline-none shadow-2xs"
          >
            <option value="ALL">Todos los movimientos</option>
            <option value="ENTRADA_COMPRA">Entrada por Compra</option>
            <option value="SALIDA_VENTA">Salida por Venta</option>
            <option value="AJUSTE_POSITIVO">Ajuste Positivo (+)</option>
            <option value="AJUSTE_NEGATIVO">Ajuste Negativo (-)</option>
            <option value="MERMA_DANADO">Merma o Daño</option>
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2 pointer-events-none" />
        </div>
      </div>

      {/* Tabla Kardex */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-800 font-bold">
              <tr>
                <th className="py-3 px-4">Fecha & Hora</th>
                <th className="py-3 px-4">Código / Producto</th>
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
                  const prod = productosMap.get(m.producto_id);
                  const codigoCompleto = prod?.codigo_barras || m.producto_sku || "";
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
                        {codigoCompleto && (
                          <div className="text-[11px] text-slate-600 font-mono font-semibold">
                            {codigoCompleto}
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
                        {m.motivo || "Transacción registrada"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Importar Factura Proveedor XML/Excel */}
      <ModalImportarFactura
        isOpen={isFacturaModalOpen}
        onClose={() => setIsFacturaModalOpen(false)}
      />
    </div>
  );
}
