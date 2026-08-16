"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import {
  X,
  Camera,
  AlertCircle,
  CheckCircle2,
  Flashlight,
  FlashlightOff,
  SwitchCamera,
  Keyboard,
  ArrowRight,
} from "lucide-react";

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
  title = "Lector de Códigos de Barra",
}: BarcodeScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Buffer de verificación de 2 lecturas idénticas para evitar falsos positivos
  const lastDetectedRef = useRef<string | null>(null);
  const detectCountRef = useRef<number>(0);

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1900, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch {
      // Ignorar
    }
  };

  // Detener todos los tracks y apagar la cámara
  const stopCamera = useCallback(() => {
    if (controlsRef.current) {
      try {
        controlsRef.current.stop();
      } catch {
        // Ignorar
      }
      controlsRef.current = null;
    }

    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((t) => t.stop());
      } catch {
        // Ignorar
      }
      streamRef.current = null;
    }

    if (videoRef.current) {
      if (videoRef.current.srcObject) {
        const s = videoRef.current.srcObject as MediaStream;
        s.getTracks().forEach((t) => t.stop());
      }
      videoRef.current.srcObject = null;
    }
    lastDetectedRef.current = null;
    detectCountRef.current = 0;
    setTorchOn(false);
  }, []);

  const handleClose = useCallback(() => {
    stopCamera();
    onClose();
  }, [stopCamera, onClose]);

  // Alternar Linterna
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const newStatus = !torchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: newStatus }],
      });
      setTorchOn(newStatus);
    } catch (e) {
      console.warn("Torch no soportado:", e);
    }
  };

  // Limpieza de código detectado
  const cleanBarcode = (raw: string): string => {
    return raw.replace(/[\u0000-\u001F\u007F-\u009F]/g, "").trim();
  };

  // Iniciar Escáner con dispositivo específico
  const startScanningDevice = useCallback(
    async (deviceId: string) => {
      stopCamera();
      setErrorMsg(null);

      try {
        // Formatos de retail estrictos y precisos (evita colisiones con formatos ruidosos como ITF o Code 39)
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.CODE_128,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.QR_CODE,
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);

        const codeReader = new BrowserMultiFormatReader(hints, {
          delayBetweenScanAttempts: 60,
          delayBetweenScanSuccess: 600,
        });

        if (!videoRef.current) return;

        const controls = await codeReader.decodeFromVideoDevice(
          deviceId || undefined,
          videoRef.current,
          (result, error) => {
            if (result) {
              const rawText = result.getText();
              const text = cleanBarcode(rawText);
              if (!text || text.length < 3) return;

              // Verificación de estabilidad: debe coincidir 2 veces consecutivas o ser un código QR/EAN de longitud completa
              if (
                lastDetectedRef.current === text ||
                text.length >= 12 ||
                result.getBarcodeFormat() === BarcodeFormat.QR_CODE
              ) {
                setScannedCode(text);
                playBeep();
                stopCamera();
                setTimeout(() => {
                  onScan(text);
                  handleClose();
                }, 250);
              } else {
                lastDetectedRef.current = text;
                detectCountRef.current = 1;
              }
            }
          }
        );

        controlsRef.current = controls;

        // Comprobar soporte de linterna
        if (videoRef.current && videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          streamRef.current = stream;
          const track = stream.getVideoTracks()[0];
          if (track) {
            const capabilities = (track as any).getCapabilities?.() || {};
            setHasTorch(!!capabilities.torch);
          }
        }
      } catch (err: any) {
        console.error("Error al iniciar escáner:", err);
        setErrorMsg(
          err.message?.includes("Permission") || err.name === "NotAllowedError"
            ? "Permiso de cámara denegado. Permite el acceso a la cámara en los ajustes de tu navegador."
            : "No se pudo conectar con la cámara seleccionada. Prueba cambiando de cámara."
        );
      }
    },
    [stopCamera, onScan, handleClose]
  );

  // Inicialización de dispositivos
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setScannedCode(null);
      setErrorMsg(null);
      setManualCode("");
      return;
    }

    let isMounted = true;
    setErrorMsg(null);

    BrowserMultiFormatReader.listVideoInputDevices()
      .then((videoInputDevices) => {
        if (!isMounted) return;
        setDevices(videoInputDevices);

        if (videoInputDevices.length > 0) {
          // Preferir cámara trasera en móviles (back / rear / environment)
          const rearCam = videoInputDevices.find((d) =>
            /back|rear|environment|trasera|posterior/i.test(d.label)
          );
          const chosenId = rearCam ? rearCam.deviceId : videoInputDevices[0].deviceId;
          setSelectedDeviceId(chosenId);
          startScanningDevice(chosenId);
        } else {
          startScanningDevice("");
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error("Error al listar dispositivos:", err);
        startScanningDevice("");
      });

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [isOpen, startScanningDevice, stopCamera]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    const code = cleanBarcode(manualCode);
    stopCamera();
    onScan(code);
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabecera Modal */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-2 text-slate-800">
            <Camera className="w-4 h-4 text-[#3a4d6b]" />
            <h3 className="font-bold text-xs sm:text-sm">{title}</h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Visor de Cámara */}
        <div className="relative aspect-square sm:aspect-video bg-black flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
            autoPlay
          />

          {/* Guía Visual */}
          {!errorMsg && !scannedCode && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
              <div className="w-64 h-36 border-2 border-dashed border-cyan-400 rounded-xl bg-cyan-500/10 flex items-center justify-center relative shadow-lg">
                <div className="w-full h-0.5 bg-cyan-400 animate-pulse shadow-sm"></div>
                <span className="absolute bottom-2 text-[10px] text-cyan-200 bg-black/60 px-2 py-0.5 rounded font-mono">
                  Enfoca el código de barras aquí
                </span>
              </div>
            </div>
          )}

          {/* Feedback de Código Detectado */}
          {scannedCode && (
            <div className="absolute inset-0 bg-emerald-900/95 flex flex-col items-center justify-center text-white p-4 animate-fadeIn">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-2 animate-bounce" />
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-200">
                ¡Código Detectado!
              </span>
              <span className="text-base sm:text-lg font-mono font-bold mt-1 bg-white/10 px-3 py-1 rounded">
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
                Puedes ingresar el código manualmente abajo o cambiar de cámara.
              </p>
            </div>
          )}

          {/* Controles sobre el video (Linterna) */}
          <div className="absolute top-2 right-2 flex items-center space-x-1.5 z-10">
            {hasTorch && (
              <button
                onClick={toggleTorch}
                className={`p-2 rounded-full backdrop-blur-md transition-colors ${
                  torchOn ? "bg-amber-400 text-black shadow-md" : "bg-black/50 text-white hover:bg-black/70"
                }`}
                title={torchOn ? "Apagar Linterna" : "Encender Linterna"}
              >
                {torchOn ? <FlashlightOff className="w-4 h-4" /> : <Flashlight className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {/* Selector de Cámaras si hay más de 1 */}
        {devices.length > 1 && (
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-600 flex items-center space-x-1 font-medium">
              <SwitchCamera className="w-3.5 h-3.5" />
              <span>Cámara:</span>
            </span>
            <select
              value={selectedDeviceId}
              onChange={(e) => {
                setSelectedDeviceId(e.target.value);
                startScanningDevice(e.target.value);
              }}
              className="bg-white border border-slate-300 text-slate-800 rounded px-2.5 py-1 text-xs max-w-[200px] focus:outline-none"
            >
              {devices.map((d, idx) => (
                <option key={d.deviceId || idx} value={d.deviceId}>
                  {d.label || `Cámara ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Respaldo: Ingreso Manual de Código */}
        <div className="p-4 bg-white border-t border-slate-200 space-y-2">
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center space-x-1">
            <Keyboard className="w-3.5 h-3.5" />
            <span>O ingresa el código manualmente:</span>
          </span>

          <form onSubmit={handleManualSubmit} className="flex space-x-1.5">
            <input
              type="text"
              placeholder="Ej: 780000000001 o SKU-0001"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="flex-1 bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-3 py-1.5 text-xs font-mono focus:bg-white focus:ring-1 focus:ring-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="px-3.5 py-1.5 rounded-lg bg-[#3a4d6b] hover:bg-slate-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-40 flex items-center space-x-1"
            >
              <span>Buscar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Lectura optimizada EAN-13, CODE-128 y QR</span>
          <button
            onClick={handleClose}
            className="px-3 py-1 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold shadow-2xs"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
