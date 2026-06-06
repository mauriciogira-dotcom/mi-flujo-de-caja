'use client';

import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import SimuladorInflacion from '@/components/SimuladorInflacion';

/* ── Formato de moneda COP ── */
const fmt = (v) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(v);

/* ── Gráfico de Dona — SVG puro, sin librerías ── */
function DonutChart({ data }) {
  const [hovered, setHovered] = useState(null);
  const W = 280, H = 260, cx = 140, cy = 128, R = 95, r = 62;

  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0)
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
        Ingresa valores para ver la distribución
      </div>
    );

  let angle = -Math.PI / 2;
  const slices = data
    .filter((d) => d.value > 0)
    .map((d) => {
      const span = (d.value / total) * 2 * Math.PI;
      const sa = angle + 0.018;
      const ea = angle + span - 0.018;
      angle += span;
      return { ...d, sa, ea, span };
    })
    .filter((s) => s.ea > s.sa);

  const arcPath = (sa, ea, r1, r2) => {
    const large = ea - sa > Math.PI ? 1 : 0;
    const x1 = cx + r2 * Math.cos(sa), y1 = cy + r2 * Math.sin(sa);
    const x2 = cx + r2 * Math.cos(ea), y2 = cy + r2 * Math.sin(ea);
    const x3 = cx + r1 * Math.cos(ea), y3 = cy + r1 * Math.sin(ea);
    const x4 = cx + r1 * Math.cos(sa), y4 = cy + r1 * Math.sin(sa);
    return `M${x1},${y1}A${r2},${r2},0,${large},1,${x2},${y2}L${x3},${y3}A${r1},${r1},0,${large},0,${x4},${y4}Z`;
  };

  const active = hovered !== null ? slices[hovered] : null;

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ maxHeight: 230 }}>
        {slices.map((s, i) => (
          <path
            key={i}
            d={arcPath(s.sa, s.ea, r, hovered === i ? R + 7 : R)}
            fill={s.color}
            style={{
              transition: 'all 0.18s ease',
              cursor: 'pointer',
              filter:
                hovered === i
                  ? 'drop-shadow(0 3px 8px rgba(0,0,0,0.18))'
                  : 'none',
            }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
        {active ? (
          <>
            <text x={cx} y={cy - 12} textAnchor="middle" fontSize={11} fill="#64748b" fontWeight="500">{active.name}</text>
            <text x={cx} y={cy + 7}  textAnchor="middle" fontSize={14} fill="#1e293b" fontWeight="700">{fmt(active.value)}</text>
            <text x={cx} y={cy + 24} textAnchor="middle" fontSize={10} fill="#94a3b8">{((active.value / total) * 100).toFixed(1)}%</text>
          </>
        ) : (
          <>
            <text x={cx} y={cy - 8}  textAnchor="middle" fontSize={11} fill="#94a3b8">Presupuesto total</text>
            <text x={cx} y={cy + 12} textAnchor="middle" fontSize={13} fill="#475569" fontWeight="700">{fmt(total)}</text>
          </>
        )}
      </svg>

      {/* Leyenda */}
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 mt-1 px-2">
        {data
          .filter((d) => d.value > 0)
          .map((d, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: d.color }}
              />
              <span className="text-xs text-slate-500">{d.name}</span>
            </div>
          ))}
      </div>
    </div>
  );
}

/* ── Gráfico de Barras — SVG puro ── */
function BarChart({ data }) {
  const [hovered, setHovered] = useState(null);
  const W = 380, H = 220;
  const pad = { t: 24, r: 8, b: 40, l: 8 };
  const cW = W - pad.l - pad.r;
  const cH = H - pad.t - pad.b;
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const bw = cW / data.length;
  const LABELS = ['Viv.', 'Serv.', 'Transp.', 'Merc.', 'Seg.', 'Ocio'];

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ maxHeight: 230 }}>
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <line
          key={t}
          x1={pad.l} y1={pad.t + cH * (1 - t)}
          x2={W - pad.r} y2={pad.t + cH * (1 - t)}
          stroke="#f1f5f9" strokeWidth={1}
        />
      ))}
      {data.map((d, i) => {
        const bH = Math.max((d.value / maxVal) * cH, 0);
        const x = pad.l + i * bw + bw * 0.12;
        const bWidth = bw * 0.76;
        const y = pad.t + cH - bH;
        return (
          <g
            key={i}
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <rect
              x={x} y={y} width={bWidth} height={bH > 0 ? bH : 0}
              fill={d.color} rx={5}
              opacity={hovered === null || hovered === i ? 0.9 : 0.35}
              style={{ transition: 'opacity 0.15s' }}
            />
            {hovered === i && bH > 10 && (
              <text
                x={x + bWidth / 2} y={y - 6}
                textAnchor="middle" fontSize={9.5} fill="#1e293b" fontWeight="700"
              >
                {fmt(d.value)}
              </text>
            )}
            <text
              x={x + bWidth / 2} y={H - 6}
              textAnchor="middle" fontSize={9} fill="#94a3b8"
            >
              {LABELS[i] || d.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── Iconos SVG inline (sin lucide-react) ── */
const Ico = {
  Wallet: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  ),
  Dollar: ({ s = 20 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="2" x2="12" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  ArrowUp: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m7 7 10 10" /><path d="M17 7v10H7" />
    </svg>
  ),
  Trending: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  ),
  Lock: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
};

/* ── Categorías de gasto ── */
const CATS = {
  vivienda:   { label: 'Vivienda',           color: '#3b82f6' },
  servicios:  { label: 'Servicios Públicos', color: '#60a5fa' },
  transporte: { label: 'Transporte',          color: '#f59e0b' },
  mercado:    { label: 'Mercado',             color: '#10b981' },
  seguros:    { label: 'Seguros',             color: '#8b5cf6' },
  ocio:       { label: 'Ocio',                color: '#ec4899' },
};

/* ── Componente principal ── */
export default function DashboardHome({ session, esPremium = false }) {
  const [ingreso, setIngreso] = useState(0);
  const [gastos, setGastos] = useState({
    vivienda: 0,
    servicios: 0,
    transporte: 0,
    mercado: 0,
    seguros: 0,
    ocio: 0,
  });
  const [tab, setTab] = useState('pie');

  // ── Estados para guardar en Supabase ──
  const [guardando, setGuardando] = useState(false);
  const [mensajeStatus, setMensajeStatus] = useState('');

  // ── Estado de carga inicial ──
  const [cargandoDatos, setCargandoDatos] = useState(true);

  // ── Estado para suscripción Stripe ──
  const [suscribiendo, setSuscribiendo] = useState(false);

  const handleSuscribirse = async () => {
    setSuscribiendo(true);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: session?.user?.email }),
      });
      const { url, error } = await res.json();
      if (error) throw new Error(error);
      window.location.href = url; // Redirigir a Stripe Checkout
    } catch (err) {
      console.error('Error Stripe:', err.message);
      setSuscribiendo(false);
    }
  };

  // ── Cargar presupuesto guardado al autenticarse ──
  useEffect(() => {
    const cargarPresupuesto = async () => {
      const user = session?.user;
      if (!user) {
        setCargandoDatos(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('presupuestos')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (data && !error) {
          // Datos encontrados → poblar estados con los valores guardados
          setIngreso(data.ingreso_neto ?? 0);
          setGastos({
            vivienda:   data.gasto_vivienda   ?? 0,
            servicios:  data.gasto_servicios  ?? 0,
            transporte: data.gasto_transporte ?? 0,
            mercado:    data.gasto_mercado    ?? 0,
            seguros:    data.gasto_seguros    ?? 0,
            ocio:       data.gasto_ocio       ?? 0,
          });
        } else {
          // Primera vez: usar valores de ejemplo como punto de partida
          setIngreso(5000000);
          setGastos({
            vivienda: 1500000, servicios: 400000, transporte: 300000,
            mercado: 800000,   seguros: 200000,   ocio: 400000,
          });
        }
      } catch {
        // Error de red u otro: usar defaults silenciosamente
        setIngreso(5000000);
        setGastos({
          vivienda: 1500000, servicios: 400000, transporte: 300000,
          mercado: 800000,   seguros: 200000,   ocio: 400000,
        });
      } finally {
        setCargandoDatos(false);
      }
    };

    cargarPresupuesto();
  }, [session]);

  // ── Función para enviar datos a la tabla presupuestos ──
  const handleGuardarPresupuesto = async () => {
    setGuardando(true);
    setMensajeStatus('');

    try {
      const user = session?.user;

      if (!user) {
        setMensajeStatus('Debes iniciar sesión para guardar tu presupuesto.');
        setGuardando(false);
        return;
      }

      const datosPresupuesto = {
        user_id: user.id,
        ingreso_neto: ingreso,
        gasto_vivienda: gastos.vivienda,
        gasto_servicios: gastos.servicios,
        gasto_transporte: gastos.transporte,
        gasto_mercado: gastos.mercado,
        gasto_seguros: gastos.seguros,
        gasto_ocio: gastos.ocio,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('presupuestos')
        .upsert(datosPresupuesto, { onConflict: 'user_id' });

      if (error) throw error;

      setMensajeStatus('¡Guardado! Tus datos se cargarán automáticamente al volver a iniciar sesión.');
    } catch (error) {
      console.error('Error al guardar:', error.message);
      setMensajeStatus('Hubo un error al intentar guardar los datos.');
    } finally {
      setGuardando(false);
    }
  };

  const totalGastos = useMemo(
    () => Object.values(gastos).reduce((a, b) => a + b, 0),
    [gastos]
  );
  const saldo    = ingreso - totalGastos;
  const pctGasto = ingreso > 0 ? ((totalGastos / ingreso) * 100).toFixed(1) : '0.0';
  const pctSaldo = ingreso > 0 ? ((saldo / ingreso) * 100).toFixed(1) : '0.0';

  const dataPie = [
    ...Object.entries(CATS).map(([k, v]) => ({
      name: v.label,
      value: gastos[k],
      color: v.color,
    })),
    { name: 'Ahorro', value: saldo > 0 ? saldo : 0, color: '#14b8a6' },
  ];

  const dataBar = Object.entries(CATS).map(([k, v]) => ({
    name: v.label,
    value: gastos[k],
    color: v.color,
  }));

  const salud =
    Number(pctSaldo) >= 20
      ? { label: 'Saludable', dot: 'bg-emerald-400', text: 'text-emerald-700', bg: 'bg-emerald-50',  msg: 'Regla 50/30/20 cumplida ✓' }
      : Number(pctSaldo) >= 5
      ? { label: 'Ajustado',  dot: 'bg-amber-400',   text: 'text-amber-700',   bg: 'bg-amber-50',   msg: 'Meta: ahorrar ≥20% del ingreso' }
      : { label: 'En Riesgo', dot: 'bg-rose-400',    text: 'text-rose-700',    bg: 'bg-rose-50',    msg: 'Gastos superan el ingreso disponible' };

  // ── Skeleton mientras se cargan los datos ──
  if (cargandoDatos) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm font-medium text-slate-400">Cargando tu presupuesto...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
              Mi Flujo de Caja
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Gastos fijos vs. capacidad de ahorro
            </p>
          </div>
          <div className="flex items-center gap-3 self-start sm:self-auto">
            {/* Chip de usuario */}
            {session?.user?.email && (
              <div className="bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2 max-w-[180px] sm:max-w-xs">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-blue-600 uppercase">
                    {session.user.email[0]}
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-600 truncate">
                  {session.user.email}
                </p>
              </div>
            )}
            {/* Plan badge */}
            <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <Ico.Trending />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Suscripción</p>
                <p className="text-sm font-bold text-slate-700">Plan Gratuito</p>
              </div>
            </div>
            {/* Botón Cerrar sesión */}
            <button
              onClick={() => supabase.auth.signOut()}
              title="Cerrar sesión"
              className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-sm text-slate-400 hover:text-rose-500 hover:border-rose-200 transition-all active:scale-95"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </header>

        {/* Grid principal */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Columna izquierda: inputs */}
          <div className="lg:col-span-5 space-y-5">

            {/* Ingreso */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                <span className="text-slate-400"><Ico.Wallet /></span>
                Ingresos Mensuales Netos
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                  <Ico.Dollar s={20} />
                </span>
                <input
                  type="number"
                  value={ingreso}
                  onChange={(e) => setIngreso(Number(e.target.value) || 0)}
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-lg font-bold transition-all"
                />
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Ingresa tu salario o ingresos netos del mes
              </p>
            </div>

            {/* Gastos fijos */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3">
                Gastos Fijos Mensuales
              </h2>
              {Object.entries(CATS).map(([cat, { label, color }]) => (
                <div key={cat}>
                  <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    {label}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 text-sm font-medium pointer-events-none">
                      $
                    </span>
                    <input
                      type="number"
                      value={gastos[cat]}
                      onChange={(e) =>
                        setGastos((g) => ({
                          ...g,
                          [cat]: Number(e.target.value) || 0,
                        }))
                      }
                      className="w-full pl-7 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm font-medium transition-all"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Botón Guardar en Supabase */}
            <div className="flex flex-col gap-3">
              <button
                onClick={handleGuardarPresupuesto}
                disabled={guardando}
                className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
              >
                {guardando ? (
                  <>
                    <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Guardando...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <polyline points="17,21 17,13 7,13 7,21" />
                      <polyline points="7,3 7,8 15,8" />
                    </svg>
                    Guardar Presupuesto
                  </>
                )}
              </button>

              {mensajeStatus && (
                <div className={`text-sm font-semibold text-center py-2.5 px-4 rounded-xl transition-all ${
                  mensajeStatus.includes('exitosamente')
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : mensajeStatus.includes('sesión')
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {mensajeStatus}
                </div>
              )}
            </div>

          </div>

          {/* Columna derecha: dashboard */}
          <div className="lg:col-span-7 space-y-5">

            {/* Tarjetas de métricas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Gastos Fijos</p>
                  <p className="text-xl font-extrabold text-slate-800 mt-1">{fmt(totalGastos)}</p>
                  <span className="text-xs text-rose-500 font-semibold mt-1 inline-block">
                    {pctGasto}% del ingreso
                  </span>
                </div>
                <div className="p-2.5 bg-rose-50 text-rose-500 rounded-xl">
                  <Ico.ArrowUp />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Capacidad de Ahorro</p>
                  <p className={`text-xl font-extrabold mt-1 ${saldo >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {fmt(saldo)}
                  </p>
                  <span className={`text-xs font-semibold mt-1 inline-block ${saldo >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {pctSaldo}% del ingreso
                  </span>
                </div>
                <div className={`p-2.5 rounded-xl ${saldo >= 0 ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                  <Ico.Dollar s={22} />
                </div>
              </div>

              <div className={`p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between ${salud.bg}`}>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Salud Financiera</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${salud.dot}`} />
                  <span className={`text-base font-bold ${salud.text}`}>{salud.label}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{salud.msg}</p>
              </div>
            </div>

            {/* Gráfico */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-800">
                  Distribución del Presupuesto
                </h3>
                <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
                  {[['pie', 'Torta'], ['bar', 'Barras']].map(([t, l]) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                        tab === t
                          ? 'bg-white text-slate-800 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              {tab === 'pie' ? <DonutChart data={dataPie} /> : <BarChart data={dataBar} />}
            </div>

            {/* Premium: Simulador o Paywall */}
            {esPremium ? (
              <SimuladorInflacion ingreso={ingreso} />
            ) : (
              <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white p-6 rounded-2xl shadow-lg">
                <div className="absolute -top-8 -right-8 w-36 h-36 bg-white rounded-full opacity-5" />
                <div className="absolute -bottom-10 -left-6 w-28 h-28 bg-white rounded-full opacity-5" />
                <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                  <div className="max-w-sm">
                    <span className="inline-block bg-amber-400 text-amber-900 text-xs font-bold px-2.5 py-0.5 rounded-full mb-2">
                      ✦ Premium · USD $7/mes
                    </span>
                    <h4 className="font-extrabold text-lg leading-snug">
                      ¿Sabes cómo te afecta la inflación en 10 años?
                    </h4>
                    <p className="text-sm text-blue-100 mt-1.5 leading-relaxed">
                      Desbloquea el simulador de inflación con proyecciones de inversión a 20 años y escenarios de rendimiento.
                    </p>
                    <ul className="mt-2.5 space-y-1.5">
                      {['Simulador inflación IPC', 'Proyección 1–20 años', 'Escenarios de inversión'].map((f) => (
                        <li key={f} className="flex items-center gap-2 text-xs text-blue-200">
                          <span className="opacity-70"><Ico.Lock /></span> {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button
                    onClick={handleSuscribirse}
                    disabled={suscribiendo}
                    className="flex-shrink-0 bg-white text-blue-700 hover:bg-blue-50 active:scale-95 disabled:opacity-70 transition-all px-6 py-3 rounded-xl font-bold text-sm shadow-md whitespace-nowrap flex items-center gap-2"
                  >
                    {suscribiendo ? (
                      <>
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="#1d4ed8" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        Redirigiendo…
                      </>
                    ) : (
                      'Activar Premium →'
                    )}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

        <footer className="mt-8 text-center text-xs text-slate-400 pb-4">
          Datos guardados en tu cuenta · Protegidos por RLS de Supabase
        </footer>
      </div>
    </div>
  );
}
