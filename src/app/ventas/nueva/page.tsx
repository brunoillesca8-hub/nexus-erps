"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
  X,
  ChevronUp,
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
  const [descuento, setDescuento] = useState<number>(0);
  const [notas, setNotas] = useState<string>("");

  // Modales y Drawer Móvil
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
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

  const [scanSuccessMsg, setScanSuccessMsg] = useState<string | null>(null);

  const playScanBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1900, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch {
      // Ignorar
    }
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

  // Hook universal para pistolas USB, apps Wi-Fi ("Barcode to PC") y eventos Paste
  useBarcodeListener({
    onScan: handleBarcodeScanned,
    enabled: true,
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
      setIsMobileCartOpen(false);
      clearCart();
    } else {
      setErrorMessage(res.error || "Error al procesar la venta.");
    }
  };

  // Componente de contenido del Carrito (reutilizado en Desktop y Drawer Móvil)
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
          cart.map((item) => (
            <div key={item.producto.id} className="pt-2.5 first:pt-0 flex items-center justify-between text-xs">
              <div className="flex-1 pr-2 min-w-0">
                <p className="font-bold text-slate-900 truncate leading-tight">{item.producto.nombre}</p>
                <p className="text-[11px] text-slate-500">{formatCLP(item.precio_unitario)} c/u</p>
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
          ))
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

          {/* Categorías Tabs */}
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
            {categorias.map((cat) => {
              const isSelected = selectedCategoria === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoria(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    isSelected
                      ? "bg-[#3a4d6b] text-white shadow-2xs"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  {cat.nombre}
                </button>
              );
            })}
          </div>

          {/* Alertas de Escaneo y Error */}
          {scanSuccessMsg && (
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2 animate-fadeIn font-semibold shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{scanSuccessMsg}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Grid / Lista de Productos (1 col en móvil, 2 en tablet, 3-4 en desktop) */}
          <div className="space-y-2">
            {filteredProductos.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-slate-400 bg-white rounded-lg border border-dashed border-slate-200 p-6 text-center">
                <Package className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-xs font-semibold text-slate-600">No se encontraron productos</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {filteredProductos.map((prod) => {
                  const isOutOfStock = prod.stock_actual <= 0;
                  const inCart = cart.find((it) => it.producto.id === prod.id);

                  return (
                    <div
                      key={prod.id}
                      className={`p-3 rounded-lg border transition-all flex sm:flex-col justify-between items-center sm:items-stretch gap-2 bg-white ${
                        isOutOfStock
                          ? "opacity-40 border-slate-200"
                          : inCart
                          ? "border-[#3a4d6b] shadow-2xs ring-1 ring-[#3a4d6b]/20"
                          : "border-slate-200 hover:border-slate-300 hover:shadow-2xs"
                      }`}
                    >
                      {/* Info Producto */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 text-[10px] text-slate-400 mb-0.5">
                          <span className="font-mono font-bold text-slate-600">
                            SKU #{prod.sku}
                          </span>
                          <span>•</span>
                          <span
                            className={`font-semibold ${
                              prod.stock_actual <= prod.stock_minimo
                                ? "text-amber-600"
                                : "text-slate-500"
                            }`}
                          >
                            {prod.stock_actual} u. disp.
                          </span>
                        </div>

                        {/* Nombre Completo Legible */}
                        <h4 className="font-bold text-slate-900 text-xs sm:text-sm leading-snug break-words">
                          {prod.nombre}
                        </h4>

                        <p className="text-sm font-bold text-slate-900 font-mono mt-1">
                          {formatCLP(prod.precio_venta)}
                        </p>
                      </div>

                      {/* Botón Touch Grande Añadir */}
                      <div className="flex items-center space-x-1.5 flex-shrink-0">
                        {inCart ? (
                          <div className="flex items-center rounded-lg border border-[#3a4d6b] bg-slate-50">
                            <button
                              onClick={() => updateQuantity(prod.id, -1)}
                              className="p-2 text-slate-700 hover:bg-slate-200 active:bg-slate-300 rounded-l-lg"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="px-2.5 font-bold text-[#3a4d6b] text-xs font-mono">
                              {inCart.cantidad}
                            </span>
                            <button
                              onClick={() => addToCart(prod, 1)}
                              className="p-2 text-slate-700 hover:bg-slate-200 active:bg-slate-300 rounded-r-lg"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            disabled={isOutOfStock}
                            onClick={() => addToCart(prod, 1)}
                            className="px-3.5 py-2 rounded-lg bg-[#3a4d6b] hover:bg-slate-700 text-white text-xs font-bold shadow-2xs flex items-center space-x-1 active:scale-95 transition-all disabled:opacity-40"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span className="sm:hidden">Añadir</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* SECCIÓN DESKTOP: Carrito Lateral */}
        <div className="hidden lg:block w-[340px] flex-shrink-0 bg-white border border-slate-200 rounded-lg shadow-2xs h-fit sticky top-20 overflow-hidden">
          {CartContent}
        </div>
      </div>

      {/* FLOATING BAR MÓVIL: Botón Ver Carrito Flotante */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-14 left-0 right-0 p-3 z-30 pointer-events-none">
          <button
            onClick={() => setIsMobileCartOpen(true)}
            className="w-full py-3 px-4 rounded-xl bg-[#3a4d6b] text-white font-bold text-xs shadow-xl flex items-center justify-between pointer-events-auto active:scale-98 transition-all animate-slideUp"
          >
            <div className="flex items-center space-x-2">
              <div className="p-1 rounded-full bg-white/20">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <span>Ver Carrito ({totalItemsCount} items)</span>
            </div>
            <div className="flex items-center space-x-1.5 font-mono text-sm">
              <span>{formatCLP(total)}</span>
              <ChevronUp className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* DRAWER MÓVIL: Carrito Desplegable en Pantallas Pequeñas */}
      {isMobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-fadeIn">
          <div className="bg-white rounded-t-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-100 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-700">Resumen de Venta</span>
              <button
                onClick={() => setIsMobileCartOpen(false)}
                className="p-1 rounded-full text-slate-500 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto">{CartContent}</div>
          </div>
        </div>
      )}

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
