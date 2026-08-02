"""
Full 10-step smoke test via API calls (programmatic equivalent of browser checklist).
Run with: python smoke_test_runner.py
"""
import requests
import json
from datetime import date, timedelta

BASE = "http://localhost:8000/api"
ML_BASE = "http://localhost:8001"
PASS = "[PASS]"
FAIL = "[FAIL]"

results = {}


def hdr(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def register(username, role):
    r = requests.post(f"{BASE}/auth/register/", json={
        "username": username, "email": f"{username}@smoke.test",
        "password": "SmokePass123!", "role": role
    })
    return r


def login(username):
    r = requests.post(f"{BASE}/auth/login/", json={
        "username": username, "password": "SmokePass123!"
    })
    return r.json().get("access"), r.json().get("user", {})


print("\n" + "="*60)
print("EstateIQ Full Smoke Test — Programmatic Runner")
print("="*60 + "\n")

# ── STEP 1: Register 5 accounts ──────────────────────────────
print("STEP 1 — Register all 5 roles")
step1_pass = True
for username, role in [
    ("smoke_agent", "agent"), ("smoke_agent2", "agent"),
    ("smoke_tenant", "tenant"), ("smoke_landlord", "landlord"),
    ("smoke_investor", "investor"),
]:
    r = register(username, role)
    ok = r.status_code == 201 and r.json().get("user", {}).get("role") == role
    status = PASS if ok else FAIL
    print(f"  {status}  Register {username} as {role}  (HTTP {r.status_code})")
    if not ok:
        step1_pass = False
results["Step 1 — Register 5 roles"] = PASS if step1_pass else FAIL
print()

# ── STEP 2: Agent creates a property ─────────────────────────
print("STEP 2 — Agent creates a property listing")
agent_token, _ = login("smoke_agent")
property_payload = {
    "title": "Smoke Test Property",
    "description": "Full regression smoke test property",
    "city": "Ahmedabad", "sub_market": "Central", "locality": "Bodakdev",
    "property_type": "Apartment", "bhk": 3, "area_sqft": 1500.0,
    "floor": 4, "total_floors": 14, "age_years": 2,
    "furnishing": "Semi-Furnished", "facing": "East",
    "listed_price": 8500000.0, "status": "for_sale",
    "dist_metro_km": 1.2, "dist_school_km": 0.9,
    "dist_hospital_km": 1.5, "dist_it_hub_km": 2.8,
    "has_gym": True, "has_pool": False, "has_clubhouse": True,
    "has_security": True, "has_power_backup": True,
    "has_parking": True, "has_lift": True, "rera_approved": True,
}
r = requests.post(f"{BASE}/properties/", json=property_payload, headers=hdr(agent_token))
prop_created = r.status_code == 201
prop_id = r.json().get("id") if prop_created else None
deal_tag = r.json().get("deal_tag") if prop_created else None
has_deal_tag = deal_tag in ("Good Deal", "Fair Price", "Overpriced")
print(f"  {'[OK]' if prop_created else '[XX]'}  Property created  (HTTP {r.status_code}, id={prop_id})")
print(f"  {'[OK]' if has_deal_tag else '[XX]'}  Deal tag present: {deal_tag!r}  (confirms ML was called)")
results["Step 2 — Agent creates property + ML deal_tag"] = PASS if (prop_created and has_deal_tag) else FAIL
print()

# ── STEP 3: Public search/filter + property detail ───────────
print("STEP 3 — Public search/filter + property detail ML card")
r_list = requests.get(f"{BASE}/properties/", params={"city": "Ahmedabad"})
in_results = prop_id and any(p["id"] == prop_id for p in r_list.json())
print(f"  {'[OK]' if in_results else '[XX]'}  Smoke Test Property appears in city=Ahmedabad filter")

# ML price prediction endpoint
r_pred = requests.get(f"{BASE}/properties/{prop_id}/price-prediction/")
pred_ok = (r_pred.status_code == 200
           and r_pred.json().get("available") is True
           and r_pred.json().get("predicted_price"))
print(f"  {'[OK]' if pred_ok else '[XX]'}  ML prediction card: available={r_pred.json().get('available')}, "
      f"price={r_pred.json().get('predicted_price')}, confidence={r_pred.json().get('confidence_score')}")

# Similar properties
r_sim = requests.get(f"{BASE}/properties/{prop_id}/similar/")
sim_ok = r_sim.status_code == 200 and isinstance(r_sim.json(), list)
print(f"  {'[OK]' if sim_ok else '[XX]'}  Similar properties endpoint: {len(r_sim.json())} results")
results["Step 3 — Public search + ML card + similar"] = PASS if (in_results and pred_ok and sim_ok) else FAIL
print()

# ── STEP 4: CRM — inquiry + status transitions ───────────────
print("STEP 4 — CRM: Create inquiry + move through pipeline")
r_inq = requests.post(f"{BASE}/crm/inquiries/", json={
    "property": prop_id, "name": "Smoke Buyer",
    "email": "smokebuyer@test.com", "phone": "9876543210",
    "message": "I want to view this smoke test property",
})
inq_created = r_inq.status_code == 201
inq_id = r_inq.json().get("id") if inq_created else None
print(f"  {'[OK]' if inq_created else '[XX]'}  Inquiry created (id={inq_id})")

# Agent patches status: new → contacted → closed
for new_status in ["contacted", "closed"]:
    r_patch = requests.patch(f"{BASE}/crm/inquiries/{inq_id}/",
                             json={"status": new_status},
                             headers=hdr(agent_token))
    ok = r_patch.status_code == 200 and r_patch.json().get("status") == new_status
    print(f"  {'[OK]' if ok else '[XX]'}  Status → {new_status}  (HTTP {r_patch.status_code})")
results["Step 4 — CRM inquiry pipeline"] = PASS if inq_created else FAIL
print()

# ── STEP 5: Agent2 isolation ─────────────────────────────────
print("STEP 5 — Agent2 cannot see agent's inquiries")
agent2_token, _ = login("smoke_agent2")
r_agent2_inq = requests.get(f"{BASE}/crm/inquiries/", headers=hdr(agent2_token))
agent2_ids = [i["id"] for i in r_agent2_inq.json()]
leak = inq_id and inq_id in agent2_ids
print(f"  {'[OK]' if not leak else '[XX]'}  agent2 inquiry list: {agent2_ids} — smoke_agent inquiry {'NOT visible [OK]' if not leak else 'VISIBLE [XX] (leak!)'}")
results["Step 5 — Agent2 isolation"] = PASS if not leak else FAIL
print()

# ── STEP 6: Landlord lease + 12 payments ─────────────────────
print("STEP 6 — Landlord creates lease + auto-generates 12 payments")
landlord_token, landlord_data = login("smoke_landlord")

# Landlord creates a property first
r_lprop = requests.post(f"{BASE}/properties/", json={
    **property_payload,
    "title": "Landlord Smoke Property",
    "status": "for_rent",
}, headers=hdr(landlord_token))
lprop_id = r_lprop.json().get("id")

tenant_token, tenant_data = login("smoke_tenant")
# Get tenant user id from /me/
r_me = requests.get(f"{BASE}/auth/me/", headers=hdr(tenant_token))
tenant_id = r_me.json().get("id")
r_me_l = requests.get(f"{BASE}/auth/me/", headers=hdr(landlord_token))
landlord_id = r_me_l.json().get("id")

today = date.today()
r_lease = requests.post(f"{BASE}/management/leases/", json={
    "property": lprop_id,
    "tenant": tenant_id,
    "landlord": landlord_id,
    "monthly_rent": 25000.0,
    "rent_amount": 25000.0,
    "security_deposit": 75000.0,
    "start_date": str(today),
    "end_date": str(today + timedelta(days=365)),
    "status": "active",
}, headers=hdr(landlord_token))
lease_created = r_lease.status_code == 201
lease_id = r_lease.json().get("id") if lease_created else None
payments = r_lease.json().get("payments", []) if lease_created else []
print(f"  {'[OK]' if lease_created else '[XX]'}  Lease created (id={lease_id}, HTTP {r_lease.status_code})")
print(f"  {'[OK]' if len(payments)==12 else '[XX]'}  Payment auto-generation: {len(payments)} records (expected 12)")
all_pending = all(p["status"] == "pending" for p in payments)
print(f"  {'[OK]' if all_pending else '[XX]'}  All payments start as 'pending'")
results["Step 6 — Landlord lease + 12 payments"] = PASS if (lease_created and len(payments)==12) else FAIL
print()

# ── STEP 7: Tenant views lease, payments, submits maintenance ─
print("STEP 7 — Tenant: view lease, payments, submit maintenance request")
r_t_leases = requests.get(f"{BASE}/management/leases/", headers=hdr(tenant_token))
t_lease_ids = [l["id"] for l in r_t_leases.json()]
tenant_sees_lease = lease_id and lease_id in t_lease_ids
print(f"  {'[OK]' if tenant_sees_lease else '[XX]'}  Tenant sees their lease (id={lease_id} in {t_lease_ids})")

r_t_payments = requests.get(f"{BASE}/management/payments/", headers=hdr(tenant_token))
t_payment_count = len(r_t_payments.json())
print(f"  {'[OK]' if t_payment_count==12 else '[XX]'}  Tenant sees {t_payment_count} payments (expected 12)")

r_maint = requests.post(f"{BASE}/management/maintenance/", json={
    "property": lprop_id,
    "lease": lease_id,
    "title": "AC not cooling",
    "description": "Bedroom AC stopped working",
    "priority": "high",
}, headers=hdr(tenant_token))
maint_created = r_maint.status_code == 201
maint_id = r_maint.json().get("id") if maint_created else None
maint_status = r_maint.json().get("status") if maint_created else None
print(f"  {'[OK]' if maint_created else '[XX]'}  Maintenance request created (id={maint_id}, status={maint_status!r})")
results["Step 7 — Tenant lease/payments/maintenance"] = PASS if (tenant_sees_lease and maint_created) else FAIL
print()

# ── STEP 8: Landlord sees + updates maintenance ───────────────
print("STEP 8 — Landlord sees and updates maintenance request")
r_l_maint = requests.get(f"{BASE}/management/maintenance/", headers=hdr(landlord_token))
l_maint_ids = [m["id"] for m in r_l_maint.json()]
landlord_sees = maint_id and maint_id in l_maint_ids
print(f"  {'[OK]' if landlord_sees else '[XX]'}  Landlord sees maintenance request (id={maint_id})")

r_update = requests.patch(f"{BASE}/management/maintenance/{maint_id}/",
                          json={"status": "in_progress"},
                          headers=hdr(landlord_token))
update_ok = r_update.status_code == 200 and r_update.json().get("status") == "in_progress"
print(f"  {'[OK]' if update_ok else '[XX]'}  Status updated to 'in_progress' (HTTP {r_update.status_code})")
results["Step 8 — Landlord manages maintenance"] = PASS if (landlord_sees and update_ok) else FAIL
print()

# ── STEP 9: Tenant blocked from CRM/landlord routes ──────────
print("STEP 9 — Tenant blocked from CRM and landlord data")
# Tenant tries to access agent's inquiry via detail endpoint
r_blocked = requests.get(f"{BASE}/crm/inquiries/{inq_id}/", headers=hdr(tenant_token))
blocked_from_crm = r_blocked.status_code == 404  # scoped queryset returns 404
print(f"  {'[OK]' if blocked_from_crm else '[XX]'}  Tenant GET /crm/inquiries/{inq_id}/ → {r_blocked.status_code} (expected 404)")

# Tenant tries to access landlord's lease by id
r_blocked_lease = requests.get(f"{BASE}/management/leases/{lease_id}/", headers=hdr(tenant_token))
# Tenant is ON this lease as tenant, so they SHOULD see it (expected 200)
# What they should NOT see: leases where they are not the tenant
landlord_token2, _ = login("smoke_landlord")
# Create a second lease with a different user — not smoke_tenant
r_me_a = requests.get(f"{BASE}/auth/me/", headers=hdr(agent_token))
other_user_id = r_me_a.json().get("id")
r_lease2 = requests.post(f"{BASE}/management/leases/", json={
    "property": lprop_id, "tenant": other_user_id, "landlord": landlord_id,
    "monthly_rent": 20000.0, "rent_amount": 20000.0, "security_deposit": 60000.0,
    "start_date": str(today), "end_date": str(today + timedelta(days=365)), "status": "active",
}, headers=hdr(landlord_token))
lease2_id = r_lease2.json().get("id") if r_lease2.status_code == 201 else None
r_tenant_leak = requests.get(f"{BASE}/management/leases/{lease2_id}/", headers=hdr(tenant_token))
no_leak = r_tenant_leak.status_code == 404
print(f"  {'[OK]' if no_leak else '[XX]'}  Tenant GET other user's lease/{lease2_id}/ → {r_tenant_leak.status_code} (expected 404)")
results["Step 9 — Tenant blocked from cross-user data"] = PASS if (blocked_from_crm and no_leak) else FAIL
print()

# ── STEP 10: ML service down — graceful degradation ──────────
print("STEP 10 — ML service down: graceful degradation")
# Verify ML service IS currently up (positive baseline)
r_ml_up = requests.get(f"{BASE}/properties/{prop_id}/price-prediction/")
ml_currently_up = r_ml_up.json().get("available") is True
print(f"  {'[OK]' if ml_currently_up else '[XX]'}  ML service UP baseline: available={r_ml_up.json().get('available')}, price={r_ml_up.json().get('predicted_price')}")

# Simulate ML service being down by posting to a non-existent ML endpoint
import unittest.mock as mock
import importlib
import sys

# Test the degradation by directly calling the service function with mocked failure
sys.path.insert(0, 'c:/Users/admin/Desktop/EstateIQ/backend')
import django, os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from unittest.mock import patch
from properties.ml_client import get_price_prediction
from properties.models import Property

prop_obj = Property.objects.get(id=prop_id)

with patch('properties.ml_client.requests.post', side_effect=ConnectionError("Simulated ML down")):
    result = get_price_prediction(prop_obj)
    graceful = result is None
    print(f"  {'[OK]' if graceful else '[XX]'}  ML service simulated down: get_price_prediction() returned {result!r} (expected None)")

# Confirm the endpoint returns available=False (not 500) when ML is down
# We test this via the mock injection at service layer — the API test already confirms it
# but let's double-check by patching the module and calling the view directly
from django.test import RequestFactory
from rest_framework.test import APIRequestFactory
from properties.views import PropertyPricePredictionView

factory = APIRequestFactory()
request = factory.get(f'/api/properties/{prop_id}/price-prediction/')

with patch('properties.ml_client.requests.post', side_effect=ConnectionError("ML down")):
    view = PropertyPricePredictionView.as_view()
    response = view(request, pk=prop_id)
    response.accepted_renderer = None
    ml_down_graceful = response.status_code == 200 and response.data.get('available') is False
    print(f"  {'[OK]' if ml_down_graceful else '[XX]'}  API endpoint with ML down: HTTP {response.status_code}, available={response.data.get('available')} (expected HTTP 200, available=False)")

results["Step 10 — ML service down graceful degradation"] = PASS if (ml_currently_up and graceful and ml_down_graceful) else FAIL
print()

# ── Final Summary ─────────────────────────────────────────────
print("="*60)
print("SMOKE TEST SUMMARY")
print("="*60)
total = len(results)
passed = sum(1 for v in results.values() if v == PASS)
for step, result in results.items():
    print(f"  {result}  {step}")
print(f"\n  {passed}/{total} steps passed")
if passed == total:
    print("\n  [OK] ALL STEPS PASSED — platform is regression-clean.")
else:
    print(f"\n  [XX] {total-passed} step(s) failed — see details above.")
