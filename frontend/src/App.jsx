import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Analytics } from '@vercel/analytics/react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, Legend, ReferenceLine, ComposedChart, Line,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';

/* ─── Theme definitions ─────────────────────────────────────────────────────── */
const darkTheme = {
  bg: '#07070a', sidebar: '#0d0d12', card: 'rgba(18,18,24,0.8)',
  border: 'rgba(255,255,255,0.07)', text: '#f0f0f2', textSoft: '#9898a6', textMuted: '#4a4a58',
  green: '#10b981', red: '#f43f5e', cyan: '#22d3ee', amber: '#fbbf24', violet: '#a78bfa',
  mono: "'JetBrains Mono', monospace", chart: ['#a78bfa', '#f43f5e', '#fbbf24', '#64748b'],
  dotPattern: 'rgba(255,255,255,0.045)', mainDot: 'rgba(255,255,255,0.032)',
  mainGlow: 'rgba(167,139,250,0.08)', kpiRibbon: 'rgba(0,0,0,0.5)', tabBar: 'rgba(0,0,0,0.3)',
  tooltip: 'rgba(7,7,10,0.97)', tooltipShadow: '0 16px 48px rgba(0,0,0,0.7)',
  inputBg: 'rgba(0,0,0,0.4)', selectBg: 'rgba(0,0,0,0.4)', phaseTableBg: 'rgba(0,0,0,0.2)',
  progressTrack: 'rgba(0,0,0,0.4)', cardShadow: '0 2px 12px rgba(0,0,0,0.25)',
  sidebarShadow: '4px 0 24px rgba(0,0,0,0.5)',
};
const lightTheme = {
  bg: '#f0f2f5', sidebar: '#ffffff', card: 'rgba(255,255,255,0.92)',
  border: 'rgba(0,0,0,0.09)', text: '#0d0d12', textSoft: '#44445a', textMuted: '#9090a8',
  green: '#059669', red: '#e11d48', cyan: '#0891b2', amber: '#d97706', violet: '#7c3aed',
  mono: "'JetBrains Mono', monospace", chart: ['#7c3aed', '#e11d48', '#d97706', '#64748b'],
  dotPattern: 'rgba(0,0,0,0.07)', mainDot: 'rgba(0,0,0,0.055)',
  mainGlow: 'rgba(124,58,237,0.05)', kpiRibbon: 'rgba(255,255,255,0.85)', tabBar: 'rgba(255,255,255,0.6)',
  tooltip: 'rgba(255,255,255,0.98)', tooltipShadow: '0 8px 32px rgba(0,0,0,0.12)',
  inputBg: 'rgba(0,0,0,0.05)', selectBg: 'rgba(0,0,0,0.05)', phaseTableBg: 'rgba(0,0,0,0.04)',
  progressTrack: 'rgba(0,0,0,0.08)', cardShadow: '0 2px 12px rgba(0,0,0,0.08)',
  sidebarShadow: '4px 0 24px rgba(0,0,0,0.15)',
};
// Mutable — Object.assign'd on toggle so all component renders pick up new values
const T = { ...darkTheme };

const fmtCr = (n) => n == null ? '—' : `₹${(n / 1e7).toFixed(2)} Cr`;
const fmt2 = (n) => typeof n === 'number' ? n.toFixed(2) : '—';

/* ─── Atomic Components ─────────────────────────────────────────────────────── */
function Tag({ children, color = T.violet, small }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: small ? '2px 8px' : '4px 12px',
      borderRadius: '100px', border: `1px solid ${color}55`,
      fontSize: small ? '9px' : '10px', fontWeight: 700,
      letterSpacing: '1px', color,
      background: `${color}12`, textTransform: 'uppercase', whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}

function Card({ children, style, glow }) {
  const gc = glow === 'green' ? T.green : glow === 'red' ? T.red : glow === 'violet' ? T.violet : null;
  return (
    <div style={{
      background: T.card,
      border: `1px solid ${gc ? gc + '40' : T.border}`,
      borderRadius: '16px',
      backdropFilter: 'blur(12px)',
      boxShadow: gc ? `0 0 36px -8px ${gc}25, 0 4px 16px ${T.progressTrack}` : T.cardShadow,
      overflow: 'hidden',
      ...style,
    }}>{children}</div>
  );
}

function KpiCell({ label, value, color }) {
  return (
    <div style={{ padding: '12px 18px', borderRight: `1px solid ${T.border}`, flexShrink: 0. }}>
      <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '1.2px', color: T.textSoft, marginBottom: '3px', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: '18px', fontWeight: 800, color: color || T.text, fontFamily: T.mono, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

function SectionLabel({ num, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
      <div style={{
        width: '26px', height: '26px', borderRadius: '7px',
        background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '11px', fontWeight: 800, color: T.violet, fontFamily: T.mono, flexShrink: 0,
      }}>{num}</div>
      <div style={{ fontSize: '11px', fontWeight: 800, color: T.textSoft, letterSpacing: '2.5px', textTransform: 'uppercase' }}>{children}</div>
      <div style={{ flex: 1, height: '1px', background: T.border }} />
    </div>
  );
}

function MetricCard({ label, value, unit, color, sub, icon }) {
  return (
    <Card style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}>
      {color && <div style={{ position: 'absolute', top: 0, right: 0, width: '100px', height: '100px', background: `radial-gradient(circle, ${color}18 0%, transparent 70%)`, pointerEvents: 'none' }} />}
      <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', color: T.textMuted, textTransform: 'uppercase', marginBottom: '14px' }}>
        {icon && <span style={{ marginRight: '6px' }}>{icon}</span>}{label}
      </div>
      <div style={{ fontFamily: T.mono, fontWeight: 900, lineHeight: 1, letterSpacing: '-1px' }}>
        <span style={{ fontSize: '40px', color: color || T.text }}>{value}</span>
        {unit && <span style={{ fontSize: '16px', color: T.textMuted, marginLeft: '4px' }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize: '12px', color: T.textSoft, marginTop: '10px', lineHeight: 1.5 }}>{sub}</div>}
    </Card>
  );
}

function ProgressBar({ pct, color = T.violet, h = 8 }) {
  return (
    <div style={{ height: h, background: T.progressTrack, borderRadius: h, overflow: 'hidden', border: `1px solid ${T.border}` }}>
      <div style={{
        height: '100%', width: `${Math.min(100, Math.max(0, pct))}%`,
        background: `linear-gradient(90deg, ${color}80, ${color})`,
        borderRadius: h, transition: 'width 1.2s cubic-bezier(0.16,1,0.3,1)',
        boxShadow: `0 0 10px ${color}50`,
      }} />
    </div>
  );
}

function ChartShell({ title, sub, children, span }) {
  return (
    <Card style={{ padding: '20px', gridColumn: span ? '1/-1' : undefined }}>
      <div style={{ fontSize: '16px', fontWeight: 700, color: T.text, marginBottom: sub ? '6px' : '24px' }}>{title}</div>
      {sub && <div style={{ fontSize: '12px', color: T.textMuted, marginBottom: '24px', lineHeight: 1.6 }}>{sub}</div>}
      {children}
    </Card>
  );
}

function CustomTooltip({ active, payload, label, valueFormatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: T.tooltip, border: `1px solid ${T.border}`,
      borderRadius: '12px', padding: '12px 16px',
      boxShadow: T.tooltipShadow, minWidth: '160px',
    }}>
      <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '1px', color: T.textMuted, marginBottom: '8px' }}>YEAR {label}</div>
      <div style={{ height: '1px', background: T.border, marginBottom: '8px' }} />
      {payload.map((e, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', fontSize: '12px', marginBottom: '4px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: e.color, flexShrink: 0 }} />
            <span style={{ color: T.textSoft }}>{e.name}</span>
          </div>
          <span style={{ fontFamily: T.mono, fontWeight: 700, color: T.text, fontSize: '12px' }}>
            {typeof e.value === 'number'
              ? (valueFormatter ? valueFormatter(e.value) : e.value.toFixed(2))
              : e.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─── Chart axis shorthands ─────────────────────────────────────────────────── */
const axX = () => ({ tick: { fill: T.textMuted, fontSize: 10, fontFamily: T.mono }, axisLine: false, tickLine: false, dy: 8 });
const axY = (fmt) => ({ tick: { fill: T.textMuted, fontSize: 10, fontFamily: T.mono }, axisLine: false, tickLine: false, width: 72, tickFormatter: fmt });

/* ─── Label helpers ─────────────────────────────────────────────────────────── */
function InputLabel({ children }) {
  return <label style={{ fontSize: '12px', fontWeight: 600, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', marginBottom: '6px' }}>{children}</label>;
}
function InputField({ value, onChange, step }) {
  return (
    <input type="number" step={step} value={value}
      onChange={e => onChange(Number(e.target.value))}
      style={{
        width: '100%', background: T.inputBg, border: `1px solid ${T.border}`,
        borderRadius: '8px', padding: '10px 12px', color: T.text,
        fontFamily: T.mono, fontSize: '15px', outline: 'none', transition: 'border-color 0.15s',
      }}
      onFocus={e => (e.target.style.borderColor = T.violet)}
      onBlur={e => (e.target.style.borderColor = T.border)}
    />
  );
}
function FieldGroup({ label, value, onChange, step, full }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', ...(full ? { gridColumn: '1/-1' } : {}) }}>
      <InputLabel>{label}</InputLabel>
      <InputField value={value} onChange={onChange} step={step} />
    </div>
  );
}
function GroupHead({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '20px 0 12px' }}>
      <div style={{ fontSize: '16px', fontWeight: 700, color: T.textSoft, letterSpacing: '1px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{children}</div>
      <div style={{ flex: 1, height: '1px', background: T.border }} />
    </div>
  );
}

/* ─── TABS ──────────────────────────────────────────────────────────────────── */
const TABS = [
  { id: 'signal', label: 'SIGNAL', icon: '1.' },
  { id: 'cashflow', label: 'CASH FLOWS', icon: '2.' },
  { id: 'npv', label: 'NPV', icon: '3.' },
  { id: 'scenario', label: 'SCENARIOS', icon: '4.' },
  { id: 'risk', label: 'SENSITIVITY & IRR', icon: '5.' },
  { id: 'payback', label: 'PAYBACK', icon: '6.' },
];

/* ─── APP ───────────────────────────────────────────────────────────────────── */
export default function App() {
  const [numPhases, setNumPhases] = useState(4);
  const [phaseData, setPhaseData] = useState(Array.from({ length: 4 }, () => ({ criticalVolume: 500, lanes: 2 })));
  const [totalVol, setTotalVol] = useState(5000);
  const [occupancy, setOccupancy] = useState(1.8);
  const [gdp, setGdp] = useState(200000);
  const [population, setPopulation] = useState(5000000);
  const [fuelCost, setFuelCost] = useState(100);
  const [inflation, setInflation] = useState(6.0);
  const [discount, setDiscount] = useState(10.0);
  const [trafGrowth, setTrafGrowth] = useState(5.0);
  const [gdpGrowth, setGdpGrowth] = useState(6.0);
  const [idleFuel, setIdleFuel] = useState(0.7);
  const [voc, setVoc] = useState(3.0);
  const [carbon, setCarbon] = useState(1.5);
  const [sigInstall, setSigInstall] = useState(500000);
  const [sigMaint, setSigMaint] = useState(200000);
  const [buildCost, setBuildCost] = useState(50.0);
  const [gradeMaint, setGradeMaint] = useState(250000);
  const [isDark, setIsDark] = useState(true);
  const toggleTheme = () => {
    const next = isDark ? lightTheme : darkTheme;
    Object.assign(T, next);
    setIsDark(v => !v);
  };

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('signal');
  const mainRef = useRef(null);

  const changePhases = (v) => {
    setNumPhases(v);
    setPhaseData(Array.from({ length: v }, (_, i) => ({
      criticalVolume: phaseData[i]?.criticalVolume ?? 500,
      lanes: phaseData[i]?.lanes ?? 2,
    })));
  };
  const setPhase = (i, f, v) => { const d = [...phaseData]; d[i][f] = v; setPhaseData(d); };

  const run = async () => {
    setLoading(true); setError(null);
    try {
      const { data } = await axios.post('https://traffic-dashboard-pqlh.onrender.com/analyze', {
        num_phases: numPhases,
        phases: phaseData.map(p => ({ critical_volume: p.criticalVolume, lanes: p.lanes })),
        total_volume: totalVol, occupancy, gdp, population,
        fuel_cost: fuelCost, inflation_rate: inflation, discount_rate: discount,
        traffic_growth: trafGrowth, gdp_growth: gdpGrowth,
        fuel_consumption_idle: idleFuel, voc_per_km: voc, carbon_cost: carbon,
        signal_install_cost: sigInstall, signal_maint_annual: sigMaint, construction_cost: buildCost,
        grade_sep_maint_annual: gradeMaint,
      });
      setResult(data); setTab('signal');
      setTimeout(() => mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 80);
    } catch (e) { setError(e.response?.data?.detail ?? e.message); }
    finally { setLoading(false); }
  };

  const eco = result?.economic;
  const web = result?.webster;
  const chrt = result?.charts;
  const dec = result?.decision;
  const isGS = eco?.delta_npv > 0 || web?.is_saturated;
  const hColor = isGS ? T.green : T.amber;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700;800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html,body{height:100%;overflow:hidden;background:${T.bg};color:${T.text};font-family:'Inter',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
        input::-webkit-outer-spin-button,input::-webkit-inner-spin-button{-webkit-appearance:none}
        input[type=number]{-moz-appearance:textfield}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:4px}
        ::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,0.15)}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        .fu{animation:fadeUp .45s cubic-bezier(.16,1,.3,1) both}
        @keyframes spin{to{transform:rotate(360deg)}}
        .spin{animation:spin .85s linear infinite}
        @keyframes pulse2{0%,100%{opacity:1}50%{opacity:.35}}
        .pulse{animation:pulse2 2s ease-in-out infinite}
        button{font-family:inherit;cursor:pointer}

        .app-layout {
          display: flex;
          height: 100dvh;
          width: 100%;
          overflow: hidden;
          flex-direction: row;
        }
        .app-sidebar {
          flex-shrink: 0;
          width: 450px;
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        @media (max-width: 900px) {
          html, body {
            overflow-y: auto !important;
            height: auto !important;
          }
          .app-layout {
            flex-direction: column;
            height: auto;
            overflow-y: visible;
          }
          .app-sidebar {
            width: 100%;
            height: auto;
            border-right: none;
            border-bottom: 2px solid ${T.border};
          }
          .sidebar-form-scroll {
            overflow: visible !important;
            flex: none !important;
          }
          .app-main {
            overflow: visible !important;
          }
        }
      `}</style>

      <div className="app-layout">

        {/* ══ SIDEBAR ══════════════════════════════════════════════════════════ */}
        <aside className="app-sidebar" style={{
          backgroundColor: T.sidebar,
          backgroundImage: `radial-gradient(${T.dotPattern} 1px, transparent 1px)`,
          backgroundSize: '22px 22px',
          borderRight: `1px solid ${T.border}`,
          boxShadow: T.sidebarShadow,
        }}>
          {/* Logo header */}
          <div style={{ padding: '22px 20px 16px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img
                src="/logo.png"
                alt="Traffic Economics Logo"
                style={{
                  width: '52px', height: '52px', borderRadius: '12px',
                  objectFit: 'cover', flexShrink: 0,
                  border: `1.5px solid ${T.violet}50`,
                  boxShadow: `0 0 14px ${T.violet}30`,
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.3px', color: T.text }}>
                  Traffic <span style={{ color: T.violet }}>Economics</span>
                </div>
                <div style={{ fontSize: '2px', color: T.textWhite, fontWeight: 500 }}>ROAD LIFECYCLE DECISION</div>
              </div>
              {/* Theme toggle — pill switch */}
              <div onClick={toggleTheme} title={isDark ? 'Switch to Light' : 'Switch to Dark'}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flexShrink: 0, userSelect: 'none' }}>
                {/* Light label */}
                <span style={{
                  fontSize: '11px', fontWeight: 700, letterSpacing: '0.3px',
                  color: !isDark ? T.text : T.textMuted,
                  transition: 'color 0.3s', whiteSpace: 'nowrap',
                }}>Light</span>

                {/* Pill track */}
                <div style={{
                  width: '56px', height: '30px', borderRadius: '15px', position: 'relative',
                  background: isDark ? '#12121e' : '#7b9ef5',
                  border: isDark ? '1.5px solid rgba(255,255,255,0.12)' : '1.5px solid rgba(100,140,255,0.4)',
                  boxShadow: isDark
                    ? 'inset 0 2px 8px rgba(0,0,0,0.6), 0 0 12px rgba(100,80,200,0.3)'
                    : 'inset 0 2px 6px rgba(80,100,200,0.2), 0 0 12px rgba(120,160,255,0.4)',
                  transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
                  flexShrink: 0,
                }}>
                  {/* Stars (visible in dark mode) */}
                  {isDark && (<>
                    <span style={{ position: 'absolute', top: '4px', left: '6px', fontSize: '7px', opacity: 0.8, transition: 'opacity 0.3s' }}>✦</span>
                    <span style={{ position: 'absolute', top: '12px', left: '10px', fontSize: '5px', opacity: 0.6, transition: 'opacity 0.3s' }}>✦</span>
                    <span style={{ position: 'absolute', top: '6px', left: '14px', fontSize: '4px', opacity: 0.5, transition: 'opacity 0.3s' }}>✦</span>
                  </>)}
                  {/* Small dot accent (light mode) */}
                  {!isDark && (
                    <div style={{ position: 'absolute', top: '6px', right: '7px', width: '5px', height: '5px', borderRadius: '50%', background: 'rgba(255,255,255,0.7)', transition: 'opacity 0.3s' }} />
                  )}
                  {/* Sliding knob */}
                  <div style={{
                    position: 'absolute', top: '3px',
                    left: isDark ? 'calc(100% - 27px)' : '3px',
                    width: '22px', height: '22px', borderRadius: '50%',
                    background: isDark ? '#f0f0ff' : '#ffffff',
                    boxShadow: isDark
                      ? '0 2px 8px rgba(0,0,0,0.5)'
                      : '0 2px 8px rgba(80,100,200,0.35)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px', transition: 'left 0.35s cubic-bezier(0.4,0,0.2,1)',
                  }}>
                    {isDark ? '🌙' : '☀️'}
                  </div>
                </div>

                {/* Dark label */}
                <span style={{
                  fontSize: '11px', fontWeight: 700, letterSpacing: '0.3px',
                  color: isDark ? T.text : T.textMuted,
                  transition: 'color 0.3s', whiteSpace: 'nowrap',
                }}>Dark</span>
              </div>
            </div>
          </div>

          {/* Scrollable form */}
          <div className="sidebar-form-scroll" style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 0' }}>

            <GroupHead>🚧 Traffic Model</GroupHead>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <FieldGroup label="Volume (PCU/h)" value={totalVol} onChange={setTotalVol} />
              <div>
                <InputLabel>Total Number of Phases</InputLabel>
                <select value={numPhases} onChange={e => changePhases(Number(e.target.value))} style={{
                  width: '100%', background: T.selectBg, border: `1px solid ${T.border}`,
                  borderRadius: '8px', padding: '9px 11px', color: T.text, fontFamily: T.mono,
                  fontSize: '15px', outline: 'none', appearance: 'none', cursor: 'pointer',
                }}>
                  {[2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n} phases</option>)}
                </select>
              </div>
              <FieldGroup label="Occupancy" value={occupancy} onChange={setOccupancy} step="0.1" />
              <FieldGroup label="Traffic Growth %" value={trafGrowth} onChange={setTrafGrowth} step="0.1" />
            </div>

            {/* Phase table */}
            <div style={{ marginTop: '10px', background: T.phaseTableBg, borderRadius: '10px', border: `1px solid ${T.border}`, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 52px', gap: '0', padding: '6px 8px 4px', borderBottom: `1px solid ${T.border}` }}>
                <span />
                <span style={{ fontSize: '11px', color: T.textMuted, fontWeight: 700, letterSpacing: '1px' }}>ANNUAL AVERAGE DAILY CRITICAL VOLUME (PCU/H/LANE)</span>
                <span style={{ fontSize: '11px', color: T.textMuted, fontWeight: 700, letterSpacing: '1px', textAlign: 'center' }}>NO. OF LANES</span>
              </div>
              {phaseData.map((p, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 52px', gap: '0', padding: '4px 8px', alignItems: 'center', borderBottom: i < phaseData.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: T.violet }}>P{i + 1}</div>
                  <input type="number" value={p.criticalVolume} onChange={e => setPhase(i, 'criticalVolume', Number(e.target.value))}
                    style={{ background: 'transparent', border: 'none', color: T.text, fontFamily: T.mono, fontSize: '14px', outline: 'none', width: '100%', padding: '5px' }}
                  />
                  <input type="number" value={p.lanes} onChange={e => setPhase(i, 'lanes', Number(e.target.value))}
                    style={{ background: 'transparent', border: 'none', color: T.textSoft, fontFamily: T.mono, fontSize: '14px', outline: 'none', width: '100%', padding: '5px', textAlign: 'center' }}
                  />
                </div>
              ))}
            </div>

            <GroupHead>💰 Economic Parameters</GroupHead>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <FieldGroup label="City GDP (₹ Cr)" value={gdp} onChange={setGdp} full />
              <FieldGroup label="Population" value={population} onChange={setPopulation} />
              <FieldGroup label="Discount Rate %" value={discount} onChange={setDiscount} step="0.1" />
              <FieldGroup label="GDP Growth %" value={gdpGrowth} onChange={setGdpGrowth} step="0.1" />
              <FieldGroup label="Inflation %" value={inflation} onChange={setInflation} step="0.1" />
              <FieldGroup label="Fuel (₹/L)" value={fuelCost} onChange={setFuelCost} />
              <FieldGroup label="Idle (L/h)" value={idleFuel} onChange={setIdleFuel} step="0.1" />
              <FieldGroup label="VOC (₹/km)" value={voc} onChange={setVoc} step="0.1" />
              <FieldGroup label="Carbon (₹/kg)" value={carbon} onChange={setCarbon} step="0.1" />
            </div>

            <GroupHead>🏗️ Infrastructure</GroupHead>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', marginBottom: '20px' }}>
              <FieldGroup label="Grade Sep. Build (₹ Cr)" value={buildCost} onChange={setBuildCost} />
              <FieldGroup label="Grade Sep. Annual O&M (₹)" value={gradeMaint} onChange={setGradeMaint} />
              <FieldGroup label="Signal Install (₹)" value={sigInstall} onChange={setSigInstall} />
              <FieldGroup label="Signal Annual Maint. (₹)" value={sigMaint} onChange={setSigMaint} />
            </div>
          </div>

          {/* Run button */}
          <div style={{ padding: '16px', borderTop: `1px solid ${T.border}`, background: 'rgba(0,0,0,0.3)', flexShrink: 0 }}>
            {error && (
              <div style={{ marginBottom: '10px', padding: '10px 12px', background: 'rgba(244,63,94,0.1)', border: `1px solid rgba(244,63,94,0.3)`, borderRadius: '8px', fontSize: '11px', color: T.red, fontWeight: 600 }}>
                ⚠ {error}
              </div>
            )}
            <button onClick={run} disabled={loading} style={{
              width: '100%', padding: '14px', borderRadius: '10px', border: 'none',
              background: loading ? '#1a1a22' : '#ffffff',
              color: loading ? T.textMuted : '#07070a',
              fontWeight: 800, fontSize: '14px', letterSpacing: '1.5px',
              boxShadow: loading ? 'none' : '0 6px 20px rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'all 0.2s',
            }}>
              {loading ? (
                <>
                  <div className="spin" style={{ width: '12px', height: '12px', borderRadius: '50%', border: `2px solid rgba(255,255,255,0.15)`, borderTopColor: T.violet }} />
                  COMPUTING...
                </>
              ) : 'RUN ANALYSIS'}
            </button>
          </div>
        </aside>

        {/* ══ MAIN ═════════════════════════════════════════════════════════════ */}
        <main className="app-main" ref={mainRef} style={{
          flex: 1, minWidth: 0, height: '100%',
          overflowY: 'auto', overflowX: 'hidden',
          backgroundColor: T.bg,
          backgroundImage: `radial-gradient(ellipse 60% 40% at 65% 5%, ${T.mainGlow} 0%, transparent 55%), radial-gradient(${T.mainDot} 1px, transparent 1px)`,
          backgroundSize: `100% 100%, 22px 22px`,
          display: 'flex', flexDirection: 'column',
        }}>

          {/* ── Empty state ─────────────────────────────────────────────────── */}
          {!result && !loading && (
            <div className="fu" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 32px', textAlign: 'center' }}>
              <div style={{ fontSize: '80px', marginBottom: '24px', opacity: 0.08, lineHeight: 1 }}>◈</div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '10px' }}>Workspace Ready</h2>
              <p style={{ fontSize: '13px', color: T.textMuted, maxWidth: '360px', lineHeight: 1.7, marginBottom: '32px' }}>
                Configure your intersection parameters on the left and run the 30-year lifecycle computation.
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {["Webster's Method", "NPV Analysis", "IRR Modeling", "Sensitivity Tests", "Scenario Planning"].map(t => (
                  <div key={t} style={{ padding: '5px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`, fontSize: '11px', color: T.textMuted }}>{t}</div>
                ))}
              </div>
            </div>
          )}

          {/* ── Loading state ────────────────────────────────────────────────── */}
          {loading && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
              <div className="spin" style={{ width: '44px', height: '44px', borderRadius: '50%', border: `3px solid rgba(255,255,255,0.06)`, borderTopColor: T.violet }} />
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: T.textMuted, letterSpacing: '2px', textTransform: 'uppercase', textAlign: 'center' }}>Computing Matrix</div>
                <div className="pulse" style={{ fontSize: '11px', color: T.textMuted, marginTop: '6px', textAlign: 'center' }}>Running Webster · Discounting flows · Sensitivity sweeps</div>
              </div>
            </div>
          )}

          {/* ── Results ───────────────────────────────────────────────────────── */}
          {result && !loading && (() => {
            const signalData = chrt.comps_sampled.map((c, i) => ({ year: c.year, val: chrt.cf_s[i] }));
            const gradeData = chrt.comps_sampled.map((c, i) => ({ year: c.year, val: chrt.cf_g[i] }));
            const incData = chrt.comps_sampled.map((c, i) => ({ year: c.year, val: chrt.inc_cumulative[i] }));
            const sensMax = chrt.sensitivities[0]?.spread ?? 1;

            return (
              <div className="fu" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

                {/* KPI ribbon — compact, wraps on small screens */}
                <div style={{
                  display: 'flex', alignItems: 'stretch', flexWrap: 'nowrap', overflowX: 'auto',
                  background: T.kpiRibbon, borderBottom: `2px solid ${T.border}`,
                  backdropFilter: 'blur(20px)', flexShrink: 0,
                }}>
                  <KpiCell label="Decision" value={dec.choice} color={hColor} />
                  <KpiCell label="NPV" value={fmtCr(eco.delta_npv)} color={eco.delta_npv > 0 ? T.green : T.red} />
                  <KpiCell label="IRR" value={`${fmt2(eco.irr)}%`} color={eco.irr > discount ? T.green : T.red} />
                  <KpiCell label="Payback" value={eco.payback ? `Yr ${eco.payback}` : 'N/A'} color={T.amber} />
                  <KpiCell label="Saturation" value={fmt2(web.sum_flow_ratios)} color={web.is_saturated ? T.red : T.green} />
                  <KpiCell label="Cycle" value={`${web.cycle_time.toFixed(0)}s`} color={T.cyan} />
                  <KpiCell label="Avg Delay" value={`${web.avg_delay.toFixed(1)}s`} color={T.violet} />
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 20px', justifyContent: 'flex-end' }}>
                    <Tag color={hColor} small>{dec.status}</Tag>
                  </div>
                </div>

                {/* Tab bar — scrollable, no overflow */}
                <div style={{
                  display: 'flex', alignItems: 'flex-end', padding: '0 20px',
                  background: T.tabBar, borderBottom: `1px solid ${T.border}`,
                  overflowX: 'auto', flexShrink: 0,
                }}>
                  {TABS.map(t => {
                    const active = tab === t.id;
                    return (
                      <button key={t.id} onClick={() => setTab(t.id)} style={{
                        padding: '10px 20px', border: 'none', background: 'none',
                        color: active ? T.text : T.textMuted,
                        fontWeight: active ? 700 : 500, fontSize: '15px',
                        borderBottom: `2px solid ${active ? T.violet : 'transparent'}`,
                        display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap',
                        transition: 'color 0.15s, border-color 0.15s', flexShrink: 0,
                      }}>
                        <span style={{ fontSize: '15px' }}>{t.icon}</span>{t.label}
                      </button>
                    );
                  })}
                </div>

                {/* Tab panels */}
                <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '28px 20px 64px' }}>
                  <div style={{ width: '100%' }}>

                    {/* ── SIGNAL ─────────────────────────────────────────────── */}
                    {tab === 'signal' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                        <SectionLabel num="1">Webster's Signal Diagnostics</SectionLabel>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                          <MetricCard icon="⏱" label="Optimal Cycle Time" value={web.cycle_time.toFixed(0)} unit="s" />
                          <MetricCard icon="⌛" label="Avg Delay / Vehicle" value={web.avg_delay.toFixed(1)} unit="s" color={T.violet} />
                          <MetricCard icon="📶" label="Degree of Saturation" value={web.sum_flow_ratios.toFixed(3)}
                            color={web.is_saturated ? T.red : T.green}
                            sub={web.is_saturated ? '⚠️ Y > 0.95 — intersection saturated' : '✓ Within capacity bounds'} />
                        </div>

                        {/* Saturation gauge */}
                        <Card style={{ padding: '24px 28px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: T.textMuted, letterSpacing: '1px' }}>SATURATION GAUGE (Y = {web.sum_flow_ratios.toFixed(3)})</div>
                            <Tag color={web.is_saturated ? T.red : T.green} small>{web.is_saturated ? 'OVER CAPACITY' : 'IN BOUNDS'}</Tag>
                          </div>
                          <ProgressBar pct={(web.sum_flow_ratios / 1.2) * 100} color={web.is_saturated ? T.red : T.green} h={10} />
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '9px', color: T.textMuted }}>
                            <span>Y = 0</span><span style={{ color: T.amber }}>Critical 0.95</span><span>1.20</span>
                          </div>
                        </Card>

                        {/* Recommendation hero */}
                        <SectionLabel num="✦">Infrastructure Recommendation</SectionLabel>
                        <Card glow={isGS ? 'green' : 'red'} style={{ padding: '40px', position: 'relative' }}>
                          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: `radial-gradient(ellipse 70% 60% at 8% 20%, ${hColor}07, transparent 55%)`, pointerEvents: 'none' }} />
                          <div style={{ position: 'relative' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                              <div className="pulse" style={{ width: '7px', height: '7px', borderRadius: '50%', background: hColor, boxShadow: `0 0 8px ${hColor}` }} />
                              <span style={{ fontSize: '10px', fontWeight: 800, color: T.textMuted, letterSpacing: '2px' }}>ECONOMIC ANALYSIS</span>
                            </div>
                            <h2 style={{ fontSize: '56px', fontWeight: 900, color: T.text, letterSpacing: '-2px', lineHeight: 1, marginBottom: '16px' }}>{dec.choice}</h2>
                            <Tag color={hColor}>{dec.status}</Tag>
                            <p style={{ marginTop: '20px', fontSize: '14px', color: T.textSoft, lineHeight: 1.9, maxWidth: '760px' }}>
                              Based on 30-year lifecycle analysis at <strong style={{ color: T.text }}>{discount}% Discount Rate</strong>:&nbsp;
                              {eco.delta_npv > 0
                                ? <>Grade Separation delivers an NPV advantage of <strong style={{ color: T.green }}>{fmtCr(eco.delta_npv)}</strong>. IRR = <strong style={{ color: T.green }}>{fmt2(eco.irr)}%</strong>, clearing the hurdle rate. Payback in <strong style={{ color: T.text }}>{eco.payback ?? 'N/A'}</strong> years.</>
                                : <>Signal preserves <strong style={{ color: T.amber }}>{fmtCr(Math.abs(eco.delta_npv))}</strong> of NPV: construction cost outweighs lifetime traffic gains.</>
                              }
                            </p>
                            <div style={{ marginTop: '24px', padding: '16px 20px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', borderLeft: `3px solid ${T.violet}`, fontSize: '13px', lineHeight: 1.7, color: T.textSoft }}>
                              <strong style={{ color: T.text }}>Reasoning: </strong>{dec.reason}
                            </div>
                          </div>
                        </Card>
                      </div>
                    )}

                    {/* ── CASH FLOWS ─────────────────────────────────────────── */}
                    {tab === 'cashflow' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                        <SectionLabel num="2">Absolute Cash Flow Trajectories</SectionLabel>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '20px' }}>

                          <ChartShell title="Option A: Traffic Signal" sub="Compounding societal losses from permanent intersection delay over 30 years.">
                            <ResponsiveContainer width="100%" height={310}>
                              <BarChart data={signalData} margin={{ top: 8, right: 8, left: -12, bottom: 30 }} barCategoryGap="30%">
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                <XAxis dataKey="year" {...axX()} interval={0} angle={-45} textAnchor="end" height={50} />
                                <YAxis {...axY(v => `${v.toFixed(1)}Cr`)} />
                                <Tooltip content={<CustomTooltip valueFormatter={v => `₹${v.toFixed(2)} Cr`} />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                                <Bar dataKey="val" name="Signal Cashflow" fill={T.red} fillOpacity={0.75} stroke={T.red} strokeWidth={1} radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </ChartShell>

                          <ChartShell title="Option B: Grade Separation" sub="Year 0: Construction costs, Rest Years: Benefits are comparitive with respect to Trafic Signal">
                            <ResponsiveContainer width="100%" height={310}>
                              <BarChart data={gradeData} margin={{ top: 8, right: 8, left: -12, bottom: 30 }} barCategoryGap="30%">
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                <XAxis dataKey="year" {...axX()} interval={0} angle={-45} textAnchor="end" height={50} />
                                <YAxis {...axY(v => `${v.toFixed(1)}Cr`)} />
                                <Tooltip content={<CustomTooltip valueFormatter={v => `₹${v.toFixed(2)} Cr`} />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                                <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
                                <Bar dataKey="val" name="Grade Cashflow" fill={T.green} fillOpacity={0.75} stroke={T.green} strokeWidth={1} radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </ChartShell>
                        </div>
                      </div>
                    )}

                    {/* ── NPV ────────────────────────────────────────────────── */}
                    {tab === 'npv' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                        <SectionLabel num="3">Incremental NPV & Annual Loss Composition</SectionLabel>

                        <ChartShell title="A) Net Incremental Advantage (Option B - Option A)" sub="Above zero = Grade Separation preferred. Below = Signal is economically superior.">
                          <ResponsiveContainer width="100%" height={370}>
                            <BarChart data={incData} margin={{ top: 8, right: 8, left: -8, bottom: 30 }} barCategoryGap="30%">
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                              <XAxis dataKey="year" {...axX()} interval={0} angle={-45} textAnchor="end" height={50} />
                              <YAxis {...axY(v => `${v.toFixed(0)}Cr`)} />
                              <Tooltip content={<CustomTooltip valueFormatter={v => `${v.toFixed(2)} Cr`} />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                              <ReferenceLine y={0} stroke="rgba(255,255,255,0.25)" strokeWidth={1.5}
                                label={{ position: 'insideTopLeft', value: 'BREAK-EVEN', fill: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: 700, dy: -8 }} />
                              <Bar dataKey="val" name="Net Advantage" radius={[3, 3, 0, 0]}>
                                {incData.map((entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={entry.val >= 0 ? T.violet : T.red}
                                    fillOpacity={0.75}
                                    stroke={entry.val >= 0 ? T.violet : T.red}
                                    strokeWidth={1}
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </ChartShell>

                        <ChartShell title="B) Annual Loss Composition" sub="Stacked signal-decay categories vs underpass maintenance over 30 years.">
                          <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={chrt.comps_sampled} margin={{ top: 8, right: 8, left: -8, bottom: 30 }} barCategoryGap="28%">
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                              <XAxis dataKey="year" {...axX()} interval={0} angle={-45} textAnchor="end" height={50} />
                              <YAxis {...axY(v => `${v.toFixed(0)}Cr`)} />
                              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '16px', color: T.textSoft }} iconType="circle" iconSize={7} />
                              <Bar dataKey="tvl" stackId="A" fill={T.chart[0]} name="Time Value" radius={[0, 0, 3, 3]} />
                              <Bar dataKey="afc" stackId="A" fill={T.chart[1]} name="Fuel Loss" />
                              <Bar dataKey="voc" stackId="A" fill={T.chart[2]} name="Vehicle Wear" />
                              <Bar dataKey="carbon" stackId="A" fill={T.chart[3]} name="Carbon" radius={[3, 3, 0, 0]} />
                              <Bar dataKey="maint_g" fill={T.cyan} name="Grade Maint." radius={[3, 3, 3, 3]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </ChartShell>
                      </div>
                    )}

                    {/* ── SCENARIOS ──────────────────────────────────────────── */}
                    {tab === 'scenario' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                        <SectionLabel num="5">30-Year NPV Horizon Scenarios</SectionLabel>

                        {/* ── 3 equal scenario cards ── */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                          {[
                            {
                              name: 'PESSIMISTIC', val: chrt.scenarios.pessimistic, color: T.red,
                              icon: '↘', desc: 'Worst-case macro conditions',
                              deltas: ['Traffic −2%', 'GDP −2%', 'DR +2%', 'Cost +20%'],
                            },
                            {
                              name: 'BASE CASE', val: chrt.scenarios.base, color: T.violet,
                              icon: '→', desc: 'Current inputs, no perturbation', active: true,
                              deltas: ['As entered in sidebar'],
                            },
                            {
                              name: 'OPTIMISTIC', val: chrt.scenarios.optimistic, color: T.green,
                              icon: '↗', desc: 'Best-case macro conditions',
                              deltas: ['Traffic +2%', 'GDP +2%', 'DR −2%', 'Cost −20%'],
                            },
                          ].map((s, i) => (
                            <Card key={i} glow={s.active ? 'violet' : undefined}
                              style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                              {/* Header */}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color, boxShadow: `0 0 8px ${s.color}80` }} />
                                  <span style={{ fontSize: '10px', fontWeight: 800, color: s.active ? T.text : T.textSoft, letterSpacing: '1.5px' }}>{s.name}</span>
                                </div>
                                <span style={{ fontSize: '18px', color: s.color, fontWeight: 700 }}>{s.icon}</span>
                              </div>

                              {/* NPV value */}
                              <div>
                                <div style={{ fontFamily: T.mono, fontSize: '26px', fontWeight: 900, color: s.val > 0 ? T.green : T.red, letterSpacing: '-0.5px', lineHeight: 1 }}>
                                  {fmtCr(s.val)}
                                </div>
                                <div style={{ fontSize: '10px', color: T.textMuted, marginTop: '4px' }}>NPV (Grade Sep − Signal)</div>
                              </div>

                              {/* Desc */}
                              <div style={{ fontSize: '11px', color: T.textSoft, lineHeight: 1.6 }}>{s.desc}</div>

                              {/* Parameter deltas */}
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: 'auto' }}>
                                {s.deltas.map((d, j) => (
                                  <span key={j} style={{
                                    fontSize: '9px', fontWeight: 700, fontFamily: T.mono,
                                    padding: '2px 7px', borderRadius: '4px',
                                    background: `${s.color}18`, border: `1px solid ${s.color}40`,
                                    color: s.color, letterSpacing: '0.3px',
                                  }}>{d}</span>
                                ))}
                              </div>
                            </Card>
                          ))}
                        </div>

                        {/* ── Spectrum range bar ── */}
                        <Card style={{ padding: '24px 50px' }}>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: T.textMuted, letterSpacing: '1px', marginBottom: '20px' }}>NPV OUTCOME SPECTRUM</div>
                          {(() => {
                            const vals = [chrt.scenarios.pessimistic, chrt.scenarios.base, chrt.scenarios.optimistic];
                            const min = Math.min(...vals);
                            const max = Math.max(...vals);
                            const span = max - min || 1;
                            const pct = (v) => ((v - min) / span) * 100;
                            return (
                              <>
                                <div style={{ position: 'relative', height: '10px', background: `linear-gradient(90deg, ${T.red}66, ${T.violet}66, ${T.green}66)`, borderRadius: '6px', marginBottom: '28px' }}>
                                  {[
                                    { val: chrt.scenarios.pessimistic, color: T.red, label: 'Pessimistic' },
                                    { val: chrt.scenarios.base, color: T.violet, label: 'Base' },
                                    { val: chrt.scenarios.optimistic, color: T.green, label: 'Optimistic' },
                                  ].map((m, i) => (
                                    <div key={i} style={{ position: 'absolute', top: '50%', left: `${pct(m.val)}%`, transform: 'translate(-50%, -50%)' }}>
                                      <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: m.color, border: '2px solid rgba(255,255,255,0.8)', boxShadow: `0 0 10px ${m.color}` }} />
                                      <div style={{ position: 'absolute', top: '18px', left: '50%', transform: 'translateX(-50%)', fontSize: '9px', fontWeight: 700, color: m.color, whiteSpace: 'nowrap', letterSpacing: '0.5px' }}>
                                        {fmtCr(m.val)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: T.textMuted, marginTop: '8px' }}>
                                  <span style={{ color: T.red }}>◀ Worst case</span>
                                  <span style={{ color: T.textMuted }}>NPV spread: {fmtCr(max - min)}</span>
                                  <span style={{ color: T.green }}>Best case ▶</span>
                                </div>
                              </>
                            );
                          })()}
                        </Card>
                      </div>
                    )}

                    {/* ── RISK & IRR ─────────────────────────────────────────── */}
                    {tab === 'risk' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                        <SectionLabel num="6">NPV Sensitivity Tornado (±20%)</SectionLabel>

                        {/* ── Tornado + Spider 2-col grid ─────────────────── */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>

                          {/* Tornado */}
                          <Card style={{ padding: '28px' }}>
                            <div style={{ fontSize: '16px', fontWeight: 700, color: T.text, marginBottom: '6px' }}>Tornado Chart</div>
                            <p style={{ fontSize: '12px', color: T.textSoft, marginBottom: '24px', lineHeight: 1.7 }}>
                              Each row shows NPV shift when a variable is varied ±20%, all others fixed. Wider = more sensitive.
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                              {chrt.sensitivities.map((s, i) => {
                                const lPct = Math.min(50, Math.abs(s.low_npv - eco.delta_npv) / sensMax * 50);
                                const rPct = Math.min(50, Math.abs(s.high_npv - eco.delta_npv) / sensMax * 50);
                                return (
                                  <div key={i}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, marginBottom: '7px' }}>
                                      <span style={{ fontFamily: T.mono, textTransform: 'uppercase', letterSpacing: '1px', color: T.text }}>{s.variable}</span>
                                      <span style={{ color: T.textMuted }}>Spread: {fmtCr(s.spread)}</span>
                                    </div>
                                    <div style={{ height: '26px', display: 'flex', background: 'rgba(0,0,0,0.35)', borderRadius: '6px', overflow: 'hidden', border: `1px solid ${T.border}`, position: 'relative' }}>
                                      <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '2px', background: 'rgba(255,255,255,0.5)', transform: 'translateX(-1px)', zIndex: 2 }} />
                                      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', paddingRight: '2px' }}>
                                        {lPct > 0 && <div style={{ height: '14px', width: `${lPct * 2}%`, background: `linear-gradient(270deg, ${T.red}, ${T.red}44)`, borderRadius: '3px 0 0 3px' }} />}
                                      </div>
                                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', paddingLeft: '2px' }}>
                                        {rPct > 0 && <div style={{ height: '14px', width: `${rPct * 2}%`, background: `linear-gradient(90deg, ${T.green}, ${T.green}44)`, borderRadius: '0 3px 3px 0' }} />}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </Card>

                          {/* Spider / Radar */}
                          <Card style={{ padding: '28px' }}>
                            <div style={{ fontSize: '16px', fontWeight: 700, color: T.text, marginBottom: '6px' }}>Spider Chart</div>
                            <p style={{ fontSize: '12px', color: T.textSoft, marginBottom: '16px', lineHeight: 1.7 }}>
                              Normalized sensitivity envelope (0–100). <span style={{ color: T.green }}>Green</span> = upside (+20%), <span style={{ color: T.red }}>Red</span> = downside (−20%).
                            </p>
                            <ResponsiveContainer width="100%" height={300}>
                              <RadarChart data={chrt.spider_data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                                <PolarGrid stroke={T.border} />
                                <PolarAngleAxis
                                  dataKey="variable"
                                  tick={{ fill: T.textSoft, fontSize: 10, fontFamily: T.mono, fontWeight: 700 }}
                                />
                                <PolarRadiusAxis
                                  angle={90} domain={[0, 100]}
                                  tick={{ fill: T.textMuted, fontSize: 9 }}
                                  tickCount={4}
                                  stroke="transparent"
                                />
                                <Radar name="Upside (+20%)"
                                  dataKey="upside"
                                  stroke={T.green} strokeWidth={2}
                                  fill={T.green} fillOpacity={0.12}
                                />
                                <Radar name="Downside (−20%)"
                                  dataKey="downside"
                                  stroke={T.red} strokeWidth={2}
                                  fill={T.red} fillOpacity={0.12}
                                />
                                <Legend
                                  wrapperStyle={{ fontSize: '11px', paddingTop: '12px', color: T.textSoft }}
                                  iconType="circle" iconSize={7}
                                />
                                <Tooltip
                                  content={({ active, payload, label }) => {
                                    if (!active || !payload?.length) return null;
                                    return (
                                      <div style={{ background: 'rgba(7,7,10,0.97)', border: `1px solid ${T.border}`, borderRadius: '10px', padding: '10px 14px', minWidth: '160px' }}>
                                        <div style={{ fontSize: '10px', fontWeight: 700, color: T.textMuted, marginBottom: '8px', letterSpacing: '1px' }}>{label}</div>
                                        {payload.map((e, i) => (
                                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '12px', marginBottom: '3px' }}>
                                            <span style={{ color: e.color }}>{e.name}</span>
                                            <span style={{ fontFamily: T.mono, fontWeight: 700, color: T.text }}>{e.value.toFixed(1)}</span>
                                          </div>
                                        ))}
                                      </div>
                                    );
                                  }}
                                />
                              </RadarChart>
                            </ResponsiveContainer>
                          </Card>
                        </div>

                        <SectionLabel num="7">Internal Rate of Return vs Discount Rate</SectionLabel>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                          <MetricCard icon="📊" label="Project IRR" value={fmt2(eco.irr)} unit="%" color={eco.irr > discount ? T.green : T.red}
                            sub={eco.irr > discount ? `+${(eco.irr - discount).toFixed(2)}pp above Discount Rate` : `${(discount - eco.irr).toFixed(2)}pp below Discount Rate`} />
                          <MetricCard icon="💸" label="Discount Rate" value={discount} unit="%" color={T.cyan} />
                          <MetricCard icon="💰" label="NPV" value={fmtCr(eco.delta_npv)} color={eco.delta_npv > 0 ? T.green : T.red} />
                        </div>

                        <Card style={{ padding: '24px 28px' }}>
                          {(() => {
                            const cap = Math.max(60, (eco.irr ?? 0) * 1.25);
                            const hp = (discount / cap) * 100;
                            const ip = ((eco.irr ?? 0) / cap) * 100;
                            return (
                              <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                                  <div style={{ fontSize: '11px', fontWeight: 700, color: T.textMuted, letterSpacing: '1px' }}>IRR GAUGE</div>
                                  <div style={{ fontSize: '11px', color: T.textSoft }}>Discount Rate {discount}% / IRR {fmt2(eco.irr)}%</div>
                                </div>
                                <div style={{ position: 'relative', height: '18px' }}>
                                  <ProgressBar pct={ip} color={eco.irr > discount ? T.green : T.red} h={18} />
                                  <div style={{ position: 'absolute', top: '-4px', bottom: '-4px', left: `${hp}%`, width: '3px', background: '#fff', borderRadius: '2px', boxShadow: '0 0 8px rgba(255,255,255,0.8)' }} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: T.textMuted, marginTop: '6px' }}>
                                  <span>0%</span><span style={{ color: T.text }}>Discount Rate {discount}%</span><span>{cap.toFixed(0)}%</span>
                                </div>
                              </>
                            );
                          })()}
                        </Card>
                      </div>
                    )}

                    {/* ── PAYBACK ───────────────────────────────────────────── */}
                    {tab === 'payback' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                        <SectionLabel num="8A">Capital Break-Even Threshold</SectionLabel>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                          <MetricCard icon="🏗️" label="Max Justifiable Build" value={fmtCr(eco.breakeven_c * 1e7)} color={T.cyan} sub="Ceiling beyond which Signal becomes preferable" />
                          <MetricCard icon="💰" label="Entered Budget" value={`₹${buildCost} Cr`} color={buildCost < eco.breakeven_c ? T.green : T.red} sub={buildCost < eco.breakeven_c ? 'Under breakeven ✓' : 'Over breakeven ⚠️'} />
                          <MetricCard icon="🎯" label="Payback Year" value={eco.payback ?? 'N/A'} unit={eco.payback ? 'yr' : ''} color={T.amber} sub="Year cumulative NPV crosses zero" />
                        </div>

                        <Card style={{ padding: '24px 28px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: T.textMuted, letterSpacing: '1px' }}>BUDGET vs BREAKEVEN</div>
                            <div style={{ fontSize: '11px', color: T.textSoft }}>₹{buildCost} Cr / {fmtCr(eco.breakeven_c * 1e7)}</div>
                          </div>
                          <div style={{ position: 'relative', height: '18px' }}>
                            <ProgressBar pct={(buildCost / (eco.breakeven_c * 1.3)) * 100} color={buildCost < eco.breakeven_c ? T.green : T.red} h={18} />
                            <div style={{
                              position: 'absolute', top: '-4px', bottom: '-4px',
                              left: `${Math.min(100, (buildCost / (eco.breakeven_c * 1.3)) * 100)}%`,
                              width: '3px', background: '#fff', borderRadius: '2px', boxShadow: '0 0 8px rgba(255,255,255,0.8)',
                            }} />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: T.textMuted, marginTop: '6px' }}>
                            <span>₹0</span><span style={{ color: T.cyan }}>Breakeven {fmtCr(eco.breakeven_c * 1e7)}</span><span>{fmtCr(eco.breakeven_c * 1.3e7)}</span>
                          </div>
                        </Card>

                        <SectionLabel num="8B">Cumulative Payback Trace</SectionLabel>
                        <ChartShell title="Payback Analysis" sub="Cumulative discounted cash position. Amber vertical = formal payback horizon (zero-line intercept).">
                          <ResponsiveContainer width="100%" height={380}>
                            <ComposedChart data={incData} margin={{ top: 28, right: 12, left: -8, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                              <XAxis dataKey="year" {...axX()} />
                              <YAxis {...axY(v => `${v.toFixed(0)}Cr`)} />
                              <Tooltip content={<CustomTooltip />} />
                              <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeWidth={1.5}
                                label={{ position: 'insideTopLeft', value: 'NET ZERO', fill: T.textMuted, fontSize: 10, fontWeight: 700, dy: -10 }} />
                              {eco.payback && (
                                <ReferenceLine x={eco.payback} stroke={T.amber} strokeWidth={2} strokeDasharray="6 4"
                                  label={{ position: 'top', value: `PAYBACK YR ${eco.payback}`, fill: T.amber, fontSize: 11, fontWeight: 800 }} />
                              )}
                              <Line type="monotone" dataKey="val" name="Capital Position" stroke={T.amber} strokeWidth={2.5}
                                dot={{ r: 2.5, fill: T.bg, stroke: T.amber, strokeWidth: 2 }}
                                activeDot={{ r: 7, fill: T.bg, stroke: T.amber, strokeWidth: 2.5 }}
                              />
                            </ComposedChart>
                          </ResponsiveContainer>
                        </ChartShell>
                      </div>
                    )}

                  </div>
                </div>
              </div>
            );
          })()}
        </main>
      </div>
      <Analytics />
    </>
  );
}
