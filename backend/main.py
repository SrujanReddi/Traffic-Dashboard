from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, HTTPException
from typing import Dict, List, Any, Optional
import math
import numpy as np
import csv
import os
app = FastAPI(title="Traffic Signal vs. Grade Separation Decision Support System", version="4.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Load Tier CSV files at startup ───────────────────────────────────────────
def _load_tier_csv(filename: str) -> Dict[int, Dict[str, float]]:
    """Returns {year: {mean, stddev, min, max}} with rates as fractions (÷100)."""
    data = {}
    path = os.path.join(os.path.dirname(__file__), filename)
    with open(path, newline='', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            yr = int(row['Year'])
            data[yr] = {
                'mean':   float(row['Mean'])   / 100,
                'stddev': float(row['StdDev']) / 100,
                'min':    float(row['Min'])    / 100,
                'max':    float(row['Max'])    / 100,
            }
    return data

TIER1_DATA = _load_tier_csv('tier1.csv')  # population > 4M
TIER2_DATA = _load_tier_csv('tier2.csv')  # 1M ≤ population ≤ 4M
TIER3_DATA = _load_tier_csv('tier3.csv')  # population < 1M

def get_tier(pop_2011: float) -> Dict[int, Dict[str, float]]:
    """Select the correct CSV data based on 2011 census population."""
    if pop_2011 > 4_000_000:
        return TIER1_DATA
    elif pop_2011 >= 1_000_000:
        return TIER2_DATA
    else:
        return TIER3_DATA

def project_population(pop_2011: float, tier_data: Dict, from_year: int, to_year: int,
                        scenario: str = 'mean') -> float:
    """
    Compound-grow pop_2011 from from_year to to_year using per-year rates.
    scenario: 'mean' | 'mean_minus_std' | 'mean_plus_std' | 'min' | 'max'
    """
    pop = pop_2011
    for yr in range(from_year + 1, to_year + 1):
        row = tier_data.get(yr)
        if row is None:
            row = tier_data[max(tier_data.keys())]  # extrapolate with last row
        if scenario == 'mean':
            rate = row['mean']
        elif scenario == 'mean_minus_std':
            rate = row['mean'] - row['stddev']
        elif scenario == 'mean_plus_std':
            rate = row['mean'] + row['stddev']
        elif scenario == 'min':
            rate = row['min']
        elif scenario == 'max':
            rate = row['max']
        else:
            rate = row['mean']
        pop = pop * (1 + rate)
    return pop

def compute_pop_variability_scenarios(
    pop_2011: float,
    tier_data: Dict,
    base_params: Dict,
    total_volume: float,
    d_avg: float,
    webster_results: Dict,
) -> List[Dict]:
    """
    Population variability across 5 scenarios.
    2011 → 2026 : ALWAYS uses mean tier rate (single convergent path).
    2026 → end  : each scenario fans out using its own per-year tier rates.
    """
    SCENARIO_KEYS = [
        ('min',            'Extreme Downside', '#ef4444'),
        ('mean_minus_std', 'Downside Risk',    '#f97316'),
        ('mean',           'Expected Outcome', '#a78bfa'),
        ('mean_plus_std',  'Upside Risk',      '#22c55e'),
        ('max',            'Extreme Upside',   '#10b981'),
    ]
    # 2026 baseline — all scenarios share this starting population
    pop_2026_base = project_population(pop_2011, tier_data, 2011, 2026, scenario='mean')

    # Build projection table: 2011-2026 identical (mean), 2026-2056 fans out
    pop_table = []
    for yr in range(2011, 2057):
        row = {'year': yr}
        for key, label, color in SCENARIO_KEYS:
            if yr <= 2026:
                row[key] = project_population(pop_2011, tier_data, 2011, yr, scenario='mean')
            else:
                row[key] = project_population(pop_2026_base, tier_data, 2026, yr, scenario=key)
        pop_table.append(row)

    results = []
    for key, label, color in SCENARIO_KEYS:
        pop_factors = compute_pop_factors_from_2026(key, tier_data, n_years=30)
        sc_params = base_params.copy()
        sc_params['population'] = pop_2026_base
        eco = run_economic_analysis(total_volume, d_avg, sc_params, webster_results,
                                    pop_factors=pop_factors)
        results.append({
            'scenario':  key,
            'label':     label,
            'color':     color,
            'pop_2011':  round(pop_2011),
            'pop_2026':  round(pop_2026_base),
            'delta_npv': eco['delta_npv'],
            'irr':       eco['irr'],
            'payback':   eco['payback_years'],
        })
    return results, pop_table


# ── Fuel scenario constants ────────────────────────────────────────────────────
FUEL_BASE_2025 = 105.0           # ₹ per litre at 2025
FUEL_SCENARIOS = [
    {'id': 'green', 'label': 'Green Scenario', 'rate': 0.0300,    'prob': 0.16, 'color': '#10b981'},
    {'id': 'base',  'label': 'Base Case',      'rate': 0.051387,  'prob': 0.28, 'color': '#a78bfa'},
    {'id': 'high',  'label': 'High Growth',    'rate': 0.0600,    'prob': 0.56, 'color': '#f43f5e'},
]

# Population scenario probabilities
POP_PROBS = {
    'min':            0.09,
    'mean_minus_std': 0.16,
    'mean':           0.50,
    'mean_plus_std':  0.16,
    'max':            0.09,
}
POP_SCENARIO_KEYS = ['min', 'mean_minus_std', 'mean', 'mean_plus_std', 'max']


def compute_pop_factors_from_2026(scenario_key: str, tier_data: Dict, n_years: int = 30) -> list:
    """Cumulative population growth factors from 2026 baseline.
    f[0]=1.0, f[t] = product of (1+rate) for calendar years 2027 .. 2026+t."""
    f = [1.0]
    for t in range(1, n_years + 1):
        cal_year = 2026 + t
        row = tier_data.get(cal_year, tier_data[max(tier_data.keys())])
        if scenario_key == 'mean':
            rate = row['mean']
        elif scenario_key == 'mean_minus_std':
            rate = row['mean'] - row['stddev']
        elif scenario_key == 'mean_plus_std':
            rate = row['mean'] + row['stddev']
        elif scenario_key == 'min':
            rate = row['min']
        elif scenario_key == 'max':
            rate = row['max']
        else:
            rate = row['mean']
        f.append(f[-1] * (1 + rate))
    return f


def compute_combined_variability(
    pop_2011: float,
    tier_data: Dict,
    base_params: Dict,
    total_volume: float,
    d_avg: float,
    webster_results: Dict,
) -> Dict:
    """Run all 15 (pop × fuel) scenario combinations.
    Returns nested structure keyed by fuel scenario, each containing 5 pop rows.
    """
    POP_META = [
        ('min',            'Extreme Downside', '#ef4444'),
        ('mean_minus_std', 'Downside Risk',    '#f97316'),
        ('mean',           'Expected Outcome', '#a78bfa'),
        ('mean_plus_std',  'Upside Risk',      '#22c55e'),
        ('max',            'Extreme Upside',   '#10b981'),
    ]
    pop_2026_base = project_population(pop_2011, tier_data, 2011, 2026, scenario='mean')

    # Pre-compute pop growth factors once per pop scenario
    pop_factors_map = {
        key: compute_pop_factors_from_2026(key, tier_data, n_years=30)
        for key, *_ in POP_META
    }

    fuel_groups = []
    overall_expected_npv = 0.0

    for fuel_sc in FUEL_SCENARIOS:
        pop_rows = []
        fuel_expected_npv = 0.0
        for pop_key, pop_label, pop_color in POP_META:
            pop_prob   = POP_PROBS[pop_key]
            joint_prob = round(pop_prob * fuel_sc['prob'], 6)

            sc_params = base_params.copy()
            sc_params['population'] = pop_2026_base
            eco = run_economic_analysis(
                total_volume, d_avg, sc_params, webster_results,
                fuel_override={'base': FUEL_BASE_2025, 'rate': fuel_sc['rate']},
                pop_factors=pop_factors_map[pop_key],
            )
            weighted_npv = joint_prob * eco['delta_npv']
            fuel_expected_npv  += pop_prob * eco['delta_npv']  # Conditional expectation given this fuel scenario
            overall_expected_npv += weighted_npv

            pop_rows.append({
                'pop_scenario': pop_key,
                'pop_label':    pop_label,
                'pop_color':    pop_color,
                'pop_prob':     pop_prob,
                'fuel_prob':    fuel_sc['prob'],
                'joint_prob':   joint_prob,
                'delta_npv':    eco['delta_npv'],
                'irr':          eco['irr'],
                'payback':      eco['payback_years'],
            })

        fuel_groups.append({
            'fuel_id':       fuel_sc['id'],
            'fuel_label':    fuel_sc['label'],
            'fuel_color':    fuel_sc['color'],
            'fuel_prob':     fuel_sc['prob'],
            'fuel_rate_pct': round(fuel_sc['rate'] * 100, 4),
            'expected_npv':  fuel_expected_npv,
            'pop_rows':      pop_rows,
        })

    # Generate fuel price projection table for charting (2025-2056)
    fuel_table = []
    for yr in range(2025, 2057):
        t = yr - 2025
        row = {'year': yr}
        for sc in FUEL_SCENARIOS:
            row[sc['id']] = FUEL_BASE_2025 * (1 + sc['rate'])**t
        fuel_table.append(row)

    return {
        'pop_2026_base':       round(pop_2026_base),
        'fuel_groups':         fuel_groups,
        'overall_expected_npv': overall_expected_npv,
        'fuel_projection_table': fuel_table,
    }

# --- GDP Growth Variability Schedule ---
BASE_YEAR = 2025
GDP_SCHED = [
    (2022, 2025, 0.082),
    (2026, 2030, 0.059),
    (2031, 2035, 0.047),
    (2036, 2040, 0.038),
    (2041, 2045, 0.031),
    (2046, 2050, 0.027),
    (2051, 2055, 0.024),
    (2056, 2060, 0.023),
]

# --- Traffic Growth Variability Schedule (replaces constant rate) ---
# Source: period-specific projections; after 2050 growth tapers to 2.7%
TRAFFIC_SCHED = [
    (2026, 2030, 0.0767),
    (2031, 2035, 0.0611),
    (2036, 2040, 0.0437),
    (2041, 2045, 0.0356),
    (2046, 2050, 0.0270),
]
TRAFFIC_POST_2050 = 0.0270  # hold last rate constant beyond schedule

def traffic_rate_for_year(calendar_year: int) -> float:
    for y_start, y_end, rate in TRAFFIC_SCHED:
        if y_start <= calendar_year <= y_end:
            return rate
    return TRAFFIC_POST_2050

def precompute_traffic_factors(num_years: int, base_year: int, shift: float = 0.0) -> list:
    """Cumulative traffic volume growth factors. f[0]=1.0, f[t]=Product(1+rate_i) for i=1..t"""
    f = [1.0]
    for t in range(1, num_years + 1):
        rate = max(0.0, traffic_rate_for_year(base_year + t) + shift)
        f.append(f[-1] * (1 + rate))
    return f

def gdp_rate_for_year(calendar_year: int) -> float:
    for y_start, y_end, rate in GDP_SCHED:
        if y_start <= calendar_year <= y_end:
            return rate
    return GDP_SCHED[-1][2]

def precompute_gdp_factors(num_years: int, base_year: int, shift: float = 0.0) -> list:
    """Cumulative GDP-per-capita growth factors. f[0]=1.0, f[t]=Product(1+rate_i) for i=1..t"""
    f = [1.0]
    for t in range(1, num_years + 1):
        rate = max(0.0, gdp_rate_for_year(base_year + t) + shift)
        f.append(f[-1] * (1 + rate))
    return f

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
    webster_results: Dict,
    fuel_override: Optional[Dict] = None,   # {'base': 105.0, 'rate': 0.03} overrides f_0 & growth
    pop_factors: Optional[List[float]] = None,  # cumulative pop factors [1.0, ...] from 2026
):
    years = 30
    r_d = params["discount_rate"] / 100
    r_inf = params["inflation_rate"] / 100
    _gdp_shift = params.get("gdp_shift", 0.0)
    _traffic_shift = params.get("traffic_shift", 0.0)
    _gdp_factors     = precompute_gdp_factors(years, BASE_YEAR, _gdp_shift)
    _traffic_factors = precompute_traffic_factors(years, BASE_YEAR, _traffic_shift)
    
    gdppc_0 = (params["gdp_crores"] * 1e7) / params["population"]
    gdppc_sec_0 = gdppc_0 / (365 * 24 * 3600)
    
    op_hours = 16
    
    # Fuel: use scenario override if provided, else fall back to user-entered cost + inflation
    if fuel_override:
        f_0        = fuel_override['base']
        fuel_rate  = fuel_override['rate']
    else:
        f_0        = params["fuel_cost"]
        fuel_rate  = params["inflation_rate"] / 100   # reuse inflation as fuel growth proxy
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
        v_h_t = v_base * _traffic_factors[t]
        v_h_t_capped = min(v_h_t, signal_capacity)
        v_year_t = v_h_t_capped * op_hours * 365
        
        # GDP per capita: adjusted downward when population grows faster than GDP
        pop_adj = pop_factors[t] if pop_factors else 1.0
        gdppc_sec_t = gdppc_sec_0 * _gdp_factors[t] / pop_adj
        f_t = f_0 * (1 + fuel_rate)**t
        
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
        # Only population_2011 is supplied by the user; derive 2026 working population
        # via the mean-scenario tier projection so the economics reflect current reality.
        population_2011 = float(data.get("population_2011", 5e6))
        tier_data_early = get_tier(population_2011)
        population = project_population(population_2011, tier_data_early, 2011, 2026, scenario='mean')
        fuel_cost = float(data.get("fuel_cost", 100))
        inflation_rate = float(data.get("inflation_rate", 6.0))
        discount_rate = float(data.get("discount_rate", 10.0))
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
            "gdp_growth": gdp_growth, "occupancy": occupancy,
            "signal_install_cost": signal_install_cost, "grade_sep_construction_cost_crores": grade_sep_construction_cost_crores,
            "signal_maint_annual": signal_maint_annual, "grade_sep_maint_annual": grade_sep_maint_annual,
            "fuel_consumption_idle": fuel_consumption_idle, "voc_per_km": voc_per_km, "carbon_cost_kg": carbon_cost_kg
        }
        
        economic = run_economic_analysis(total_volume, webster["avg_delay"], params, webster)

        # --- Population Variability Scenarios ---
        tier_data = get_tier(population_2011)
        tier_label = (
            "Tier 1 (>4M)" if population_2011 > 4_000_000 else
            "Tier 2 (1M–4M)" if population_2011 >= 1_000_000 else
            "Tier 3 (<1M)"
        )
        pop_scenarios, pop_table = compute_pop_variability_scenarios(
            population_2011, tier_data, params,
            total_volume, webster["avg_delay"], webster
        )
        combined_variability = compute_combined_variability(
            population_2011, tier_data, params,
            total_volume, webster["avg_delay"], webster
        )
        

        # Sensitivity Analysis (Tornado)
        sensitivities = []
        vars_to_test = [
            ("Volume",       "total_volume",                       total_volume),
            ("GDP Growth",   "gdp_growth",                         gdp_growth),
            ("Discount Rate","discount_rate",                      discount_rate),
            ("Fuel Cost",    "fuel_cost",                          fuel_cost),
            ("Const. Cost",  "grade_sep_construction_cost_crores", grade_sep_construction_cost_crores),
            ("Traffic Shift","traffic_shift",                      0.0),
        ]
        
        for ui_name, var_name, var_val in vars_to_test:
            new_params_low = params.copy()
            new_v_low = total_volume
            if var_name == "total_volume":
                new_v_low *= 0.8
            elif var_name == "gdp_growth":
                new_params_low["gdp_shift"] = -0.02
            elif var_name == "traffic_shift":
                new_params_low["traffic_shift"] = -0.015
            else:
                new_params_low[var_name] = new_params_low.get(var_name, var_val) * 0.8
            res_low = run_economic_analysis(new_v_low, webster["avg_delay"], new_params_low, webster)

            new_params_high = params.copy()
            new_v_high = total_volume
            if var_name == "total_volume":
                new_v_high *= 1.2
            elif var_name == "gdp_growth":
                new_params_high["gdp_shift"] = +0.02
            elif var_name == "traffic_shift":
                new_params_high["traffic_shift"] = +0.015
            else:
                new_params_high[var_name] = new_params_high.get(var_name, var_val) * 1.2
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
        elif economic["delta_npv"] > 0:
            status = "Robustly Recommended"
        elif economic["delta_npv"] < 0:
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
            "gdp_variability": [
                {
                    "year": t,
                    "calendar_year": BASE_YEAR + t,
                    "rate": round(gdp_rate_for_year(BASE_YEAR + t) * 100, 1),
                }
                for t in range(0, 31)
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
            "charts": chart_data,
            "variability": {
                "tier": tier_label,
                "pop_2011": round(population_2011),
                "scenarios": pop_scenarios,
                "pop_projection_table": pop_table,
                "combined": combined_variability,
            },
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
