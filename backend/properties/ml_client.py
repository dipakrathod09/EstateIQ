import os
import requests
import logging

logger = logging.getLogger(__name__)

# Base URL for ML service, defaulting to http://localhost:8001
ML_SERVICE_BASE_URL = os.getenv("ML_SERVICE_URL", "http://localhost:8001")

def get_price_prediction(property_obj_or_dict):
    """
    Sends property data to XGBoost ML Microservice (FastAPI) at /predict-price.
    Supports a Property model instance or a dictionary.
    Includes listed_price so the ML service computes deal_tag.
    Has a 3-second timeout and catches connection errors gracefully.
    Returns prediction dict if successful, or None if the ML service is down.

    IMPORTANT: Distance fields (dist_metro_km etc.) are OMITTED from the JSON
    payload when their value is None. This allows the ML service's Pydantic schema
    to apply its declared Field(default=...) for those keys. Sending an explicit
    null would bypass the default and cause a Pydantic 422 validation error.
    """
    if property_obj_or_dict is None:
        return None

    if hasattr(property_obj_or_dict, 'city'):
        p = property_obj_or_dict
        payload = {
            "city": p.city or "Ahmedabad",
            "sub_market": p.sub_market or p.city or "Central",
            "locality": p.locality or "Central Area",
            "property_type": p.property_type or "Apartment",
            "bhk": int(p.bhk) if p.bhk is not None else 2,
            "area_sqft": float(p.area_sqft) if p.area_sqft is not None else 1200.0,
            "floor": int(p.floor) if p.floor is not None else 2,
            "total_floors": int(p.total_floors) if p.total_floors is not None else 10,
            "age_years": int(p.age_years) if p.age_years is not None else 3,
            "furnishing": p.furnishing or "Semi-Furnished",
            "facing": p.facing or "East",
            "has_gym": bool(p.has_gym),
            "has_pool": bool(p.has_pool),
            "has_clubhouse": bool(p.has_clubhouse),
            "has_security": bool(p.has_security),
            "has_power_backup": bool(p.has_power_backup),
            "has_parking": bool(p.has_parking),
            "has_lift": bool(p.has_lift),
            "rera_approved": bool(p.rera_approved),
            "listed_price": float(p.listed_price) if p.listed_price is not None else None
        }
        # Omit None-valued distance fields so Pydantic Field(default=...) applies on the ML service side.
        # Sending "dist_metro_km": null explicitly would bypass those defaults and trigger a 422.
        # Also avoids the 0.0-as-falsy bug: `float(0.0 or 1.5)` → 1.5 (wrong); `is not None` guard is correct.
        if p.dist_metro_km is not None:
            payload["dist_metro_km"] = float(p.dist_metro_km)
        if p.dist_school_km is not None:
            payload["dist_school_km"] = float(p.dist_school_km)
        if p.dist_hospital_km is not None:
            payload["dist_hospital_km"] = float(p.dist_hospital_km)
        if p.dist_it_hub_km is not None:
            payload["dist_it_hub_km"] = float(p.dist_it_hub_km)

    elif isinstance(property_obj_or_dict, dict):
        d = property_obj_or_dict
        payload = {
            "city": d.get("city", "Ahmedabad"),
            "sub_market": d.get("sub_market", "Central"),
            "locality": d.get("locality", "Bodakdev"),
            "property_type": d.get("property_type", "Apartment"),
            "bhk": int(d["bhk"]) if d.get("bhk") is not None else 2,
            "area_sqft": float(d["area_sqft"]) if d.get("area_sqft") is not None else 1200.0,
            "floor": int(d["floor"]) if d.get("floor") is not None else 2,
            "total_floors": int(d["total_floors"]) if d.get("total_floors") is not None else 10,
            "age_years": int(d["age_years"]) if d.get("age_years") is not None else 3,
            "furnishing": d.get("furnishing", "Semi-Furnished"),
            "facing": d.get("facing", "East"),
            "has_gym": bool(d.get("has_gym", False)),
            "has_pool": bool(d.get("has_pool", False)),
            "has_clubhouse": bool(d.get("has_clubhouse", False)),
            "has_security": bool(d.get("has_security", True)),
            "has_power_backup": bool(d.get("has_power_backup", True)),
            "has_parking": bool(d.get("has_parking", True)),
            "has_lift": bool(d.get("has_lift", True)),
            "rera_approved": bool(d.get("rera_approved", True)),
            "listed_price": float(d["listed_price"]) if d.get("listed_price") is not None else None
        }
        # Same omission logic for dict path: only include distance keys when non-null values are present.
        for dist_field in ("dist_metro_km", "dist_school_km", "dist_hospital_km", "dist_it_hub_km"):
            val = d.get(dist_field)
            if val is not None:
                payload[dist_field] = float(val)
    else:
        return None

    target_url = f"{ML_SERVICE_BASE_URL.rstrip('/')}/predict-price"
    try:
        response = requests.post(target_url, json=payload, timeout=3)
        if response.status_code == 200:
            return response.json()
        else:
            logger.warning(f"ML Service returned HTTP status {response.status_code}: {response.text}")
            return None
    except Exception as e:
        logger.error(f"Error connecting to ML microservice at {target_url}: {e}")
        return None

# Alias for backwards compatibility
get_ml_price_prediction = get_price_prediction
