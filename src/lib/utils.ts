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
