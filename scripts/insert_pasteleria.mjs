import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || "libsql://nexus-erp-brunoillesca.aws-us-east-1.turso.io",
  authToken: process.env.TURSO_AUTH_TOKEN || "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODY4NjIzNjQsImlkIjoiMDFhMDA5NDYtNWMwMS03NTFjLWJlMzMtOThjZDFmYzk4YWU5Iiwia2lkIjoieUZRUkNaUVhCXzZOZ3JSeHdwOXEtRzNNY3hmMkVZa2xDS0dweXlHV3E3QSIsInJpZCI6ImE2N2U3NWU5LTk0ZjgtNDI4NS1hZDkyLWM5YmI4YTRjNGQ2YSJ9.2qEdEwsmSb2ZVVX12lWoiw_3fzkdkRUURaD1LUC0f8XkX5a7VmObVJsJt3l72N4aYNAcTBxZe7VzRsadBaTEBg",
});

const today = new Date();
const formatDate = (d) => d.toISOString().slice(0, 10);
const addDays = (days) => {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  return formatDate(d);
};

const pasteleriaItems = [
  { sku: 780990001001, nombre: "Torta Tres Leches Tradicional (Porción)", costo: 1400, venta: 3500, stock: 12, min: 3, elab: formatDate(today), venc: addDays(3), unidad: "porción" },
  { sku: 780990001002, nombre: "Torta Selva Negra (Porción)", costo: 1600, venta: 3800, stock: 10, min: 3, elab: formatDate(today), venc: addDays(3), unidad: "porción" },
  { sku: 780990001003, nombre: "Torta Milhojas con Manjar Casero (Porción)", costo: 1300, venta: 3200, stock: 15, min: 4, elab: formatDate(today), venc: addDays(5), unidad: "porción" },
  { sku: 780990001004, nombre: "Pie de Limón Merengue Italiano (Porción)", costo: 1100, venta: 2800, stock: 14, min: 3, elab: formatDate(today), venc: addDays(3), unidad: "porción" },
  { sku: 780990001005, nombre: "Kuchen de Frambuesa Sureño (Porción)", costo: 1250, venta: 3000, stock: 12, min: 3, elab: formatDate(today), venc: addDays(4), unidad: "porción" },
  { sku: 780990001006, nombre: "Kuchen de Manzana y Canela (Porción)", costo: 1000, venta: 2600, stock: 10, min: 2, elab: formatDate(today), venc: addDays(4), unidad: "porción" },
  { sku: 780990001007, nombre: "Cheesecake de Frutos Rojos (Porción)", costo: 1800, venta: 4200, stock: 8, min: 2, elab: formatDate(today), venc: addDays(3), unidad: "porción" },
  { sku: 780990001008, nombre: "Brazo de Reina con Manjar Artesanal (Porción)", costo: 900, venta: 2200, stock: 12, min: 3, elab: formatDate(today), venc: addDays(4), unidad: "porción" },
  { sku: 780990001009, nombre: "Alfajor de Maicena Artesanal con Coco", costo: 500, venta: 1200, stock: 30, min: 6, elab: formatDate(today), venc: addDays(10), unidad: "unidad" },
  { sku: 780990001010, nombre: "Alfajor de Chocolate Relleno de Manjar", costo: 650, venta: 1500, stock: 25, min: 5, elab: formatDate(today), venc: addDays(12), unidad: "unidad" },
  { sku: 780990001011, nombre: "Berliner Relleno con Crema Pastelera", costo: 550, venta: 1400, stock: 18, min: 4, elab: formatDate(today), venc: addDays(2), unidad: "unidad" },
  { sku: 780990001012, nombre: "Berliner Relleno con Manjar", costo: 550, venta: 1400, stock: 18, min: 4, elab: formatDate(today), venc: addDays(2), unidad: "unidad" },
  { sku: 780990001013, nombre: "Medialuna de Mantequilla Horneada", costo: 350, venta: 900, stock: 35, min: 8, elab: formatDate(today), venc: addDays(2), unidad: "unidad" },
  { sku: 780990001014, nombre: "Empanada de Pino de Horno Especial", costo: 1200, venta: 2600, stock: 24, min: 5, elab: formatDate(today), venc: addDays(2), unidad: "unidad" },
  { sku: 780990001015, nombre: "Empanada de Queso Masa Fina", costo: 1000, venta: 2200, stock: 20, min: 4, elab: formatDate(today), venc: addDays(2), unidad: "unidad" },
  { sku: 780990001016, nombre: "Muffin de Arándanos y Vainilla", costo: 600, venta: 1500, stock: 16, min: 4, elab: formatDate(today), venc: addDays(4), unidad: "unidad" },
  { sku: 780990001017, nombre: "Queque Marmolado Casero (Trozo)", costo: 450, venta: 1200, stock: 15, min: 3, elab: formatDate(today), venc: addDays(5), unidad: "porción" },
  { sku: 780990001018, nombre: "Galletones de Avena, Miel y Pasas", costo: 400, venta: 1000, stock: 25, min: 5, elab: formatDate(today), venc: addDays(15), unidad: "unidad" },
  { sku: 780990001019, nombre: "Palmeras de Hojaldre Caramelizadas", costo: 350, venta: 900, stock: 20, min: 5, elab: formatDate(today), venc: addDays(7), unidad: "unidad" },
  { sku: 780990001020, nombre: "Torta Entera Tres Leches (15 Personas)", costo: 9500, venta: 24990, stock: 3, min: 1, elab: formatDate(today), venc: addDays(3), unidad: "unidad" }
];

async function run() {
  for (const item of pasteleriaItems) {
    const id = "prod_pas_" + item.sku;
    await client.execute({
      sql: `
        INSERT INTO productos (id, empresa_id, categoria_id, sku, codigo_barras, nombre, precio_compra, precio_venta, stock_actual, stock_minimo, unidad_medida, fecha_elaboracion, fecha_vencimiento)
        VALUES (?, 'emp_default', 'cat_pasteleria', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          nombre = excluded.nombre,
          precio_compra = excluded.precio_compra,
          precio_venta = excluded.precio_venta,
          stock_actual = excluded.stock_actual,
          fecha_elaboracion = excluded.fecha_elaboracion,
          fecha_vencimiento = excluded.fecha_vencimiento
      `,
      args: [id, item.sku, item.sku.toString(), item.nombre, item.costo, item.venta, item.stock, item.min, item.unidad, item.elab, item.venc]
    });
  }
  console.log("20 productos pasteleros insertados y listos en Turso DB.");
}

run();
