"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, Package, CheckCircle2, ArrowRight } from "lucide-react";
import { useErp } from "@/context/erp-context";
import { formatCLP } from "@/lib/utils";
import type { Producto } from "@/types/erp";

interface ModalReponerStockProps {
  isOpen: boolean;
  onClose: () => void;
  producto: Producto | null;
  onOpenEditFull?: (prod: Producto) => void;
}

export default function ModalReponerStock({
  isOpen,
  onClose,
  producto,
  onOpenEditFull,
}: ModalReponerStockProps) {
  const { ajustarStock } = useErp();
  const [cantidadSumar, setCantidadSumar] = useState<number>(10);
  const [motivo, setMotivo] = useState<string>("Entrada por reposición");
  const [fechaElaboracion, setFechaElaboracion] = useState<string>(new Date().toISOString().slice(0, 10));
  const [fechaVencimiento, setFechaVencimiento] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isPasteleria =
    producto?.categoria_id === "cat_pasteleria" ||
    producto?.categoria_nombre?.toLowerCase().includes("pastel");

  useEffect(() => {
    if (isOpen && producto) {
      setCantidadSumar(10);
      setMotivo(isPasteleria ? "Nueva elaboración fresca del día" : "Entrada por reposición");
      setFechaElaboracion(new Date().toISOString().slice(0, 10));
      setFechaVencimiento(producto.fecha_vencimiento || "");
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, producto, isPasteleria]);

  if (!isOpen || !producto) return null;

  const stockActual = Number(producto.stock_actual) || 0;
  const stockResultante = stockActual + Number(cantidadSumar || 0);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cantidadSumar <= 0) {
      setError("Ingresa una cantidad mayor a 0 para reponer.");
      return;
    }

    setIsSaving(true);
    setError(null);

    const res = await ajustarStock(
      producto.id,
      Number(cantidadSumar),
      motivo.trim() || (isPasteleria ? "Nueva elaboración fresca" : "Entrada por reposición"),
      "ENTRADA_COMPRA",
      undefined,
      undefined,
      fechaElaboracion,
      fechaVencimiento || undefined,
      isPasteleria
    );

    setIsSaving(false);

    if (res.success) {
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      setError(res.error || "Error al actualizar el stock.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-2 text-slate-900">
            <Package className="w-4 h-4 text-[#3a4d6b]" />
            <h3 className="font-bold text-sm">Reponer Stock / Entrada Rápida</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h4 className="font-bold text-base text-slate-900">¡Stock Actualizado!</h4>
            <p className="text-xs text-slate-600">
              Se agregaron <span className="font-bold">+{cantidadSumar} unidades</span> a{" "}
              <span className="font-semibold">{producto.nombre}</span>.
            </p>
            <p className="text-xs font-mono font-bold text-emerald-700">
              Nuevo Stock: {stockResultante} u.
            </p>
          </div>
        ) : (
          <form onSubmit={handleConfirm} className="p-5 space-y-4">
            {/* Tarjeta Resumen Producto */}
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                <span className="font-bold text-slate-700">
                  {producto.codigo_barras || producto.sku}
                </span>
                <span className="text-[11px] bg-slate-200 px-1.5 py-0.5 rounded font-sans text-slate-700 font-semibold">
                  {producto.categoria_nombre || "General"}
                </span>
              </div>
              <h4 className="font-bold text-slate-900 text-sm leading-snug">
                {producto.nombre}
              </h4>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                <span className="text-slate-500">
                  Precio: <b className="text-slate-800 font-mono">{formatCLP(producto.precio_venta)}</b>
                </span>
                <span className="text-slate-500">
                  Stock actual:{" "}
                  <b
                    className={`font-mono ${
                      stockActual <= producto.stock_minimo ? "text-amber-700" : "text-slate-800"
                    }`}
                  >
                    {stockActual} u.
                  </b>
                </span>
              </div>
            </div>

            {error && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {error}
              </div>
            )}

            {/* Selector de Unidades a Reponer */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Cantidad a incorporar (+):</span>
                <span className="text-emerald-700 font-mono font-semibold">
                  Stock final: {stockResultante} u.
                </span>
              </label>

              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="1"
                  required
                  value={cantidadSumar}
                  onChange={(e) => setCantidadSumar(Math.max(1, Number(e.target.value)))}
                  className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:ring-1 focus:ring-slate-500 focus:outline-none"
                />
              </div>

              {/* Botones de incremento rápido */}
              <div className="grid grid-cols-5 gap-1.5 pt-1">
                {[5, 10, 20, 50, 100].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setCantidadSumar(num)}
                    className={`py-1.5 rounded-md text-xs font-bold font-mono transition-colors border ${
                      cantidadSumar === num
                        ? "bg-[#3a4d6b] text-white border-[#3a4d6b]"
                        : "bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200"
                    }`}
                  >
                    +{num}
                  </button>
                ))}
              </div>
            </div>

            {/* Motivo */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600">
                Motivo del Movimiento / Factura de Proveedor
              </label>
              <input
                type="text"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej: Factura #1042 / Reposición semanal"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:ring-1 focus:ring-slate-500 focus:outline-none"
              />
            </div>

            {/* Footer Acciones */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              {onOpenEditFull && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenEditFull(producto);
                  }}
                  className="text-xs text-[#3a4d6b] hover:underline font-semibold flex items-center space-x-1"
                >
                  <span>Editar datos completos</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}

              <div className="flex items-center space-x-2 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-lg bg-[#3a4d6b] hover:bg-slate-700 text-white text-xs font-bold shadow-xs disabled:opacity-50 flex items-center space-x-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isSaving ? "Guardando..." : `Sumar +${cantidadSumar} u.`}</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
