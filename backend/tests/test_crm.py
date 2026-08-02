"""
Tests for CRM app: inquiries, saved properties, agent isolation, permissions.

NOTE on CRM architecture:
The current CRM models are SavedProperty and Inquiry — NOT a lead-pipeline system
with stages and interactions. The spec's "agent can only see their own leads /
drag through pipeline stages / add interaction notes" describes a richer CRM than
what exists today. These tests cover what IS implemented and flag the gaps.
"""
import pytest


# ---------------------------------------------------------------------------
# Inquiries — access control
# ---------------------------------------------------------------------------
@pytest.mark.django_db
class TestInquiryIsolation:
    @pytest.fixture(autouse=True)
    def create_inquiries(self, db, agent, agent2, property_obj, landlord_property):
        """Create one inquiry on each agent's property."""
        from crm.models import Inquiry
        self.inq_on_agent_prop = Inquiry.objects.create(
            property=property_obj,
            name="Buyer A", email="buyera@test.com", phone="9000000001",
            message="Interested"
        )
        self.inq_on_landlord_prop = Inquiry.objects.create(
            property=landlord_property,
            name="Buyer B", email="buyerb@test.com", phone="9000000002",
            message="Also interested"
        )

    def test_agent_sees_only_own_inquiries(self, agent_client):
        resp = agent_client.get("/api/crm/inquiries/")
        assert resp.status_code == 200
        ids = [i["id"] for i in (resp.data["results"] if isinstance(resp.data, dict) and "results" in resp.data else list(resp.data))]
        assert self.inq_on_agent_prop.id in ids
        # Landlord's property inquiry should NOT appear
        assert self.inq_on_landlord_prop.id not in ids

    def test_landlord_sees_only_own_inquiries(self, landlord_client):
        resp = landlord_client.get("/api/crm/inquiries/")
        assert resp.status_code == 200
        ids = [i["id"] for i in (resp.data["results"] if isinstance(resp.data, dict) and "results" in resp.data else list(resp.data))]
        assert self.inq_on_landlord_prop.id in ids
        assert self.inq_on_agent_prop.id not in ids

    def test_agent2_sees_no_agent1_inquiries(self, agent2_client):
        resp = agent2_client.get("/api/crm/inquiries/")
        assert resp.status_code == 200
        ids = [i["id"] for i in (resp.data["results"] if isinstance(resp.data, dict) and "results" in resp.data else list(resp.data))]
        # agent2 has no properties, so should see none of agent's inquiries
        assert self.inq_on_agent_prop.id not in ids

    def test_unauthenticated_sees_no_inquiries(self, api_client):
        """
        InquiryListCreateView uses AllowAny so GET 200 is expected,
        but the queryset returns none for unauthenticated users.
        """
        resp = api_client.get("/api/crm/inquiries/")
        assert resp.status_code == 200
        results = (resp.data["results"] if isinstance(resp.data, dict) and "results" in resp.data else list(resp.data))
        assert results == []


@pytest.mark.django_db
class TestInquiryCreation:
    def test_anyone_can_submit_inquiry(self, api_client, property_obj):
        payload = {
            "property": property_obj.id,
            "name": "Anonymous Buyer",
            "email": "anon@test.com",
            "phone": "9000000003",
            "message": "I want to view this property",
        }
        resp = api_client.post("/api/crm/inquiries/", payload)
        assert resp.status_code == 201

    def test_inquiry_status_transition(self, agent_client, property_obj):
        """Agent can PATCH an inquiry status (new→contacted→closed) on their own property."""
        from crm.models import Inquiry
        inq = Inquiry.objects.create(
            property=property_obj,  # property_obj is owned by agent fixture
            name="Pipeline Test", email="pipe@test.com", phone="9000000099",
            message="Test"
        )
        resp = agent_client.patch(f"/api/crm/inquiries/{inq.id}/", {"status": "contacted"})
        assert resp.status_code == 200, resp.data
        assert resp.data["status"] == "contacted"

        resp2 = agent_client.patch(f"/api/crm/inquiries/{inq.id}/", {"status": "closed"})
        assert resp2.status_code == 200
        assert resp2.data["status"] == "closed"

    def test_tenant_cannot_access_inquiry_detail(self, tenant_client, property_obj):
        """
        FIXED: InquiryDetailView now scopes its queryset by ownership.
        A tenant trying to GET an inquiry on another user's property gets 404
        (the inquiry is not in the tenant's scoped queryset, so DRF returns 404).
        """
        from crm.models import Inquiry
        inq = Inquiry.objects.create(
            property=property_obj,  # owned by 'agent', not 'tenant'
            name="T", email="t@test.com", phone="9000000004", message="T"
        )
        resp = tenant_client.get(f"/api/crm/inquiries/{inq.id}/")
        # Tenant did not submit this inquiry (no user= set) and doesn't own the property.
        # The scoped queryset returns nothing → DRF returns 404.
        assert resp.status_code == 404, (
            f"Expected 404 (inquiry outside tenant scope) but got {resp.status_code}. "
            "InquiryDetailView owner-check may not be working."
        )

    def test_agent_can_access_inquiry_on_own_property(self, agent_client, property_obj):
        """Agent CAN access the detail of an inquiry submitted on their own property."""
        from crm.models import Inquiry
        inq = Inquiry.objects.create(
            property=property_obj,  # owned by 'agent'
            name="Buyer", email="buyer@test.com", phone="9000000005", message="Interested"
        )
        resp = agent_client.get(f"/api/crm/inquiries/{inq.id}/")
        assert resp.status_code == 200
        assert resp.data["id"] == inq.id

    def test_agent2_cannot_access_agent1_inquiry(self, agent2_client, property_obj):
        """agent2 cannot reach an inquiry on a property owned by agent (agent1)."""
        from crm.models import Inquiry
        inq = Inquiry.objects.create(
            property=property_obj,  # owned by 'agent', not 'agent2'
            name="Buyer", email="buyer2@test.com", phone="9000000006", message="Interested"
        )
        resp = agent2_client.get(f"/api/crm/inquiries/{inq.id}/")
        assert resp.status_code == 404

    def test_inquiry_missing_required_fields_fails(self, api_client, property_obj):
        resp = api_client.post("/api/crm/inquiries/", {
            "property": property_obj.id,
            # missing name, email, phone, message
        })
        assert resp.status_code == 400


# ---------------------------------------------------------------------------
# Saved Properties
# ---------------------------------------------------------------------------
@pytest.mark.django_db
class TestSavedProperties:
    def test_save_and_unsave_property(self, tenant_client, property_obj):
        # Save
        resp = tenant_client.post("/api/crm/saved/toggle/", {"property_id": property_obj.id})
        assert resp.status_code == 200
        assert resp.data["saved"] is True

        # Unsave (toggle again)
        resp2 = tenant_client.post("/api/crm/saved/toggle/", {"property_id": property_obj.id})
        assert resp2.status_code == 200
        assert resp2.data["saved"] is False

    def test_saved_list_returns_user_saves(self, tenant_client, property_obj):
        tenant_client.post("/api/crm/saved/toggle/", {"property_id": property_obj.id})
        resp = tenant_client.get("/api/crm/saved/")
        assert resp.status_code == 200
        ids = [s["property"] for s in (resp.data["results"] if isinstance(resp.data, dict) and "results" in resp.data else list(resp.data))]
        assert property_obj.id in ids

    def test_unauthenticated_cannot_save(self, api_client, property_obj):
        resp = api_client.post("/api/crm/saved/toggle/", {"property_id": property_obj.id})
        assert resp.status_code == 401

    def test_save_without_property_id_fails(self, tenant_client):
        resp = tenant_client.post("/api/crm/saved/toggle/", {})
        assert resp.status_code == 400
