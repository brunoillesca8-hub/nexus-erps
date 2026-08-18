import { createClient, Client } from "@libsql/client";

let clientInstance: Client | null = null;

export function getTursoClient(): Client {
  if (clientInstance) {
    return clientInstance;
  }

  const url = process.env.TURSO_DATABASE_URL || "file:nexus_erp.db";
  const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

  clientInstance = createClient({
    url,
    authToken,
  });

  return clientInstance;
}

export const turso = getTursoClient();

/**
 * Inicializa las tablas e índices en Turso / LibSQL de forma segura
 */
export async function initDatabase(): Promise<{ success: boolean; message: string }> {
  const db = getTursoClient();

  const schemaStatements = [
    `PRAGMA foreign_keys = ON;`,

    `CREATE TABLE IF NOT EXISTS empresas (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      rut_identificador TEXT,
      telefono TEXT,
      email TEXT,
      direccion TEXT,
      logo_url TEXT,
      moneda TEXT DEFAULT 'CLP',
      iva_porcentaje REAL DEFAULT 19.00,
      activo INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS sucursales (
      id TEXT PRIMARY KEY,
      empresa_id TEXT NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
      nombre TEXT NOT NULL,
      codigo TEXT,
      direccion TEXT,
      telefono TEXT,
      es_principal INTEGER DEFAULT 0,
      activo INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS categorias (
      id TEXT PRIMARY KEY,
      empresa_id TEXT NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      activo INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS proveedores (
      id TEXT PRIMARY KEY,
      empresa_id TEXT NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
      nombre TEXT NOT NULL,
      rut_identificador TEXT,
      contacto_nombre TEXT,
      telefono TEXT,
      email TEXT,
      direccion TEXT,
      activo INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS clientes (
      id TEXT PRIMARY KEY,
      empresa_id TEXT NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
      nombre TEXT NOT NULL,
      rut_identificador TEXT,
      telefono TEXT,
      email TEXT,
      direccion TEXT,
      notas TEXT,
      activo INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS productos (
      id TEXT PRIMARY KEY,
      empresa_id TEXT NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
      categoria_id TEXT REFERENCES categorias(id) ON DELETE SET NULL,
      proveedor_id TEXT REFERENCES proveedores(id) ON DELETE SET NULL,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      sku INTEGER NOT NULL,
      codigo_barras TEXT,
      precio_compra REAL NOT NULL DEFAULT 0,
      precio_venta REAL NOT NULL DEFAULT 0,
      stock_actual INTEGER NOT NULL DEFAULT 0,
      stock_minimo INTEGER NOT NULL DEFAULT 5,
      unidad_medida TEXT DEFAULT 'unidad',
      imagen_url TEXT,
      fecha_elaboracion TEXT,
      fecha_vencimiento TEXT,
      activo INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE INDEX IF NOT EXISTS idx_prod_barcode ON productos(codigo_barras);`,
    `CREATE INDEX IF NOT EXISTS idx_prod_sku ON productos(sku);`,
    `CREATE INDEX IF NOT EXISTS idx_prod_nombre ON productos(nombre);`,
    `CREATE INDEX IF NOT EXISTS idx_prod_empresa ON productos(empresa_id);`,
    `CREATE INDEX IF NOT EXISTS idx_prod_vencimiento ON productos(fecha_vencimiento);`,

    `CREATE TABLE IF NOT EXISTS ventas (
      id TEXT UNIQUE NOT NULL,
      empresa_id TEXT NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
      sucursal_id TEXT NOT NULL REFERENCES sucursales(id),
      cliente_id TEXT REFERENCES clientes(id) ON DELETE SET NULL,
      numero_folio INTEGER PRIMARY KEY AUTOINCREMENT,
      subtotal REAL NOT NULL DEFAULT 0,
      descuento REAL DEFAULT 0,
      impuesto REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      metodo_pago TEXT CHECK(metodo_pago IN ('EFECTIVO', 'TARJETA_DEBITO', 'TARJETA_CREDITO', 'TRANSFERENCIA', 'OTRO')) DEFAULT 'EFECTIVO',
      estado TEXT CHECK(estado IN ('COMPLETADA', 'ANULADA', 'PENDIENTE')) DEFAULT 'COMPLETADA',
      notas TEXT,
      fecha_venta TEXT DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE INDEX IF NOT EXISTS idx_ventas_empresa_fecha ON ventas(empresa_id, fecha_venta);`,
    `CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha_venta);`,

    `CREATE TABLE IF NOT EXISTS detalle_ventas (
      id TEXT PRIMARY KEY,
      venta_id TEXT NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
      producto_id TEXT NOT NULL REFERENCES productos(id),
      cantidad INTEGER NOT NULL,
      precio_unitario REAL NOT NULL,
      costo_unitario REAL NOT NULL,
      subtotal REAL NOT NULL,
      descuento REAL DEFAULT 0,
      motivo_descuento TEXT
    );`,

    `CREATE INDEX IF NOT EXISTS idx_detalle_venta ON detalle_ventas(venta_id);`,

    `CREATE TABLE IF NOT EXISTS movimientos_inventario (
      id TEXT PRIMARY KEY,
      empresa_id TEXT NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
      sucursal_id TEXT NOT NULL REFERENCES sucursales(id),
      producto_id TEXT NOT NULL REFERENCES productos(id),
      tipo TEXT CHECK(tipo IN ('ENTRADA_COMPRA', 'SALIDA_VENTA', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO', 'MERMA_DANADO', 'DEVOLUCION_CLIENTE', 'DEVOLUCION_PROVEEDOR')) NOT NULL,
      cantidad INTEGER NOT NULL,
      stock_anterior INTEGER NOT NULL,
      stock_posterior INTEGER NOT NULL,
      motivo TEXT,
      venta_id TEXT REFERENCES ventas(id) ON DELETE SET NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE INDEX IF NOT EXISTS idx_mov_prod_fecha ON movimientos_inventario(producto_id, created_at);`,

    `CREATE TABLE IF NOT EXISTS lotes (
      id TEXT PRIMARY KEY,
      empresa_id TEXT NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
      sucursal_id TEXT NOT NULL REFERENCES sucursales(id),
      producto_id TEXT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
      producto_sku INTEGER NOT NULL,
      fecha_elaboracion TEXT NOT NULL,
      fecha_vencimiento TEXT,
      cantidad_inicial INTEGER NOT NULL,
      stock_actual INTEGER NOT NULL,
      estado TEXT CHECK(estado IN ('FRESCO', 'SOBRANTE', 'AGOTADO', 'MERMA')) DEFAULT 'FRESCO',
      descuento_aplicado_pct REAL DEFAULT 0.0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE INDEX IF NOT EXISTS idx_lotes_prod ON lotes(producto_id, estado);`,
    `CREATE INDEX IF NOT EXISTS idx_lotes_sku ON lotes(producto_sku);`,
    `CREATE INDEX IF NOT EXISTS idx_lotes_estado ON lotes(estado);`,
    `CREATE INDEX IF NOT EXISTS idx_lotes_fecha_elab ON lotes(fecha_elaboracion);`,

    `INSERT OR IGNORE INTO empresas (id, nombre, rut_identificador, direccion, email, telefono, moneda, iva_porcentaje)
     VALUES ('emp_default', 'Mi Negocio Comercial', '76.123.456-7', 'Calle Comercial 123', 'contacto@minegocio.cl', '+56 9 1234 5678', 'CLP', 19.00);`,

    `INSERT OR IGNORE INTO sucursales (id, empresa_id, nombre, codigo, es_principal)
     VALUES ('suc_default', 'emp_default', 'Local Principal', 'LOC-01', 1);`,

    `INSERT OR IGNORE INTO categorias (id, empresa_id, nombre, descripcion)
     VALUES 
       ('cat_pasteleria', 'emp_default', 'Pastelería & Elaboración Propia', 'Tortas, pasteles, masas dulces, panes y empanadas artesanales'),
       ('cat_bebidas', 'emp_default', 'Bebidas y Líquidos', 'Aguas, jugos, bebidas, cervezas y licores'),
       ('cat_abarrotes', 'emp_default', 'Abarrotes Generales', 'Arroz, harinas, aceites, azúcar, sal y granos'),
       ('cat_lacteos', 'emp_default', 'Lácteos y Quesos', 'Leches, quesos, mantequillas, cremas y yogures'),
       ('cat_snacks', 'emp_default', 'Snacks y Dulces', 'Chocolates, galletas, papas fritas y confites'),
       ('cat_limpieza', 'emp_default', 'Limpieza y Hogar', 'Detergentes, lavalozas, cloros, papeles y bolsas'),
       ('cat_mascotas', 'emp_default', 'Mascotas', 'Alimentos para perros, gatos y accesorios');`,

    `INSERT OR IGNORE INTO clientes (id, empresa_id, nombre, rut_identificador, telefono, email, direccion)
     VALUES ('cli_default', 'emp_default', 'Cliente General / Consumidor Final', '66.666.666-6', '+56 9 0000 0000', 'general@caja.cl', 'Venta en Mesón');`,

    `CREATE TABLE IF NOT EXISTS configuracion_dte (
      id TEXT PRIMARY KEY,
      empresa_id TEXT NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
      rut_emisor TEXT NOT NULL,
      razon_social TEXT NOT NULL,
      giro TEXT,
      acteco INTEGER DEFAULT 154120,
      direccion_origen TEXT,
      comuna_origen TEXT,
      ciudad_origen TEXT,
      ambiente TEXT CHECK(ambiente IN ('CERTIFICACION', 'PRODUCCION')) DEFAULT 'CERTIFICACION',
      libredte_url TEXT DEFAULT 'https://libredte.cl',
      libredte_token TEXT,
      certificado_nombre TEXT,
      certificado_password TEXT,
      certificado_base64 TEXT,
      caf_boleta_39_xml TEXT,
      caf_factura_33_xml TEXT,
      folio_actual_boleta INTEGER DEFAULT 1,
      folio_actual_factura INTEGER DEFAULT 1,
      emision_automatica INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );`,

    `INSERT OR IGNORE INTO configuracion_dte (
      id, empresa_id, rut_emisor, razon_social, giro, acteco, direccion_origen, comuna_origen, ciudad_origen, ambiente, emision_automatica
     ) VALUES (
      'dte_default', 'emp_default', '76.123.456-7', 'Panadería y Pastelería Artesanal SpA', 
      'Elaboración y venta de productos de panadería, pastelería y rotisería', 154120, 
      'Calle Comercial 123', 'Valdivia', 'Valdivia', 'CERTIFICACION', 0
     );`
  ];

  try {
    for (const statement of schemaStatements) {
      await db.execute(statement);
    }

    // Migraciones seguras de columnas nuevas en caso de bases existentes
    try {
      await db.execute("ALTER TABLE productos ADD COLUMN fecha_elaboracion TEXT");
    } catch {
      // Columna ya existe
    }

    try {
      await db.execute("ALTER TABLE productos ADD COLUMN fecha_vencimiento TEXT");
    } catch {
      // Columna ya existe
    }

    try {
      await db.execute("ALTER TABLE productos ADD COLUMN descuento_sobrante_default_pct REAL DEFAULT 30.0");
    } catch {
      // Columna ya existe
    }

    try {
      await db.execute("ALTER TABLE detalle_ventas ADD COLUMN descuento REAL DEFAULT 0");
    } catch {
      // Columna ya existe
    }

    try {
      await db.execute("ALTER TABLE detalle_ventas ADD COLUMN motivo_descuento TEXT");
    } catch {
      // Columna ya existe
    }

    try {
      await db.execute("ALTER TABLE detalle_ventas ADD COLUMN lote_id TEXT");
    } catch {
      // Columna ya existe
    }

    try {
      await db.execute("ALTER TABLE detalle_ventas ADD COLUMN tipo_lote TEXT DEFAULT 'FRESCO'");
    } catch {
      // Columna ya existe
    }

    try {
      await db.execute("ALTER TABLE productos ADD COLUMN stock_sobrante INTEGER DEFAULT 0");
    } catch {
      // Columna ya existe
    }

    try {
      await db.execute("ALTER TABLE ventas ADD COLUMN tipo_dte INTEGER DEFAULT 39");
    } catch {
      // Columna ya existe
    }

    try {
      await db.execute("ALTER TABLE ventas ADD COLUMN folio_dte INTEGER");
    } catch {
      // Columna ya existe
    }

    try {
      await db.execute("ALTER TABLE ventas ADD COLUMN ted_xml TEXT");
    } catch {
      // Columna ya existe
    }

    try {
      await db.execute("ALTER TABLE ventas ADD COLUMN estado_sii TEXT DEFAULT 'NO_ENVIADO'");
    } catch {
      // Columna ya existe
    }

    try {
      await db.execute("ALTER TABLE ventas ADD COLUMN track_id_sii TEXT");
    } catch {
      // Columna ya existe
    }

    return { success: true, message: "Base de datos Turso / LibSQL inicializada correctamente." };
  } catch (error: any) {
    console.error("Error al inicializar la base de datos:", error);
    return { success: false, message: error.message || "Error al inicializar" };
  }
}
