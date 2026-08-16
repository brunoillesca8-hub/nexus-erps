"use client";

import React, { useState, useEffect } from "react";
import { X, Camera } from "lucide-react";
import { useErp } from "@/context/erp-context";
import BarcodeScannerModal from "./BarcodeScannerModal";
import type { Producto } from "@/types/erp";

interface ModalProductoProps {
  isOpen: boolean;
  onClose: () => void;
  productoEditar?: Producto | null;
  initialBarcode?: string | null;
}

export default function ModalProducto({
  isOpen,
  onClose,
  productoEditar,
  initialBarcode,
}: ModalProductoProps) {
  const { categorias, proveedores, guardarProducto, generarSiguienteSKU } = useErp();

  const [formData, setFormData] = useState<Partial<Producto>>({
    nombre: "",
    sku: 1001,
    codigo_barras: "",
    categoria_id: "",
    proveedor_id: "",
    precio_compra: 0,
    precio_venta: 0,
    stock_actual: 0,
    stock_minimo: 5,
    unidad_medida: "unidad",
    imagen_url: "",
  });

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (productoEditar) {
      setFormData({
        ...productoEditar,
      });
    } else {
      generarSiguienteSKU().then((nextSku) => {
        setFormData({
          nombre: "",
          sku: nextSku,
          codigo_barras: initialBarcode || "",
          categoria_id: categorias[0]?.id || "",
          proveedor_id: proveedores[0]?.id || "",
          precio_compra: 0,
          precio_venta: 0,
          stock_actual: 10,
          stock_minimo: 5,
          unidad_medida: "unidad",
          imagen_url: "",
        });
      });
    }
    setError(null);
  }, [isOpen, productoEditar, initialBarcode, categorias, proveedores, generarSiguienteSKU]);

  if (!isOpen) return null;

  const margen =
    Number(formData.precio_venta) > 0
      ? (
          ((Number(formData.precio_venta) - Number(formData.precio_compra)) /
            Number(formData.precio_venta)) *
          100
        ).toFixed(1)
      : "0";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre || !formData.nombre.trim()) {
      setError("El nombre del producto es obligatorio.");
      return;
    }

    setIsSaving(true);
    setError(null);

    const res = await guardarProducto({
      ...formData,
      sku: Number(formData.sku),
      precio_compra: Number(formData.precio_compra) || 0,
      precio_venta: Number(formData.precio_venta) || 0,
      stock_actual: Number(formData.stock_actual) || 0,
      stock_minimo: Number(formData.stock_minimo) || 5,
    });

    setIsSaving(false);

    if (res.success) {
      onClose();
    } else {
      setError(res.error || "Error al guardar el producto.");
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
        <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h3 className="font-bold text-sm text-slate-900">
              {productoEditar ? "Editar Producto" : "Nuevo Producto al Catálogo"}
            </h3>
            <button
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
            {error && (
              <div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nombre */}
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Nombre del Producto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Aceite de Oliva Extra Virgen 1L"
                  value={formData.nombre || ""}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-slate-500 focus:outline-none"
                />
              </div>

              {/* SKU Entero */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  SKU (Número Correlativo) *
                </label>
                <input
                  type="number"
                  required
                  value={formData.sku || ""}
                  onChange={(e) => setFormData({ ...formData, sku: Number(e.target.value) })}
                  className="w-full bg-white border border-slate-300 text-slate-900 font-mono rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-slate-500 focus:outline-none"
                />
              </div>

              {/* Código de Barras */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Código de Barras (EAN-13 / QR)
                </label>
                <div className="relative flex">
                  <input
                    type="text"
                    placeholder="Ej: 7801234567890"
                    value={formData.codigo_barras || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, codigo_barras: e.target.value })
                    }
                    className="w-full bg-white border border-slate-300 text-slate-900 font-mono rounded-lg pl-3 pr-10 py-2 text-xs focus:ring-1 focus:ring-slate-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setIsScannerOpen(true)}
                    className="absolute right-1 top-1 bottom-1 px-2 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 transition-colors flex items-center justify-center"
                    title="Escanear con Cámara"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Categoría */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Categoría</label>
                <select
                  value={formData.categoria_id || ""}
                  onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}
                  className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-slate-500 focus:outline-none"
                >
                  <option value="">Sin categoría</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Proveedor */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Proveedor</label>
                <select
                  value={formData.proveedor_id || ""}
                  onChange={(e) => setFormData({ ...formData, proveedor_id: e.target.value })}
                  className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-slate-500 focus:outline-none"
                >
                  <option value="">Sin proveedor</option>
                  {proveedores.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Precio Compra */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Costo de Compra ($ Neto)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.precio_compra || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, precio_compra: Number(e.target.value) })
                  }
                  className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-slate-500 focus:outline-none"
                />
              </div>

              {/* Precio Venta */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-slate-700">
                    Precio de Venta ($ Inc. IVA) *
                  </label>
                  <span className="text-[11px] font-semibold text-emerald-700">
                    Margen: {margen}%
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.precio_venta || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, precio_venta: Number(e.target.value) })
                  }
                  className="w-full bg-white border border-slate-300 text-slate-900 font-bold rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-slate-500 focus:outline-none"
                />
              </div>

              {/* Stock Actual */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Stock Actual (u.)</label>
                <input
                  type="number"
                  value={formData.stock_actual ?? 0}
                  onChange={(e) =>
                    setFormData({ ...formData, stock_actual: Number(e.target.value) })
                  }
                  className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-slate-500 focus:outline-none"
                />
              </div>

              {/* Stock Mínimo */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Stock Mínimo (Alerta)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.stock_minimo ?? 5}
                  onChange={(e) =>
                    setFormData({ ...formData, stock_minimo: Number(e.target.value) })
                  }
                  className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-slate-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Footer Botones */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-1.5 rounded-lg bg-[#3a4d6b] hover:bg-slate-700 text-white text-xs font-bold shadow-xs disabled:opacity-50"
              >
                {isSaving ? "Guardando..." : "Guardar Producto"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={(barcode) => {
          setFormData((prev) => ({ ...prev, codigo_barras: barcode }));
        }}
      />
    </>
  );
}
