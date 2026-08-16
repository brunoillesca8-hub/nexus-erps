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
 * Ejemplo: "aceit veg" coincidirá con "Aceite Vegetal 1L"
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
 * Formato de fecha legible en español
 */
export function formatDateTime(isoString?: string): string {
  if (!isoString) return "-";
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat("es-CL", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(date);
  } catch {
    return isoString;
  }
}
