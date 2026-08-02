import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from properties.models import Property, PropertyImage
from properties.ml_client import get_ml_price_prediction
from crm.models import Inquiry, SavedProperty
from management_app.models import LeaseAgreement, Payment, MaintenanceRequest
from management_app.services import generate_payment_schedule
from datetime import date, timedelta

User = get_user_model()

def seed_database():
    print("[SEED] Seeding EstateIQ Phase 3 Database...")

    # 1. Create Default Users for each Role
    agent, _ = User.objects.get_or_create(
        username='agent_rohit',
        defaults={
            'email': 'rohit.agent@estateiq.in',
            'role': 'agent',
            'first_name': 'Rohit',
            'last_name': 'Sharma',
            'phone_number': '+91 9876543210',
            'company_name': 'Apex Realty Solutions'
        }
    )
    if _:
        agent.set_password('password123')
        agent.save()

    landlord, _ = User.objects.get_or_create(
        username='landlord_ananya',
        defaults={
            'email': 'ananya.landlord@estateiq.in',
            'role': 'landlord',
            'first_name': 'Ananya',
            'last_name': 'Iyer',
            'phone_number': '+91 9812345678',
            'company_name': 'Iyer Estates'
        }
    )
    if _:
        landlord.set_password('password123')
        landlord.save()

    tenant, _ = User.objects.get_or_create(
        username='tenant_vikram',
        defaults={
            'email': 'vikram.tenant@gmail.com',
            'role': 'tenant',
            'first_name': 'Vikram',
            'last_name': 'Verma',
            'phone_number': '+91 9988776655'
        }
    )
    if _:
        tenant.set_password('password123')
        tenant.save()

    investor, _ = User.objects.get_or_create(
        username='investor_prior',
        defaults={
            'email': 'investor@estateiq.in',
            'role': 'investor',
            'first_name': 'Priya',
            'last_name': 'Kapoor',
            'phone_number': '+91 9765432109',
            'company_name': 'CapInvest Capital'
        }
    )
    if _:
        investor.set_password('password123')
        investor.save()

    print("[SEED] Seeded Users (Agent Rohit, Landlord Ananya, Tenant Vikram, Investor Priya)")

    # 2. Clear old data cleanly
    LeaseAgreement.objects.all().delete()
    Payment.objects.all().delete()
    MaintenanceRequest.objects.all().delete()
    Property.objects.all().delete()

    # 3. Seed Properties
    properties_data = [
        {
            "title": "Spacious 3 BHK Apartment in Bandra West",
            "description": "Located in prime Pali Hill neighborhood close to top cafes, boutique dining, and Promenade.",
            "city": "Mumbai",
            "sub_market": "Western Suburbs",
            "locality": "Bandra",
            "property_type": "Apartment",
            "bhk": 3,
            "area_sqft": 1650.0,
            "floor": 6,
            "total_floors": 12,
            "age_years": 3,
            "furnishing": "Semi-Furnished",
            "facing": "North-East",
            "dist_metro_km": 0.8,
            "dist_school_km": 0.4,
            "dist_hospital_km": 1.0,
            "dist_it_hub_km": 3.5,
            "has_gym": True,
            "has_pool": False,
            "has_clubhouse": True,
            "has_security": True,
            "has_power_backup": True,
            "has_parking": True,
            "has_lift": True,
            "rera_approved": True,
            "listed_price": 41000000.0,
            "status": "rented",
            "owner": landlord,
            "images": ["https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80"]
        },
        {
            "title": "Spacious 2 BHK Flat near Satellite SG Highway",
            "description": "Prime residential location behind ISKCON temple with seamless access to SG Highway malls and hospitals.",
            "city": "Ahmedabad",
            "sub_market": "Ahmedabad West",
            "locality": "Satellite",
            "property_type": "Apartment",
            "bhk": 2,
            "area_sqft": 1220.0,
            "floor": 3,
            "total_floors": 7,
            "age_years": 3,
            "furnishing": "Semi-Furnished",
            "facing": "North",
            "dist_metro_km": 1.5,
            "dist_school_km": 0.7,
            "dist_hospital_km": 0.8,
            "dist_it_hub_km": 3.0,
            "has_gym": True,
            "has_pool": False,
            "has_clubhouse": True,
            "has_security": True,
            "has_power_backup": True,
            "has_parking": True,
            "has_lift": True,
            "rera_approved": True,
            "listed_price": 6800000.0,
            "status": "rented",
            "owner": landlord,
            "images": ["https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80"]
        },
        {
            "title": "Luxury Sea View 4 BHK Penthouse in Worli",
            "description": "Panoramic Arabian Sea view, wrap-around deck, private plunge pool, and smart home automation.",
            "city": "Mumbai",
            "sub_market": "South Mumbai",
            "locality": "Worli",
            "property_type": "Penthouse",
            "bhk": 4,
            "area_sqft": 3200.0,
            "floor": 28,
            "total_floors": 30,
            "age_years": 1,
            "furnishing": "Fully-Furnished",
            "facing": "West",
            "dist_metro_km": 0.5,
            "dist_school_km": 1.5,
            "dist_hospital_km": 0.8,
            "dist_it_hub_km": 4.0,
            "has_gym": True,
            "has_pool": True,
            "has_clubhouse": True,
            "has_security": True,
            "has_power_backup": True,
            "has_parking": True,
            "has_lift": True,
            "rera_approved": True,
            "listed_price": 68000000.0,
            "status": "for_sale",
            "owner": agent,
            "images": ["https://images.unsplash.com/photo-1512915922686-57c11dde9b6b?auto=format&fit=crop&w=800&q=80"]
        },
        {
            "title": "Executive 3 BHK Apartment in Prahlad Nagar",
            "description": "High-end contemporary apartment with Italian marble flooring, smart home automation, and modular kitchen.",
            "city": "Ahmedabad",
            "sub_market": "Ahmedabad West",
            "locality": "Prahlad Nagar",
            "property_type": "Apartment",
            "bhk": 3,
            "area_sqft": 1800.0,
            "floor": 2,
            "total_floors": 10,
            "age_years": 2,
            "furnishing": "Semi-Furnished",
            "facing": "East",
            "dist_metro_km": 1.5,
            "dist_school_km": 1.0,
            "dist_hospital_km": 1.5,
            "dist_it_hub_km": 3.0,
            "has_gym": True,
            "has_pool": False,
            "has_clubhouse": False,
            "has_security": True,
            "has_power_backup": True,
            "has_parking": True,
            "has_lift": True,
            "rera_approved": True,
            "listed_price": 12500000.0,
            "status": "for_sale",
            "owner": agent,
            "images": ["https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80"]
        }
    ]

    created_props = []
    for prop_data in properties_data:
        ml_res = get_ml_price_prediction(prop_data)
        p = Property.objects.create(
            title=prop_data["title"],
            description=prop_data["description"],
            owner=prop_data["owner"],
            status=prop_data.get("status", "for_sale"),
            images=prop_data["images"],
            city=prop_data["city"],
            sub_market=prop_data["sub_market"],
            locality=prop_data["locality"],
            property_type=prop_data["property_type"],
            bhk=prop_data["bhk"],
            area_sqft=prop_data["area_sqft"],
            floor=prop_data["floor"],
            total_floors=prop_data["total_floors"],
            age_years=prop_data["age_years"],
            furnishing=prop_data["furnishing"],
            facing=prop_data["facing"],
            dist_metro_km=prop_data["dist_metro_km"],
            dist_school_km=prop_data["dist_school_km"],
            dist_hospital_km=prop_data["dist_hospital_km"],
            dist_it_hub_km=prop_data["dist_it_hub_km"],
            has_gym=prop_data["has_gym"],
            has_pool=prop_data["has_pool"],
            has_clubhouse=prop_data["has_clubhouse"],
            has_security=prop_data["has_security"],
            has_power_backup=prop_data["has_power_backup"],
            has_parking=prop_data["has_parking"],
            has_lift=prop_data["has_lift"],
            rera_approved=prop_data["rera_approved"],
            listed_price=prop_data["listed_price"],
            predicted_price=ml_res.get("predicted_price"),
            confidence_score=ml_res.get("confidence_score"),
            based_on=ml_res.get("based_on"),
            deal_tag=ml_res.get("deal_tag", "Fair Price")
        )
        for img_url in prop_data["images"]:
            PropertyImage.objects.create(property=p, image=img_url, is_primary=True)
        created_props.append(p)

    print(f"[SEED] Seeded {len(created_props)} Properties")

    # 4. Seed Sample Leases (Phase 3 Requirement)
    # Lease 1: Bandra West Apartment (Rent ₹45,000)
    lease1 = LeaseAgreement.objects.create(
        property=created_props[0],
        tenant=tenant,
        landlord=landlord,
        monthly_rent=45000.0,
        security_deposit=135000.0,
        start_date=date(2026, 1, 1),
        end_date=date(2026, 12, 31),
        status='active'
    )
    generate_payment_schedule(lease1, months=12)

    # Lease 2: Satellite Flat (Rent ₹25,000)
    lease2 = LeaseAgreement.objects.create(
        property=created_props[1],
        tenant=tenant,
        landlord=landlord,
        monthly_rent=25000.0,
        security_deposit=75000.0,
        start_date=date(2026, 2, 1),
        end_date=date(2027, 1, 31),
        status='active'
    )
    generate_payment_schedule(lease2, months=12)

    print("[SEED] Seeded 2 Sample Leases with 12-Month Payment Schedules")

    # 5. Seed Maintenance Requests
    maint1 = MaintenanceRequest.objects.create(
        lease=lease1,
        property=created_props[0],
        tenant=tenant,
        title="Master Bedroom AC Servicing and Filter Cleaning",
        description="Master bedroom split AC needs routine servicing and filter cleaning before summer.",
        priority="medium",
        status="in_progress"
    )

    maint2 = MaintenanceRequest.objects.create(
        lease=lease2,
        property=created_props[1],
        tenant=tenant,
        title="Kitchen Plumbing Low Pressure Issue",
        description="Low water pressure coming from kitchen sink faucet.",
        priority="high",
        status="open"
    )

    print("[SEED] Seeded Maintenance Requests")
    print("[SEED] Phase 3 Database Seeding Complete!")

if __name__ == '__main__':
    seed_database()
