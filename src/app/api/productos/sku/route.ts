import { NextResponse } from "next/server";
import { getTursoClient } from "@/lib/turso";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getTursoClient();
    const res = await db.execute("SELECT COALESCE(MAX(sku), 1000) as max_sku FROM productos");
    const maxSku = Number(res.rows[0]?.max_sku || 1000);
    const nextSku = maxSku + 1;

    return NextResponse.json({
      success: true,
      next_sku: nextSku,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
