"use client";

import React, { useState, useEffect } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  UploadCloud,
  FileSpreadsheet,
  Trash2,
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Download,
  KeyRound,
  FileText,
  Building2,
  ShieldCheck,
  Send,
  Sparkles,
  Lock,
} from "lucide-react";
import { useErp } from "@/context/erp-context";
import { formatCLP } from "@/lib/utils";
import type { Producto, ConfiguracionDTE } from "@/types/erp";

export default function ConfiguracionPage() {
  const {
    productos,
    ventas,
    movimientos,
    categorias,
    agregarProductosLote,
    vaciarCatalogo,
    recargarDatos,
    user,
    cambiarPassword,
  } = useErp();

  const [activeTab, setActiveTab] = useState<"CATALOGO" | "DTE_SII" | "SEGURIDAD">("DTE_SII");

  const [isImporting, setIsImporting] = useState(false);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [parsedPreview, setParsedPreview] = useState<Partial<Producto>[]>([]);

  const [isPurging, setIsPurging] = useState(false);
  const [purgeConfirmText, setPurgeConfirmText] = useState("");
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);

  // Estados de cambio de contraseña
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmNewPass, setConfirmNewPass] = useState("");
  const [passwordFeedback, setPasswordFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Estados de Facturación Electrónica DTE / SII & LibreDTE
  const [dteConfig, setDteConfig] = useState<ConfiguracionDTE>({
    id: "dte_default",
    empresa_id: "emp_default",
    rut_emisor: "76.123.456-7",
    razon_social: "Panadería y Pastelería Artesanal SpA",
    giro: "Elaboración y venta de productos de panadería y pastelería",
    acteco: 154120,
    direccion_origen: "Calle Comercial 123",
    comuna_origen: "Valdivia",
    ciudad_origen: "Valdivia",
    ambiente: "CERTIFICACION",
    libredte_url: "https://libredte.cl",
    libredte_token: "",
    certificado_nombre: "",
    certificado_password: "",
    certificado_base64: "",
    caf_boleta_39_xml: "",
    caf_factura_33_xml: "",
    folio_actual_boleta: 1,
    folio_actual_factura: 1,
    emision_automatica: 0,
  });

  const [isSavingDte, setIsSavingDte] = useState(false);
  const [dteSuccessMsg, setDteSuccessMsg] = useState<string | null>(null);
  const [dteErrorMsg, setDteErrorMsg] = useState<string | null>(null);
  const [isTestingDte, setIsTestingDte] = useState(false);

  // Cargar configuración DTE al montar
  useEffect(() => {
    fetch("/api/dte/config")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.config) {
          setDteConfig(data.config);
        }
      })
      .catch((err) => console.error("Error al cargar config DTE:", err));
  }, []);

  const handleSaveDteConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingDte(true);
    setDteSuccessMsg(null);
    setDteErrorMsg(null);

    try {
      const res = await fetch("/api/dte/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dteConfig),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setDteSuccessMsg("✅ Configuración de Facturación SII / LibreDTE guardada exitosamente.");
        setTimeout(() => setDteSuccessMsg(null), 4000);
      } else {
        setDteErrorMsg(data.error || "Error al guardar configuración DTE.");
      }
    } catch (err: any) {
      setDteErrorMsg(err.message || "Error de red al guardar DTE.");
    } finally {
      setIsSavingDte(false);
    }
  };

  const handleCertFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = (ev.target?.result as string).split(",")[1];
      setDteConfig((prev) => ({
        ...prev,
        certificado_nombre: file.name,
        certificado_base64: base64,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleCafFileChange = (e: React.ChangeEvent<HTMLInputElement>, tipo: "boleta" | "factura") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setDteConfig((prev) => ({
        ...prev,
        [tipo === "boleta" ? "caf_boleta_39_xml" : "caf_factura_33_xml"]: content,
      }));
    };
    reader.readAsText(file);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);

    if (newPass !== confirmNewPass) {
      setPasswordFeedback({
        type: "error",
        message: "Las contraseñas nuevas no coinciden.",
      });
      return;
    }

    const res = await cambiarPassword(currentPass, newPass);
    if (res.success) {
      setPasswordFeedback({
        type: "success",
        message: "¡Contraseña actualizada exitosamente!",
      });
      setCurrentPass("");
      setNewPass("");
      setConfirmNewPass("");
    } else {
      setPasswordFeedback({
        type: "error",
        message: res.error || "Error al cambiar la contraseña.",
      });
    }
  };

  // Corrección de caracteres con codificación rota
  const fixEncoding = (str: string): string => {
    if (!str) return "";
    return str
      .replace(/Ã¡/g, "á")
      .replace(/Ã©/g, "é")
      .replace(/Ã­/g, "í")
      .replace(/Ã³/g, "ó")
      .replace(/Ãº/g, "ú")
      .replace(/Ã±/g, "ñ")
      .replace(/Ã /g, "Á")
      .replace(/Ã‰/g, "É")
      .replace(/Ã /g, "Í")
      .replace(/Ã“/g, "Ó")
      .replace(/Ãš/g, "Ú")
      .replace(/Ã‘/g, "Ñ")
      .replace(/Â/g, "");
  };

  const getRowField = (row: any, ...fieldAliases: string[]): any => {
    for (const alias of fieldAliases) {
      const cleanAlias = alias.toLowerCase().replace(/[\s_\-\.\(\)]/g, "");
      for (const key of Object.keys(row)) {
        const cleanKey = key.toLowerCase().replace(/[\s_\-\.\(\)]/g, "");
        if (cleanKey === cleanAlias && row[key] !== undefined && row[key] !== "") {
          return row[key];
        }
      }
    }
    return undefined;
  };

  const parseNumber = (val: any, defaultVal = 0): number => {
    if (val === undefined || val === null || val === "") return defaultVal;
    if (typeof val === "number") return isNaN(val) ? defaultVal : val;
    const cleanStr = String(val)
      .replace(/[$€\s]/g, "")
      .replace(/\.(?=\d{3})/g, "")
      .replace(",", ".");
    const parsed = parseFloat(cleanStr);
    return isNaN(parsed) ? defaultVal : parsed;
  };

  const cleanBarcode = (val: any): string | null => {
    if (!val) return null;
    const s = String(val).trim();
    if (s.toLowerCase().includes("e+")) {
      const num = Number(s);
      return isNaN(num) ? s : num.toLocaleString("fullwide", { useGrouping: false });
    }
    return s;
  };

  const normalizeParsedRows = (rawRows: any[]): Partial<Producto>[] => {
    const existingSkus = new Set(productos.map((p) => Number(p.sku)));
    let nextAvailableSku =
      productos.length > 0 ? Math.max(...productos.map((p) => Number(p.sku) || 1000)) + 1 : 1001;

    return rawRows
      .filter((row) => {
        const nombre = getRowField(row, "nombre", "producto", "descripcion", "name", "item");
        return nombre && String(nombre).trim().length > 0;
      })
      .map((row) => {
        const rawNombre = String(
          getRowField(row, "nombre", "producto", "descripcion", "name", "item")
        ).trim();
        const nombre = fixEncoding(rawNombre);

        const rawCat = String(
          getRowField(row, "categoria", "categoria_nombre", "rubro", "category", "depto") ||
            "Abarrotes Generales"
        ).trim();
        const catNombre = fixEncoding(rawCat);

        let catId = "cat_abarrotes";
        const foundCat = categorias.find(
          (c) => c.nombre.toLowerCase().trim() === catNombre.toLowerCase()
        );
        if (foundCat) catId = foundCat.id;

        let skuVal = Number(getRowField(row, "sku", "codigo_interno", "id_producto", "codigo"));
        if (!skuVal || isNaN(skuVal) || existingSkus.has(skuVal)) {
          skuVal = nextAvailableSku++;
        }
        existingSkus.add(skuVal);

        const rawBarcode = getRowField(
          row,
          "codigo_barras",
          "codigobarras",
          "barcode",
          "ean",
          "upc",
          "ean13"
        );
        const codigo_barras = cleanBarcode(rawBarcode);

        const precio_compra = parseNumber(
          getRowField(row, "precio_compra", "costo", "costo_neto", "cost", "compra"),
          0
        );
        let precio_venta = parseNumber(
          getRowField(row, "precio_venta", "precio", "pvp", "precio_publico", "venta"),
          0
        );

        if (precio_venta <= 0 && precio_compra > 0) {
          precio_venta = Math.round(precio_compra * 1.35);
        }

        const stock_actual = parseNumber(
          getRowField(row, "stock_actual", "stock", "cantidad", "inventario", "qty"),
          10
        );
        const stock_minimo = parseNumber(
          getRowField(row, "stock_minimo", "minimo", "stock_min", "min_stock"),
          5
        );

        return {
          nombre,
          sku: skuVal,
          codigo_barras,
          categoria_id: catId,
          precio_compra,
          precio_venta,
          stock_actual,
          stock_minimo,
          unidad_medida: "unidad",
        };
      });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportSuccessMessage(null);
    setParsedPreview([]);

    const fileName = file.name.toLowerCase();

    if (fileName.endsWith(".csv")) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        encoding: "UTF-8",
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            const normalized = normalizeParsedRows(results.data);
            setParsedPreview(normalized);
          } else {
            setImportError("El archivo CSV no contiene registros válidos.");
          }
        },
      });
    } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = new Uint8Array(ev.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: "" });

          if (json && json.length > 0) {
            const normalized = normalizeParsedRows(json);
            setParsedPreview(normalized);
          } else {
            setImportError("La hoja de cálculo Excel no contiene filas de datos.");
          }
        } catch {
          setImportError("Error al procesar el archivo Excel. Asegúrate de que no esté corrupto.");
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleExecuteImport = async () => {
    if (parsedPreview.length === 0) return;

    setIsImporting(true);
    setImportError(null);

    const res = await agregarProductosLote(parsedPreview);
    setIsImporting(false);

    if (res.success) {
      setImportSuccessMessage(`¡Éxito! Se importaron ${res.count || parsedPreview.length} productos.`);
      setParsedPreview([]);
      recargarDatos();
    } else {
      setImportError(res.error || "Ocurrió un error al guardar los productos en la base de datos.");
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        nombre: "Ejemplo: Pan Amasado Artesanal",
        sku: "1001",
        codigo_barras: "7801234567890",
        categoria: "Pastelería & Elaboración Propia",
        precio_compra: "600",
        precio_venta: "1200",
        stock_actual: "50",
        stock_minimo: "10",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Productos");
    XLSX.writeFile(wb, "plantilla_carga_nexus_erp.xlsx");
  };

  const handlePurgeCatalog = async () => {
    setIsPurging(true);
    await vaciarCatalogo();
    setIsPurging(false);
    setIsPurgeModalOpen(false);
    setPurgeConfirmText("");
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Configuración del Sistema
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Facturación Electrónica SII, importación masiva de catálogo y seguridad.
        </p>
      </div>

      {/* Tabs de Navegación */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("DTE_SII")}
          className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center space-x-2 transition-all ${
            activeTab === "DTE_SII"
              ? "bg-[#3a4d6b] text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>🇨🇱 Facturación SII & LibreDTE</span>
        </button>

        <button
          onClick={() => setActiveTab("CATALOGO")}
          className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center space-x-2 transition-all ${
            activeTab === "CATALOGO"
              ? "bg-[#3a4d6b] text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span>Importador & Catálogo</span>
        </button>

        <button
          onClick={() => setActiveTab("SEGURIDAD")}
          className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center space-x-2 transition-all ${
            activeTab === "SEGURIDAD"
              ? "bg-[#3a4d6b] text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Seguridad & Clave</span>
        </button>
      </div>

      {/* TAB 1: FACTURACIÓN ELECTRÓNICA SII & LIBREDTE */}
      {activeTab === "DTE_SII" && (
        <form onSubmit={handleSaveDteConfig} className="space-y-6 animate-fadeIn">
          {dteSuccessMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center space-x-2 shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{dteSuccessMsg}</span>
            </div>
          )}

          {dteErrorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-300 text-rose-900 text-xs font-bold flex items-center space-x-2 shadow-2xs">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{dteErrorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Panel 1: Datos Tributarios Emisor */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <Building2 className="w-5 h-5 text-[#3a4d6b]" />
                  <h3 className="font-bold text-sm text-slate-900">
                    Datos del Contribuyente Emisor (SII)
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-bold">
                  Documentos Tipo 39 (Boletas) y 33 (Facturas)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">RUT Emisor *</label>
                  <input
                    type="text"
                    required
                    placeholder="76.123.456-7"
                    value={dteConfig.rut_emisor || ""}
                    onChange={(e) => setDteConfig({ ...dteConfig, rut_emisor: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-mono font-bold rounded-lg px-3 py-2 focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Razón Social *</label>
                  <input
                    type="text"
                    required
                    placeholder="Panadería y Pastelería Artesanal SpA"
                    value={dteConfig.razon_social || ""}
                    onChange={(e) => setDteConfig({ ...dteConfig, razon_social: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-medium rounded-lg px-3 py-2 focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="font-bold text-slate-700">Giro Comercial del SII</label>
                  <input
                    type="text"
                    placeholder="Elaboración y venta de productos de panadería, pastelería y rotisería"
                    value={dteConfig.giro || ""}
                    onChange={(e) => setDteConfig({ ...dteConfig, giro: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-3 py-2 focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Código Actividad Económica (ACTECO)</label>
                  <input
                    type="number"
                    placeholder="154120"
                    value={dteConfig.acteco || 154120}
                    onChange={(e) => setDteConfig({ ...dteConfig, acteco: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-mono rounded-lg px-3 py-2 focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Dirección Casa Matriz / Local</label>
                  <input
                    type="text"
                    placeholder="Calle Comercial 123"
                    value={dteConfig.direccion_origen || ""}
                    onChange={(e) => setDteConfig({ ...dteConfig, direccion_origen: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-3 py-2 focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Comuna</label>
                  <input
                    type="text"
                    placeholder="Valdivia"
                    value={dteConfig.comuna_origen || ""}
                    onChange={(e) => setDteConfig({ ...dteConfig, comuna_origen: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-3 py-2 focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Ciudad</label>
                  <input
                    type="text"
                    placeholder="Valdivia"
                    value={dteConfig.ciudad_origen || ""}
                    onChange={(e) => setDteConfig({ ...dteConfig, ciudad_origen: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-3 py-2 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Conexión LibreDTE */}
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <h4 className="font-bold text-xs text-slate-900">
                    Servicio Open Source LibreDTE (Costo $0 CLP)
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">URL del Servicio LibreDTE</label>
                    <input
                      type="text"
                      placeholder="https://libredte.cl"
                      value={dteConfig.libredte_url || "https://libredte.cl"}
                      onChange={(e) => setDteConfig({ ...dteConfig, libredte_url: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-3 py-1.5 focus:bg-white focus:outline-none font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Token de Autenticación LibreDTE</label>
                    <input
                      type="password"
                      placeholder="Ingresa tu token de LibreDTE..."
                      value={dteConfig.libredte_token || ""}
                      onChange={(e) => setDteConfig({ ...dteConfig, libredte_token: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-3 py-1.5 focus:bg-white focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Panel 2: Certificado Digital, CAF y Ambiente */}
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-sm text-slate-900">Firma & Folios SII</h3>
                </div>

                {/* Ambiente */}
                <div className="space-y-1.5 text-xs">
                  <label className="font-bold text-slate-700 block">Ambiente SII:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDteConfig({ ...dteConfig, ambiente: "CERTIFICACION" })}
                      className={`p-2 rounded-lg text-xs font-bold border transition-all ${
                        dteConfig.ambiente === "CERTIFICACION"
                          ? "bg-amber-100 text-amber-950 border-amber-400 shadow-xs"
                          : "bg-white text-slate-600 border-slate-300"
                      }`}
                    >
                      🧪 Certificación / Test
                    </button>
                    <button
                      type="button"
                      onClick={() => setDteConfig({ ...dteConfig, ambiente: "PRODUCCION" })}
                      className={`p-2 rounded-lg text-xs font-bold border transition-all ${
                        dteConfig.ambiente === "PRODUCCION"
                          ? "bg-emerald-100 text-emerald-950 border-emerald-400 shadow-xs"
                          : "bg-white text-slate-600 border-slate-300"
                      }`}
                    >
                      🚀 Producción Real
                    </button>
                  </div>
                </div>

                {/* Certificado Digital */}
                <div className="space-y-2 text-xs pt-2 border-t border-slate-100">
                  <label className="font-bold text-slate-700 block">
                    Firma Electrónica (.p12 / .pfx):
                  </label>
                  <input
                    type="file"
                    accept=".p12, .pfx"
                    onChange={handleCertFileChange}
                    className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-[#3a4d6b] file:text-white"
                  />
                  {dteConfig.certificado_nombre && (
                    <p className="text-[11px] text-emerald-700 font-bold">
                      Archivo cargado: {dteConfig.certificado_nombre}
                    </p>
                  )}

                  <div className="space-y-1 pt-1">
                    <label className="font-bold text-slate-700 block">Clave del Certificado:</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={dteConfig.certificado_password || ""}
                      onChange={(e) =>
                        setDteConfig({ ...dteConfig, certificado_password: e.target.value })
                      }
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-2.5 py-1.5 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Carga de CAF */}
                <div className="space-y-2 text-xs pt-2 border-t border-slate-100">
                  <label className="font-bold text-slate-700 block">
                    Archivo CAF Boletas (.xml descargado del SII):
                  </label>
                  <input
                    type="file"
                    accept=".xml"
                    onChange={(e) => handleCafFileChange(e, "boleta")}
                    className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-700 file:text-white"
                  />
                  {dteConfig.caf_boleta_39_xml && (
                    <p className="text-[11px] text-emerald-700 font-bold">
                      CAF Boleta N° 39 Cargado ✅
                    </p>
                  )}
                </div>

                {/* Control de Folios */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Folio Boleta:</label>
                    <input
                      type="number"
                      min="1"
                      value={dteConfig.folio_actual_boleta || 1}
                      onChange={(e) =>
                        setDteConfig({ ...dteConfig, folio_actual_boleta: Number(e.target.value) })
                      }
                      className="w-full bg-slate-50 border border-slate-300 font-mono font-bold text-slate-900 rounded px-2 py-1"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Folio Factura:</label>
                    <input
                      type="number"
                      min="1"
                      value={dteConfig.folio_actual_factura || 1}
                      onChange={(e) =>
                        setDteConfig({ ...dteConfig, folio_actual_factura: Number(e.target.value) })
                      }
                      className="w-full bg-slate-50 border border-slate-300 font-mono font-bold text-slate-900 rounded px-2 py-1"
                    />
                  </div>
                </div>

                {/* Emisión Automática */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Emitir DTE al cobrar:</span>
                  <input
                    type="checkbox"
                    checked={Boolean(dteConfig.emision_automatica)}
                    onChange={(e) =>
                      setDteConfig({ ...dteConfig, emision_automatica: e.target.checked ? 1 : 0 })
                    }
                    className="w-4 h-4 text-[#3a4d6b] rounded"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingDte}
                className="w-full py-3 rounded-xl bg-[#3a4d6b] hover:bg-slate-700 text-white font-extrabold text-xs sm:text-sm shadow-md transition-all disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSavingDte ? "Guardando..." : "Guardar Configuración DTE"}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: IMPORTADOR MASIVO CSV / EXCEL */}
      {activeTab === "CATALOGO" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <UploadCloud className="w-5 h-5 text-[#3a4d6b]" />
                  <h2 className="font-bold text-sm text-slate-900">Importador Masivo de Catálogo</h2>
                </div>
                <button
                  onClick={downloadTemplate}
                  className="text-xs text-[#3a4d6b] hover:underline font-semibold flex items-center space-x-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar Plantilla Excel</span>
                </button>
              </div>

              <p className="text-xs text-slate-600">
                Carga miles de productos desde un archivo CSV o Excel (.xlsx). El sistema los guardará
                en lotes de 100 registros en Turso.
              </p>

              {/* Zona de Drop */}
              <div className="border-2 border-dashed border-slate-300 hover:border-slate-500 rounded-lg p-8 text-center bg-slate-50/50 transition-colors relative">
                <input
                  type="file"
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-800">
                  Arrastra tu archivo aquí o haz clic para seleccionarlo
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Soporta .CSV y .XLSX</p>
              </div>

              {/* Mensajes */}
              {importSuccessMessage && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                  <span>{importSuccessMessage}</span>
                </div>
              )}

              {importError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Vista Previa */}
              {parsedPreview.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">
                      Vista Previa: {parsedPreview.length} productos detectados
                    </span>
                    <button
                      onClick={() => setParsedPreview([])}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      Descartar
                    </button>
                  </div>

                  <div className="max-h-40 overflow-y-auto bg-slate-50 rounded border border-slate-200 p-2 text-xs divide-y divide-slate-200 font-mono">
                    {parsedPreview.slice(0, 4).map((p, idx) => (
                      <div key={idx} className="py-1 flex justify-between">
                        <span className="text-slate-800 truncate max-w-[180px]">{p.nombre}</span>
                        <span className="text-slate-600">SKU: {p.sku || "Auto"}</span>
                        <span className="text-slate-900 font-semibold">{formatCLP(p.precio_venta || 0)}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    disabled={isImporting}
                    onClick={handleExecuteImport}
                    className="w-full py-2.5 rounded-lg bg-[#3a4d6b] hover:bg-slate-700 text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>
                      {isImporting
                        ? "Importando Productos a Turso..."
                        : `Confirmar e Importar ${parsedPreview.length} Productos`}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Diagnóstico Turso */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs space-y-4">
              <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
                <Database className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-900">Estado de Turso LibSQL</h3>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Total Productos:</span>
                  <span className="font-bold text-slate-900 font-mono">{productos.length}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Total Ventas Registradas:</span>
                  <span className="font-bold text-slate-900 font-mono">{ventas.length}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Movimientos Kardex:</span>
                  <span className="font-bold text-slate-900 font-mono">{movimientos.length}</span>
                </div>
              </div>

              <button
                onClick={() => recargarDatos()}
                className="w-full py-2 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sincronizar Base de Datos</span>
              </button>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-lg p-6 space-y-3">
              <div className="flex items-center space-x-2">
                <Trash2 className="w-4 h-4 text-rose-600" />
                <h3 className="font-bold text-xs text-rose-900 uppercase">Zona de Peligro</h3>
              </div>
              <p className="text-xs text-rose-700 leading-relaxed">
                Vaciar el catálogo de prueba para comenzar desde cero.
              </p>
              <button
                onClick={() => setIsPurgeModalOpen(true)}
                className="w-full py-1.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Vaciar Catálogo de Prueba
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SEGURIDAD & CLAVE */}
      {activeTab === "SEGURIDAD" && (
        <div className="max-w-md bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4 animate-fadeIn">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <Lock className="w-5 h-5 text-[#3a4d6b]" />
            <h3 className="font-bold text-sm text-slate-900">Cambiar Contraseña de Acceso</h3>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-3 text-xs">
            {passwordFeedback && (
              <div
                className={`p-2.5 rounded-lg text-xs font-bold ${
                  passwordFeedback.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                {passwordFeedback.message}
              </div>
            )}

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Contraseña Actual:</label>
              <input
                type="password"
                required
                value={currentPass}
                onChange={(e) => setCurrentPass(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-3 py-1.5 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Nueva Contraseña:</label>
              <input
                type="password"
                required
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-3 py-1.5 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Confirmar Nueva Contraseña:</label>
              <input
                type="password"
                required
                value={confirmNewPass}
                onChange={(e) => setConfirmNewPass(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-3 py-1.5 focus:bg-white focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 rounded-lg bg-[#3a4d6b] hover:bg-slate-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              Actualizar Contraseña
            </button>
          </form>
        </div>
      )}

      {/* Modal Purga */}
      {isPurgeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-lg p-6 space-y-4 shadow-xl">
            <h3 className="font-bold text-sm text-slate-900">¿Estás seguro de vaciar el catálogo?</h3>
            <p className="text-xs text-slate-600">
              Esta acción borrará los productos, ventas y movimientos de inventario.
            </p>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Escribe <span className="font-bold font-mono text-rose-600">CONFIRMAR</span>:
              </label>
              <input
                type="text"
                value={purgeConfirmText}
                onChange={(e) => setPurgeConfirmText(e.target.value)}
                placeholder="CONFIRMAR"
                className="w-full bg-white border border-slate-300 text-slate-900 font-mono rounded px-3 py-1.5 text-xs focus:ring-1 focus:ring-slate-500 focus:outline-none"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setIsPurgeModalOpen(false)}
                className="px-3.5 py-1.5 rounded bg-white border border-slate-300 text-slate-700 text-xs"
              >
                Cancelar
              </button>
              <button
                disabled={purgeConfirmText !== "CONFIRMAR" || isPurging}
                onClick={handlePurgeCatalog}
                className="px-4 py-1.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-40"
              >
                {isPurging ? "Vaciando..." : "Sí, Vaciar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
