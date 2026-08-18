import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formatea un valor numérico a moneda CLP (ej: $12.500)
 */
export function formatCLP(value: number): string {
  if (isNaN(value)) return "$0";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Normaliza texto eliminando acentos, tildes y pasando a minúsculas
 */
export function normalizeText(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Búsqueda predictiva multi-palabra insensible a tildes y orden
 */
export function matchesSearch(target: string, query: string): boolean {
  if (!query || !query.trim()) return true;
  const normalizedTarget = normalizeText(target);
  const words = normalizeText(query).split(/\s+/).filter(Boolean);
  return words.every((word) => normalizedTarget.includes(word));
}

/**
 * Generador de identificadores únicos tipo UUID v4 en cliente y servidor
 */
export function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Parsea fechas de SQLite / UTC a objeto Date con soporte estricto de zona horaria
 */
export function parseChileDate(isoString?: string | null): Date | null {
  if (!isoString) return null;
  try {
    let clean = isoString.trim();
    // Si viene en formato SQLite 'YYYY-MM-DD HH:mm:ss', agregar T y Z para tratarlo como UTC
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(clean)) {
      clean = clean.replace(" ", "T") + "Z";
    } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(clean)) {
      clean = clean + "Z";
    }
    const d = new Date(clean);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

/**
 * Formato de fecha y hora local de Chile (America/Santiago / UTC-4 o UTC-3)
 * Ejemplo: "17/08/2026, 14:30"
 */
export function formatDateTime(isoString?: string | null): string {
  if (!isoString) return "-";
  const date = parseChileDate(isoString);
  if (!date) return isoString;

  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

/**
 * Formato de solo fecha en Chile (ej: "17/08/2026")
 */
export function formatDate(isoString?: string | null): string {
  if (!isoString) return "-";
  const date = parseChileDate(isoString);
  if (!date) return isoString;

  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

/**
 * Formato de solo hora en Chile (ej: "14:30")
 */
export function formatTime(isoString?: string | null): string {
  if (!isoString) return "-";
  const date = parseChileDate(isoString);
  if (!date) return isoString;

  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

/**
 * Obtiene la hora entera (0 a 23) en la zona horaria de Chile (America/Santiago)
 */
export function getChileHour(isoString?: string | null): number | null {
  const date = parseChileDate(isoString);
  if (!date) return null;

  try {
    const hourStr = new Intl.DateTimeFormat("es-CL", {
      timeZone: "America/Santiago",
      hour: "numeric",
      hour12: false,
    }).format(date);
    return parseInt(hourStr, 10);
  } catch {
    return date.getHours();
  }
}

/**
 * Obtiene la fecha actual en Chile en formato "YYYY-MM-DD"
 */
export function getChileTodayDate(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now); // Retorna "YYYY-MM-DD"
}

/**
 * Determina si un producto de pastelería califica automáticamente como "Sobrante del Día Anterior"
 * basándose en la hora oficial de Chile (10:00 PM / 22:00 hrs o elaborado en días previos).
 */
export function isPastryLeftover(producto: {
  categoria_id?: string | null;
  stock_actual?: number;
  fecha_elaboracion?: string | null;
  created_at?: string | null;
}): boolean {
  // Solo aplica a productos de elaboración propia / pastelería con stock disponible
  const isPasteleria =
    producto.categoria_id === "cat_pasteleria" ||
    producto.categoria_id?.toLowerCase().includes("pastel");

  if (!isPasteleria) return false;
  if (Number(producto.stock_actual || 0) <= 0) return false;

  const chileToday = getChileTodayDate();
  const now = new Date();
  const currentChileHour = getChileHour(now.toISOString()) ?? now.getHours();

  // Fecha de elaboración o creación del producto
  const rawElab = producto.fecha_elaboracion
    ? producto.fecha_elaboracion.slice(0, 10)
    : producto.created_at
    ? producto.created_at.slice(0, 10)
    : null;

  if (!rawElab) {
    // Si no tiene fecha, se considera sobrante a partir de las 22:00 hrs
    return currentChileHour >= 22;
  }

  // 1. Si la fecha de elaboración es anterior a hoy -> Es sobrante del día anterior
  if (rawElab < chileToday) {
    return true;
  }

  // 2. Si la fecha de elaboración es hoy, pero ya son las 22:00 hrs (10:00 PM) o más en Chile -> Pasa automáticamente a sobrante
  if (rawElab === chileToday && currentChileHour >= 22) {
    return true;
  }

  return false;
}

/**
 * Desglosa el inventario de un producto de pastelería entre lote Fresco del Día y lote Añejo/Sobrante
 */
export function getPastryStockBreakdown(producto: {
  categoria_id?: string | null;
  stock_actual?: number;
  stock_sobrante?: number;
  fecha_elaboracion?: string | null;
  created_at?: string | null;
}): {
  isPastry: boolean;
  stockTotal: number;
  stockSobrante: number;
  stockFresco: number;
  hasBoth: boolean;
} {
  const isPasteleria = Boolean(
    producto.categoria_id === "cat_pasteleria" ||
    producto.categoria_id?.toLowerCase().includes("pastel")
  );

  const stockTotal = Number(producto.stock_actual) || 0;
  if (!isPasteleria || stockTotal <= 0) {
    return {
      isPastry: isPasteleria,
      stockTotal,
      stockSobrante: 0,
      stockFresco: stockTotal,
      hasBoth: false,
    };
  }

  let explicitSobrante = Number(producto.stock_sobrante) || 0;

  // Si no tiene stock_sobrante explícito pero el producto califica como sobrante por fecha/hora
  if (explicitSobrante === 0 && isPastryLeftover(producto)) {
    explicitSobrante = stockTotal;
  }

  const stockSobrante = Math.min(stockTotal, Math.max(0, explicitSobrante));
  const stockFresco = Math.max(0, stockTotal - stockSobrante);

  return {
    isPastry: true,
    stockTotal,
    stockSobrante,
    stockFresco,
    hasBoth: stockSobrante > 0 && stockFresco > 0,
  };
}
