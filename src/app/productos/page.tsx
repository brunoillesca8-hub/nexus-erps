"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Edit2,
  ClipboardList,
  Download,
  ArrowUpDown,
  ChevronDown,
  Layers,
} from "lucide-react";
import * as XLSX from "xlsx";
import { useErp } from "@/context/erp-context";
import { formatCLP, matchesSearch } from "@/lib/utils";
import ModalProducto from "@/components/ModalProducto";
import type { Producto } from "@/types/erp";

export default function ProductosPage() {
  const { productos, categorias } = useErp();

  // Estados de Filtros y Orden
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoria, setSelectedCategoria] = useState("ALL");
  const [sortBy, setSortBy] = useState<keyof Producto | "margen">("sku");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Estados de Modales
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [productoEditar, setProductoEditar] = useState<Producto | null>(null);

  // Filtrado y Búsqueda Predictiva Multi-palabra
  const filteredProductos = useMemo(() => {
    return productos.filter((p) => {
      const matchCat =
        selectedCategoria === "ALL" || p.categoria_id === selectedCategoria;
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
        SKU: p.sku,
        "Código EAN-13": p.codigo_barras || "",
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
            Gestión Centralizada de Productos
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Catálogo con {productos.length} SKUs activos sincronizados con Turso.
          </p>
        </div>

        <div className="flex items-center space-x-2">
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

      {/* Barra de Búsqueda y Filtro de Categoría */}
      <div className="flex flex-col sm:flex-row items-center gap-2.5">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-cyan-600 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por SKU, Nombre o Código EAN-13..."
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

      {/* VISTA DESKTOP: TABLA COMPLETA (Visible en pantallas sm y mayores) */}
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
                    <span>SKU / EAN-13</span>
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
                    <span>Stock</span>
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
                    No se encontraron productos en el catálogo.
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
                      <td className="py-3 px-4 text-center font-mono font-medium text-slate-800">
                        <span
                          className={`px-2 py-0.5 rounded ${
                            stockActual <= p.stock_minimo
                              ? "bg-amber-50 text-amber-700 border border-amber-200 font-bold"
                              : "text-slate-800"
                          }`}
                        >
                          {stockActual} u.
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
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

      {/* VISTA MÓVIL: TARJETAS TOUCH LIST ANCHAS (Visible solo en smartphones < sm) */}
      <div className="sm:hidden space-y-2.5">
        {paginatedProductos.length === 0 ? (
          <div className="bg-white rounded-lg border border-dashed border-slate-200 p-8 text-center text-slate-400 text-xs">
            No se encontraron productos.
          </div>
        ) : (
          paginatedProductos.map((p) => {
            const pCompra = Number(p.precio_compra) || 0;
            const pVenta = Number(p.precio_venta) || 0;
            const stockActual = Number(p.stock_actual) || 0;
            const margen =
              pVenta > 0
                ? (((pVenta - pCompra) / pVenta) * 100).toFixed(1)
                : "0.0";

            return (
              <div
                key={p.id}
                className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 text-[10px] text-slate-400 mb-0.5">
                      <span className="font-mono font-bold text-slate-600">SKU #{p.sku}</span>
                      <span>•</span>
                      <span className="text-slate-500">{p.categoria_nombre || "General"}</span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-xs leading-snug break-words">
                      {p.nombre}
                    </h4>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono flex-shrink-0 ${
                      stockActual <= p.stock_minimo
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

                  <div>
                    <span className="text-[10px] text-slate-400 block">Margen</span>
                    <span className="font-bold font-mono text-emerald-700">
                      {margen}%
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => {
                        setProductoEditar(p);
                        setIsAddModalOpen(true);
                      }}
                      className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                    >
                      Editar
                    </button>
                    <Link
                      href="/inventario"
                      className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                    >
                      Kardex
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer de Tabla: Paginación y Exportar a Excel */}
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
          <span>Exportar a Excel</span>
        </button>
      </div>

      {/* Modal Agregar / Editar Producto */}
      <ModalProducto
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        productoEditar={productoEditar}
      />
    </div>
  );
}
