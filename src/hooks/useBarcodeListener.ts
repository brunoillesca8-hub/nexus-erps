"use client";

import { useEffect, useRef } from "react";

// Mapa de normalización para teclados en español (Shift + números que envían algunas pistolas/apps Wi-Fi)
const SPANISH_KEY_MAP: Record<string, string> = {
  "!": "1",
  '"': "2",
  "·": "3",
  "$": "4",
  "%": "5",
  "&": "6",
  "/": "7",
  "(": "8",
  ")": "9",
  "=": "0",
  "?": "_",
  "¿": "+",
  "'": "-",
};

interface UseBarcodeListenerOptions {
  onScan: (barcode: string) => void;
  enabled?: boolean;
  maxKeyInterval?: number; // Tiempo entre teclas (ms) para apps Wi-Fi y pistolas
  minLength?: number;
}

/**
 * Hook global para capturar códigos de barra de:
 * 1. Pistolas láser USB y Bluetooth.
 * 2. Apps móviles Wi-Fi ("Barcode to PC", etc.) con latencia de 150-400ms.
 * 3. Eventos de pegado directo (paste) desde el portapapeles.
 */
export function useBarcodeListener({
  onScan,
  enabled = true,
  maxKeyInterval = 600, // 600ms de tolerancia para apps Wi-Fi
  minLength = 3,
}: UseBarcodeListenerOptions) {
  const bufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar teclas de control solas
      if (
        e.key === "Shift" ||
        e.key === "Control" ||
        e.key === "Alt" ||
        e.key === "Meta" ||
        e.key === "CapsLock"
      ) {
        return;
      }

      const now = Date.now();
      const timeSinceLastKey = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Si pasa más tiempo del intervalo configurado, reiniciar el buffer
      if (timeSinceLastKey > maxKeyInterval) {
        bufferRef.current = "";
      }

      // Si se presiona Enter o Tab, procesar el buffer acumulado
      if (e.key === "Enter" || e.key === "Tab") {
        const rawCode = bufferRef.current.trim();
        if (rawCode.length >= minLength) {
          e.preventDefault();
          e.stopPropagation();
          onScan(rawCode);
          bufferRef.current = "";
        }
      } else if (e.key.length === 1) {
        // Normalizar caracteres si la pistola/app envía símbolos modificados por teclado
        const char = SPANISH_KEY_MAP[e.key] || e.key;
        bufferRef.current += char;
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      const pastedData = e.clipboardData?.getData("text")?.trim();
      if (pastedData && pastedData.length >= minLength) {
        // Si no está escribiendo en un input de búsqueda con texto complejo
        const activeTag = document.activeElement?.tagName?.toLowerCase();
        if (activeTag !== "input" && activeTag !== "textarea") {
          e.preventDefault();
          onScan(pastedData);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("paste", handlePaste, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("paste", handlePaste, true);
    };
  }, [onScan, enabled, maxKeyInterval, minLength]);
}
