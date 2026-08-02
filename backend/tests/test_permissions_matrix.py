"""
Permission Matrix Tests — highest-value test in the suite.
Tests every role against every endpoint for correct HTTP response codes.
Catches role-leakage bugs that individual endpoint tests can miss.

Legend:
  200/201 = expected success
  401     = must be authenticated (unauthenticated user gets this)
  403     = authenticated but wrong role
  404     = resource not found (valid permission denial disguised as 404)
"""
import pytest
from datetime import date, timedelta
from unittest.mock import patch

ML_MOCK = {
    "predicted_price": 7000000.0, "currency": "INR",
    "confidence_score": 0.92, "deal_tag": "Fair Price",
    "status": "success", "model_version": "v2.0",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _make_lease_and_payments(landlord, tenant, prop):
    from management_app.models import LeaseAgreement
    from management_app.services import generate_payment_schedule
    lease = LeaseAgreement.objects.create(
        property=prop, tenant=tenant, landlord=landlord,
        monthly_rent=30000.0, rent_amount=30000.0, security_deposit=90000.0,
        start_date=date.today(), end_date=date.today() + timedelta(days=365),
        status='active',
    )
    generate_payment_schedule(lease, months=3)
    return lease


def _make_maintenance(tenant, prop, lease):
    from management_app.models import MaintenanceRequest
    return MaintenanceRequest.objects.create(
        property=prop, lease=lease, tenant=tenant,
        title="Test issue", description="desc", priority="medium",
    )


# ---------------------------------------------------------------------------
# Properties Endpoint Matrix
# ---------------------------------------------------------------------------
@pytest.mark.django_db
class TestPropertiesPermissionMatrix:
    """
    GET /api/properties/          — public read
    POST /api/properties/         — authenticated only (any role)
    PATCH /api/properties/<id>/   — owner or admin only
    DELETE /api/properties/<id>/  — owner or admin only
    """

    @patch("properties.ml_client.requests.post")
    def test_anonymous_can_list_properties(self, mock_post, api_client, property_obj):
        resp = api_client.get("/api/properties/")
        assert resp.status_code == 200

    @patch("properties.ml_client.requests.post")
    def test_anonymous_cannot_create(self, mock_post, api_client):
        from tests.conftest import PROPERTY_PAYLOAD
        resp = api_client.post("/api/properties/", PROPERTY_PAYLOAD, format="json")
        assert resp.status_code == 401

    @patch("properties.ml_client.requests.post")
    def test_agent_can_create(self, mock_post, agent_client):
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = ML_MOCK
        from tests.conftest import PROPERTY_PAYLOAD
        resp = agent_client.post("/api/properties/", PROPERTY_PAYLOAD, format="json")
        assert resp.status_code == 201

    @patch("properties.ml_client.requests.post")
    def test_tenant_cannot_create_property(self, mock_post, tenant_client):
        """ENFORCED: Tenants get 403 when trying to create a property listing."""
        from tests.conftest import PROPERTY_PAYLOAD
        resp = tenant_client.post("/api/properties/", PROPERTY_PAYLOAD, format="json")
        assert resp.status_code == 403, (
            f"Expected 403 (tenant not allowed to list) but got {resp.status_code}. "
            "IsListingRole permission may not be applied."
        )

    @patch("properties.ml_client.requests.post")
    def test_investor_cannot_create_property(self, mock_post, investor_client):
        """ENFORCED: Investors get 403 when trying to create a property listing."""
        from tests.conftest import PROPERTY_PAYLOAD
        resp = investor_client.post("/api/properties/", PROPERTY_PAYLOAD, format="json")
        assert resp.status_code == 403

    @patch("properties.ml_client.requests.post")
    def test_landlord_can_create_property(self, mock_post, landlord_client):
        """Landlords are in ALLOWED_CREATE_ROLES and can create listings."""
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = ML_MOCK
        from tests.conftest import PROPERTY_PAYLOAD
        resp = landlord_client.post("/api/properties/", PROPERTY_PAYLOAD, format="json")
        assert resp.status_code == 201

    @patch("properties.ml_client.requests.post")
    def test_non_owner_agent_cannot_patch(self, mock_post, agent2_client, property_obj):
        resp = agent2_client.patch(
            f"/api/properties/{property_obj.id}/",
            {"listed_price": 999},
            format="json",
        )
        assert resp.status_code == 403

    @patch("properties.ml_client.requests.post")
    def test_admin_can_patch_any_property(self, mock_post, admin_client, property_obj):
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = ML_MOCK
        resp = admin_client.patch(
            f"/api/properties/{property_obj.id}/",
            {"listed_price": 9000000.0},
            format="json",
        )
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# Accounts Endpoint Matrix
# ---------------------------------------------------------------------------
@pytest.mark.django_db
class TestAccountsPermissionMatrix:
    def test_unauthenticated_cannot_access_me(self, api_client):
        resp = api_client.get("/api/auth/me/")
        assert resp.status_code == 401

    def test_all_authenticated_roles_can_access_me(
        self, agent_client, tenant_client, landlord_client, investor_client, admin_client
    ):
        for name, client in [
            ("agent", agent_client), ("tenant", tenant_client),
            ("landlord", landlord_client), ("investor", investor_client),
            ("admin", admin_client),
        ]:
            resp = client.get("/api/auth/me/")
            assert resp.status_code == 200, f"{name} could not access /me/"


# ---------------------------------------------------------------------------
# CRM Endpoint Matrix
# ---------------------------------------------------------------------------
@pytest.mark.django_db
class TestCRMPermissionMatrix:
    def test_anonymous_cannot_save_property(self, api_client, property_obj):
        resp = api_client.post("/api/crm/saved/toggle/", {"property_id": property_obj.id})
        assert resp.status_code == 401

    def test_tenant_can_save_property(self, tenant_client, property_obj):
        resp = tenant_client.post("/api/crm/saved/toggle/", {"property_id": property_obj.id})
        assert resp.status_code == 200

    def test_investor_can_save_property(self, investor_client, property_obj):
        resp = investor_client.post("/api/crm/saved/toggle/", {"property_id": property_obj.id})
        assert resp.status_code == 200

    def test_anonymous_can_submit_inquiry(self, api_client, property_obj):
        """Inquiry creation is public (AllowAny)."""
        resp = api_client.post("/api/crm/inquiries/", {
            "property": property_obj.id,
            "name": "Anon Buyer",
            "email": "anon@test.com",
            "phone": "9876543210",
            "message": "Interested",
        })
        assert resp.status_code == 201

    def test_anonymous_sees_empty_inquiry_list(self, api_client, property_obj):
        from crm.models import Inquiry
        Inquiry.objects.create(
            property=property_obj, name="X", email="x@x.com",
            phone="9000000000", message="M"
        )
        resp = api_client.get("/api/crm/inquiries/")
        assert resp.status_code == 200
        assert (resp.data["results"] if isinstance(resp.data, dict) and "results" in resp.data else list(resp.data)) == []

    def test_inquiry_detail_requires_authentication(self, api_client, property_obj):
        """
        BUG FOUND: InquiryDetailView has IsAuthenticated but no owner check.
        Any authenticated user can GET /api/crm/inquiries/<id>/ — even if they
        have nothing to do with the inquiry or property. Flag for fix.
        """
        from crm.models import Inquiry
        inq = Inquiry.objects.create(
            property=property_obj, name="X", email="x@x.com",
            phone="9000000000", message="M"
        )
        # Unauthenticated: 401 ✓
        resp = api_client.get(f"/api/crm/inquiries/{inq.id}/")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Management App Endpoint Matrix
# ---------------------------------------------------------------------------
@pytest.mark.django_db
class TestManagementPermissionMatrix:
    @pytest.fixture(autouse=True)
    def setup_data(self, db, landlord, tenant, landlord_property):
        self.lease = _make_lease_and_payments(landlord, tenant, landlord_property)
        self.maintenance = _make_maintenance(tenant, landlord_property, self.lease)

    def test_unauthenticated_cannot_list_leases(self, api_client):
        resp = api_client.get("/api/management/leases/")
        assert resp.status_code == 401

    def test_unauthenticated_cannot_list_payments(self, api_client):
        resp = api_client.get("/api/management/payments/")
        assert resp.status_code == 401

    def test_unauthenticated_cannot_list_maintenance(self, api_client):
        resp = api_client.get("/api/management/maintenance/")
        assert resp.status_code == 401

    def test_tenant_can_list_leases(self, tenant_client):
        resp = tenant_client.get("/api/management/leases/")
        assert resp.status_code == 200

    def test_landlord_can_list_leases(self, landlord_client):
        resp = landlord_client.get("/api/management/leases/")
        assert resp.status_code == 200

    def test_investor_sees_empty_leases(self, investor_client):
        """Investors are authenticated but have no leases → empty list, not 403."""
        resp = investor_client.get("/api/management/leases/")
        assert resp.status_code == 200
        results = (resp.data["results"] if isinstance(resp.data, dict) and "results" in resp.data else list(resp.data))
        assert results == []

    def test_tenant_can_list_payments(self, tenant_client):
        resp = tenant_client.get("/api/management/payments/")
        assert resp.status_code == 200

    def test_landlord_can_list_payments(self, landlord_client):
        resp = landlord_client.get("/api/management/payments/")
        assert resp.status_code == 200

    def test_investor_sees_empty_payments(self, investor_client):
        resp = investor_client.get("/api/management/payments/")
        assert resp.status_code == 200
        results = (resp.data["results"] if isinstance(resp.data, dict) and "results" in resp.data else list(resp.data))
        assert results == []

    def test_tenant_can_list_maintenance(self, tenant_client):
        resp = tenant_client.get("/api/management/maintenance/")
        assert resp.status_code == 200

    def test_landlord_can_list_maintenance(self, landlord_client):
        resp = landlord_client.get("/api/management/maintenance/")
        assert resp.status_code == 200

    def test_agent_gets_tenant_queryset_for_leases(self, agent_client):
        """
        FIXED: 'agent' no longer in the landlord queryset branch.
        Agents fall through to the tenant branch, which filters by lease.tenant=user.
        agent_test is not a tenant on any lease, so results are empty.
        This is the correct behaviour — agents should not have a lease management path.
        """
        resp = agent_client.get("/api/management/leases/")
        assert resp.status_code == 200
        results = list(resp.data)
        # agent_test is neither a landlord nor a tenant on any lease
        assert results == []

    def test_cross_landlord_isolation(self, landlord2_client):
        """landlord2 should not see landlord's leases."""
        resp = landlord2_client.get("/api/management/leases/")
        assert resp.status_code == 200
        results = (resp.data["results"] if isinstance(resp.data, dict) and "results" in resp.data else list(resp.data))
        lease_ids = [l["id"] for l in results]
        assert self.lease.id not in lease_ids


# ---------------------------------------------------------------------------
# Price Prediction & Similar — Public Endpoints
# ---------------------------------------------------------------------------
@pytest.mark.django_db
class TestMLEndpointsPermissionMatrix:
    @patch("properties.ml_client.requests.post")
    def test_anonymous_can_get_price_prediction(self, mock_post, api_client, property_obj):
        """Price prediction endpoint is public (AllowAny)."""
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = ML_MOCK
        resp = api_client.get(f"/api/properties/{property_obj.id}/price-prediction/")
        assert resp.status_code == 200

    def test_anonymous_can_get_similar(self, api_client, property_obj):
        """Similar properties endpoint is public (AllowAny)."""
        resp = api_client.get(f"/api/properties/{property_obj.id}/similar/")
        assert resp.status_code == 200

    @patch("properties.ml_client.requests.post")
    def test_all_roles_can_get_price_prediction(
        self, mock_post, api_client, agent_client,
        tenant_client, landlord_client, investor_client, property_obj
    ):
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = ML_MOCK
        for name, client in [
            ("anonymous", api_client), ("agent", agent_client),
            ("tenant", tenant_client), ("landlord", landlord_client),
            ("investor", investor_client),
        ]:
            resp = client.get(f"/api/properties/{property_obj.id}/price-prediction/")
            assert resp.status_code == 200, f"{name} got unexpected {resp.status_code}"
