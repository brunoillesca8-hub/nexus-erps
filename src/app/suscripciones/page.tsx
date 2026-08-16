"use client";

import React, { useState } from "react";
import {
  Check,
  Zap,
  ShieldCheck,
  CreditCard,
  Building2,
  Sparkles,
  ArrowRight,
  HelpCircle,
  X,
  ExternalLink,
} from "lucide-react";
import { formatCLP } from "@/lib/utils";

interface Plan {
  id: string;
  name: string;
  badge?: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  popular?: boolean;
  features: string[];
  cta: string;
}

export default function SuscripcionesPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"mercadopago" | "stripe" | "webpay" | "transfer">("mercadopago");
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  const plans: Plan[] = [
    {
      id: "plan_basico",
      name: "Plan Emprendedor",
      badge: "Básico",
      description: "Ideal para quioscos, almacenes pequeños y negocios que recién inician.",
      priceMonthly: 19990,
      priceYearly: 199900,
      features: [
        "1 Sucursal activa",
        "Hasta 500 Productos en catálogo",
        "Punto de Venta (POS) ilimitado",
        "Control de stock e inventario básico",
        "Impresión de tickets térmicos 80mm y 58mm",
        "Soporte estándar vía Email",
      ],
      cta: "Comenzar con Plan Emprendedor",
    },
    {
      id: "plan_pro",
      name: "Plan Pro Crecimiento",
      badge: "Más Popular",
      popular: true,
      description: "Para minimarkets, tiendas de conveniencia y negocios con alta rotación.",
      priceMonthly: 39990,
      priceYearly: 399900,
      features: [
        "Hasta 3 Sucursales",
        "Catálogo de Productos ILIMITADO",
        "POS táctil + Pistola Lectora + Escáner por Cámara",
        "Kardex Físico Completo con auditoría de movimientos",
        "5 Informes Financieros y Análisis de Horarios Punta",
        "Importador y Exportador Masivo Excel / CSV",
        "Sincronización multi-dispositivo en tiempo real (Turso Edge)",
        "Soporte Prioritario por WhatsApp",
      ],
      cta: "Obtener Plan Pro Crecimiento",
    },
    {
      id: "plan_enterprise",
      name: "Plan Corporativo",
      badge: "Empresas",
      description: "Para cadenas de locales, distribuidoras y franquicias de alto volumen.",
      priceMonthly: 69990,
      priceYearly: 699900,
      features: [
        "Sucursales ILIMITADAS",
        "Cajas y terminales POS en simultáneo ilimitados",
        "Gestión Multi-Usuario con roles y permisos",
        "Base de datos Edge LibSQL dedicada con cuota ampliada",
        "API abierta para integración con Facturación Electrónica",
        "Auditoría forense de transacciones e inventario",
        "Soporte Dedicado 24/7 con Gerente de Cuenta",
      ],
      cta: "Contratar Plan Corporativo",
    },
  ];

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setCheckoutSuccess(false);
    setIsCheckoutModalOpen(true);
  };

  const handleProceedPayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setCheckoutSuccess(true);
    }, 1500);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Planes Comerciales y Suscripción Nexus ERP</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Elige el plan ideal para impulsar tu negocio
        </h1>
        <p className="text-sm sm:text-base text-slate-600">
          Sin contratos de permanencia. Todos los planes incluyen sincronización en la nube con Turso Database.
        </p>

        {/* Toggle Facturación Mensual / Anual */}
        <div className="pt-2 flex items-center justify-center">
          <div className="bg-slate-100 p-1 rounded-lg border border-slate-200 flex items-center space-x-1">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                billingCycle === "monthly"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Facturación Mensual
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center space-x-1.5 ${
                billingCycle === "yearly"
                  ? "bg-[#3a4d6b] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Pago Anual</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[10px] font-bold">
                2 Meses Gratis
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid de Planes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        {plans.map((plan) => {
          const price =
            billingCycle === "monthly"
              ? plan.priceMonthly
              : Math.round(plan.priceYearly / 12);

          return (
            <div
              key={plan.id}
              className={`relative rounded-xl bg-white border p-6 flex flex-col justify-between transition-all ${
                plan.popular
                  ? "border-[#3a4d6b] shadow-md ring-2 ring-[#3a4d6b]/20"
                  : "border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-sm"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#3a4d6b] text-white font-bold text-[11px] uppercase tracking-wider shadow-xs">
                  Recomendado
                </div>
              )}

              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-slate-900">{plan.name}</h3>
                  <span className="text-xs px-2 py-0.5 rounded font-semibold bg-slate-100 text-slate-600">
                    {plan.badge}
                  </span>
                </div>

                <p className="text-xs text-slate-500 mt-2 min-h-[36px]">{plan.description}</p>

                {/* Precio */}
                <div className="mt-4 pb-4 border-b border-slate-100">
                  <div className="flex items-baseline">
                    <span className="text-3xl font-extrabold text-slate-900">
                      {formatCLP(price)}
                    </span>
                    <span className="text-xs text-slate-500 font-medium ml-1">/ mes</span>
                  </div>
                  {billingCycle === "yearly" && (
                    <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                      Cobrado anualmente: {formatCLP(plan.priceYearly)} al año
                    </p>
                  )}
                </div>

                {/* Lista de Características */}
                <ul className="mt-4 space-y-2.5 text-xs text-slate-700">
                  {plan.features.map((f, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Botón de Contratación */}
              <div className="mt-6 pt-4 border-t border-slate-100">
                <button
                  onClick={() => handleSelectPlan(plan)}
                  className={`w-full py-2.5 rounded-lg font-bold text-xs shadow-xs transition-colors flex items-center justify-center space-x-2 ${
                    plan.popular
                      ? "bg-[#3a4d6b] hover:bg-slate-700 text-white"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200"
                  }`}
                >
                  <span>{plan.cta}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Checkout / Pasarela de Pagos */}
      {isCheckoutModalOpen && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden flex flex-col">
            {/* Header Modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Pasarela de Suscripción</h3>
                <p className="text-[11px] text-slate-500">
                  {selectedPlan.name} • {billingCycle === "monthly" ? "Mensual" : "Anual"}
                </p>
              </div>
              <button
                onClick={() => setIsCheckoutModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {checkoutSuccess ? (
              <div className="p-8 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">¡Suscripción Activada con Éxito!</h3>
                <p className="text-xs text-slate-600">
                  Tu cuenta ha sido vinculada al <span className="font-bold">{selectedPlan.name}</span>.
                  Los beneficios y cuotas han sido habilitados en Turso Cloud.
                </p>
                <button
                  onClick={() => setIsCheckoutModalOpen(false)}
                  className="w-full py-2.5 rounded-lg bg-[#3a4d6b] text-white text-xs font-bold"
                >
                  Volver al Panel
                </button>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                {/* Resumen de Pago */}
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900">{selectedPlan.name}</span>
                    <p className="text-[11px] text-slate-500">
                      Ciclo: {billingCycle === "monthly" ? "Facturación Mensual" : "Facturación Anual"}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-extrabold text-slate-900">
                      {formatCLP(
                        billingCycle === "monthly"
                          ? selectedPlan.priceMonthly
                          : selectedPlan.priceYearly
                      )}
                    </span>
                    <span className="text-[10px] text-slate-400 block">+ IVA</span>
                  </div>
                </div>

                {/* Selector de Pasarela */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">Selecciona el Método de Pago:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "mercadopago", label: "Mercado Pago", desc: "Tarjetas / Débito" },
                      { id: "webpay", label: "Webpay Plus", desc: "Redcompra Chile" },
                      { id: "stripe", label: "Stripe", desc: "Tarjetas Internacionales" },
                      { id: "transfer", label: "Transferencia", desc: "Factura o Boleta" },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id as any)}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          paymentMethod === m.id
                            ? "bg-slate-100 border-[#3a4d6b] ring-1 ring-[#3a4d6b]"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <p className="font-bold text-xs text-slate-900">{m.label}</p>
                        <p className="text-[10px] text-slate-500">{m.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Botón Pagar */}
                <button
                  disabled={isProcessing}
                  onClick={handleProceedPayment}
                  className="w-full py-3 rounded-lg bg-[#3a4d6b] hover:bg-slate-700 text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>
                    {isProcessing
                      ? "Conectando con la Pasarela..."
                      : `Pagar ${formatCLP(
                          billingCycle === "monthly"
                            ? selectedPlan.priceMonthly
                            : selectedPlan.priceYearly
                        )}`}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
