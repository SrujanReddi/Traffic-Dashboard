from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, HTTPException
from typing import Dict, List, Any, Optional
import math
import numpy as np
app = FastAPI(title="Traffic Signal vs. Grade Separation Decision Support System", version="4.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# --- Webster's Calculations (Part 3) ---
def calculate_webster_design(phases: List[Dict], num_phases: int):
    L_per_phase = 4.0
    total_L = num_phases * L_per_phase
    
    sum_y = 0
    phase_stats = []
    
    for i, p in enumerate(phases):
        s_i = 1800 * p["lanes"]
        y_i = p["critical_volume"] / s_i
        sum_y += y_i
        phase_stats.append({
            "phase_id": i + 1,
            "s_i": s_i,
            "y_i": y_i,
            "q_i": p["critical_volume"]
        })
    
    is_saturated = sum_y >= 0.95
    c_o = (1.5 * total_L + 5) / (1 - sum_y) if sum_y < 1.0 else 120
    c_o = max(40, min(120, c_o))
    
    g_total = c_o - total_L
    total_avg_delay = 0
    sum_qi = sum(p["critical_volume"] for p in phases)
    
    for ps in phase_stats:
        g_i = (ps["y_i"] / max(0.01, sum_y)) * g_total
        ps["g_i"] = g_i
        lambda_i = g_i / c_o
        x_i = ps["q_i"] / (ps["s_i"] * max(0.01, lambda_i))
        ps["x_i"] = x_i
        
        term1_num = c_o * (1 - lambda_i)**2
        term1_den = 2 * (1 - min(0.99, lambda_i * x_i))
        d_uniform = term1_num / term1_den
        
        qi_sec = ps["q_i"] / 3600
        term2_num = x_i**2
        term2_den = 2 * qi_sec * (1 - min(0.99, x_i))
        d_overflow = term2_num / term2_den
        
        d_i = d_uniform + d_overflow
        ps["delay_i"] = d_i
        total_avg_delay += (d_i * ps["q_i"])
    
    d_avg = total_avg_delay / max(1, sum_qi)
    
    return {
        "cycle_time": c_o,
        "total_lost_time": total_L,
        "sum_flow_ratios": sum_y,
        "avg_delay": d_avg,
        "phase_details": phase_stats,
        "is_saturated": is_saturated
    }
# --- Economic Modeling (Part 4, 6, 7, 8) ---
def run_economic_analysis(
    v_base: float,
    d_avg: float,
    params: Dict,
    webster_results: Dict
):
    years = 30
    r_d = params["discount_rate"] / 100
    r_g = params["traffic_growth"] / 100
    r_inf = params["inflation_rate"] / 100
    r_gdp = params["gdp_growth"] / 100
    
    gdppc_0 = (params["gdp_crores"] * 1e7) / params["population"]
    gdppc_sec_0 = gdppc_0 / (365 * 24 * 3600)
    
    op_hours = 16
    
    f_0 = params["fuel_cost"]
    fc = params["fuel_consumption_idle"]
    voc = params["voc_per_km"]
    carbon_price = params["carbon_cost_kg"]
    
    m_s_0 = params["signal_maint_annual"]
    m_g_0 = params["grade_sep_maint_annual"]
    
    signal_cashflows = []
    grade_sep_cashflows = []
    differential_cashflows = []
    
    # Components tracking
    comps = {
        "tvl": [], "afc": [], "voc": [], "carbon": [], "acc": [], "maint_s": [], "maint_g": [], "benefit": [], "replacement": []
    }
    
    sig_cap_0 = -params["signal_install_cost"]
    gs_cap_0 = -(params["grade_sep_construction_cost_crores"] * 1e7)
    
    signal_cashflows.append(sig_cap_0)
    grade_sep_cashflows.append(gs_cap_0)
    differential_cashflows.append(gs_cap_0 - sig_cap_0)
    
    total_s = sum(ps["s_i"] for ps in webster_results["phase_details"])
    signal_capacity = total_s * 0.9
    
    for t in range(1, years + 1):
        v_h_t = v_base * (1 + r_g)**t
        v_h_t_capped = min(v_h_t, signal_capacity)
        v_year_t = v_h_t_capped * op_hours * 365
        
        gdppc_sec_t = gdppc_sec_0 * (1 + r_gdp)**t
        f_t = f_0 * (1 + r_inf)**t
        
        tvl_t = v_year_t * d_avg * params["occupancy"] * gdppc_sec_t
        fuel_per_stop = (fc / 3600) * d_avg * 0.85
        afc_t = v_year_t * fuel_per_stop * f_t
        voc_t = v_year_t * 0.1 * voc * (1 + r_inf)**t
        carbon_t = v_year_t * fuel_per_stop * 2.31 * carbon_price * (1 + r_inf)**t
        
        acc_rate = 0.4 / 1e6
        cost_per_acc = 1000000 * (1 + r_inf)**t
        acc_cost_t = v_year_t * acc_rate * cost_per_acc
        
        m_s_t = m_s_0 * (1 + r_inf)**t
        replacement_s = params["signal_install_cost"] if t % 15 == 0 else 0
        
        total_signal_loss_t = tvl_t + afc_t + voc_t + carbon_t + acc_cost_t + m_s_t + replacement_s
        
        m_g_t = m_g_0 * (1 + r_inf)**t
        major_m_g = (params["grade_sep_construction_cost_crores"] * 1e7 * 0.06) if t % 25 == 0 else 0
        total_m_g_t = m_g_t + major_m_g
        
        benefit_t = total_signal_loss_t
        
        signal_cashflows.append(-total_signal_loss_t)
        gs_net_t = benefit_t - total_m_g_t
        grade_sep_cashflows.append(gs_net_t)
        
        inc_cf_t = total_signal_loss_t - total_m_g_t
        differential_cashflows.append(inc_cf_t)
        
        comps["tvl"].append(-tvl_t)
        comps["afc"].append(-afc_t)
        comps["voc"].append(-voc_t)
        comps["carbon"].append(-carbon_t)
        comps["acc"].append(-acc_cost_t)
        comps["maint_s"].append(-m_s_t)
        comps["replacement"].append(-replacement_s)
        comps["maint_g"].append(-total_m_g_t)
        comps["benefit"].append(benefit_t)
    def get_npv(cfs, rate):
        return sum(cf / (1 + rate)**i for i, cf in enumerate(cfs))
    
    npv_s = get_npv(signal_cashflows, r_d)
    npv_g = get_npv(grade_sep_cashflows, r_d)
    delta_npv = npv_g - npv_s
    
    cumulative_inc = 0
    payback_years = None
    discounted_payback_years = None
    cumulative_discounted_inc = 0
    
    for i, cf in enumerate(differential_cashflows):
        cumulative_inc += cf
        cumulative_discounted_inc += cf / (1 + r_d)**i
        if payback_years is None and cumulative_inc >= 0 and i > 0:
            payback_years = i
        if discounted_payback_years is None and cumulative_discounted_inc >= 0 and i > 0:
            discounted_payback_years = i
    def calculate_irr(cashflows, iterations=100):
        rate = 0.1
        for _ in range(iterations):
            npv = sum(cf / (1 + rate)**i for i, cf in enumerate(cashflows))
            d_npv = sum(-i * cf / (1 + rate)**(i + 1) for i, cf in enumerate(cashflows))
            if abs(d_npv) < 1e-6: break
            new_rate = rate - npv / d_npv
            if abs(new_rate - rate) < 1e-6:
                return new_rate
            rate = new_rate
        return None
    irr = calculate_irr(differential_cashflows)
    pv_savings = sum(np.array(differential_cashflows[1:]) / (1 + r_d)**np.arange(1, 31))
    pi = pv_savings / abs(gs_cap_0) if gs_cap_0 != 0 else 0
    return {
        "npv_s": npv_s,
        "delta_npv": delta_npv,
        "irr": irr * 100 if irr is not None else None,
        "payback_years": payback_years,
        "discounted_payback_years": discounted_payback_years,
        "pi": pi,
        "cashflows_inc": differential_cashflows,
        "cashflows_s": signal_cashflows,
        "cashflows_g": grade_sep_cashflows,
        "comps": comps
    }
@app.post("/analyze")
def analyze(data: dict):
    try:
        num_phases = int(data.get("num_phases", 4))
        phases = data.get("phases", [])
        total_volume = float(data.get("total_volume", 5000))
        occupancy = float(data.get("occupancy", 1.8))
        
        gdp_crores = float(data.get("gdp", 200000))
        population = float(data.get("population", 5e6))
        fuel_cost = float(data.get("fuel_cost", 100))
        inflation_rate = float(data.get("inflation_rate", 6.0))
        discount_rate = float(data.get("discount_rate", 10.0))
        traffic_growth = float(data.get("traffic_growth", 5.0))
        gdp_growth = float(data.get("gdp_growth", 6.0))
        
        signal_install_cost = float(data.get("signal_install_cost", 500000))
        grade_sep_construction_cost_crores = float(data.get("construction_cost", 50.0))
        signal_maint_annual = float(data.get("signal_maint_annual", 200000))
        grade_sep_maint_annual = float(data.get("grade_sep_maint_annual", grade_sep_construction_cost_crores * 1e7 * 0.005))
        
        fuel_consumption_idle = float(data.get("fuel_consumption_idle", 0.7))
        voc_per_km = float(data.get("voc_per_km", 3.0))
        carbon_cost_kg = float(data.get("carbon_cost", 1.5))
        
        if len(phases) != num_phases:
            raise HTTPException(status_code=400, detail="Phase count mismatch")
        webster = calculate_webster_design(phases, num_phases)
        
        params = {
            "gdp_crores": gdp_crores, "population": population, "fuel_cost": fuel_cost,
            "inflation_rate": inflation_rate, "discount_rate": discount_rate,
            "traffic_growth": traffic_growth, "gdp_growth": gdp_growth, "occupancy": occupancy,
            "signal_install_cost": signal_install_cost, "grade_sep_construction_cost_crores": grade_sep_construction_cost_crores,
            "signal_maint_annual": signal_maint_annual, "grade_sep_maint_annual": grade_sep_maint_annual,
            "fuel_consumption_idle": fuel_consumption_idle, "voc_per_km": voc_per_km, "carbon_cost_kg": carbon_cost_kg
        }
        
        economic = run_economic_analysis(total_volume, webster["avg_delay"], params, webster)
        
        # Scenario Analysis
        pessimistic_params = params.copy()
        pessimistic_params["traffic_growth"] = max(0, traffic_growth - 2)
        pessimistic_params["gdp_growth"] = max(0, gdp_growth - 2)
        pessimistic_params["discount_rate"] = discount_rate + 2
        pessimistic_params["grade_sep_construction_cost_crores"] = grade_sep_construction_cost_crores * 1.2
        res_pes = run_economic_analysis(total_volume, webster["avg_delay"], pessimistic_params, webster)
        
        optimistic_params = params.copy()
        optimistic_params["traffic_growth"] = traffic_growth + 2
        optimistic_params["gdp_growth"] = gdp_growth + 2
        optimistic_params["discount_rate"] = max(1, discount_rate - 2)
        optimistic_params["grade_sep_construction_cost_crores"] = grade_sep_construction_cost_crores * 0.8
        res_opt = run_economic_analysis(total_volume, webster["avg_delay"], optimistic_params, webster)
        
        scenarios = {
            "pessimistic": res_pes["delta_npv"],
            "base": economic["delta_npv"],
            "optimistic": res_opt["delta_npv"],
        }
        
        # Sensitivity Analysis (Tornado)
        sensitivities = []
        vars_to_test = [
            ("Volume", "total_volume", total_volume),
            ("GDP Growth", "gdp_growth", gdp_growth),
            ("Discount Rate", "discount_rate", discount_rate),
            ("Fuel Cost", "fuel_cost", fuel_cost),
            ("Const. Cost", "grade_sep_construction_cost_crores", grade_sep_construction_cost_crores),
            ("Traffic Growth", "traffic_growth", traffic_growth)
        ]
        
        for ui_name, var_name, var_val in vars_to_test:
            new_params_low = params.copy()
            new_v_low = total_volume
            if var_name == "total_volume": new_v_low *= 0.8
            else: new_params_low[var_name] *= 0.8
            res_low = run_economic_analysis(new_v_low, webster["avg_delay"], new_params_low, webster)
            
            new_params_high = params.copy()
            new_v_high = total_volume
            if var_name == "total_volume": new_v_high *= 1.2
            else: new_params_high[var_name] *= 1.2
            res_high = run_economic_analysis(new_v_high, webster["avg_delay"], new_params_high, webster)
            
            sensitivities.append({
                "variable": ui_name,
                "low_npv": res_low["delta_npv"],
                "high_npv": res_high["delta_npv"],
                "spread": abs(res_high["delta_npv"] - res_low["delta_npv"])
            })
            
        sensitivities = sorted(sensitivities, key=lambda x: x["spread"], reverse=True)
        # Breakeven Construction Cost
        low_c = 1.0
        high_c = 1000.0
        for _ in range(30):
            mid_c = (low_c + high_c) / 2
            test_params = params.copy()
            test_params["grade_sep_construction_cost_crores"] = mid_c
            test_res = run_economic_analysis(total_volume, webster["avg_delay"], test_params, webster)
            if test_res["delta_npv"] > 0:
                low_c = mid_c
            else:
                high_c = mid_c
        breakeven_c = (low_c + high_c) / 2
        # Recommendation Engine
        decision = "🚦 Traffic Signal"
        reason = "NPV of Grade Separation is negative. The signal is more cost-effective for current and projected traffic."
        if webster["is_saturated"]:
            decision = "🏗️ Grade Separation"
            reason = "Intersection is beyond capacity (Y ≥ 0.95). Signal cannot handle flow regardless of economics."
        elif economic["delta_npv"] > 0:
            decision = "🏗️ Grade Separation"
            reason = "Positive Incremental NPV implies total societal benefits over 30 years exceed construction and maintenance costs."
        
        status = "Conditionally Recommended"
        if webster["is_saturated"]:
            status = "Mandatory"
        elif economic["delta_npv"] > 0 and scenarios["pessimistic"] > 0:
            status = "Robustly Recommended"
        elif economic["delta_npv"] < 0 and scenarios["optimistic"] < 0:
            status = "Strongly Disrecommended"
        # Payback statement addition per rules
        if economic["discounted_payback_years"] is not None and economic["discounted_payback_years"] > 20:
             status = "Financially Marginal (>20yr payback)"
             if webster["is_saturated"]:
                 status = "Mandatory (Financially Marginal)"
        # Chart Sampling
        chart_years = list(range(0, 31, 1))
        comps = economic["comps"]
        chart_data = {
            "years": chart_years,
            "inc_cumulative": [sum(economic["cashflows_inc"][:max(1, y+1)])/1e7 for y in chart_years],
            "cf_s": [economic["cashflows_s"][y]/1e7 if y < len(economic["cashflows_s"]) else 0 for y in chart_years],
            "cf_g": [economic["cashflows_g"][y]/1e7 if y < len(economic["cashflows_g"]) else 0 for y in chart_years],
            "comps_sampled": [
                {
                    "year": y,
                    "tvl": comps["tvl"][max(0, y-1)]/1e7 if y>0 else 0,
                    "afc": comps["afc"][max(0, y-1)]/1e7 if y>0 else 0,
                    "voc": comps["voc"][max(0, y-1)]/1e7 if y>0 else 0,
                    "carbon": comps["carbon"][max(0, y-1)]/1e7 if y>0 else 0,
                    "acc": comps["acc"][max(0, y-1)]/1e7 if y>0 else 0,
                    "maint_s": (comps["maint_s"][max(0, y-1)] + comps["replacement"][max(0,y-1)])/1e7 if y>0 else 0,
                    "maint_g": comps["maint_g"][max(0, y-1)]/1e7 if y>0 else 0,
                    "benefit": comps["benefit"][max(0, y-1)]/1e7 if y>0 else 0
                } for y in chart_years
            ],
            "sensitivities": sensitivities,
            "breakeven_cost": breakeven_c,
            "scenarios": scenarios,
            "spider_data": [
                {
                    "variable": s["variable"],
                    "upside": round(abs(s["high_npv"] - economic["delta_npv"]) / max(max(s2["spread"] for s2 in sensitivities), 1) * 100, 1),
                    "downside": round(abs(s["low_npv"] - economic["delta_npv"]) / max(max(s2["spread"] for s2 in sensitivities), 1) * 100, 1),
                    "spread_pct": round(s["spread"] / max(max(s2["spread"] for s2 in sensitivities), 1) * 100, 1),
                }
                for s in sensitivities
            ]
        }
        return {
            "webster": webster,
            "economic": {
                "npv_s": economic["npv_s"],
                "delta_npv": economic["delta_npv"],
                "irr": economic["irr"],
                "payback": economic["payback_years"],
                "discounted_payback": economic["discounted_payback_years"],
                "pi": economic["pi"],
                "breakeven_c": breakeven_c
            },
            "decision": {
                "choice": decision,
                "reason": reason,
                "status": status
            },
            "charts": chart_data
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
@app.get("/health")
def health(): return {"status": "ok"}
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
