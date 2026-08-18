"use client";

import React, { useState, useRef, useMemo, useCallback } from "react";
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
  Package,
  X,
  ChevronUp,
  Percent,
  Tag,
  Cake,
} from "lucide-react";
import { useErp } from "@/context/erp-context";
import { formatCLP, matchesSearch } from "@/lib/utils";
import BarcodeScannerModal from "@/components/BarcodeScannerModal";
import TicketModal from "@/components/TicketModal";
import { useBarcodeListener } from "@/hooks/useBarcodeListener";
import type { Producto, CartItem, MetodoPago, Venta } from "@/types/erp";

export default function PosPage() {
  const { productos, categorias, clientes, empresa, sucursales, procesarVenta } = useErp();

  // Estados del POS
  const [selectedCategoria, setSelectedCategoria] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedClienteId, setSelectedClienteId] = useState<string>("cli_default");
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("EFECTIVO");
  const [descuentoGeneral, setDescuentoGeneral] = useState<number>(0);
  const [notas, setNotas] = useState<string>("");

  // Modales y Drawer Móvil
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedVenta, setCompletedVenta] = useState<Venta | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scanSuccessMsg, setScanSuccessMsg] = useState<string | null>(null);

  // Modal de descuento individual por item
  const [itemDescuentoModal, setItemDescuentoModal] = useState<{
    item: CartItem;
    index: number;
  } | null>(null);

  const playScanBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(2200, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.09);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.09);
    } catch {
      // Ignorar
    }
  };

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
        const descUnit = item.descuento_unitario || 0;
        updated[existingIndex] = {
          ...item,
          cantidad: newQty,
          subtotal: Math.max(0, (item.precio_unitario - descUnit) * newQty),
        };
        return updated;
      } else {
        return [
          ...prevCart,
          {
            producto,
            cantidad,
            precio_unitario: producto.precio_venta,
            descuento_unitario: 0,
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
            const descUnit = item.descuento_unitario || 0;
            return {
              ...item,
              cantidad: newQty,
              subtotal: Math.max(0, (item.precio_unitario - descUnit) * newQty),
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const applyItemDiscount = (
    productoId: string,
    descuentoUnitario: number,
    motivo?: string,
    porcentaje?: number
  ) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.producto.id === productoId) {
          const descVal = Math.min(item.precio_unitario, Math.max(0, descuentoUnitario));
          return {
            ...item,
            descuento_unitario: descVal,
            descuento_porcentaje: porcentaje,
            motivo_descuento: motivo,
            subtotal: Math.max(0, (item.precio_unitario - descVal) * item.cantidad),
          };
        }
        return item;
      })
    );
    setItemDescuentoModal(null);
  };

  const removeFromCart = (productoId: string) => {
    setCart((prev) => prev.filter((it) => it.producto.id !== productoId));
  };

  const clearCart = () => {
    setCart([]);
    setDescuentoGeneral(0);
    setNotas("");
  };

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
        addToCart(found, 1);
        playScanBeep();
        setScanSuccessMsg(`✅ Agregado: ${found.nombre} (${formatCLP(found.precio_venta)})`);
        setTimeout(() => setScanSuccessMsg(null), 3000);
      } else {
        setErrorMessage(`No se encontró ningún producto con el código "${raw}".`);
        setTimeout(() => setErrorMessage(null), 3500);
      }
    },
    [productos]
  );

  // Hook universal para pistolas USB y apps Wi-Fi
  useBarcodeListener({
    onScan: handleBarcodeScanned,
    enabled: !isScannerOpen && !itemDescuentoModal,
    maxKeyInterval: 600,
  });

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
  const totalItemsCount = cart.reduce((acc, it) => acc + it.cantidad, 0);
  const subtotal = cart.reduce((acc, it) => acc + it.subtotal, 0);
  const totalDescuentosItems = cart.reduce(
    (acc, it) => acc + (it.descuento_unitario || 0) * it.cantidad,
    0
  );
  const baseImponible = Math.max(0, subtotal - Number(descuentoGeneral || 0));
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
      descuento: Number(descuentoGeneral) || 0,
      notas: notas || null,
      items: cart.map((it) => ({
        producto_id: it.producto.id,
        cantidad: it.cantidad,
        precio_unitario: it.precio_unitario,
        costo_unitario: it.producto.precio_compra || 0,
        descuento: it.descuento_unitario || 0,
        motivo_descuento: it.motivo_descuento || undefined,
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
        descuento: (Number(descuentoGeneral) || 0) + totalDescuentosItems,
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
      setIsMobileCartOpen(false);
      clearCart();
    } else {
      setErrorMessage(res.error || "Error al procesar la venta.");
    }
  };

  // Componente de contenido del Carrito
  const CartContent = (
    <div className="flex flex-col h-full justify-between">
      {/* Header Carrito */}
      <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ShoppingCart className="w-4 h-4 text-slate-700" />
          <h3 className="font-bold text-slate-800 text-sm">Boleta de Venta</h3>
          {totalItemsCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-[#3a4d6b] text-white text-[10px] font-bold">
              {totalItemsCount} u.
            </span>
          )}
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
      <div className="px-3.5 py-2 bg-slate-50/50 border-b border-slate-200 flex items-center justify-between text-xs">
        <label className="text-slate-600 font-medium">Cliente:</label>
        <select
          value={selectedClienteId}
          onChange={(e) => setSelectedClienteId(e.target.value)}
          className="bg-white border border-slate-300 text-slate-800 rounded px-2 py-1 text-xs focus:outline-none max-w-[180px]"
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
      <div className="flex-1 overflow-y-auto p-3.5 space-y-2 max-h-[300px] lg:max-h-[320px] divide-y divide-slate-100">
        {cart.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-slate-400 text-center">
            <ShoppingCart className="w-8 h-8 opacity-20 mb-2" />
            <p className="text-xs font-semibold text-slate-500">Carrito vacío</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Toca un producto para añadirlo</p>
          </div>
        ) : (
          cart.map((item, idx) => {
            const hasDiscount = item.descuento_unitario && item.descuento_unitario > 0;
            const precioEfectivo = item.precio_unitario - (item.descuento_unitario || 0);

            return (
              <div key={item.producto.id} className="pt-2.5 first:pt-0 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex-1 pr-2 min-w-0">
                    <p className="font-bold text-slate-900 truncate leading-tight">{item.producto.nombre}</p>
                    <div className="flex items-center space-x-1.5 text-[11px] text-slate-500">
                      {hasDiscount ? (
                        <>
                          <span className="line-through text-slate-400 font-mono">
                            {formatCLP(item.precio_unitario)}
                          </span>
                          <span className="font-bold text-emerald-700 font-mono">
                            {formatCLP(precioEfectivo)} c/u
                          </span>
                        </>
                      ) : (
                        <span>{formatCLP(item.precio_unitario)} c/u</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 flex-shrink-0">
                    <div className="flex items-center rounded border border-slate-300 bg-white">
                      <button
                        onClick={() => updateQuantity(item.producto.id, -1)}
                        className="p-1.5 text-slate-600 hover:bg-slate-100 active:bg-slate-200"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2 font-bold text-slate-800 min-w-[20px] text-center text-xs">
                        {item.cantidad}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.producto.id, 1)}
                        className="p-1.5 text-slate-600 hover:bg-slate-100 active:bg-slate-200"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <span className="font-bold text-slate-900 min-w-[60px] text-right font-mono">
                      {formatCLP(item.subtotal)}
                    </span>

                    <button
                      onClick={() => removeFromCart(item.producto.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 ml-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Botón de Descuento por Ítem (ej. Pastelería del día anterior) */}
                <div className="flex items-center justify-between text-[10px] pl-1">
                  {hasDiscount ? (
                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 rounded font-semibold flex items-center space-x-1">
                      <Tag className="w-3 h-3" />
                      <span>{item.motivo_descuento || `Desc: -${formatCLP(item.descuento_unitario || 0)}`}</span>
                    </span>
                  ) : (
                    <span className="text-slate-400">Sin descuento aplicado</span>
                  )}

                  <button
                    type="button"
                    onClick={() => setItemDescuentoModal({ item, index: idx })}
                    className="text-[#3a4d6b] hover:underline font-bold flex items-center space-x-0.5"
                  >
                    <Percent className="w-3 h-3" />
                    <span>{hasDiscount ? "Modificar Desc." : "+ Descuento (Día Anterior)"}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Métodos de Pago & Totales */}
      <div className="p-3.5 bg-slate-50 border-t border-slate-200 space-y-2.5">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
            Método de Pago
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: "EFECTIVO", label: "Efectivo", icon: Banknote },
              { id: "TARJETA_DEBITO", label: "Débito", icon: CreditCard },
              { id: "TARJETA_CREDITO", label: "Crédito", icon: CreditCard },
              { id: "TRANSFERENCIA", label: "Transf.", icon: Smartphone },
            ].map((m) => {
              const Icon = m.icon;
              const isSelected = metodoPago === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMetodoPago(m.id as MetodoPago)}
                  className={`flex items-center justify-center space-x-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    isSelected
                      ? "bg-[#3a4d6b] text-white shadow-2xs"
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

        <div className="pt-1.5 border-t border-slate-200 space-y-1 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal:</span>
            <span className="font-mono">{formatCLP(subtotal)}</span>
          </div>
          {totalDescuentosItems > 0 && (
            <div className="flex justify-between text-emerald-700 font-semibold">
              <span>Descuentos Ítems:</span>
              <span className="font-mono">-{formatCLP(totalDescuentosItems)}</span>
            </div>
          )}
          <div className="flex justify-between text-slate-600">
            <span>IVA (19% inc.):</span>
            <span className="font-mono">{formatCLP(ivaCalculado)}</span>
          </div>
          <div className="flex justify-between items-baseline pt-1 border-t border-slate-200 font-bold text-slate-900">
            <span className="text-xs">TOTAL:</span>
            <span className="text-lg font-mono text-slate-900">{formatCLP(total)}</span>
          </div>
        </div>

        <button
          disabled={cart.length === 0 || isProcessing}
          onClick={handleConfirmarVenta}
          className="w-full py-3 rounded-lg bg-[#3a4d6b] hover:bg-slate-700 text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-40 flex items-center justify-center space-x-2 active:scale-98"
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
  );

  return (
    <div className="space-y-3 max-w-full">
      {/* SECCIÓN PRINCIPAL: Catálogo de Productos POS */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 flex flex-col space-y-3 min-w-0">
          {/* Barra de Búsqueda y Botón Escáner */}
          <div className="bg-white border border-slate-200 p-2.5 rounded-lg shadow-2xs flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-cyan-600 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por SKU, Nombre o Código..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 pl-9 pr-3 py-1.5 rounded-lg text-xs sm:text-sm focus:bg-white focus:ring-1 focus:ring-slate-500 focus:outline-none"
              />
            </div>

            <button
              onClick={() => setIsScannerOpen(true)}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold border border-slate-300 flex-shrink-0 transition-colors"
            >
              <Camera className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Escanear</span>
            </button>
          </div>

          {/* Categorías Tabs (Incluye Pastelería destacada) */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategoria("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategoria === "ALL"
                  ? "bg-[#3a4d6b] text-white shadow-2xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              Todos ({productos.length})
            </button>
            {categorias.map((c) => {
              const isPasteleria = c.id === "cat_pasteleria" || c.nombre.toLowerCase().includes("pastel");
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategoria(c.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center space-x-1 ${
                    selectedCategoria === c.id
                      ? "bg-[#3a4d6b] text-white shadow-2xs"
                      : isPasteleria
                      ? "bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200 font-bold"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  {isPasteleria && <Cake className="w-3.5 h-3.5 text-amber-600" />}
                  <span>{c.nombre}</span>
                </button>
              );
            })}
          </div>

          {/* Toast de confirmación de escaneo */}
          {scanSuccessMsg && (
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-2 animate-fadeIn shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{scanSuccessMsg}</span>
            </div>
          )}

          {/* Mensaje de Error */}
          {errorMessage && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between animate-fadeIn">
              <span>{errorMessage}</span>
              <button onClick={() => setErrorMessage(null)}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Grid de Productos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5 flex-1 overflow-y-auto">
            {filteredProductos.length === 0 ? (
              <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-400 text-center bg-white rounded-lg border border-dashed border-slate-200">
                <Package className="w-10 h-10 opacity-30 mb-2" />
                <p className="text-xs font-semibold text-slate-600">No se encontraron productos</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Prueba con otra búsqueda o categoría</p>
              </div>
            ) : (
              filteredProductos.map((p) => {
                const stockActual = Number(p.stock_actual) || 0;
                const isOutOfStock = stockActual <= 0;
                const isLowStock = stockActual <= p.stock_minimo && !isOutOfStock;

                return (
                  <div
                    key={p.id}
                    onClick={() => !isOutOfStock && addToCart(p)}
                    className={`bg-white border rounded-lg p-3 flex flex-col justify-between transition-all cursor-pointer select-none relative ${
                      isOutOfStock
                        ? "border-slate-200 opacity-50 cursor-not-allowed bg-slate-50"
                        : "border-slate-200 hover:border-[#3a4d6b] hover:shadow-xs active:scale-98"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1 font-mono">
                        <span className="font-bold text-slate-600">{p.codigo_barras || p.sku}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            isOutOfStock
                              ? "bg-rose-50 text-rose-700"
                              : isLowStock
                              ? "bg-amber-50 text-amber-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {stockActual} u.
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-xs leading-snug break-words">
                        {p.nombre}
                      </h4>
                    </div>

                    <div className="flex items-baseline justify-between mt-3 pt-2 border-t border-slate-100">
                      <span className="text-xs font-bold font-mono text-slate-900">
                        {formatCLP(p.precio_venta)}
                      </span>
                      <button
                        disabled={isOutOfStock}
                        className={`p-1.5 rounded-md transition-colors ${
                          isOutOfStock
                            ? "bg-slate-100 text-slate-400"
                            : "bg-[#3a4d6b] text-white hover:bg-slate-700"
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* PANEL DERECHO DESKTOP: Carrito Fijo */}
        <div className="hidden lg:flex w-80 xl:w-96 bg-white border border-slate-200 rounded-lg shadow-2xs flex-col flex-shrink-0">
          {CartContent}
        </div>
      </div>

      {/* BARRA FLOTANTE MÓVIL (Bottom Sticky Bar) */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-14 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-xl z-40">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => setIsMobileCartOpen(true)}
              className="flex items-center space-x-2 text-slate-800"
            >
              <div className="relative">
                <ShoppingCart className="w-5 h-5 text-[#3a4d6b]" />
                <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {totalItemsCount}
                </span>
              </div>
              <div className="text-left">
                <span className="text-[10px] text-slate-400 block font-semibold">Total a Cobrar</span>
                <span className="font-bold text-sm font-mono text-slate-900">{formatCLP(total)}</span>
              </div>
              <ChevronUp className="w-4 h-4 text-slate-400" />
            </button>

            <button
              disabled={isProcessing}
              onClick={() => setIsMobileCartOpen(true)}
              className="px-4 py-2 rounded-lg bg-[#3a4d6b] text-white font-bold text-xs shadow-xs"
            >
              Ver Boleta
            </button>
          </div>
        </div>
      )}

      {/* DRAWER MÓVIL COMPLETO DE CARRITO */}
      {isMobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-fadeIn">
          <div className="bg-white rounded-t-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-slate-200 bg-slate-50">
              <span className="font-bold text-xs text-slate-700">Resumen de Venta</span>
              <button
                onClick={() => setIsMobileCartOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{CartContent}</div>
          </div>
        </div>
      )}

      {/* MODAL DESCUENTO INDIVIDUAL POR PRODUCTO (Pastelería día anterior, etc.) */}
      {itemDescuentoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-sm bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center space-x-2">
                <Tag className="w-4 h-4 text-[#3a4d6b]" />
                <h3 className="font-bold text-xs sm:text-sm text-slate-900">
                  Descuento por Producto
                </h3>
              </div>
              <button
                onClick={() => setItemDescuentoModal(null)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <span className="font-bold text-slate-900 block truncate">
                  {itemDescuentoModal.item.producto.nombre}
                </span>
                <span className="text-slate-500">
                  Precio normal: <b className="font-mono">{formatCLP(itemDescuentoModal.item.precio_unitario)}</b>
                </span>
              </div>

              {/* Botones de Descuento Rápido (Pastelería Día Anterior) */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 block">
                  Descuentos Rápidos (Pastelería / Rotación):
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const desc = Math.round(itemDescuentoModal.item.precio_unitario * 0.3);
                      applyItemDiscount(
                        itemDescuentoModal.item.producto.id,
                        desc,
                        "Pastel día anterior (-30%)",
                        30
                      );
                    }}
                    className="p-2 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold text-left transition-colors"
                  >
                    <span>🍰 Día Anterior -30%</span>
                    <span className="block text-[10px] text-amber-700 font-mono font-normal">
                      Queda en: {formatCLP(itemDescuentoModal.item.precio_unitario * 0.7)}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const desc = Math.round(itemDescuentoModal.item.precio_unitario * 0.2);
                      applyItemDiscount(
                        itemDescuentoModal.item.producto.id,
                        desc,
                        "Pastel día anterior (-20%)",
                        20
                      );
                    }}
                    className="p-2 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold text-left transition-colors"
                  >
                    <span>🍰 Día Anterior -20%</span>
                    <span className="block text-[10px] text-amber-700 font-mono font-normal">
                      Queda en: {formatCLP(itemDescuentoModal.item.precio_unitario * 0.8)}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const desc = Math.round(itemDescuentoModal.item.precio_unitario * 0.5);
                      applyItemDiscount(
                        itemDescuentoModal.item.producto.id,
                        desc,
                        "Liquidación 50%",
                        50
                      );
                    }}
                    className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-900 text-xs font-bold text-left transition-colors"
                  >
                    <span>🔥 Liquidación -50%</span>
                    <span className="block text-[10px] text-rose-700 font-mono font-normal">
                      Queda en: {formatCLP(itemDescuentoModal.item.precio_unitario * 0.5)}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      applyItemDiscount(itemDescuentoModal.item.producto.id, 0);
                    }}
                    className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold text-left transition-colors"
                  >
                    <span>↺ Sin Descuento</span>
                    <span className="block text-[10px] text-slate-500 font-mono font-normal">
                      Precio completo
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Lector de Cámara */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScanned}
        title="Escanear Producto para la Venta"
      />

      {/* Modal Ticket Térmico */}
      <TicketModal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        venta={completedVenta}
        empresa={empresa}
        items={completedVenta?.items?.map((it) => ({
          nombre: it.producto_nombre || "Producto",
          cantidad: it.cantidad,
          precio_unitario: it.precio_unitario,
          descuento_unitario: it.descuento ? Math.round(it.descuento / it.cantidad) : 0,
          subtotal: it.subtotal,
        }))}
      />
    </div>
  );
}
