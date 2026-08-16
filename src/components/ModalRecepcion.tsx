"use client";

import React, { useState } from "react";
import { X, PlusCircle, PackageCheck, AlertCircle } from "lucide-react";
import { useErp } from "@/context/erp-context";
import { formatCLP } from "@/lib/utils";
import type { Producto } from "@/types/erp";

interface ModalRecepcionProps {
  isOpen: boolean;
  onClose: () => void;
  producto: Producto | null;
}

export default function ModalRecepcion({ isOpen, onClose, producto }: ModalRecepcionProps) {
  const { ajustarStock } = useErp();
  const [cantidad, setCantidad] = useState<number>(12);
  const [motivo, setMotivo] = useState<string>("Recepción de mercadería de proveedor");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !producto) return null;

  const quickAdds = [6, 12, 24, 48, 100];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cantidad || cantidad <= 0) {
      setError("Ingresa una cantidad válida a recepcionar.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const res = await ajustarStock(
      producto.id,
      Number(cantidad),
      motivo || "Recepción de mercadería",
      "ENTRADA_COMPRA"
    );

    setIsSubmitting(false);

    if (res.success) {
      onClose();
    } else {
      setError(res.error || "Error al actualizar stock");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-2 text-slate-800">
            <PackageCheck className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-sm">Recepción Rápida de Stock</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Producto info */}
        <div className="p-6 space-y-4">
          <div className="p-3 rounded bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono text-slate-500 font-bold">
                SKU #{producto.sku}
              </span>
              <h4 className="font-bold text-slate-900 text-xs">{producto.nombre}</h4>
              <p className="text-[11px] text-slate-500">
                Precio Venta: {formatCLP(producto.precio_venta)}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-500">Stock Actual</span>
              <p className="text-base font-bold text-slate-900">{producto.stock_actual} u.</p>
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Cantidad a Ingresar (+ Unidades) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={cantidad}
                onChange={(e) => setCantidad(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 text-slate-900 font-bold text-base rounded-lg px-3.5 py-2 focus:ring-1 focus:ring-slate-500 focus:outline-none"
              />

              <div className="flex flex-wrap gap-1.5 pt-1">
                {quickAdds.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCantidad(n)}
                    className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200"
                  >
                    +{n}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Motivo / Factura</label>
              <input
                type="text"
                placeholder="Ej: Factura Proveedor N° 4512"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="w-full bg-white border border-slate-300 text-slate-800 text-xs rounded-lg px-3 py-2 focus:ring-1 focus:ring-slate-500 focus:outline-none"
              />
            </div>

            <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 flex justify-between items-center text-xs">
              <span className="text-slate-700">Nuevo stock resultante:</span>
              <span className="font-bold text-emerald-800">
                {producto.stock_actual + Number(cantidad || 0)} unidades
              </span>
            </div>

            <div className="pt-2 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center space-x-1 px-4 py-1.5 rounded-lg bg-[#3a4d6b] hover:bg-slate-700 text-white text-xs font-bold disabled:opacity-50"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{isSubmitting ? "Ingresando..." : "Confirmar Recepción"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
