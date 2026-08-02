"""
EstateIQ — CRM Completion Script (run after main seed)
Adds inquiries, saved properties and investment listings.
"""
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from properties.models import Property
from crm.models import Inquiry, SavedProperty
from investments.models import InvestmentListing
from django.utils import timezone
from datetime import timedelta

User = get_user_model()

def run():
    agent    = User.objects.get(username='agent_rohit')
    landlord = User.objects.get(username='landlord_ananya')
    tenant   = User.objects.get(username='tenant_vikram')
    investor = User.objects.get(username='investor_priya')

    props = list(Property.objects.order_by('created_at'))
    print(f"Found {len(props)} properties")

    # Clean previous CRM + investment data
    Inquiry.objects.all().delete()
    SavedProperty.objects.all().delete()
    InvestmentListing.objects.all().delete()
    print("[OK] Cleared old CRM + investment data")

    # Map by locality for easier reference
    by_locality = {p.locality: p for p in props}
    # Also by index
    p = props  # shorthand

    # Inquiries
    Inquiry.objects.create(
        property=by_locality.get('Worli', p[1]),
        user=tenant,
        name='Vikram Verma',
        email='vikram.tenant@gmail.com',
        phone='+91 9988776655',
        message="I'm very interested in the Worli penthouse. Could you share the floor plan and schedule a site visit this weekend? Is the price negotiable?",
        status="new"
    )
    Inquiry.objects.create(
        property=by_locality.get('Lower Parel', p[3]),
        user=tenant,
        name='Vikram Verma',
        email='vikram.tenant@gmail.com',
        phone='+91 9988776655',
        message="Interested in the Lower Parel 2 BHK. Is it available for immediate possession? What is the monthly maintenance charge?",
        status="contacted"
    )
    Inquiry.objects.create(
        property=by_locality.get('Andheri', p[4]),
        user=investor,
        name='Priya Kapoor',
        email='priya.investor@estateiq.in',
        phone='+91 9765432109',
        message="Looking at this from an investment perspective. What is the expected rental yield in this locality? Any similar units available for bulk purchase?",
        status="new"
    )
    Inquiry.objects.create(
        property=by_locality.get('Goregaon', p[10]),
        user=tenant,
        name='Vikram Verma',
        email='vikram.tenant@gmail.com',
        phone='+91 9988776655',
        message="We are a family of 4 looking at the Goregaon 3 BHK. Is there a good school nearby? Is there a park inside the complex?",
        status="new"
    )
    Inquiry.objects.create(
        property=by_locality.get('Khar', p[15]),
        user=investor,
        name='Priya Kapoor',
        email='priya.investor@estateiq.in',
        phone='+91 9765432109',
        message="The Khar West 3 BHK by Shapoorji Pallonji looks very promising. Can you share more about the society maintenance charges and past rental history?",
        status="new"
    )
    print("[OK] 5 CRM inquiries created")

    # Saved properties
    SavedProperty.objects.get_or_create(user=tenant,   property=by_locality.get('Worli', p[1]))
    SavedProperty.objects.get_or_create(user=tenant,   property=by_locality.get('Lower Parel', p[3]))
    SavedProperty.objects.get_or_create(user=tenant,   property=by_locality.get('Andheri', p[4]))
    SavedProperty.objects.get_or_create(user=investor, property=by_locality.get('Ghatkopar', p[14]))
    SavedProperty.objects.get_or_create(user=investor, property=by_locality.get('Borivali', p[11]))
    SavedProperty.objects.get_or_create(user=investor, property=by_locality.get('Khar', p[15]))
    print("[OK] 6 saved properties created")

    # Investment listings
    InvestmentListing.objects.create(
        property=by_locality.get('Ghatkopar', p[14]),
        asset_class='Residential Rental',
        expected_roi_percentage=13.80,
        projected_rental_yield=5.50,
        min_investment_amount=1320000,
        lock_in_period_min_months=24,
        lock_in_period_max_months=36,
        is_pre_launch=False,
        is_sample_data=False,
        payout_frequency='Monthly',
        disclaimer_text='Projected returns based on current Ghatkopar Metro corridor rental market. Not guaranteed.'
    )
    InvestmentListing.objects.create(
        property=by_locality.get('Borivali', p[11]),
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
        property=by_locality.get('Worli', p[1]),
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
        property=by_locality.get('Goregaon', p[10]),
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
    print("[OK] 4 investment listings created")
    print("\n[DONE] Seed complete!")

if __name__ == '__main__':
    run()
