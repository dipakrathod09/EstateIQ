# EstateIQ — Manual Regression Smoke-Test Checklist
*Phase 1–4: Core, CRM, Property Management, ML Integration*

> Run these in order. Each step has a **Success Criteria** so you know whether it passed or not.

---

## Prerequisites
- All three services are running:
  ```bash
  # Terminal 1 — ML Microservice (port 8001)
  cd ml-service && python -m uvicorn main:app --host 0.0.0.0 --port 8001

  # Terminal 2 — Django Backend (port 8000)
  cd backend && python manage.py runserver 8000

  # Terminal 3 — React Frontend (port 5173)
  cd frontend && npm run dev
  ```
- Open browser to `http://localhost:5173` in an **incognito/private window** for the unauthenticated steps.

---

## Step 1 — Register All 5 Roles

Go to `http://localhost:5173/register` and create **5 separate accounts** (use different browsers or incognito windows to keep sessions separate):

| Account | Username | Role to Select |
|---|---|---|
| A | `test_agent` | Agent |
| B | `test_agent2` | Agent |
| C | `test_tenant` | Tenant |
| D | `test_landlord` | Landlord |
| E | `test_investor` | Investor |

**✅ Success:** Each registration redirects to the dashboard and shows the correct role badge (e.g. "Agent Dashboard", "Tenant Dashboard"). No 500 errors.

**❌ Failure:** Form submits but stays on the registration page, or shows an error toast, or dashboard shows wrong role.

---

## Step 2 — Agent: Create a Property Listing

Log in as `test_agent`. Go to **Dashboard → My Properties tab → "Add New Property"**.

Fill in:
- Title: `Regression Test Property`
- City: `Ahmedabad`, Locality: `Bodakdev`
- BHK: `3`, Area: `1500` sqft, Listed Price: `₹85,00,000`
- Enable: Has Gym, Has Parking, RERA Approved

Click **"List Property"**.

**✅ Success:** 
- Modal closes, property appears in the "My Properties" tab.
- The card shows a **deal_tag badge** (`Good Deal` / `Fair Price` / `Overpriced`) — this confirms the ML service was called during creation.

**❌ Failure:** Toast error, no card appears, or card has no deal_tag badge (ML service not connected).

---

## Step 3 — Public: Search/Filter + Property Detail with ML Card

Log out (or use incognito). Go to `http://localhost:5173/properties`.

3a. **Search/Filter:** Apply filter `City = Ahmedabad`. Confirm `Regression Test Property` appears in results.

3b. **Click on the property.** On the detail page, verify:
- The hero image, title, specs (BHK, sqft, floor) all load.
- The **"Estimated Market Value" dark card** appears in the right sidebar with:
  - A `₹X.XX Cr` predicted price
  - A confidence score percentage (e.g. `94%`)
  - A deal tag badge
- The **"Similar Properties"** section appears at the bottom with up to 5 cards.

**✅ Success:** All 3 elements (property data, ML valuation card, similar properties section) load without any error messages or blank spaces.

**❌ Failure:** ML card shows "unavailable" or is missing entirely while ml-service IS running, or similar properties section is blank.

---

## Step 4 — Agent: CRM — Create Lead, Move Through Pipeline, Add Note

Log in as `test_agent`. Go to `http://localhost:5173/dashboard` → **Inquiries tab**.

4a. **Simulate a lead:** Open the `Regression Test Property` detail page. Scroll to "Schedule Site Visit" form and submit an inquiry (use name "Test Buyer", phone "9876543210").

4b. **Back in Dashboard → Inquiries:** The new inquiry should appear with status `New`.

4c. **Change status:** Click the inquiry card or PATCH via the status dropdown — change it to `Contacted`, then `Closed`.

**✅ Success:** Inquiry moves through `new → contacted → closed` without page errors. Status updates persist after page refresh.

**❌ Failure:** Status reverts after refresh, or PATCH returns 403/500.

---

## Step 5 — Agent Isolation: agent2 Cannot See agent's Inquiries

Log in as `test_agent2`. Go to Dashboard → Inquiries tab.

**✅ Success:** The inquiry created in Step 4 by `test_agent` does **NOT** appear in `test_agent2`'s list. The list should be empty or only contain inquiries on `test_agent2`'s own properties.

**❌ Failure:** `test_agent2` can see `test_agent`'s inquiries — this is a **role-leakage bug**.

---

## Step 6 — Landlord: Create a Lease + Verify Payment Auto-Generation

Log in as `test_landlord`. 

6a. If `test_landlord` doesn't own any properties yet, first create one via Dashboard.

6b. Go to **Dashboard → Lease Management tab → "Create New Lease"**. Fill in:
- Property: (select your landlord property)
- Tenant: `test_tenant`
- Monthly Rent: `₹25,000`
- Start Date: today, End Date: 1 year from today

Click **"Create Lease"**.

**✅ Success:** 
- Lease appears in the list with status `Active`.
- Click into the lease — verify **12 payment records** appear, each with `Pending` status and sequential monthly due dates.

**❌ Failure:** Lease created but 0 payments appear, or fewer than 12, or due dates are not ~1 month apart.

---

## Step 7 — Tenant: View Lease, Payments, Submit Maintenance Request

Log in as `test_tenant`. Go to `http://localhost:5173/dashboard/tenant` (or the Tenant Dashboard).

7a. **Verify lease is visible:** The lease created in Step 6 should appear with the property name, monthly rent, and lease dates.

7b. **Verify payments are visible:** The upcoming payment(s) should show as `Pending` with the correct due date and amount (₹25,000).

7c. **Submit a maintenance request:** Click "Submit Maintenance Request". Fill in:
- Title: `AC not cooling`
- Priority: `High`
- Description: `The bedroom AC stopped working`

Click Submit.

**✅ Success:** Request appears in the tenant's "My Maintenance Requests" list with status `Open`.

**❌ Failure:** Form submits but no request appears, or tenant can see other tenants' requests.

---

## Step 8 — Landlord: View & Update Maintenance Request

Log back in as `test_landlord`. Go to Dashboard → Maintenance Requests.

8a. **Verify request is visible:** `AC not cooling` submitted by `test_tenant` in Step 7 should appear.

8b. **Update status:** Change the status from `Open` → `In Progress`.

**✅ Success:** Status updates and saves. The `test_tenant` should see the updated status too (verify by switching back to tenant account).

**❌ Failure:** Request not visible to landlord, or status PATCH returns 403/500.

---

## Step 9 — Tenant: Try Accessing Blocked Routes

Still logged in as `test_tenant`. Try these URLs directly in the browser address bar:

| URL | Expected Result |
|---|---|
| `http://localhost:5173/dashboard/crm` | Redirect to tenant dashboard OR blank/forbidden page — **NOT** the CRM pipeline UI |
| `http://localhost:5173/dashboard/landlord` | Redirect to tenant dashboard OR blank/forbidden page — **NOT** lease management UI |

**✅ Success:** Tenant is redirected away or sees a "Not authorised" message. They do **not** see actual CRM lead data or landlord lease data belonging to other users.

**❌ Failure:** Tenant can fully access `/dashboard/crm` or `/dashboard/landlord` and sees real data — this is a **role-leakage bug** requiring an immediate fix to the React route guards.

---

## Step 10 — Graceful Degradation: ML Service Down

10a. **Stop the ml-service** process (Ctrl+C in Terminal 1).

10b. **Hard-reload** the property detail page for `Regression Test Property` (Ctrl+Shift+R).

10c. Observe the right sidebar.

**✅ Success:** The page loads fully. The "Estimated Market Value" dark card is **simply absent** (hidden). No error message, no broken UI, no spinner stuck forever. All other sections (description, location, contact form, similar properties) still work normally.

**❌ Failure:** 
- The page shows a red error toast or "500 Server Error" — means Django is crashing when the ML service is unreachable.
- The card shows "Error" or "Unavailable" text in a broken-looking state — means the frontend needs better graceful handling.
- Page fails to load at all.

---

## Summary: What Each Failure Means

| Failure | Severity | Root Cause Area |
|---|---|---|
| Registration stays on page | 🔴 Critical | `accounts/views.py` serializer or URL |
| Deal tag missing on card | 🟡 Medium | ML service not running or `ml_client.py` payload error |
| ML card shows error (service down) | 🔴 Critical | Django not catching `requests.exceptions` in `get_price_prediction()` |
| Agent2 sees agent's leads | 🔴 Critical | `InquiryListCreateView.get_queryset()` filter bug |
| 0 payment records on lease | 🔴 Critical | `generate_payment_schedule()` not called in `perform_create()` |
| Tenant can see other tenants' requests | 🔴 Critical | `MaintenanceRequestViewSet.get_queryset()` filter bug |
| Tenant accesses `/dashboard/crm` | 🔴 Critical | Missing `PrivateRoute` role guard in React `App.jsx` |
| Status update reverts after refresh | 🟡 Medium | PATCH not persisting — serializer `read_only_fields` issue |
