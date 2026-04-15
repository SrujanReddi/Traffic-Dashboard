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
// ═══════════════════════════════════════════
// Field Configuration
// ═══════════════════════════════════════════

const fieldConfig = {
  volume: { label: "Traffic Volume", unit: "veh/hr", icon: "🚗", min: 100, max: 10000, step: 100 },
  speed: { label: "Avg Speed", unit: "km/h", icon: "⚡", min: 5, max: 120, step: 5 },
  wait_time: { label: "Wait Time", unit: "min", icon: "⏱️", min: 1, max: 30, step: 1 },
  fuel_cost: { label: "Fuel Cost", unit: "₹/L", icon: "⛽", min: 50, max: 200, step: 5 },
  population: { label: "Population", unit: "", icon: "👥", min: 50000, max: 5000000, step: 50000 },
  gdp: { label: "GDP", unit: "₹ Cr", icon: "💰", min: 10000, max: 1000000, step: 10000 },
  location_type: { label: "Location Type", type: "select", icon: "📍", options: ["Congested", "Stable Flow", "Smooth"] },
  construction_cost: { label: "Construction Cost", unit: "Cr", icon: "🏗️", min: 1, max: 500, step: 5 },
};

// ═══════════════════════════════════════════
// Stat Card Component
// ═══════════════════════════════════════════

function StatCard({ label, value, icon, trend = "neutral", delay = 0, subtext = null }) {
  const trendColors = {
    positive: { color: "#22c55e", boxShadow: "0 0 20px -4px rgba(34,197,94,0.3)" },
    negative: { color: "#e84057", boxShadow: "0 0 20px -4px rgba(232,64,87,0.3)" },
    neutral: { color: "#e0e4eb" },
  };

  return (
    <div
      style={{
        background: "rgba(22, 27, 40, 0.85)",
        backdropFilter: "blur(40px) saturate(1.6)",
        border: "1px solid rgba(40, 48, 70, 0.5)",
        borderRadius: "16px",
        padding: "20px",
        transition: "transform 0.3s ease, box-shadow 0.3s ease",
        animation: `fadeIn 0.5s ease-out ${delay}ms forwards`,
        opacity: 0,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.02)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
        <span style={{ color: "#6b7280", fontSize: "11px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
        <span style={{ opacity: 0.5 }}>{icon}</span>
      </div>
      <p style={{ fontSize: "1.75rem", fontWeight: 700, letterSpacing: "-0.02em", ...trendColors[trend] }}>{value}</p>
      {subtext && <p style={{ fontSize: "11px", color: "#6b7280", marginTop: "8px" }}>{subtext}</p>}
    </div>
  );
}

// ═══════════════════════════════════════════
// Input Panel Component
// ═══════════════════════════════════════════

function InputPanel({ form, onChange }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "16px" }}>
      {Object.keys(form).map((key, i) => {
        const config = fieldConfig[key];
        
        if (config.type === "select") {
          return (
            <div
              key={key}
              style={{
                background: "rgba(22, 27, 40, 0.6)",
                backdropFilter: "blur(24px) saturate(1.4)",
                border: "1px solid rgba(40, 48, 70, 0.4)",
                borderRadius: "12px",
                padding: "16px",
                transition: "border-color 0.3s",
                animation: `fadeIn 0.5s ease-out ${i * 80}ms forwards`,
                opacity: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <span style={{ fontSize: "18px" }}>{config.icon}</span>
                <label style={{ fontSize: "11px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280" }}>{config.label}</label>
              </div>
              <select
                value={form[key]}
                onChange={(e) => onChange({ ...form, [key]: e.target.value })}
                style={{
                  width: "100%",
                  background: "rgba(0,0,0,0.2)",
                  fontSize: "1rem",
                  fontWeight: 500,
                  color: "#e0e4eb",
                  border: "1px solid rgba(40, 48, 70, 0.5)",
                  borderRadius: "8px",
                  padding: "10px",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                {config.options.map(opt => (
                  <option key={opt} value={opt} style={{ background: "#1a1f2e", color: "#e0e4eb" }}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          );
        }
        
        return (
          <div
            key={key}
            style={{
              background: "rgba(22, 27, 40, 0.6)",
              backdropFilter: "blur(24px) saturate(1.4)",
              border: "1px solid rgba(40, 48, 70, 0.4)",
              borderRadius: "12px",
              padding: "16px",
              transition: "border-color 0.3s",
              animation: `fadeIn 0.5s ease-out ${i * 80}ms forwards`,
              opacity: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <span style={{ fontSize: "18px" }}>{config.icon}</span>
              <label style={{ fontSize: "11px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280" }}>{config.label}</label>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "12px" }}>
              <input
                type="number"
                value={form[key]}
                onChange={(e) => onChange({ ...form, [key]: Number(e.target.value) })}
                style={{
                  width: "100%",
                  background: "transparent",
                  fontSize: "1.25rem",
                  fontWeight: 600,
                  color: "#e0e4eb",
                  border: "none",
                  outline: "none",
                }}
              />
              {config.unit && <span style={{ fontSize: "11px", color: "#6b7280", whiteSpace: "nowrap" }}>{config.unit}</span>}
            </div>
            <input
              type="range"
              min={config.min}
              max={config.max}
              step={config.step}
              value={form[key]}
              onChange={(e) => onChange({ ...form, [key]: Number(e.target.value) })}
              style={{ width: "100%", accentColor: "#22c55e", cursor: "pointer" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
              <span style={{ fontSize: "10px", color: "rgba(107,114,128,0.5)" }}>{config.min.toLocaleString()}</span>
              <span style={{ fontSize: "10px", color: "rgba(107,114,128,0.5)" }}>{config.max.toLocaleString()}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════
// Custom Tooltip
// ═══════════════════════════════════════════

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "rgba(22, 27, 40, 0.95)", backdropFilter: "blur(40px)", border: "1px solid rgba(40, 48, 70, 0.5)", borderRadius: "12px", padding: "12px 16px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)" }}>
      <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px", fontWeight: 500 }}>Year {label}</p>
      {payload.map((entry, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: entry.color }} />
          <span style={{ color: "#6b7280" }}>{entry.name}:</span>
          <span style={{ fontWeight: 600, color: "#e0e4eb", fontFamily: "monospace" }}>₹{Number(entry.value).toLocaleString("en-IN")}</span>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════
// Chart Panel Component (Updated with new analyses)
// ═══════════════════════════════════════════

const chartTabs = [
  { id: "cashflow", label: "100-Yr Cash Flow", icon: "📈" },
  { id: "breakeven", label: "Breakeven Analysis", icon: "⚖️" },
  { id: "irr", label: "IRR Comparison", icon: "📊" },
  { id: "payback", label: "Payback Period", icon: "⏱️" },
];

function ChartPanel({ result }) {
  const [activeTab, setActiveTab] = useState("cashflow");

  // Prepare data for cashflow chart (100 years, sampled every 5 years)
  const cashflowData = result.chart_data.years.map((year, idx) => ({
    year: year,
    Underpass: Math.round(result.chart_data.underpass_cumulative[idx] / 10000000), // In Crores
    Signal: Math.round(result.chart_data.signal_cumulative[idx] / 10000000),
  }));

  // Prepare breakeven data
  const breakevenData = result.breakeven.cumulative_difference.map((diff, idx) => ({
    year: idx,
    Difference: Math.round(diff / 10000000), // In Crores
  }));

  // Prepare IRR comparison data
  const irrData = [
    { name: "Signal", IRR: result.summary.signal_irr || 0, fill: "#e84057" },
    { name: "Underpass", IRR: result.summary.underpass_irr || 0, fill: "#22c55e" },
  ];

  // Prepare payback period data
  const paybackData = [
    {
      name: "Signal",
      Discounted: result.payback.signal.discounted_payback_years || 0,
      Undiscounted: result.payback.signal.undiscounted_payback_years || 0,
    },
    {
      name: "Underpass",
      Discounted: result.payback.underpass.discounted_payback_years || 0,
      Undiscounted: result.payback.underpass.undiscounted_payback_years || 0,
    },
  ];

  return (
    <div style={{
      background: "rgba(22, 27, 40, 0.85)",
      backdropFilter: "blur(40px) saturate(1.6)",
      border: "1px solid rgba(40, 48, 70, 0.5)",
      borderRadius: "16px",
      overflow: "hidden",
      animation: "slideUp 0.6s ease-out 300ms forwards",
      opacity: 0,
    }}>
      {/* Tab Bar */}
      <div style={{ display: "flex", borderBottom: "1px solid rgba(40, 48, 70, 0.5)", padding: "0 8px", overflowX: "auto" }}>
        {chartTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "12px 16px",
              fontSize: "14px",
              fontWeight: 500,
              background: "transparent",
              border: "none",
              borderBottom: `2px solid ${activeTab === tab.id ? "#22c55e" : "transparent"}`,
              color: activeTab === tab.id ? "#22c55e" : "#6b7280",
              cursor: "pointer",
              transition: "all 0.2s",
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ marginRight: "6px" }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ padding: "20px" }}>
        {activeTab === "cashflow" && (
          <>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={cashflowData}>
                <defs>
                  <linearGradient id="gradientUnderpass" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradientSignal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e84057" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#e84057" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(40, 48, 70, 0.3)" />
                <XAxis dataKey="year" stroke="#4b5563" tick={{ fontSize: 11, fill: "#6b7280" }} />
                <YAxis stroke="#4b5563" tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={(v) => `₹${v}Cr`} />
                <ReferenceLine y={0} stroke="rgba(107,114,128,0.4)" strokeDasharray="4 4" />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="Underpass" stroke="#22c55e" strokeWidth={2.5} fill="url(#gradientUnderpass)" dot={false} activeDot={{ r: 5 }} />
                <Area type="monotone" dataKey="Signal" stroke="#e84057" strokeWidth={2.5} fill="url(#gradientSignal)" dot={false} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
            <div style={{ textAlign: "center", marginTop: "12px", fontSize: "12px", color: "#6b7280" }}>
              📊 100-Year Cumulative Cash Flow (₹ in Crores)
            </div>
          </>
        )}

        {activeTab === "breakeven" && (
          <>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={breakevenData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(40, 48, 70, 0.3)" />
                <XAxis dataKey="year" stroke="#4b5563" tick={{ fontSize: 11, fill: "#6b7280" }} />
                <YAxis stroke="#4b5563" tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={(v) => `₹${v}Cr`} />
                <ReferenceLine y={0} stroke="#22c55e" strokeWidth={2} strokeDasharray="5 5" label={{ value: "Breakeven Line", fill: "#22c55e", fontSize: 11 }} />
                <ReferenceLine x={result.breakeven.breakeven_year} stroke="#e84057" strokeWidth={2} strokeDasharray="5 5" label={{ value: `Breakeven: Year ${result.breakeven.breakeven_year}`, fill: "#e84057", fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="Difference" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#gradientUnderpass)" activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
            <div style={{ textAlign: "center", marginTop: "12px", fontSize: "12px", color: "#6b7280" }}>
              ⚖️ Cumulative Difference (Underpass - Signal) | Breakeven at Year {result.breakeven.breakeven_year || "N/A"}
            </div>
          </>
        )}

        {activeTab === "irr" && (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "24px" }}>
            <div style={{ flex: 1, minWidth: "280px" }}>
              <ResponsiveContainer width="100%" height={350}>
                <RadialBarChart cx="50%" cy="50%" innerRadius="30%" outerRadius="90%" data={irrData} startAngle={180} endAngle={0}>
                  <RadialBar dataKey="IRR" cornerRadius={10} background={{ fill: "rgba(40, 48, 70, 0.5)" }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: "#6b7280" }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div style={{ background: "rgba(22, 27, 40, 0.95)", backdropFilter: "blur(40px)", border: "1px solid rgba(40, 48, 70, 0.5)", borderRadius: "12px", padding: "12px 16px" }}>
                          <p style={{ fontSize: "14px", fontWeight: 600, color: d.fill }}>{d.name} IRR</p>
                          <p style={{ fontSize: "16px", fontWeight: 700, color: d.fill }}>{d.IRR.toFixed(2)}%</p>
                        </div>
                      );
                    }}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: 1, minWidth: "200px" }}>
              <div style={{ background: "rgba(22, 27, 40, 0.6)", border: "1px solid rgba(40, 48, 70, 0.4)", borderRadius: "12px", padding: "16px", marginBottom: "12px" }}>
                <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px" }}>💰 Profitability Index</p>
                <p style={{ fontSize: "24px", fontWeight: 700, color: "#22c55e" }}>{result.summary.underpass_pi?.toFixed(2) || "N/A"}</p>
                <p style={{ fontSize: "11px", color: "#6b7280" }}>Underpass (PI {'>'} 1 is good)</p>
              </div>
              <div style={{ background: "rgba(22, 27, 40, 0.6)", border: "1px solid rgba(40, 48, 70, 0.4)", borderRadius: "12px", padding: "16px" }}>
                <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px" }}>📈 Hurdle Rate (Discount Rate)</p>
                <p style={{ fontSize: "24px", fontWeight: 700, color: "#e0e4eb" }}>8%</p>
                <p style={{ fontSize: "11px", color: "#6b7280" }}>Minimum acceptable return</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "payback" && (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={paybackData} barGap={16}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(40, 48, 70, 0.3)" />
              <XAxis dataKey="name" stroke="#4b5563" tick={{ fontSize: 11, fill: "#6b7280" }} />
              <YAxis stroke="#4b5563" tick={{ fontSize: 11, fill: "#6b7280" }} label={{ value: "Years", angle: -90, position: "insideLeft", fill: "#6b7280" }} />
              <ReferenceLine y={0} stroke="rgba(107,114,128,0.4)" strokeDasharray="4 4" />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="Discounted" fill="#22c55e" radius={[6, 6, 0, 0]} name="Discounted Payback" />
              <Bar dataKey="Undiscounted" fill="#e84057" radius={[6, 6, 0, 0]} name="Simple Payback" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {activeTab !== "breakdown" && (
        <div style={{ display: "flex", justifyContent: "center", gap: "24px", paddingBottom: "16px", fontSize: "12px", color: "#6b7280" }}>
          {activeTab === "irr" && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
              Higher IRR indicates better returns
            </div>
          )}
          {activeTab === "payback" && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "12px", height: "12px", borderRadius: "2px", background: "#22c55e", display: "inline-block" }} />
              Lower payback period is better
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// Main App Component
// ═══════════════════════════════════════════

function App() {
  const [form, setForm] = useState({
    volume: 1500,
    speed: 40,
    wait_time: 10,
    fuel_cost: 100,
    population: 500000,
    gdp: 200000,
    location_type: "Stable Flow",
    construction_cost: 15,
  });

  const [result, setResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  const analyze = async () => {
    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    
    try {
      const data = await analyzeTraffic(form);
      setResult(data);
    } catch (err) {
      setError(err.message);
      console.error("Analysis failed:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatCurrency = (n) => "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
  const formatCrores = (n) => "₹" + (n / 10000000).toFixed(2) + " Cr";
  
  const savings = result ? Math.abs(result.summary.underpass_npv - result.summary.signal_npv) : 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0f1320; color: #e0e4eb; font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulseSlow { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      <div style={{ minHeight: "100vh", position: "relative", overflow: "hidden" }}>
        {/* Ambient glow */}
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none" }}>
          <div style={{ position: "absolute", top: "-20%", left: "-10%", width: "500px", height: "500px", borderRadius: "50%", background: "rgba(34,197,94,0.05)", filter: "blur(120px)", animation: "pulseSlow 4s ease-in-out infinite" }} />
          <div style={{ position: "absolute", bottom: "-20%", right: "-10%", width: "400px", height: "400px", borderRadius: "50%", background: "rgba(232,64,87,0.05)", filter: "blur(120px)", animation: "pulseSlow 4s ease-in-out infinite 2s" }} />
        </div>

        <div style={{ position: "relative", zIndex: 10, maxWidth: "1280px", margin: "0 auto", padding: "48px 24px" }}>
          {/* Header */}
          <header style={{ marginBottom: "40px", animation: "fadeIn 0.5s ease-out forwards" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "rgba(34,197,94,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>🚦</div>
              <div>
                <h1 style={{ fontSize: "1.875rem", fontWeight: 700, letterSpacing: "-0.02em", background: "linear-gradient(135deg, #22c55e, #2dd4bf)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Traffic Economics Pro</h1>
                <p style={{ fontSize: "11px", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.1em" }}>100-Year NPV • IRR • Breakeven Analysis</p>
              </div>
            </div>
          </header>

          {/* Inputs */}
          <section style={{ marginBottom: "32px" }}>
            <h2 style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "#6b7280", marginBottom: "16px", animation: "fadeIn 0.5s ease-out forwards" }}>Parameters</h2>
            <InputPanel form={form} onChange={setForm} />

            <div style={{ marginTop: "24px", display: "flex", alignItems: "center", gap: "16px", animation: "fadeIn 0.5s ease-out 500ms forwards", opacity: 0 }}>
              <button
                onClick={analyze}
                disabled={isAnalyzing}
                style={{
                  padding: "12px 32px",
                  borderRadius: "12px",
                  fontWeight: 600,
                  fontSize: "14px",
                  background: "#22c55e",
                  color: "#0f1320",
                  border: "none",
                  cursor: isAnalyzing ? "not-allowed" : "pointer",
                  opacity: isAnalyzing ? 0.5 : 1,
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => { if (!isAnalyzing) { e.currentTarget.style.boxShadow = "0 10px 40px -8px rgba(34,197,94,0.4)"; e.currentTarget.style.transform = "scale(1.02)"; } }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "scale(1)"; }}
              >
                {isAnalyzing ? (
                  <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <svg style={{ animation: "spin 1s linear infinite", width: "16px", height: "16px" }} viewBox="0 0 24 24">
                      <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Analyzing 100 Years...
                  </span>
                ) : "Run Advanced Analysis"}
              </button>
              <span style={{ fontSize: "12px", color: "rgba(107,114,128,0.6)" }}>100-year projection • 8% discount rate • IRR & Breakeven</span>
            </div>
            
            {error && (
              <div style={{ marginTop: "16px", padding: "12px", background: "rgba(232,64,87,0.1)", border: "1px solid #e84057", borderRadius: "8px", color: "#e84057", fontSize: "14px" }}>
                ⚠️ Error: {error}. Make sure the backend server is running on port 8000.
              </div>
            )}
          </section>

          {/* Results */}
          {result && (
            <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "16px" }}>
                <StatCard 
                  label="Signal NPV" 
                  value={formatCrores(result.summary.signal_npv)} 
                  icon={<span style={{ fontSize: "18px" }}>🚦</span>} 
                  trend="negative" 
                  delay={0}
                  subtext={`IRR: ${result.summary.signal_irr?.toFixed(2) || 'N/A'}%`}
                />
                <StatCard 
                  label="Underpass NPV" 
                  value={formatCrores(result.summary.underpass_npv)} 
                  icon={<span style={{ fontSize: "18px" }}>🏗️</span>} 
                  trend={result.summary.underpass_npv > result.summary.signal_npv ? "positive" : "negative"} 
                  delay={100}
                  subtext={`IRR: ${result.summary.underpass_irr?.toFixed(2) || 'N/A'}%`}
                />
                <StatCard 
                  label="NPV Differential" 
                  value={formatCrores(savings)} 
                  icon={<span style={{ fontSize: "18px" }}>💎</span>} 
                  trend="neutral" 
                  delay={200}
                  subtext="Additional value by choosing better option"
                />
                <div style={{
                  background: "rgba(22, 27, 40, 0.85)",
                  backdropFilter: "blur(40px) saturate(1.6)",
                  border: "1px solid rgba(40, 48, 70, 0.5)",
                  borderRadius: "16px",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  boxShadow: "0 0 20px -4px rgba(34,197,94,0.3)",
                  animation: "fadeIn 0.5s ease-out 300ms forwards",
                  opacity: 0,
                }}>
                  <span style={{ fontSize: "11px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280", marginBottom: "4px" }}>Recommendation</span>
                  <span style={{ fontSize: "1.25rem", fontWeight: 700, color: "#22c55e", marginBottom: "8px" }}>{result.summary.decision}</span>
                  <span style={{ fontSize: "11px", color: "#6b7280" }}>{result.summary.recommendation_reason}</span>
                  {result.breakeven.breakeven_year && (
                    <span style={{ fontSize: "11px", color: "#22c55e", marginTop: "8px" }}>
                      📍 Breakeven at Year {result.breakeven.breakeven_year}
                    </span>
                  )}
                </div>
              </div>
              <ChartPanel result={result} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default App;
