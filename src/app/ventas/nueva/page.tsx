"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Search,
  Camera,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Package,
} from "lucide-react";
import { useErp } from "@/context/erp-context";
import { formatCLP, matchesSearch } from "@/lib/utils";
import BarcodeScannerModal from "@/components/BarcodeScannerModal";
import TicketModal from "@/components/TicketModal";
import type { Producto, CartItem, MetodoPago, Venta } from "@/types/erp";

export default function PosPage() {
  const { productos, categorias, clientes, empresa, sucursales, procesarVenta } = useErp();

  // Estados del POS
  const [selectedCategoria, setSelectedCategoria] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("" );
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedClienteId, setSelectedClienteId] = useState<string>("cli_default");
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("EFECTIVO");
  const [descuento, setDescuento] = useState<number>(0);
  const [notas, setNotas] = useState<string>("");

  // Modales
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedVenta, setCompletedVenta] = useState<Venta | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Buffer de hardware pistola láser
  const barcodeBufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);

  const addToCart = (producto: Producto, cantidad = 1) => {
    if (producto.stock_actual <= 0) {
      setErrorMessage(`El producto "${producto.nombre}" no tiene stock disponible.`);
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((item) => item.producto.id === producto.id);
      if (existingIndex > -1) {
        const item = prevCart[existingIndex];
        const newQty = item.cantidad + cantidad;
        if (newQty > producto.stock_actual) {
          setErrorMessage(`Stock máximo alcanzado para "${producto.nombre}" (${producto.stock_actual} un.)`);
          setTimeout(() => setErrorMessage(null), 3000);
          return prevCart;
        }
        const updated = [...prevCart];
        updated[existingIndex] = {
          ...item,
          cantidad: newQty,
          subtotal: newQty * item.precio_unitario,
        };
        return updated;
      } else {
        return [
          ...prevCart,
          {
            producto,
            cantidad,
            precio_unitario: producto.precio_venta,
            subtotal: producto.precio_venta * cantidad,
          },
        ];
      }
    });
  };

  const updateQuantity = (productoId: string, delta: number) => {
    setCart((prevCart) => {
      return prevCart
        .map((item) => {
          if (item.producto.id === productoId) {
            const newQty = item.cantidad + delta;
            if (newQty <= 0) return null;
            if (newQty > item.producto.stock_actual) {
              setErrorMessage(`Stock máximo alcanzado (${item.producto.stock_actual} un.)`);
              setTimeout(() => setErrorMessage(null), 3000);
              return item;
            }
            return {
              ...item,
              cantidad: newQty,
              subtotal: newQty * item.precio_unitario,
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (productoId: string) => {
    setCart((prev) => prev.filter((it) => it.producto.id !== productoId));
  };

  const clearCart = () => {
    setCart([]);
    setDescuento(0);
    setNotas("");
  };

  const handleBarcodeScanned = (scannedCode: string) => {
    const trimmed = scannedCode.trim();
    if (!trimmed) return;

    const found = productos.find(
      (p) =>
        (p.codigo_barras && p.codigo_barras.trim() === trimmed) ||
        p.sku.toString() === trimmed
    );

    if (found) {
      addToCart(found, 1);
    } else {
      setErrorMessage(`No se encontró ningún producto con el código "${trimmed}".`);
      setTimeout(() => setErrorMessage(null), 3500);
    }
  };

  // Listener para pistola lectora láser
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      if (timeDiff > 300) {
        barcodeBufferRef.current = "";
      }

      if (e.key === "Enter") {
        if (barcodeBufferRef.current.length >= 3) {
          e.preventDefault();
          handleBarcodeScanned(barcodeBufferRef.current);
          barcodeBufferRef.current = "";
        }
      } else if (e.key.length === 1) {
        barcodeBufferRef.current += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [productos]);

  // Filtro de productos
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

  // Cálculos
  const subtotal = cart.reduce((acc, it) => acc + it.subtotal, 0);
  const baseImponible = Math.max(0, subtotal - Number(descuento || 0));
  const ivaCalculado = Math.round((baseImponible * 19) / 119);
  const total = baseImponible;

  const handleConfirmarVenta = async () => {
    if (cart.length === 0) {
      setErrorMessage("El carrito está vacío.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    const payload = {
      empresa_id: empresa?.id || "emp_default",
      sucursal_id: sucursales[0]?.id || "suc_default",
      cliente_id: selectedClienteId || null,
      metodo_pago: metodoPago,
      descuento: Number(descuento) || 0,
      notas: notas || null,
      items: cart.map((it) => ({
        producto_id: it.producto.id,
        cantidad: it.cantidad,
        precio_unitario: it.precio_unitario,
        costo_unitario: it.producto.precio_compra || 0,
      })),
    };

    const res = await procesarVenta(payload);
    setIsProcessing(false);

    if (res.success && res.folio) {
      const nuevaVenta: Venta = {
        id: res.ventaId || "",
        empresa_id: payload.empresa_id,
        sucursal_id: payload.sucursal_id,
        cliente_id: payload.cliente_id,
        numero_folio: res.folio,
        subtotal,
        descuento: Number(descuento) || 0,
        impuesto: ivaCalculado,
        total,
        metodo_pago: metodoPago,
        estado: "COMPLETADA",
        fecha_venta: new Date().toISOString(),
        cliente_nombre:
          clientes.find((c) => c.id === selectedClienteId)?.nombre || "Consumidor Final",
      };

      setCompletedVenta(nuevaVenta);
      setIsTicketModalOpen(true);
      clearCart();
    } else {
      setErrorMessage(res.error || "Error al procesar la venta.");
    }
  };

  return (
    <div className="p-3 sm:p-5 max-w-7xl mx-auto flex flex-col lg:flex-row gap-5 min-h-[calc(100vh-5rem)]">
      {/* SECCIÓN IZQUIERDA: Catálogo POS */}
      <div className="flex-1 flex flex-col space-y-4">
        {/* Barra superior de Búsqueda */}
        <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Buscar por SKU, Nombre o Código EAN-13..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 pl-10 pr-4 py-2 rounded-lg text-xs sm:text-sm focus:ring-1 focus:ring-slate-500 focus:outline-none"
            />
          </div>

          <button
            onClick={() => setIsScannerOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold border border-slate-300 transition-colors"
          >
            <Camera className="w-4 h-4 text-slate-600" />
            <span>Escanear Cámara</span>
          </button>
        </div>

        {/* Categorías Tabs */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategoria("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedCategoria === "ALL"
                ? "bg-[#3a4d6b] text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            Todos ({productos.length})
          </button>
          {categorias.map((cat) => {
            const isSelected = selectedCategoria === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoria(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  isSelected
                    ? "bg-[#3a4d6b] text-white shadow-xs"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {cat.nombre}
              </button>
            );
          })}
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Grid de Productos */}
        <div className="flex-1 overflow-y-auto max-h-[calc(100vh-17rem)]">
          {filteredProductos.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 bg-white rounded-lg border border-dashed border-slate-200 p-6 text-center">
              <Package className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm font-semibold text-slate-600">No se encontraron productos</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProductos.map((prod) => {
                const isOutOfStock = prod.stock_actual <= 0;
                const inCart = cart.find((it) => it.producto.id === prod.id);

                return (
                  <button
                    key={prod.id}
                    disabled={isOutOfStock}
                    onClick={() => addToCart(prod, 1)}
                    className={`relative text-left p-3.5 rounded-lg border transition-all flex flex-col justify-between select-none ${
                      isOutOfStock
                        ? "bg-slate-50 border-slate-200 opacity-40 cursor-not-allowed"
                        : inCart
                        ? "bg-slate-100 border-slate-400 shadow-xs"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs"
                    }`}
                  >
                    {inCart && (
                      <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#3a4d6b] text-white font-bold text-xs flex items-center justify-center">
                        {inCart.cantidad}
                      </span>
                    )}

                    <div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                        <span className="font-mono font-medium text-slate-600">SKU #{prod.sku}</span>
                        <span className="font-medium text-slate-500">{prod.stock_actual} u.</span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-2 leading-tight">
                        {prod.nombre}
                      </h4>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-900">
                        {formatCLP(prod.precio_venta)}
                      </span>
                      <div className="p-1 rounded bg-slate-100 text-slate-700">
                        <Plus className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* SECCIÓN DERECHA: Carrito y Pago */}
      <div className="w-full lg:w-[380px] bg-white border border-slate-200 rounded-lg shadow-xs flex flex-col justify-between overflow-hidden">
        {/* Header Carrito */}
        <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShoppingCart className="w-4 h-4 text-slate-700" />
            <h3 className="font-bold text-slate-800 text-sm">Boleta de Venta</h3>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-rose-600 hover:underline font-medium flex items-center space-x-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Vaciar</span>
            </button>
          )}
        </div>

        {/* Selector de Cliente */}
        <div className="px-4 py-2 bg-slate-50/50 border-b border-slate-200 flex items-center justify-between text-xs">
          <label className="text-slate-600 font-medium">Cliente:</label>
          <select
            value={selectedClienteId}
            onChange={(e) => setSelectedClienteId(e.target.value)}
            className="bg-white border border-slate-300 text-slate-800 rounded px-2.5 py-1 text-xs focus:outline-none max-w-[200px]"
          >
            <option value="cli_default">Consumidor Final (General)</option>
            {clientes
              .filter((c) => c.id !== "cli_default")
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
          </select>
        </div>

        {/* Lista de Items */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-2 max-h-[280px] divide-y divide-slate-100">
          {cart.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-slate-400 text-center">
              <ShoppingCart className="w-8 h-8 opacity-20 mb-2" />
              <p className="text-xs font-semibold text-slate-500">Carrito vacío</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.producto.id} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                <div className="flex-1 pr-2">
                  <p className="font-bold text-slate-900 leading-tight">{item.producto.nombre}</p>
                  <p className="text-[11px] text-slate-500">{formatCLP(item.precio_unitario)} c/u</p>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="flex items-center rounded border border-slate-300 bg-white">
                    <button
                      onClick={() => updateQuantity(item.producto.id, -1)}
                      className="p-1 text-slate-600 hover:bg-slate-100"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="px-2 font-bold text-slate-800 min-w-[20px] text-center">
                      {item.cantidad}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.producto.id, 1)}
                      className="p-1 text-slate-600 hover:bg-slate-100"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <span className="font-bold text-slate-900 min-w-[65px] text-right">
                    {formatCLP(item.subtotal)}
                  </span>

                  <button
                    onClick={() => removeFromCart(item.producto.id)}
                    className="p-1 text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Métodos de Pago & Totales */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Método de Pago
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: "EFECTIVO", label: "Efectivo", icon: Banknote },
                { id: "TARJETA_DEBITO", label: "Débito", icon: CreditCard },
                { id: "TARJETA_CREDITO", label: "Crédito", icon: CreditCard },
                { id: "TRANSFERENCIA", label: "Transferencia", icon: Smartphone },
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = metodoPago === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMetodoPago(m.id as MetodoPago)}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      isSelected
                        ? "bg-[#3a4d6b] text-white shadow-xs"
                        : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-300"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 space-y-1 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span>{formatCLP(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>IVA (19% inc.):</span>
              <span>{formatCLP(ivaCalculado)}</span>
            </div>
            <div className="flex justify-between items-baseline pt-1 border-t border-slate-200 font-bold text-slate-900">
              <span className="text-sm">TOTAL:</span>
              <span className="text-xl text-slate-900">{formatCLP(total)}</span>
            </div>
          </div>

          <button
            disabled={cart.length === 0 || isProcessing}
            onClick={handleConfirmarVenta}
            className="w-full py-3 rounded-lg bg-[#3a4d6b] hover:bg-slate-700 text-white font-bold text-sm shadow-xs transition-colors disabled:opacity-40 flex items-center justify-center space-x-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {isProcessing
                ? "Procesando en Turso..."
                : `Confirmar Venta • ${formatCLP(total)}`}
            </span>
          </button>
        </div>
      </div>

      {/* Modales */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScanned}
      />

      <TicketModal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        venta={completedVenta}
        empresa={empresa}
        cliente={clientes.find((c) => c.id === completedVenta?.cliente_id)}
        items={cart.map((c) => ({
          nombre: c.producto.nombre,
          cantidad: c.cantidad,
          precio_unitario: c.precio_unitario,
          subtotal: c.subtotal,
        }))}
      />
    </div>
  );
}
