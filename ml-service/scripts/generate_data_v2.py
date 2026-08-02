"""
Generates a 100,000-row SYNTHETIC Indian real estate dataset across
Delhi NCR, Mumbai, Bangalore, Hyderabad, and Ahmedabad.

Built per MASTER_PROMPT.md — includes non-linear price effects, interaction
effects, realistic category distributions, controlled noise, outliers, and
simulated missing data, so the resulting model is a much more useful proxy
than a purely linear/additive formula would produce.

This is NOT real market data. Swap this CSV for real data later - see README.
"""

import numpy as np
import pandas as pd

RNG = np.random.default_rng(42)
N_ROWS = 100_000

# ---------------------------------------------------------------------------
# 1. City / sub-market definitions
#    Each entry: base price/sqft (INR) + localities with price multipliers
# ---------------------------------------------------------------------------
MARKETS = {
    # Delhi NCR sub-markets (treated individually, grouped under "Delhi NCR")
    "Delhi": {"base_psf": 15000, "villa_rate": 0.05, "localities": {
        "Vasant Kunj": 1.55, "Saket": 1.45, "Dwarka": 0.85, "Rohini": 0.75,
        "Karol Bagh": 1.10, "Lajpat Nagar": 1.20, "Rajouri Garden": 1.05,
    }},
    "Gurgaon": {"base_psf": 10500, "villa_rate": 0.12, "localities": {
        "DLF Phase 1": 1.60, "DLF Phase 5": 1.75, "Golf Course Road": 1.85,
        "Sohna Road": 0.75, "Sector 56": 1.10, "Sector 82": 0.80, "Sector 49": 0.95,
    }},
    "Noida": {"base_psf": 8000, "villa_rate": 0.08, "localities": {
        "Sector 62": 1.05, "Sector 137": 0.90, "Greater Noida West": 0.70,
        "Sector 50": 1.15, "Sector 44": 1.25,
    }},
    "Ghaziabad": {"base_psf": 6000, "villa_rate": 0.06, "localities": {
        "Indirapuram": 1.10, "Vaishali": 1.05, "Raj Nagar Extension": 0.80,
    }},
    "Faridabad": {"base_psf": 5500, "villa_rate": 0.10, "localities": {
        "Sector 21": 1.05, "Greenfield Colony": 0.90, "Sector 15": 1.00,
    }},
    # Standalone cities
    "Mumbai": {"base_psf": 24000, "villa_rate": 0.02, "localities": {
        "Bandra": 1.75, "Andheri West": 1.15, "Powai": 1.25, "Worli": 1.80,
        "Borivali": 0.85, "Thane": 0.65, "Chembur": 0.95, "Malad": 0.80,
        "Goregaon": 0.90, "Dadar": 1.35,
    }},
    "Bangalore": {"base_psf": 8500, "villa_rate": 0.10, "localities": {
        "Koramangala": 1.45, "Indiranagar": 1.55, "Whitefield": 1.05,
        "Electronic City": 0.75, "HSR Layout": 1.20, "Yelahanka": 0.70,
        "Sarjapur Road": 0.95, "Marathahalli": 1.00, "JP Nagar": 1.10, "Hebbal": 1.05,
    }},
    "Hyderabad": {"base_psf": 6800, "villa_rate": 0.09, "localities": {
        "Banjara Hills": 1.65, "Jubilee Hills": 1.70, "Gachibowli": 1.35,
        "Kondapur": 1.15, "Madhapur": 1.30, "Miyapur": 0.75, "Kukatpally": 0.85,
        "Manikonda": 0.95, "Uppal": 0.70,
    }},
    "Ahmedabad": {"base_psf": 5200, "villa_rate": 0.12, "localities": {
        "Vastrapur": 1.35, "Satellite": 1.25, "Prahlad Nagar": 1.30,
        "Bopal": 0.95, "SG Highway": 1.15, "Thaltej": 1.10, "Maninagar": 0.80,
        "Naranpura": 0.90, "Chandkheda": 0.75, "Gota": 0.80,
    }},
}

# Group sub-markets under their parent "city" label for reporting/stratification
CITY_GROUP = {
    "Delhi": "Delhi NCR", "Gurgaon": "Delhi NCR", "Noida": "Delhi NCR",
    "Ghaziabad": "Delhi NCR", "Faridabad": "Delhi NCR",
    "Mumbai": "Mumbai", "Bangalore": "Bangalore",
    "Hyderabad": "Hyderabad", "Ahmedabad": "Ahmedabad",
}

# Row-share weights (must sum to 1.0 across the 5 reported cities)
CITY_WEIGHTS = {
    "Delhi NCR": 0.26, "Mumbai": 0.22, "Bangalore": 0.20,
    "Hyderabad": 0.16, "Ahmedabad": 0.16,
}
# Sub-market split within Delhi NCR
NCR_SUBMARKET_WEIGHTS = {
    "Delhi": 0.32, "Gurgaon": 0.28, "Noida": 0.24, "Ghaziabad": 0.10, "Faridabad": 0.06,
}

PROPERTY_TYPES = ["Apartment", "Independent House", "Villa"]
FURNISHING = ["Unfurnished", "Semi-Furnished", "Fully-Furnished"]
FACING = ["North", "South", "East", "West", "North-East", "North-West", "South-East", "South-West"]

# Average area (sqft) by BHK, varies slightly by city density
CITY_AREA_FACTOR = {
    "Mumbai": 0.82, "Delhi NCR": 0.95, "Bangalore": 1.0, "Hyderabad": 1.10, "Ahmedabad": 1.15,
}
BASE_AREA_BY_BHK = {1: 550, 2: 950, 3: 1400, 4: 2000, 5: 2800}


def pick_submarket():
    parent = RNG.choice(list(CITY_WEIGHTS.keys()), p=list(CITY_WEIGHTS.values()))
    if parent == "Delhi NCR":
        sub = RNG.choice(list(NCR_SUBMARKET_WEIGHTS.keys()), p=list(NCR_SUBMARKET_WEIGHTS.values()))
        return parent, sub
    return parent, parent  # sub_market == city for non-NCR


rows = []
for _ in range(N_ROWS):
    city_group, sub_market = pick_submarket()
    market = MARKETS[sub_market]
    locality = RNG.choice(list(market["localities"].keys()))
    locality_mult = market["localities"][locality]

    # ---- BHK & area (city-dependent skew) ----
    bhk = RNG.choice([1, 2, 3, 4, 5], p=[0.10, 0.40, 0.34, 0.13, 0.03])
    area_factor = CITY_AREA_FACTOR[city_group]
    base_area = BASE_AREA_BY_BHK[bhk] * area_factor
    area_sqft = max(280, RNG.normal(base_area, base_area * 0.15))

    # ---- Property type (city-dependent villa rate) ----
    villa_p = market["villa_rate"]
    house_p = 0.15
    apt_p = 1 - villa_p - house_p
    prop_type = RNG.choice(PROPERTY_TYPES, p=[apt_p, house_p, villa_p])

    total_floors = int(RNG.integers(4, 35)) if prop_type == "Apartment" else int(RNG.integers(1, 3))
    floor = int(RNG.integers(0, total_floors + 1)) if prop_type == "Apartment" else 0

    age_years = int(RNG.integers(0, 30))
    furnishing = RNG.choice(FURNISHING, p=[0.45, 0.35, 0.20])
    facing = RNG.choice(FACING)

    dist_metro_km = round(max(0.1, RNG.exponential(3.0)), 2)
    dist_school_km = round(max(0.1, RNG.exponential(1.5)), 2)
    dist_hospital_km = round(max(0.1, RNG.exponential(2.0)), 2)
    dist_it_hub_km = round(max(0.1, RNG.exponential(4.0)), 2)

    has_gym = int(RNG.choice([0, 1], p=[0.4, 0.6]))
    has_pool = int(RNG.choice([0, 1], p=[0.6, 0.4]))
    has_clubhouse = int(RNG.choice([0, 1], p=[0.55, 0.45]))
    has_security = int(RNG.choice([0, 1], p=[0.15, 0.85]))
    has_power_backup = int(RNG.choice([0, 1], p=[0.3, 0.7]))
    has_parking = int(RNG.choice([0, 1], p=[0.1, 0.9]))
    has_lift = int(RNG.choice([0, 1], p=[0.2, 0.8])) if prop_type == "Apartment" else 0
    rera_approved = int(RNG.choice([0, 1], p=[0.2, 0.8]))
    amenity_score = (has_gym + has_pool + has_clubhouse + has_security +
                      has_power_backup + has_parking + has_lift)

    # -----------------------------------------------------------------
    # Non-linear price formula with interaction effects
    # -----------------------------------------------------------------
    psf = market["base_psf"] * locality_mult

    # Amenities: diminishing returns (sqrt instead of linear)
    psf *= (1 + 0.035 * np.sqrt(amenity_score))

    # Age depreciation: exponential decay, flattens over time (realistic)
    psf *= np.exp(-0.018 * age_years)

    # Floor premium: peaks around 60-70% of building height, tapers at top
    if prop_type == "Apartment" and total_floors > 0:
        floor_ratio = floor / total_floors
        psf *= (1 + 0.14 * floor_ratio * (1 - 0.4 * floor_ratio))

    # Furnishing premium
    furnishing_mult = {"Unfurnished": 1.0, "Semi-Furnished": 1.06, "Fully-Furnished": 1.15}
    psf *= furnishing_mult[furnishing]

    # Proximity: log-decay (steep close-in, flattens after ~2-3km)
    psf *= (1 + 0.09 / np.log1p(1 + dist_metro_km))
    psf *= (1 + 0.05 / np.log1p(1 + dist_school_km))
    psf *= (1 + 0.03 / np.log1p(1 + dist_hospital_km))
    if city_group in ("Bangalore", "Hyderabad") or sub_market == "Gurgaon":
        psf *= (1 + 0.06 / np.log1p(1 + dist_it_hub_km))  # IT-hub proximity matters more here

    # RERA trust premium
    psf *= (1.03 if rera_approved else 1.0)

    # Property type base premium
    if prop_type == "Villa":
        psf *= 1.20
    elif prop_type == "Independent House":
        psf *= 1.08

    # Luxury interaction effect: large + premium locality + fully furnished compounds
    is_luxury_combo = (area_sqft > 2200) and (locality_mult > 1.3) and (furnishing == "Fully-Furnished")
    if is_luxury_combo:
        psf *= 1.12

    # Market noise
    psf *= RNG.normal(1.0, 0.07)

    # Outliers: distress sales (~1.5%) and ultra-luxury premium (~1.5%)
    outlier_roll = RNG.random()
    if outlier_roll < 0.015:
        psf *= RNG.uniform(0.65, 0.80)  # distress sale
    elif outlier_roll > 0.985:
        psf *= RNG.uniform(1.30, 1.55)  # ultra-luxury premium

    price = round(psf * area_sqft, -3)
    price = max(price, 250000)
    price_per_sqft = round(price / area_sqft, 1)

    rows.append({
        "city": city_group,
        "sub_market": sub_market,
        "locality": locality,
        "property_type": prop_type,
        "bhk": bhk,
        "area_sqft": round(area_sqft, 1),
        "floor": floor,
        "total_floors": total_floors,
        "age_years": age_years,
        "furnishing": furnishing,
        "facing": facing,
        "dist_metro_km": dist_metro_km,
        "dist_school_km": dist_school_km,
        "dist_hospital_km": dist_hospital_km,
        "dist_it_hub_km": dist_it_hub_km,
        "has_gym": has_gym,
        "has_pool": has_pool,
        "has_clubhouse": has_clubhouse,
        "has_security": has_security,
        "has_power_backup": has_power_backup,
        "has_parking": has_parking,
        "has_lift": has_lift,
        "rera_approved": rera_approved,
        "price_per_sqft": price_per_sqft,
        "price_inr": price,
    })

df = pd.DataFrame(rows)

# ---------------------------------------------------------------------------
# Simulate missing data on non-critical fields (~3-5%), mimicking real-world gaps
# ---------------------------------------------------------------------------
for col, rate in [("facing", 0.04), ("dist_hospital_km", 0.03), ("dist_it_hub_km", 0.05),
                   ("age_years", 0.02)]:
    mask = RNG.random(len(df)) < rate
    df.loc[mask, col] = np.nan

df.to_csv("synthetic_properties_100k.csv", index=False)

print(f"Generated {len(df)} rows -> synthetic_properties_100k.csv")
print("\nRows per city:")
print(df["city"].value_counts())
print("\nRows per sub_market:")
print(df["sub_market"].value_counts())
print("\nMissing value counts:")
print(df.isna().sum()[df.isna().sum() > 0])
print("\nPrice stats (INR):")
print(df["price_inr"].describe())
