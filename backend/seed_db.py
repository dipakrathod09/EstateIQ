"""
EstateIQ â€” Complete Database Reseed Script
==========================================
Run: python seed_db.py
Clears all previous demo data and seeds fresh, realistic data.
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from properties.models import Property, PropertyImage
from properties.ml_client import get_ml_price_prediction
from crm.models import Inquiry, SavedProperty
from management_app.models import LeaseAgreement, Payment, MaintenanceRequest
from investments.models import InvestmentListing
from management_app.services import generate_payment_schedule
from datetime import date, timedelta
from django.utils import timezone

User = get_user_model()

# â”€â”€â”€ Diverse Unsplash property images â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
IMAGES = {
    "bandra_apt":    ["https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=80",
                      "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=900&q=80",
                      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=900&q=80"],

    "worli_penth":   ["https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=900&q=80",
                      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=900&q=80",
                      "https://images.unsplash.com/photo-1600573472592-401b489a3cdc?auto=format&fit=crop&w=900&q=80"],

    "powai_villa":   ["https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=900&q=80",
                      "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=900&q=80",
                      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=900&q=80"],

    "lower_parel":   ["https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=900&q=80",
                      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=900&q=80",
                      "https://images.unsplash.com/photo-1600047509358-9dc75507daeb?auto=format&fit=crop&w=900&q=80"],

    "andheri_apt":   ["https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=900&q=80",
                      "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=80",
                      "https://images.unsplash.com/photo-1556909172-54557c7e4fb7?auto=format&fit=crop&w=900&q=80"],

    "juhu_villa":    ["https://images.unsplash.com/photo-1523217582562-09d0def993a6?auto=format&fit=crop&w=900&q=80",
                      "https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=900&q=80",
                      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=80"],

    "malad_apt":     ["https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?auto=format&fit=crop&w=900&q=80",
                      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=80",
                      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=900&q=80"],

    "thane_apt":     ["https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=900&q=80",
                      "https://images.unsplash.com/photo-1574362848149-11496d93a7c7?auto=format&fit=crop&w=900&q=80",
                      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=900&q=80"],

    "navi_apt":      ["https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=900&q=80",
                      "https://images.unsplash.com/photo-1600047509360-5f87e5ab7f4b?auto=format&fit=crop&w=900&q=80",
                      "https://images.unsplash.com/photo-1600210491892-03d54bc0823a?auto=format&fit=crop&w=900&q=80"],

    "dadar_apt":     ["https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80",
                      "https://images.unsplash.com/photo-1502672023488-70e25813eb80?auto=format&fit=crop&w=900&q=80",
                      "https://images.unsplash.com/photo-1556909172-89cf0b17d540?auto=format&fit=crop&w=900&q=80"],

    "goregaon_apt":  ["https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=900&q=80",
                      "https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=900&q=80",
                      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=900&q=80"],

    "borivali_apt":  ["https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?auto=format&fit=crop&w=900&q=80",
                      "https://images.unsplash.com/photo-1560185008-b033106af5c3?auto=format&fit=crop&w=900&q=80",
                      "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=900&q=80"],

    "versova_studio":["https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?auto=format&fit=crop&w=900&q=80",
                      "https://images.unsplash.com/photo-1536376072261-38c75010e6c9?auto=format&fit=crop&w=900&q=80",
                      "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=900&q=80"],

    "chembur_house": ["https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=900&q=80",
                      "https://images.unsplash.com/photo-1558618047-f4e90b24dd87?auto=format&fit=crop&w=900&q=80",
                      "https://images.unsplash.com/photo-1576941089067-2de3c901e126?auto=format&fit=crop&w=900&q=80"],

    "ghatkopar_apt": ["https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=900&q=80",
                      "https://images.unsplash.com/photo-1600607687644-c7171b42498b?auto=format&fit=crop&w=900&q=80",
                      "https://images.unsplash.com/photo-1560185009-5bf9f2849488?auto=format&fit=crop&w=900&q=80"],

    "khar_apt":      ["https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=900&q=80",
                      "https://images.unsplash.com/photo-1560185008-a33f3b8a2370?auto=format&fit=crop&w=900&q=80",
                      "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=900&q=80"],
}


def seed_database():
    print("\n" + "="*60)
    print("  EstateIQ â€” Complete Database Reseed")
    print("="*60)

    # â”€â”€ Step 1: Wipe all old data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    print("\n[1/6] Clearing old data...")
    from crm.models import Inquiry, SavedProperty
    Inquiry.objects.all().delete()
    SavedProperty.objects.all().delete()
    MaintenanceRequest.objects.all().delete()
    Payment.objects.all().delete()
    LeaseAgreement.objects.all().delete()
    InvestmentListing.objects.all().delete()
    PropertyImage.objects.all().delete()
    Property.objects.all().delete()
    User.objects.filter(is_superuser=False).delete()
    print("    âœ“ All tables cleared")

    # â”€â”€ Step 2: Create Users â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    print("\n[2/6] Creating users...")

    agent = User.objects.create_user(
        username='agent_rohit',
        email='rohit.agent@estateiq.in',
        password='password123',
        role='agent',
        first_name='Rohit',
        last_name='Sharma',
        phone_number='+91 9876543210',
        company_name='Apex Realty Solutions'
    )

    landlord = User.objects.create_user(
        username='landlord_ananya',
        email='ananya.landlord@estateiq.in',
        password='password123',
        role='landlord',
        first_name='Ananya',
        last_name='Iyer',
        phone_number='+91 9812345678',
        company_name='Iyer Premium Estates'
    )

    tenant = User.objects.create_user(
        username='tenant_vikram',
        email='vikram.tenant@gmail.com',
        password='password123',
        role='tenant',
        first_name='Vikram',
        last_name='Verma',
        phone_number='+91 9988776655'
    )

    investor = User.objects.create_user(
        username='investor_priya',
        email='priya.investor@estateiq.in',
        password='password123',
        role='investor',
        first_name='Priya',
        last_name='Kapoor',
        phone_number='+91 9765432109',
        company_name='CapInvest Capital'
    )

    print(f"    âœ“ 4 users created: agent_rohit, landlord_ananya, tenant_vikram, investor_priya")

    # â”€â”€ Step 3: Create Properties â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    print("\n[3/6] Creating 16 Mumbai property listings...")

    properties_data = [
        # â”€â”€ BANDRA (Landlord-owned, Rented)
        {
            "title": "Spacious 3 BHK Sea-Facing Apartment in Bandra West",
            "description": "Nestled in the heart of Pali Hill, this 3 BHK offers breathtaking views of Bandra Creek and Mount Mary Church. Italian marble floors, modular kitchen by Godrej Interio, and top-tier security.",
            "project_name": "Raheja Sterling",
            "developer": "Raheja Developers",
            "possession_status": "Ready to Move",
            "city": "Mumbai", "sub_market": "Western Suburbs", "locality": "Bandra",
            "property_type": "Apartment", "bhk": 3, "bathroom": 3, "area_sqft": 1680.0,
            "floor": 7, "total_floors": 14, "age_years": 4, "furnishing": "Semi-Furnished", "facing": "West",
            "latitude": 19.0596, "longitude": 72.8295,
            "dist_metro_km": 0.7, "dist_school_km": 0.4, "dist_hospital_km": 0.9, "dist_it_hub_km": 3.2,
            "has_gym": True, "has_pool": False, "has_clubhouse": True, "has_security": True,
            "has_power_backup": True, "has_parking": True, "has_lift": True, "rera_approved": True,
            "listed_price": 42000000.0, "status": "rented", "owner": landlord,
            "images": IMAGES["bandra_apt"]
        },
        # â”€â”€ WORLI (Agent-listed, For Sale)
        {
            "title": "Luxury 4 BHK Sea-View Penthouse in Worli",
            "description": "Panoramic Arabian Sea views from every room. Private plunge pool, wrap-around terrace, smart home automation by Schneider Electric. One of only 4 penthouses in the tower.",
            "project_name": "Lodha Altamount",
            "developer": "Lodha Group",
            "possession_status": "Ready to Move",
            "city": "Mumbai", "sub_market": "South Mumbai", "locality": "Worli",
            "property_type": "Penthouse", "bhk": 4, "bathroom": 5, "area_sqft": 3600.0,
            "floor": 32, "total_floors": 35, "age_years": 2, "furnishing": "Fully-Furnished", "facing": "West",
            "latitude": 19.0176, "longitude": 72.8172,
            "dist_metro_km": 0.4, "dist_school_km": 1.2, "dist_hospital_km": 0.7, "dist_it_hub_km": 4.5,
            "has_gym": True, "has_pool": True, "has_clubhouse": True, "has_security": True,
            "has_power_backup": True, "has_parking": True, "has_lift": True, "rera_approved": True,
            "listed_price": 75000000.0, "status": "for_sale", "owner": agent,
            "images": IMAGES["worli_penth"]
        },
        # â”€â”€ POWAI (Landlord-owned, For Rent)
        {
            "title": "Elegant 3 BHK Lake-View Villa in Powai",
            "description": "Private 3-level villa overlooking Powai Lake. Landscaped garden, home theatre, and designer interiors. Walking distance to Hiranandani Hospital and Galleria Mall.",
            "project_name": "Hiranandani Estate",
            "developer": "Hiranandani Developers",
            "possession_status": "Ready to Move",
            "city": "Mumbai", "sub_market": "Eastern Suburbs", "locality": "Powai",
            "property_type": "Villa", "bhk": 3, "bathroom": 4, "area_sqft": 2800.0,
            "floor": 1, "total_floors": 3, "age_years": 6, "furnishing": "Fully-Furnished", "facing": "North",
            "latitude": 19.1176, "longitude": 72.9060,
            "dist_metro_km": 1.5, "dist_school_km": 0.6, "dist_hospital_km": 0.4, "dist_it_hub_km": 1.2,
            "has_gym": False, "has_pool": True, "has_clubhouse": False, "has_security": True,
            "has_power_backup": True, "has_parking": True, "has_lift": False, "rera_approved": True,
            "listed_price": 85000.0 * 12,  # Monthly 85k = annual
            "status": "for_rent", "owner": landlord,
            "images": IMAGES["powai_villa"]
        },
        # â”€â”€ LOWER PAREL (Agent-listed, For Sale)
        {
            "title": "Modern 2 BHK Apartment in Lower Parel",
            "description": "Located in the premium Palais Royale precinct of Lower Parel. Floor-to-ceiling glass, certified green building, and direct access to Pheonix Palladium mall and entertainment hub.",
            "project_name": "Palais Royale",
            "developer": "Provogue Realty",
            "possession_status": "Ready to Move",
            "city": "Mumbai", "sub_market": "Central", "locality": "Lower Parel",
            "property_type": "Apartment", "bhk": 2, "bathroom": 2, "area_sqft": 1150.0,
            "floor": 18, "total_floors": 30, "age_years": 3, "furnishing": "Semi-Furnished", "facing": "East",
            "latitude": 18.9942, "longitude": 72.8327,
            "dist_metro_km": 0.3, "dist_school_km": 0.8, "dist_hospital_km": 1.1, "dist_it_hub_km": 2.0,
            "has_gym": True, "has_pool": True, "has_clubhouse": True, "has_security": True,
            "has_power_backup": True, "has_parking": True, "has_lift": True, "rera_approved": True,
            "listed_price": 28500000.0, "status": "for_sale", "owner": agent,
            "images": IMAGES["lower_parel"]
        },
        # â”€â”€ ANDHERI WEST (Agent-listed, For Sale)
        {
            "title": "Stylish 2 BHK Apartment in Andheri West",
            "description": "Premium apartment in DN Nagar, Andheri West â€” minutes from Versova Beach, D-Mart, and Link Road. Ideal for working professionals and young families.",
            "project_name": "Godrej Prime",
            "developer": "Godrej Properties",
            "possession_status": "Ready to Move",
            "city": "Mumbai", "sub_market": "Western Suburbs", "locality": "Andheri",
            "property_type": "Apartment", "bhk": 2, "bathroom": 2, "area_sqft": 1050.0,
            "floor": 4, "total_floors": 10, "age_years": 5, "furnishing": "Semi-Furnished", "facing": "North-East",
            "latitude": 19.1196, "longitude": 72.8374,
            "dist_metro_km": 0.5, "dist_school_km": 0.5, "dist_hospital_km": 0.9, "dist_it_hub_km": 2.8,
            "has_gym": True, "has_pool": False, "has_clubhouse": True, "has_security": True,
            "has_power_backup": True, "has_parking": True, "has_lift": True, "rera_approved": True,
            "listed_price": 19500000.0, "status": "for_sale", "owner": agent,
            "images": IMAGES["andheri_apt"]
        },
        # â”€â”€ JUHU (Agent-listed, For Sale â€” premium)
        {
            "title": "Independent 4 BHK Bungalow â€” Juhu Beach Road",
            "description": "Rare independent bungalow steps from Juhu Beach. Celebrity neighbourhood. Private garden, rooftop terrace, home office, and 3-car garage. No shared walls, complete privacy.",
            "project_name": None,
            "developer": None,
            "possession_status": "Ready to Move",
            "city": "Mumbai", "sub_market": "Western Suburbs", "locality": "Juhu",
            "property_type": "Independent House", "bhk": 4, "bathroom": 5, "area_sqft": 4200.0,
            "floor": 1, "total_floors": 3, "age_years": 12, "furnishing": "Unfurnished", "facing": "West",
            "latitude": 19.0990, "longitude": 72.8260,
            "dist_metro_km": 1.8, "dist_school_km": 0.7, "dist_hospital_km": 1.3, "dist_it_hub_km": 4.0,
            "has_gym": False, "has_pool": True, "has_clubhouse": False, "has_security": True,
            "has_power_backup": True, "has_parking": True, "has_lift": False, "rera_approved": False,
            "listed_price": 120000000.0, "status": "for_sale", "owner": agent,
            "images": IMAGES["juhu_villa"]
        },
        # â”€â”€ MALAD (Agent-listed, For Rent)
        {
            "title": "Contemporary 3 BHK in Malad West â€” Infinity Complex",
            "description": "Bright, east-facing 3 BHK in Infinity Complex near Inorbit Mall. Spacious 1600 sqft with 3 balconies, children's play area, and jogging track in the complex.",
            "project_name": "Infinity Heights",
            "developer": "Wadhwa Group",
            "possession_status": "Ready to Move",
            "city": "Mumbai", "sub_market": "Western Suburbs", "locality": "Malad",
            "property_type": "Apartment", "bhk": 3, "bathroom": 3, "area_sqft": 1600.0,
            "floor": 9, "total_floors": 20, "age_years": 7, "furnishing": "Semi-Furnished", "facing": "East",
            "latitude": 19.1860, "longitude": 72.8477,
            "dist_metro_km": 0.9, "dist_school_km": 0.6, "dist_hospital_km": 1.0, "dist_it_hub_km": 3.5,
            "has_gym": True, "has_pool": False, "has_clubhouse": True, "has_security": True,
            "has_power_backup": True, "has_parking": True, "has_lift": True, "rera_approved": True,
            "listed_price": 35000.0 * 12,
            "status": "for_rent", "owner": agent,
            "images": IMAGES["malad_apt"]
        },
        # â”€â”€ THANE (Landlord-owned, Rented)
        {
            "title": "Spacious 2 BHK Apartment in Thane West â€” Ghodbunder Road",
            "description": "Premium apartment in Thane West's most desirable corridor. Green surroundings, large balcony, and top-class amenities. 10-min drive to Viviana Mall.",
            "project_name": "Raunak Unnathi Woods",
            "developer": "Raunak Group",
            "possession_status": "Ready to Move",
            "city": "Mumbai", "sub_market": "Thane", "locality": "Thane",
            "property_type": "Apartment", "bhk": 2, "bathroom": 2, "area_sqft": 1080.0,
            "floor": 5, "total_floors": 18, "age_years": 4, "furnishing": "Unfurnished", "facing": "South",
            "latitude": 19.2183, "longitude": 72.9781,
            "dist_metro_km": 2.0, "dist_school_km": 0.5, "dist_hospital_km": 0.8, "dist_it_hub_km": 5.5,
            "has_gym": True, "has_pool": True, "has_clubhouse": True, "has_security": True,
            "has_power_backup": True, "has_parking": True, "has_lift": True, "rera_approved": True,
            "listed_price": 9800000.0, "status": "rented", "owner": landlord,
            "images": IMAGES["thane_apt"]
        },
        # â”€â”€ NAVI MUMBAI (Agent-listed, For Sale)
        {
            "title": "Affordable 1 BHK in Navi Mumbai â€” Vashi Sector 17",
            "description": "Smart 1 BHK with efficient layout in Vashi. 5-min walk to Vashi railway station, 10-min to DY Patil Stadium. Perfect first home for young professionals.",
            "project_name": "NMC Palms",
            "developer": "CIDCO",
            "possession_status": "Ready to Move",
            "city": "Mumbai", "sub_market": "Navi Mumbai", "locality": "Navi Mumbai",
            "property_type": "Apartment", "bhk": 1, "bathroom": 1, "area_sqft": 620.0,
            "floor": 3, "total_floors": 7, "age_years": 9, "furnishing": "Unfurnished", "facing": "East",
            "latitude": 19.0771, "longitude": 73.0004,
            "dist_metro_km": 0.3, "dist_school_km": 0.4, "dist_hospital_km": 0.7, "dist_it_hub_km": 2.0,
            "has_gym": False, "has_pool": False, "has_clubhouse": False, "has_security": True,
            "has_power_backup": True, "has_parking": True, "has_lift": True, "rera_approved": True,
            "listed_price": 5200000.0, "status": "for_sale", "owner": agent,
            "images": IMAGES["navi_apt"]
        },
        # â”€â”€ DADAR (Agent-listed, For Sale)
        {
            "title": "Classic 3 BHK Heritage Apartment in Dadar West",
            "description": "Rare old-Mumbai heritage-style apartment with high ceilings and mosaic flooring in the sought-after Shivaji Park area. Completely renovated with modern plumbing and wiring.",
            "project_name": None,
            "developer": None,
            "possession_status": "Ready to Move",
            "city": "Mumbai", "sub_market": "Central", "locality": "Dadar",
            "property_type": "Apartment", "bhk": 3, "bathroom": 2, "area_sqft": 1380.0,
            "floor": 2, "total_floors": 5, "age_years": 28, "furnishing": "Semi-Furnished", "facing": "North",
            "latitude": 19.0176, "longitude": 72.8432,
            "dist_metro_km": 0.6, "dist_school_km": 0.3, "dist_hospital_km": 0.8, "dist_it_hub_km": 3.0,
            "has_gym": False, "has_pool": False, "has_clubhouse": False, "has_security": True,
            "has_power_backup": False, "has_parking": True, "has_lift": False, "rera_approved": False,
            "listed_price": 22000000.0, "status": "for_sale", "owner": agent,
            "images": IMAGES["dadar_apt"]
        },
        # â”€â”€ GOREGAON (Agent-listed, For Sale)
        {
            "title": "Modern 3 BHK in Goregaon East â€” Oberoi Splendor",
            "description": "Part of the iconic Oberoi Splendor township in Goregaon East. IGBC Gold certified green building. Club amenities including cricket ground, basketball court, and mini-theatre.",
            "project_name": "Oberoi Splendor",
            "developer": "Oberoi Realty",
            "possession_status": "Ready to Move",
            "city": "Mumbai", "sub_market": "Western Suburbs", "locality": "Goregaon",
            "property_type": "Apartment", "bhk": 3, "bathroom": 3, "area_sqft": 1520.0,
            "floor": 11, "total_floors": 24, "age_years": 2, "furnishing": "Semi-Furnished", "facing": "South-West",
            "latitude": 19.1477, "longitude": 72.8660,
            "dist_metro_km": 1.0, "dist_school_km": 0.5, "dist_hospital_km": 1.2, "dist_it_hub_km": 2.5,
            "has_gym": True, "has_pool": True, "has_clubhouse": True, "has_security": True,
            "has_power_backup": True, "has_parking": True, "has_lift": True, "rera_approved": True,
            "listed_price": 27000000.0, "status": "for_sale", "owner": agent,
            "images": IMAGES["goregaon_apt"]
        },
        # â”€â”€ BORIVALI (Agent-listed, For Sale â€” under construction)
        {
            "title": "Pre-Launch 2 BHK in Borivali East â€” Sunteck Signature",
            "description": "Under-construction premium project near Borivali National Park. Ground-floor retail, rooftop infinity pool, and EV charging stations. Expected possession Q3 2027.",
            "project_name": "Sunteck Signature",
            "developer": "Sunteck Realty",
            "possession_status": "Under Construction",
            "city": "Mumbai", "sub_market": "Western Suburbs", "locality": "Borivali",
            "property_type": "Apartment", "bhk": 2, "bathroom": 2, "area_sqft": 980.0,
            "floor": 6, "total_floors": 28, "age_years": 0, "furnishing": "Unfurnished", "facing": "North-East",
            "latitude": 19.2290, "longitude": 72.8588,
            "dist_metro_km": 0.8, "dist_school_km": 0.9, "dist_hospital_km": 1.4, "dist_it_hub_km": 6.5,
            "has_gym": True, "has_pool": True, "has_clubhouse": True, "has_security": True,
            "has_power_backup": True, "has_parking": True, "has_lift": True, "rera_approved": True,
            "listed_price": 14500000.0, "status": "for_sale", "owner": agent,
            "images": IMAGES["borivali_apt"]
        },
        # â”€â”€ VERSOVA (Agent-listed, For Rent)
        {
            "title": "Cosy Studio Apartment â€” Versova Beach Lane",
            "description": "Tastefully designed studio apartment a 3-minute walk from Versova Beach. Perfect for a solo professional or couple. Fully equipped kitchen, fast Wi-Fi wiring, and great cross-ventilation.",
            "project_name": "Pearl Heights",
            "developer": None,
            "possession_status": "Ready to Move",
            "city": "Mumbai", "sub_market": "Western Suburbs", "locality": "Versova",
            "property_type": "Studio", "bhk": 1, "bathroom": 1, "area_sqft": 420.0,
            "floor": 2, "total_floors": 6, "age_years": 8, "furnishing": "Fully-Furnished", "facing": "West",
            "latitude": 19.1274, "longitude": 72.8068,
            "dist_metro_km": 1.1, "dist_school_km": 0.8, "dist_hospital_km": 1.5, "dist_it_hub_km": 3.0,
            "has_gym": False, "has_pool": False, "has_clubhouse": False, "has_security": True,
            "has_power_backup": False, "has_parking": False, "has_lift": True, "rera_approved": False,
            "listed_price": 30000.0 * 12,
            "status": "for_rent", "owner": agent,
            "images": IMAGES["versova_studio"]
        },
        # â”€â”€ CHEMBUR (Landlord-owned, For Rent)
        {
            "title": "Well-Maintained 3 BHK Independent House in Chembur",
            "description": "Row house in a gated colony. Large terrace, covered parking for 2 cars, and play area for kids. Near RCF colony and Chembur Golf Course. Ideal for families.",
            "project_name": None,
            "developer": None,
            "possession_status": "Ready to Move",
            "city": "Mumbai", "sub_market": "Eastern Suburbs", "locality": "Chembur",
            "property_type": "Independent House", "bhk": 3, "bathroom": 3, "area_sqft": 1850.0,
            "floor": 1, "total_floors": 2, "age_years": 18, "furnishing": "Unfurnished", "facing": "South",
            "latitude": 19.0614, "longitude": 72.8990,
            "dist_metro_km": 1.2, "dist_school_km": 0.5, "dist_hospital_km": 0.9, "dist_it_hub_km": 4.5,
            "has_gym": False, "has_pool": False, "has_clubhouse": False, "has_security": True,
            "has_power_backup": False, "has_parking": True, "has_lift": False, "rera_approved": False,
            "listed_price": 60000.0 * 12,
            "status": "for_rent", "owner": landlord,
            "images": IMAGES["chembur_house"]
        },
        # â”€â”€ GHATKOPAR (Agent-listed, For Sale)
        {
            "title": "Investment-Grade 2 BHK Near Ghatkopar Metro Hub",
            "description": "High-demand rental corridor at the Ghatkopar Metro junction. Rental yield of ~5.5% expected. Ideal for investors seeking stable monthly income. Near Dukes Factory.",
            "project_name": "Phoenix One",
            "developer": "Phoenix Mills",
            "possession_status": "Ready to Move",
            "city": "Mumbai", "sub_market": "Eastern Suburbs", "locality": "Ghatkopar",
            "property_type": "Apartment", "bhk": 2, "bathroom": 2, "area_sqft": 870.0,
            "floor": 8, "total_floors": 16, "age_years": 3, "furnishing": "Semi-Furnished", "facing": "North",
            "latitude": 19.0748, "longitude": 72.9093,
            "dist_metro_km": 0.2, "dist_school_km": 0.6, "dist_hospital_km": 0.8, "dist_it_hub_km": 3.8,
            "has_gym": True, "has_pool": False, "has_clubhouse": True, "has_security": True,
            "has_power_backup": True, "has_parking": True, "has_lift": True, "rera_approved": True,
            "listed_price": 13200000.0, "status": "for_sale", "owner": agent,
            "images": IMAGES["ghatkopar_apt"]
        },
        # â”€â”€ KHAR (Agent-listed, For Sale â€” premium)
        {
            "title": "Premium 3 BHK Apartment in Khar West â€” Elixir Building",
            "description": "Walk to Khar Gymkhana and the famous Carter Road promenade from this premium 3 BHK. Designed by Singapore-based Aedas Architects with signature open kitchen and study room.",
            "project_name": "Elixir Residences",
            "developer": "Shapoorji Pallonji",
            "possession_status": "Ready to Move",
            "city": "Mumbai", "sub_market": "Western Suburbs", "locality": "Khar",
            "property_type": "Apartment", "bhk": 3, "bathroom": 3, "area_sqft": 1740.0,
            "floor": 5, "total_floors": 10, "age_years": 1, "furnishing": "Semi-Furnished", "facing": "East",
            "latitude": 19.0708, "longitude": 72.8345,
            "dist_metro_km": 0.9, "dist_school_km": 0.4, "dist_hospital_km": 0.8, "dist_it_hub_km": 4.2,
            "has_gym": True, "has_pool": True, "has_clubhouse": True, "has_security": True,
            "has_power_backup": True, "has_parking": True, "has_lift": True, "rera_approved": True,
            "listed_price": 48000000.0, "status": "for_sale", "owner": agent,
            "images": IMAGES["khar_apt"]
        },
    ]

    created_props = []
    for i, prop_data in enumerate(properties_data):
        print(f"    [{i+1:02d}/16] {prop_data['locality']} â€” {prop_data['bhk']} BHK {prop_data['property_type']}", end="", flush=True)
        try:
            ml_res = get_ml_price_prediction(prop_data)
        except Exception:
            ml_res = {"predicted_price": None, "confidence_score": None, "based_on": None, "deal_tag": "Fair Price"}

        p = Property.objects.create(
            title=prop_data["title"],
            description=prop_data["description"],
            owner=prop_data["owner"],
            status=prop_data.get("status", "for_sale"),
            images=prop_data["images"],
            project_name=prop_data.get("project_name"),
            developer=prop_data.get("developer"),
            possession_status=prop_data.get("possession_status", "Ready to Move"),
            city=prop_data["city"],
            sub_market=prop_data["sub_market"],
            locality=prop_data["locality"],
            property_type=prop_data["property_type"],
            bhk=prop_data["bhk"],
            bathroom=prop_data.get("bathroom"),
            area_sqft=prop_data["area_sqft"],
            floor=prop_data["floor"],
            total_floors=prop_data["total_floors"],
            age_years=prop_data["age_years"],
            furnishing=prop_data["furnishing"],
            facing=prop_data["facing"],
            latitude=prop_data.get("latitude"),
            longitude=prop_data.get("longitude"),
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
        # Seed PropertyImage gallery
        for idx, img_url in enumerate(prop_data["images"]):
            PropertyImage.objects.create(property=p, image=img_url, is_primary=(idx == 0))

        created_props.append(p)
        print(f"  âœ“  (â‚¹{p.listed_price/1e7:.2f}Cr, deal={p.deal_tag})")

    print(f"\n    âœ“ {len(created_props)} properties created with full gallery images")

    # â”€â”€ Step 4: Leases & Payments â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    print("\n[4/6] Creating leases and payment schedules...")

    # Lease 1: Bandra apartment (property index 0)
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

    # Lease 2: Thane apartment (property index 7)
    lease2 = LeaseAgreement.objects.create(
        property=created_props[7],
        tenant=tenant,
        landlord=landlord,
        monthly_rent=28000.0,
        security_deposit=84000.0,
        start_date=date(2026, 3, 1),
        end_date=date(2027, 2, 28),
        status='active'
    )
    generate_payment_schedule(lease2, months=12)

    # Mark some payments as paid for realism
    paid_payments_lease1 = Payment.objects.filter(lease=lease1).order_by('due_date')[:7]
    for pmt in paid_payments_lease1:
        pmt.status = 'paid'
        pmt.paid_date = pmt.due_date
        pmt.save()

    paid_payments_lease2 = Payment.objects.filter(lease=lease2).order_by('due_date')[:4]
    for pmt in paid_payments_lease2:
        pmt.status = 'paid'
        pmt.paid_date = pmt.due_date
        pmt.save()

    print(f"    âœ“ 2 leases created â€” Bandra (â‚¹45k/mo) & Thane (â‚¹28k/mo)")
    print(f"    âœ“ 24 payment records seeded (7 paid on lease 1, 4 paid on lease 2)")

    # â”€â”€ Step 5: Maintenance Requests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    print("\n[5/6] Creating maintenance requests...")

    MaintenanceRequest.objects.create(
        lease=lease1,
        property=created_props[0],
        tenant=tenant,
        title="Master Bedroom AC Servicing and Filter Cleaning",
        description="Split AC in master bedroom making unusual rattling sound. Filter hasn't been cleaned in 6 months. Needs routine servicing before Mumbai summer.",
        priority="medium",
        status="in_progress"
    )

    MaintenanceRequest.objects.create(
        lease=lease1,
        property=created_props[0],
        tenant=tenant,
        title="Living Room False Ceiling â€” Water Seepage Stain",
        description="Water seepage stain appeared on false ceiling after heavy rains last week. Approx 60cm diameter brown patch near the drawing room light fixture.",
        priority="high",
        status="open"
    )

    MaintenanceRequest.objects.create(
        lease=lease2,
        property=created_props[7],
        tenant=tenant,
        title="Kitchen Sink Tap â€” Low Water Pressure",
        description="Hot water tap in kitchen sink has very low pressure. Cold tap is fine. Possible internal blockage in geyser line.",
        priority="medium",
        status="open"
    )

    MaintenanceRequest.objects.create(
        lease=lease2,
        property=created_props[7],
        tenant=tenant,
        title="Main Entrance Door Lock â€” Stiff and Difficult to Open",
        description="Main door deadbolt lock is increasingly stiff. Takes 2-3 attempts to open. Needs lubrication or replacement of lock cylinder.",
        priority="low",
        status="resolved"
    )

    print(f"    âœ“ 4 maintenance requests seeded (2 per lease)")

    # â”€â”€ Step 6: CRM Inquiries + Saved Properties â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    print("\n[6/6] Creating CRM data (inquiries + saved properties)...")

    Inquiry.objects.create(
        property=created_props[1],  # Worli Penthouse
        sender=tenant,
        message="I'm very interested in the Worli penthouse. Could you please share the floor plan and schedule a site visit for this weekend? Also, is the price negotiable?",
        status="new"
    )

    Inquiry.objects.create(
        property=created_props[3],  # Lower Parel
        sender=tenant,
        message="Interested in the Lower Parel 2 BHK. Is it available for immediate possession? Also what is the maintenance charge?",
        status="contacted"
    )

    Inquiry.objects.create(
        property=created_props[4],  # Andheri West
        sender=investor,
        message="Looking at this from an investment perspective. What is the expected rental yield in this locality? Any similar units available for bulk purchase?",
        status="new"
    )

    Inquiry.objects.create(
        property=created_props[10],  # Goregaon
        sender=tenant,
        message="Saw the listing for Goregaon East 3 BHK. We're a family of 4. Is the school nearby a reputed one? And is there a park inside the complex?",
        status="new"
    )

    # Saved properties
    SavedProperty.objects.create(user=tenant, property=created_props[1])   # Worli Penthouse
    SavedProperty.objects.create(user=tenant, property=created_props[3])   # Lower Parel
    SavedProperty.objects.create(user=tenant, property=created_props[4])   # Andheri
    SavedProperty.objects.create(user=investor, property=created_props[14])  # Ghatkopar
    SavedProperty.objects.create(user=investor, property=created_props[11])  # Borivali

    print(f"    âœ“ 4 CRM inquiries seeded")
    print(f"    âœ“ 5 saved properties seeded")

    # â”€â”€ Investment Listings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    InvestmentListing.objects.create(
        property=created_props[14],   # Ghatkopar â€” metro-adjacent investment
        asset_class='Residential Rental',
        expected_roi_percentage=13.80,
        projected_rental_yield=5.50,
        min_investment_amount=1320000,
        lock_in_period_min_months=24,
        lock_in_period_max_months=36,
        is_pre_launch=False,
        is_sample_data=False,
        payout_frequency='Monthly',
        disclaimer_text='Projected returns are illustrative estimates based on current Ghatkopar rental market. Not guaranteed.'
    )
    InvestmentListing.objects.create(
        property=created_props[11],   # Borivali â€” pre-launch under construction
        asset_class='Pre-Launch Residential',
        expected_roi_percentage=19.50,
        projected_rental_yield=6.20,
        min_investment_amount=1450000,
        lock_in_period_min_months=12,
        lock_in_period_max_months=24,
        is_pre_launch=True,
        is_sample_data=False,
        early_access_ends_at=timezone.now() + timedelta(days=21),
        payout_frequency='Quarterly',
        disclaimer_text='Pre-launch investments carry market risk. Early access pricing valid until countdown expires.'
    )
    InvestmentListing.objects.create(
        property=created_props[1],    # Worli Penthouse â€” trophy asset
        asset_class='Trophy Residential',
        expected_roi_percentage=11.50,
        projected_rental_yield=4.20,
        min_investment_amount=7500000,
        lock_in_period_min_months=48,
        lock_in_period_max_months=60,
        is_pre_launch=False,
        is_sample_data=False,
        payout_frequency='Quarterly',
        disclaimer_text='Trophy assets offer capital appreciation over rental yield. Past returns not indicative of future performance.'
    )
    InvestmentListing.objects.create(
        property=created_props[10],   # Goregaon â€” Oberoi township
        asset_class='Commercial Office',
        expected_roi_percentage=15.20,
        projected_rental_yield=7.80,
        min_investment_amount=2700000,
        lock_in_period_min_months=36,
        lock_in_period_max_months=48,
        is_pre_launch=False,
        is_sample_data=False,
        payout_frequency='Monthly',
        disclaimer_text='Projected returns based on current commercial leasing rates in Goregaon JVLR corridor.'
    )
    print(f"    âœ“ 4 investment listings seeded")

    # â”€â”€ Summary â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    print("\n" + "="*60)
    print("  âœ… EstateIQ Database Reseed Complete!")
    print("="*60)
    print(f"  Users         : 4  (agent_rohit, landlord_ananya, tenant_vikram, investor_priya)")
    print(f"  Properties    : {len(created_props)}  (all Mumbai â€” varied localities & types)")
    print(f"  Gallery Images: {len(created_props)*3}  (3 per property, all unique Unsplash URLs)")
    print(f"  Leases        : 2  (Bandra â‚¹45k/mo + Thane â‚¹28k/mo)")
    print(f"  Payments      : 24 (12 per lease, realistic paid/unpaid status)")
    print(f"  Maintenance   : 4  requests (open, in_progress, resolved)")
    print(f"  CRM Inquiries : 4")
    print(f"  Saved Props   : 5")
    print(f"  Investments   : 4  (Residential, Pre-Launch, Trophy, Commercial)")
    print("="*60)
    print("\n  Login credentials: password123 for all accounts")
    print()


if __name__ == '__main__':
    seed_database()


