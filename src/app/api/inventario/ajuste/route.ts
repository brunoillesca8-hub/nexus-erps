import { NextResponse } from "next/server";
import { getTursoClient } from "@/lib/turso";
import { generateUUID } from "@/lib/utils";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      producto_id,
      cantidad,
      motivo,
      tipo = "AJUSTE_POSITIVO",
      empresa_id,
      sucursal_id,
      fecha_elaboracion,
      fecha_vencimiento,
      es_nueva_elaboracion,
    } = body;

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

    const prod: any = prodRes.rows[0];
    const currentStock = Number(prod.stock_actual);
    const newStock = currentStock + Number(cantidad);

    if (newStock < 0) {
      return NextResponse.json(
        { error: `El ajuste resultaría en stock negativo (${newStock}). Operación cancelada.` },
        { status: 400 }
      );
    }

    const isPasteleria =
      prod.categoria_id === "cat_pasteleria" ||
      prod.categoria_id?.toLowerCase().includes("pastel");

    let newStockSobrante = Number(prod.stock_sobrante || 0);

    // Si es elaboración de pastelería y se agregan unidades frescas:
    // El stock anterior que no se vendió se preserva como stock_sobrante (lote añejo/descuento)
    if (isPasteleria && Number(cantidad) > 0 && (es_nueva_elaboracion || currentStock > 0)) {
      newStockSobrante = currentStock; // Lo que quedó de ayer pasa a sobrante
    }

    const movId = generateUUID();
    const resolvedTipo =
      tipo ||
      (Number(cantidad) > 0
        ? "ENTRADA_COMPRA"
        : "AJUSTE_NEGATIVO");

    const nowIso = new Date().toISOString();
    const newFechaElab = fecha_elaboracion || (Number(cantidad) > 0 ? nowIso.slice(0, 10) : prod.fecha_elaboracion);
    const newFechaVenc = fecha_vencimiento || prod.fecha_vencimiento;

    const batchStatements: any[] = [
      {
        sql: `UPDATE productos 
              SET stock_actual = ?, 
                  stock_sobrante = ?, 
                  fecha_elaboracion = COALESCE(?, fecha_elaboracion), 
                  fecha_vencimiento = COALESCE(?, fecha_vencimiento), 
                  updated_at = ? 
              WHERE id = ?`,
        args: [newStock, newStockSobrante, newFechaElab, newFechaVenc, nowIso, producto_id],
      },
      {
        sql: `INSERT INTO movimientos_inventario (id, empresa_id, sucursal_id, producto_id, tipo, cantidad, stock_anterior, stock_posterior, motivo, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          movId,
          empresa_id || prod.empresa_id || "emp_default",
          sucursal_id || "suc_default",
          producto_id,
          resolvedTipo,
          Math.abs(Number(cantidad)),
          currentStock,
          newStock,
          motivo || (Number(cantidad) > 0 ? "Nueva elaboración / Reposición" : "Ajuste manual"),
          nowIso,
        ],
      },
    ];

    // Si es ingreso positivo, registrar nuevo lote FRESCO
    if (Number(cantidad) > 0) {
      const loteId = generateUUID();
      
      // Si es pastelería y habían lotes anteriores frescos, pasarlos a SOBRANTE
      if (isPasteleria && currentStock > 0) {
        batchStatements.push({
          sql: `UPDATE lotes 
                SET estado = 'SOBRANTE', 
                    descuento_aplicado_pct = COALESCE((SELECT descuento_sobrante_default_pct FROM productos WHERE id = ?), 30.0), 
                    updated_at = ? 
                WHERE producto_id = ? AND estado = 'FRESCO' AND stock_actual > 0`,
          args: [producto_id, nowIso, producto_id],
        });
      }

      batchStatements.push({
        sql: `INSERT INTO lotes (
                id, empresa_id, sucursal_id, producto_id, producto_sku, 
                fecha_elaboracion, fecha_vencimiento, cantidad_inicial, stock_actual, 
                estado, descuento_aplicado_pct, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'FRESCO', 0, ?, ?)`,
        args: [
          loteId,
          empresa_id || prod.empresa_id || "emp_default",
          sucursal_id || "suc_default",
          producto_id,
          Number(prod.sku),
          newFechaElab,
          newFechaVenc,
          Number(cantidad),
          Number(cantidad),
          nowIso,
          nowIso,
        ],
      });
    }

    await db.batch(batchStatements, "write");

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
