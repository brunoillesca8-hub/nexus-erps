"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Plus,
  Edit2,
  X,
} from "lucide-react";
import { useErp } from "@/context/erp-context";
import { matchesSearch } from "@/lib/utils";
import type { Proveedor } from "@/types/erp";

export default function ProveedoresPage() {
  const { proveedores, guardarProveedor, productos } = useErp();
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProveedor, setEditingProveedor] = useState<Partial<Proveedor> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const filteredProveedores = useMemo(() => {
    return proveedores.filter((p) => {
      return (
        matchesSearch(p.nombre, searchQuery) ||
        (p.rut_identificador && p.rut_identificador.includes(searchQuery)) ||
        (p.contacto_nombre && matchesSearch(p.contacto_nombre, searchQuery)) ||
        (p.email && matchesSearch(p.email, searchQuery))
      );
    });
  }, [proveedores, searchQuery]);

  const handleOpenAdd = () => {
    setEditingProveedor({
      nombre: "",
      rut_identificador: "",
      contacto_nombre: "",
      telefono: "",
      email: "",
      direccion: "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (prov: Proveedor) => {
    setEditingProveedor({ ...prov });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProveedor || !editingProveedor.nombre) return;
    setIsSaving(true);
    await guardarProveedor(editingProveedor);
    setIsSaving(false);
    setIsModalOpen(false);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Directorio de Proveedores
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Gestión de abastecedores, contactos comerciales y catálogo asociado.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-[#3a4d6b] hover:bg-slate-700 text-white text-xs font-bold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nuevo Proveedor</span>
        </button>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="w-4 h-4 text-cyan-600 absolute left-3.5 top-3" />
        <input
          type="text"
          placeholder="Buscar proveedor por nombre, RUT, contacto o email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white border border-slate-300 text-slate-900 placeholder-slate-400 pl-10 pr-4 py-2 rounded-lg text-xs sm:text-sm focus:ring-1 focus:ring-slate-500 focus:outline-none shadow-xs"
        />
      </div>

      {/* Tabla Proveedores */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-800 font-bold">
              <tr>
                <th className="py-3 px-4">Proveedor / Distribuidora</th>
                <th className="py-3 px-4">RUT</th>
                <th className="py-3 px-4">Contacto</th>
                <th className="py-3 px-4">Teléfono</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4 text-center">Productos Vinculados</th>
                <th className="py-3 px-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProveedores.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    No se encontraron proveedores registrados.
                  </td>
                </tr>
              ) : (
                filteredProveedores.map((p) => {
                  const prodsAsociados = productos.filter((prod) => prod.proveedor_id === p.id);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{p.nombre}</td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {p.rut_identificador || "-"}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {p.contacto_nombre || "-"}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{p.telefono || "-"}</td>
                      <td className="py-3 px-4 text-slate-600">{p.email || "-"}</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-900">
                        {prodsAsociados.length} SKUs
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-[11px] font-medium shadow-2xs transition-colors"
                        >
                          <Edit2 className="w-3 h-3 text-slate-500" />
                          <span>Editar</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Proveedor */}
      {isModalOpen && editingProveedor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-sm text-slate-900">
                {editingProveedor.id ? "Editar Proveedor" : "Nuevo Proveedor"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Nombre / Razón Social *</label>
                <input
                  type="text"
                  required
                  value={editingProveedor.nombre || ""}
                  onChange={(e) =>
                    setEditingProveedor({ ...editingProveedor, nombre: e.target.value })
                  }
                  className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-slate-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">RUT Proveedor</label>
                <input
                  type="text"
                  placeholder="Ej: 76.543.210-K"
                  value={editingProveedor.rut_identificador || ""}
                  onChange={(e) =>
                    setEditingProveedor({ ...editingProveedor, rut_identificador: e.target.value })
                  }
                  className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-slate-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Contacto / Ejecutivo</label>
                <input
                  type="text"
                  value={editingProveedor.contacto_nombre || ""}
                  onChange={(e) =>
                    setEditingProveedor({ ...editingProveedor, contacto_nombre: e.target.value })
                  }
                  className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-slate-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Teléfono</label>
                  <input
                    type="text"
                    value={editingProveedor.telefono || ""}
                    onChange={(e) =>
                      setEditingProveedor({ ...editingProveedor, telefono: e.target.value })
                    }
                    className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-slate-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Email</label>
                  <input
                    type="email"
                    value={editingProveedor.email || ""}
                    onChange={(e) =>
                      setEditingProveedor({ ...editingProveedor, email: e.target.value })
                    }
                    className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-slate-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-1.5 rounded-lg bg-[#3a4d6b] hover:bg-slate-700 text-white text-xs font-bold disabled:opacity-50"
                >
                  {isSaving ? "Guardando..." : "Guardar Proveedor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
