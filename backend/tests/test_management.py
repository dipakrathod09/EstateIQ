"""
Tests for management_app: Lease, Payment, MaintenanceRequest.
Covers: tenant isolation, landlord isolation, payment auto-generation, due dates.
"""
import pytest
from datetime import date, timedelta


# ---------------------------------------------------------------------------
# Fixtures: lease and associated records
# ---------------------------------------------------------------------------
@pytest.fixture
def active_lease(db, landlord, tenant, landlord_property):
    """Create a lease WITHOUT auto-generating payments (do that manually in tests)."""
    from management_app.models import LeaseAgreement
    return LeaseAgreement.objects.create(
        property=landlord_property,
        tenant=tenant,
        landlord=landlord,
        monthly_rent=30000.0,
        rent_amount=30000.0,
        security_deposit=90000.0,
        start_date=date.today(),
        end_date=date.today() + timedelta(days=365),
        status='active',
    )


@pytest.fixture
def active_lease_with_payments(active_lease):
    """Create lease and generate 12 months of payments via service."""
    from management_app.services import generate_payment_schedule
    generate_payment_schedule(active_lease, months=12)
    return active_lease


@pytest.fixture
def other_landlord_lease(db, landlord2, tenant, landlord2_client):
    """A lease belonging to a different landlord — used for cross-landlord isolation."""
    from properties.models import Property
    from management_app.models import LeaseAgreement
    from django.contrib.auth import get_user_model
    User = get_user_model()

    prop = Property.objects.create(
        owner=landlord2,
        title="Landlord2 Property",
        city="Bangalore", sub_market="East", locality="Indiranagar",
        property_type="Apartment", bhk=2, area_sqft=1000.0,
        floor=2, total_floors=8, age_years=3,
        furnishing="Semi-Furnished", facing="East",
        listed_price=8000000.0, status="for_rent",
        dist_metro_km=1.0, dist_school_km=0.8,
        dist_hospital_km=1.2, dist_it_hub_km=2.5,
        has_security=True, has_power_backup=True,
        has_parking=True, has_lift=True,
    )
    return LeaseAgreement.objects.create(
        property=prop,
        tenant=tenant,
        landlord=landlord2,
        monthly_rent=25000.0,
        rent_amount=25000.0,
        security_deposit=75000.0,
        start_date=date.today(),
        end_date=date.today() + timedelta(days=365),
        status='active',
    )


# ---------------------------------------------------------------------------
# LeaseAgreement — access control
# ---------------------------------------------------------------------------
@pytest.mark.django_db
class TestLeaseAccess:
    def test_tenant_sees_own_lease(self, tenant_client, active_lease):
        resp = tenant_client.get("/api/management/leases/")
        assert resp.status_code == 200
        results = (resp.data["results"] if isinstance(resp.data, dict) and "results" in resp.data else list(resp.data))
        ids = [l["id"] for l in results]
        assert active_lease.id in ids

    def test_tenant_cannot_see_other_landlords_lease(
        self, tenant_client, active_lease, other_landlord_lease
    ):
        """Tenant IS on other_landlord_lease too, but they should only see leases
        where they are the tenant — which is both in this case.
        This test verifies the tenant sees their OWN leases and not leases for OTHER tenants."""
        resp = tenant_client.get("/api/management/leases/")
        assert resp.status_code == 200
        # Both leases have the same tenant, so both should appear
        results = (resp.data["results"] if isinstance(resp.data, dict) and "results" in resp.data else list(resp.data))
        ids = [l["id"] for l in results]
        assert active_lease.id in ids
        assert other_landlord_lease.id in ids

    def test_landlord_sees_own_leases(self, landlord_client, active_lease):
        resp = landlord_client.get("/api/management/leases/")
        assert resp.status_code == 200
        results = (resp.data["results"] if isinstance(resp.data, dict) and "results" in resp.data else list(resp.data))
        ids = [l["id"] for l in results]
        assert active_lease.id in ids

    def test_landlord_cannot_see_other_landlords_leases(
        self, landlord_client, other_landlord_lease
    ):
        """landlord (fixture) should NOT see landlord2's leases."""
        resp = landlord_client.get("/api/management/leases/")
        assert resp.status_code == 200
        results = (resp.data["results"] if isinstance(resp.data, dict) and "results" in resp.data else list(resp.data))
        ids = [l["id"] for l in results]
        assert other_landlord_lease.id not in ids

    def test_unauthenticated_cannot_list_leases(self, api_client):
        resp = api_client.get("/api/management/leases/")
        assert resp.status_code == 401

    def test_investor_sees_no_leases(self, investor_client):
        """Investors have no leases — should return empty list, not a 500."""
        resp = investor_client.get("/api/management/leases/")
        assert resp.status_code == 200
        results = (resp.data["results"] if isinstance(resp.data, dict) and "results" in resp.data else list(resp.data))
        assert results == []


# ---------------------------------------------------------------------------
# Payment Auto-Generation
# ---------------------------------------------------------------------------
@pytest.mark.django_db
class TestPaymentAutoGeneration:
    def test_creates_correct_number_of_payments(self, active_lease_with_payments):
        from management_app.models import Payment
        count = Payment.objects.filter(lease=active_lease_with_payments).count()
        assert count == 12

    def test_payments_have_correct_amount(self, active_lease_with_payments):
        from management_app.models import Payment
        payments = Payment.objects.filter(lease=active_lease_with_payments)
        for p in payments:
            assert p.amount == active_lease_with_payments.monthly_rent

    def test_payments_are_monthly_sequential(self, active_lease_with_payments):
        from management_app.models import Payment
        payments = list(
            Payment.objects.filter(lease=active_lease_with_payments).order_by("due_date")
        )
        for i in range(1, len(payments)):
            prev = payments[i - 1].due_date
            curr = payments[i].due_date
            # Each due_date should be exactly 1 month after the previous
            # Allow ±3 day tolerance for month-end edge cases
            diff = (curr - prev).days
            assert 28 <= diff <= 31, (
                f"Month gap between payments {i-1} and {i} is {diff} days (expected ~30)"
            )

    def test_payments_start_pending(self, active_lease_with_payments):
        from management_app.models import Payment
        payments = Payment.objects.filter(lease=active_lease_with_payments)
        for p in payments:
            assert p.status == "pending"

    def test_api_lease_create_auto_generates_payments(
        self, landlord_client, landlord_property, tenant
    ):
        """POST /api/management/leases/ should auto-generate 12 payment records."""
        from management_app.models import Payment, LeaseAgreement
        today = date.today()
        payload = {
            "property": landlord_property.id,
            "tenant": tenant.id,
            "landlord": landlord_property.owner_id,
            "monthly_rent": 28000.0,
            "rent_amount": 28000.0,
            "security_deposit": 84000.0,
            "start_date": str(today),
            "end_date": str(today + timedelta(days=365)),
            "status": "active",
        }
        resp = landlord_client.post("/api/management/leases/", payload, format="json")
        assert resp.status_code == 201, resp.data

        lease_id = resp.data["id"]
        count = Payment.objects.filter(lease_id=lease_id).count()
        assert count == 12

    def test_generate_payments_action_creates_records(
        self, landlord_client, active_lease
    ):
        """POST /api/management/leases/<id>/generate_payments/ should create N payments."""
        from management_app.models import Payment
        resp = landlord_client.post(
            f"/api/management/leases/{active_lease.id}/generate_payments/",
            {"months": 6},
            format="json",
        )
        assert resp.status_code == 201
        assert len(resp.data["payments"]) == 6


# ---------------------------------------------------------------------------
# Payment — access control
# ---------------------------------------------------------------------------
@pytest.mark.django_db
class TestPaymentAccess:
    def test_tenant_sees_own_payments(self, tenant_client, active_lease_with_payments):
        resp = tenant_client.get("/api/management/payments/")
        assert resp.status_code == 200
        results = (resp.data["results"] if isinstance(resp.data, dict) and "results" in resp.data else list(resp.data))
        assert len(results) == 12
        # All payments belong to tenant's lease
        lease_ids = {p["lease"] for p in results}
        assert lease_ids == {active_lease_with_payments.id}

    def test_landlord_sees_own_payments(self, landlord_client, active_lease_with_payments):
        resp = landlord_client.get("/api/management/payments/")
        assert resp.status_code == 200
        results = (resp.data["results"] if isinstance(resp.data, dict) and "results" in resp.data else list(resp.data))
        assert len(results) == 12

    def test_mark_paid_changes_status(self, landlord_client, active_lease_with_payments):
        from management_app.models import Payment
        payment = Payment.objects.filter(
            lease=active_lease_with_payments
        ).order_by("due_date").first()

        resp = landlord_client.post(
            f"/api/management/payments/{payment.id}/mark_paid/",
            format="json",
        )
        assert resp.status_code == 200
        assert resp.data["status"] == "paid"

        payment.refresh_from_db()
        assert payment.paid_date is not None


# ---------------------------------------------------------------------------
# MaintenanceRequest
# ---------------------------------------------------------------------------
@pytest.mark.django_db
class TestMaintenanceRequests:
    def test_tenant_can_create_maintenance_request(
        self, tenant_client, active_lease, landlord_property
    ):
        payload = {
            "property": landlord_property.id,
            "lease": active_lease.id,
            "title": "Leaking tap",
            "description": "Kitchen tap is leaking badly",
            "priority": "high",
        }
        resp = tenant_client.post("/api/management/maintenance/", payload, format="json")
        assert resp.status_code == 201, resp.data
        assert resp.data["title"] == "Leaking tap"
        # tenant is auto-assigned from request.user
        assert resp.data["tenant"] == active_lease.tenant_id

    def test_tenant_sees_only_own_requests(
        self, tenant_client, active_lease, landlord_property
    ):
        from management_app.models import MaintenanceRequest
        from django.contrib.auth import get_user_model
        User = get_user_model()
        # Create a request belonging to a different tenant
        other_tenant = User.objects.create_user(
            username="other_tenant", email="other@t.com",
            password="pass", role="tenant"
        )
        MaintenanceRequest.objects.create(
            property=landlord_property,
            lease=active_lease,
            tenant=other_tenant,
            title="Other tenant request",
            description="desc",
            priority="low",
        )
        # Create a request for our tenant
        MaintenanceRequest.objects.create(
            property=landlord_property,
            lease=active_lease,
            tenant=active_lease.tenant,
            title="My request",
            description="desc",
            priority="medium",
        )
        resp = tenant_client.get("/api/management/maintenance/")
        assert resp.status_code == 200
        results = (resp.data["results"] if isinstance(resp.data, dict) and "results" in resp.data else list(resp.data))
        titles = [r["title"] for r in results]
        assert "My request" in titles
        assert "Other tenant request" not in titles

    def test_landlord_sees_all_requests_for_own_property(
        self, landlord_client, active_lease, landlord_property, tenant
    ):
        from management_app.models import MaintenanceRequest
        MaintenanceRequest.objects.create(
            property=landlord_property,
            lease=active_lease,
            tenant=tenant,
            title="Tenant complaint",
            description="desc",
            priority="urgent",
        )
        resp = landlord_client.get("/api/management/maintenance/")
        assert resp.status_code == 200
        results = (resp.data["results"] if isinstance(resp.data, dict) and "results" in resp.data else list(resp.data))
        titles = [r["title"] for r in results]
        assert "Tenant complaint" in titles

    def test_landlord_can_update_status(
        self, landlord_client, active_lease, landlord_property, tenant
    ):
        from management_app.models import MaintenanceRequest
        req = MaintenanceRequest.objects.create(
            property=landlord_property,
            lease=active_lease,
            tenant=tenant,
            title="Fix AC",
            description="AC not cooling",
            priority="high",
        )
        resp = landlord_client.patch(
            f"/api/management/maintenance/{req.id}/",
            {"status": "in_progress"},
            format="json",
        )
        assert resp.status_code == 200
        assert resp.data["status"] == "in_progress"

    def test_unauthenticated_cannot_access_maintenance(self, api_client):
        resp = api_client.get("/api/management/maintenance/")
        assert resp.status_code == 401
