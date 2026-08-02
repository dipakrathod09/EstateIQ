# EstateIQ — AI-Powered Real Estate Valuation & Investment Platform

![Django DRF](https://img.shields.io/badge/Backend-Django_DRF_6.0-12283C?style=for-the-badge&logo=django)
![React Vite](https://img.shields.io/badge/Frontend-React_18_Vite_V8-B98B4E?style=for-the-badge&logo=react)
![FastAPI ML](https://img.shields.io/badge/ML_Service-FastAPI_XGBoost_100k-E2574C?style=for-the-badge&logo=fastapi)
![Tests](https://img.shields.io/badge/Tests-170%2F170_Passing-success?style=for-the-badge)

**EstateIQ** is an end-to-end real estate platform delivering AI-driven property price valuations, verified market listings across Mumbai, interactive GIS map discovery, digital lease management with payment schedules, and an institutional fractional investment portal.

---

## ✨ Key Features

### 🏠 1. Mumbai Property Marketplace & Interactive GIS Mapping
- **Diverse Listing Types**: Apartments, Penthouses, Villas, Studio Apartments, and Independent Houses across Mumbai micro-markets (Bandra, Worli, Powai, Lower Parel, Andheri, Juhu, Malad, Thane, Navi Mumbai, Dadar, Goregaon, Borivali, Versova, Chembur, Ghatkopar, Khar).
- **3 View Modes**: Desktop **Split View** (scrollable grid + sticky interactive Leaflet GIS Map), **Grid View**, and full-width **Map View**.
- **Multi-Parametric Filter Panel**: Filter by locality autocomplete, BHK configuration, property type, buy/rent intent, price range, and RERA verification.
- **5-Step Property Wizard**: Step-by-step listing creation with local device file uploads (`FileReader` base64 URLs) and sample image quick-select.

### 🤖 2. AI Valuation Microservice (FastAPI + XGBoost)
- Microservice hosted on port `8001` trained on 100,000 real estate market data points.
- Computes real-time estimated fair market price (INR), model confidence score, and deal rating tags (`Good Deal (Undervalued)`, `Fair Price`, `Overpriced`).
- Evaluates 24 features including carpet area, BHK, floor level, building age, facing direction, and proximity to metro stations, schools, hospitals, and IT hubs.
- **Resilient Fallback**: Graceful degradation if ML service is unreachable.

### 📈 3. Investment Directory & Return Calculator
- Fractional real estate investment opportunities across *Commercial Office*, *Warehousing*, *Pre-Launch Residential*, and *Trophy Residential*.
- **Interactive Investment Return Calculator**: Dynamic ticket size slider computing estimated monthly rental payouts, annual ROI, and projected 3-year portfolio growth.
- **Countdown Timers**: Real-time early access countdown timers for pre-launch deals.
- **Express Interest & Pitch Deck Requests**: Direct investor lead modal capturing ticket preferences.

### 🔑 4. Lease Management, Payments & Maintenance
- Digital lease agreements tracking active leases, start/end dates, monthly rent, and security deposits.
- **12-Month Automated Payment Schedule**: Generates monthly payment records with status tracking (`paid`, `unpaid`).
- **Maintenance Tracking**: Maintenance request tickets with priority status (`low`, `medium`, `high`) and lifecycle tracking (`open`, `in_progress`, `resolved`).

### 👤 5. Multi-Role Portal & Onboarding
- Role-tailored dashboards for **Landlord**, **Agent**, **Tenant**, and **Investor** accounts.
- Personalized onboarding wizard capturing preferred city, intent, BHK preferences, and budget ranges.
- 1-click persona demo login options for easy evaluation.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite 8, TailwindCSS, Lucide Icons, Leaflet Maps |
| **Backend API** | Python 3.14, Django 6.0, Django REST Framework, SimpleJWT (Bearer Auth) |
| **ML Microservice** | FastAPI, Uvicorn, XGBoost 100k Regressor, Joblib, Scikit-Learn |
| **Database** | SQLite (Dev) / PostgreSQL (Production ready) |

---

## ⚡ Quick Start & Setup Guide

### 1. Prerequisites
- Python 3.10+
- Node.js 18+
- Git

### 2. Clone the Repository
```bash
git clone https://github.com/dipakrathod09/EstateIQ.git
cd EstateIQ
```

---

### 3. Local Setup Instructions

#### Backend (Django REST Framework)
```bash
cd backend
python -m venv venv

# Activate Virtual Environment:
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
# source venv/bin/activate

pip install -r requirements.txt
python manage.py migrate

# Seed database with fresh Mumbai properties, users, leases, payments, and investments:
python seed_db.py
python seed_crm.py

python manage.py runserver 8000
```

#### ML Valuation Service (FastAPI)
```bash
cd ml-service
# In a new terminal window:
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8001
```

#### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```

Open **`http://localhost:5173`** in your browser.

---

## 🧪 Running Automated Tests

The repository includes **170 passing Pytest unit & integration tests**:

```bash
cd backend
python -m pytest tests/ --tb=short
```

---

## 🔐 Role-Based Access Control (RBAC) Matrix

| Role | Property Write | CRM Inquiries | Lease Access | Investment Creation |
|---|---|---|---|---|
| **Anonymous** | ❌ | ❌ | ❌ | ❌ |
| **Tenant** | ❌ | ❌ (Own only) | ✅ (Own lease) | ❌ |
| **Investor** | ❌ | ❌ (Own only) | ❌ | ❌ |
| **Agent** | ✅ (Own) | ✅ (Own listings) | ❌ | ✅ (Own) |
| **Landlord** | ✅ (Own) | ✅ (Own listings) | ✅ (Own properties) | ✅ (Own) |
| **Admin** | ✅ (All) | ✅ (All) | ✅ (All) | ✅ (All) |

---

## 📜 License

Distributed under the MIT License.
