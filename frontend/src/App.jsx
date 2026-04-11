import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  RadialBarChart,
  RadialBar,
  Legend,
  ReferenceLine,
  LineChart,
  Line,
  ComposedChart,
  Scatter
} from "recharts";

// ═══════════════════════════════════════════
// API Service
// ═══════════════════════════════════════════

const API_BASE_URL = "http://localhost:8000";

async function analyzeTraffic(formData) {
  const response = await fetch(`${API_BASE_URL}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });
  if (!response.ok) throw new Error("Analysis failed");
  return response.json();
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