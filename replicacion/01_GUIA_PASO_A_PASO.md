# 🚀 GUÍA DEFINITIVA DE REPLICACIÓN PASO A PASO (DESDE CERO)
## NEXUS ERP + CRM + POS MULTI-DISPOSITIVO EN TIEMPO REAL

Esta guía te permitirá instalar, configurar y poner en marcha este sistema en cualquier computador desde cero, paso a paso y sin saltarse ningún detalle.

---

## 📋 REQUISITOS PREVIOS EN EL NUEVO COMPUTADOR

1. **Instalar Node.js:**
   * Descarga la versión **LTS (Long Term Support)** desde [https://nodejs.org/](https://nodejs.org/).
   * Abre un terminal (PowerShell o CMD) y verifica que esté instalado ejecutando:
     ```bash
     node -v
     npm -v
     ```
2. **Instalar Git:**
   * Descarga Git desde [https://git-scm.com/](https://git-scm.com/) e instálalo con las opciones por defecto.
3. **Editor de Código:**
   * Recomendado: **Visual Studio Code** o el entorno que utilices.

---

## 🛠️ MÉTODO A: CLONAR EL PROYECTO EXISTENTE (El método más rápido - 3 minutos)

Si ya tienes el repositorio en GitHub, sigue estos 4 pasos:

### 1. Clonar el repositorio
Abre PowerShell en la carpeta donde quieras tener el proyecto y ejecuta:
```bash
git clone https://github.com/TU_USUARIO/nexus-erp.git
cd nexus-erp
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar Variables de Entorno (`.env.local`)
Crea un archivo llamado `.env.local` en la raíz del proyecto y agrega tus credenciales de Supabase:
```env
NEXT_PUBLIC_SUPABASE_URL=https://uasvafkctdzotcnzpccu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhc3ZhZmtjdGR6b3RjbnpwY2N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2NTY3MDUsImV4cCI6MjEwMjIzMjcwNX0.6Tt1Yu_Fo8ir_kZtk4aqcBFSSY6lWN-z88mY5wqYGos
```

### 4. Probar en Local
```bash
npm run dev
```
Abre tu navegador en `http://localhost:3000`.

---

## ☁️ CONFIGURACIÓN DE BASE DE DATOS SUPABASE (Paso Único)

1. Ingresa a [https://supabase.com/](https://supabase.com/) y crea un proyecto nuevo (o usa el existente).
2. En el menú lateral izquierdo, ve a **SQL Editor**.
3. Haz clic en **`+ New query`**.
4. Pega todo el contenido del archivo `03_ESQUEMA_SUPABASE_SQL.sql` incluido en esta carpeta.
5. Presiona el botón verde **`[Run]`**.
6. ¡Listo! Todas las tablas, permisos de acceso público y canales de sincronización en tiempo real (WebSockets) quedarán configurados automáticamente.

---

## 🚀 DESPLIEGUE EN PRODUCCIÓN (VERCEL)

Para que el sistema esté disponible en internet y lo abras desde el celular:

1. Ingresa a [https://vercel.com/](https://vercel.com/) con tu cuenta de GitHub.
2. Haz clic en **"Add New Project"** e importa el repositorio de tu ERP.
3. En la sección **"Environment Variables"**, agrega las mismas dos variables de tu `.env.local`:
   * `NEXT_PUBLIC_SUPABASE_URL`
   * `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Presiona **Deploy**.
5. Vercel te dará una URL (ej: `https://nexus-erp-tuempresa.vercel.app`) que podrás abrir en tu computador, celular o tablet.

---

## 📱 CONEXIÓN Y USO SIMULTÁNEO (PC + CELULAR)

1. **En el PC:** Abre la URL de Vercel y sube tu catálogo masivo en **Configuración (`/configuracion`)**.
2. **En el Celular:** Abre la misma URL de Vercel en Chrome / Safari móvil.
3. **Ventas en vivo:** Al hacer una venta desde cualquier equipo, el stock y el dinero se actualizan en el otro en **menos de 1 segundo**.
