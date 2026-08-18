import { NextResponse } from "next/server";
import { getTursoClient, initDatabase } from "@/lib/turso";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getTursoClient();

    // Ensure database is initialized
    await initDatabase();

    // Fetch all entities concurrently using LibSQL
    const [
      empresasRes,
      sucursalesRes,
      categoriasRes,
      proveedoresRes,
      clientesRes,
      productosRes,
      ventasRes,
      movimientosRes,
      lotesRes,
    ] = await Promise.all([
      db.execute("SELECT * FROM empresas WHERE activo = 1 LIMIT 1"),
      db.execute("SELECT * FROM sucursales WHERE activo = 1"),
      db.execute("SELECT * FROM categorias WHERE activo = 1 ORDER BY nombre ASC"),
      db.execute("SELECT * FROM proveedores WHERE activo = 1 ORDER BY nombre ASC"),
      db.execute("SELECT * FROM clientes WHERE activo = 1 ORDER BY nombre ASC"),
      db.execute(`
        SELECT p.*, c.nombre as categoria_nombre 
        FROM productos p 
        LEFT JOIN categorias c ON p.categoria_id = c.id 
        WHERE p.activo = 1 
        ORDER BY p.sku ASC
      `),
      db.execute(`
        SELECT v.*, c.nombre as cliente_nombre 
        FROM ventas v 
        LEFT JOIN clientes c ON v.cliente_id = c.id 
        ORDER BY v.numero_folio DESC 
        LIMIT 200
      `),
      db.execute(`
        SELECT m.*, p.nombre as producto_nombre, p.sku as producto_sku 
        FROM movimientos_inventario m 
        LEFT JOIN productos p ON m.producto_id = p.id 
        ORDER BY m.created_at DESC 
        LIMIT 300
      `),
      db.execute(`
        SELECT l.*, p.nombre as producto_nombre, p.precio_venta as precio_base
        FROM lotes l
        JOIN productos p ON l.producto_id = p.id
        WHERE l.stock_actual > 0
        ORDER BY l.fecha_elaboracion ASC
      `),
    ]);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      empresa: empresasRes.rows[0] || null,
      sucursales: sucursalesRes.rows,
      categorias: categoriasRes.rows,
      proveedores: proveedoresRes.rows,
      clientes: clientesRes.rows,
      productos: productosRes.rows,
      ventas: ventasRes.rows,
      movimientos: movimientosRes.rows,
      lotes: lotesRes.rows,
    });
  } catch (error: any) {
    console.error("Error en sync API:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error al sincronizar datos" },
      { status: 500 }
    );
  }
}
