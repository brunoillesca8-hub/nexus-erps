export type MetodoPago = 'EFECTIVO' | 'TARJETA_DEBITO' | 'TARJETA_CREDITO' | 'TRANSFERENCIA' | 'OTRO';
export type EstadoVenta = 'COMPLETADA' | 'ANULADA' | 'PENDIENTE';
export type TipoMovimiento = 
  | 'ENTRADA_COMPRA'
  | 'SALIDA_VENTA'
  | 'AJUSTE_POSITIVO'
  | 'AJUSTE_NEGATIVO'
  | 'MERMA_DANADO'
  | 'DEVOLUCION_CLIENTE'
  | 'DEVOLUCION_PROVEEDOR';

export interface Empresa {
  id: string;
  nombre: string;
  rut_identificador?: string | null;
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
  logo_url?: string | null;
  moneda: string; // DEFAULT 'CLP'
  iva_porcentaje: number; // DEFAULT 19.00
  activo?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Sucursal {
  id: string;
  empresa_id: string;
  nombre: string;
  codigo?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  es_principal: number; // 0 or 1
  activo?: number;
  created_at?: string;
}

export interface Categoria {
  id: string;
  empresa_id: string;
  nombre: string;
  descripcion?: string | null;
  activo?: number;
  created_at?: string;
}

export interface Proveedor {
  id: string;
  empresa_id: string;
  nombre: string;
  rut_identificador?: string | null;
  contacto_nombre?: string | null;
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
  activo?: number;
  created_at?: string;
}

export interface Cliente {
  id: string;
  empresa_id: string;
  nombre: string;
  rut_identificador?: string | null;
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
  notas?: string | null;
  activo?: number;
  created_at?: string;
}

export interface Producto {
  id: string;
  empresa_id: string;
  categoria_id?: string | null;
  proveedor_id?: string | null;
  nombre: string;
  descripcion?: string | null;
  sku: number; // Numérico entero (ej: 1001)
  codigo_barras?: string | null;
  precio_compra: number;
  precio_venta: number;
  stock_actual: number;
  stock_minimo: number;
  stock_sobrante?: number; // Stock de días anteriores (añejo/liquidación)
  descuento_sobrante_default_pct?: number; // Por defecto 30%
  unidad_medida: string;
  imagen_url?: string | null;
  fecha_elaboracion?: string | null; // YYYY-MM-DD
  fecha_vencimiento?: string | null; // YYYY-MM-DD
  activo: number;
  created_at?: string;
  updated_at?: string;
  categoria_nombre?: string;
}

export type EstadoLote = 'FRESCO' | 'SOBRANTE' | 'AGOTADO' | 'MERMA';

export interface Lote {
  id: string;
  empresa_id: string;
  sucursal_id: string;
  producto_id: string;
  producto_sku: number;
  fecha_elaboracion: string;
  fecha_vencimiento?: string | null;
  cantidad_inicial: number;
  stock_actual: number;
  estado: EstadoLote;
  descuento_aplicado_pct: number;
  created_at?: string;
  updated_at?: string;
  producto_nombre?: string;
  precio_base?: number;
  precio_final?: number;
}

export interface ConfiguracionDTE {
  id: string;
  empresa_id: string;
  rut_emisor: string;
  razon_social: string;
  giro?: string | null;
  acteco: number;
  direccion_origen?: string | null;
  comuna_origen?: string | null;
  ciudad_origen?: string | null;
  ambiente: 'CERTIFICACION' | 'PRODUCCION';
  libredte_url?: string | null;
  libredte_token?: string | null;
  certificado_nombre?: string | null;
  certificado_password?: string | null;
  certificado_base64?: string | null;
  caf_boleta_39_xml?: string | null;
  caf_factura_33_xml?: string | null;
  folio_actual_boleta: number;
  folio_actual_factura: number;
  emision_automatica: number;
  updated_at?: string;
}

export interface Venta {
  id: string;
  empresa_id: string;
  sucursal_id: string;
  cliente_id?: string | null;
  numero_folio: number;
  tipo_dte?: number; // 39 = Boleta Electrónica, 33 = Factura
  folio_dte?: number | null;
  ted_xml?: string | null; // Timbre Electrónico DTE
  estado_sii?: 'NO_ENVIADO' | 'PENDIENTE' | 'ACEPTADO' | 'RECHAZADO';
  track_id_sii?: string | null;
  subtotal: number;
  descuento: number;
  impuesto: number;
  total: number;
  metodo_pago: MetodoPago;
  estado: EstadoVenta;
  notas?: string | null;
  fecha_venta: string;
  cliente_nombre?: string | null;
  items?: DetalleVenta[];
}

export interface DetalleVenta {
  id: string;
  venta_id: string;
  producto_id: string;
  lote_id?: string | null;
  cantidad: number;
  precio_unitario: number;
  costo_unitario: number;
  subtotal: number;
  descuento?: number;
  motivo_descuento?: string;
  tipo_lote?: 'FRESCO' | 'SOBRANTE';
  producto_nombre?: string;
  producto_sku?: number;
}

export interface MovimientoInventario {
  id: string;
  empresa_id: string;
  sucursal_id: string;
  producto_id: string;
  tipo: TipoMovimiento;
  cantidad: number;
  stock_anterior: number;
  stock_posterior: number;
  motivo?: string | null;
  venta_id?: string | null;
  created_at: string;
  producto_nombre?: string;
  producto_sku?: number;
}

// Interfaces auxiliares para POS y operaciones
export interface CartItem {
  producto: Producto;
  lote_id?: string;
  cantidad: number;
  precio_unitario: number;
  descuento_unitario?: number;
  descuento_porcentaje?: number;
  motivo_descuento?: string;
  tipo_lote?: 'FRESCO' | 'SOBRANTE';
  subtotal: number;
}

export interface ProcesarVentaPayload {
  empresa_id: string;
  sucursal_id: string;
  cliente_id?: string | null;
  metodo_pago: MetodoPago;
  descuento?: number;
  notas?: string | null;
  items: {
    producto_id: string;
    lote_id?: string;
    cantidad: number;
    precio_unitario: number;
    costo_unitario: number;
    descuento?: number;
    motivo_descuento?: string;
    tipo_lote?: 'FRESCO' | 'SOBRANTE';
  }[];
}

export interface HourlySalesData {
  hora: string; // ej. "08:00", "09:00"
  ventas: number;
  totalDinero: number;
  unidades: number;
}
