"use client";

import React, { useState } from "react";
import { X, Printer, CheckCircle2, Copy } from "lucide-react";
import { formatCLP, formatDateTime } from "@/lib/utils";
import type { Venta, Empresa, Cliente } from "@/types/erp";

interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  venta: Venta | null;
  empresa: Empresa | null;
  cliente?: Cliente | null;
  items?: {
    nombre: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
  }[];
}

export default function TicketModal({
  isOpen,
  onClose,
  venta,
  empresa,
  cliente,
  items = [],
}: TicketModalProps) {
  const [paperWidth, setPaperWidth] = useState<"80mm" | "58mm">("80mm");
  const [copied, setCopied] = useState(false);

  if (!isOpen || !venta) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    const text = `
================================
${empresa?.nombre || "NEXUS ERP"}
RUT: ${empresa?.rut_identificador || "76.123.456-7"}
BOLETA ELECTRÓNICA N° ${venta.numero_folio}
Fecha: ${formatDateTime(venta.fecha_venta)}
--------------------------------
${items
  .map(
    (it) =>
      `${it.cantidad}x ${it.nombre}\n  ${formatCLP(it.precio_unitario)} = ${formatCLP(
        it.subtotal
      )}`
  )
  .join("\n")}
--------------------------------
Subtotal: ${formatCLP(venta.subtotal)}
IVA (19%): ${formatCLP(venta.impuesto)}
TOTAL: ${formatCLP(venta.total)}
Pago: ${venta.metodo_pago}
================================
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-sm text-slate-900">
              Venta Exitosa • Folio #{venta.numero_folio}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Opciones de Ancho */}
        <div className="px-6 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-600">Ancho Térmico:</span>
          <div className="flex rounded border border-slate-300 bg-white p-0.5">
            <button
              onClick={() => setPaperWidth("80mm")}
              className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                paperWidth === "80mm"
                  ? "bg-[#3a4d6b] text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              80 mm
            </button>
            <button
              onClick={() => setPaperWidth("58mm")}
              className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                paperWidth === "58mm"
                  ? "bg-[#3a4d6b] text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              58 mm
            </button>
          </div>
        </div>

        {/* Vista Previa del Ticket */}
        <div className="p-6 overflow-y-auto bg-slate-100 flex justify-center">
          <div
            id="ticket-termico"
            className={`bg-white text-black p-4 rounded shadow-sm font-mono text-[12px] leading-tight ${
              paperWidth === "80mm" ? "w-[280px]" : "w-[210px] text-[11px]"
            }`}
          >
            <div className="text-center pb-3 border-b border-dashed border-gray-400 mb-3">
              <h2 className="font-bold text-sm tracking-tight text-gray-900 uppercase">
                {empresa?.nombre || "Mi Negocio Comercial"}
              </h2>
              <p className="text-[11px] text-gray-600">
                RUT: {empresa?.rut_identificador || "76.123.456-7"}
              </p>
              <p className="text-[11px] text-gray-600">
                {empresa?.direccion || "Calle Comercial 123"}
              </p>
            </div>

            <div className="mb-3 text-[11px] text-gray-700 space-y-0.5">
              <div className="flex justify-between font-bold text-gray-900">
                <span>BOLETA ELECTRÓNICA:</span>
                <span>N° {venta.numero_folio}</span>
              </div>
              <div className="flex justify-between">
                <span>Fecha:</span>
                <span>{formatDateTime(venta.fecha_venta)}</span>
              </div>
              <div className="flex justify-between">
                <span>Cliente:</span>
                <span className="truncate max-w-[130px]">
                  {cliente?.nombre || venta.cliente_nombre || "Consumidor Final"}
                </span>
              </div>
            </div>

            <div className="border-t border-b border-dashed border-gray-400 py-2 my-2 space-y-1">
              <div className="flex justify-between font-bold text-[11px] text-gray-800">
                <span>CANT / ARTÍCULO</span>
                <span>TOTAL</span>
              </div>
              {items.map((it, idx) => (
                <div key={idx} className="flex justify-between items-start text-[11px]">
                  <div className="pr-2 leading-tight">
                    <span className="font-semibold">{it.cantidad}x</span> {it.nombre}
                  </div>
                  <span className="font-semibold whitespace-nowrap">
                    {formatCLP(it.subtotal)}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-1 pt-1 text-[11px]">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <span>{formatCLP(venta.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>IVA (19%):</span>
                <span>{formatCLP(venta.impuesto)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-gray-900 border-t border-gray-300 pt-1 mt-1">
                <span>TOTAL:</span>
                <span>{formatCLP(venta.total)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-gray-700 pt-0.5">
                <span>Pago:</span>
                <span className="font-semibold uppercase">{venta.metodo_pago}</span>
              </div>
            </div>

            <div className="text-center pt-3 mt-3 border-t border-dashed border-gray-400 text-[10px] text-gray-500">
              <p className="font-bold uppercase">¡Gracias por su preferencia!</p>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
          <button
            onClick={handleCopyText}
            className="px-3 py-1.5 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-medium"
          >
            {copied ? "¡Copiado!" : "Copiar Texto"}
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded bg-white border border-slate-300 text-slate-700 text-xs font-medium"
            >
              Cerrar
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1 px-4 py-1.5 rounded bg-[#3a4d6b] hover:bg-slate-700 text-white text-xs font-bold shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
