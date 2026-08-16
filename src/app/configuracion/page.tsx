"use client";

import React, { useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  UploadCloud,
  FileSpreadsheet,
  Trash2,
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Download,
} from "lucide-react";
import { useErp } from "@/context/erp-context";
import { formatCLP } from "@/lib/utils";
import type { Producto } from "@/types/erp";

export default function ConfiguracionPage() {
  const {
    productos,
    ventas,
    movimientos,
    categorias,
    agregarProductosLote,
    vaciarCatalogo,
    recargarDatos,
  } = useErp();

  const [isImporting, setIsImporting] = useState(false);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [parsedPreview, setParsedPreview] = useState<Partial<Producto>[]>([]);

  const [isPurging, setIsPurging] = useState(false);
  const [purgeConfirmText, setPurgeConfirmText] = useState("");
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportSuccessMessage(null);
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith(".csv")) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          processRawData(results.data);
        },
        error: (err) => {
          setImportError(`Error al leer archivo CSV: ${err.message}`);
        },
      });
    } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = evt.target?.result;
          const workbook = XLSX.read(data, { type: "binary" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(worksheet);
          processRawData(json);
        } catch (err: any) {
          setImportError(`Error al procesar archivo Excel: ${err.message}`);
        }
      };
      reader.readAsBinaryString(file);
    } else {
      setImportError("Formato de archivo no soportado. Sube un archivo .csv o .xlsx");
    }
  };

  const processRawData = (rows: any[]) => {
    const items: Partial<Producto>[] = rows
      .map((row) => {
        const nombre =
          row.nombre ||
          row.Nombre ||
          row.NOMBRE ||
          row.descripcion ||
          row.producto ||
          row.Producto;
        if (!nombre || !nombre.trim()) return null;

        const sku = Number(row.sku || row.SKU || row.codigo || 0) || undefined;
        const codigo_barras = (
          row.codigo_barras ||
          row.barcode ||
          row.Barcode ||
          row.EAN ||
          row.ean ||
          ""
        ).toString();
        const precio_compra = Number(
          row.precio_compra || row.costo || row.Costo || row.PrecioCompra || 0
        );
        const precio_venta = Number(
          row.precio_venta || row.precio || row.Precio || row.PrecioVenta || 0
        );
        const stock_actual = Number(
          row.stock_actual || row.stock || row.Stock || row.cantidad || 0
        );
        const stock_minimo = Number(row.stock_minimo || row.minimo || 5);
        const categoria_nombre = row.categoria || row.Categoria || row.departamento || "";

        const catFound = categorias.find(
          (c) => c.nombre.toLowerCase() === categoria_nombre.toLowerCase()
        );

        return {
          nombre: nombre.trim(),
          sku,
          codigo_barras: codigo_barras.trim() || undefined,
          precio_compra,
          precio_venta,
          stock_actual,
          stock_minimo,
          categoria_id: catFound?.id || categorias[0]?.id || undefined,
          unidad_medida: "unidad",
        };
      })
      .filter(Boolean) as Partial<Producto>[];

    if (items.length === 0) {
      setImportError("No se encontraron registros de productos válidos en el archivo.");
      setParsedPreview([]);
    } else {
      setParsedPreview(items);
    }
  };

  const handleExecuteImport = async () => {
    if (parsedPreview.length === 0) return;
    setIsImporting(true);
    setImportError(null);

    const res = await agregarProductosLote(parsedPreview);
    setIsImporting(false);

    if (res.success) {
      setImportSuccessMessage(
        `¡Éxito! Se importaron ${res.count || parsedPreview.length} productos a Turso Database.`
      );
      setParsedPreview([]);
    } else {
      setImportError(res.error || "Error al procesar la importación masiva.");
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        nombre: "Arroz Grano Largo 1kg",
        sku: 1001,
        codigo_barras: "7801234567891",
        categoria: "Abarrotes Generales",
        precio_compra: 950,
        precio_venta: 1490,
        stock_actual: 48,
        stock_minimo: 10,
      },
      {
        nombre: "Bebida Cola 1.5L",
        sku: 1002,
        codigo_barras: "7801234567892",
        categoria: "Bebidas y Líquidos",
        precio_compra: 1100,
        precio_venta: 1850,
        stock_actual: 36,
        stock_minimo: 12,
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Plantilla_Productos");
    XLSX.writeFile(workbook, "plantilla_importacion_productos.xlsx");
  };

  const loadDemoCatalog = async () => {
    const demoItems: Partial<Producto>[] = [
      {
        nombre: "Panta de ralbs",
        sku: 1001,
        codigo_barras: "70000000001",
        categoria_id: categorias[0]?.id,
        precio_compra: 1350,
        precio_venta: 2350,
        stock_actual: 45,
        stock_minimo: 5,
      },
      {
        nombre: "Canta de bando numario",
        sku: 1002,
        codigo_barras: "76.123.456-7",
        categoria_id: categorias[0]?.id,
        precio_compra: 1250,
        precio_venta: 3500,
        stock_actual: 30,
        stock_minimo: 5,
      },
      {
        nombre: "Canta de parallejo material",
        sku: 1003,
        codigo_barras: "76.123.456-7",
        categoria_id: categorias[0]?.id,
        precio_compra: 1100,
        precio_venta: 2500,
        stock_actual: 25,
        stock_minimo: 5,
      },
      {
        nombre: "Hanta de ralbs",
        sku: 1004,
        codigo_barras: "70000000001",
        categoria_id: categorias[0]?.id,
        precio_compra: 950,
        precio_venta: 1250,
        stock_actual: 25,
        stock_minimo: 5,
      },
      {
        nombre: "Hanta de paraleno material",
        sku: 1005,
        codigo_barras: "76.123.456-7",
        categoria_id: categorias[0]?.id,
        precio_compra: 750,
        precio_venta: 1250,
        stock_actual: 20,
        stock_minimo: 5,
      },
    ];

    setIsImporting(true);
    await agregarProductosLote(demoItems);
    setIsImporting(false);
    setImportSuccessMessage("¡Catálogo demo cargado con éxito!");
  };

  const handlePurgeCatalog = async () => {
    if (purgeConfirmText !== "CONFIRMAR") return;
    setIsPurging(true);
    await vaciarCatalogo();
    setIsPurging(false);
    setIsPurgeModalOpen(false);
    setPurgeConfirmText("");
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Configuración & Migración
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Importación masiva CSV/Excel, diagnóstico de Turso Database y mantenimiento.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PANEL IZQUIERDO: IMPORTADOR */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <UploadCloud className="w-5 h-5 text-[#3a4d6b]" />
                <h2 className="font-bold text-sm text-slate-900">Importador Masivo de Catálogo</h2>
              </div>
              <button
                onClick={downloadTemplate}
                className="text-xs text-[#3a4d6b] hover:underline font-semibold flex items-center space-x-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar Plantilla Excel</span>
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Carga miles de productos desde un archivo CSV o Excel (.xlsx). El sistema los guardará
              en lotes de 100 registros en Turso.
            </p>

            {/* Zona de Drop */}
            <div className="border-2 border-dashed border-slate-300 hover:border-slate-500 rounded-lg p-8 text-center bg-slate-50/50 transition-colors relative">
              <input
                type="file"
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-800">
                Arrastra tu archivo aquí o haz clic para seleccionarlo
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Soporta .CSV y .XLSX</p>
            </div>

            {/* Mensajes */}
            {importSuccessMessage && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                <span>{importSuccessMessage}</span>
              </div>
            )}

            {importError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                <span>{importError}</span>
              </div>
            )}

            {/* Vista Previa */}
            {parsedPreview.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">
                    Vista Previa: {parsedPreview.length} productos detectados
                  </span>
                  <button
                    onClick={() => setParsedPreview([])}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    Descartar
                  </button>
                </div>

                <div className="max-h-40 overflow-y-auto bg-slate-50 rounded border border-slate-200 p-2 text-xs divide-y divide-slate-200 font-mono">
                  {parsedPreview.slice(0, 4).map((p, idx) => (
                    <div key={idx} className="py-1 flex justify-between">
                      <span className="text-slate-800 truncate max-w-[180px]">{p.nombre}</span>
                      <span className="text-slate-600">SKU: {p.sku || "Auto"}</span>
                      <span className="text-slate-900 font-semibold">{formatCLP(p.precio_venta || 0)}</span>
                    </div>
                  ))}
                </div>

                <button
                  disabled={isImporting}
                  onClick={handleExecuteImport}
                  className="w-full py-2.5 rounded-lg bg-[#3a4d6b] hover:bg-slate-700 text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>
                    {isImporting
                      ? "Importando a Turso..."
                      : `Confirmar e Importar ${parsedPreview.length} Productos`}
                  </span>
                </button>
              </div>
            )}

            {productos.length === 0 && (
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-xs text-slate-800">¿Quieres cargar productos de prueba?</h4>
                  <p className="text-[11px] text-slate-500">
                    Carga un catálogo inicial listo para probar el POS.
                  </p>
                </div>
                <button
                  disabled={isImporting}
                  onClick={loadDemoCatalog}
                  className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold shadow-2xs whitespace-nowrap"
                >
                  Cargar Demo
                </button>
              </div>
            )}
          </div>
        </div>

        {/* PANEL DERECHO: DIAGNÓSTICO */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-3">
            <div className="flex items-center space-x-2 text-slate-900 font-bold pb-2 border-b border-slate-100">
              <Database className="w-4 h-4 text-slate-700" />
              <h2>Turso LibSQL Database</h2>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Estado:</span>
                <span className="font-bold text-emerald-700">En Línea (ACID)</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Cuota Gratuita:</span>
                <span className="font-bold text-slate-800">5.00 GB</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>SKUs Catálogo:</span>
                <span className="font-bold text-slate-800">{productos.length}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Ventas Emitidas:</span>
                <span className="font-bold text-slate-800">{ventas.length}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Registros Kardex:</span>
                <span className="font-bold text-slate-800">{movimientos.length}</span>
              </div>
            </div>

            <button
              onClick={() => recargarDatos()}
              className="w-full py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
            >
              <RefreshCw className="w-3 h-3 text-slate-600" />
              <span>Verificar Sincronización</span>
            </button>
          </div>

          {/* Vaciar Catálogo */}
          <div className="bg-white border border-rose-200 rounded-lg p-5 shadow-xs space-y-2">
            <div className="flex items-center space-x-2 text-rose-700 font-bold pb-1 border-b border-rose-100">
              <Trash2 className="w-4 h-4" />
              <h2>Mantenimiento</h2>
            </div>
            <p className="text-xs text-slate-600">
              Borra productos y ventas de prueba para iniciar en blanco.
            </p>
            <button
              onClick={() => setIsPurgeModalOpen(true)}
              className="w-full py-1.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors"
            >
              Vaciar Catálogo de Prueba
            </button>
          </div>
        </div>
      </div>

      {/* Modal Purga */}
      {isPurgeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-lg p-6 space-y-4 shadow-xl">
            <h3 className="font-bold text-sm text-slate-900">¿Estás seguro de vaciar el catálogo?</h3>
            <p className="text-xs text-slate-600">
              Esta acción borrará los productos, ventas y movimientos de inventario.
            </p>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Escribe <span className="font-bold font-mono text-rose-600">CONFIRMAR</span>:
              </label>
              <input
                type="text"
                value={purgeConfirmText}
                onChange={(e) => setPurgeConfirmText(e.target.value)}
                placeholder="CONFIRMAR"
                className="w-full bg-white border border-slate-300 text-slate-900 font-mono rounded px-3 py-1.5 text-xs focus:ring-1 focus:ring-slate-500 focus:outline-none"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setIsPurgeModalOpen(false)}
                className="px-3.5 py-1.5 rounded bg-white border border-slate-300 text-slate-700 text-xs"
              >
                Cancelar
              </button>
              <button
                disabled={purgeConfirmText !== "CONFIRMAR" || isPurging}
                onClick={handlePurgeCatalog}
                className="px-4 py-1.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-40"
              >
                {isPurging ? "Vaciando..." : "Sí, Vaciar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
