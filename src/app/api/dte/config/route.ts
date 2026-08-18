import { NextResponse } from "next/server";
import { getTursoClient, initDatabase } from "@/lib/turso";
import type { ConfiguracionDTE } from "@/types/erp";

export async function GET() {
  try {
    const db = getTursoClient();
    await initDatabase();

    const res = await db.execute("SELECT * FROM configuracion_dte LIMIT 1");
    if (res.rows.length === 0) {
      return NextResponse.json({ success: true, config: null });
    }

    return NextResponse.json({ success: true, config: res.rows[0] as unknown as ConfiguracionDTE });
  } catch (error: any) {
    console.error("Error al obtener configuración DTE:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      id = "dte_default",
      empresa_id = "emp_default",
      rut_emisor,
      razon_social,
      giro,
      acteco = 154120,
      direccion_origen,
      comuna_origen,
      ciudad_origen,
      ambiente = "CERTIFICACION",
      libredte_url = "https://libredte.cl",
      libredte_token,
      certificado_nombre,
      certificado_password,
      certificado_base64,
      caf_boleta_39_xml,
      caf_factura_33_xml,
      folio_actual_boleta = 1,
      folio_actual_factura = 1,
      emision_automatica = 0,
    } = body;

    if (!rut_emisor || !razon_social) {
      return NextResponse.json(
        { error: "RUT Emisor y Razón Social son requeridos." },
        { status: 400 }
      );
    }

    const db = getTursoClient();
    await initDatabase();

    const nowIso = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO configuracion_dte (
              id, empresa_id, rut_emisor, razon_social, giro, acteco,
              direccion_origen, comuna_origen, ciudad_origen, ambiente,
              libredte_url, libredte_token, certificado_nombre, certificado_password,
              certificado_base64, caf_boleta_39_xml, caf_factura_33_xml,
              folio_actual_boleta, folio_actual_factura, emision_automatica, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              rut_emisor = excluded.rut_emisor,
              razon_social = excluded.razon_social,
              giro = excluded.giro,
              acteco = excluded.acteco,
              direccion_origen = excluded.direccion_origen,
              comuna_origen = excluded.comuna_origen,
              ciudad_origen = excluded.ciudad_origen,
              ambiente = excluded.ambiente,
              libredte_url = excluded.libredte_url,
              libredte_token = COALESCE(excluded.libredte_token, libredte_token),
              certificado_nombre = COALESCE(excluded.certificado_nombre, certificado_nombre),
              certificado_password = COALESCE(excluded.certificado_password, certificado_password),
              certificado_base64 = COALESCE(excluded.certificado_base64, certificado_base64),
              caf_boleta_39_xml = COALESCE(excluded.caf_boleta_39_xml, caf_boleta_39_xml),
              caf_factura_33_xml = COALESCE(excluded.caf_factura_33_xml, caf_factura_33_xml),
              folio_actual_boleta = excluded.folio_actual_boleta,
              folio_actual_factura = excluded.folio_actual_factura,
              emision_automatica = excluded.emision_automatica,
              updated_at = excluded.updated_at`,
      args: [
        id,
        empresa_id,
        rut_emisor.trim(),
        razon_social.trim(),
        giro || null,
        Number(acteco) || 154120,
        direccion_origen || null,
        comuna_origen || null,
        ciudad_origen || null,
        ambiente,
        libredte_url || "https://libredte.cl",
        libredte_token || null,
        certificado_nombre || null,
        certificado_password || null,
        certificado_base64 || null,
        caf_boleta_39_xml || null,
        caf_factura_33_xml || null,
        Number(folio_actual_boleta) || 1,
        Number(folio_actual_factura) || 1,
        Number(emision_automatica) ? 1 : 0,
        nowIso,
      ],
    });

    return NextResponse.json({
      success: true,
      message: "Configuración DTE guardada exitosamente.",
    });
  } catch (error: any) {
    console.error("Error al guardar configuración DTE:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
