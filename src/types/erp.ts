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
  unidad_medida: string;
  imagen_url?: string | null;
  activo: number;
  created_at?: string;
  updated_at?: string;
  categoria_nombre?: string;
}

export interface Venta {
  id: string;
  empresa_id: string;
  sucursal_id: string;
  cliente_id?: string | null;
  numero_folio: number;
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
  cantidad: number;
  precio_unitario: number;
  costo_unitario: number;
  subtotal: number;
  descuento?: number;
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
  cantidad: number;
  precio_unitario: number;
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
    cantidad: number;
    precio_unitario: number;
    costo_unitario: number;
  }[];
}

export interface HourlySalesData {
  hora: string; // ej. "08:00", "09:00"
  ventas: number;
  totalDinero: number;
  unidades: number;
}
