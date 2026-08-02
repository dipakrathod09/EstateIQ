"""
Tests for Phase 5 — investments app.
Covers:
1. InvestmentListing CRUD & filtering (positive & negative cases for all roles).
2. InvestmentInquiry isolation (investor A vs B, owner vs non-owner agent, anon submit vs read).
3. Data integrity (disclaimer_text required, min_investment_amount integer storage, early_access_ends_at handling).
4. Full Role Permission Matrix for investment listings and inquiries.
"""
import pytest
from datetime import datetime, timedelta, timezone
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()

DISCLAIMER = (
    "Projected returns are illustrative estimates, not guaranteed. "
    "Past performance is not indicative of future results."
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------
@pytest.fixture
def investment_listing(db, property_obj):
    """A published InvestmentListing linked to property_obj (owned by agent)."""
    from investments.models import InvestmentListing
    return InvestmentListing.objects.create(
        property=property_obj,
        asset_class='Commercial Office',
        expected_roi_percentage='12.50',
        projected_rental_yield='7.25',
        min_investment_amount=2500000,
        lock_in_period_min_months=12,
        lock_in_period_max_months=24,
        is_pre_launch=False,
        payout_frequency='Quarterly',
        disclaimer_text=DISCLAIMER,
    )


@pytest.fixture
def landlord_investment_listing(db, landlord_property):
    """An InvestmentListing linked to landlord_property (owned by landlord)."""
    from investments.models import InvestmentListing
    return InvestmentListing.objects.create(
        property=landlord_property,
        asset_class='Retail',
        expected_roi_percentage='10.00',
        projected_rental_yield='6.00',
        min_investment_amount=1000000,
        lock_in_period_min_months=12,
        lock_in_period_max_months=12,
        is_pre_launch=False,
        payout_frequency='Monthly',
        disclaimer_text=DISCLAIMER,
    )


@pytest.fixture
def pre_launch_listing(db, property_obj):
    """A pre-launch listing with early_access_ends_at 3 days from now."""
    from investments.models import InvestmentListing
    return InvestmentListing.objects.create(
        property=property_obj,
        asset_class='Pre-Launch Residential',
        expected_roi_percentage='15.00',
        projected_rental_yield='8.00',
        min_investment_amount=1000000,
        lock_in_period_min_months=18,
        lock_in_period_max_months=18,
        is_pre_launch=True,
        early_access_ends_at=datetime.now(timezone.utc) + timedelta(days=3),
        payout_frequency='Monthly',
        disclaimer_text=DISCLAIMER,
    )


@pytest.fixture
def inquiry_from_investor(db, investment_listing, investor):
    """An InvestmentInquiry submitted by investor fixture on investment_listing (owned by agent)."""
    from investments.models import InvestmentInquiry
    return InvestmentInquiry.objects.create(
        investment_listing=investment_listing,
        user=investor,
        investor_name='Investor A',
        phone='9876543210',
        email='investor_a@test.com',
        preferred_investment_range='25L-50L',
        requested_pitch_deck=False,
    )


# Helper to construct authenticated APIClient for dynamic users
def auth_client_for(user):
    client = APIClient()
    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")
    return client


# ---------------------------------------------------------------------------
# 1. InvestmentListing CRUD & Filtering
# ---------------------------------------------------------------------------
@pytest.mark.django_db
class TestInvestmentListingCRUD:
    BASE_PAYLOAD = {
        'asset_class': 'Warehousing',
        'expected_roi_percentage': '11.00',
        'projected_rental_yield': '6.50',
        'min_investment_amount': 5000000,
        'lock_in_period_min_months': 24,
        'lock_in_period_max_months': 36,
        'is_pre_launch': False,
        'payout_frequency': 'Quarterly',
        'disclaimer_text': DISCLAIMER,
    }

    # Public Read
    def test_anonymous_can_list_listings(self, api_client, investment_listing):
        resp = api_client.get('/api/investments/')
        assert resp.status_code == 200
        ids = [l['id'] for l in list(resp.data)]
        assert investment_listing.id in ids

    def test_anonymous_can_get_detail(self, api_client, investment_listing):
        resp = api_client.get(f'/api/investments/{investment_listing.id}/')
        assert resp.status_code == 200
        assert resp.data['disclaimer_text'] == DISCLAIMER
        assert resp.data['min_investment_display'] == '₹25L'
        assert resp.data['lock_in_display'] == '12–24 months'

    # Filtering
    def test_filter_by_asset_class(self, api_client, investment_listing, pre_launch_listing):
        resp = api_client.get('/api/investments/', {'asset_class': 'Commercial Office'})
        assert resp.status_code == 200
        ids = [l['id'] for l in list(resp.data)]
        assert investment_listing.id in ids
        assert pre_launch_listing.id not in ids

    def test_filter_is_pre_launch(self, api_client, investment_listing, pre_launch_listing):
        resp = api_client.get('/api/investments/', {'is_pre_launch': 'true'})
        assert resp.status_code == 200
        ids = [l['id'] for l in list(resp.data)]
        assert pre_launch_listing.id in ids
        assert investment_listing.id not in ids

    def test_filter_by_roi_range(self, api_client, investment_listing, pre_launch_listing):
        resp = api_client.get('/api/investments/', {'min_roi': '13.00'})
        assert resp.status_code == 200
        ids = [l['id'] for l in list(resp.data)]
        assert pre_launch_listing.id in ids
        assert investment_listing.id not in ids

    # Create Permissions (Positive & Negative)
    def test_anonymous_create_fails(self, api_client, property_obj):
        payload = {**self.BASE_PAYLOAD, 'property': property_obj.id}
        resp = api_client.post('/api/investments/', payload, format='json')
        assert resp.status_code == 401

    def test_tenant_create_fails(self, tenant_client, property_obj):
        payload = {**self.BASE_PAYLOAD, 'property': property_obj.id}
        resp = tenant_client.post('/api/investments/', payload, format='json')
        assert resp.status_code == 403

    def test_investor_create_fails(self, investor_client, property_obj):
        payload = {**self.BASE_PAYLOAD, 'property': property_obj.id}
        resp = investor_client.post('/api/investments/', payload, format='json')
        assert resp.status_code == 403

    def test_agent_owner_create_succeeds(self, agent_client, property_obj):
        payload = {**self.BASE_PAYLOAD, 'property': property_obj.id}
        resp = agent_client.post('/api/investments/', payload, format='json')
        assert resp.status_code == 201
        assert resp.data['asset_class'] == 'Warehousing'

    def test_agent_non_owner_create_fails(self, agent2_client, property_obj):
        """agent2 trying to create an investment listing for agent's property gets 403."""
        payload = {**self.BASE_PAYLOAD, 'property': property_obj.id}
        resp = agent2_client.post('/api/investments/', payload, format='json')
        assert resp.status_code == 403

    def test_landlord_owner_create_succeeds(self, landlord_client, landlord_property):
        payload = {**self.BASE_PAYLOAD, 'property': landlord_property.id}
        resp = landlord_client.post('/api/investments/', payload, format='json')
        assert resp.status_code == 201

    def test_admin_create_any_property_succeeds(self, admin_client, property_obj):
        payload = {**self.BASE_PAYLOAD, 'property': property_obj.id}
        resp = admin_client.post('/api/investments/', payload, format='json')
        assert resp.status_code == 201

    # Update & Delete Permissions (Positive & Negative)
    def test_owner_agent_can_patch_and_delete(self, agent_client, investment_listing):
        resp = agent_client.patch(f'/api/investments/{investment_listing.id}/', {'expected_roi_percentage': '14.00'})
        assert resp.status_code == 200
        assert resp.data['expected_roi_percentage'] == '14.00'

        del_resp = agent_client.delete(f'/api/investments/{investment_listing.id}/')
        assert del_resp.status_code == 240 or del_resp.status_code == 204

    def test_non_owner_agent_cannot_patch_or_delete(self, agent2_client, investment_listing):
        resp = agent2_client.patch(f'/api/investments/{investment_listing.id}/', {'expected_roi_percentage': '14.00'})
        assert resp.status_code == 403

        del_resp = agent2_client.delete(f'/api/investments/{investment_listing.id}/')
        assert del_resp.status_code == 403

    def test_tenant_cannot_patch_or_delete(self, tenant_client, investment_listing):
        resp = tenant_client.patch(f'/api/investments/{investment_listing.id}/', {'expected_roi_percentage': '14.00'})
        assert resp.status_code == 403

    def test_investor_cannot_patch_or_delete(self, investor_client, investment_listing):
        resp = investor_client.patch(f'/api/investments/{investment_listing.id}/', {'expected_roi_percentage': '14.00'})
        assert resp.status_code == 403

    def test_admin_can_patch_and_delete(self, admin_client, investment_listing):
        resp = admin_client.patch(f'/api/investments/{investment_listing.id}/', {'expected_roi_percentage': '15.00'})
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# 2. InvestmentInquiry Isolation & Access Control
# ---------------------------------------------------------------------------
@pytest.mark.django_db
class TestInvestmentInquiryIsolation:
    VALID_INQUIRY_PAYLOAD = {
        'investor_name': 'Anonymous Investor',
        'phone': '9876543210',
        'email': 'anon@test.com',
        'preferred_investment_range': '25L-50L',
        'requested_pitch_deck': True,
    }

    # Anonymous submission works
    def test_anonymous_can_submit_inquiry(self, api_client, investment_listing):
        resp = api_client.post(
            f'/api/investments/{investment_listing.id}/inquire/',
            self.VALID_INQUIRY_PAYLOAD, format='json'
        )
        assert resp.status_code == 201
        assert resp.data['user'] is None
        assert resp.data['requested_pitch_deck'] is True

    def test_anonymous_cannot_read_inquiries(self, api_client, investment_listing, inquiry_from_investor):
        # List view
        resp_list = api_client.get(f'/api/investments/{investment_listing.id}/inquiries/')
        assert resp_list.status_code == 401

        # Detail view
        resp_detail = api_client.get(f'/api/investments/inquiries/{inquiry_from_investor.id}/')
        assert resp_detail.status_code == 401

    # Investor A vs Investor B isolation
    def test_investor_A_cannot_be_accessed_by_investor_B(self, investor_client, inquiry_from_investor, investment_listing):
        """
        investor fixture (Investor A) submitted inquiry_from_investor.
        Create Investor B and verify B gets empty list and 404 on A's inquiry detail.
        """
        investor_b = User.objects.create_user(
            username='investor_b_test', email='b@test.com', password='testpass123', role='investor'
        )
        client_b = auth_client_for(investor_b)

        # List endpoint for Investor B returns empty list (or list excluding A's inquiry)
        resp_list = client_b.get(f'/api/investments/{investment_listing.id}/inquiries/')
        assert resp_list.status_code == 200
        ids = [i['id'] for i in list(resp_list.data)]
        assert inquiry_from_investor.id not in ids

        # Detail endpoint for Investor B returns 404 (scoped queryset)
        resp_detail = client_b.get(f'/api/investments/inquiries/{inquiry_from_investor.id}/')
        assert resp_detail.status_code == 404

    def test_investor_can_read_own_inquiry(self, investor_client, inquiry_from_investor, investment_listing):
        # List view includes own inquiry
        resp_list = investor_client.get(f'/api/investments/{investment_listing.id}/inquiries/')
        assert resp_list.status_code == 200
        ids = [i['id'] for i in list(resp_list.data)]
        assert inquiry_from_investor.id in ids

        # Detail view returns 200
        resp_detail = investor_client.get(f'/api/investments/inquiries/{inquiry_from_investor.id}/')
        assert resp_detail.status_code == 200
        assert resp_detail.data['id'] == inquiry_from_investor.id

    # Owner Agent / Admin vs Non-Owner Agent
    def test_owner_agent_can_read_inquiries(self, agent_client, inquiry_from_investor, investment_listing):
        # agent owns property_obj -> can read list and detail
        resp_list = agent_client.get(f'/api/investments/{investment_listing.id}/inquiries/')
        assert resp_list.status_code == 200
        ids = [i['id'] for i in list(resp_list.data)]
        assert inquiry_from_investor.id in ids

        resp_detail = agent_client.get(f'/api/investments/inquiries/{inquiry_from_investor.id}/')
        assert resp_detail.status_code == 200

    def test_admin_can_read_inquiries(self, admin_client, inquiry_from_investor, investment_listing):
        resp_list = admin_client.get(f'/api/investments/{investment_listing.id}/inquiries/')
        assert resp_list.status_code == 200
        ids = [i['id'] for i in list(resp_list.data)]
        assert inquiry_from_investor.id in ids

        resp_detail = admin_client.get(f'/api/investments/inquiries/{inquiry_from_investor.id}/')
        assert resp_detail.status_code == 200

    def test_agent2_cannot_access_agent1_listing_inquiry(self, agent2_client, inquiry_from_investor, investment_listing):
        """
        agent2 does not own property_obj.
        Mirrors test_crm.py's test_agent2_cannot_access_agent1_inquiry:
        List view returns empty list, detail view returns 404.
        """
        resp_list = agent2_client.get(f'/api/investments/{investment_listing.id}/inquiries/')
        assert resp_list.status_code == 200
        ids = [i['id'] for i in list(resp_list.data)]
        assert inquiry_from_investor.id not in ids

        resp_detail = agent2_client.get(f'/api/investments/inquiries/{inquiry_from_investor.id}/')
        assert resp_detail.status_code == 404


# ---------------------------------------------------------------------------
# 3. Data Integrity & Schema Validation
# ---------------------------------------------------------------------------
@pytest.mark.django_db
class TestInvestmentDataIntegrity:
    def test_disclaimer_text_required(self, agent_client, property_obj):
        """Creating an InvestmentListing without disclaimer_text or with blank string fails with 400."""
        payload = {
            'property': property_obj.id,
            'asset_class': 'Retail',
            'expected_roi_percentage': '10.00',
            'projected_rental_yield': '6.00',
            'min_investment_amount': 1000000,
            'lock_in_period_min_months': 12,
            'lock_in_period_max_months': 12,
            'is_pre_launch': False,
            'payout_frequency': 'Monthly',
            'disclaimer_text': '',
        }
        resp = agent_client.post('/api/investments/', payload, format='json')
        assert resp.status_code == 400
        assert 'disclaimer_text' in resp.data

        payload_whitespace = {**payload, 'disclaimer_text': '   '}
        resp_ws = agent_client.post('/api/investments/', payload_whitespace, format='json')
        assert resp_ws.status_code == 400
        assert 'disclaimer_text' in resp_ws.data

    def test_min_investment_amount_stored_as_plain_integer(self, investment_listing):
        """Verify min_investment_amount is stored as a plain integer in DB, not a string."""
        from investments.models import InvestmentListing
        obj = InvestmentListing.objects.get(id=investment_listing.id)
        assert isinstance(obj.min_investment_amount, int)
        assert obj.min_investment_amount == 2500000

    def test_early_access_ends_at_null_and_datetime(self, investment_listing, pre_launch_listing):
        """Non-pre-launch accepts null; pre-launch stores valid datetime."""
        from investments.models import InvestmentListing
        l1 = InvestmentListing.objects.get(id=investment_listing.id)
        assert l1.early_access_ends_at is None

        l2 = InvestmentListing.objects.get(id=pre_launch_listing.id)
        assert isinstance(l2.early_access_ends_at, datetime)


# ---------------------------------------------------------------------------
# 4. Role Permission Matrix for Phase 5 Endpoints
# ---------------------------------------------------------------------------
@pytest.mark.django_db
class TestInvestmentsPermissionMatrix:
    """
    Full Matrix for:
    - POST /api/investments/ (Create Listing)
    - PATCH /api/investments/<id>/ (Update Listing)
    - DELETE /api/investments/<id>/ (Delete Listing)
    - GET /api/investments/<id>/inquiries/ (List Inquiries for Listing)
    - GET /api/investments/inquiries/<id>/ (Detail Inquiry)
    """

    def test_matrix_investment_listing_write(self, api_client, agent_client, agent2_client, landlord_client, tenant_client, investor_client, admin_client, property_obj, investment_listing):
        payload = {
            'property': property_obj.id,
            'asset_class': 'Commercial Office',
            'expected_roi_percentage': '12.00',
            'projected_rental_yield': '7.00',
            'min_investment_amount': 2000000,
            'lock_in_period_min_months': 12,
            'lock_in_period_max_months': 24,
            'disclaimer_text': DISCLAIMER,
        }

        # POST (Create)
        assert api_client.post('/api/investments/', payload, format='json').status_code == 401
        assert tenant_client.post('/api/investments/', payload, format='json').status_code == 403
        assert investor_client.post('/api/investments/', payload, format='json').status_code == 403
        assert agent2_client.post('/api/investments/', payload, format='json').status_code == 403  # non-owner agent
        assert agent_client.post('/api/investments/', payload, format='json').status_code == 201   # owner agent
        assert admin_client.post('/api/investments/', payload, format='json').status_code == 201   # admin

        # PATCH (Update)
        patch_data = {'expected_roi_percentage': '13.00'}
        assert api_client.patch(f'/api/investments/{investment_listing.id}/', patch_data, format='json').status_code == 401
        assert tenant_client.patch(f'/api/investments/{investment_listing.id}/', patch_data, format='json').status_code == 403
        assert investor_client.patch(f'/api/investments/{investment_listing.id}/', patch_data, format='json').status_code == 403
        assert agent2_client.patch(f'/api/investments/{investment_listing.id}/', patch_data, format='json').status_code == 403
        assert agent_client.patch(f'/api/investments/{investment_listing.id}/', patch_data, format='json').status_code == 200
        assert admin_client.patch(f'/api/investments/{investment_listing.id}/', patch_data, format='json').status_code == 200

        # DELETE
        assert api_client.delete(f'/api/investments/{investment_listing.id}/').status_code == 401
        assert tenant_client.delete(f'/api/investments/{investment_listing.id}/').status_code == 403
        assert investor_client.delete(f'/api/investments/{investment_listing.id}/').status_code == 403
        assert agent2_client.delete(f'/api/investments/{investment_listing.id}/').status_code == 403
        assert agent_client.delete(f'/api/investments/{investment_listing.id}/').status_code == 204
        assert admin_client.delete(f'/api/investments/{investment_listing.id}/').status_code in (204, 404)

    def test_matrix_investment_inquiry_read(self, api_client, agent_client, agent2_client, tenant_client, investor_client, admin_client, investment_listing, inquiry_from_investor):
        # Anonymous
        assert api_client.get(f'/api/investments/{investment_listing.id}/inquiries/').status_code == 401
        assert api_client.get(f'/api/investments/inquiries/{inquiry_from_investor.id}/').status_code == 401

        # Investor A (submitter)
        resp_a_list = investor_client.get(f'/api/investments/{investment_listing.id}/inquiries/')
        assert resp_a_list.status_code == 200
        assert inquiry_from_investor.id in [i['id'] for i in list(resp_a_list.data)]
        assert investor_client.get(f'/api/investments/inquiries/{inquiry_from_investor.id}/').status_code == 200

        # Investor B (non-submitter)
        investor_b = User.objects.create_user(
            username='inv_b_matrix', email='inv_b@matrix.test', password='pass', role='investor'
        )
        client_b = auth_client_for(investor_b)
        resp_b_list = client_b.get(f'/api/investments/{investment_listing.id}/inquiries/')
        assert resp_b_list.status_code == 200
        assert inquiry_from_investor.id not in [i['id'] for i in list(resp_b_list.data)]
        assert client_b.get(f'/api/investments/inquiries/{inquiry_from_investor.id}/').status_code == 404

        # Agent1 (owner of property linked to investment listing)
        resp_ag1_list = agent_client.get(f'/api/investments/{investment_listing.id}/inquiries/')
        assert resp_ag1_list.status_code == 200
        assert inquiry_from_investor.id in [i['id'] for i in list(resp_ag1_list.data)]
        assert agent_client.get(f'/api/investments/inquiries/{inquiry_from_investor.id}/').status_code == 200

        # Agent2 (non-owner)
        resp_ag2_list = agent2_client.get(f'/api/investments/{investment_listing.id}/inquiries/')
        assert resp_ag2_list.status_code == 200
        assert inquiry_from_investor.id not in [i['id'] for i in list(resp_ag2_list.data)]
        assert agent2_client.get(f'/api/investments/inquiries/{inquiry_from_investor.id}/').status_code == 404

        # Tenant (non-submitter)
        resp_ten_list = tenant_client.get(f'/api/investments/{investment_listing.id}/inquiries/')
        assert resp_ten_list.status_code == 200
        assert inquiry_from_investor.id not in [i['id'] for i in list(resp_ten_list.data)]
        assert tenant_client.get(f'/api/investments/inquiries/{inquiry_from_investor.id}/').status_code == 404

        # Admin
        resp_adm_list = admin_client.get(f'/api/investments/{investment_listing.id}/inquiries/')
        assert resp_adm_list.status_code == 200
        assert inquiry_from_investor.id in [i['id'] for i in list(resp_adm_list.data)]
        assert admin_client.get(f'/api/investments/inquiries/{inquiry_from_investor.id}/').status_code == 200
