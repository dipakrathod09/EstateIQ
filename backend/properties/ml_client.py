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
            "bhk": int(p.bhk or 2),
            "area_sqft": float(p.area_sqft or 1200.0),
            "floor": int(p.floor or 2),
            "total_floors": int(p.total_floors or 10),
            "age_years": int(p.age_years or 3),
            "furnishing": p.furnishing or "Semi-Furnished",
            "facing": p.facing or "East",
            "dist_metro_km": float(p.dist_metro_km or 1.5),
            "dist_school_km": float(p.dist_school_km or 1.0),
            "dist_hospital_km": float(p.dist_hospital_km or 1.5),
            "dist_it_hub_km": float(p.dist_it_hub_km or 3.0),
            "has_gym": bool(p.has_gym),
            "has_pool": bool(p.has_pool),
            "has_clubhouse": bool(p.has_clubhouse),
            "has_security": bool(p.has_security),
            "has_power_backup": bool(p.has_power_backup),
            "has_parking": bool(p.has_parking),
            "has_lift": bool(p.has_lift),
            "rera_approved": bool(p.rera_approved),
            "listed_price": float(p.listed_price) if p.listed_price else None
        }
    elif isinstance(property_obj_or_dict, dict):
        d = property_obj_or_dict
        payload = {
            "city": d.get("city", "Ahmedabad"),
            "sub_market": d.get("sub_market", "Central"),
            "locality": d.get("locality", "Bodakdev"),
            "property_type": d.get("property_type", "Apartment"),
            "bhk": int(d.get("bhk", 2)),
            "area_sqft": float(d.get("area_sqft", 1200.0)),
            "floor": int(d.get("floor", 2)),
            "total_floors": int(d.get("total_floors", 10)),
            "age_years": int(d.get("age_years", 3)),
            "furnishing": d.get("furnishing", "Semi-Furnished"),
            "facing": d.get("facing", "East"),
            "dist_metro_km": float(d.get("dist_metro_km", 1.5)),
            "dist_school_km": float(d.get("dist_school_km", 1.0)),
            "dist_hospital_km": float(d.get("dist_hospital_km", 1.5)),
            "dist_it_hub_km": float(d.get("dist_it_hub_km", 3.0)),
            "has_gym": bool(d.get("has_gym", False)),
            "has_pool": bool(d.get("has_pool", False)),
            "has_clubhouse": bool(d.get("has_clubhouse", False)),
            "has_security": bool(d.get("has_security", True)),
            "has_power_backup": bool(d.get("has_power_backup", True)),
            "has_parking": bool(d.get("has_parking", True)),
            "has_lift": bool(d.get("has_lift", True)),
            "rera_approved": bool(d.get("rera_approved", True)),
            "listed_price": float(d.get("listed_price", 5000000.0)) if d.get("listed_price") else None
        }
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
