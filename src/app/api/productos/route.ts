import { NextResponse } from "next/server";
import { getTursoClient } from "@/lib/turso";
import { generateUUID } from "@/lib/utils";
import type { Producto } from "@/types/erp";

export async function GET(req: Request) {
  try {
    const db = getTursoClient();
    const { searchParams } = new URL(req.url);
    const categoriaId = searchParams.get("categoria_id");
    const barcode = searchParams.get("barcode");

    if (barcode) {
      const res = await db.execute({
        sql: `SELECT p.*, c.nombre as categoria_nombre 
              FROM productos p 
              LEFT JOIN categorias c ON p.categoria_id = c.id 
              WHERE p.codigo_barras = ? AND p.activo = 1 
              LIMIT 1`,
        args: [barcode],
      });
      return NextResponse.json({ producto: res.rows[0] || null });
    }

    let sql = `
      SELECT p.*, c.nombre as categoria_nombre 
      FROM productos p 
      LEFT JOIN categorias c ON p.categoria_id = c.id 
      WHERE p.activo = 1
    `;
    const args: any[] = [];

    if (categoriaId) {
      sql += ` AND p.categoria_id = ?`;
      args.push(categoriaId);
    }

    sql += ` ORDER BY p.sku ASC`;

    const res = await db.execute({ sql, args });
    return NextResponse.json({ productos: res.rows });
  } catch (error: any) {
    console.error("Error al obtener productos:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const db = getTursoClient();

    // Caso 1: Carga masiva por lotes (Batch Upload)
    if (Array.isArray(body.items)) {
      const items: Partial<Producto>[] = body.items;
      const empresaId = body.empresa_id || "emp_default";

      // Obtener el SKU máximo actual para asignación continua si es necesario
      const maxSkuRes = await db.execute("SELECT MAX(sku) as max_sku FROM productos");
      let nextSku = Number(maxSkuRes.rows[0]?.max_sku || 1000);

      // Procesar en chunks de 100 para no exceder límites de payload
      const CHUNK_SIZE = 100;
      let insertedCount = 0;

      for (let i = 0; i < items.length; i += CHUNK_SIZE) {
        const chunk = items.slice(i, i + CHUNK_SIZE);
        const batchStatements: any[] = [];

        for (const item of chunk) {
          const id = item.id || generateUUID();
          nextSku += 1;
          const sku = item.sku ? Number(item.sku) : nextSku;

          batchStatements.push({
            sql: `INSERT INTO productos (id, empresa_id, categoria_id, proveedor_id, nombre, descripcion, sku, codigo_barras, precio_compra, precio_venta, stock_actual, stock_minimo, unidad_medida, imagen_url, fecha_elaboracion, fecha_vencimiento, activo, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                  ON CONFLICT(id) DO UPDATE SET
                    nombre = excluded.nombre,
                    categoria_id = excluded.categoria_id,
                    proveedor_id = excluded.proveedor_id,
                    descripcion = excluded.descripcion,
                    sku = excluded.sku,
                    codigo_barras = excluded.codigo_barras,
                    precio_compra = excluded.precio_compra,
                    precio_venta = excluded.precio_venta,
                    stock_actual = excluded.stock_actual,
                    stock_minimo = excluded.stock_minimo,
                    unidad_medida = excluded.unidad_medida,
                    imagen_url = excluded.imagen_url,
                    fecha_elaboracion = excluded.fecha_elaboracion,
                    fecha_vencimiento = excluded.fecha_vencimiento,
                    updated_at = CURRENT_TIMESTAMP`,
            args: [
              id,
              empresaId,
              item.categoria_id || null,
              item.proveedor_id || null,
              item.nombre || "Producto sin nombre",
              item.descripcion || null,
              sku,
              item.codigo_barras || null,
              Number(item.precio_compra) || 0,
              Number(item.precio_venta) || 0,
              Number(item.stock_actual) || 0,
              Number(item.stock_minimo) || 5,
              item.unidad_medida || "unidad",
              item.imagen_url || null,
              item.fecha_elaboracion || null,
              item.fecha_vencimiento || null,
            ],
          });
        }

        if (batchStatements.length > 0) {
          await db.batch(batchStatements, "write");
          insertedCount += chunk.length;
        }
      }

      return NextResponse.json({
        success: true,
        message: `Se insertaron/actualizaron ${insertedCount} productos correctamente en lotes de 100.`,
        count: insertedCount,
      });
    }

    // Caso 2: Crear o actualizar producto individual
    const item: Partial<Producto> = body;
    const empresaId = item.empresa_id || "emp_default";

    // Si no tiene SKU, generar el siguiente
    let sku = item.sku;
    if (!sku) {
      const maxSkuRes = await db.execute("SELECT MAX(sku) as max_sku FROM productos");
      const currentMax = Number(maxSkuRes.rows[0]?.max_sku || 1000);
      sku = currentMax + 1;
    }

    const id = item.id || generateUUID();

    await db.execute({
      sql: `INSERT INTO productos (id, empresa_id, categoria_id, proveedor_id, nombre, descripcion, sku, codigo_barras, precio_compra, precio_venta, stock_actual, stock_minimo, unidad_medida, imagen_url, fecha_elaboracion, fecha_vencimiento, activo, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
              nombre = excluded.nombre,
              categoria_id = excluded.categoria_id,
              proveedor_id = excluded.proveedor_id,
              descripcion = excluded.descripcion,
              sku = excluded.sku,
              codigo_barras = excluded.codigo_barras,
              precio_compra = excluded.precio_compra,
              precio_venta = excluded.precio_venta,
              stock_actual = excluded.stock_actual,
              stock_minimo = excluded.stock_minimo,
              unidad_medida = excluded.unidad_medida,
              imagen_url = excluded.imagen_url,
              fecha_elaboracion = excluded.fecha_elaboracion,
              fecha_vencimiento = excluded.fecha_vencimiento,
              updated_at = CURRENT_TIMESTAMP`,
      args: [
        id,
        empresaId,
        item.categoria_id || null,
        item.proveedor_id || null,
        item.nombre || "Producto sin nombre",
        item.descripcion || null,
        sku,
        item.codigo_barras || null,
        Number(item.precio_compra) || 0,
        Number(item.precio_venta) || 0,
        Number(item.stock_actual) || 0,
        Number(item.stock_minimo) || 5,
        item.unidad_medida || "unidad",
        item.imagen_url || null,
        item.fecha_elaboracion || null,
        item.fecha_vencimiento || null,
      ],
    });

    const createdRes = await db.execute({
      sql: `SELECT p.*, c.nombre as categoria_nombre 
            FROM productos p 
            LEFT JOIN categorias c ON p.categoria_id = c.id 
            WHERE p.id = ?`,
      args: [id],
    });

    return NextResponse.json({
      success: true,
      producto: createdRes.rows[0],
    });
  } catch (error: any) {
    console.error("Error al guardar producto:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID de producto requerido" }, { status: 400 });
    }

    const db = getTursoClient();
    await db.execute({
      sql: "UPDATE productos SET activo = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      args: [id],
    });

    return NextResponse.json({ success: true, message: "Producto eliminado correctamente." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
