'use client';

import { useState, useMemo } from 'react';

const fmt = (v) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);

const fmtPct = (v) => `${v.toFixed(1)}%`;

/* ── Gráfico de líneas SVG puro ── */
function LineChart({ data, horizonte }) {
  const [hovered, setHovered] = useState(null);
  const W = 560, H = 260;
  const pad = { t: 24, r: 16, b: 40, l: 16 };
  const cW = W - pad.l - pad.r;
  const cH = H - pad.t - pad.b;

  const maxVal = Math.max(...data.map((d) => Math.max(d.nominal, d.invertido, d.real)));
  const scaleY = (v) => pad.t + cH - (v / maxVal) * cH;
  const scaleX = (i) => pad.l + (i / horizonte) * cW;

  const toPath = (key) =>
    data.map((d, i) => `${i === 0 ? 'M' : 'L'}${scaleX(i)},${scaleY(d[key])}`).join(' ');

  const series = [
    { key: 'invertido', color: '#3b82f6', label: 'Capital invertido' },
    { key: 'nominal',   color: '#94a3b8', label: 'Valor nominal'     },
    { key: 'real',      color: '#ef4444', label: 'Poder adquisitivo' },
  ];

  // Grid lines
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    y: pad.t + cH * (1 - t),
    label: fmt(maxVal * t),
  }));

  return (
    <div className="relative">
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ maxHeight: 260 }}
        onMouseLeave={() => setHovered(null)}>
        {/* Grid */}
        {gridLines.map((g, i) => (
          <g key={i}>
            <line x1={pad.l} y1={g.y} x2={W - pad.r} y2={g.y}
              stroke="#f1f5f9" strokeWidth={1} />
          </g>
        ))}

        {/* Lines */}
        {series.map((s) => (
          <path key={s.key} d={toPath(s.key)}
            fill="none" stroke={s.color} strokeWidth={2.5}
            strokeLinecap="round" strokeLinejoin="round" />
        ))}

        {/* Hover zone + dots */}
        {data.map((d, i) => (
          <g key={i}>
            <rect
              x={scaleX(i) - 12} y={pad.t} width={24} height={cH}
              fill="transparent"
              onMouseEnter={() => setHovered(i)}
            />
            {hovered === i && series.map((s) => (
              <circle key={s.key}
                cx={scaleX(i)} cy={scaleY(d[s.key])}
                r={4} fill={s.color} stroke="white" strokeWidth={1.5} />
            ))}
          </g>
        ))}

        {/* Vertical hover line */}
        {hovered !== null && (
          <line
            x1={scaleX(hovered)} y1={pad.t}
            x2={scaleX(hovered)} y2={pad.t + cH}
            stroke="#cbd5e1" strokeWidth={1} strokeDasharray="4 2" />
        )}

        {/* X labels */}
        {data.filter((_, i) => i % Math.ceil(horizonte / 5) === 0 || i === horizonte).map((d, _) => (
          <text key={d.año}
            x={scaleX(d.año)} y={H - 8}
            textAnchor="middle" fontSize={9} fill="#94a3b8">
            Año {d.año}
          </text>
        ))}
      </svg>

      {/* Tooltip flotante */}
      {hovered !== null && hovered > 0 && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs rounded-xl px-3 py-2 shadow-lg pointer-events-none z-10 whitespace-nowrap">
          <p className="font-bold mb-1 text-slate-300">Año {data[hovered]?.año}</p>
          <p className="text-blue-300">Invertido: {fmt(data[hovered]?.invertido)}</p>
          <p className="text-slate-400">Nominal:  {fmt(data[hovered]?.nominal)}</p>
          <p className="text-red-300">Real:     {fmt(data[hovered]?.real)}</p>
        </div>
      )}
    </div>
  );
}

/* ── Componente principal ── */
export default function SimuladorInflacion({ ingreso = 5000000 }) {
  const [tasaInflacion,  setTasaInflacion]  = useState(10.5); // IPC Colombia 2024
  const [tasaInversion,  setTasaInversion]  = useState(12.0); // Fondo diversificado
  const [horizonte,      setHorizonte]      = useState(10);
  const [mostrarTabla,   setMostrarTabla]   = useState(false);

  const datos = useMemo(() => {
    return Array.from({ length: horizonte + 1 }, (_, año) => ({
      año,
      nominal:   ingreso,
      real:      ingreso / Math.pow(1 + tasaInflacion / 100, año),
      invertido: ingreso * Math.pow(1 + tasaInversion / 100, año),
    }));
  }, [ingreso, tasaInflacion, tasaInversion, horizonte]);

  const ultimo     = datos[horizonte];
  const perdidaReal = ingreso - ultimo.real;
  const gananciaInv = ultimo.invertido - ingreso;
  const delta       = ultimo.invertido - ultimo.real;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-5 text-white">
        <div className="flex items-center gap-3 mb-1">
          <span className="bg-amber-400 text-amber-900 text-xs font-bold px-2.5 py-0.5 rounded-full">
            ✦ Premium
          </span>
          <h3 className="font-extrabold text-lg">Simulador de Inflación</h3>
        </div>
        <p className="text-blue-100 text-sm">
          Descubre cómo la inflación devora tu poder adquisitivo y cuánto ganarías invirtiendo.
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Controles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Tasa inflación */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              Inflación anual (IPC)
            </label>
            <div className="flex items-center gap-2">
              <input type="range" min={1} max={30} step={0.5}
                value={tasaInflacion}
                onChange={(e) => setTasaInflacion(Number(e.target.value))}
                className="flex-1 accent-red-500" />
              <span className="text-sm font-bold text-red-600 w-12 text-right">
                {fmtPct(tasaInflacion)}
              </span>
            </div>
          </div>

          {/* Tasa inversión */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              Rendimiento inversión
            </label>
            <div className="flex items-center gap-2">
              <input type="range" min={1} max={40} step={0.5}
                value={tasaInversion}
                onChange={(e) => setTasaInversion(Number(e.target.value))}
                className="flex-1 accent-blue-500" />
              <span className="text-sm font-bold text-blue-600 w-12 text-right">
                {fmtPct(tasaInversion)}
              </span>
            </div>
          </div>

          {/* Horizonte */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              Horizonte temporal
            </label>
            <div className="flex items-center gap-2">
              <input type="range" min={1} max={20} step={1}
                value={horizonte}
                onChange={(e) => setHorizonte(Number(e.target.value))}
                className="flex-1 accent-slate-500" />
              <span className="text-sm font-bold text-slate-700 w-14 text-right">
                {horizonte} años
              </span>
            </div>
          </div>
        </div>

        {/* Gráfico */}
        <LineChart data={datos} horizonte={horizonte} />

        {/* Leyenda */}
        <div className="flex flex-wrap gap-4 justify-center">
          {[
            { color: '#3b82f6', label: 'Capital invertido' },
            { color: '#94a3b8', label: 'Valor nominal'     },
            { color: '#ef4444', label: 'Poder adquisitivo' },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-xs text-slate-500">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Cards resumen */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-red-50 border border-red-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-1">
              Pierdes por inflación
            </p>
            <p className="text-xl font-extrabold text-red-600">{fmt(perdidaReal)}</p>
            <p className="text-xs text-red-400 mt-0.5">en {horizonte} años</p>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">
              Ganas invirtiendo
            </p>
            <p className="text-xl font-extrabold text-blue-600">{fmt(gananciaInv)}</p>
            <p className="text-xs text-blue-400 mt-0.5">al {fmtPct(tasaInversion)} anual</p>
          </div>

          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
              Diferencia total
            </p>
            <p className="text-xl font-extrabold text-emerald-600">{fmt(delta)}</p>
            <p className="text-xs text-emerald-400 mt-0.5">invertir vs no invertir</p>
          </div>
        </div>

        {/* Tabla colapsable */}
        <div>
          <button
            onClick={() => setMostrarTabla((v) => !v)}
            className="text-sm text-blue-600 hover:underline font-medium flex items-center gap-1"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: mostrarTabla ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
            {mostrarTabla ? 'Ocultar' : 'Ver'} tabla año a año
          </button>

          {mostrarTabla && (
            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider">
                    <th className="px-3 py-2 text-left">Año</th>
                    <th className="px-3 py-2 text-right">Nominal</th>
                    <th className="px-3 py-2 text-right text-red-500">Poder adquisitivo</th>
                    <th className="px-3 py-2 text-right text-blue-500">Capital invertido</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.map((d) => (
                    <tr key={d.año} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-1.5 font-semibold text-slate-700">{d.año}</td>
                      <td className="px-3 py-1.5 text-right text-slate-500">{fmt(d.nominal)}</td>
                      <td className="px-3 py-1.5 text-right text-red-600">{fmt(d.real)}</td>
                      <td className="px-3 py-1.5 text-right text-blue-600">{fmt(d.invertido)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
