"use client";

import React, { useState, useMemo } from "react";
import {
  ReceiptText,
  Search,
  Download,
  Printer,
  ChevronDown,
} from "lucide-react";
import * as XLSX from "xlsx";
import { useErp } from "@/context/erp-context";
import { formatCLP, formatDateTime, matchesSearch } from "@/lib/utils";
import TicketModal from "@/components/TicketModal";
import type { Venta } from "@/types/erp";

export default function HistorialVentasPage() {
  const { ventas, empresa, clientes } = useErp();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedMetodo, setSelectedMetodo] = useState<string>("ALL");
  const [selectedVenta, setSelectedVenta] = useState<Venta | null>(null);
  const [ventaDetalles, setVentaDetalles] = useState<any[]>([]);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

  const filteredVentas = useMemo(() => {
    return ventas.filter((v) => {
      const matchMetodo = selectedMetodo === "ALL" || v.metodo_pago === selectedMetodo;
      const matchSearch =
        matchesSearch(v.cliente_nombre || "", searchQuery) ||
        v.numero_folio.toString().includes(searchQuery) ||
        (v.total && v.total.toString().includes(searchQuery));
      return matchMetodo && matchSearch;
    });
  }, [ventas, selectedMetodo, searchQuery]);

  const handleOpenTicket = async (venta: Venta) => {
    setSelectedVenta(venta);
    try {
      const res = await fetch(`/api/ventas?id=${venta.id}`);
      const data = await res.json();
      if (data.detalles) {
        setVentaDetalles(
          data.detalles.map((d: any) => ({
            nombre: d.producto_nombre || "Producto",
            cantidad: d.cantidad,
            precio_unitario: d.precio_unitario,
            subtotal: d.subtotal,
          }))
        );
      }
    } catch {
      setVentaDetalles([]);
    } finally {
      setIsTicketModalOpen(true);
    }
  };

  const exportToExcel = () => {
    const dataToExport = filteredVentas.map((v) => ({
      Folio: v.numero_folio,
      Fecha: formatDateTime(v.fecha_venta),
      Cliente: v.cliente_nombre || "Consumidor Final",
      "Método de Pago": v.metodo_pago,
      Subtotal: v.subtotal,
      Descuento: v.descuento,
      IVA: v.impuesto,
      Total: v.total,
      Estado: v.estado,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ventas");
    XLSX.writeFile(workbook, `ventas_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Historial de Ventas
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Registro de boletas electrónicas emitidas y reimpresión de tickets.
          </p>
        </div>

        <button
          onClick={exportToExcel}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-[#3a4d6b] hover:bg-slate-700 text-white text-xs font-bold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exportar a Excel</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-cyan-600 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Buscar por folio, cliente o monto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-300 text-slate-900 placeholder-slate-400 pl-10 pr-4 py-2 rounded-lg text-xs sm:text-sm focus:ring-1 focus:ring-slate-500 focus:outline-none shadow-xs"
          />
        </div>

        <div className="relative w-full sm:w-auto">
          <select
            value={selectedMetodo}
            onChange={(e) => setSelectedMetodo(e.target.value)}
            className="w-full sm:w-56 appearance-none bg-white border border-slate-300 text-slate-700 text-xs sm:text-sm rounded-lg px-3.5 py-2 pr-9 focus:ring-1 focus:ring-slate-500 focus:outline-none shadow-xs"
          >
            <option value="ALL">Todos los métodos de pago</option>
            <option value="EFECTIVO">Efectivo</option>
            <option value="TARJETA_DEBITO">Débito</option>
            <option value="TARJETA_CREDITO">Crédito</option>
            <option value="TRANSFERENCIA">Transferencia</option>
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
        </div>
      </div>

      {/* Tabla de Ventas */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-800 font-bold">
              <tr>
                <th className="py-3 px-4">Folio</th>
                <th className="py-3 px-4">Fecha & Hora</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Método de Pago</th>
                <th className="py-3 px-4 text-right">IVA (19%)</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-center">Ticket</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVentas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    No se encontraron ventas registradas.
                  </td>
                </tr>
              ) : (
                filteredVentas.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      #{v.numero_folio}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {formatDateTime(v.fecha_venta)}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {v.cliente_nombre || "Consumidor Final"}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {v.metodo_pago}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">{formatCLP(v.impuesto)}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatCLP(v.total)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                        {v.estado}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleOpenTicket(v)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-[11px] font-medium shadow-2xs transition-colors"
                        title="Reimprimir Ticket"
                      >
                        <Printer className="w-3 h-3 text-slate-500" />
                        <span>Imprimir</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <TicketModal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        venta={selectedVenta}
        empresa={empresa}
        cliente={clientes.find((c) => c.id === selectedVenta?.cliente_id)}
        items={ventaDetalles}
      />
    </div>
  );
}
