"""
Example of how your Django backend would use the trained model to predict
a price for a new listing. This is the function you'd wrap in a DRF view /
FastAPI endpoint (see README.md).
"""

import os, joblib
import pandas as pd

model_path = os.path.join(os.path.dirname(__file__), "price_model_100k.pkl")
bundle = joblib.load(model_path)
model = bundle["model"]
encoder = bundle["encoder"]
FEATURES = bundle["features"]
CATEGORICAL = bundle["categorical"]


def predict_price(property_dict: dict) -> float:
    """
    property_dict must contain all FEATURES keys, e.g.:
    {
        "city": "Ahmedabad", "locality": "Bopal", "property_type": "Apartment",
        "bhk": 3, "area_sqft": 1350, "floor": 4, "total_floors": 12,
        "age_years": 3, "furnishing": "Semi-Furnished", "facing": "North",
        "dist_metro_km": 2.5, "dist_school_km": 0.8, "dist_hospital_km": 1.2,
        "has_gym": 1, "has_pool": 0, "has_clubhouse": 1, "has_security": 1,
        "has_power_backup": 1, "has_parking": 1, "rera_approved": 1,
    }
    """
    row = pd.DataFrame([property_dict])[FEATURES]
    row[CATEGORICAL] = encoder.transform(row[CATEGORICAL])
    price = model.predict(row)[0]
    return float(price)


if __name__ == "__main__":
    example = {
        "city": "Ahmedabad", "sub_market": "Ahmedabad", "locality": "Bopal",
        "property_type": "Apartment",
        "bhk": 3, "area_sqft": 1350, "floor": 4, "total_floors": 12,
        "age_years": 3, "furnishing": "Semi-Furnished", "facing": "North",
        "dist_metro_km": 2.5, "dist_school_km": 0.8, "dist_hospital_km": 1.2,
        "dist_it_hub_km": 3.0,
        "has_gym": 1, "has_pool": 0, "has_clubhouse": 1, "has_security": 1,
        "has_power_backup": 1, "has_parking": 1, "has_lift": 1, "rera_approved": 1,
    }
    predicted = predict_price(example)
    print(f"Predicted price: Rs {predicted:,.0f}")
