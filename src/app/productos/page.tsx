"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Edit2,
  ClipboardList,
  ChevronDown,
  Download,
  ArrowUpDown,
  Camera,
} from "lucide-react";
import * as XLSX from "xlsx";
import { useErp } from "@/context/erp-context";
import { formatCLP, matchesSearch } from "@/lib/utils";
import ModalProducto from "@/components/ModalProducto";
import ModalRecepcion from "@/components/ModalRecepcion";
import BarcodeScannerModal from "@/components/BarcodeScannerModal";
import type { Producto } from "@/types/erp";

export default function ProductosPage() {
  const { productos, categorias, eliminarProducto } = useErp();

  // Estados de búsqueda y filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoria, setSelectedCategoria] = useState<string>("ALL");

  // Ordenamiento
  const [sortField, setSortField] = useState<"sku" | "nombre" | "precio_compra" | "precio_venta" | "margen" | "stock_actual">("sku");
  const [sortAsc, setSortAsc] = useState(true);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modales
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [productoEditar, setProductoEditar] = useState<Producto | null>(null);
  const [productoRecepcion, setProductoRecepcion] = useState<Producto | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedInitialBarcode, setScannedInitialBarcode] = useState<string | null>(null);

  // Filtrado
  const filteredProductos = useMemo(() => {
    return productos.filter((p) => {
      const matchCat = selectedCategoria === "ALL" || p.categoria_id === selectedCategoria;
      const matchSearch =
        matchesSearch(p.nombre, searchQuery) ||
        (p.codigo_barras && p.codigo_barras.includes(searchQuery)) ||
        p.sku.toString().includes(searchQuery);
      return matchCat && matchSearch;
    });
  }, [productos, selectedCategoria, searchQuery]);

  // Ordenamiento
  const sortedProductos = useMemo(() => {
    return [...filteredProductos].sort((a, b) => {
      let valA: any = a[sortField as keyof Producto];
      let valB: any = b[sortField as keyof Producto];

      if (sortField === "margen") {
        valA = a.precio_venta > 0 ? (a.precio_venta - a.precio_compra) / a.precio_venta : 0;
        valB = b.precio_venta > 0 ? (b.precio_venta - b.precio_compra) / b.precio_venta : 0;
      }

      if (typeof valA === "string") {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? Number(valA || 0) - Number(valB || 0) : Number(valB || 0) - Number(valA || 0);
    });
  }, [filteredProductos, sortField, sortAsc]);

  // Paginación
  const totalPages = Math.ceil(sortedProductos.length / itemsPerPage) || 1;
  const paginatedProductos = sortedProductos.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Exportar a Excel (CSV)
  const exportToExcel = () => {
    const dataToExport = sortedProductos.map((p) => ({
      "SKU (Inter.)": p.sku,
      "Código EAN-13": p.codigo_barras || "",
      Producto: p.nombre,
      Categoría: p.categoria_nombre || "General",
      "P. Compra Unit. (Neto)": p.precio_compra,
      "P. Venta Unit. (Inc. IVA)": p.precio_venta,
      "Margen Unit. (%)":
        p.precio_venta > 0
          ? `${(((p.precio_venta - p.precio_compra) / p.precio_venta) * 100).toFixed(1)}%`
          : "0%",
      "Stock Actual": `${p.stock_actual} u.`,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Productos");
    XLSX.writeFile(workbook, `catalogo_productos_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleBarcodeScanned = (barcode: string) => {
    const found = productos.find((p) => p.codigo_barras === barcode || p.sku.toString() === barcode);
    if (found) {
      setProductoRecepcion(found);
    } else {
      setScannedInitialBarcode(barcode);
      setProductoEditar(null);
      setIsAddModalOpen(true);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Gestión Centralizada de Productos
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Catálogo de productos único de la tienda.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setIsScannerOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold shadow-xs transition-colors"
          >
            <Camera className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Escanear</span>
          </button>

          <button
            onClick={() => {
              setProductoEditar(null);
              setScannedInitialBarcode(null);
              setIsAddModalOpen(true);
            }}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-[#3a4d6b] hover:bg-slate-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo Producto</span>
          </button>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtro de Categoría */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {/* Buscador */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-cyan-600 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Buscar por SKU, Nombre o Código EAN-13"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-300 text-slate-900 placeholder-slate-400 pl-10 pr-4 py-2 rounded-lg text-xs sm:text-sm focus:ring-1 focus:ring-slate-500 focus:border-slate-500 focus:outline-none shadow-xs"
          />
        </div>

        {/* Dropdown Filtrar Categoría */}
        <div className="relative w-full sm:w-auto">
          <select
            value={selectedCategoria}
            onChange={(e) => setSelectedCategoria(e.target.value)}
            className="w-full sm:w-56 appearance-none bg-white border border-slate-300 text-slate-700 text-xs sm:text-sm rounded-lg px-3.5 py-2 pr-9 focus:ring-1 focus:ring-slate-500 focus:border-slate-500 focus:outline-none shadow-xs"
          >
            <option value="ALL">Filtrar categoría</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
        </div>
      </div>

      {/* Tabla de Productos Central */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-800 font-bold">
              <tr>
                <th
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100/80 transition-colors"
                  onClick={() => handleSort("sku")}
                >
                  <div className="flex items-center space-x-1">
                    <span>SKU (Inter.) / EAN-13</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100/80 transition-colors"
                  onClick={() => handleSort("nombre")}
                >
                  <div className="flex items-center space-x-1">
                    <span>Producto</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4">Categoría</th>
                <th
                  className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100/80 transition-colors"
                  onClick={() => handleSort("precio_compra")}
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>P. Compra Unit. (Neto)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100/80 transition-colors"
                  onClick={() => handleSort("precio_venta")}
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>P. Venta Unit. (Inc. IVA)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100/80 transition-colors"
                  onClick={() => handleSort("margen")}
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Margen Unit. (%)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100/80 transition-colors"
                  onClick={() => handleSort("stock_actual")}
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>Stock Actual</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedProductos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    No se encontraron productos en el catálogo. Haz clic en "Nuevo Producto" para agregar.
                  </td>
                </tr>
              ) : (
                paginatedProductos.map((p) => {
                  const margen =
                    p.precio_venta > 0
                      ? (((p.precio_venta - p.precio_compra) / p.precio_venta) * 100).toFixed(1)
                      : "0";

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-slate-800">
                        <div>{p.codigo_barras || p.sku}</div>
                        {p.codigo_barras && (
                          <div className="text-[10px] text-slate-400 font-sans">
                            SKU: {p.sku}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {p.nombre}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {p.categoria_nombre || "Categoría"}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        {new Intl.NumberFormat("es-CL", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }).format(p.precio_compra)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                        {new Intl.NumberFormat("es-CL", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }).format(p.precio_venta)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        {margen}%
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-medium text-slate-800">
                        {p.stock_actual} u.
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          {/* Botón Editar */}
                          <button
                            onClick={() => {
                              setProductoEditar(p);
                              setIsAddModalOpen(true);
                            }}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-[11px] font-medium shadow-2xs transition-colors"
                          >
                            <Edit2 className="w-3 h-3 text-slate-500" />
                            <span>Editar</span>
                          </button>

                          {/* Botón Ver Kardex / Recepción */}
                          <Link
                            href="/inventario"
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-[11px] font-medium shadow-2xs transition-colors"
                          >
                            <ClipboardList className="w-3 h-3 text-slate-500" />
                            <span>Ver Kardex</span>
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

      {/* Footer de Tabla: Paginación y Exportar a Excel */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
        {/* Paginación */}
        <div className="flex items-center space-x-3 text-xs text-slate-600">
          <span>
            Página {currentPage} de {totalPages}
          </span>
          <div className="flex items-center space-x-1">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 disabled:opacity-40 disabled:hover:bg-white text-xs font-medium transition-colors"
            >
              Anterior
            </button>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 disabled:opacity-40 disabled:hover:bg-white text-xs font-medium transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>

        {/* Botón Exportar */}
        <button
          onClick={exportToExcel}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-[#3a4d6b] hover:bg-slate-700 text-white text-xs font-bold shadow-xs transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exportar a Excel (CSV)</span>
        </button>
      </div>

      {/* Modal Agregar / Editar Producto */}
      <ModalProducto
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        productoEditar={productoEditar}
        initialBarcode={scannedInitialBarcode}
      />

      {/* Modal Recepción Rápida */}
      <ModalRecepcion
        isOpen={!!productoRecepcion}
        onClose={() => setProductoRecepcion(null)}
        producto={productoRecepcion}
      />

      {/* Modal Escáner de Código de Barras */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScanned}
      />
    </div>
  );
}
