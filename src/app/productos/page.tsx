"use client";

import React, { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Edit2,
  ClipboardList,
  Download,
  ArrowUpDown,
  ChevronDown,
  Camera,
  AlertTriangle,
  PackageX,
  CheckCircle2,
  PackagePlus,
} from "lucide-react";
import * as XLSX from "xlsx";
import { useErp } from "@/context/erp-context";
import { formatCLP, matchesSearch } from "@/lib/utils";
import ModalProducto from "@/components/ModalProducto";
import ModalReponerStock from "@/components/ModalReponerStock";
import BarcodeScannerModal from "@/components/BarcodeScannerModal";
import { useBarcodeListener } from "@/hooks/useBarcodeListener";
import type { Producto } from "@/types/erp";

export default function ProductosPage() {
  const { productos, categorias } = useErp();

  // Estados de Filtros y Orden
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoria, setSelectedCategoria] = useState("ALL");
  const [stockFilter, setStockFilter] = useState<"ALL" | "CRITICO" | "AGOTADO" | "OPTIMO">("ALL");
  const [sortBy, setSortBy] = useState<keyof Producto | "margen">("sku");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Estados de Modales
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [productoEditar, setProductoEditar] = useState<Producto | null>(null);

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [productoReponer, setProductoReponer] = useState<Producto | null>(null);
  const [isReponerModalOpen, setIsReponerModalOpen] = useState(false);
  const [scannedNotFoundCode, setScannedNotFoundCode] = useState<string | null>(null);

  // Conteo de Estados de Stock
  const stockStats = useMemo(() => {
    const criticos = productos.filter((p) => p.stock_actual <= p.stock_minimo && p.stock_actual > 0);
    const agotados = productos.filter((p) => p.stock_actual <= 0);
    const optimos = productos.filter((p) => p.stock_actual > p.stock_minimo);
    return {
      total: productos.length,
      criticos: criticos.length,
      agotados: agotados.length,
      optimos: optimos.length,
    };
  }, [productos]);

  // Handler de escaneo por cámara o pistola láser en catálogo
  const handleBarcodeScanned = useCallback(
    (scannedCode: string) => {
      const raw = scannedCode.replace(/[\u0000-\u001F\u007F-\u009F]/g, "").trim();
      if (!raw) return;

      const cleanRaw = raw;
      const noLeadingZeros = cleanRaw.replace(/^0+/, "");
      const withPrefixSKU = cleanRaw.replace(/^SKU-?/i, "");

      const found = productos.find((p) => {
        const pBarcode = (p.codigo_barras || "").trim();
        const pSku = (p.sku || "").toString().trim();

        return (
          pBarcode === cleanRaw ||
          pSku === cleanRaw ||
          (pBarcode && pBarcode === noLeadingZeros) ||
          (pBarcode && pBarcode.replace(/^0+/, "") === noLeadingZeros) ||
          pSku === withPrefixSKU ||
          `SKU-${pSku}`.toLowerCase() === cleanRaw.toLowerCase()
        );
      });

      if (found) {
        setProductoReponer(found);
        setIsReponerModalOpen(true);
      } else {
        // Ofrecer crear nuevo producto con este código
        setScannedNotFoundCode(raw);
      }
    },
    [productos]
  );

  // Listener para pistola USB y apps Wi-Fi en página de catálogo
  useBarcodeListener({
    onScan: handleBarcodeScanned,
    enabled: true,
  });

  // Filtrado y Búsqueda Predictiva Multi-palabra
  const filteredProductos = useMemo(() => {
    return productos.filter((p) => {
      // 1. Categoría
      const matchCat =
        selectedCategoria === "ALL" || p.categoria_id === selectedCategoria;

      // 2. Filtro de Stock
      let matchStock = true;
      if (stockFilter === "CRITICO") {
        matchStock = p.stock_actual <= p.stock_minimo && p.stock_actual > 0;
      } else if (stockFilter === "AGOTADO") {
        matchStock = p.stock_actual <= 0;
      } else if (stockFilter === "OPTIMO") {
        matchStock = p.stock_actual > p.stock_minimo;
      }

      // 3. Búsqueda por nombre, código de barras completo o SKU
      const matchSearch =
        matchesSearch(p.nombre, searchQuery) ||
        (p.codigo_barras && p.codigo_barras.includes(searchQuery)) ||
        p.sku.toString().includes(searchQuery);

      return matchCat && matchStock && matchSearch;
    });
  }, [productos, selectedCategoria, stockFilter, searchQuery]);

  // Ordenamiento
  const sortedProductos = useMemo(() => {
    return [...filteredProductos].sort((a, b) => {
      let valA: any;
      let valB: any;

      if (sortBy === "margen") {
        valA =
          a.precio_venta > 0
            ? ((a.precio_venta - a.precio_compra) / a.precio_venta) * 100
            : 0;
        valB =
          b.precio_venta > 0
            ? ((b.precio_venta - b.precio_compra) / b.precio_venta) * 100
            : 0;
      } else {
        valA = a[sortBy];
        valB = b[sortBy];
      }

      if (typeof valA === "string") {
        valA = valA.toLowerCase();
        valB = (valB || "").toString().toLowerCase();
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredProductos, sortBy, sortOrder]);

  // Paginación
  const totalPages = Math.ceil(sortedProductos.length / pageSize) || 1;
  const paginatedProductos = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedProductos.slice(start, start + pageSize);
  }, [sortedProductos, currentPage]);

  const handleSort = (field: keyof Producto | "margen") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  // Exportar Catálogo a Excel
  const exportToExcel = () => {
    const dataToExport = filteredProductos.map((p) => {
      const margen =
        p.precio_venta > 0
          ? (((p.precio_venta - p.precio_compra) / p.precio_venta) * 100).toFixed(1)
          : "0";

      return {
        "Código Completo": p.codigo_barras || p.sku,
        Producto: p.nombre,
        Categoría: p.categoria_nombre || "Sin Categoría",
        "P. Compra Unit. (Neto)": p.precio_compra,
        "P. Venta Unit. (Inc. IVA)": p.precio_venta,
        "Margen (%)": `${margen}%`,
        "Stock Actual": p.stock_actual,
        "Stock Mínimo": p.stock_minimo,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Catálogo");
    XLSX.writeFile(
      workbook,
      `catalogo_productos_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  return (
    <div className="space-y-4 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-lg border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Catálogo & Gestión de Productos
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {productos.length} productos registrados con código de barras en Turso Cloud.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Botón Escanear para Reponer */}
          <button
            onClick={() => setIsScannerOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-300 shadow-2xs transition-colors"
          >
            <Camera className="w-3.5 h-3.5 text-slate-600" />
            <span>Escanear para Reponer</span>
          </button>

          {/* Botón Nuevo Producto */}
          <button
            onClick={() => {
              setProductoEditar(null);
              setIsAddModalOpen(true);
            }}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-[#3a4d6b] hover:bg-slate-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo Producto</span>
          </button>
        </div>
      </div>

      {/* Pestañas de Filtrado de Stock Rápido (Todos / Crítico / Agotado / Óptimo) */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => {
            setStockFilter("ALL");
            setCurrentPage(1);
          }}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
            stockFilter === "ALL"
              ? "bg-[#3a4d6b] text-white shadow-2xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <span>Todos</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10">
            {stockStats.total}
          </span>
        </button>

        <button
          onClick={() => {
            setStockFilter("CRITICO");
            setCurrentPage(1);
          }}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
            stockFilter === "CRITICO"
              ? "bg-amber-600 text-white shadow-2xs"
              : "bg-white text-amber-700 hover:bg-amber-50 border border-amber-200"
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Stock Crítico</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">
            {stockStats.criticos}
          </span>
        </button>

        <button
          onClick={() => {
            setStockFilter("AGOTADO");
            setCurrentPage(1);
          }}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
            stockFilter === "AGOTADO"
              ? "bg-rose-600 text-white shadow-2xs"
              : "bg-white text-rose-700 hover:bg-rose-50 border border-rose-200"
          }`}
        >
          <PackageX className="w-3.5 h-3.5" />
          <span>Agotados / Sin Stock</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-800 font-bold">
            {stockStats.agotados}
          </span>
        </button>

        <button
          onClick={() => {
            setStockFilter("OPTIMO");
            setCurrentPage(1);
          }}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
            stockFilter === "OPTIMO"
              ? "bg-emerald-700 text-white shadow-2xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Stock Óptimo</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10">
            {stockStats.optimos}
          </span>
        </button>
      </div>

      {/* Barra de Búsqueda y Filtro de Categoría */}
      <div className="flex flex-col sm:flex-row items-center gap-2.5">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-cyan-600 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por código de barras completo (ej: 780000000004) o nombre..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-white border border-slate-300 text-slate-900 placeholder-slate-400 pl-9 pr-3 py-1.5 rounded-lg text-xs sm:text-sm focus:ring-1 focus:ring-slate-500 focus:outline-none shadow-2xs"
          />
        </div>

        <div className="relative w-full sm:w-auto">
          <select
            value={selectedCategoria}
            onChange={(e) => {
              setSelectedCategoria(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full sm:w-52 appearance-none bg-white border border-slate-300 text-slate-700 text-xs rounded-lg px-3 py-1.5 pr-8 focus:ring-1 focus:ring-slate-500 focus:outline-none shadow-2xs"
          >
            <option value="ALL">Todas las categorías</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2 pointer-events-none" />
        </div>
      </div>

      {/* Alerta de Producto no encontrado escaneado */}
      {scannedNotFoundCode && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between gap-3 text-xs animate-fadeIn">
          <div>
            <span className="font-bold text-amber-900">
              No existe producto con código: <b className="font-mono">{scannedNotFoundCode}</b>
            </span>
            <p className="text-[11px] text-amber-700">
              ¿Deseas registrarlo como un nuevo producto en el catálogo?
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setScannedNotFoundCode(null)}
              className="px-2.5 py-1 text-slate-500 hover:text-slate-700 font-semibold"
            >
              Descartar
            </button>
            <button
              onClick={() => {
                setProductoEditar(null);
                setIsAddModalOpen(true);
                setScannedNotFoundCode(null);
              }}
              className="px-3 py-1 rounded bg-[#3a4d6b] text-white font-bold"
            >
              Registrar Ahora
            </button>
          </div>
        </div>
      )}

      {/* VISTA DESKTOP: TABLA COMPLETA CON CÓDIGO COMPLETO (780000000004) */}
      <div className="hidden sm:block bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-800 font-bold">
              <tr>
                <th
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort("sku")}
                >
                  <div className="flex items-center space-x-1">
                    <span>Código de Barras / SKU</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort("nombre")}
                >
                  <div className="flex items-center space-x-1">
                    <span>Producto</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4">Categoría</th>
                <th
                  className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort("precio_compra")}
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>P. Compra Unit.</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort("precio_venta")}
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>P. Venta Unit.</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort("margen")}
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Margen</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort("stock_actual")}
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>Stock Actual</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 text-center">Acciones Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedProductos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    No se encontraron productos con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                paginatedProductos.map((p) => {
                  const pCompra = Number(p.precio_compra) || 0;
                  const pVenta = Number(p.precio_venta) || 0;
                  const stockActual = Number(p.stock_actual) || 0;
                  const margen =
                    pVenta > 0
                      ? (((pVenta - pCompra) / pVenta) * 100).toFixed(1)
                      : "0.0";
                  const codigoCompleto = p.codigo_barras || p.sku;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Código de barras completo */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-800 tracking-wide">
                        {codigoCompleto}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {p.nombre}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {p.categoria_nombre || "General"}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        {formatCLP(pCompra)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                        {formatCLP(pVenta)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        <span className={Number(margen) > 0 ? "text-emerald-700 font-semibold" : "text-slate-500"}>
                          {margen}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-medium">
                        <span
                          className={`px-2.5 py-0.5 rounded font-bold ${
                            stockActual <= 0
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : stockActual <= p.stock_minimo
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-slate-100 text-slate-800"
                          }`}
                        >
                          {stockActual} u.
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          {/* Botón Reponer */}
                          <button
                            onClick={() => {
                              setProductoReponer(p);
                              setIsReponerModalOpen(true);
                            }}
                            className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-bold shadow-2xs transition-colors"
                            title="Entrada rápida de stock"
                          >
                            <PackagePlus className="w-3.5 h-3.5 text-emerald-700" />
                            <span>+ Reponer</span>
                          </button>

                          {/* Botón Editar */}
                          <button
                            onClick={() => {
                              setProductoEditar(p);
                              setIsAddModalOpen(true);
                            }}
                            className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-[11px] font-medium shadow-2xs transition-colors"
                          >
                            <Edit2 className="w-3 h-3 text-slate-500" />
                            <span>Editar</span>
                          </button>

                          {/* Botón Kardex */}
                          <Link
                            href="/inventario"
                            className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-[11px] font-medium shadow-2xs transition-colors"
                          >
                            <ClipboardList className="w-3 h-3 text-slate-500" />
                            <span>Kardex</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* VISTA MÓVIL: TARJETAS TOUCH LIST CON CÓDIGO COMPLETO */}
      <div className="sm:hidden space-y-2.5">
        {paginatedProductos.length === 0 ? (
          <div className="bg-white rounded-lg border border-dashed border-slate-200 p-8 text-center text-slate-400 text-xs">
            No se encontraron productos con los filtros seleccionados.
          </div>
        ) : (
          paginatedProductos.map((p) => {
            const pVenta = Number(p.precio_venta) || 0;
            const stockActual = Number(p.stock_actual) || 0;
            const codigoCompleto = p.codigo_barras || p.sku;

            return (
              <div
                key={p.id}
                className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 text-[11px] text-slate-500 mb-0.5 font-mono">
                      <span className="font-bold text-slate-800">{codigoCompleto}</span>
                      <span>•</span>
                      <span className="text-slate-500 font-sans">{p.categoria_nombre || "General"}</span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-xs leading-snug break-words">
                      {p.nombre}
                    </h4>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono flex-shrink-0 ${
                      stockActual <= 0
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : stockActual <= p.stock_minimo
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    {stockActual} u.
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Precio Venta</span>
                    <span className="font-bold font-mono text-slate-900 text-sm">
                      {formatCLP(pVenta)}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => {
                        setProductoReponer(p);
                        setIsReponerModalOpen(true);
                      }}
                      className="px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold"
                    >
                      + Reponer
                    </button>
                    <button
                      onClick={() => {
                        setProductoEditar(p);
                        setIsAddModalOpen(true);
                      }}
                      className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                    >
                      Editar
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer de Tabla: Paginación y Exportar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
        {/* Paginación */}
        <div className="flex items-center space-x-3 text-xs text-slate-600">
          <span>
            Página {currentPage} de {totalPages}
          </span>
          <div className="flex items-center space-x-1">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 disabled:opacity-40 text-xs font-medium"
            >
              Anterior
            </button>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 disabled:opacity-40 text-xs font-medium"
            >
              Siguiente
            </button>
          </div>
        </div>

        {/* Botón Exportar */}
        <button
          onClick={exportToExcel}
          className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-[#3a4d6b] hover:bg-slate-700 text-white text-xs font-bold shadow-xs transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exportar Catálogo</span>
        </button>
      </div>

      {/* Modal Reposición Rápida de Stock */}
      <ModalReponerStock
        isOpen={isReponerModalOpen}
        onClose={() => {
          setIsReponerModalOpen(false);
          setProductoReponer(null);
        }}
        producto={productoReponer}
        onOpenEditFull={(prod) => {
          setProductoEditar(prod);
          setIsAddModalOpen(true);
        }}
      />

      {/* Modal Agregar / Editar Producto Completo */}
      <ModalProducto
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        productoEditar={productoEditar}
        initialBarcode={scannedNotFoundCode}
      />

      {/* Modal Escáner de Cámara */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScanned}
        title="Escanear Código para Reponer / Editar"
      />
    </div>
  );
}
