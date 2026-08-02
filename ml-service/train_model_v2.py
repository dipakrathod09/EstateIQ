"""
Trains a price-prediction model on synthetic_properties_100k.csv.
Handles missing values, evaluates overall AND per-city, so we can catch
any city being systematically mispriced (per MASTER_PROMPT.md requirements).
"""

import joblib
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OrdinalEncoder
from sklearn.metrics import mean_absolute_error, mean_absolute_percentage_error, r2_score
from xgboost import XGBRegressor

plt.style.use('seaborn-v0_8-whitegrid')
plt.rcParams.update({'figure.dpi': 150, 'font.size': 11})
PALETTE = ['#1F4E5F', '#DD8452', '#55A868', '#C44E52', '#8172B3']
CITY_COLORS = {
    "Mumbai": "#1F4E5F", "Delhi NCR": "#DD8452", "Bangalore": "#55A868",
    "Hyderabad": "#C44E52", "Ahmedabad": "#8172B3",
}

# ---------------------------------------------------------------------------
# 1. Load data
# ---------------------------------------------------------------------------
df = pd.read_csv("synthetic_properties_100k.csv")

TARGET = "price_inr"
CATEGORICAL = ["city", "sub_market", "locality", "property_type", "furnishing", "facing"]
NUMERIC = [
    "bhk", "area_sqft", "floor", "total_floors", "age_years",
    "dist_metro_km", "dist_school_km", "dist_hospital_km", "dist_it_hub_km",
    "has_gym", "has_pool", "has_clubhouse", "has_security",
    "has_power_backup", "has_parking", "has_lift", "rera_approved",
]
FEATURES = CATEGORICAL + NUMERIC

X = df[FEATURES].copy()
y = df[TARGET].copy()
city_labels = df["city"].copy()

# ---------------------------------------------------------------------------
# 2. Handle missing values
#    - categorical: fill with "Unknown" (its own category, not dropped)
#    - numeric: fill with median (XGBoost can handle NaN natively too, but
#      being explicit keeps this portable to other model types later)
# ---------------------------------------------------------------------------
for col in CATEGORICAL:
    X[col] = X[col].fillna("Unknown")
for col in NUMERIC:
    if X[col].isna().any():
        X[col] = X[col].fillna(X[col].median())

# ---------------------------------------------------------------------------
# 3. Encode categoricals
# ---------------------------------------------------------------------------
encoder = OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1)
X[CATEGORICAL] = encoder.fit_transform(X[CATEGORICAL])

# ---------------------------------------------------------------------------
# 4. Stratified train/test split by city
# ---------------------------------------------------------------------------
X_train, X_test, y_train, y_test, city_train, city_test = train_test_split(
    X, y, city_labels, test_size=0.2, random_state=42, stratify=city_labels
)

# ---------------------------------------------------------------------------
# 5. Train model
# ---------------------------------------------------------------------------
model = XGBRegressor(
    n_estimators=600,
    max_depth=7,
    learning_rate=0.04,
    subsample=0.85,
    colsample_bytree=0.85,
    min_child_weight=3,
    random_state=42,
    n_jobs=-1,
)
model.fit(X_train, y_train)

# ---------------------------------------------------------------------------
# 6. Evaluate — overall and per-city
# ---------------------------------------------------------------------------
preds = model.predict(X_test)

mae = mean_absolute_error(y_test, preds)
mape = mean_absolute_percentage_error(y_test, preds) * 100
r2 = r2_score(y_test, preds)

print("=" * 55)
print("OVERALL MODEL PERFORMANCE (held-out test set)")
print("=" * 55)
print(f"MAE:  Rs {mae:,.0f}")
print(f"MAPE: {mape:.2f}%")
print(f"R2:   {r2:.4f}")

print("\n" + "=" * 55)
print("PER-CITY PERFORMANCE")
print("=" * 55)
results_by_city = {}
for city in sorted(city_test.unique()):
    mask = (city_test == city).values
    c_mae = mean_absolute_error(y_test[mask], preds[mask])
    c_mape = mean_absolute_percentage_error(y_test[mask], preds[mask]) * 100
    c_r2 = r2_score(y_test[mask], preds[mask])
    results_by_city[city] = {"mae": c_mae, "mape": c_mape, "r2": c_r2, "n": mask.sum()}
    print(f"{city:12s}  n={mask.sum():5d}  MAE=Rs {c_mae:>12,.0f}  MAPE={c_mape:5.2f}%  R2={c_r2:.4f}")

# ---------------------------------------------------------------------------
# 7. Save model
# ---------------------------------------------------------------------------
joblib.dump({"model": model, "encoder": encoder, "features": FEATURES,
             "categorical": CATEGORICAL, "numeric": NUMERIC}, "price_model_100k.pkl")
print("\nSaved trained model -> price_model_100k.pkl")

# ---------------------------------------------------------------------------
# 8. Feature importance chart
# ---------------------------------------------------------------------------
importances = pd.Series(model.feature_importances_, index=FEATURES).sort_values()

fig, ax = plt.subplots(figsize=(9, 8))
bars = ax.barh(importances.index, importances.values, color=PALETTE[0])
for bar in bars:
    width = bar.get_width()
    ax.text(width + 0.002, bar.get_y() + bar.get_height() / 2,
            f'{width:.3f}', va='center', fontsize=9)
ax.set_title("Feature Importance - Price Prediction Model (100K rows)", fontweight='bold')
ax.set_xlabel("Relative Importance")
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
plt.tight_layout()
plt.savefig("feature_importance_100k.png", dpi=150, bbox_inches="tight")
print("Saved chart -> feature_importance_100k.png")

# ---------------------------------------------------------------------------
# 9. Actual vs Predicted, colored by city
# ---------------------------------------------------------------------------
fig, ax = plt.subplots(figsize=(8, 8))
for city in sorted(city_test.unique()):
    mask = (city_test == city).values
    ax.scatter(y_test[mask] / 1e6, preds[mask] / 1e6, alpha=0.3, s=10,
               color=CITY_COLORS.get(city, "#999999"), label=city)
lims = [0, max(y_test.max(), preds.max()) / 1e6]
ax.plot(lims, lims, color="black", linestyle='--', linewidth=1.2, label="Perfect prediction")
ax.set_title(f"Actual vs Predicted Price by City (Overall R\u00b2 = {r2:.3f})", fontweight='bold')
ax.set_xlabel("Actual Price (Rs, millions)")
ax.set_ylabel("Predicted Price (Rs, millions)")
ax.legend(loc='upper left', fontsize=9)
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
plt.tight_layout()
plt.savefig("actual_vs_predicted_100k.png", dpi=150, bbox_inches="tight")
print("Saved chart -> actual_vs_predicted_100k.png")

# ---------------------------------------------------------------------------
# 10. Per-city MAPE bar chart (sanity check no city is systematically worse)
# ---------------------------------------------------------------------------
city_mape_series = pd.Series({c: v["mape"] for c, v in results_by_city.items()}).sort_values()
fig, ax = plt.subplots(figsize=(8, 5))
bars = ax.barh(city_mape_series.index, city_mape_series.values,
                color=[CITY_COLORS.get(c, "#999999") for c in city_mape_series.index])
for bar in bars:
    width = bar.get_width()
    ax.text(width + 0.05, bar.get_y() + bar.get_height() / 2, f'{width:.2f}%', va='center', fontsize=9)
ax.set_title("Prediction Error (MAPE) by City", fontweight='bold')
ax.set_xlabel("MAPE (%)")
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
plt.tight_layout()
plt.savefig("mape_by_city.png", dpi=150, bbox_inches="tight")
print("Saved chart -> mape_by_city.png")
