import { NextResponse } from "next/server";
import { getTursoClient } from "@/lib/turso";
import { generateUUID } from "@/lib/utils";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { producto_id, cantidad, motivo, tipo = "AJUSTE_POSITIVO", empresa_id, sucursal_id } = body;

    if (!producto_id || cantidad === undefined || cantidad === 0) {
      return NextResponse.json({ error: "Parámetros inválidos para ajuste de stock" }, { status: 400 });
    }

    const db = getTursoClient();

    // 1. Obtener producto actual
    const prodRes = await db.execute({
      sql: "SELECT * FROM productos WHERE id = ?",
      args: [producto_id],
    });

    if (prodRes.rows.length === 0) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    const prod = prodRes.rows[0];
    const currentStock = Number(prod.stock_actual);
    const newStock = currentStock + Number(cantidad);

    if (newStock < 0) {
      return NextResponse.json(
        { error: `El ajuste resultaría en stock negativo (${newStock}). Operación cancelada.` },
        { status: 400 }
      );
    }

    const movId = generateUUID();
    const resolvedTipo =
      tipo ||
      (Number(cantidad) > 0
        ? "ENTRADA_COMPRA"
        : "AJUSTE_NEGATIVO");

    // Ejecutar actualización de stock y registro en Kardex en una transacción atómica
    await db.batch(
      [
        {
          sql: "UPDATE productos SET stock_actual = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
          args: [newStock, producto_id],
        },
        {
          sql: `INSERT INTO movimientos_inventario (id, empresa_id, sucursal_id, producto_id, tipo, cantidad, stock_anterior, stock_posterior, motivo, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          args: [
            movId,
            empresa_id || prod.empresa_id || "emp_default",
            sucursal_id || "suc_default",
            producto_id,
            resolvedTipo,
            Math.abs(Number(cantidad)),
            currentStock,
            newStock,
            motivo || (Number(cantidad) > 0 ? "Recepción de mercadería" : "Ajuste manual"),
          ],
        },
      ],
      "write"
    );

    return NextResponse.json({
      success: true,
      producto_id,
      stock_anterior: currentStock,
      stock_posterior: newStock,
      cantidad,
    });
  } catch (error: any) {
    console.error("Error al ajustar stock:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
