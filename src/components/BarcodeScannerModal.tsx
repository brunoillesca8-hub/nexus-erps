"use client";

import React, { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { X, Camera, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";

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

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

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
      if (codeReaderRef.current) {
        codeReaderRef.current = null;
      }
      setScannedCode(null);
      setErrorMsg(null);
      return;
    }

    const codeReader = new BrowserMultiFormatReader();
    codeReaderRef.current = codeReader;
    setIsInitializing(true);
    setErrorMsg(null);

    BrowserMultiFormatReader.listVideoInputDevices()
      .then((videoInputDevices) => {
        setDevices(videoInputDevices);
        if (videoInputDevices.length > 0) {
          const backCamera = videoInputDevices.find((device) =>
            /back|rear|environment|trasera|posterior/i.test(device.label)
          );
          const defaultId = backCamera ? backCamera.deviceId : videoInputDevices[0].deviceId;
          setSelectedDeviceId(defaultId);
          startScanning(codeReader, defaultId);
        } else {
          setErrorMsg("No se detectó ninguna cámara disponible.");
          setIsInitializing(false);
        }
      })
      .catch((err) => {
        console.error("Error al listar cámaras:", err);
        setErrorMsg("Permiso de cámara denegado.");
        setIsInitializing(false);
      });

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isOpen]);

  const startScanning = async (reader: BrowserMultiFormatReader, deviceId: string) => {
    setIsInitializing(true);
    setErrorMsg(null);
    try {
      if (!videoRef.current) return;

      await reader.decodeFromVideoDevice(
        deviceId,
        videoRef.current,
        (result) => {
          if (result) {
            const text = result.getText();
            setScannedCode(text);
            playBeep();
            setTimeout(() => {
              onScan(text);
              onClose();
            }, 400);
          }
        }
      );
      setIsInitializing(false);
    } catch (err: any) {
      setErrorMsg(err.message || "Error con la cámara.");
      setIsInitializing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden flex flex-col">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-2 text-slate-800">
            <Camera className="w-4 h-4 text-slate-600" />
            <h3 className="font-bold text-sm">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600"
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
          />

          {/* Retícula */}
          {!errorMsg && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
              <div className="w-56 h-32 border-2 border-dashed border-cyan-400 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <div className="w-full h-0.5 bg-cyan-400 animate-pulse"></div>
              </div>
            </div>
          )}

          {/* Feedback Detectado */}
          {scannedCode && (
            <div className="absolute inset-0 bg-emerald-900/90 flex flex-col items-center justify-center text-white p-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-1" />
              <span className="text-xs font-semibold">¡Detectado!</span>
              <span className="text-base font-mono font-bold mt-1">{scannedCode}</span>
            </div>
          )}

          {errorMsg && (
            <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center p-4 text-center">
              <AlertCircle className="w-8 h-8 text-rose-500 mb-2" />
              <p className="text-xs font-semibold text-rose-700">{errorMsg}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span>Soporta EAN-13, CODE_128, QR</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-medium"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
