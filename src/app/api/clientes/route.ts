import { NextResponse } from "next/server";
import { getTursoClient } from "@/lib/turso";
import { generateUUID } from "@/lib/utils";

export async function GET() {
  try {
    const db = getTursoClient();
    const res = await db.execute("SELECT * FROM clientes WHERE activo = 1 ORDER BY nombre ASC");
    return NextResponse.json({ clientes: res.rows });
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
      sql: `INSERT INTO clientes (id, empresa_id, nombre, rut_identificador, telefono, email, direccion, notas, activo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
            ON CONFLICT(id) DO UPDATE SET
              nombre = excluded.nombre,
              rut_identificador = excluded.rut_identificador,
              telefono = excluded.telefono,
              email = excluded.email,
              direccion = excluded.direccion,
              notas = excluded.notas`,
      args: [
        id,
        empresaId,
        body.nombre || "Cliente General",
        body.rut_identificador || null,
        body.telefono || null,
        body.email || null,
        body.direccion || null,
        body.notas || null,
      ],
    });

    const res = await db.execute({ sql: "SELECT * FROM clientes WHERE id = ?", args: [id] });
    return NextResponse.json({ success: true, cliente: res.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
