-- ==============================================================================
-- ERP + CRM + INVENTARIO MULTI-TENANT: ESQUEMA DE BASE DE DATOS SUPABASE POSTGRESQL
-- (SCRIPT 100% IDEMPOTENTE / RE-EJECUTABLE SIN ERRORES)
-- ==============================================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS
DO $$ BEGIN
    CREATE TYPE rol_usuario AS ENUM ('SUPERADMIN', 'ADMIN', 'VENDEDOR', 'INVENTARIO', 'ANALISTA');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE estado_venta AS ENUM ('COMPLETADA', 'ANULADA', 'PENDIENTE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE metodo_pago_tipo AS ENUM ('EFECTIVO', 'TARJETA_DEBITO', 'TARJETA_CREDITO', 'TRANSFERENCIA', 'OTRO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE tipo_movimiento AS ENUM (
        'ENTRADA_COMPRA',
        'SALIDA_VENTA',
        'DEVOLUCION_CLIENTE',
        'DEVOLUCION_PROVEEDOR',
        'AJUSTE_POSITIVO',
        'AJUSTE_NEGATIVO',
        'MERMA_DANADO',
        'TRANSFERENCIA_SALIDA',
        'TRANSFERENCIA_ENTRADA'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. TABLAS BASE
-- Empresas (Tenants)
CREATE TABLE IF NOT EXISTS empresas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) NOT NULL,
    rut_identificador VARCHAR(50),
    telefono VARCHAR(50),
    email VARCHAR(255),
    direccion TEXT,
    logo_url TEXT,
    moneda VARCHAR(10) DEFAULT 'CLP',
    iva_porcentaje NUMERIC(5, 2) DEFAULT 19.00,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Sucursales
CREATE TABLE IF NOT EXISTS sucursales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    codigo VARCHAR(50),
    direccion TEXT,
    telefono VARCHAR(50),
    es_principal BOOLEAN DEFAULT false,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Perfiles de usuario (espejo de auth.users)
CREATE TABLE IF NOT EXISTS usuarios_perfil (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre_completo VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Relación Multi-empresa (Miembros / Roles)
CREATE TABLE IF NOT EXISTS miembros_empresa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES usuarios_perfil(id) ON DELETE CASCADE,
    rol rol_usuario NOT NULL DEFAULT 'VENDEDOR',
    sucursal_asignada_id UUID REFERENCES sucursales(id) ON DELETE SET NULL,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (empresa_id, usuario_id)
);

-- Categorías
CREATE TABLE IF NOT EXISTS categorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Proveedores
CREATE TABLE IF NOT EXISTS proveedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    rut_identificador VARCHAR(50),
    contacto_nombre VARCHAR(150),
    telefono VARCHAR(50),
    email VARCHAR(255),
    direccion TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Clientes
CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    rut_identificador VARCHAR(50),
    telefono VARCHAR(50),
    email VARCHAR(255),
    direccion TEXT,
    notas TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Productos
CREATE TABLE IF NOT EXISTS productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
    proveedor_id UUID REFERENCES proveedores(id) ON DELETE SET NULL,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    sku VARCHAR(100) NOT NULL,
    codigo_barras VARCHAR(100),
    precio_compra NUMERIC(14, 2) NOT NULL DEFAULT 0,
    precio_venta NUMERIC(14, 2) NOT NULL DEFAULT 0,
    stock_actual INT NOT NULL DEFAULT 0,
    stock_minimo INT NOT NULL DEFAULT 5,
    unidad_medida VARCHAR(50) DEFAULT 'unidad',
    imagen_url TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (empresa_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_productos_empresa_barcode ON productos(empresa_id, codigo_barras);
CREATE INDEX IF NOT EXISTS idx_productos_empresa_sku ON productos(empresa_id, sku);
CREATE INDEX IF NOT EXISTS idx_productos_empresa_nombre ON productos(empresa_id, nombre);

-- Stock por Sucursal
CREATE TABLE IF NOT EXISTS stock_sucursal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    sucursal_id UUID NOT NULL REFERENCES sucursales(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    stock_actual INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (sucursal_id, producto_id)
);

-- Ventas
CREATE TABLE IF NOT EXISTS ventas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    sucursal_id UUID NOT NULL REFERENCES sucursales(id),
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    usuario_id UUID REFERENCES usuarios_perfil(id),
    numero_folio BIGSERIAL,
    subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0,
    descuento NUMERIC(14, 2) NOT NULL DEFAULT 0,
    impuesto NUMERIC(14, 2) NOT NULL DEFAULT 0,
    total NUMERIC(14, 2) NOT NULL DEFAULT 0,
    metodo_pago metodo_pago_tipo NOT NULL DEFAULT 'EFECTIVO',
    estado estado_venta NOT NULL DEFAULT 'COMPLETADA',
    notas TEXT,
    fecha_venta TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ventas_empresa_fecha ON ventas(empresa_id, fecha_venta);

-- Detalle de Ventas
CREATE TABLE IF NOT EXISTS detalle_ventas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venta_id UUID NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES productos(id),
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(14, 2) NOT NULL,
    costo_unitario NUMERIC(14, 2) NOT NULL,
    descuento NUMERIC(14, 2) NOT NULL DEFAULT 0,
    subtotal NUMERIC(14, 2) NOT NULL
);

-- Movimientos de Inventario (Kardex)
CREATE TABLE IF NOT EXISTS movimientos_inventario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    sucursal_id UUID NOT NULL REFERENCES sucursales(id),
    producto_id UUID NOT NULL REFERENCES productos(id),
    usuario_id UUID REFERENCES usuarios_perfil(id),
    tipo tipo_movimiento NOT NULL,
    cantidad INT NOT NULL,
    stock_anterior INT NOT NULL,
    stock_posterior INT NOT NULL,
    motivo TEXT,
    venta_id UUID REFERENCES ventas(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_movimientos_producto ON movimientos_inventario(producto_id, created_at);

-- ==============================================================================
-- 4. POLÍTICAS DE ACCESO PÚBLICO Y SINCRONIZACIÓN REALTIME (PC + CELULAR)
-- ==============================================================================

-- Habilitar RLS permisivo
ALTER TABLE IF EXISTS empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sucursales ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS stock_sucursal ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS detalle_ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS movimientos_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS clientes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Allow public all empresas" ON empresas FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow public all sucursales" ON sucursales FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow public all categorias" ON categorias FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow public all proveedores" ON proveedores FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow public all productos" ON productos FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow public all stock_sucursal" ON stock_sucursal FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow public all ventas" ON ventas FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow public all detalle_ventas" ON detalle_ventas FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow public all movimientos_inventario" ON movimientos_inventario FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow public all clientes" ON clientes FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Asegurar columna stock_actual en productos y usuario_id opcional en ventas
ALTER TABLE IF EXISTS productos ADD COLUMN IF NOT EXISTS stock_actual INT DEFAULT 0;
ALTER TABLE IF EXISTS ventas ALTER COLUMN usuario_id DROP NOT NULL;

-- 5. DATOS SEMILLA BASE (Para garantizar integridad referencial multi-dispositivo)
INSERT INTO empresas (id, nombre, rut_identificador, direccion, email, telefono)
VALUES ('a0000000-0000-0000-0000-000000000001', 'Mi Negocio Comercial', '76.123.456-7', 'Calle Comercial 123', 'contacto@minegocio.cl', '+56 9 1234 5678')
ON CONFLICT (id) DO NOTHING;

INSERT INTO sucursales (id, empresa_id, nombre, codigo, es_principal)
VALUES ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Local Principal', 'LOC-01', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO categorias (id, empresa_id, nombre, descripcion)
VALUES 
    ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Bebidas y Líquidos', 'Aguas, jugos, bebidas, cervezas y licores'),
    ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Abarrotes Generales', 'Arroz, harinas, aceites, azúcar, sal y granos'),
    ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Lácteos y Quesos', 'Leches, quesos, mantequillas, cremas y yogures'),
    ('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Snacks y Dulces', 'Chocolates, galletas, papas fritas y confites'),
    ('c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Limpieza y Hogar', 'Detergentes, lavalozas, cloros, papeles y bolsas'),
    ('c0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'Mascotas', 'Alimentos para perros, gatos y accesorios')
ON CONFLICT (id) DO NOTHING;

-- Habilitar Realtime para reflejo instantáneo en todos los dispositivos
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE productos, ventas, detalle_ventas, movimientos_inventario, categorias, clientes, proveedores, empresas, sucursales, stock_sucursal;
EXCEPTION WHEN duplicate_object OR others THEN null; END $$;
