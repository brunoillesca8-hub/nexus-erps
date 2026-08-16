"use client";

import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Clock, Flame, TrendingUp, BarChart3 } from "lucide-react";
import { useErp } from "@/context/erp-context";
import { formatCLP } from "@/lib/utils";

export default function InformeHorariosPage() {
  const { ventas } = useErp();

  const hourlyData = useMemo(() => {
    const hoursMap: { [key: string]: { ventas: number; totalDinero: number } } = {};

    for (let h = 8; h <= 22; h++) {
      const hourStr = `${h.toString().padStart(2, "0")}:00`;
      hoursMap[hourStr] = { ventas: 0, totalDinero: 0 };
    }

    ventas.forEach((v) => {
      if (!v.fecha_venta) return;
      try {
        const date = new Date(v.fecha_venta);
        const hour = date.getHours();
        const hourKey = `${hour.toString().padStart(2, "0")}:00`;

        if (hoursMap[hourKey]) {
          hoursMap[hourKey].ventas += 1;
          hoursMap[hourKey].totalDinero += Number(v.total || 0);
        }
      } catch {
        // Ignorar
      }
    });

    return Object.entries(hoursMap).map(([hora, stats]) => ({
      hora,
      ventas: stats.ventas,
      totalDinero: stats.totalDinero,
    }));
  }, [ventas]);

  const peakHour = useMemo(() => {
    let max = { hora: "08:00", ventas: 0, totalDinero: 0 };
    hourlyData.forEach((item) => {
      if (item.ventas > max.ventas) {
        max = item;
      }
    });
    return max.ventas > 0 ? max : null;
  }, [hourlyData]);

  const totalVentasRegistradas = ventas.length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
          <Clock className="w-4 h-4 text-[#3a4d6b]" />
          <span>Comportamiento de Clientes</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-1">
          Análisis de Demanda por Horarios
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Distribución de ventas por franja horaria (08:00 a 22:00 hrs) y detección de hora punta.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-lg bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Hora Punta
            </span>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">
              {peakHour ? `${peakHour.hora} hrs` : "Calculando..."}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {peakHour ? `${peakHour.ventas} ventas en esta franja` : "Sin ventas aún"}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-amber-50 text-amber-600">
            <Flame className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-lg bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Boletas
            </span>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              {totalVentasRegistradas}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Histórico analizado</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-100 text-slate-700">
            <BarChart3 className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-lg bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Recaudación en Franja
            </span>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              {formatCLP(hourlyData.reduce((acc, h) => acc + h.totalDinero, 0))}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">08:00 a 22:00 hrs</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-100 text-slate-700">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs">
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-slate-600" />
            <h2 className="font-bold text-sm text-slate-900">
              Curva de Ventas por Franja Horaria
            </h2>
          </div>
          <span className="text-xs text-slate-400">Eje X: Horas • Eje Y: Cantidad de Ventas</span>
        </div>

        {totalVentasRegistradas === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center text-slate-400 text-center p-8">
            <BarChart3 className="w-10 h-10 opacity-30 mb-2" />
            <h3 className="text-sm font-semibold text-slate-600">
              Aún no hay ventas registradas
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              La gráfica de horas punta se calculará automáticamente con las primeras ventas del POS.
            </p>
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="hora" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white border border-slate-300 p-3 rounded-lg shadow-md text-xs space-y-1">
                          <p className="font-bold text-slate-900">{label} hrs</p>
                          <p className="text-slate-600">
                            Ventas: <span className="font-bold">{data.ventas} boletas</span>
                          </p>
                          <p className="text-emerald-600">
                            Monto: <span className="font-bold">{formatCLP(data.totalDinero)}</span>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="ventas" radius={[4, 4, 0, 0]}>
                  {hourlyData.map((entry, index) => {
                    const isPeak = peakHour && entry.hora === peakHour.hora && entry.ventas > 0;
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={isPeak ? "#f59e0b" : "#3a4d6b"}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
