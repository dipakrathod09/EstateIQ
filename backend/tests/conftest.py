"""
Shared test fixtures for EstateIQ backend tests.
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


def make_client(user):
    """Return an authenticated APIClient for the given user."""
    client = APIClient()
    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")
    return client


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def agent(db):
    return User.objects.create_user(
        username="agent_test", email="agent@test.com",
        password="testpass123", role="agent"
    )


@pytest.fixture
def agent2(db):
    return User.objects.create_user(
        username="agent2_test", email="agent2@test.com",
        password="testpass123", role="agent"
    )


@pytest.fixture
def tenant(db):
    return User.objects.create_user(
        username="tenant_test", email="tenant@test.com",
        password="testpass123", role="tenant"
    )


@pytest.fixture
def landlord(db):
    return User.objects.create_user(
        username="landlord_test", email="landlord@test.com",
        password="testpass123", role="landlord"
    )


@pytest.fixture
def landlord2(db):
    return User.objects.create_user(
        username="landlord2_test", email="landlord2@test.com",
        password="testpass123", role="landlord"
    )


@pytest.fixture
def investor(db):
    return User.objects.create_user(
        username="investor_test", email="investor@test.com",
        password="testpass123", role="investor"
    )


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        username="admin_test", email="admin@test.com",
        password="testpass123", role="admin", is_staff=True
    )


@pytest.fixture
def agent_client(agent):
    return make_client(agent)


@pytest.fixture
def agent2_client(agent2):
    return make_client(agent2)


@pytest.fixture
def tenant_client(tenant):
    return make_client(tenant)


@pytest.fixture
def landlord_client(landlord):
    return make_client(landlord)


@pytest.fixture
def landlord2_client(landlord2):
    return make_client(landlord2)


@pytest.fixture
def investor_client(investor):
    return make_client(investor)


@pytest.fixture
def admin_client(admin_user):
    return make_client(admin_user)


PROPERTY_PAYLOAD = {
    "title": "Test Apartment Fixture",
    "description": "A great test property",
    "city": "Ahmedabad",
    "sub_market": "Central",
    "locality": "Bodakdev",
    "property_type": "Apartment",
    "bhk": 2,
    "area_sqft": 1200.0,
    "floor": 3,
    "total_floors": 10,
    "age_years": 2,
    "furnishing": "Semi-Furnished",
    "facing": "East",
    "listed_price": 6500000.0,
    "status": "for_sale",
    "dist_metro_km": 1.2,
    "dist_school_km": 0.8,
    "dist_hospital_km": 1.5,
    "dist_it_hub_km": 3.0,
    "has_gym": True,
    "has_pool": False,
    "has_clubhouse": True,
    "has_security": True,
    "has_power_backup": True,
    "has_parking": True,
    "has_lift": True,
    "rera_approved": True,
}


@pytest.fixture
def property_obj(db, agent):
    from properties.models import Property
    return Property.objects.create(
        owner=agent,
        title="Test Apartment Fixture",
        description="A great test property",
        city="Ahmedabad",
        sub_market="Central",
        locality="Bodakdev",
        property_type="Apartment",
        bhk=2,
        area_sqft=1200.0,
        floor=3,
        total_floors=10,
        age_years=2,
        furnishing="Semi-Furnished",
        facing="East",
        listed_price=6500000.0,
        status="for_sale",
        dist_metro_km=1.2,
        dist_school_km=0.8,
        dist_hospital_km=1.5,
        dist_it_hub_km=3.0,
        has_gym=True,
        has_pool=False,
        has_clubhouse=True,
        has_security=True,
        has_power_backup=True,
        has_parking=True,
        has_lift=True,
        rera_approved=True,
        predicted_price=7000000.0,
        confidence_score=0.92,
        deal_tag="Fair Price",
    )


@pytest.fixture
def landlord_property(db, landlord):
    from properties.models import Property
    return Property.objects.create(
        owner=landlord,
        title="Landlord's Property",
        city="Ahmedabad",
        sub_market="West",
        locality="Satellite",
        property_type="Apartment",
        bhk=3,
        area_sqft=1600.0,
        floor=5,
        total_floors=12,
        age_years=4,
        furnishing="Furnished",
        facing="North",
        listed_price=9000000.0,
        status="for_rent",
        dist_metro_km=2.0,
        dist_school_km=1.2,
        dist_hospital_km=2.0,
        dist_it_hub_km=4.0,
        has_security=True,
        has_power_backup=True,
        has_parking=True,
        has_lift=True,
        predicted_price=8500000.0,
        confidence_score=0.88,
        deal_tag="Fair Price",
    )
