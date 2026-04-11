from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, HTTPException
import pandas as pd
import numpy as np
from typing import Dict, List, Any
from scipy.optimize import brentq
import math

app = FastAPI(title="Traffic Economics API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Location type multipliers
LOCATION_MULTIPLIERS = {
    "Congested": {"wait_multiplier": 1.5, "fuel_multiplier": 1.3, "time_multiplier": 1.4, "growth_rate": 0.03},
    "Stable Flow": {"wait_multiplier": 1.0, "fuel_multiplier": 1.0, "time_multiplier": 1.0, "growth_rate": 0.02},
    "Smooth": {"wait_multiplier": 0.7, "fuel_multiplier": 0.8, "time_multiplier": 0.75, "growth_rate": 0.015}
}

def calculate_irr(cashflows: List[float], guess: float = 0.1) -> float:
    """Calculate IRR using Newton-Raphson method"""
    def npv(rate):
        return sum(cf / ((1 + rate) ** i) for i, cf in enumerate(cashflows))
    
    try:
        # Use brentq method for robust root finding
        if npv(0) > 0 and npv(1) < 0:
            irr = brentq(npv, 0, 1)
        elif npv(0) < 0 and npv(-0.5) > 0:
            irr = brentq(npv, -0.5, 0)
        else:
            # Try different ranges
            for low, high in [(-0.9, -0.1), (-0.1, 0.1), (0.1, 0.5), (0.5, 1.0), (1.0, 2.0)]:
                try:
                    if npv(low) * npv(high) < 0:
                        irr = brentq(npv, low, high)
                        break
                except:
                    continue
            else:
                return None
        return irr * 100  # Return as percentage
    except:
        return None

def calculate_payback_period(cashflows: List[float], discount_rate: float = 0.08) -> Dict[str, Any]:
    """Calculate discounted payback period"""
    discounted_cumulative = 0
    undiscounted_cumulative = 0
    
    for i, cf in enumerate(cashflows):
        discounted_cf = cf / ((1 + discount_rate) ** i)
        discounted_cumulative += discounted_cf
        undiscounted_cumulative += cf
        
        if discounted_cumulative >= 0 and i > 0:
            # Calculate exact payback period using interpolation
            previous_discounted = discounted_cumulative - discounted_cf
            fraction = (0 - previous_discounted) / (discounted_cumulative - previous_discounted)
            discounted_payback = i - 1 + fraction
            break
    else:
        discounted_payback = None
    
    # Undiscounted payback period
    undiscounted_cumulative = 0
    for i, cf in enumerate(cashflows):
        undiscounted_cumulative += cf
        if undiscounted_cumulative >= 0 and i > 0:
            previous_undiscounted = undiscounted_cumulative - cf
            fraction = (0 - previous_undiscounted) / (undiscounted_cumulative - previous_undiscounted)
            undiscounted_payback = i - 1 + fraction
            break
    else:
        undiscounted_payback = None
    
    return {
        "discounted_payback_years": round(discounted_payback, 2) if discounted_payback else None,
        "undiscounted_payback_years": round(undiscounted_payback, 2) if undiscounted_payback else None
    }

def calculate_breakeven_point(
    signal_cashflows: List[float], 
    underpass_cashflows: List[float],
    discount_rate: float = 0.08
) -> Dict[str, Any]:
    """Calculate breakeven point where cumulative discounted benefits equal costs"""
    cumulative_signal = []
    cumulative_underpass = []
    cumulative_difference = []
    
    running_signal = 0
    running_underpass = 0
    
    for i, (cf_signal, cf_under) in enumerate(zip(signal_cashflows, underpass_cashflows)):
        discounted_signal = cf_signal / ((1 + discount_rate) ** i)
        discounted_under = cf_under / ((1 + discount_rate) ** i)
        
        running_signal += discounted_signal
        running_underpass += discounted_under
        
        cumulative_signal.append(running_signal)
        cumulative_underpass.append(running_underpass)
        cumulative_difference.append(running_underpass - running_signal)
    
    # Find breakeven year where difference crosses zero
    breakeven_year = None
    for i in range(1, len(cumulative_difference)):
        if cumulative_difference[i-1] <= 0 <= cumulative_difference[i]:
            # Linear interpolation
            fraction = (0 - cumulative_difference[i-1]) / (cumulative_difference[i] - cumulative_difference[i-1])
            breakeven_year = (i - 1) + fraction
            break
    
    return {
        "breakeven_year": round(breakeven_year, 2) if breakeven_year else None,
        "cumulative_signal": cumulative_signal,
        "cumulative_underpass": cumulative_underpass,
        "cumulative_difference": cumulative_difference
    }

def calculate_annual_costs_and_benefits(
    volume: float,
    wait_time: float,
    fuel_cost: float,
    population: float,
    gdp: float,
    multiplier: Dict[str, float],
    year: int,
    construction_cost_cr: float
) -> Dict[str, Any]:
    """Calculate annual costs and benefits with growth factors"""
    
    # Apply growth rates (population and GDP grow over time)
    population_growth = 0.015  # 1.5% annual population growth
    gdp_growth = 0.05  # 5% annual GDP growth
    
    adjusted_population = population * ((1 + population_growth) ** year)
    adjusted_gdp = gdp * ((1 + gdp_growth) ** year)
    
    # Apply location multipliers
    adjusted_wait_time = wait_time * multiplier["wait_multiplier"]
    adjusted_fuel_cost = fuel_cost * multiplier["fuel_multiplier"]
    adjusted_gdp = adjusted_gdp * multiplier["time_multiplier"]
    
    # Fuel waste calculations
    fuel_waste_per_day = volume * (adjusted_wait_time / 60) * (adjusted_fuel_cost / 100)
    annual_fuel_loss = fuel_waste_per_day * 365
    
    # Time cost calculations
    value_of_time_per_hour = (adjusted_gdp / adjusted_population) / 365 / 8
    time_cost_per_day = volume * (adjusted_wait_time / 60) * value_of_time_per_hour
    annual_time_loss = time_cost_per_day * 365
    
    # Signal costs
    signal_maintenance = 50000 * (1 + 0.03) ** year  # 3% annual increase
    signal_annual_cost = signal_maintenance + annual_fuel_loss + annual_time_loss
    
    # Underpass benefits
    speed_improvement = 0.3
    time_saved_per_day = volume * (adjusted_wait_time / 60) * speed_improvement
    fuel_saved_per_day = fuel_waste_per_day * 0.7
    
    annual_time_saved = time_saved_per_day * 365 * value_of_time_per_hour
    annual_fuel_saved = fuel_saved_per_day * 365
    underpass_maintenance = 200000 * (1 + 0.03) ** year  # 3% annual increase
    underpass_annual_benefit = annual_time_saved + annual_fuel_saved - underpass_maintenance
    
    # Construction cost (only in year 0)
    signal_install_cost = 500000
    underpass_construction_cost = construction_cost_cr * 10000000
    
    return {
        "signal_install_cost": signal_install_cost if year == 0 else 0,
        "underpass_construction_cost": underpass_construction_cost if year == 0 else 0,
        "signal_annual_cost": -signal_annual_cost if year > 0 else 0,
        "underpass_annual_benefit": underpass_annual_benefit if year > 0 else 0,
        "annual_fuel_loss": annual_fuel_loss,
        "annual_time_loss": annual_time_loss,
        "annual_fuel_saved": annual_fuel_saved,
        "annual_time_saved": annual_time_saved,
        "adjusted_population": adjusted_population,
        "adjusted_gdp": adjusted_gdp
    }

@app.post("/analyze")
def analyze(data: dict):
    """Comprehensive analysis with 100-year cashflow, IRR, and breakeven"""
    try:
        # Extract parameters
        volume = data["volume"]
        speed = data["speed"]
        wait_time = data["wait_time"]
        fuel_cost = data["fuel_cost"]
        population = data["population"]
        gdp = data["gdp"]
        location_type = data.get("location_type", "Stable Flow")
        construction_cost_cr = data.get("construction_cost", 15)
        
        # Get location multiplier
        multiplier = LOCATION_MULTIPLIERS.get(location_type, LOCATION_MULTIPLIERS["Stable Flow"])
        
        # Analysis period: 100 years
        years = 100
        discount_rate = 0.08
        
        # Initialize cashflows
        signal_cashflows = []
        underpass_cashflows = []
        annual_data = []
        
        # Calculate cashflows for each year
        for year in range(years + 1):
            annual = calculate_annual_costs_and_benefits(
                volume, wait_time, fuel_cost, population, gdp, 
                multiplier, year, construction_cost_cr
            )
            
            # Signal cashflow: installation cost + annual operating costs
            signal_cf = annual["signal_install_cost"] + annual["signal_annual_cost"]
            signal_cashflows.append(signal_cf)
            
            # Underpass cashflow: construction cost + annual benefits
            underpass_cf = -annual["underpass_construction_cost"] + annual["underpass_annual_benefit"]
            underpass_cashflows.append(underpass_cf)
            
            annual_data.append({
                "year": year,
                "signal_cf": signal_cf,
                "underpass_cf": underpass_cf,
                "fuel_loss": annual["annual_fuel_loss"],
                "time_loss": annual["annual_time_loss"],
                "fuel_saved": annual["annual_fuel_saved"],
                "time_saved": annual["annual_time_saved"],
                "population": annual["adjusted_population"],
                "gdp": annual["adjusted_gdp"]
            })
        
        # Calculate cumulative cashflows for charts
        cumulative_signal = []
        cumulative_underpass = []
        running_signal = 0
        running_underpass = 0
        
        for i in range(len(signal_cashflows)):
            running_signal += signal_cashflows[i]
            running_underpass += underpass_cashflows[i]
            cumulative_signal.append(running_signal)
            cumulative_underpass.append(running_underpass)
        
        # Calculate NPV
        def calculate_npv(cashflows):
            return sum(cf / ((1 + discount_rate) ** i) for i, cf in enumerate(cashflows))
        
        signal_npv = calculate_npv(signal_cashflows)
        underpass_npv = calculate_npv(underpass_cashflows)
        
        # Calculate IRR
        signal_irr = calculate_irr(signal_cashflows)
        underpass_irr = calculate_irr(underpass_cashflows)
        
        # Calculate Payback Period
        signal_payback = calculate_payback_period(signal_cashflows, discount_rate)
        underpass_payback = calculate_payback_period(underpass_cashflows, discount_rate)
        
        # Calculate Breakeven Analysis
        breakeven = calculate_breakeven_point(signal_cashflows, underpass_cashflows, discount_rate)
        
        # Calculate profitability index
        def profitability_index(cashflows, discount_rate):
            pv_benefits = sum(cf / ((1 + discount_rate) ** i) for i, cf in enumerate(cashflows) if cf > 0)
            pv_costs = abs(sum(cf / ((1 + discount_rate) ** i) for i, cf in enumerate(cashflows) if cf < 0))
            return pv_benefits / pv_costs if pv_costs > 0 else 0
        
        signal_pi = profitability_index(signal_cashflows, discount_rate)
        underpass_pi = profitability_index(underpass_cashflows, discount_rate)
        
        # Decision logic
        if underpass_npv > signal_npv and underpass_irr and (underpass_irr > discount_rate * 100):
            decision = "🏗️ Build Underpass"
            recommendation_reason = "Higher NPV and attractive IRR compared to signal installation"
        elif signal_npv >= underpass_npv:
            decision = "🚦 Install Signal"
            recommendation_reason = "Signal provides better financial returns given the traffic conditions"
        else:
            decision = "⚠️ Further Analysis Required"
            recommendation_reason = "Neither option shows clear financial advantage"
        
        # Prepare cashflow data for frontend charts (sample at regular intervals)
        chart_years = list(range(0, years + 1, 5))  # Every 5 years for better performance
        chart_data = {
            "years": chart_years,
            "signal_cumulative": [cumulative_signal[y] for y in chart_years],
            "underpass_cumulative": [cumulative_underpass[y] for y in chart_years],
            "signal_cashflow": [signal_cashflows[y] for y in chart_years],
            "underpass_cashflow": [underpass_cashflows[y] for y in chart_years]
        }
        
        # Annual data for detailed analysis (first 30 years)
        detailed_years = list(range(min(31, years + 1)))
        detailed_analysis = {
            "years": detailed_years,
            "signal_cumulative": [cumulative_signal[y] for y in detailed_years],
            "underpass_cumulative": [cumulative_underpass[y] for y in detailed_years],
            "signal_annual": [signal_cashflows[y] for y in detailed_years],
            "underpass_annual": [underpass_cashflows[y] for y in detailed_years],
            "fuel_loss": [annual_data[y]["fuel_loss"] for y in detailed_years],
            "time_loss": [annual_data[y]["time_loss"] for y in detailed_years],
            "fuel_saved": [annual_data[y]["fuel_saved"] for y in detailed_years],
            "time_saved": [annual_data[y]["time_saved"] for y in detailed_years]
        }
        
        return {
            "summary": {
                "signal_npv": signal_npv,
                "underpass_npv": underpass_npv,
                "signal_irr": signal_irr,
                "underpass_irr": underpass_irr,
                "signal_pi": signal_pi,
                "underpass_pi": underpass_pi,
                "decision": decision,
                "recommendation_reason": recommendation_reason,
                "location_type": location_type,
                "construction_cost_cr": construction_cost_cr
            },
            "payback": {
                "signal": signal_payback,
                "underpass": underpass_payback
            },
            "breakeven": breakeven,
            "cashflows": {
                "full_years": list(range(years + 1)),
                "signal_cumulative": cumulative_signal,
                "underpass_cumulative": cumulative_underpass,
                "signal_annual": signal_cashflows,
                "underpass_annual": underpass_cashflows
            },
            "chart_data": chart_data,
            "detailed_analysis": detailed_analysis,
            "annual_data": annual_data[:31]  # First 31 years for detailed view
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/metrics")
def metrics():
    """Get traffic metrics from sample data"""
    hourly_data = {
        "time": ["8AM", "9AM", "10AM", "11AM", "12PM", "1PM", "2PM", "3PM", "4PM", "5PM", "6PM", "7PM"],
        "volume": [800, 1200, 1500, 1800, 2000, 1900, 1700, 1600, 1800, 2200, 2000, 1500],
        "delay": [5, 10, 15, 20, 25, 22, 18, 15, 20, 30, 28, 18],
        "cost": [3000, 5000, 8000, 12000, 15000, 14000, 11000, 9000, 12000, 18000, 16000, 10000]
    }
    df = pd.DataFrame(hourly_data)
    
    return {
        "avg_delay": round(df["delay"].mean(), 2),
        "max_delay": df["delay"].max(),
        "min_delay": df["delay"].min(),
        "total_cost": df["cost"].sum(),
        "avg_volume": round(df["volume"].mean(), 2),
        "peak_volume": df["volume"].max(),
        "peak_hour": df.loc[df["volume"].idxmax(), "time"],
        "total_vehicles": df["volume"].sum()
    }

@app.get("/traffic-trend")
def trend():
    """Get hourly traffic trend data"""
    hourly_data = {
        "time": ["8AM", "9AM", "10AM", "11AM", "12PM", "1PM", "2PM", "3PM", "4PM", "5PM", "6PM", "7PM"],
        "volume": [800, 1200, 1500, 1800, 2000, 1900, 1700, 1600, 1800, 2200, 2000, 1500],
        "delay": [5, 10, 15, 20, 25, 22, 18, 15, 20, 30, 28, 18],
        "cost": [3000, 5000, 8000, 12000, 15000, 14000, 11000, 9000, 12000, 18000, 16000, 10000]
    }
    return {
        "times": hourly_data["time"],
        "volumes": hourly_data["volume"],
        "delays": hourly_data["delay"],
        "costs": hourly_data["cost"]
    }

@app.get("/location-multipliers")
def get_location_multipliers():
    """Get multiplier values for location types"""
    return LOCATION_MULTIPLIERS

@app.get("/construction-cost-range")
def get_construction_cost_range():
    """Get valid range for construction cost"""
    return {
        "min": 1,
        "max": 500,
        "step": 5,
        "unit": "Cr",
        "default": 15
    }

@app.post("/compare-scenarios")
def compare_scenarios(data: dict):
    """Compare multiple scenarios"""
    base_params = {
        "volume": data["volume"],
        "speed": data["speed"],
        "wait_time": data["wait_time"],
        "fuel_cost": data["fuel_cost"],
        "population": data["population"],
        "gdp": data["gdp"],
        "construction_cost": data.get("construction_cost", 15)
    }
    
    results = {}
    for location in ["Congested", "Stable Flow", "Smooth"]:
        params = {**base_params, "location_type": location}
        result = analyze(params)
        results[location] = {
            "signal_npv": result["summary"]["signal_npv"],
            "underpass_npv": result["summary"]["underpass_npv"],
            "signal_irr": result["summary"]["signal_irr"],
            "underpass_irr": result["summary"]["underpass_irr"],
            "decision": result["summary"]["decision"],
            "breakeven_year": result["breakeven"]["breakeven_year"]
        }
    
    return results

@app.get("/health")
def health_check():
    return {"status": "healthy", "api_version": "3.0", "analysis_years": 100}

# To run: uvicorn main:app --reload
