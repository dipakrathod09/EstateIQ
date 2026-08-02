# EstateIQ — AI-Powered Real Estate & Investment Platform

![EstateIQ Platform Architecture](https://img.shields.io/badge/Architecture-Microservices-1F7A6C?style=for-the-badge)
![Django DRF](https://img.shields.io/badge/Backend-Django_DRF_6.0-12283C?style=for-the-badge&logo=django)
![React Vite](https://img.shields.io/badge/Frontend-React_18_Vite_V8-B98B4E?style=for-the-badge&logo=react)
![FastAPI ML](https://img.shields.io/badge/ML_Service-FastAPI_Scikit--Learn-E2574C?style=for-the-badge&logo=fastapi)
![Tests](https://img.shields.io/badge/Tests-143%2F143_Passing-success?style=for-the-badge)

**EstateIQ** is an end-to-end, enterprise-grade real estate platform combining AI-driven valuation predictions, property management & leasing schedules, CRM lead pipelines, and a fractional investment directory.

---

## 🚀 Key Features

### 🏢 1. Core Real Estate Listings & Multi-Field Search
- Full CRUD operations for commercial, residential, warehousing, and retail properties.
- Dynamic multi-field filtering: city, locality, price range, BHK configuration, property type, and status.
- Strict role permissions: Creation restricted to `agent`, `landlord`, and `admin`; public read access for anonymous visitors.

### 🤖 2. Machine Learning Valuation Microservice (FastAPI + Scikit-Learn)
- Autonomous valuation service hosted on port `8001` trained on 100,000 property data points.
- Evaluates 24 payload features (location, area, age, amenities, RERA approval, distance to metro/IT hubs).
- Computes deal classification tags: `Underpriced`, `Fair Price`, or `Overpriced`.
- **Fault-Tolerant Resiliency**: 3-second timeout protection with graceful degradation (`available: False`) if the ML service is offline.

### 💼 3. Agent & Landlord CRM Pipeline
- Inquiry submission and tracking pipeline (`new` → `contacted` → `showing_scheduled` → `negotiating` → `closed`).
- **Owner-Scoped Security**: Strict `get_queryset()` access control ensures agents and landlords only see inquiries submitted for properties they own.
- Saved properties wishlist for tenant and investor accounts.

### 🔑 4. Property Management & Automated Lease Schedules
- Digital lease agreement lifecycle (`active`, `expired`, `terminated`).
- **12-Month Payment Schedule Auto-Generation**: Automatically computes monthly rental payment schedules upon lease creation.
- Tenant portal to review payments and log maintenance requests.

### 📈 5. Investment & Fractional Directory (`/investments`)
- Directory covering 4 institutional asset classes: *Commercial Office*, *Warehousing*, *Pre-Launch Residential*, and *Retail*.
- Live real-time ticking countdown timers for pre-launch deals.
- Prominent SEBI regulatory disclaimer blocks displayed above the fold.
- **Strict Lead-Generation Boundary**: Every user interaction yields a lead inquiry (`InvestmentInquiry`) with **zero transaction or payment processing overhead**.

---

## 🛠️ Architecture & Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite 8, Lucide Icons, Custom CSS ("Blueprint Skyline" Design Token System) |
| **Backend API** | Django 6.0, Django REST Framework, SimpleJWT (Bearer Authentication) |
| **ML Microservice** | FastAPI, Uvicorn, Scikit-Learn (Random Forest Regressor), Joblib |
| **Database** | SQLite (Dev) / PostgreSQL (Production) |
| **Orchestration** | Docker, Docker Compose, Nginx |

---

## ⚡ Quick Start & Installation

### 1. Prerequisites
- Python 3.10+
- Node.js 18+
- Git

### 2. Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/EstateIQ.git
cd EstateIQ
```

---

### 3. Local Development Setup

#### Backend (Django REST Framework)
```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
# source venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python manage.py shell < seed_db.py
python manage.py runserver 8000
```

#### ML Microservice (FastAPI)
```bash
cd ml-service
# In a new terminal window with venv activated:
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8001
```

#### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```

Visit **`http://localhost:5173`** in your browser.

---

### 4. Running with Docker Compose

To spin up all services simultaneously (Django API on port 8000, ML Service on port 8001, Frontend on port 5173):

```bash
docker-compose up --build
```

---

## 🧪 Running the Test Suite

The repository contains **143 automated Pytest unit and integration tests** with 100% pass rate.

```bash
cd backend
python -m pytest tests/ --tb=short
```

To run the programmatic smoke test suite:
```bash
python investments_smoke_runner.py
```

---

## 🔐 Role-Based Access Control (RBAC) Matrix

| Role | Property Write | Inquiry Read | Lease Access | Investment Listing Write |
|---|---|---|---|---|
| **Anonymous** | ❌ | ❌ | ❌ | ❌ |
| **Tenant** | ❌ | ❌ (Own only) | ✅ (Own lease) | ❌ |
| **Investor** | ❌ | ❌ (Own only) | ❌ | ❌ |
| **Agent** | ✅ (Own) | ✅ (Own properties) | ❌ | ✅ (Own) |
| **Landlord** | ✅ (Own) | ✅ (Own properties) | ✅ (Own properties) | ✅ (Own) |
| **Admin** | ✅ (All) | ✅ (All) | ✅ (All) | ✅ (All) |

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for details.
