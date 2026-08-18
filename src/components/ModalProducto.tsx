"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Camera, Check } from "lucide-react";
import { useErp } from "@/context/erp-context";
import BarcodeScannerModal from "./BarcodeScannerModal";
import { useBarcodeListener } from "@/hooks/useBarcodeListener";
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
  const { productos, categorias, proveedores, guardarProducto, generarSiguienteSKU } = useErp();

  const [formData, setFormData] = useState<Partial<Producto>>({
    nombre: "",
    sku: 1001,
    codigo_barras: "",
    categoria_id: "",
    proveedor_id: "",
    precio_compra: 0,
    precio_venta: 0,
    stock_actual: 10,
    stock_minimo: 5,
    unidad_medida: "unidad",
    imagen_url: "",
    fecha_elaboracion: new Date().toISOString().slice(0, 10),
    fecha_vencimiento: "",
  });

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingFoundMsg, setExistingFoundMsg] = useState<string | null>(null);

  // Función para autocompletar si el código de barras o SKU ya existe en la base de datos
  const tryAutoFillExisting = (queryBarcodeOrSku: string) => {
    const raw = queryBarcodeOrSku.trim();
    if (!raw) return;

    const noLeadingZeros = raw.replace(/^0+/, "");
    const found = productos.find((p) => {
      const pBarcode = (p.codigo_barras || "").trim();
      const pSku = (p.sku || "").toString().trim();
      return (
        pBarcode === raw ||
        (pBarcode && pBarcode === noLeadingZeros) ||
        pSku === raw
      );
    });

    if (found) {
      setFormData((prev) => ({
        ...prev,
        id: found.id,
        nombre: found.nombre,
        sku: found.sku,
        codigo_barras: found.codigo_barras || raw,
        categoria_id: found.categoria_id || "",
        proveedor_id: found.proveedor_id || "",
        precio_compra: found.precio_compra,
        precio_venta: found.precio_venta,
        stock_actual: found.stock_actual,
        stock_minimo: found.stock_minimo,
        unidad_medida: found.unidad_medida,
        imagen_url: found.imagen_url || "",
        fecha_elaboracion: new Date().toISOString().slice(0, 10),
        fecha_vencimiento: found.fecha_vencimiento || "",
      }));
      setExistingFoundMsg(
        `✨ Producto existente detectado: "${found.nombre}" (SKU #${found.sku}). Datos autocompletados. Solo modifica la cantidad y la fecha de vencimiento.`
      );
    }
  };

  // Bandera para evitar re-inicializaciones accidentales que borren los datos ingresados
  const prevIsOpenRef = useRef(false);

  useEffect(() => {
    // Solo inicializar cuando el modal pasa de cerrado a abierto
    if (isOpen && !prevIsOpenRef.current) {
      setExistingFoundMsg(null);
      if (productoEditar) {
        setFormData({ ...productoEditar });
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
            fecha_elaboracion: new Date().toISOString().slice(0, 10),
            fecha_vencimiento: "",
          });

          if (initialBarcode) {
            tryAutoFillExisting(initialBarcode);
          }
        });
      }
      setError(null);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, productoEditar, initialBarcode, categorias, proveedores, generarSiguienteSKU]);

  // Si el usuario escanea con pistola láser o app Wi-Fi mientras llena el formulario, asignar y autocompletar
  useBarcodeListener({
    onScan: (scannedCode) => {
      const clean = scannedCode.replace(/[\u0000-\u001F\u007F-\u009F]/g, "").trim();
      if (clean) {
        setFormData((prev) => ({ ...prev, codigo_barras: clean }));
        tryAutoFillExisting(clean);
      }
    },
    enabled: isOpen && !isScannerOpen,
  });

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
      nombre: formData.nombre.trim(),
      sku: Number(formData.sku),
      codigo_barras: (formData.codigo_barras || "").trim(),
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
        <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50">
            <h3 className="font-bold text-sm text-slate-900">
              {productoEditar ? "Editar Producto" : "Nuevo Producto al Catálogo"}
            </h3>
            <button
              onClick={onClose}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
            {existingFoundMsg && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold animate-fadeIn">
                {existingFoundMsg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Nombre */}
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Nombre del Producto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Arroz Grano Largo 1kg"
                  value={formData.nombre || ""}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs sm:text-sm focus:bg-white focus:ring-1 focus:ring-slate-500 focus:outline-none"
                />
              </div>

              {/* Código de Barras */}
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Código de Barras (EAN-13 / UPC / QR)
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    placeholder="Ej: 780000000004 o escanea con la cámara / pistola"
                    value={formData.codigo_barras || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({ ...formData, codigo_barras: val });
                      tryAutoFillExisting(val);
                    }}
                    onBlur={(e) => tryAutoFillExisting(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-mono rounded-lg pl-3 pr-10 py-2 text-xs sm:text-sm focus:bg-white focus:ring-1 focus:ring-slate-500 focus:outline-none font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setIsScannerOpen(true)}
                    className="absolute right-1.5 p-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded text-slate-700 transition-colors flex items-center justify-center shadow-2xs"
                    title="Escanear con Cámara"
                  >
                    <Camera className="w-3.5 h-3.5 text-[#3a4d6b]" />
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  Puedes escribirlo, escanearlo con la cámara o disparar tu lector físico.
                </p>
              </div>

              {/* SKU */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">SKU / Correlativo</label>
                <input
                  type="number"
                  required
                  value={formData.sku || ""}
                  onChange={(e) => setFormData({ ...formData, sku: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-mono rounded-lg px-3 py-1.5 text-xs focus:bg-white focus:ring-1 focus:ring-slate-500 focus:outline-none"
                />
              </div>

              {/* Categoría */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Categoría</label>
                <select
                  value={formData.categoria_id || ""}
                  onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-3 py-1.5 text-xs focus:bg-white focus:ring-1 focus:ring-slate-500 focus:outline-none"
                >
                  <option value="">Sin categoría</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Precio Compra */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Costo de Compra ($ Neto)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.precio_compra ?? 0}
                  onChange={(e) =>
                    setFormData({ ...formData, precio_compra: Number(e.target.value) })
                  }
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-mono rounded-lg px-3 py-1.5 text-xs focus:bg-white focus:ring-1 focus:ring-slate-500 focus:outline-none"
                />
              </div>

              {/* Precio Venta */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700">
                    Precio de Venta ($ Inc. IVA) *
                  </label>
                  <span className="text-[11px] font-bold text-emerald-700 font-mono">
                    Margen: {margen}%
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.precio_venta ?? 0}
                  onChange={(e) =>
                    setFormData({ ...formData, precio_venta: Number(e.target.value) })
                  }
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-bold font-mono rounded-lg px-3 py-1.5 text-xs sm:text-sm focus:bg-white focus:ring-1 focus:ring-slate-500 focus:outline-none"
                />
              </div>

              {/* Stock Inicial */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Stock Inicial (u.)</label>
                <input
                  type="number"
                  value={formData.stock_actual ?? 0}
                  onChange={(e) =>
                    setFormData({ ...formData, stock_actual: Number(e.target.value) })
                  }
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-mono rounded-lg px-3 py-1.5 text-xs focus:bg-white focus:ring-1 focus:ring-slate-500 focus:outline-none"
                />
              </div>

              {/* Stock Mínimo */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Stock Mínimo (Alerta)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.stock_minimo ?? 5}
                  onChange={(e) =>
                    setFormData({ ...formData, stock_minimo: Number(e.target.value) })
                  }
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-mono rounded-lg px-3 py-1.5 text-xs focus:bg-white focus:ring-1 focus:ring-slate-500 focus:outline-none"
                />
              </div>

              {/* Fecha de Elaboración */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Fecha de Elaboración</label>
                <input
                  type="date"
                  value={formData.fecha_elaboracion || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, fecha_elaboracion: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-3 py-1.5 text-xs focus:bg-white focus:ring-1 focus:ring-slate-500 focus:outline-none"
                />
              </div>

              {/* Fecha de Vencimiento */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Fecha de Vencimiento</label>
                <input
                  type="date"
                  value={formData.fecha_vencimiento || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, fecha_vencimiento: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-3 py-1.5 text-xs focus:bg-white focus:ring-1 focus:ring-slate-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Footer Botones */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
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
                className="px-5 py-2 rounded-lg bg-[#3a4d6b] hover:bg-slate-700 text-white text-xs font-bold shadow-xs disabled:opacity-50 flex items-center space-x-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{isSaving ? "Guardando..." : "Guardar Producto"}</span>
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
        title="Escanear Código para este Producto"
      />
    </>
  );
}
