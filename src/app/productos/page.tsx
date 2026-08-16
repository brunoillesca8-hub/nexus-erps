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
  Calendar,
  Clock,
  Zap,
  Boxes,
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
  const [stockFilter, setStockFilter] = useState<
    "ALL" | "CRITICO" | "AGOTADO" | "OPTIMO" | "POR_VENCER" | "VENCIDOS"
  >("ALL");

  // Estrategia de Organización (FIFO, FEFO, ESTANDAR)
  const [sortStrategy, setSortStrategy] = useState<"ESTANDAR" | "FEFO" | "FIFO">("ESTANDAR");
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

  // Helper para cálculo de días hasta el vencimiento
  const getExpirationStatus = (fechaVenc?: string | null) => {
    if (!fechaVenc) return { status: "SIN_FECHA", label: "Sin vencimiento", days: null };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(fechaVenc + "T00:00:00");
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { status: "VENCIDO", label: `Vencido (${Math.abs(diffDays)}d)`, days: diffDays };
    }
    if (diffDays <= 30) {
      return { status: "POR_VENCER", label: `Vence en ${diffDays}d`, days: diffDays };
    }
    return { status: "VIGENTE", label: `Vence: ${fechaVenc}`, days: diffDays };
  };

  // Conteo de Estados de Stock y Vencimiento
  const stats = useMemo(() => {
    const criticos = productos.filter((p) => p.stock_actual <= p.stock_minimo && p.stock_actual > 0);
    const agotados = productos.filter((p) => p.stock_actual <= 0);
    const optimos = productos.filter((p) => p.stock_actual > p.stock_minimo);

    const porVencer = productos.filter((p) => {
      const exp = getExpirationStatus(p.fecha_vencimiento);
      return exp.status === "POR_VENCER";
    });

    const vencidos = productos.filter((p) => {
      const exp = getExpirationStatus(p.fecha_vencimiento);
      return exp.status === "VENCIDO";
    });

    return {
      total: productos.length,
      criticos: criticos.length,
      agotados: agotados.length,
      optimos: optimos.length,
      porVencer: porVencer.length,
      vencidos: vencidos.length,
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

  // Listener para pistola USB y apps Wi-Fi en página de catálogo (solo cuando no hay modales abiertos)
  useBarcodeListener({
    onScan: handleBarcodeScanned,
    enabled: !isAddModalOpen && !isReponerModalOpen && !isScannerOpen,
  });

  // Filtrado y Búsqueda Predictiva Multi-palabra
  const filteredProductos = useMemo(() => {
    return productos.filter((p) => {
      // 1. Categoría
      const matchCat =
        selectedCategoria === "ALL" || p.categoria_id === selectedCategoria;

      // 2. Filtro de Stock y Caducidad
      let matchFilter = true;
      const expStatus = getExpirationStatus(p.fecha_vencimiento);

      if (stockFilter === "CRITICO") {
        matchFilter = p.stock_actual <= p.stock_minimo && p.stock_actual > 0;
      } else if (stockFilter === "AGOTADO") {
        matchFilter = p.stock_actual <= 0;
      } else if (stockFilter === "OPTIMO") {
        matchFilter = p.stock_actual > p.stock_minimo;
      } else if (stockFilter === "POR_VENCER") {
        matchFilter = expStatus.status === "POR_VENCER";
      } else if (stockFilter === "VENCIDOS") {
        matchFilter = expStatus.status === "VENCIDO";
      }

      // 3. Búsqueda por nombre, código de barras completo o SKU
      const matchSearch =
        matchesSearch(p.nombre, searchQuery) ||
        (p.codigo_barras && p.codigo_barras.includes(searchQuery)) ||
        p.sku.toString().includes(searchQuery);

      return matchCat && matchFilter && matchSearch;
    });
  }, [productos, selectedCategoria, stockFilter, searchQuery]);

  // Ordenamiento con soporte FEFO y FIFO
  const sortedProductos = useMemo(() => {
    return [...filteredProductos].sort((a, b) => {
      // 1. Estrategia FEFO (Primero en Vencer, Primero en Salir)
      if (sortStrategy === "FEFO") {
        const dateA = a.fecha_vencimiento ? new Date(a.fecha_vencimiento).getTime() : Infinity;
        const dateB = b.fecha_vencimiento ? new Date(b.fecha_vencimiento).getTime() : Infinity;
        if (dateA !== dateB) return dateA - dateB;
        return a.sku - b.sku;
      }

      // 2. Estrategia FIFO (Primero en Entrar / Más Antiguo Primero)
      if (sortStrategy === "FIFO") {
        const elabA = a.fecha_elaboracion
          ? new Date(a.fecha_elaboracion).getTime()
          : a.created_at
          ? new Date(a.created_at).getTime()
          : Infinity;
        const elabB = b.fecha_elaboracion
          ? new Date(b.fecha_elaboracion).getTime()
          : b.created_at
          ? new Date(b.created_at).getTime()
          : Infinity;
        if (elabA !== elabB) return elabA - elabB;
        return a.sku - b.sku;
      }

      // 3. Estrategia Estándar
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
  }, [filteredProductos, sortStrategy, sortBy, sortOrder]);

  // Paginación
  const totalPages = Math.ceil(sortedProductos.length / pageSize) || 1;
  const paginatedProductos = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedProductos.slice(start, start + pageSize);
  }, [sortedProductos, currentPage]);

  const handleSort = (field: keyof Producto | "margen") => {
    setSortStrategy("ESTANDAR");
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  // Exportar Catálogo a Excel con Fechas
  const exportToExcel = () => {
    const dataToExport = filteredProductos.map((p) => {
      const margen =
        p.precio_venta > 0
          ? (((p.precio_venta - p.precio_compra) / p.precio_venta) * 100).toFixed(1)
          : "0";
      const exp = getExpirationStatus(p.fecha_vencimiento);

      return {
        "Código Completo": p.codigo_barras || p.sku,
        Producto: p.nombre,
        Categoría: p.categoria_nombre || "Sin Categoría",
        "P. Compra Unit. (Neto)": p.precio_compra,
        "P. Venta Unit. (Inc. IVA)": p.precio_venta,
        "Margen (%)": `${margen}%`,
        "Stock Actual": p.stock_actual,
        "Stock Mínimo": p.stock_minimo,
        "Fecha Elaboración": p.fecha_elaboracion || "No especificada",
        "Fecha Vencimiento": p.fecha_vencimiento || "No especificada",
        "Estado Caducidad": exp.label,
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
            {productos.length} productos registrados • Soporte de trazabilidad FIFO / FEFO.
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

      {/* Barra de Organización FIFO / FEFO & Filtros Rápidos */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
        {/* Selector de Estrategia FEFO / FIFO */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-slate-700 flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5 text-[#3a4d6b]" />
            <span>Organizar por:</span>
          </span>

          <div className="inline-flex rounded-lg border border-slate-300 bg-slate-100 p-0.5 text-xs font-semibold">
            {/* FEFO */}
            <button
              onClick={() => {
                setSortStrategy("FEFO");
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-md transition-all flex items-center space-x-1 ${
                sortStrategy === "FEFO"
                  ? "bg-amber-600 text-white shadow-xs font-bold"
                  : "text-slate-700 hover:text-slate-900"
              }`}
              title="First Expired, First Out - Primero en Vencer, Primero en Salir"
            >
              <Zap className="w-3 h-3" />
              <span>⚡ FEFO (Vencimiento)</span>
            </button>

            {/* FIFO */}
            <button
              onClick={() => {
                setSortStrategy("FIFO");
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-md transition-all flex items-center space-x-1 ${
                sortStrategy === "FIFO"
                  ? "bg-[#3a4d6b] text-white shadow-xs font-bold"
                  : "text-slate-700 hover:text-slate-900"
              }`}
              title="First In, First Out - Primero en Entrar, Primero en Salir"
            >
              <Boxes className="w-3 h-3" />
              <span>📦 FIFO (Antigüedad)</span>
            </button>

            {/* Estándar */}
            <button
              onClick={() => {
                setSortStrategy("ESTANDAR");
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-md transition-all ${
                sortStrategy === "ESTANDAR"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-700 hover:text-slate-900"
              }`}
            >
              Estándar
            </button>
          </div>
        </div>

        {/* Pestañas de Estado: Stock & Vencimiento */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          <button
            onClick={() => {
              setStockFilter("ALL");
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
              stockFilter === "ALL"
                ? "bg-[#3a4d6b] text-white shadow-2xs"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            Todos ({stats.total})
          </button>

          <button
            onClick={() => {
              setStockFilter("POR_VENCER");
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors flex items-center space-x-1 ${
              stockFilter === "POR_VENCER"
                ? "bg-amber-600 text-white shadow-2xs"
                : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>Por Vencer ({stats.porVencer})</span>
          </button>

          <button
            onClick={() => {
              setStockFilter("VENCIDOS");
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors flex items-center space-x-1 ${
              stockFilter === "VENCIDOS"
                ? "bg-rose-600 text-white shadow-2xs"
                : "bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200"
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Vencidos ({stats.vencidos})</span>
          </button>

          <button
            onClick={() => {
              setStockFilter("CRITICO");
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
              stockFilter === "CRITICO"
                ? "bg-amber-600 text-white shadow-2xs"
                : "bg-white text-amber-700 hover:bg-amber-50 border border-amber-200"
            }`}
          >
            Stock Crítico ({stats.criticos})
          </button>

          <button
            onClick={() => {
              setStockFilter("AGOTADO");
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
              stockFilter === "AGOTADO"
                ? "bg-rose-600 text-white shadow-2xs"
                : "bg-white text-rose-700 hover:bg-rose-50 border border-rose-200"
            }`}
          >
            Agotados ({stats.agotados})
          </button>
        </div>
      </div>

      {/* Barra de Búsqueda y Categoría */}
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

      {/* VISTA DESKTOP: TABLA CON CÓDIGO COMPLETO Y FECHAS DE CADUCIDAD */}
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
                    <span>Código / SKU</span>
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
                <th className="py-3 px-4">Trazabilidad (Elab / Venc)</th>
                <th
                  className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort("precio_venta")}
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>P. Venta</span>
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
                    <span>Stock</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 text-center">Acciones Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedProductos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
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
                  const exp = getExpirationStatus(p.fecha_vencimiento);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Código completo */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-800 tracking-wide">
                        {codigoCompleto}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{p.nombre}</div>
                        <div className="text-[10px] text-slate-500 font-sans">{p.categoria_nombre || "General"}</div>
                      </td>
                      {/* Trazabilidad Elaboración y Vencimiento */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          {p.fecha_elaboracion && (
                            <div className="text-[11px] text-slate-500 flex items-center space-x-1 font-mono">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>Elab: {p.fecha_elaboracion}</span>
                            </div>
                          )}
                          {p.fecha_vencimiento ? (
                            <div className="flex items-center space-x-1">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                                  exp.status === "VENCIDO"
                                    ? "bg-rose-100 text-rose-800 border border-rose-200"
                                    : exp.status === "POR_VENCER"
                                    ? "bg-amber-100 text-amber-800 border border-amber-200"
                                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                }`}
                              >
                                {exp.label}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Sin vencimiento</span>
                          )}
                        </div>
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

      {/* VISTA MÓVIL: TARJETAS TOUCH LIST CON FECHAS Y CÓDIGO COMPLETO */}
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
            const exp = getExpirationStatus(p.fecha_vencimiento);

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

                    {/* Badge de vencimiento en móvil */}
                    {p.fecha_vencimiento && (
                      <div className="mt-1">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                            exp.status === "VENCIDO"
                              ? "bg-rose-100 text-rose-800"
                              : exp.status === "POR_VENCER"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {exp.label}
                        </span>
                      </div>
                    )}
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
