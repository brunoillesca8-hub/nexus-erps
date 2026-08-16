import { NextResponse } from "next/server";
import { getTursoClient } from "@/lib/turso";
import { generateUUID } from "@/lib/utils";

export async function GET() {
  try {
    const db = getTursoClient();
    const res = await db.execute("SELECT * FROM proveedores WHERE activo = 1 ORDER BY nombre ASC");
    return NextResponse.json({ proveedores: res.rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const db = getTursoClient();
    const id = body.id || generateUUID();
    const empresaId = body.empresa_id || "emp_default";

    await db.execute({
      sql: `INSERT INTO proveedores (id, empresa_id, nombre, rut_identificador, contacto_nombre, telefono, email, direccion, activo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
            ON CONFLICT(id) DO UPDATE SET
              nombre = excluded.nombre,
              rut_identificador = excluded.rut_identificador,
              contacto_nombre = excluded.contacto_nombre,
              telefono = excluded.telefono,
              email = excluded.email,
              direccion = excluded.direccion`,
      args: [
        id,
        empresaId,
        body.nombre || "Proveedor General",
        body.rut_identificador || null,
        body.contacto_nombre || null,
        body.telefono || null,
        body.email || null,
        body.direccion || null,
      ],
    });

    const res = await db.execute({ sql: "SELECT * FROM proveedores WHERE id = ?", args: [id] });
    return NextResponse.json({ success: true, proveedor: res.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
