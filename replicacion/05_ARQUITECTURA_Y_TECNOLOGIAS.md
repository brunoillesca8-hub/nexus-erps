# 🏗️ ARQUITECTURA TÉCNICA Y FLUJO DE DATOS DEL SISTEMA

## 📦 Stack Tecnológico Completo

| Componente | Tecnología | Propósito |
| :--- | :--- | :--- |
| **Framework Web** | Next.js 16 (App Router) | Renderizado ultra rápido, SSR y Serverless Functions |
| **Lenguaje** | TypeScript 5 | Tipado estricto para evitar errores en tiempo de ejecución |
| **Estilos** | Tailwind CSS | Diseño responsivo fluido adaptado a PC, Tablet y Móvil |
| **Base de Datos** | PostgreSQL (Supabase Cloud) | Persistencia ACID, consultas relacionales y seguridad |
| **Sincronización** | Supabase Realtime (WebSockets) | Reflejo de ventas y stock en < 0.2 segundos multi-dispositivo |
| **Lectura de Códigos** | @zxing/browser + Hardware Listener | Escaneo por cámara (EAN-13, QR) + Pistolas láser + WiFi apps |
| **Import/Export** | PapaParse + SheetJS (XLSX) | Procesamiento masivo de miles de productos y reportes Excel |
| **Gráficos** | Recharts | Analítica visual de horas punta, rentabilidad y ventas |
| **Iconografía** | Lucide React | Iconos vectoriales limpios y accesibles |

---

## 🔀 Flujo de Datos y Sincronización en Tiempo Real

```
                    ┌────────────────────────────────┐
                    │      SUPABASE CLOUD            │
                    │   (PostgreSQL + WebSockets)    │
                    └───────────────┬────────────────┘
                                    │
            ┌───────────────────────┴───────────────────────┐
            │                                               │
            ▼                                               ▼
┌───────────────────────┐                       ┌───────────────────────┐
│   Computador (Caja)   │                       │   Celular (Móvil)     │
│  - Catálogo           │ ◄───────────────────► │  - Catálogo           │
│  - Ventas POS         │     Replicación       │  - Ventas POS         │
│  - Recepción / Kardex │     en Tiempo Real    │  - Recepción / Kardex │
│  - Configuración      │      (< 0.2 seg)      │  - Informes           │
└───────────────────────┘                       └───────────────────────┘
```

---

## 📁 Estructura de Rutas y Páginas

* `/` $\rightarrow$ **Dashboard Principal** (KPIs de ventas, alertas de stock mínimo, accesos rápidos).
* `/ventas/nueva` $\rightarrow$ **Punto de Venta POS** (Buscador predictivo, escáner de cámara/pistola, emisión de boletas).
* `/ventas` $\rightarrow$ **Historial de Ventas** (Detalle de productos, reimpresión de tickets, exportación Excel).
* `/productos` $\rightarrow$ **Catálogo Central** (Gestión de SKUs enteros, precios, stock, departamentos y categorías).
* `/inventario` $\rightarrow$ **Kardex Físico y ROP** (Historial de movimientos, políticas de reposición).
* `/clientes` $\rightarrow$ **CRM de Clientes** (Frecuencia de compra, RUT, teléfonos).
* `/proveedores` $\rightarrow$ **Directorio de Proveedores** (Contactos, facturas).
* `/analitica/horarios` $\rightarrow$ **Análisis de Concurrencia** (Horas punta y cantidad de unidades vendidas).
* `/analitica/reportes` $\rightarrow$ **Informes Ejecutivos** (Ventas diarias, semanales y mensuales).
* `/configuracion` $\rightarrow$ **Importador Masivo CSV** (Herramientas de migración y reset).
