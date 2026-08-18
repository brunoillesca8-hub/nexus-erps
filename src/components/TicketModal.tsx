"use client";

import React, { useState } from "react";
import { X, Printer, CheckCircle2, Copy, Send, Sparkles } from "lucide-react";
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
    descuento_unitario?: number;
    motivo_descuento?: string;
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
  const [isEmittingDTE, setIsEmittingDTE] = useState(false);
  const [dteFeedback, setDteFeedback] = useState<string | null>(null);

  if (!isOpen || !venta) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleEmitirDTE = async () => {
    setIsEmittingDTE(true);
    setDteFeedback(null);
    try {
      const res = await fetch("/api/dte/emitir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venta_id: venta.id,
          tipo_dte: 39,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDteFeedback(`✅ ${data.mensaje}`);
        venta.folio_dte = data.folio_dte;
        venta.tipo_dte = data.tipo_dte;
        venta.estado_sii = "ACEPTADO";
      } else {
        setDteFeedback(`⚠️ Error: ${data.error || "No se pudo emitir DTE"}`);
      }
    } catch (err: any) {
      setDteFeedback(`⚠️ Error de red: ${err.message}`);
    } finally {
      setIsEmittingDTE(false);
    }
  };

  const handleCopyText = () => {
    const text = `
================================
${empresa?.nombre || "NEXUS ERP"}
RUT: ${empresa?.rut_identificador || "76.123.456-7"}
BOLETA ELECTRÓNICA N° ${venta.folio_dte || venta.numero_folio}
Fecha: ${formatDateTime(venta.fecha_venta)}
--------------------------------
${items
  .map((it) => {
    const descText = it.descuento_unitario && it.descuento_unitario > 0
      ? ` (${it.motivo_descuento || `-$${it.descuento_unitario}`})`
      : "";
    return `${it.cantidad}x ${it.nombre}${descText}\n  ${formatCLP(it.precio_unitario - (it.descuento_unitario || 0))} = ${formatCLP(it.subtotal)}`;
  })
  .join("\n")}
--------------------------------
Subtotal: ${formatCLP(venta.subtotal)}
IVA (19%): ${formatCLP(venta.impuesto)}
TOTAL: ${formatCLP(venta.total)}
Pago: ${venta.metodo_pago}
--------------------------------
Timbre Electrónico SII
Res. N° 80 de 2014
Verifique documento en www.sii.cl
================================
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isDTEEmitido = venta.estado_sii === "ACEPTADO" || !!venta.folio_dte;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-sm text-slate-900">
              Venta Registrada • Folio #{venta.folio_dte || venta.numero_folio}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Opciones de Ancho y Feedback DTE */}
        <div className="px-6 py-2 bg-slate-50 border-b border-slate-200 flex flex-col gap-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 font-bold">Ancho Térmico:</span>
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

          {dteFeedback && (
            <div className="p-2 rounded bg-emerald-50 border border-emerald-300 text-emerald-900 text-[11px] font-bold">
              {dteFeedback}
            </div>
          )}
        </div>

        {/* Vista Previa del Ticket */}
        <div className="p-6 overflow-y-auto bg-slate-100 flex justify-center">
          <div
            id="ticket-termico"
            className={`bg-white text-black p-4 rounded shadow-sm font-mono text-[12px] leading-tight ${
              paperWidth === "80mm" ? "w-[280px]" : "w-[210px] text-[11px]"
            }`}
          >
            {/* Encabezado Oficial */}
            <div className="text-center pb-3 border-b border-dashed border-gray-400 mb-3">
              <div className="border-2 border-red-700 py-1 px-2 mb-2 inline-block rounded">
                <span className="text-red-700 font-bold text-[11px] block uppercase">
                  R.U.T.: {empresa?.rut_identificador || "76.123.456-7"}
                </span>
                <span className="text-red-700 font-extrabold text-[12px] block uppercase">
                  BOLETA ELECTRÓNICA
                </span>
                <span className="text-red-700 font-bold text-[12px] block">
                  N° {venta.folio_dte || venta.numero_folio}
                </span>
              </div>

              <h2 className="font-bold text-xs tracking-tight text-gray-900 uppercase">
                {empresa?.nombre || "Panadería y Pastelería Artesanal"}
              </h2>
              <p className="text-[10px] text-gray-600">
                Giro: Pastelería, Panadería y Cafetería
              </p>
              <p className="text-[10px] text-gray-600">
                {empresa?.direccion || "Calle Comercial 123, Valdivia"}
              </p>
              <p className="text-[10px] text-gray-600">
                S.I.I. - Unidad Valdivia
              </p>
            </div>

            <div className="mb-3 text-[11px] text-gray-700 space-y-0.5">
              <div className="flex justify-between">
                <span>Fecha Emisión:</span>
                <span>{formatDateTime(venta.fecha_venta)}</span>
              </div>
              <div className="flex justify-between">
                <span>Receptor:</span>
                <span className="truncate max-w-[130px]">
                  {cliente?.nombre || venta.cliente_nombre || "Consumidor Final"}
                </span>
              </div>
            </div>

            <div className="border-t border-b border-dashed border-gray-400 py-2 my-2 space-y-1.5">
              <div className="flex justify-between font-bold text-[11px] text-gray-800">
                <span>CANT / DETALLE</span>
                <span>TOTAL</span>
              </div>
              {items.map((it, idx) => (
                <div key={idx} className="space-y-0.5 text-[11px]">
                  <div className="flex justify-between items-start">
                    <div className="pr-2 leading-tight">
                      <span className="font-semibold">{it.cantidad}x</span> {it.nombre}
                    </div>
                    <span className="font-semibold whitespace-nowrap">
                      {formatCLP(it.subtotal)}
                    </span>
                  </div>
                  {it.descuento_unitario && it.descuento_unitario > 0 ? (
                    <div className="text-[10px] text-emerald-700 pl-4 font-sans font-semibold">
                      {it.motivo_descuento || `Desc: -${formatCLP(it.descuento_unitario)} c/u`}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="space-y-1 pt-1 text-[11px]">
              <div className="flex justify-between text-gray-600">
                <span>Neto:</span>
                <span>{formatCLP(Math.round(venta.total / 1.19))}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>IVA (19%):</span>
                <span>{formatCLP(venta.impuesto || Math.round((venta.total * 19) / 119))}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-gray-900 border-t border-gray-300 pt-1 mt-1">
                <span>TOTAL:</span>
                <span>{formatCLP(venta.total)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-gray-700 pt-0.5">
                <span>Medio de Pago:</span>
                <span className="font-semibold uppercase">{venta.metodo_pago}</span>
              </div>
            </div>

            {/* TIMBRE ELECTRÓNICO OFICIAL SII (PDF417) */}
            <div className="mt-4 pt-3 border-t border-dashed border-gray-400 text-center space-y-1.5">
              <div className="border border-slate-400 p-1.5 bg-slate-50 inline-block rounded">
                {/* Simulación visual del Timbre de Barras 2D PDF417 */}
                <div className="w-44 h-12 bg-slate-900 mx-auto flex items-center justify-center text-white text-[8px] tracking-widest font-mono p-1 overflow-hidden opacity-90">
                  ||| | || |||| | | ||| || ||| | |||| || || | ||| |||| | ||| | || |||| | | ||| || ||| | |||| ||
                </div>
              </div>
              <p className="text-[9px] font-bold text-gray-800 leading-tight">
                Timbre Electrónico SII
              </p>
              <p className="text-[8px] text-gray-500 leading-none">
                Res. N° 80 de 2014 - Verifique documento: www.sii.cl
              </p>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-1.5">
            <button
              onClick={handleCopyText}
              className="px-3 py-1.5 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-medium"
            >
              {copied ? "¡Copiado!" : "Copiar"}
            </button>

            {!isDTEEmitido && (
              <button
                type="button"
                disabled={isEmittingDTE}
                onClick={handleEmitirDTE}
                className="flex items-center space-x-1 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs disabled:opacity-50"
              >
                <Send className="w-3 h-3" />
                <span>{isEmittingDTE ? "Emitiendo..." : "Emitir al SII"}</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded bg-white border border-slate-300 text-slate-700 text-xs font-medium"
            >
              Cerrar
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1 px-4 py-1.5 rounded bg-[#3a4d6b] hover:bg-slate-700 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Boleta</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
