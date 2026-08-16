import { NextResponse } from "next/server";
import { initDatabase } from "@/lib/turso";

export async function POST() {
  try {
    const result = await initDatabase();
    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Error al inicializar la base de datos" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST();
}
