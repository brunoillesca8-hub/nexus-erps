# 🤖 PROMPTS ESTRUCTURADOS PARA CREAR LA APLICACIÓN DESDE CERO CON IA

Usa esta secuencia de prompts numerados en cualquier asistente de Inteligencia Artificial (Antigravity, Cursor, Claude, ChatGPT) para construir el sistema completo de principio a fin.

---

### 📝 PROMPT 1: Inicialización del Proyecto y Configuración de Dependencias

```text
Actúa como un Desarrollador Full-Stack Senior experto en Next.js (App Router), TypeScript, Tailwind CSS y Supabase.

Crea un proyecto desde cero llamado "nexus-erp" con la siguiente estructura y dependencias:
1. Framework: Next.js con App Router y TypeScript.
2. Estilos: Tailwind CSS.
3. Librerías de iconos y utilidades:
   - lucide-react (iconos modernos)
   - recharts (gráficos estadísticos interactivos)
   - papaparse (importación y procesamiento de archivos CSV)
   - xlsx (exportación e importación de reportes Excel)
   - @supabase/supabase-js (cliente de base de datos en tiempo real)
   - @zxing/browser y @zxing/library (lector de códigos de barras EAN-13, CODE_128 y QR por cámara)

Configura el archivo next.config.ts, tsconfig.json y globals.css con un diseño limpio, moderno, profesional en tonos pizarra y azul slate.
```

---

### 📝 PROMPT 2: Esquema de Base de Datos y Supabase Client

```text
Diseña el esquema de base de datos PostgreSQL para Supabase y el cliente de conexión en TypeScript (src/lib/supabase.ts).

Requisitos del esquema:
1. Tablas principales:
   - empresas (tenants con RUT, moneda CLP, IVA 19%)
   - sucursales (locales comerciales)
   - categorias (departamentos: Abarrotes, Bebidas, Lácteos, Snacks, Limpieza, Mascotas)
   - productos (id UUID, empresa_id, categoria_id, nombre, sku número entero, codigo_barras EAN-13, precio_compra, precio_venta, stock_actual, stock_minimo, unidad_medida)
   - ventas (numero_folio, subtotal, impuesto, total, metodo_pago, estado, fecha_venta)
   - detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, costo_unitario, subtotal)
   - movimientos_inventario (Kardex: entradas, salidas, ventas, mermas)
   - clientes (CRM: RUT, nombre, teléfono, email, compras históricas)
   - proveedores (RUT, nombre, contacto)
2. Políticas de Seguridad (RLS):
   - Políticas públicas permisivas para lectura y escritura sin bloqueo de sesión en el POS.
3. Replicación en Tiempo Real:
   - Habilitar supabase_realtime en todas las tablas para sincronización WebSocket en vivo entre PC y celular.
```

---

### 📝 PROMPT 3: Contexto Central de Estado y Sincronización en Tiempo Real (`erp-context.tsx`)

```text
Crea el contexto central de la aplicación (src/context/erp-context.tsx) con las siguientes características:

1. Gestión de Estado Global:
   - productos, categorias, ventas, clientes, proveedores, movimientos, empresa, sucursalActiva.
2. Sincronización Bidireccional Supabase Cloud + LocalStorage Fallback:
   - Al cargar la app, descargar los datos más recientes de Supabase.
   - Escuchar canales WebSocket con supabase.channel('erp-live-cloud-sync') para recibir eventos de INSERT, UPDATE y DELETE de otros dispositivos en menos de 0.2 segundos.
3. Operaciones Atómicas Clave:
   - procesarVenta(): descuenta stock del producto, crea boleta con folio autoincremental (desde 100), inserta detalle_ventas y registra el movimiento de Kardex en Supabase.
   - agregarProductosLote(): recibe cientos o miles de productos de un CSV, genera IDs únicos y realiza un upsert en lotes de 100 registros a Supabase.
   - vaciarCatalogo(): limpia productos, ventas, movimientos y clientes tanto en Supabase como en la memoria local.
   - ajustarStock(): suma o resta unidades (recepción de mercadería) y actualiza el stock central.
   - generarSiguienteSKU(): calcula automáticamente el siguiente SKU numérico entero (ej: 1001, 1002...).
```

---

### 📝 PROMPT 4: Punto de Venta (POS) Táctil y Lector de Códigos de Barras

```text
Implementa el módulo de Punto de Venta POS táctil y ultra rápido en src/app/ventas/nueva/page.tsx:

1. Interfaz visual:
   - Catálogo visual de productos a la izquierda con filtros por categoría y búsqueda predictiva multi-palabra y sin importar tildes (ej: "aceit veg" encuentra "Aceite Vegetal").
   - Carrito lateral comprimido a la derecha: resumen de items, selector de cliente, métodos de pago (Efectivo, Débito, Crédito, Transferencia) y botón "Confirmar Venta • $Total" ubicado estratégicamente bajo los métodos de pago.
2. Escáner de Códigos de Barras Híbrido:
   - Escáner por Cámara de Celular / PC: usa @zxing/browser con soporte para EAN-13, CODE_128, CODE_39, UPC_A y control de errores por si no hay permisos de cámara.
   - Lector de Pistola Láser y Apps Wi-Fi (Barcode to PC): listener global de teclado tolerante a latencia de red (buffer de 500 ms) y soporte de eventos Paste/Enter para agregar el producto al carrito automáticamente al escanear.
3. Emisión de Boletas e Impresión de Ticket Térmico 80mm / 58mm.
```

---

### 📝 PROMPT 5: Catálogo Centralizado, Recepción y Gestión de Categorías

```text
Crea la vista de Catálogo e Inventario en src/app/productos/page.tsx:

1. Pestañas de Vista:
   - Pestaña 1: Catálogo de Productos con ordenamiento por columnas (SKU entero, Nombre, Categoría, Precio Compra, Precio Venta, Margen %, Stock), paginación dinámica, ajuste masivo de precios por porcentaje (%) y exportación a Excel (.xlsx).
   - Pestaña 2: Departamentos & Categorías con tarjetas visuales por cada una de las 6 categorías (Abarrotes, Bebidas, Lácteos, Snacks, Limpieza, Mascotas), mostrando el conteo de SKUs, unidades totales de stock, valorización en dinero ($ CLP) y botón para filtrar con 1 clic.
2. Recepción Rápida de Mercadería por Código de Barras:
   - Al escanear un código existente: abre modal rápido para sumar unidades al stock (ej: +24) y registrar Kardex de compra.
   - Al escanear un código nuevo: abre el modal de registro con el código pre-llenado y el siguiente SKU entero listo.
```

---

### 📝 PROMPT 6: Informes y Análisis de Demanda Real por Horarios

```text
Crea el panel de Analítica y Reportes en src/app/analitica/horarios/page.tsx:

1. Gráfica de Distribución de Demanda por Hora:
   - Muestra la cantidad real de productos y unidades vendidas por cada franja horaria (de 08:00 a 22:00 hrs) mediante un BarChart interactivo de Recharts.
   - Detección automática de la hora pico real del negocio.
2. Estado Vacío Limpio:
   - Si no hay ventas registradas en el sistema, mostrar un estado vacío informativo que indique que la gráfica se calculará con las primeras ventas reales del POS.
```
