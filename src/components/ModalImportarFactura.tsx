"use client";

import React, { useState, useRef } from "react";
import {
  X,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Package,
  Plus,
  ArrowRight,
  Sparkles,
  Building2,
  Receipt,
  RotateCcw,
} from "lucide-react";
import * as XLSX from "xlsx";
import { useErp } from "@/context/erp-context";
import { formatCLP, generateUUID } from "@/lib/utils";
import type { Producto } from "@/types/erp";

interface FacturaItemParsed {
  id: string;
  nombre: string;
  codigo: string;
  cantidad: number;
  precio_compra: number;
  precio_venta: number;
  categoria_id?: string;
  matchedProducto?: Producto | null;
  isNew: boolean;
}

interface FacturaParsedData {
  folio: string;
  proveedor_nombre: string;
  proveedor_rut: string;
  fecha_emision: string;
  items: FacturaItemParsed[];
  total_neto: number;
}

interface ModalImportarFacturaProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ModalImportarFactura({
  isOpen,
  onClose,
  onSuccess,
}: ModalImportarFacturaProps) {
  const { productos, categorias, proveedores, ajustarStock, guardarProducto } = useErp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [parsedData, setParsedData] = useState<FacturaParsedData | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Parser de XML DTE estándar del SII (Chile)
  const parseChileanDteXml = (xmlText: string): FacturaParsedData => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");

    const parseError = xmlDoc.getElementsByTagName("parsererror");
    if (parseError.length > 0) {
      throw new Error("El archivo XML no tiene un formato DTE válido del SII.");
    }

    // Encabezado
    const folioEl = xmlDoc.getElementsByTagName("Folio")[0];
    const folio = folioEl?.textContent?.trim() || "S/F";

    const rzSocEl = xmlDoc.getElementsByTagName("RznSoc")[0] || xmlDoc.getElementsByTagName("RznSocEmisor")[0];
    const proveedor_nombre = rzSocEl?.textContent?.trim() || "Proveedor Comercial";

    const rutEmisorEl = xmlDoc.getElementsByTagName("RUTEmisor")[0];
    const proveedor_rut = rutEmisorEl?.textContent?.trim() || "";

    const fchEmisEl = xmlDoc.getElementsByTagName("FchEmis")[0];
    const fecha_emision = fchEmisEl?.textContent?.trim() || new Date().toISOString().slice(0, 10);

    const mntNetoEl = xmlDoc.getElementsByTagName("MntNeto")[0];
    const total_neto = Number(mntNetoEl?.textContent || 0);

    // Detalles de Ítems (<Detalle>)
    const detalleNodes = xmlDoc.getElementsByTagName("Detalle");
    const items: FacturaItemParsed[] = [];

    for (let i = 0; i < detalleNodes.length; i++) {
      const node = detalleNodes[i];

      const nmbItemEl = node.getElementsByTagName("NmbItem")[0] || node.getElementsByTagName("DscItem")[0];
      const nombre = nmbItemEl?.textContent?.trim() || `Producto Factura #${i + 1}`;

      const qtyEl = node.getElementsByTagName("QtyItem")[0];
      const cantidad = Math.max(1, Number(qtyEl?.textContent || 1));

      const prcEl = node.getElementsByTagName("PrcItem")[0];
      let precio_compra = Number(prcEl?.textContent || 0);

      // Si no viene precio unitario, calcular desde monto item
      if (precio_compra === 0) {
        const mntEl = node.getElementsByTagName("MntItem")[0];
        const mnt = Number(mntEl?.textContent || 0);
        precio_compra = cantidad > 0 ? Math.round(mnt / cantidad) : 0;
      }

      // Código de barra o código de producto
      const cdgEl = node.getElementsByTagName("VlrCodigo")[0] || node.getElementsByTagName("CdgItem")[0];
      const codigo = cdgEl?.textContent?.trim() || "";

      // Intentar vincular con producto existente en el catálogo
      const matched = productos.find((p) => {
        if (codigo && (p.codigo_barras === codigo || p.sku.toString() === codigo)) return true;
        if (p.nombre.toLowerCase() === nombre.toLowerCase()) return true;
        return false;
      });

      const precio_venta = matched
        ? matched.precio_venta
        : Math.round(precio_compra > 0 ? precio_compra * 1.35 * 1.19 : 0); // 35% margen sugerido + IVA

      items.push({
        id: generateUUID(),
        nombre: matched ? matched.nombre : nombre,
        codigo: matched ? (matched.codigo_barras || matched.sku.toString()) : codigo,
        cantidad,
        precio_compra,
        precio_venta,
        categoria_id: matched ? (matched.categoria_id || "") : (categorias[0]?.id || ""),
        matchedProducto: matched || null,
        isNew: !matched,
      });
    }

    return {
      folio,
      proveedor_nombre,
      proveedor_rut,
      fecha_emision,
      items,
      total_neto,
    };
  };

  // Parser de Excel / CSV
  const parseExcelOrCsv = async (file: File): Promise<FacturaParsedData> => {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (rows.length < 2) {
      throw new Error("El archivo Excel no contiene filas de datos válidas.");
    }

    // Encabezados
    const headers: string[] = (rows[0] || []).map((h: any) =>
      (h || "").toString().toLowerCase().trim()
    );

    const nameIdx = headers.findIndex((h) => h.includes("producto") || h.includes("nombre") || h.includes("descrip"));
    const qtyIdx = headers.findIndex((h) => h.includes("cant") || h.includes("unid") || h.includes("qty"));
    const costIdx = headers.findIndex((h) => h.includes("costo") || h.includes("compra") || h.includes("neto") || h.includes("precio"));
    const barcodeIdx = headers.findIndex((h) => h.includes("codigo") || h.includes("barra") || h.includes("sku") || h.includes("ean"));

    const items: FacturaItemParsed[] = [];

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;

      const nombre = nameIdx > -1 && row[nameIdx] ? row[nameIdx].toString().trim() : `Producto Fila ${r}`;
      if (!nombre || nombre === "-") continue;

      const cantidad = qtyIdx > -1 && Number(row[qtyIdx]) ? Number(row[qtyIdx]) : 1;
      const precio_compra = costIdx > -1 && Number(row[costIdx]) ? Number(row[costIdx]) : 0;
      const codigo = barcodeIdx > -1 && row[barcodeIdx] ? row[barcodeIdx].toString().trim() : "";

      const matched = productos.find((p) => {
        if (codigo && (p.codigo_barras === codigo || p.sku.toString() === codigo)) return true;
        if (p.nombre.toLowerCase() === nombre.toLowerCase()) return true;
        return false;
      });

      const precio_venta = matched
        ? matched.precio_venta
        : Math.round(precio_compra > 0 ? precio_compra * 1.35 * 1.19 : 0);

      items.push({
        id: generateUUID(),
        nombre: matched ? matched.nombre : nombre,
        codigo: matched ? (matched.codigo_barras || matched.sku.toString()) : codigo,
        cantidad,
        precio_compra,
        precio_venta,
        categoria_id: matched ? (matched.categoria_id || "") : (categorias[0]?.id || ""),
        matchedProducto: matched || null,
        isNew: !matched,
      });
    }

    return {
      folio: `EXC-${Math.floor(1000 + Math.random() * 9000)}`,
      proveedor_nombre: "Importación de Factura / Despacho",
      proveedor_rut: "",
      fecha_emision: new Date().toISOString().slice(0, 10),
      items,
      total_neto: items.reduce((acc, it) => acc + it.precio_compra * it.cantidad, 0),
    };
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    setFileName(file.name);
    setIsProcessing(true);

    try {
      if (file.name.endsWith(".xml")) {
        const text = await file.text();
        const parsed = parseChileanDteXml(text);
        setParsedData(parsed);
      } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls") || file.name.endsWith(".csv")) {
        const parsed = await parseExcelOrCsv(file);
        setParsedData(parsed);
      } else {
        throw new Error("Formato no soportado. Sube una Factura XML del SII o un archivo Excel/CSV.");
      }
    } catch (err: any) {
      console.error("Error al procesar factura:", err);
      setErrorMsg(err.message || "Error al leer el archivo de factura.");
      setParsedData(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateItem = (id: string, field: keyof FacturaItemParsed, value: any) => {
    if (!parsedData) return;
    setParsedData({
      ...parsedData,
      items: parsedData.items.map((it) => (it.id === id ? { ...it, [field]: value } : it)),
    });
  };

  const handleConfirmImport = async () => {
    if (!parsedData || parsedData.items.length === 0) return;

    setIsSaving(true);
    setErrorMsg(null);

    try {
      let importedCount = 0;

      for (const item of parsedData.items) {
        if (item.matchedProducto) {
          // 1. Producto ya existente: Incrementar stock en Kardex y actualizar costo de compra
          await ajustarStock(
            item.matchedProducto.id,
            item.cantidad,
            `Entrada por Factura #${parsedData.folio} (${parsedData.proveedor_nombre})`,
            "ENTRADA_COMPRA"
          );

          // Actualizar costo de compra si cambió
          if (item.precio_compra > 0 && item.precio_compra !== item.matchedProducto.precio_compra) {
            await guardarProducto({
              ...item.matchedProducto,
              precio_compra: item.precio_compra,
              precio_venta: item.precio_venta || item.matchedProducto.precio_venta,
            });
          }
          importedCount++;
        } else {
          // 2. Producto nuevo: Registrar en el catálogo con su stock inicial y costo
          const res = await guardarProducto({
            nombre: item.nombre,
            codigo_barras: item.codigo || undefined,
            precio_compra: item.precio_compra,
            precio_venta: item.precio_venta || Math.round(item.precio_compra * 1.4),
            stock_actual: item.cantidad,
            stock_minimo: 5,
            categoria_id: item.categoria_id || categorias[0]?.id,
          });

          if (res.success) {
            importedCount++;
          }
        }
      }

      setSuccessMsg(
        `¡Factura #${parsedData.folio} importada con éxito! Se incorporaron ${importedCount} productos y se actualizó el Kardex.`
      );

      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error("Error al ingresar factura al inventario:", err);
      setErrorMsg(err.message || "Error al procesar la entrada de mercadería.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-[#3a4d6b] text-white">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Lector & Importador de Facturas de Proveedores
              </h3>
              <p className="text-[11px] text-slate-500">
                Lee automáticamente XML DTE del SII o Excel para sumar stock y costos al inventario.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Zona de Carga de Archivo */}
          {!parsedData ? (
            <div className="space-y-3">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-[#3a4d6b] bg-slate-50/70 hover:bg-slate-50 rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3"
              >
                <div className="w-12 h-12 rounded-full bg-slate-200/80 flex items-center justify-center text-slate-700">
                  <Upload className="w-6 h-6 animate-bounce" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">
                    Sube la Factura Electrónica del Proveedor
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Arrastra aquí el archivo <b className="text-slate-700 font-mono">XML DTE del SII</b> o la planilla <b className="text-slate-700 font-mono">Excel (.xlsx / .csv)</b> de despacho.
                  </p>
                </div>
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg bg-[#3a4d6b] text-white text-xs font-bold shadow-xs hover:bg-slate-700 transition-colors"
                >
                  Seleccionar Archivo
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xml,.xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>

              {/* Guía explicativa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                  <div className="font-bold flex items-center space-x-1.5 text-emerald-800">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Factura XML Oficial del SII</span>
                  </div>
                  <p className="text-[11px] text-emerald-700">
                    Es el archivo que te envían tus proveedores (CCU, Soprole, Agrosuper, etc.) al correo. El sistema extrae folio, RUT, cantidades y costos exactos.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
                  <div className="font-bold flex items-center space-x-1.5 text-slate-800">
                    <FileText className="w-3.5 h-3.5 text-[#3a4d6b]" />
                    <span>Planilla Excel / CSV</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Ideal para guías de despacho o listas de compras mayoristas. Lee columnas de Producto, Cantidad, Costo y Código.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Resumen Factura Detectada */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Folio Factura</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">#{parsedData.folio}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Proveedor</span>
                  <span className="font-bold text-slate-900 truncate block">{parsedData.proveedor_nombre}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{parsedData.proveedor_rut}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Fecha Emisión</span>
                  <span className="font-bold text-slate-900">{parsedData.fecha_emision}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Ítems</span>
                  <span className="font-bold text-emerald-700">{parsedData.items.length} productos detectados</span>
                </div>
              </div>

              {/* Tabla de Productos Detectados */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-100 border-b border-slate-200 font-bold text-slate-800 sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">Estado</th>
                        <th className="py-2.5 px-3">Producto Detectado</th>
                        <th className="py-2.5 px-3 text-center">Cant. a Sumar</th>
                        <th className="py-2.5 px-3 text-right">Costo Unit. (Neto)</th>
                        <th className="py-2.5 px-3 text-right">Precio Venta (IVA Inc.)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {parsedData.items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2 px-3">
                            {item.matchedProducto ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Existente (Stock: {item.matchedProducto.stock_actual})
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                + Nuevo Producto
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-medium text-slate-900">
                            <div>{item.nombre}</div>
                            {item.codigo && (
                              <div className="text-[10px] text-slate-400 font-mono">
                                Código: {item.codigo}
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <input
                              type="number"
                              min="1"
                              value={item.cantidad}
                              onChange={(e) =>
                                handleUpdateItem(item.id, "cantidad", Math.max(1, Number(e.target.value)))
                              }
                              className="w-16 bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-center font-mono font-bold text-xs"
                            />
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-700">
                            {formatCLP(item.precio_compra)}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              min="0"
                              value={item.precio_venta}
                              onChange={(e) =>
                                handleUpdateItem(item.id, "precio_venta", Number(e.target.value))
                              }
                              className="w-24 bg-slate-50 border border-slate-300 rounded px-2 py-1 text-right font-mono font-bold text-xs text-slate-900"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2 font-bold animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          {parsedData ? (
            <button
              type="button"
              onClick={() => {
                setParsedData(null);
                setFileName("");
                setErrorMsg(null);
              }}
              className="px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 flex items-center space-x-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Cargar Otra Factura</span>
            </button>
          ) : (
            <div className="text-xs text-slate-400">
              Soporta XML DTE SII y Planillas Excel
            </div>
          )}

          <div className="flex items-center space-x-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-semibold"
            >
              Cerrar
            </button>
            {parsedData && (
              <button
                type="button"
                disabled={isSaving}
                onClick={handleConfirmImport}
                className="px-5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-colors flex items-center space-x-1.5 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSaving ? "Ingresando Stock..." : "Confirmar e Ingresar al Inventario"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
