import { NextResponse } from "next/server";
import { getTursoClient } from "@/lib/turso";
import { getChileTodayDate, getChileHour } from "@/lib/utils";

export async function GET(req: Request) {
  try {
    const db = getTursoClient();
    const chileToday = getChileTodayDate();
    const now = new Date();
    const currentChileHour = getChileHour(now.toISOString()) ?? now.getHours();

    // 1. Obtener lotes en estado FRESCO con stock disponible
    const res = await db.execute(`
      SELECT l.*, p.nombre as producto_nombre, p.categoria_id, COALESCE(p.descuento_sobrante_default_pct, 30.0) as descuento_defecto
      FROM lotes l
      JOIN productos p ON l.producto_id = p.id
      WHERE l.estado = 'FRESCO' AND l.stock_actual > 0
    `);

    const lotesAReclasificar: any[] = [];

    for (const row of res.rows) {
      const fElab = (row.fecha_elaboracion as string || "").slice(0, 10);
      const isPasteleria =
        row.categoria_id === "cat_pasteleria" ||
        (row.categoria_id as string)?.toLowerCase().includes("pastel");

      // Criterio de reclasificación para pastelería y perecibles:
      // A) Elaborado en días previos
      // B) Elaborado hoy pero ya son las 22:00 hrs (10:00 PM) o más en Chile
      if (isPasteleria) {
        if (fElab < chileToday || (fElab === chileToday && currentChileHour >= 22) || !fElab) {
          lotesAReclasificar.push(row);
        }
      }
    }

    if (lotesAReclasificar.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No hay lotes que requieran reclasificación en este momento.",
        reclassifiedCount: 0,
        horaChile: currentChileHour,
        fechaChile: chileToday,
      });
    }

    const batchStatements: any[] = [];
    const nowIso = new Date().toISOString();

    for (const lote of lotesAReclasificar) {
      const descPct = Number(lote.descuento_defecto) || 30.0;

      // 1. Actualizar estado del lote a SOBRANTE con descuento
      batchStatements.push({
        sql: `UPDATE lotes 
              SET estado = 'SOBRANTE', 
                  descuento_aplicado_pct = ?, 
                  updated_at = ? 
              WHERE id = ?`,
        args: [descPct, nowIso, lote.id],
      });

      // 2. Sincronizar stock_sobrante en el producto maestro
      batchStatements.push({
        sql: `UPDATE productos 
              SET stock_sobrante = (
                SELECT COALESCE(SUM(stock_actual), 0) 
                FROM lotes 
                WHERE producto_id = ? AND estado = 'SOBRANTE' AND stock_actual > 0
              ), 
              updated_at = ? 
              WHERE id = ?`,
        args: [lote.producto_id, nowIso, lote.producto_id],
      });
    }

    await db.batch(batchStatements, "write");

    return NextResponse.json({
      success: true,
      message: `Se reclasificaron exitosamente ${lotesAReclasificar.length} lotes a SOBRANTE (-30%).`,
      reclassifiedCount: lotesAReclasificar.length,
      horaChile: currentChileHour,
      fechaChile: chileToday,
      lotes: lotesAReclasificar.map((l) => ({
        id: l.id,
        producto: l.producto_nombre,
        stock: l.stock_actual,
        descuento: l.descuento_defecto,
      })),
    });
  } catch (error: any) {
    console.error("Error en cron de reclasificación de lotes:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}
