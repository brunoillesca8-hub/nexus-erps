import { NextResponse } from "next/server";
import { getTursoClient } from "@/lib/turso";

export async function POST() {
  try {
    const db = getTursoClient();

    // Eliminar movimientos, detalles, ventas y productos sin romper la configuración base de categorías y empresa
    await db.batch(
      [
        { sql: "DELETE FROM detalle_ventas;", args: [] },
        { sql: "DELETE FROM movimientos_inventario;", args: [] },
        { sql: "DELETE FROM ventas;", args: [] },
        { sql: "DELETE FROM productos;", args: [] },
      ],
      "write"
    );

    return NextResponse.json({
      success: true,
      message: "Catálogo, ventas, detalles e inventario vaciados exitosamente.",
    });
  } catch (error: any) {
    console.error("Error al vaciar catálogo:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
