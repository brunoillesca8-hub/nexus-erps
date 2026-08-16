"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { X, Camera, AlertCircle, CheckCircle2 } from "lucide-react";

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
}

export default function BarcodeScannerModal({
  isOpen,
  onClose,
  onScan,
  title = "Escanear Código de Barras",
}: BarcodeScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Función para apagar completamente la cámara y liberar el hardware
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      if (videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
      videoRef.current.srcObject = null;
      videoRef.current.load();
    }

    if (codeReaderRef.current) {
      try {
        // Detener decodificación activa
        codeReaderRef.current = null;
      } catch {
        // Ignorar
      }
    }
  }, []);

  const handleClose = useCallback(() => {
    stopCamera();
    onClose();
  }, [stopCamera, onClose]);

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1800, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch {
      // Ignorar
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setScannedCode(null);
      setErrorMsg(null);
      return;
    }

    let isCancelled = false;
    const codeReader = new BrowserMultiFormatReader();
    codeReaderRef.current = codeReader;
    setIsInitializing(true);
    setErrorMsg(null);

    // Solicitar stream directo con preferencia de cámara trasera en móviles
    navigator.mediaDevices
      ?.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })
      .then((stream) => {
        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }

        // Iniciar decodificación continua con ZXing
        codeReader.decodeFromStream(
          stream,
          videoRef.current!,
          (result) => {
            if (result && !isCancelled) {
              const text = result.getText();
              setScannedCode(text);
              playBeep();
              stopCamera();
              setTimeout(() => {
                onScan(text);
                handleClose();
              }, 300);
            }
          }
        );
        setIsInitializing(false);
      })
      .catch((err) => {
        if (isCancelled) return;
        console.error("Error al acceder a cámara:", err);
        setErrorMsg("No se pudo acceder a la cámara o el permiso fue denegado.");
        setIsInitializing(false);
      });

    return () => {
      isCancelled = true;
      stopCamera();
    };
  }, [isOpen, onScan, handleClose, stopCamera]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden flex flex-col">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-2 text-slate-800">
            <Camera className="w-4 h-4 text-slate-600" />
            <h3 className="font-bold text-sm">{title}</h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Visor de Video */}
        <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
            autoPlay
          />

          {/* Retícula de Enfoque */}
          {!errorMsg && !scannedCode && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
              <div className="w-64 h-36 border-2 border-dashed border-cyan-400 rounded-lg bg-cyan-500/10 flex items-center justify-center relative shadow-sm">
                <div className="w-full h-0.5 bg-cyan-400 animate-pulse"></div>
              </div>
            </div>
          )}

          {/* Feedback de Código Detectado */}
          {scannedCode && (
            <div className="absolute inset-0 bg-emerald-900/90 flex flex-col items-center justify-center text-white p-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-2 animate-bounce" />
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-200">
                ¡Código Detectado!
              </span>
              <span className="text-lg font-mono font-bold mt-1 bg-white/10 px-3 py-1 rounded">
                {scannedCode}
              </span>
            </div>
          )}

          {/* Mensaje de Error */}
          {errorMsg && (
            <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center p-6 text-center">
              <AlertCircle className="w-10 h-10 text-rose-500 mb-2" />
              <p className="text-xs font-semibold text-rose-700">{errorMsg}</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Asegúrate de otorgar permisos de cámara en tu navegador.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span>Apunta la cámara al código de barras o QR</span>
          <button
            onClick={handleClose}
            className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold transition-colors shadow-2xs"
          >
            Cerrar Cámara
          </button>
        </div>
      </div>
    </div>
  );
}
