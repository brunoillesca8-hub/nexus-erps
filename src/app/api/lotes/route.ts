import { NextResponse } from "next/server";
import { getTursoClient } from "@/lib/turso";
import { generateUUID } from "@/lib/utils";
import type { Lote } from "@/types/erp";

export async function GET(req: Request) {
  try {
    const db = getTursoClient();
    const { searchParams } = new URL(req.url);
    const productoId = searchParams.get("producto_id");
    const sku = searchParams.get("sku");
    const estado = searchParams.get("estado");

    let sql = `
      SELECT l.*, p.nombre as producto_nombre, p.precio_venta as precio_base
      FROM lotes l
      JOIN productos p ON l.producto_id = p.id
      WHERE l.stock_actual > 0
    `;
    const args: any[] = [];

    if (productoId) {
      sql += ` AND l.producto_id = ?`;
      args.push(productoId);
    }

    if (sku) {
      sql += ` AND l.producto_sku = ?`;
      args.push(Number(sku));
    }

    if (estado) {
      sql += ` AND l.estado = ?`;
      args.push(estado);
    }

    sql += ` ORDER BY l.fecha_elaboracion ASC, l.created_at ASC`;

    const res = await db.execute({ sql, args });

    const lotes = res.rows.map((row: any) => {
      const precioBase = Number(row.precio_base) || 0;
      const descPct = Number(row.descuento_aplicado_pct) || 0;
      const precioFinal =
        descPct > 0
          ? Math.round(precioBase * (1 - descPct / 100))
          : precioBase;

      return {
        ...row,
        precio_base: precioBase,
        precio_final: precioFinal,
      } as Lote;
    });

    return NextResponse.json({ success: true, lotes });
  } catch (error: any) {
    console.error("Error al consultar lotes:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      producto_id,
      producto_sku,
      empresa_id = "emp_default",
      sucursal_id = "suc_default",
      cantidad_inicial,
      fecha_elaboracion,
      fecha_vencimiento,
      estado = "FRESCO",
      descuento_aplicado_pct = 0,
    } = body;

    if (!producto_id || !cantidad_inicial || cantidad_inicial <= 0) {
      return NextResponse.json(
        { error: "Producto y cantidad inicial válida requeridos para crear lote" },
        { status: 400 }
      );
    }

    const db = getTursoClient();

    // 1. Obtener producto maestro
    const prodRes = await db.execute({
      sql: "SELECT * FROM productos WHERE id = ?",
      args: [producto_id],
    });

    if (prodRes.rows.length === 0) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    const prod: any = prodRes.rows[0];
    const sku = Number(producto_sku || prod.sku);
    const loteId = generateUUID();
    const movId = generateUUID();
    const nowIso = new Date().toISOString();
    const fElab = fecha_elaboracion || nowIso;
    const fVenc = fecha_vencimiento || prod.fecha_vencimiento || null;

    const currentStock = Number(prod.stock_actual) || 0;
    const newStock = currentStock + Number(cantidad_inicial);

    // Transacción atómica: Crear lote + actualizar stock maestro + registrar Kardex
    await db.batch(
      [
        {
          sql: `INSERT INTO lotes (
                  id, empresa_id, sucursal_id, producto_id, producto_sku, 
                  fecha_elaboracion, fecha_vencimiento, cantidad_inicial, stock_actual, 
                  estado, descuento_aplicado_pct, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            loteId,
            empresa_id,
            sucursal_id,
            producto_id,
            sku,
            fElab,
            fVenc,
            Number(cantidad_inicial),
            Number(cantidad_inicial),
            estado,
            Number(descuento_aplicado_pct) || 0,
            nowIso,
            nowIso,
          ],
        },
        {
          sql: `UPDATE productos 
                SET stock_actual = stock_actual + ?, 
                    fecha_elaboracion = ?, 
                    fecha_vencimiento = COALESCE(?, fecha_vencimiento), 
                    updated_at = ? 
                WHERE id = ?`,
          args: [Number(cantidad_inicial), fElab.slice(0, 10), fVenc, nowIso, producto_id],
        },
        {
          sql: `INSERT INTO movimientos_inventario (
                  id, empresa_id, sucursal_id, producto_id, tipo, cantidad, 
                  stock_anterior, stock_posterior, motivo, created_at
                ) VALUES (?, ?, ?, ?, 'ENTRADA_COMPRA', ?, ?, ?, ?, ?)`,
          args: [
            movId,
            empresa_id,
            sucursal_id,
            producto_id,
            Number(cantidad_inicial),
            currentStock,
            newStock,
            `Ingreso de Lote #${loteId.slice(0, 8)} (${estado})`,
            nowIso,
          ],
        },
      ],
      "write"
    );

    return NextResponse.json({
      success: true,
      lote: {
        id: loteId,
        producto_id,
        producto_sku: sku,
        cantidad_inicial,
        stock_actual: cantidad_inicial,
        estado,
        fecha_elaboracion: fElab,
        fecha_vencimiento: fVenc,
      },
    });
  } catch (error: any) {
    console.error("Error al registrar lote:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
