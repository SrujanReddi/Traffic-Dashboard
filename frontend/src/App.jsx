import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, ReferenceLine, ComposedChart, Line } from 'recharts';

// Polished "Pro" Theme
const T = {
  bg: "#09090b", // deep black/zinc
  card: "rgba(24, 24, 27, 0.7)", // zinc-900 glass
  cardSolid: "#18181b",
  border: "rgba(63, 63, 70, 0.4)",
  borderFocus: "rgba(161, 161, 170, 0.8)",
  text: "#fafafa",
  textSoft: "#a1a1aa", // zinc-400
  textMuted: "#71717a", // zinc-500
  green: "#10b981", // emerald
  greenGlow: "rgba(16, 185, 129, 0.15)",
  red: "#f43f5e",   // rose
  redGlow: "rgba(244, 63, 94, 0.15)",
  cyan: "#06b6d4",
  amber: "#f59e0b",
  accent: "#8b5cf6", // violet
  accentGlow: "rgba(139, 92, 246, 0.2)",
  mono: "'JetBrains Mono', monospace",
  chartColors: ["#8b5cf6", "#f43f5e", "#f59e0b", "#64748b"]
};

const fmtCr = (n) => `₹${n ? (n / 10000000).toFixed(2) : 0} Cr`;
const fmtRatio = (n) => typeof n === 'number' ? n.toFixed(2) : n;

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="tooltip-title">YEAR {label}</p>
        <div className="tooltip-divider" />
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="tooltip-item">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: entry.color }} />
              <span style={{ color: T.textSoft }}>{entry.name}</span>
            </div>
            <span className="tooltip-value">{typeof entry.value === 'number' ? `${entry.value.toFixed(2)}` : entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export default function App() {
  // Traffic Inputs
  const [numPhases, setNumPhases] = useState(4);
  const [phaseData, setPhaseData] = useState(Array.from({ length: 4 }, () => ({ criticalVolume: 500, lanes: 1 })));
  const [totalVolume, setTotalVolume] = useState(5000);
  const [occupancy, setOccupancy] = useState(1.8);
  
  // Economic Inputs
  const [gdp, setGdp] = useState(200000);
  const [population, setPopulation] = useState(5000000);
  const [fuelCost, setFuelCost] = useState(100);
  const [inflationRate, setInflationRate] = useState(6.0);
  const [discountRate, setDiscountRate] = useState(10.0);
  const [trafficGrowth, setTrafficGrowth] = useState(5.0);
  const [gdpGrowth, setGdpGrowth] = useState(6.0);
  const [fuelConsumptionIdle, setFuelConsumptionIdle] = useState(0.7);
  const [vocPerKm, setVocPerKm] = useState(3.0);
  const [carbonCost, setCarbonCost] = useState(1.5);

  // Cost Inputs
  const [signalInstallCost, setSignalInstallCost] = useState(500000);
  const [signalMaintAnnual, setSignalMaintAnnual] = useState(200000);
  const [constructionCost, setConstructionCost] = useState(50.0); // Cr

  const [result, setResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  
  const mainContentRef = useRef(null);

  const handleNumPhasesChange = (value) => {
    setNumPhases(value);
    setPhaseData(Array.from({ length: value }, (_, idx) => ({
      criticalVolume: phaseData[idx]?.criticalVolume || 500,
      lanes: phaseData[idx]?.lanes || 1,
    })));
  };

  const handlePhaseChange = (index, field, value) => {
    const updated = [...phaseData];
    updated[index][field] = value;
    setPhaseData(updated);
  };

  const analyze = async () => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const payload = {
        num_phases: numPhases,
        phases: phaseData.map(p => ({ critical_volume: p.criticalVolume, lanes: p.lanes })),
        total_volume: totalVolume,
        occupancy,
        gdp,
        population,
        fuel_cost: fuelCost,
        inflation_rate: inflationRate,
        discount_rate: discountRate,
        traffic_growth: trafficGrowth,
        gdp_growth: gdpGrowth,
        fuel_consumption_idle: fuelConsumptionIdle,
        voc_per_km: vocPerKm,
        carbon_cost: carbonCost,
        signal_install_cost: signalInstallCost,
        signal_maint_annual: signalMaintAnnual,
        construction_cost: constructionCost
      };
      const res = await axios.post('https://traffic-dashboard-pqlh.onrender.com/analyze', payload);
      setResult(res.data);
      
      // Auto scroll to top of results
      setTimeout(() => {
        if(mainContentRef.current) {
          mainContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 100);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap');
        
        :root {
          --bg: ${T.bg};
          --card: ${T.card};
          --card-solid: ${T.cardSolid};
          --border: ${T.border};
          --border-focus: ${T.borderFocus};
          --text: ${T.text};
          --text-soft: ${T.textSoft};
          --text-muted: ${T.textMuted};
          --accent: ${T.accent};
          --accent-glow: ${T.accentGlow};
          --mono: ${T.mono};
        }

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        
        body { 
          background: var(--bg); 
          color: var(--text); 
          font-family: 'Inter', system-ui, sans-serif; 
          -webkit-font-smoothing: antialiased; 
          overflow: hidden; /* Prevent body scroll, layout handles it */
        }
        
        /* Layout */
        .app-layout {
          display: flex;
          height: 100vh;
          width: 100vw;
          overflow: hidden;
        }
        
        /* Sidebar */
        .sidebar {
          width: 400px;
          height: 100%;
          display: flex;
          flex-direction: column;
          background: rgba(15, 15, 18, 0.95);
          backdrop-filter: blur(20px);
          border-right: 1px solid var(--border);
          position: relative;
          z-index: 10;
          box-shadow: 10px 0 30px rgba(0,0,0,0.5);
        }
        
        .sidebar-header {
          padding: 32px 24px 24px 24px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          background: linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%);
        }
        
        .sidebar-content {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        /* Customize Scrollbar */
        ::-webkit-scrollbar { width: 6px; height: 6px;}
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px;}
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
        
        .sidebar-footer {
          padding: 24px;
          border-top: 1px solid var(--border);
          background: var(--card-solid);
        }
        
        /* Main Content */
        .main-content {
          flex: 1;
          height: 100%;
          overflow-y: auto;
          position: relative;
          background: radial-gradient(circle at 80% 20%, var(--accent-glow) 0%, transparent 50%), var(--bg);
        }
        
        .main-content-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 64px 48px;
        }
        
        /* Inputs */
        .section-title {
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: var(--text-muted);
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .section-title::after {
          content: '';
          height: 1px;
          flex: 1;
          background: var(--border);
        }
        
        .input-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        
        .input-group { display: flex; flex-direction: column; gap: 6px; }
        .input-group.full { grid-column: 1 / -1; }
        
        .input-label { 
          font-size: 10px; 
          font-weight: 600; 
          text-transform: uppercase; 
          letter-spacing: 1px; 
          color: var(--text-soft); 
        }
        
        .input-field { 
          background: rgba(0,0,0,0.5); 
          border: 1px solid var(--border); 
          border-radius: 8px; 
          padding: 10px 12px; 
          color: var(--text); 
          font-family: var(--mono);
          font-size: 13px; 
          outline: none; 
          transition: all 0.2s ease; 
          width: 100%;
        }
        .input-field:focus { 
          border-color: var(--accent); 
          box-shadow: 0 0 0 2px var(--accent-glow);
          background: rgba(0,0,0,0.8);
        }
        select.input-field { appearance: none; cursor: pointer; }
        
        .run-btn {
          width: 100%;
          padding: 16px;
          background: #fff;
          color: #000;
          font-weight: 800;
          font-size: 14px;
          letter-spacing: 1px;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 10px 20px rgba(0,0,0,0.2), inset 0 -3px 0 rgba(0,0,0,0.1);
        }
        .run-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 15px 25px rgba(255,255,255,0.1), inset 0 -3px 0 rgba(0,0,0,0.1);
        }
        .run-btn:active:not(:disabled) {
          transform: translateY(1px);
          box-shadow: 0 5px 10px rgba(0,0,0,0.2), inset 0 0px 0 rgba(0,0,0,0.1);
        }
        .run-btn:disabled {
          background: #3f3f46;
          color: #71717a;
          cursor: not-allowed;
          box-shadow: none;
        }
        
        /* Cards & Results components */
        .glass-card { 
          background: var(--card); 
          border: 1px solid var(--border); 
          border-radius: 20px; 
          backdrop-filter: blur(12px) saturate(180%);
          box-shadow: 0 8px 32px rgba(0,0,0,0.2);
          transition: transform 0.3s ease, border-color 0.3s ease;
        }
        .glass-card:hover { border-color: rgba(255,255,255,0.1); }
        
        .result-section-label {
          font-size: 12px; 
          font-weight: 800; 
          color: var(--text-muted); 
          letter-spacing: 3px; 
          margin: 0 0 24px 4px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .result-section-label .num {
          background: var(--border);
          color: var(--text);
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          font-size: 11px;
        }

        .metric-value {
          font-size: 48px;
          font-weight: 900;
          color: var(--text);
          font-family: var(--mono);
          line-height: 1;
          letter-spacing: -1px;
        }
        .metric-unit {
          font-size: 20px;
          color: var(--text-muted);
          margin-left: 4px;
          font-weight: 500;
        }
        
        /* Tooltip */
        .custom-tooltip {
          background: rgba(9, 9, 11, 0.95);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.5);
          backdrop-filter: blur(8px);
        }
        .tooltip-title {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1px;
          color: var(--text-muted);
          margin-bottom: 12px;
        }
        .tooltip-divider { height: 1px; background: var(--border); margin-bottom: 12px; }
        .tooltip-item {
          display: flex;
          justify-content: space-between;
          gap: 24px;
          font-size: 13px;
          margin-bottom: 6px;
        }
        .tooltip-value {
          font-weight: 700;
          font-family: var(--mono);
          color: var(--text);
        }
        
        /* Hero Gen Animations */
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        
        /* Empty State */
        .empty-state {
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          color: var(--text-muted);
        }
        .empty-state-icon {
          font-size: 64px;
          margin-bottom: 24px;
          background: linear-gradient(135deg, var(--text-muted), #18181b);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          opacity: 0.5;
        }
      `}</style>

      <div className="app-layout">
        
        {/* SIDEBAR INPUTS */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <h1 style={{ fontSize: "20px", fontWeight: 800, color: "#fff", letterSpacing: "-0.5px", marginBottom: "4px" }}>
              Traffic Dashboard <span style={{ color: T.accent }}>Pro</span>
            </h1>
            <p style={{ fontSize: "12px", color: T.textMuted, fontWeight: 500 }}>100-Year Life Cycle Analysis</p>
          </div>

          <div className="sidebar-content">
            
            <div>
              <div className="section-title">🚦 Traffic Model</div>
              <div className="input-grid">
                <div className="input-group">
                  <label className="input-label">Total Volume (PCU/h)</label>
                  <input type="number" className="input-field" value={totalVolume} onChange={e => setTotalVolume(Number(e.target.value))} />
                </div>
                <div className="input-group">
                  <label className="input-label">Num Phases</label>
                  <select className="input-field" value={numPhases} onChange={e => handleNumPhasesChange(Number(e.target.value))}>
                    {[2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                
                {/* Phases internal list */}
                <div className="input-group full">
                  <label className="input-label" style={{ marginTop: "8px" }}>Phase Breakdowns (Crit Vol | Lanes)</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", background: "rgba(0,0,0,0.2)", padding: "12px", borderRadius: "12px", border: `1px solid ${T.border}` }}>
                    {phaseData.map((p, i) => (
                      <div key={i} style={{ display: "flex", gap: "8px" }}>
                        <div style={{ padding: "8px", background: "rgba(255,255,255,0.05)", borderRadius: "6px", fontSize: "11px", color: T.textMuted, display: "flex", alignItems: "center" }}>P{i+1}</div>
                        <input type="number" className="input-field" style={{ flex: 1 }} value={p.criticalVolume} title="Critical Volume" onChange={e => handlePhaseChange(i, 'criticalVolume', Number(e.target.value))} />
                        <input type="number" className="input-field" style={{ width: "60px", textAlign:"center" }} value={p.lanes} title="Lanes" onChange={e => handlePhaseChange(i, 'lanes', Number(e.target.value))} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Vehicle Occupancy</label>
                  <input type="number" step="0.1" className="input-field" value={occupancy} onChange={e => setOccupancy(Number(e.target.value))} />
                </div>
                <div className="input-group">
                  <label className="input-label">Traffic Growth (%)</label>
                  <input type="number" step="0.1" className="input-field" value={trafficGrowth} onChange={e => setTrafficGrowth(Number(e.target.value))} />
                </div>
              </div>
            </div>

            <div>
              <div className="section-title">📉 Economic Constants</div>
              <div className="input-grid">
                <div className="input-group full">
                  <label className="input-label">City GDP (₹ Cr)</label>
                  <input type="number" className="input-field" value={gdp} onChange={e => setGdp(Number(e.target.value))} />
                </div>
                <div className="input-group">
                  <label className="input-label">Population</label>
                  <input type="number" className="input-field" value={population} onChange={e => setPopulation(Number(e.target.value))} />
                </div>
                <div className="input-group">
                  <label className="input-label">WACC (Discount %)</label>
                  <input type="number" step="0.1" className="input-field" value={discountRate} onChange={e => setDiscountRate(Number(e.target.value))} />
                </div>
                <div className="input-group">
                  <label className="input-label">GDP Growth (%)</label>
                  <input type="number" step="0.1" className="input-field" value={gdpGrowth} onChange={e => setGdpGrowth(Number(e.target.value))} />
                </div>
                <div className="input-group">
                  <label className="input-label">Inflation (%)</label>
                  <input type="number" step="0.1" className="input-field" value={inflationRate} onChange={e => setInflationRate(Number(e.target.value))} />
                </div>
                <div className="input-group">
                  <label className="input-label">Fuel (₹/L)</label>
                  <input type="number" className="input-field" value={fuelCost} onChange={e => setFuelCost(Number(e.target.value))} />
                </div>
                <div className="input-group">
                  <label className="input-label">Idle (L/h)</label>
                  <input type="number" step="0.1" className="input-field" value={fuelConsumptionIdle} onChange={e => setFuelConsumptionIdle(Number(e.target.value))} />
                </div>
                <div className="input-group">
                  <label className="input-label">Avg VOC (₹/km)</label>
                  <input type="number" step="0.1" className="input-field" value={vocPerKm} onChange={e => setVocPerKm(Number(e.target.value))} />
                </div>
                <div className="input-group">
                  <label className="input-label">Carbon (₹/kg)</label>
                  <input type="number" step="0.1" className="input-field" value={carbonCost} onChange={e => setCarbonCost(Number(e.target.value))} />
                </div>
              </div>
            </div>

            <div>
              <div className="section-title">🏗️ Infrastructure Bids</div>
              <div className="input-grid">
                <div className="input-group full">
                  <label className="input-label">Grade Separation Construction (₹ Cr)</label>
                  <input type="number" className="input-field" value={constructionCost} onChange={e => setConstructionCost(Number(e.target.value))} />
                </div>
                <div className="input-group full">
                  <label className="input-label">Signal Installation (₹)</label>
                  <input type="number" className="input-field" value={signalInstallCost} onChange={e => setSignalInstallCost(Number(e.target.value))} />
                </div>
                <div className="input-group full">
                  <label className="input-label">Signal Annual Maintenance (₹)</label>
                  <input type="number" className="input-field" value={signalMaintAnnual} onChange={e => setSignalMaintAnnual(Number(e.target.value))} />
                </div>
              </div>
            </div>

          </div>

          <div className="sidebar-footer">
            {error && <div style={{ marginBottom: "16px", padding: "12px", background: "rgba(244,63,94,0.1)", borderRadius: "8px", border: `1px solid ${T.red}`, color: T.red, fontSize: "12px", fontWeight: 600 }}>{error}</div>}
            <button className="run-btn" onClick={analyze} disabled={isAnalyzing}>
              {isAnalyzing ? "Processing Matrix..." : "RUN ANALYSIS"}
            </button>
          </div>
        </aside>

        {/* MAIN DESK (RESULTS) */}
        <main className="main-content" ref={mainContentRef}>
          {!result && !isAnalyzing && (
            <div className="empty-state">
              <div className="empty-state-icon animate-fade-in" style={{animationDelay: "0ms"}}>⌘</div>
              <h2 className="animate-fade-in" style={{animationDelay: "100ms", fontSize: "24px", color: "#fff", marginBottom: "12px", fontWeight: 800 }}>Workspace Ready</h2>
              <p className="animate-fade-in" style={{animationDelay: "200ms", fontSize: "14px", maxWidth: "400px", lineHeight: 1.6}}>Dial your intersection constraints and economic vectors on the left sidebar to generate a 100-year infrastructure lifecycle matrix.</p>
            </div>
          )}

          {isAnalyzing && (
            <div className="empty-state">
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", border: `3px solid ${T.border}`, borderTopColor: T.accent, animation: "spin 1s linear infinite" }} />
              <p style={{ marginTop: "24px", fontSize: "14px", color: T.textMuted, fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase" }}>Computing 100-year arrays...</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {result && !isAnalyzing && (
            <div className="main-content-inner animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "64px" }}>
              
              {/* 1. WEBSTER'S SIGNAL METRICS */}
              <div>
                <div className="result-section-label"><span className="num">1</span> WEBSTER'S SIGNAL DIAGNOSTICS</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px" }}>
                    <div className="glass-card" style={{ padding: "32px" }}>
                        <div style={{ fontSize: "12px", color: T.textMuted, fontWeight: 700, marginBottom: "12px", letterSpacing: "1px" }}>OPTIMAL CYCLE TIME</div>
                        <div className="metric-value">{result.webster.cycle_time.toFixed(0)}<span className="metric-unit">s</span></div>
                    </div>
                    <div className="glass-card" style={{ padding: "32px", position: "relative", overflow: "hidden" }}>
                        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 100% 0%, ${T.accentGlow}, transparent 70%)` }}/>
                        <div style={{ position: "relative" }}>
                          <div style={{ fontSize: "12px", color: T.textMuted, fontWeight: 700, marginBottom: "12px", letterSpacing: "1px" }}>AVG VEHICLE DELAY</div>
                          <div className="metric-value" style={{ color: T.accent }}>{result.webster.avg_delay.toFixed(1)}<span className="metric-unit" style={{ color: T.textMuted}}>s</span></div>
                        </div>
                    </div>
                    <div className="glass-card" style={{ padding: "32px" }}>
                        <div style={{ fontSize: "12px", color: T.textMuted, fontWeight: 700, marginBottom: "12px", letterSpacing: "1px" }}>DEGREE OF SATURATION</div>
                        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                          <div className="metric-value" style={{ color: result.webster.sum_flow_ratios >= 0.95 ? T.red : T.text }}>
                            {result.webster.sum_flow_ratios.toFixed(2)}
                          </div>
                          <div style={{ height: "6px", flex: 1, background: "rgba(0,0,0,0.5)", borderRadius: "3px", overflow: "hidden", border: `1px solid ${T.border}`}}>
                             <div style={{ height: "100%", background: result.webster.sum_flow_ratios >= 0.95 ? T.red : T.green, width: `${Math.min(100, result.webster.sum_flow_ratios*100)}%`, transition: "width 1s cubic-bezier(0.4, 0, 0.2, 1)" }} />
                          </div>
                        </div>
                        {result.webster.is_saturated && <div style={{ fontSize: "11px", color: T.red, marginTop: "16px", fontWeight: 700, padding: "8px 12px", background: "rgba(244,63,94,0.1)", borderRadius: "6px" }}>⚠️ Highway Capacity Exceeded (Y {'>'} 0.95)</div>}
                    </div>
                </div>
              </div>

              {/* HERO RECOMMENDATION */}
              <div className="glass-card" style={{ padding: "48px", border: `1px solid ${result.economic.delta_npv > 0 || result.webster.is_saturated ? T.green : T.amber}`, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", gap: "24px", boxShadow: `0 20px 60px -10px ${result.economic.delta_npv > 0 || result.webster.is_saturated ? T.greenGlow : 'rgba(245,158,11,0.05)'}` }}>
                {/* Glow ring background */}
                <div style={{ position: "absolute", top: "-50%", left: "-20%", width: "150%", height: "200%", background: `radial-gradient(circle at top left, ${result.economic.delta_npv > 0 || result.webster.is_saturated ? 'rgba(16,185,129,0.06)' : 'rgba(245,158,11,0.04)'}, transparent 60%)`, pointerEvents: "none" }} />
                
                <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: result.economic.delta_npv > 0 || result.webster.is_saturated ? T.green : T.amber, boxShadow: `0 0 16px 2px ${result.economic.delta_npv > 0 || result.webster.is_saturated ? T.green : T.amber}` }} />
                    <div style={{ fontSize: "13px", fontWeight: 800, color: T.textSoft, letterSpacing: "2px" }}>AI SYNTHESIS DECISION</div>
                  </div>
                  
                  <h2 style={{ fontSize: "64px", fontWeight: 900, color: "#fff", margin: 0, letterSpacing: "-2px", lineHeight: 1 }}>{result.decision.choice}</h2>
                  
                  <div style={{ display: "inline-flex", alignSelf: "flex-start", padding: "8px 16px", borderRadius: "100px", border: `1px solid ${result.decision.status.includes('Recommended') || result.decision.status.includes('Mandatory') ? T.green : T.amber}`, background: "rgba(0,0,0,0.5)", fontSize: "12px", color: result.decision.status.includes('Recommended') || result.decision.status.includes('Mandatory') ? T.green : T.amber, fontWeight: 700, letterSpacing: "1px" }}>
                    STATUS: {result.decision.status.toUpperCase()}
                  </div>
                  
                  <p style={{ fontSize: "16px", color: T.textSoft, lineHeight: 1.8, maxWidth: "800px", margin: "8px 0 0 0", fontWeight: 400 }}>
                    Based on the 100-year infrastructural economic analysis (at {discountRate}% WACC): 
                    {result.economic.delta_npv > 0 ? (
                      <> The structural lifespan unlocks an incredible NPV economic advantage of <strong style={{color:"#fff"}}>{fmtCr(result.economic.delta_npv)}</strong> to society. The internal rate of return stands at <strong style={{color:T.green}}>{fmtRatio(result.economic.irr)}%</strong>—surpassing standard hurdle thresholds. Break-even achieved in <strong style={{color:"#fff"}}>{result.economic.payback || "never"}</strong> years.</>
                    ) : (
                      <> Grade infrastructure cannot be justified given identical growth bounds. A flat-grade traffic signal limits NPV capital loss by <strong style={{color:"#fff"}}>{fmtCr(Math.abs(result.economic.delta_npv))}</strong> relative to the heavy construction alternative.</>
                    )}
                  </p>
                  
                  <div style={{ marginTop: "12px", padding: "20px 24px", background: "rgba(0,0,0,0.4)", borderRadius: "12px", borderLeft: `2px solid ${T.accent}`, fontSize: "14px", lineHeight: 1.6, color: T.textSoft }}>
                    <span style={{color: "#fff", fontWeight: 600}}>System Reasoning &mdash;</span> {result.decision.reason}
                  </div>
                </div>
              </div>

              {/* DASHBOARD CHARTS */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>
                
                {/* 2. CASH FLOW DIAGRAMS OF BOTH ALTERNATIVES */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <div className="result-section-label"><span className="num">2</span> ABSOLUTE CASH FLOW DECAY (Option A vs B)</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>
                     <div className="glass-card" style={{ padding: "32px 32px 40px 32px", display:"flex", flexDirection:"column" }}>
                       <h4 style={{ fontSize: "15px", color: "#fff", fontWeight: 700, marginBottom: "8px" }}>Traffic Signal Vector</h4>
                       <p style={{ fontSize: "12px", color: T.textMuted, marginBottom: "32px" }}>Compounding operational losses bleeding from permanent intersection throttling.</p>
                       <ResponsiveContainer width="100%" height={260}>
                         <AreaChart data={result.charts.comps_sampled.map((c, i) => ({ year: c.year, val: result.charts.cf_s[i] / 1e7 }))} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                           <defs>
                             <linearGradient id="colorSignal" x1="0" y1="0" x2="0" y2="1">
                               <stop offset="5%" stopColor={T.red} stopOpacity={0.4}/>
                               <stop offset="95%" stopColor={T.red} stopOpacity={0}/>
                             </linearGradient>
                           </defs>
                           <CartesianGrid strokeDasharray="3 3" stroke={"rgba(255,255,255,0.03)"} vertical={false} />
                           <XAxis dataKey="year" tick={{fill: T.textMuted, fontSize: 11, fontFamily: T.mono}} axisLine={false} tickLine={false} dy={10} />
                           <YAxis tick={{fill: T.textMuted, fontSize: 11, fontFamily: T.mono}} axisLine={false} tickLine={false} width={80} tickFormatter={(v)=>`₹${v.toFixed(0)}C`} />
                           <Tooltip content={<CustomTooltip />} />
                           <Area type="monotone" dataKey="val" name="Signal Cash Flow" stroke={T.red} strokeWidth={2} fillOpacity={1} fill="url(#colorSignal)" />
                         </AreaChart>
                       </ResponsiveContainer>
                     </div>

                     <div className="glass-card" style={{ padding: "32px 32px 40px 32px", display:"flex", flexDirection:"column" }}>
                       <h4 style={{ fontSize: "15px", color: "#fff", fontWeight: 700, marginBottom: "8px" }}>Grade Separation Vector</h4>
                       <p style={{ fontSize: "12px", color: T.textMuted, marginBottom: "32px" }}>Socio-economic growth offsetting the initial massive structural investment dip.</p>
                       <ResponsiveContainer width="100%" height={260}>
                         <AreaChart data={result.charts.comps_sampled.map((c, i) => ({ year: c.year, val: result.charts.cf_g[i] / 1e7 }))} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                           <defs>
                             <linearGradient id="colorGS" x1="0" y1="0" x2="0" y2="1">
                               <stop offset="5%" stopColor={T.green} stopOpacity={0.4}/>
                               <stop offset="95%" stopColor={T.green} stopOpacity={0}/>
                             </linearGradient>
                           </defs>
                           <CartesianGrid strokeDasharray="3 3" stroke={"rgba(255,255,255,0.03)"} vertical={false} />
                           <XAxis dataKey="year" tick={{fill: T.textMuted, fontSize: 11, fontFamily: T.mono}} axisLine={false} tickLine={false} dy={10} />
                           <YAxis tick={{fill: T.textMuted, fontSize: 11, fontFamily: T.mono}} axisLine={false} tickLine={false} width={80} tickFormatter={(v)=>`₹${v.toFixed(0)}C`} />
                           <Tooltip content={<CustomTooltip />} />
                           <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
                           <Area type="monotone" dataKey="val" name="Grade Sep Cash Flow" stroke={T.green} strokeWidth={2} fillOpacity={1} fill="url(#colorGS)" />
                         </AreaChart>
                       </ResponsiveContainer>
                     </div>
                  </div>
                </div>
                
                {/* 3. INCREMENTAL NPV ANALYSIS */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <div className="result-section-label"><span className="num">3</span> NET INCREMENTAL ADVANTAGE (NPV)</div>
                  <div className="glass-card" style={{ padding: "32px 32px 40px 32px" }}>
                    <p style={{ fontSize: "13px", color: T.textSoft, marginBottom: "32px" }}>Tracking the continuous gap in societal economic value generated strictly by underpass adoption.</p>
                    <ResponsiveContainer width="100%" height={360}>
                      <AreaChart data={result.charts.comps_sampled.map((c, i) => ({ year: c.year, val: result.charts.inc_cumulative[i] }))} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={T.accent} stopOpacity={0.4}/>
                            <stop offset="100%" stopColor={T.accent} stopOpacity={0.0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={"rgba(255,255,255,0.03)"} vertical={false} />
                        <XAxis dataKey="year" tick={{fill: T.textMuted, fontSize: 11, fontFamily: T.mono}} axisLine={false} tickLine={false} dy={10} minTickGap={20} />
                        <YAxis tick={{fill: T.textMuted, fontSize: 11, fontFamily: T.mono}} axisLine={false} tickLine={false} width={80} tickFormatter={(v)=>`₹${v.toFixed(0)}C`} />
                        <Tooltip content={<CustomTooltip />} />
                        <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
                        <Area type="monotone" dataKey="val" name="Net Advantage" stroke={T.accent} strokeWidth={3} fillOpacity={1} fill="url(#colorInc)" style={{ filter: `drop-shadow(0 4px 12px ${T.accentGlow})` }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 4. ANNUAL LOSS COMPOSITION */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <div className="result-section-label"><span className="num">4</span> ANNUAL LOSS COMPOSITION DRIVERS</div>
                  <div className="glass-card" style={{ padding: "32px 32px 40px 32px" }}>
                    <p style={{ fontSize: "13px", color: T.textSoft, marginBottom: "32px" }}>Anatomical breakdown of compounding traffic decay metrics vs static structural lifecycle management.</p>
                    <ResponsiveContainer width="100%" height={360}>
                      <BarChart data={result.charts.comps_sampled} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barSize={16}>
                        <CartesianGrid strokeDasharray="3 3" stroke={"rgba(255,255,255,0.03)"} vertical={false} />
                        <XAxis dataKey="year" tick={{fill: T.textMuted, fontSize: 11, fontFamily: T.mono}} axisLine={false} tickLine={false} dy={10} />
                        <YAxis tick={{fill: T.textMuted, fontSize: 11, fontFamily: T.mono}} axisLine={false} tickLine={false} width={80} tickFormatter={(v)=>`₹${v.toFixed(0)}C`} />
                        <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.03)'}} />
                        <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "24px", color: T.textSoft }} iconType="circle" />
                        <Bar dataKey="tvl" stackId="A" fill={T.chartColors[0]} name="Time Value" radius={[0,0,4,4]} />
                        <Bar dataKey="afc" stackId="A" fill={T.chartColors[1]} name="Fuel Loss" />
                        <Bar dataKey="voc" stackId="A" fill={T.chartColors[2]} name="Vehicle Wear" />
                        <Bar dataKey="carbon" stackId="A" fill={T.chartColors[3]} name="Carbon" radius={[4,4,0,0]} />
                        <Bar dataKey="maint_g" fill={T.cyan} name="Structural UP Maint." radius={[4,4,4,4]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

              {/* 5. SCENARIOS DECK */}
              <div>
                <div className="result-section-label"><span className="num">5</span> 100-YEAR NPV HORIZON SCENARIOS</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px" }}>
                  {[
                    { name: "PESSIMISTIC", val: result.charts.scenarios.pessimistic, desc: "Recession growth, capital shocks", icon: "rgba(244,63,94" },
                    { name: "BASE CASE", val: result.charts.scenarios.base, desc: "Current modeled trajectory", active: true, icon: "rgba(139,92,246" },
                    { name: "OPTIMISTIC", val: result.charts.scenarios.optimistic, desc: "High macro-growth acceleration", icon: "rgba(16,185,129" }
                  ].map((sc, i) => (
                    <div key={i} className="glass-card" style={{ padding: "32px 24px", display:"flex", flexDirection:"column", border: sc.active ? `1px solid ${T.accent}` : `1px solid var(--border)`, background: sc.active ? `linear-gradient(145deg, rgba(139,92,246,0.1), var(--card))` : `var(--card)` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "32px" }}>
                        <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: `${sc.icon},0.15)`, border: `1px solid ${sc.icon},0.3)`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                          <div style={{ width:"8px", height:"8px", borderRadius:"50%", background: `${sc.icon},1)` }} />
                        </div>
                        <div style={{ fontSize: "12px", fontWeight: 800, color: sc.active?"#fff":T.textMuted, letterSpacing: "1.5px" }}>{sc.name}</div>
                      </div>
                      <div className="metric-value" style={{ color: sc.val > 0 ? T.green : T.red, fontSize: "40px", marginBottom: "12px" }}>{fmtCr(sc.val)}</div>
                      <div style={{ fontSize: "12px", color: T.textSoft, lineHeight: 1.5 }}>{sc.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>
                {/* 6. SENSITIVITY ANALYSIS */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <div className="result-section-label"><span className="num">6</span> NPV SENSITIVITY TORNADO (± 20%)</div>
                  <div className="glass-card" style={{ padding: "32px", display: "flex", flexDirection: "column", gap: "24px" }}>
                     <p style={{ fontSize: "13px", color: T.textSoft, margin: 0 }}>Mapping boundary risk by scaling specific matrix constraints independently securely holding all other vectors neutral.</p>
                     
                     <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                       {result.charts.sensitivities.map((s, i) => {
                         const maxSpread = result.charts.sensitivities[0].spread;
                         return (
                           <div key={i}>
                             <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: 700, color: "#fff", marginBottom: "10px", fontFamily: T.mono }}>
                               <span style={{textTransform: "uppercase", letterSpacing: "1px"}}>{s.variable}</span>
                               <span style={{ color: T.textMuted }}>SPREAD: {fmtCr(s.spread)}</span>
                             </div>
                             
                             <div style={{ height: "40px", display: "flex", alignItems: "center", position: "relative", background: "rgba(0,0,0,0.5)", borderRadius: "8px", border: `1px solid rgba(255,255,255,0.05)`, padding: "4px" }}>
                                <div style={{ width: "2px", height: "100%", background: "rgba(255,255,255,0.8)", position: "absolute", left: "50%", zIndex: 1, boxShadow:"0 0 10px rgba(255,255,255,0.5)" }} />
                                
                                <div style={{ flex: 1, height: "100%", display: "flex", justifyContent: "flex-end" }}>
                                  {s.low_npv < result.economic.delta_npv && (
                                     <div style={{ background: `linear-gradient(270deg, ${T.red}, #4c1d95)`, height: "100%", width: `${Math.min(100, Math.abs(s.low_npv - result.economic.delta_npv) / maxSpread * 100)}%`, borderRadius: "4px 0 0 4px", borderRight: `2px solid #fff` }} />
                                  )}
                                  {s.high_npv < result.economic.delta_npv && (
                                     <div style={{ background: `linear-gradient(270deg, ${T.cyan}, #0891b2)`, height: "100%", width: `${Math.min(100, Math.abs(s.high_npv - result.economic.delta_npv) / maxSpread * 100)}%`, borderRadius: "4px 0 0 4px", borderRight: `2px solid #fff` }} />
                                  )}
                                </div>
                                <div style={{ flex: 1, height: "100%", display: "flex" }}>
                                  {s.high_npv > result.economic.delta_npv && (
                                     <div style={{ background: `linear-gradient(90deg, ${T.green}, #064e3b)`, height: "100%", width: `${Math.min(100, Math.abs(s.high_npv - result.economic.delta_npv) / maxSpread * 100)}%`, borderRadius: "0 4px 4px 0", borderLeft: `2px solid #fff` }} />
                                  )}
                                  {s.low_npv > result.economic.delta_npv && (
                                     <div style={{ background: `linear-gradient(90deg, ${T.accent}, #4c1d95)`, height: "100%", width: `${Math.min(100, Math.abs(s.low_npv - result.economic.delta_npv) / maxSpread * 100)}%`, borderRadius: "0 4px 4px 0", borderLeft: `2px solid #fff` }} />
                                  )}
                                </div>
                             </div>
                           </div>
                         );
                       })}
                     </div>
                  </div>
                </div>

                {/* 7. IRR ANALYSIS */}
                <div>
                  <div className="result-section-label"><span className="num">7</span> INTERNAL RATE OF RETURN</div>
                  <div className="glass-card" style={{ padding: "40px 32px", display: "flex", flexDirection: "column", height: "calc(100% - 36px)" }}>
                    <p style={{ fontSize: "13px", color: T.textSoft, marginBottom: "32px" }}>Raw yield magnitude generated by structural infrastructure scaled against capital WACC bounds.</p>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "20px", marginTop: "auto" }}>
                      <div>
                        <div style={{ fontSize: "11px", color: T.textMuted, fontWeight: 800, letterSpacing: "1.5px", marginBottom: "8px" }}>ACTUAL YIELD</div>
                        <div className="metric-value" style={{ color: result.economic.irr > discountRate ? T.green : T.red }}>{fmtRatio(result.economic.irr)}<span className="metric-unit">%</span></div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "11px", color: T.textMuted, fontWeight: 800, letterSpacing: "1.5px", marginBottom: "8px" }}>WACC TARGET</div>
                        <div className="metric-value" style={{ fontSize: "28px", color: "#fff"}}>{discountRate}<span className="metric-unit">%</span></div>
                      </div>
                    </div>
                    {(() => {
                      let maxVisual = Math.max(50, result.economic.irr || 0);
                      let hurdleScale = (discountRate / maxVisual) * 100;
                      let irrScale = ((result.economic.irr || 0) / maxVisual) * 100;
                      return (
                        <div style={{ height: "24px", background: "rgba(0,0,0,0.6)", borderRadius: "12px", position: "relative", border: `1px solid rgba(255,255,255,0.05)` }}>
                          <div style={{ position: "absolute", left: `${hurdleScale}%`, top: "-6px", bottom: "-6px", width: "4px", background: "#fff", zIndex: 10, borderRadius: "2px", boxShadow: "0 0 10px rgba(255,255,255,0.8)" }} />
                          <div style={{ position: "absolute", top: "2px", left: "2px", bottom: "2px", background: result.economic.irr > discountRate ? T.gradGreen : T.gradRed, width: `calc(${irrScale}% - 4px)`, borderRadius: "10px" }} />
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* 8A. BREAK EVEN METRICS */}
                <div>
                  <div className="result-section-label"><span className="num">8A</span> MAX ALLOWABLE BID COST</div>
                  <div className="glass-card" style={{ padding: "40px 32px", display: "flex", flexDirection: "column", height: "calc(100% - 36px)" }}>
                    <p style={{ fontSize: "13px", color: T.textSoft, marginBottom: "32px" }}>Financial ceiling defining exactly where specific infrastructure bids invert the viability theorem.</p>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "20px", marginTop: "auto" }}>
                      <div>
                        <div style={{ fontSize: "11px", color: T.textMuted, fontWeight: 800, letterSpacing: "1.5px", marginBottom: "8px" }}>CEILING THRESHOLD</div>
                        <div className="metric-value" style={{ color: T.cyan }}>{fmtCr(result.economic.breakeven_c * 1e7)}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span style={{fontSize:"11px", color:T.textMuted, fontWeight: 600}}>0 Cr</span>
                      <span style={{fontSize:"11px", color:T.textSoft, fontWeight: 700}}>PROPOSED: ₹{constructionCost} Cr</span>
                    </div>
                    <div style={{ height: "24px", background: "rgba(0,0,0,0.6)", borderRadius: "12px", position: "relative", border: `1px solid rgba(255,255,255,0.05)` }}>
                      <div style={{ 
                        position: "absolute", top: "2px", left: "2px", bottom: "2px", 
                        background: constructionCost < result.economic.breakeven_c ? T.gradGreen : T.gradRed, 
                        width: `calc(${Math.min(100, (constructionCost / result.economic.breakeven_c) * 100)}% - 4px)`,
                        transition: "width 1s cubic-bezier(0.4, 0, 0.2, 1)",
                        borderRadius: "10px"
                      }} />
                      {constructionCost <= result.economic.breakeven_c && (
                        <div style={{ position: "absolute", top: "-6px", left: `${(constructionCost / result.economic.breakeven_c) * 100}%`, width: "4px", bottom: "-6px", background: "#fff", transform: "translateX(-4px)", zIndex: 2, borderRadius: "2px", boxShadow:"0 0 10px rgba(255,255,255,0.8)" }} />
                      )}
                      <div style={{ position: "absolute", top: "0", right: "0", width: "2px", height: "100%", background: T.border }} />
                    </div>
                  </div>
                </div>

                {/* 8B. PAYBACK TRACE */}
                <div style={{ gridColumn: "1 / -1", marginBottom: "64px" }}>
                  <div className="result-section-label"><span className="num">8B</span> LINEAR PAYBACK TRACE</div>
                  <div className="glass-card" style={{ padding: "32px 32px 40px 32px" }}>
                    <p style={{ fontSize: "13px", color: T.textSoft, marginBottom: "40px" }}>Pinpoints the timeline threshold where net socio-economic capacity completely recoups structural upfront execution capital bounds.</p>
                    <ResponsiveContainer width="100%" height={400}>
                      <ComposedChart data={result.charts.comps_sampled.map((c, i) => ({ year: c.year, val: result.charts.inc_cumulative[i] }))} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={"rgba(255,255,255,0.03)"} vertical={false} />
                        <XAxis dataKey="year" tick={{fill: T.textMuted, fontSize: 11, fontFamily: T.mono}} axisLine={false} tickLine={false} dy={10} name="Year" />
                        <YAxis tick={{fill: T.textMuted, fontSize: 11, fontFamily: T.mono}} axisLine={false} tickLine={false} width={80} tickFormatter={(v)=>`₹${v.toFixed(0)}C`} />
                        <Tooltip content={<CustomTooltip />} />
                        
                        <ReferenceLine y={0} stroke={T.text} strokeWidth={2} opacity={0.3} label={{ position: 'insideTopLeft', value: 'NET ZERO HORIZON', fill: T.textMuted, fontSize: 11, fontWeight: 700, dy: -10 }} />
                        
                        {result.economic.payback && <ReferenceLine x={result.economic.payback} stroke={T.amber} strokeWidth={2} strokeDasharray="5 5" label={{ position: 'top', value: `PAYBACK HORIZON: YR ${result.economic.payback}`, fill: T.amber, fontSize: 12, fontWeight: 800 }} />}
                        
                        <Line type="monotone" dataKey="val" name="Capital Position" stroke={T.amber} strokeWidth={3} activeDot={{r: 8, fill: T.bg, stroke: T.amber, strokeWidth:3}} dot={{r: 4, fill: T.bg, stroke: T.amber, strokeWidth: 2}} style={{ filter:`drop-shadow(0 4px 8px rgba(245,158,11,0.2))`}} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
