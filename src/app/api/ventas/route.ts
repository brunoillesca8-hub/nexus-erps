import { NextResponse } from "next/server";
import { getTursoClient } from "@/lib/turso";
import { generateUUID } from "@/lib/utils";
import type { ProcesarVentaPayload } from "@/types/erp";

export async function GET(req: Request) {
  try {
    const db = getTursoClient();
    const { searchParams } = new URL(req.url);
    const ventaId = searchParams.get("id");

    if (ventaId) {
      const [ventaRes, detallesRes] = await Promise.all([
        db.execute({
          sql: `SELECT v.*, c.nombre as cliente_nombre, c.rut_identificador as cliente_rut, e.nombre as empresa_nombre, e.rut_identificador as empresa_rut, e.direccion as empresa_direccion, e.telefono as empresa_telefono, e.iva_porcentaje
                FROM ventas v
                LEFT JOIN clientes c ON v.cliente_id = c.id
                LEFT JOIN empresas e ON v.empresa_id = e.id
                WHERE v.id = ?`,
          args: [ventaId],
        }),
        db.execute({
          sql: `SELECT d.*, p.nombre as producto_nombre, p.sku as producto_sku, p.codigo_barras as producto_codigo_barras
                FROM detalle_ventas d
                LEFT JOIN productos p ON d.producto_id = p.id
                WHERE d.venta_id = ?`,
          args: [ventaId],
        }),
      ]);

      if (ventaRes.rows.length === 0) {
        return NextResponse.json({ error: "Venta no encontrada" }, { status: 404 });
      }

      return NextResponse.json({
        venta: ventaRes.rows[0],
        detalles: detallesRes.rows,
      });
    }

    const ventasRes = await db.execute(`
      SELECT v.*, c.nombre as cliente_nombre 
      FROM ventas v 
      LEFT JOIN clientes c ON v.cliente_id = c.id 
      ORDER BY v.numero_folio DESC 
      LIMIT 300
    `);

    return NextResponse.json({ ventas: ventasRes.rows });
  } catch (error: any) {
    console.error("Error al obtener ventas:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const payload: ProcesarVentaPayload = await req.json();
    const { empresa_id, sucursal_id, cliente_id, metodo_pago, descuento = 0, notas, items } = payload;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "El carrito de ventas no contiene items" }, { status: 400 });
    }

    const db = getTursoClient();

    // 1. Validar productos y calcular totales
    const productIds = items.map((i) => `'${i.producto_id}'`).join(",");
    const productosDbRes = await db.execute(`SELECT * FROM productos WHERE id IN (${productIds})`);
    const prodMap = new Map(productosDbRes.rows.map((p) => [p.id as string, p]));

    let subtotal = 0;
    const batchStatements: any[] = [];
    const ventaId = generateUUID();

    // Preparar detalles y movimientos de stock
    const detallesToInsert: any[] = [];
    const movimientosToInsert: any[] = [];

    for (const item of items) {
      const prod = prodMap.get(item.producto_id);
      if (!prod) {
        return NextResponse.json(
          { error: `Producto con ID ${item.producto_id} no fue encontrado en la base de datos` },
          { status: 400 }
        );
      }

      const currentStock = Number(prod.stock_actual);
      const newStock = currentStock - item.cantidad;
      const itemDescuentoUnitario = Number(item.descuento) || 0;
      const itemSubtotal = Math.max(0, (item.precio_unitario - itemDescuentoUnitario) * item.cantidad);
      subtotal += itemSubtotal;

      // Descuento atómico de stock en producto
      batchStatements.push({
        sql: `UPDATE productos SET stock_actual = stock_actual - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        args: [item.cantidad, item.producto_id],
      });

      // Detalle de venta
      const detalleId = generateUUID();
      detallesToInsert.push({
        id: detalleId,
        venta_id: ventaId,
        producto_id: item.producto_id,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        costo_unitario: item.costo_unitario || Number(prod.precio_compra) || 0,
        subtotal: itemSubtotal,
        descuento: itemDescuentoUnitario * item.cantidad,
        motivo_descuento: item.motivo_descuento || null,
      });

      // Kardex (Movimiento de inventario)
      const movId = generateUUID();
      movimientosToInsert.push({
        id: movId,
        empresa_id: empresa_id || "emp_default",
        sucursal_id: sucursal_id || "suc_default",
        producto_id: item.producto_id,
        tipo: "SALIDA_VENTA",
        cantidad: item.cantidad,
        stock_anterior: currentStock,
        stock_posterior: newStock,
        motivo: `Venta POS`,
        venta_id: ventaId,
      });
    }

    // Calcular IVA (19% en Chile) y Total
    const baseAmount = subtotal - descuento;
    // Impuesto incluido o calculado (19%)
    const impuesto = Math.round((baseAmount * 19) / 119);
    const total = baseAmount;

    const nowIso = new Date().toISOString();

    // Inserción de la venta principal
    batchStatements.push({
      sql: `INSERT INTO ventas (id, empresa_id, sucursal_id, cliente_id, subtotal, descuento, impuesto, total, metodo_pago, estado, notas, fecha_venta)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETADA', ?, ?)`,
      args: [
        ventaId,
        empresa_id || "emp_default",
        sucursal_id || "suc_default",
        cliente_id || "cli_default",
        subtotal,
        descuento,
        impuesto,
        total,
        metodo_pago,
        notas || null,
        nowIso,
      ],
    });

    // Inserción de detalles de venta
    for (const d of detallesToInsert) {
      batchStatements.push({
        sql: `INSERT INTO detalle_ventas (id, venta_id, producto_id, cantidad, precio_unitario, costo_unitario, subtotal, descuento, motivo_descuento)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          d.id,
          d.venta_id,
          d.producto_id,
          d.cantidad,
          d.precio_unitario,
          d.costo_unitario,
          d.subtotal,
          d.descuento || 0,
          d.motivo_descuento || null,
        ],
      });
    }

    // Inserción de movimientos de kardex
    for (const m of movimientosToInsert) {
      batchStatements.push({
        sql: `INSERT INTO movimientos_inventario (id, empresa_id, sucursal_id, producto_id, tipo, cantidad, stock_anterior, stock_posterior, motivo, venta_id, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        args: [m.id, m.empresa_id, m.sucursal_id, m.producto_id, m.tipo, m.cantidad, m.stock_anterior, m.stock_posterior, m.motivo, m.venta_id],
      });
    }

    // 2. EJECUCIÓN ATÓMICA CON ROLLBACK AUTOMÁTICO EN TURSO LIBSQL
    await db.batch(batchStatements, "write");

    // Recuperar folio asignado
    const ventaCreadaRes = await db.execute({
      sql: `SELECT numero_folio, fecha_venta FROM ventas WHERE id = ?`,
      args: [ventaId],
    });

    const folio = ventaCreadaRes.rows[0]?.numero_folio || 1;
    const fecha_venta = ventaCreadaRes.rows[0]?.fecha_venta || new Date().toISOString();

    return NextResponse.json({
      success: true,
      venta_id: ventaId,
      numero_folio: folio,
      fecha_venta,
      subtotal,
      descuento,
      impuesto,
      total,
      metodo_pago,
      items_count: items.length,
    });
  } catch (error: any) {
    console.error("Error al procesar la venta transaccional en Turso:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Error al procesar la venta en la base de datos",
      },
      { status: 500 }
    );
  }
}
