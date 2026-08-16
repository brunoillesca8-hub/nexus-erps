"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import type {
  Empresa,
  Sucursal,
  Categoria,
  Proveedor,
  Cliente,
  Producto,
  Venta,
  MovimientoInventario,
  ProcesarVentaPayload,
  TipoMovimiento,
} from "@/types/erp";
import { generateUUID } from "@/lib/utils";

interface ErpContextType {
  // Estado
  empresa: Empresa | null;
  sucursales: Sucursal[];
  categorias: Categoria[];
  proveedores: Proveedor[];
  clientes: Cliente[];
  productos: Producto[];
  ventas: Venta[];
  movimientos: MovimientoInventario[];
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  syncError: string | null;

  // Operaciones
  procesarVenta: (payload: ProcesarVentaPayload) => Promise<{ success: boolean; folio?: number; error?: string; ventaId?: string }>;
  ajustarStock: (productoId: string, cantidad: number, motivo: string, tipo?: TipoMovimiento) => Promise<{ success: boolean; error?: string }>;
  agregarProductosLote: (items: Partial<Producto>[]) => Promise<{ success: boolean; count?: number; error?: string }>;
  guardarProducto: (producto: Partial<Producto>) => Promise<{ success: boolean; producto?: Producto; error?: string }>;
  eliminarProducto: (id: string) => Promise<{ success: boolean; error?: string }>;
  guardarCliente: (cliente: Partial<Cliente>) => Promise<{ success: boolean; cliente?: Cliente; error?: string }>;
  guardarProveedor: (proveedor: Partial<Proveedor>) => Promise<{ success: boolean; proveedor?: Proveedor; error?: string }>;
  generarSiguienteSKU: () => Promise<number>;
  vaciarCatalogo: () => Promise<{ success: boolean; error?: string }>;
  recargarDatos: () => Promise<void>;
}

const ErpContext = createContext<ErpContextType | null>(null);

const BROADCAST_CHANNEL_NAME = "nexus-erp-sync-channel";
const POLLING_INTERVAL_MS = 8000; // 8 segundos

export function ErpProvider({ children }: { children: React.ReactNode }) {
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // 1. Cargar datos desde Turso
  const fetchData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setIsSyncing(true);
      const res = await fetch("/api/db/sync", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();

      if (data.success) {
        if (data.empresa) setEmpresa(data.empresa);
        if (data.sucursales) setSucursales(data.sucursales);
        if (data.categorias) setCategorias(data.categorias);
        if (data.proveedores) setProveedores(data.proveedores);
        if (data.clientes) setClientes(data.clientes);
        if (data.productos) setProductos(data.productos);
        if (data.ventas) setVentas(data.ventas);
        if (data.movimientos) setMovimientos(data.movimientos);

        setLastSyncTime(new Date());
        setSyncError(null);
      }
    } catch (err: any) {
      console.error("Error en sincronización Turso:", err);
      setSyncError(err.message || "Error al conectar con la base de datos");
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  }, []);

  // Notificar a otras pestañas/ventanas abiertas
  const notifyBroadcast = (action: string) => {
    try {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({ type: "ERP_DATA_CHANGED", action, timestamp: Date.now() });
      }
    } catch (e) {
      console.warn("BroadcastChannel error:", e);
    }
  };

  // Configuración de Polling y BroadcastChannel
  useEffect(() => {
    fetchData();

    // BroadcastChannel para sincronización instantánea entre pestañas
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      broadcastChannelRef.current = bc;

      bc.onmessage = (event) => {
        if (event.data?.type === "ERP_DATA_CHANGED") {
          fetchData(true);
        }
      };
    }

    // Revalidación al volver a enfocar la ventana o recuperar conexión
    const handleFocus = () => fetchData(true);
    const handleOnline = () => fetchData(true);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleOnline);

    // Smart Polling en segundo plano cada 8 segundos
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchData(true);
      }
    }, POLLING_INTERVAL_MS);

    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleOnline);
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
      }
    };
  }, [fetchData]);

  // 2. Procesar Venta con Mutación Optimista + Lote ACID
  const procesarVenta = async (payload: ProcesarVentaPayload) => {
    // Guardar estado previo para rollback en caso de error
    const previousProductos = [...productos];
    const previousVentas = [...ventas];

    // Mutación optimista en 0 ms
    const updatedProductos = productos.map((prod) => {
      const itemVendido = payload.items.find((it) => it.producto_id === prod.id);
      if (itemVendido) {
        return {
          ...prod,
          stock_actual: Math.max(0, prod.stock_actual - itemVendido.cantidad),
        };
      }
      return prod;
    });
    setProductos(updatedProductos);

    try {
      const res = await fetch("/api/ventas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        // Rollback optimista
        setProductos(previousProductos);
        setVentas(previousVentas);
        return { success: false, error: data.error || "Error al procesar la venta" };
      }

      // Notificar a otras ventanas y recargar en segundo plano
      notifyBroadcast("VENTA_REALIZADA");
      fetchData(true);

      return {
        success: true,
        folio: data.numero_folio,
        ventaId: data.venta_id,
      };
    } catch (err: any) {
      setProductos(previousProductos);
      setVentas(previousVentas);
      return { success: false, error: err.message || "Error de red" };
    }
  };

  // 3. Ajustar Stock (Recepción de mercadería o ajustes manuales)
  const ajustarStock = async (productoId: string, cantidad: number, motivo: string, tipo?: TipoMovimiento) => {
    try {
      const res = await fetch("/api/inventario/ajuste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          producto_id: productoId,
          cantidad,
          motivo,
          tipo,
          empresa_id: empresa?.id,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Error al ajustar stock" };
      }

      notifyBroadcast("STOCK_AJUSTADO");
      fetchData(true);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Error de red" };
    }
  };

  // 4. Carga Masiva por Lotes (Batch de 100)
  const agregarProductosLote = async (items: Partial<Producto>[]) => {
    try {
      const res = await fetch("/api/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          empresa_id: empresa?.id || "emp_default",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Error al importar productos" };
      }

      notifyBroadcast("PRODUCTOS_IMPORTADOS");
      fetchData(true);
      return { success: true, count: data.count };
    } catch (err: any) {
      return { success: false, error: err.message || "Error de red al importar" };
    }
  };

  // 5. Guardar/Editar Producto
  const guardarProducto = async (prod: Partial<Producto>) => {
    try {
      const res = await fetch("/api/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...prod,
          empresa_id: empresa?.id || "emp_default",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Error al guardar producto" };
      }

      notifyBroadcast("PRODUCTO_GUARDADO");
      fetchData(true);
      return { success: true, producto: data.producto };
    } catch (err: any) {
      return { success: false, error: err.message || "Error de red" };
    }
  };

  // 6. Eliminar Producto (Desactivar)
  const eliminarProducto = async (id: string) => {
    try {
      const res = await fetch(`/api/productos?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Error al eliminar" };
      }

      notifyBroadcast("PRODUCTO_ELIMINADO");
      fetchData(true);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // 7. Guardar Cliente
  const guardarCliente = async (cli: Partial<Cliente>) => {
    try {
      const res = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...cli, empresa_id: empresa?.id || "emp_default" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Error al guardar cliente" };
      }

      notifyBroadcast("CLIENTE_GUARDADO");
      fetchData(true);
      return { success: true, cliente: data.cliente };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // 8. Guardar Proveedor
  const guardarProveedor = async (prov: Partial<Proveedor>) => {
    try {
      const res = await fetch("/api/proveedores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...prov, empresa_id: empresa?.id || "emp_default" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Error al guardar proveedor" };
      }

      notifyBroadcast("PROVEEDOR_GUARDADO");
      fetchData(true);
      return { success: true, proveedor: data.proveedor };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // 9. Generar Siguiente SKU
  const generarSiguienteSKU = async (): Promise<number> => {
    try {
      const res = await fetch("/api/productos/sku");
      const data = await res.json();
      if (data.success && data.next_sku) {
        return data.next_sku;
      }
    } catch {
      // Fallback local
    }
    const maxCurrent = productos.reduce((max, p) => Math.max(max, Number(p.sku) || 1000), 1000);
    return maxCurrent + 1;
  };

  // 10. Vaciar Catálogo
  const vaciarCatalogo = async () => {
    try {
      const res = await fetch("/api/productos/vaciar", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Error al vaciar catálogo" };
      }

      setProductos([]);
      setVentas([]);
      setMovimientos([]);
      notifyBroadcast("CATALOGO_VACIADO");
      fetchData(true);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  return (
    <ErpContext.Provider
      value={{
        empresa,
        sucursales,
        categorias,
        proveedores,
        clientes,
        productos,
        ventas,
        movimientos,
        isLoading,
        isSyncing,
        lastSyncTime,
        syncError,
        procesarVenta,
        ajustarStock,
        agregarProductosLote,
        guardarProducto,
        eliminarProducto,
        guardarCliente,
        guardarProveedor,
        generarSiguienteSKU,
        vaciarCatalogo,
        recargarDatos: () => fetchData(false),
      }}
    >
      {children}
    </ErpContext.Provider>
  );
}

export function useErp() {
  const context = useContext(ErpContext);
  if (!context) {
    throw new Error("useErp debe ser usado dentro de un ErpProvider");
  }
  return context;
}
