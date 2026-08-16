"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Plus,
  Edit2,
  X,
} from "lucide-react";
import { useErp } from "@/context/erp-context";
import { formatCLP, matchesSearch } from "@/lib/utils";
import type { Cliente } from "@/types/erp";

export default function ClientesPage() {
  const { clientes, ventas, guardarCliente } = useErp();
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Partial<Cliente> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const filteredClientes = useMemo(() => {
    return clientes.filter((c) => {
      return (
        matchesSearch(c.nombre, searchQuery) ||
        (c.rut_identificador && c.rut_identificador.includes(searchQuery)) ||
        (c.telefono && c.telefono.includes(searchQuery)) ||
        (c.email && matchesSearch(c.email, searchQuery))
      );
    });
  }, [clientes, searchQuery]);

  const handleOpenAdd = () => {
    setEditingCliente({
      nombre: "",
      rut_identificador: "",
      telefono: "",
      email: "",
      direccion: "",
      notas: "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cliente: Cliente) => {
    setEditingCliente({ ...cliente });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCliente || !editingCliente.nombre) return;
    setIsSaving(true);
    await guardarCliente(editingCliente);
    setIsSaving(false);
    setIsModalOpen(false);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            CRM de Clientes
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Directorio de clientes, RUT identificador y compras acumuladas.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-[#3a4d6b] hover:bg-slate-700 text-white text-xs font-bold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nuevo Cliente</span>
        </button>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="w-4 h-4 text-cyan-600 absolute left-3.5 top-3" />
        <input
          type="text"
          placeholder="Buscar cliente por nombre, RUT, teléfono o email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white border border-slate-300 text-slate-900 placeholder-slate-400 pl-10 pr-4 py-2 rounded-lg text-xs sm:text-sm focus:ring-1 focus:ring-slate-500 focus:outline-none shadow-xs"
        />
      </div>

      {/* Tabla Clientes */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-800 font-bold">
              <tr>
                <th className="py-3 px-4">Nombre / Razón Social</th>
                <th className="py-3 px-4">RUT Identificador</th>
                <th className="py-3 px-4">Teléfono</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Dirección</th>
                <th className="py-3 px-4 text-center">Compras Totales</th>
                <th className="py-3 px-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClientes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    No se encontraron clientes registrados.
                  </td>
                </tr>
              ) : (
                filteredClientes.map((c) => {
                  const clienteVentas = ventas.filter((v) => v.cliente_id === c.id);
                  const totalGastado = clienteVentas.reduce((acc, v) => acc + Number(v.total || 0), 0);

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{c.nombre}</td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {c.rut_identificador || "-"}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{c.telefono || "-"}</td>
                      <td className="py-3 px-4 text-slate-600">{c.email || "-"}</td>
                      <td className="py-3 px-4 text-slate-600 truncate max-w-[150px]">
                        {c.direccion || "-"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-bold text-slate-900">
                          {formatCLP(totalGastado)}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          {clienteVentas.length} compra{clienteVentas.length === 1 ? "" : "s"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleOpenEdit(c)}
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

      {/* Modal Agregar / Editar Cliente */}
      {isModalOpen && editingCliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-sm text-slate-900">
                {editingCliente.id ? "Editar Cliente" : "Nuevo Cliente"}
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
                  value={editingCliente.nombre || ""}
                  onChange={(e) =>
                    setEditingCliente({ ...editingCliente, nombre: e.target.value })
                  }
                  className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-slate-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">RUT / Identificador</label>
                <input
                  type="text"
                  placeholder="Ej: 12.345.678-9"
                  value={editingCliente.rut_identificador || ""}
                  onChange={(e) =>
                    setEditingCliente({ ...editingCliente, rut_identificador: e.target.value })
                  }
                  className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-slate-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Teléfono</label>
                  <input
                    type="text"
                    value={editingCliente.telefono || ""}
                    onChange={(e) =>
                      setEditingCliente({ ...editingCliente, telefono: e.target.value })
                    }
                    className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-slate-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Email</label>
                  <input
                    type="email"
                    value={editingCliente.email || ""}
                    onChange={(e) =>
                      setEditingCliente({ ...editingCliente, email: e.target.value })
                    }
                    className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-slate-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Dirección</label>
                <input
                  type="text"
                  value={editingCliente.direccion || ""}
                  onChange={(e) =>
                    setEditingCliente({ ...editingCliente, direccion: e.target.value })
                  }
                  className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-slate-500 focus:outline-none"
                />
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
                  {isSaving ? "Guardando..." : "Guardar Cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
