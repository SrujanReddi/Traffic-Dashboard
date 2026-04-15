import React, { useState } from 'react';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, ReferenceLine, ComposedChart, Line } from 'recharts';

// Glassmorphism theme constants
const T = {
  bg: "#0f1320",
  card: "rgba(22, 27, 40, 0.6)",
  cardSolid: "#161b28",
  border: "rgba(40, 48, 70, 0.5)",
  text: "#e0e4eb",
  textSoft: "#9ca3af",
  textMuted: "#6b7280",
  green: "#22c55e",
  gradGreen: "linear-gradient(135deg, #22c55e, #10b981)",
  red: "#ef4444",
  gradRed: "linear-gradient(135deg, #ef4444, #f43f5e)",
  cyan: "#06b6d4",
  amber: "#f59e0b",
  accent: "#6366f1",
  purple: "#8b5cf6",
  mono: "'JetBrains Mono', monospace",
  chartColors: ["#8b5cf6", "#ef4444", "#f59e0b", "#64748b"]
};

// Formatting utilities
const fmtCr = (n) => `₹${n ? (n / 10000000).toFixed(2) : 0} Cr`;
const fmtRatio = (n) => typeof n === 'number' ? n.toFixed(2) : n;

function StatCard({ label, value, icon, trend, subtext }) {
  const color = trend === 'positive' ? T.green : trend === 'negative' ? T.red : T.cyan;
  return (
    <div className="glass-card" style={{ padding: "24px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, right: 0, width: "150px", height: "150px", background: color, filter: "blur(60px)", opacity: 0.1, borderRadius: "50%", transform: "translate(30%, -30%)" }} />
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
        {icon}
        <div style={{ fontSize: "11px", fontWeight: 600, color: T.textMuted, textTransform: "uppercase", letterSpacing: "1px" }}>{label}</div>
      </div>
      <div style={{ fontSize: "32px", fontWeight: 800, color: T.text, fontFamily: T.mono, marginBottom: "8px" }}>{value}</div>
      {subtext && <div style={{ fontSize: "12px", color: T.textSoft }}>{subtext}</div>}
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card" style={{ padding: "12px 16px", background: "rgba(15, 19, 32, 0.9)", border: `1px solid ${T.border}` }}>
        <p style={{ color: T.textMuted, fontSize: "11px", fontWeight: 700, marginBottom: "8px" }}>YEAR {label}</p>
        {payload.map((entry, index) => (
          <div key={`item-${index}`} style={{ color: entry.color || T.text, fontSize: "13px", display: "flex", justifyContent: "space-between", gap: "16px", marginBottom: "4px" }}>
            <span>{entry.name}</span>
            <span style={{ fontWeight: 700, fontFamily: T.mono }}>{typeof entry.value === 'number' ? `${entry.value.toFixed(2)}` : entry.value}</span>
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
      const res = await axios.post('http://127.0.0.1:8000/analyze', payload);
      setResult(res.data);
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
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${T.bg}; color: ${T.text}; font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
        .glass-card { background: ${T.card}; backdrop-filter: blur(24px) saturate(1.4); border: 1px solid ${T.border}; border-radius: 16px; }
        .input-group { display: flex; flex-direction: column; gap: 8px; }
        .input-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: ${T.textMuted}; }
        .input-field { background: rgba(0,0,0,0.3); border: 1px solid ${T.border}; borderRadius: 8px; padding: 12px; color: ${T.text}; font-size: 14px; font-weight: 600; outline: none; transition: border 0.2s; }
        .input-field:focus { border-color: ${T.green}; }
        select.input-field { appearance: none; }
      `}</style>
      
      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "48px 24px" }}>
        
        {/* Header */}
        <header style={{ marginBottom: "48px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "8px" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(34,197,94,0.1)", border: `1px solid rgba(34,197,94,0.3)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px" }}>🚦</div>
            <div>
              <h1 style={{ fontSize: "2rem", fontWeight: 800, background: T.gradGreen, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Traffic Signal vs. Grade Separation</h1>
              <p style={{ fontSize: "12px", color: T.textMuted, textTransform: "uppercase", letterSpacing: "2px", fontWeight: 600 }}>100-Year Lifecycle Decision Support System</p>
            </div>
          </div>
        </header>

        {/* Inputs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "24px", marginBottom: "48px" }}>
          
          <div className="glass-card" style={{ padding: "24px" }}>
            <h2 style={{ fontSize: "14px", fontWeight: 700, color: T.text, marginBottom: "20px", display:"flex", alignItems:"center", gap:"8px" }}><span>🚗</span> Traffic Parameters</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div className="input-group">
                <label className="input-label">Intersection Vol (PCU/h)</label>
                <input type="number" className="input-field" value={totalVolume} onChange={e => setTotalVolume(Number(e.target.value))} />
              </div>
              <div className="input-group">
                <label className="input-label">Num Phases</label>
                <select className="input-field" value={numPhases} onChange={e => handleNumPhasesChange(Number(e.target.value))}>
                  {[2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
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
            
            <h3 style={{ fontSize: "12px", fontWeight: 600, color: T.textMuted, marginTop: "24px", marginBottom: "12px" }}>Phase Details</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {phaseData.map((p, i) => (
                <div key={i} style={{ display: "flex", gap: "12px" }}>
                  <div className="input-group" style={{ flex: 1 }}>
                    {i===0 && <label className="input-label">Crit Vol (PCU)</label>}
                    <input type="number" className="input-field" value={p.criticalVolume} onChange={e => handlePhaseChange(i, 'criticalVolume', Number(e.target.value))} />
                  </div>
                  <div className="input-group" style={{ width: "100px" }}>
                    {i===0 && <label className="input-label">Lanes</label>}
                    <input type="number" className="input-field" value={p.lanes} onChange={e => handlePhaseChange(i, 'lanes', Number(e.target.value))} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card" style={{ padding: "24px" }}>
            <h2 style={{ fontSize: "14px", fontWeight: 700, color: T.text, marginBottom: "20px", display:"flex", alignItems:"center", gap:"8px" }}><span>💰</span> Economic Parameters</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div className="input-group">
                <label className="input-label">City GDP (Cr)</label>
                <input type="number" className="input-field" value={gdp} onChange={e => setGdp(Number(e.target.value))} />
              </div>
              <div className="input-group">
                <label className="input-label">Population</label>
                <input type="number" className="input-field" value={population} onChange={e => setPopulation(Number(e.target.value))} />
              </div>
              <div className="input-group">
                <label className="input-label">GDP Growth (%)</label>
                <input type="number" step="0.1" className="input-field" value={gdpGrowth} onChange={e => setGdpGrowth(Number(e.target.value))} />
              </div>
              <div className="input-group">
                <label className="input-label">Discount Rate (%)</label>
                <input type="number" step="0.1" className="input-field" value={discountRate} onChange={e => setDiscountRate(Number(e.target.value))} />
              </div>
              <div className="input-group">
                <label className="input-label">Fuel Cost (₹/L)</label>
                <input type="number" className="input-field" value={fuelCost} onChange={e => setFuelCost(Number(e.target.value))} />
              </div>
              <div className="input-group">
                <label className="input-label">Inflation (%)</label>
                <input type="number" step="0.1" className="input-field" value={inflationRate} onChange={e => setInflationRate(Number(e.target.value))} />
              </div>
              <div className="input-group">
                <label className="input-label">Idle Fuel (L/h)</label>
                <input type="number" step="0.1" className="input-field" value={fuelConsumptionIdle} onChange={e => setFuelConsumptionIdle(Number(e.target.value))} />
              </div>
              <div className="input-group">
                <label className="input-label">Avg VOC (₹/km)</label>
                <input type="number" step="0.1" className="input-field" value={vocPerKm} onChange={e => setVocPerKm(Number(e.target.value))} />
              </div>
              <div className="input-group">
                <label className="input-label">Carbon Cost (₹/kg)</label>
                <input type="number" step="0.1" className="input-field" value={carbonCost} onChange={e => setCarbonCost(Number(e.target.value))} />
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: "24px", display: "flex", flexDirection: "column" }}>
            <h2 style={{ fontSize: "14px", fontWeight: 700, color: T.text, marginBottom: "20px", display:"flex", alignItems:"center", gap:"8px" }}><span>🏗️</span> Infrastructure Costs</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px", flex: 1 }}>
              <div className="input-group">
                <label className="input-label">Grade Separation Build (₹ Cr)</label>
                <input type="number" className="input-field" value={constructionCost} onChange={e => setConstructionCost(Number(e.target.value))} />
              </div>
              <div className="input-group">
                <label className="input-label">Signal Install Cost (₹)</label>
                <input type="number" className="input-field" value={signalInstallCost} onChange={e => setSignalInstallCost(Number(e.target.value))} />
              </div>
              <div className="input-group">
                <label className="input-label">Signal Annual Maint (₹)</label>
                <input type="number" className="input-field" value={signalMaintAnnual} onChange={e => setSignalMaintAnnual(Number(e.target.value))} />
              </div>
            </div>
            
            {error && <div style={{ marginTop: "24px", padding: "16px", background: "rgba(239,68,68,0.1)", border: `1px solid ${T.red}`, borderRadius: "8px", color: T.red, fontSize: "13px", fontWeight: 600 }}>{error}</div>}
            
            <button 
              onClick={analyze} 
              disabled={isAnalyzing}
              style={{ 
                marginTop: "24px", padding: "16px", background: T.green, color: "#000", fontWeight: 800, fontSize: "16px", 
                borderRadius: "12px", border: "none", cursor: isAnalyzing ? "wait" : "pointer", opacity: isAnalyzing ? 0.7 : 1, transition: "transform 0.2s" 
              }}
              onMouseEnter={e => { if(!isAnalyzing) e.currentTarget.style.transform = "scale(1.02)" }}
              onMouseLeave={e => { if(!isAnalyzing) e.currentTarget.style.transform = "scale(1)" }}
            >
              {isAnalyzing ? "COMPUTING..." : "RUN ANALYSIS"}
            </button>
          </div>
        </div>

        {/* Results */}
        {result && (
          <div>
            {/* WEBSTER'S METRICS */}
            <h3 style={{ fontSize: "14px", fontWeight: 800, color: T.textSoft, letterSpacing: "2px", margin: "40px 0 20px 8px" }}>WEBSTER'S SIGNAL METRICS</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px", marginBottom: "40px" }}>
                <div className="glass-card" style={{ padding: "32px 24px" }}>
                    <div style={{ fontSize: "12px", color: T.textMuted, fontWeight: 700, marginBottom: "8px" }}>CYCLE TIME (C₀)</div>
                    <div style={{ fontSize: "36px", fontWeight: 900, color: T.text, fontFamily: T.mono }}>{result.webster.cycle_time.toFixed(0)}<span style={{fontSize: "16px", color: T.textMuted}}>s</span></div>
                </div>
                <div className="glass-card" style={{ padding: "32px 24px" }}>
                    <div style={{ fontSize: "12px", color: T.textMuted, fontWeight: 700, marginBottom: "8px" }}>AVG DELAY / VEHICLE</div>
                    <div style={{ fontSize: "36px", fontWeight: 900, color: T.purple, fontFamily: T.mono }}>{result.webster.avg_delay.toFixed(1)}<span style={{fontSize: "16px", color: T.textMuted}}>s</span></div>
                </div>
                <div className="glass-card" style={{ padding: "32px 24px" }}>
                    <div style={{ fontSize: "12px", color: T.textMuted, fontWeight: 700, marginBottom: "8px" }}>DEGREE OF SATURATION (Y)</div>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                      <div style={{ fontSize: "28px", fontWeight: 900, color: result.webster.sum_flow_ratios > 0.95 ? T.red : T.textSoft, fontFamily: T.mono }}>
                        {result.webster.sum_flow_ratios.toFixed(2)}
                      </div>
                      <div style={{ height: "6px", flex: 1, background: "rgba(0,0,0,0.3)", borderRadius: "3px", overflow: "hidden" }}>
                         <div style={{ height: "100%", background: result.webster.sum_flow_ratios >= 0.95 ? T.red : T.green, width: `${Math.min(100, result.webster.sum_flow_ratios*100)}%` }} />
                      </div>
                    </div>
                    {result.webster.is_saturated && <div style={{ fontSize: "11px", color: T.red, marginTop: "8px", fontWeight: 700 }}>⚠️ Intersection Saturated! Over 0.95.</div>}
                </div>
            </div>

            {/* RECOMMENDATION ENGINE */}
            <div className="glass-card" style={{ padding: "40px", marginBottom: "40px", border: `2px solid ${result.economic.delta_npv > 0 || result.webster.is_saturated ? T.green : T.amber}`, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: result.economic.delta_npv > 0 || result.webster.is_saturated ? "rgba(34,197,94,0.05)" : "rgba(245,158,11,0.05)" }} />
              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: T.textMuted, letterSpacing: "2px", marginBottom: "8px" }}>SYSTEM RECOMMENDATION</div>
                <div style={{ fontSize: "36px", fontWeight: 900, color: T.text, marginBottom: "16px" }}>{result.decision.choice}</div>
                <div style={{ fontSize: "16px", color: T.textSoft, lineHeight: 1.6, maxWidth: "800px" }}>
                  Based on the analysis with a total intersection volume of <strong>{totalVolume}</strong> PCU/hour, a grade separation cost of <strong>₹{constructionCost} Crores</strong>, and a 100-year analysis horizon at a <strong>{discountRate}%</strong> discount rate: The <strong>{result.decision.choice}</strong> is the economically superior choice. 
                  <br/><br/>
                  {result.economic.delta_npv > 0 ? (
                    <>The NPV advantage is <strong>{fmtCr(result.economic.delta_npv)}</strong>. The IRR of the grade separation investment is <strong>{fmtRatio(result.economic.irr)}%</strong>, which is <strong>{result.economic.irr > discountRate ? "above" : "below"}</strong> the {discountRate}% discount rate.</>
                  ) : (
                    <>The Signal is more cost effective by <strong>{fmtCr(Math.abs(result.economic.delta_npv))}</strong>. Incremental IRR is <strong>{fmtRatio(result.economic.irr)}%</strong>.</>
                  )}
                  <br/><br/>
                  The investment payback period is <strong>{result.economic.payback || "never"}</strong> years (Discounted: <strong>{result.economic.discounted_payback || "never"}</strong> years). This recommendation is <strong>{result.decision.status}</strong>.
                </div>
                <div style={{ marginTop: "24px", padding: "12px 20px", background: "rgba(0,0,0,0.3)", borderRadius: "8px", display: "inline-block", fontSize: "13px", fontWeight: 600, color: T.textSoft }}>
                  Reasoning: {result.decision.reason}
                </div>
              </div>
            </div>

            {/* FINANCIAL METRICS */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "24px", marginBottom: "40px" }}>
              <StatCard label="Incremental NPV" value={fmtCr(result.economic.delta_npv)} trend={result.economic.delta_npv > 0 ? 'positive' : 'negative'} subtext="Underpass vs Signal over 100 yr" />
              <StatCard label="Internal Rate of Return" value={`${fmtRatio(result.economic.irr)}%`} trend={result.economic.irr > discountRate ? 'positive' : 'negative'} subtext={`Hurdle Rate: ${discountRate}%`} />
              <StatCard label="Discounted Payback" value={`${result.economic.discounted_payback || '> 100'} yr`} trend={result.economic.discounted_payback < 60 ? 'positive' : 'negative'} subtext="Years to break even" />
              <StatCard label="Benefit-Cost Ratio" value={fmtRatio(result.economic.pi)} trend={result.economic.pi > 1 ? 'positive' : 'negative'} subtext="Present Value Index" />
            </div>

            {/* CHARTS */}
            <h3 style={{ fontSize: "14px", fontWeight: 800, color: T.textSoft, letterSpacing: "2px", margin: "40px 0 20px 8px" }}>CASH FLOW DIAGRAMS & BREAKEVEN</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "40px" }}>
              
              {/* Cash Flows Chart */}
              <div className="glass-card" style={{ padding: "32px", gridColumn: "1 / -1" }}>
                <h3 style={{ margin: "0 0 24px 0", fontSize: "16px", fontWeight: 800, color: T.text, letterSpacing: "1px" }}>Cumulative Cash Flow Diagram</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={result.charts.comps_sampled.map((c, i) => ({ year: c.year, val: result.charts.inc_cumulative[i] }))} margin={{ top: 20, right: 20, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={"rgba(255,255,255,0.05)"} vertical={false} />
                    <XAxis dataKey="year" tick={{fill: T.textMuted, fontSize: 12, fontFamily: T.mono}} axisLine={false} tickLine={false} dy={10} name="Year" />
                    <YAxis tick={{fill: T.textMuted, fontSize: 12, fontFamily: T.mono}} axisLine={false} tickLine={false} width={80} tickFormatter={(v)=>`₹${v}Cr`} />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
                    {result.economic.payback && <ReferenceLine x={result.economic.payback} stroke={T.amber} strokeWidth={2} strokeDasharray="4 4" label={{ position: 'top', value: `Breakeven Yr ${result.economic.payback}`, fill: T.amber, fontSize: 11 }} />}
                    <Line type="monotone" dataKey="val" name="Cumulative Incremental CF" stroke={T.accent} strokeWidth={4} activeDot={{r: 8}} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Annual Loss Comp */}
              <div className="glass-card" style={{ padding: "32px" }}>
                <h3 style={{ margin: "0 0 24px 0", fontSize: "16px", fontWeight: 800, color: T.text, letterSpacing: "1px" }}>Annual Cost Comparison (Signal Losses)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={result.charts.comps_sampled} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={"rgba(255,255,255,0.05)"} vertical={false} />
                    <XAxis dataKey="year" tick={{fill: T.textMuted, fontSize: 12, fontFamily: T.mono}} axisLine={false} tickLine={false} dy={10} />
                    <YAxis tick={{fill: T.textMuted, fontSize: 12, fontFamily: T.mono}} axisLine={false} tickLine={false} tickFormatter={(v)=>`₹${v.toFixed(0)}C`} />
                    <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "20px" }} />
                    <Bar dataKey="tvl" stackId="A" fill={T.chartColors[0]} name="Time Value" />
                    <Bar dataKey="afc" stackId="A" fill={T.chartColors[1]} name="Fuel" />
                    <Bar dataKey="voc" stackId="A" fill={T.chartColors[2]} name="Wear" />
                    <Bar dataKey="carbon" stackId="A" fill={T.chartColors[3]} name="Carbon" />
                    <Bar dataKey="maint_g" fill={T.cyan} name="Grade Sep Maint." />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Breakeven Cost */}
              <div className="glass-card" style={{ padding: "32px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <h3 style={{ margin: "0 0 20px 0", fontSize: "14px", fontWeight: 800, color: T.textMuted, letterSpacing: "1.5px" }}>MAX JUSTIFIABLE CONSTRUCTION COST</h3>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "16px" }}>
                  <span style={{ fontSize: "48px", fontWeight: 900, color: T.cyan, fontFamily: T.mono }}>{fmtCr(result.economic.breakeven_c * 1e7)}</span>
                  <span style={{ fontSize: "14px", color: T.textSoft, fontWeight: 600 }}>Proposed: ₹{constructionCost} Cr</span>
                </div>
                <div style={{ height: "16px", background: "rgba(0,0,0,0.4)", borderRadius: "8px", overflow: "hidden", position: "relative", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.5)" }}>
                  <div style={{ 
                    position: "absolute", top: 0, left: 0, height: "100%", 
                    background: constructionCost < result.economic.breakeven_c ? T.gradGreen : T.gradRed, 
                    width: `${Math.min(100, (constructionCost / result.economic.breakeven_c) * 100)}%`,
                    transition: "width 1s ease"
                  }} />
                  {constructionCost > result.economic.breakeven_c && (
                    <div style={{ position: "absolute", top: 0, left: "100%", width: "2px", height: "100%", background: "#fff", transform: "translateX(-2px)", zIndex: 2 }} />
                  )}
                  {constructionCost <= result.economic.breakeven_c && (
                    <div style={{ position: "absolute", top: 0, left: `${(constructionCost / result.economic.breakeven_c) * 100}%`, width: "2px", height: "100%", background: "#fff", transform: "translateX(-2px)", zIndex: 2 }} />
                  )}
                </div>
                <p style={{ fontSize: "12px", color: T.textMuted, margin: "16px 0 0 0" }}>If actual structural bids exceed this threshold, the signal option is economically superior.</p>
              </div>

            </div>
            
            {/* SENSITIVITY PORTION */}
             <h3 style={{ fontSize: "14px", fontWeight: 800, color: T.textSoft, letterSpacing: "2px", margin: "40px 0 20px 8px" }}>SENSITIVITY & SCENARIO ANALYSIS (ΔNPV ±20%)</h3>

             <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
              <div className="glass-card" style={{ padding: "32px", display: "flex", flexDirection: "column", gap: "16px" }}>
                 <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: 800, color: T.text }}>NPV Sensitivity Tornado</h3>
                 {result.charts.sensitivities.map((s, i) => {
                   const maxSpread = result.charts.sensitivities[0].spread;
                   const pct = (s.spread / maxSpread) * 100;
                   return (
                     <div key={i}>
                       <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: 700, color: T.textMuted, marginBottom: "4px" }}>
                         <span style={{textTransform: "uppercase"}}>{s.variable}</span>
                         <span>SPREAD: {fmtCr(s.spread)}</span>
                       </div>
                       <div style={{ height: "24px", display: "flex", alignItems: "center", position: "relative" }}>
                          <div style={{ width: "2px", height: "100%", background: "rgba(255,255,255,0.2)", position: "absolute", left: "50%", zIndex: 1 }} />
                          <div style={{ flex: 1, height: "12px", display: "flex", justifyContent: "flex-end" }}>
                            {s.low_npv < result.economic.delta_npv && (
                               <div style={{ background: T.red, height: "100%", width: `${Math.min(100, Math.abs(s.low_npv - result.economic.delta_npv) / maxSpread * 100)}%`, borderRadius: "3px 0 0 3px" }} />
                            )}
                            {s.high_npv < result.economic.delta_npv && (
                               <div style={{ background: T.cyan, height: "100%", width: `${Math.min(100, Math.abs(s.high_npv - result.economic.delta_npv) / maxSpread * 100)}%`, borderRadius: "3px 0 0 3px" }} />
                            )}
                          </div>
                          <div style={{ flex: 1, height: "12px", display: "flex" }}>
                            {s.high_npv > result.economic.delta_npv && (
                               <div style={{ background: T.green, height: "100%", width: `${Math.min(100, Math.abs(s.high_npv - result.economic.delta_npv) / maxSpread * 100)}%`, borderRadius: "0 3px 3px 0" }} />
                            )}
                            {s.low_npv > result.economic.delta_npv && (
                               <div style={{ background: T.accent, height: "100%", width: `${Math.min(100, Math.abs(s.low_npv - result.economic.delta_npv) / maxSpread * 100)}%`, borderRadius: "0 3px 3px 0" }} />
                            )}
                          </div>
                       </div>
                     </div>
                   );
                 })}
                 <div style={{ fontSize: "11px", color: T.textMuted, textAlign: "center", marginTop: "8px" }}>Impact of ±20% variation in parameter on Incremental NPV</div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                 {[
                  { name: "Pessimistic", val: result.charts.scenarios.pessimistic, desc: "Low growth, high cost" },
                  { name: "Base Case", val: result.charts.scenarios.base, desc: "Expected current trajectory", active: true },
                  { name: "Optimistic", val: result.charts.scenarios.optimistic, desc: "High growth, low cost" }
                 ].map((sc, i) => (
                   <div key={i} className="glass-card" style={{ flex: 1, padding: "24px", border: sc.active ? `1px solid ${T.accent}` : undefined, background: sc.active ? "rgba(99,102,241,0.1)" : undefined }}>
                     <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: "12px", fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>{sc.name} SCENARIO</div>
                          <div style={{ fontSize: "11px", color: T.textSoft }}>{sc.desc}</div>
                        </div>
                        <div style={{ fontSize: "28px", fontWeight: 800, color: sc.val > 0 ? T.green : T.red, fontFamily: T.mono }}>{fmtCr(sc.val)}</div>
                     </div>
                   </div>
                 ))}
              </div>
             </div>

          </div>
        )}
      </div>
    </>
  );
}
