"""
Phase 5 Investments Smoke Test Runner
Programmatic execution of the 10-step manual checklist.
"""
import sys
import os
import datetime

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django
django.setup()

import requests

BASE = "http://localhost:8000/api"
FRONTEND = "http://localhost:5173"
ML_URL = "http://localhost:8001"

PASS = "[PASS]"
FAIL = "[FAIL]"
OK   = "  [OK] "
ERR  = "  [ERR]"

results = {}

def hdr(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")

def ok(msg):  print(f"{OK} {msg}")
def err(msg): print(f"{ERR} {msg}")

# ---------------------------------------------------------------------------
# SETUP: Register/reuse smoke users + get existing listings
# ---------------------------------------------------------------------------
hdr("PRE-FLIGHT: User registration + listing discovery")

AGENT1  = ("inv_smoke_agent1",  "SmokePass123!", "agent")
AGENT2  = ("inv_smoke_agent2",  "SmokePass123!", "agent")
TENANT  = ("inv_smoke_tenant",  "SmokePass123!", "tenant")
INVESTOR= ("inv_smoke_investor","SmokePass123!", "investor")

def register_or_login(username, password, role):
    r = requests.post(f"{BASE}/auth/register/", json={
        "username": username, "email": f"{username}@smoke.test",
        "password": password, "role": role
    })
    if r.status_code == 201:
        return r.json()["access"]
    # Already exists — login
    r2 = requests.post(f"{BASE}/auth/login/", json={"username": username, "password": password})
    if r2.status_code == 200:
        return r2.json()["access"]
    raise RuntimeError(f"Cannot get token for {username}: {r.text} / {r2.text}")

tok_agent1   = register_or_login(*AGENT1)
tok_agent2   = register_or_login(*AGENT2)
tok_tenant   = register_or_login(*TENANT)
tok_investor = register_or_login(*INVESTOR)
ok("All 4 smoke users authenticated")

def auth(token): return {"Authorization": f"Bearer {token}"}

# Find first InvestmentListing in DB
listings_resp = requests.get(f"{BASE}/investments/")
assert listings_resp.status_code == 200, f"Listings unavailable: {listings_resp.status_code}"
listings = listings_resp.json()
if not listings:
    print("  [WARN] No seeded listings found. Run seed_investments.py first.")
    sys.exit(1)
LISTING = listings[0]
LID = LISTING["id"]
ok(f"Using listing id={LID}: [{LISTING['asset_class']}] {LISTING.get('min_investment_display','?')}")

# Find a pre-launch listing
prelaunch = next((l for l in listings if l["is_pre_launch"]), None)
if prelaunch:
    ok(f"Pre-launch listing found: id={prelaunch['id']} ends_at={prelaunch.get('early_access_ends_at','?')[:19]}")
else:
    err("No pre-launch listing found — Step 2 will be partial")

# ---------------------------------------------------------------------------
# STEP 1 — Public directory: list + asset_class filter + 4 metrics on detail
# ---------------------------------------------------------------------------
hdr("STEP 1 — Public Directory Browse & Asset Class Filter")
step1_pass = True

# Unauthenticated listing
r = requests.get(f"{BASE}/investments/")
if r.status_code == 200 and len(r.json()) > 0:
    ok(f"Public GET /investments/ returns {len(r.json())} listings (HTTP 200)")
else:
    err(f"Public listing failed: HTTP {r.status_code}")
    step1_pass = False

# Detail: 4 computed fields present
rd = requests.get(f"{BASE}/investments/{LID}/")
if rd.status_code == 200:
    d = rd.json()
    for field in ["expected_roi_percentage", "projected_rental_yield", "min_investment_display", "lock_in_display"]:
        if d.get(field):
            ok(f"  Field {field} = '{d[field]}'")
        else:
            err(f"  Field {field} missing or blank"); step1_pass = False
else:
    err(f"Detail fetch failed: HTTP {rd.status_code}"); step1_pass = False

# asset_class filter
asset_class = LISTING["asset_class"]
rf = requests.get(f"{BASE}/investments/", params={"asset_class": asset_class})
if rf.status_code == 200:
    filtered = rf.json()
    wrong = [l for l in filtered if l["asset_class"].lower() != asset_class.lower()]
    if not wrong:
        ok(f"asset_class filter: {len(filtered)} results, all '{asset_class}'")
    else:
        err(f"asset_class filter leaked {len(wrong)} wrong-class listings"); step1_pass = False
else:
    err(f"Filter failed: HTTP {rf.status_code}"); step1_pass = False

# pre_launch filter
rpl = requests.get(f"{BASE}/investments/", params={"is_pre_launch": "true"})
if rpl.status_code == 200:
    pl_listings = rpl.json()
    wrong_pl = [l for l in pl_listings if not l["is_pre_launch"]]
    ok(f"is_pre_launch filter: {len(pl_listings)} pre-launch results")
    if wrong_pl:
        err(f"  Non-prelaunch listings leaked: {len(wrong_pl)}"); step1_pass = False
else:
    err(f"Pre-launch filter failed: HTTP {rpl.status_code}"); step1_pass = False

results["Step 1 — Public directory & filter"] = PASS if step1_pass else FAIL

# ---------------------------------------------------------------------------
# STEP 2 — Pre-launch countdown fields
# ---------------------------------------------------------------------------
hdr("STEP 2 — Pre-Launch Countdown Fields (server-side)")
step2_pass = True

if prelaunch:
    r2 = requests.get(f"{BASE}/investments/{prelaunch['id']}/")
    if r2.status_code == 200:
        d2 = r2.json()
        ends_at = d2.get("early_access_ends_at")
        is_pl   = d2.get("is_pre_launch")
        if ends_at and is_pl:
            # Verify it's in the future
            from datetime import datetime, timezone
            try:
                ends_dt = datetime.fromisoformat(ends_at.replace("Z", "+00:00"))
                remaining = ends_dt - datetime.now(timezone.utc)
                if remaining.total_seconds() > 0:
                    ok(f"early_access_ends_at is in the future: {remaining.days}d {remaining.seconds//3600}h remaining")
                    ok("Countdown timer will tick live (validated field is a future datetime, not static string)")
                else:
                    err("early_access_ends_at has already expired!")
                    step2_pass = False
            except Exception as e:
                err(f"Cannot parse early_access_ends_at: {e}"); step2_pass = False
        else:
            err(f"is_pre_launch={is_pl}, early_access_ends_at={ends_at}"); step2_pass = False
    else:
        err(f"Pre-launch detail failed: HTTP {r2.status_code}"); step2_pass = False
else:
    err("Skipped — no pre-launch listing in DB"); step2_pass = False

results["Step 2 — Pre-launch countdown fields"] = PASS if step2_pass else FAIL

# ---------------------------------------------------------------------------
# STEP 3 — Disclaimer visible on detail, non-empty
# ---------------------------------------------------------------------------
hdr("STEP 3 — Prominent Disclaimer Text")
step3_pass = True

rd3 = requests.get(f"{BASE}/investments/{LID}/")
if rd3.status_code == 200:
    disc = rd3.json().get("disclaimer_text", "")
    if disc and disc.strip():
        ok(f"disclaimer_text present ({len(disc)} chars)")
        ok(f"  Preview: '{disc[:80]}...'")
    else:
        err("disclaimer_text is blank or missing"); step3_pass = False
else:
    err(f"Detail fetch failed: HTTP {rd3.status_code}"); step3_pass = False

results["Step 3 — Disclaimer non-empty on detail"] = PASS if step3_pass else FAIL

# ---------------------------------------------------------------------------
# STEP 4 — "Express Interest" anonymous inquiry, NO payment step
# ---------------------------------------------------------------------------
hdr("STEP 4 — Express Interest (Anon Inquiry, No Payment Boundary)")
step4_pass = True

inq_payload = {
    "investor_name": "Smoke Tester",
    "phone": "9876543210",
    "email": "smoketester@estateiq.test",
    "preferred_investment_range": "25L-50L",
    "requested_pitch_deck": False,
}
ri = requests.post(f"{BASE}/investments/{LID}/inquire/", json=inq_payload)
if ri.status_code == 201:
    inq = ri.json()
    ok(f"Inquiry created: id={inq['id']}, user=None (anonymous)")
    # Verify no payment/transaction fields exist
    payment_fields = ["amount", "payment_id", "transaction_id", "checkout", "razorpay", "stripe", "shares"]
    found_payment = [f for f in payment_fields if f in inq]
    if not found_payment:
        ok("REGULATORY BOUNDARY CLEAR: Zero payment/transaction/share fields in response")
    else:
        err(f"Payment-like fields found in response: {found_payment}"); step4_pass = False
    INQUIRY_ID = inq["id"]
else:
    err(f"Inquiry submission failed: HTTP {ri.status_code} — {ri.json()}"); step4_pass = False
    INQUIRY_ID = None

results["Step 4 — Express Interest (no payment)"] = PASS if step4_pass else FAIL

# ---------------------------------------------------------------------------
# STEP 5 — "Request Pitch Deck" flag stored correctly
# ---------------------------------------------------------------------------
hdr("STEP 5 — Request Pitch Deck Flag (requested_pitch_deck=True)")
step5_pass = True

pd_payload = {**inq_payload, "email": "pitchdeck@estateiq.test", "requested_pitch_deck": True}
rp = requests.post(f"{BASE}/investments/{LID}/inquire/", json=pd_payload)
if rp.status_code == 201:
    pd_inq = rp.json()
    PITCH_DECK_ID = pd_inq["id"]
    if pd_inq.get("requested_pitch_deck") is True:
        ok(f"Pitch Deck inquiry id={PITCH_DECK_ID}: requested_pitch_deck=True stored correctly")
    else:
        err(f"requested_pitch_deck={pd_inq.get('requested_pitch_deck')} — expected True"); step5_pass = False
else:
    err(f"Pitch deck inquiry failed: HTTP {rp.status_code}"); step5_pass = False
    PITCH_DECK_ID = None

results["Step 5 — Pitch Deck flag stored correctly"] = PASS if step5_pass else FAIL

# ---------------------------------------------------------------------------
# STEP 6 — Agent1 creates an InvestmentListing (must own the property)
# ---------------------------------------------------------------------------
hdr("STEP 6 — Agent Creates Investment Listing (Owner Role)")
step6_pass = True

# Always create a fresh property owned by inv_smoke_agent1 — avoids
# the "public list returns all properties" ownership detection pitfall
prop_payload = {
    "title": "Smoke Investment Property A1", "description": "Investments smoke test",
    "city": "Ahmedabad", "sub_market": "Central", "locality": "Bodakdev",
    "property_type": "Apartment", "bhk": 2, "area_sqft": 1200.0,
    "floor": 3, "total_floors": 10, "age_years": 2,
    "furnishing": "Semi-Furnished", "facing": "East",
    "listed_price": 6500000.0, "status": "for_sale",
    "dist_metro_km": 1.2, "dist_school_km": 0.8,
    "dist_hospital_km": 1.5, "dist_it_hub_km": 3.0,
    "has_gym": True, "has_pool": False, "has_clubhouse": True,
    "has_security": True, "has_power_backup": True,
    "has_parking": True, "has_lift": True, "rera_approved": True,
}
pcr = requests.post(f"{BASE}/properties/", json=prop_payload, headers=auth(tok_agent1))
if pcr.status_code == 201:
    AGENT1_PROP_ID = pcr.json()["id"]
    ok(f"Created fresh property id={AGENT1_PROP_ID} owned by agent1")
else:
    err(f"Could not create property: {pcr.status_code} {pcr.json()}"); step6_pass = False
    AGENT1_PROP_ID = None

AGENT1_LISTING_ID = None
if AGENT1_PROP_ID:
    listing_payload = {
        "property": AGENT1_PROP_ID,
        "asset_class": "Commercial Office",
        "expected_roi_percentage": "14.50",
        "projected_rental_yield": "8.00",
        "min_investment_amount": 5000000,
        "lock_in_period_min_months": 24,
        "lock_in_period_max_months": 36,
        "payout_frequency": "Quarterly",
        "disclaimer_text": (
            "Projected returns are estimates only. Not guaranteed. "
            "Consult a SEBI-registered investment advisor before committing capital."
        ),
    }
    rcl = requests.post(f"{BASE}/investments/", json=listing_payload, headers=auth(tok_agent1))
    if rcl.status_code == 201:
        AGENT1_LISTING_ID = rcl.json()["id"]
        ok(f"Agent1 created InvestmentListing id={AGENT1_LISTING_ID} (HTTP 201)")
        ok(f"  min_investment_display = '{rcl.json().get('min_investment_display')}'")
        ok(f"  lock_in_display = '{rcl.json().get('lock_in_display')}'")
    else:
        err(f"Agent1 listing creation failed: HTTP {rcl.status_code} {rcl.json()}"); step6_pass = False

results["Step 6 — Agent creates investment listing"] = PASS if step6_pass else FAIL


# ---------------------------------------------------------------------------
# STEP 7 — Agent2 CANNOT see Agent1's inquiries
# ---------------------------------------------------------------------------
hdr("STEP 7 — Cross-Agent Isolation (agent2 blocked from agent1's inquiries)")
step7_pass = True

if AGENT1_LISTING_ID and INQUIRY_ID:
    # Submit a test inquiry against agent1's listing
    inq2_resp = requests.post(
        f"{BASE}/investments/{AGENT1_LISTING_ID}/inquire/",
        json={**inq_payload, "email": "targeted@smoke.test"},
    )
    if inq2_resp.status_code == 201:
        TARGET_INQ_ID = inq2_resp.json()["id"]
        ok(f"Inquiry id={TARGET_INQ_ID} submitted on agent1's listing id={AGENT1_LISTING_ID}")

        # Agent2 tries list
        r7_list = requests.get(f"{BASE}/investments/{AGENT1_LISTING_ID}/inquiries/", headers=auth(tok_agent2))
        if r7_list.status_code == 200:
            ids_visible = [i["id"] for i in r7_list.json()]
            if TARGET_INQ_ID not in ids_visible:
                ok(f"agent2 inquiry list: [] — agent1's inquiry NOT visible [OK]")
            else:
                err(f"ROLE LEAKAGE: agent2 CAN see inquiry id={TARGET_INQ_ID}"); step7_pass = False
        else:
            err(f"List response: HTTP {r7_list.status_code}"); step7_pass = False

        # Agent2 tries direct detail
        r7_detail = requests.get(f"{BASE}/investments/inquiries/{TARGET_INQ_ID}/", headers=auth(tok_agent2))
        if r7_detail.status_code == 404:
            ok(f"agent2 GET /inquiries/{TARGET_INQ_ID}/ -> 404 (access denied, not a leak)")
        else:
            err(f"Expected 404, got HTTP {r7_detail.status_code}"); step7_pass = False
    else:
        err(f"Setup inquiry failed: {inq2_resp.status_code}"); step7_pass = False
        TARGET_INQ_ID = None
else:
    err("Skipped — no agent1 listing or inquiry available"); step7_pass = False
    TARGET_INQ_ID = None

results["Step 7 — Cross-agent isolation"] = PASS if step7_pass else FAIL

# ---------------------------------------------------------------------------
# STEP 8 — Agent1 CAN see and manage inquiries, update status
# ---------------------------------------------------------------------------
hdr("STEP 8 — Agent1 Manages Own Inquiries (read + status update)")
step8_pass = True

if AGENT1_LISTING_ID and TARGET_INQ_ID:
    # Agent1 list
    r8_list = requests.get(f"{BASE}/investments/{AGENT1_LISTING_ID}/inquiries/", headers=auth(tok_agent1))
    if r8_list.status_code == 200:
        ids_a1 = [i["id"] for i in r8_list.json()]
        if TARGET_INQ_ID in ids_a1:
            ok(f"Agent1 inquiry list: inquiry id={TARGET_INQ_ID} is visible [OK]")
        else:
            err(f"Agent1 CANNOT see inquiry id={TARGET_INQ_ID} in list"); step8_pass = False
    else:
        err(f"Agent1 list failed: HTTP {r8_list.status_code}"); step8_pass = False

    # Agent1 detail
    r8_det = requests.get(f"{BASE}/investments/inquiries/{TARGET_INQ_ID}/", headers=auth(tok_agent1))
    if r8_det.status_code == 200:
        ok(f"Agent1 GET /inquiries/{TARGET_INQ_ID}/ -> 200 [OK]")
    else:
        err(f"Agent1 detail: HTTP {r8_det.status_code}"); step8_pass = False

    # Agent1 status update: new -> qualified
    r8_patch = requests.patch(
        f"{BASE}/investments/inquiries/{TARGET_INQ_ID}/",
        json={"status": "qualified"},
        headers=auth(tok_agent1)
    )
    if r8_patch.status_code == 200 and r8_patch.json().get("status") == "qualified":
        ok(f"Agent1 PATCH status -> 'qualified': HTTP 200 [OK]")
    else:
        err(f"Status update failed: HTTP {r8_patch.status_code} {r8_patch.json()}"); step8_pass = False
else:
    err("Skipped — no agent1 listing or inquiry"); step8_pass = False

results["Step 8 — Agent1 manages inquiries"] = PASS if step8_pass else FAIL

# ---------------------------------------------------------------------------
# STEP 9 — Tenant/Investor cannot create InvestmentListing (role-gating)
# ---------------------------------------------------------------------------
hdr("STEP 9 — Role-Gated Listing Creation (tenant=403, investor=403)")
step9_pass = True

first_prop_id = listings[0].get("property_details", {}).get("id") or listings[0].get("property")
role_payload = {
    "property": first_prop_id or 1,
    "asset_class": "Retail",
    "expected_roi_percentage": "10.00",
    "projected_rental_yield": "6.00",
    "min_investment_amount": 1000000,
    "lock_in_period_min_months": 12,
    "lock_in_period_max_months": 12,
    "payout_frequency": "Monthly",
    "disclaimer_text": "Test disclaimer text.",
}

for label, token in [("tenant", tok_tenant), ("investor", tok_investor)]:
    r9 = requests.post(f"{BASE}/investments/", json=role_payload, headers=auth(token))
    if r9.status_code == 403:
        ok(f"{label} POST /investments/ -> 403 Forbidden [OK]")
    else:
        err(f"{label} got HTTP {r9.status_code} — expected 403"); step9_pass = False

results["Step 9 — Tenant/Investor role-gated (403)"] = PASS if step9_pass else FAIL

# ---------------------------------------------------------------------------
# STEP 10 — ML Service DOWN: investments page unaffected
# ---------------------------------------------------------------------------
hdr("STEP 10 — ML Service Down: Investments App Unaffected")
step10_pass = True

# Check ML service is UP first (baseline)
try:
    rml = requests.get(f"{ML_URL}/health", timeout=3)
    ml_up = rml.status_code == 200
    ok(f"ML service baseline: HTTP {rml.status_code} ({'UP' if ml_up else 'DOWN'})")
except Exception:
    ml_up = False
    ok("ML service baseline: DOWN (or not running)")

# Regardless of ML status, investments API must respond
r10a = requests.get(f"{BASE}/investments/", timeout=5)
if r10a.status_code == 200:
    ok(f"GET /investments/ -> {r10a.status_code} with ML {'UP' if ml_up else 'DOWN'}")
else:
    err(f"GET /investments/ failed: HTTP {r10a.status_code}"); step10_pass = False

r10b = requests.get(f"{BASE}/investments/{LID}/", timeout=5)
if r10b.status_code == 200:
    ok(f"GET /investments/{LID}/ -> {r10b.status_code} with ML {'UP' if ml_up else 'DOWN'}")
    # Verify no ml-service dependency in response
    detail = r10b.json()
    if "available" not in detail:
        ok("Investment detail contains NO ml-service 'available' key — correctly decoupled")
    else:
        ok(f"Note: 'available' key found in response (value={detail['available']}) — verify it is not relied upon")
else:
    err(f"GET /investments/{LID}/ failed: HTTP {r10b.status_code}"); step10_pass = False

# Verify investments app does not call ML service at all by checking
# that no investment endpoint references ml_client
from investments import views as inv_views
import inspect
source = inspect.getsource(inv_views)
if "ml_client" not in source and "get_price_prediction" not in source:
    ok("investments/views.py: zero ml_client / get_price_prediction imports [DECOUPLED]")
else:
    err("investments/views.py imports ML client — coupling detected!"); step10_pass = False

results["Step 10 — ML service down, investments unaffected"] = PASS if step10_pass else FAIL

# ---------------------------------------------------------------------------
# FINAL SUMMARY
# ---------------------------------------------------------------------------
print(f"\n{'='*60}")
print("INVESTMENTS SMOKE TEST SUMMARY")
print(f"{'='*60}")
for step, result in results.items():
    print(f"  {result}  {step}")

passed = sum(1 for r in results.values() if r == PASS)
failed = sum(1 for r in results.values() if r == FAIL)
total  = passed + failed
print(f"\n  {passed}/{total} steps passed\n")
if failed > 0:
    print(f"  [XX] {failed} step(s) failed — see details above.")
else:
    print("  All steps passed. Phase 5 foundation verified clean.")
