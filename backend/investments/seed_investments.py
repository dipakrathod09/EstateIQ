"""
Seed script for InvestmentListing records.
Run with: python manage.py shell < investments/seed_investments.py

Creates 8 listings across all 4 asset classes.
3 are pre-launch with early_access_ends_at 2-7 days in the future
so countdown timers are live immediately after seeding.
"""
from datetime import datetime, timedelta, timezone
from properties.models import Property
from investments.models import InvestmentListing

DISCLAIMER = (
    "Projected returns are illustrative estimates based on historical market data "
    "and current projections. They are NOT guaranteed. Returns may vary depending on "
    "market conditions, occupancy rates, and macroeconomic factors. Past performance "
    "is not indicative of future results. This is not a securities offering. "
    "Please consult a SEBI-registered investment advisor before committing capital."
)

# Grab first 8 properties, or create placeholders if fewer exist
properties = list(Property.objects.all()[:8])
if not properties:
    print("No properties found. Please create at least 1 property first.")
    raise SystemExit(1)

def get_prop(index):
    return properties[index % len(properties)]

now = datetime.now(timezone.utc)

listings_data = [
    # 1 — Commercial Office (live)
    dict(
        property=get_prop(0),
        asset_class='Commercial Office',
        expected_roi_percentage='13.50',
        projected_rental_yield='8.20',
        min_investment_amount=5000000,    # 50L
        lock_in_period_min_months=24,
        lock_in_period_max_months=36,
        is_pre_launch=False,
        payout_frequency='Quarterly',
        disclaimer_text=DISCLAIMER,
    ),
    # 2 — Commercial Office (live, higher ticket)
    dict(
        property=get_prop(1),
        asset_class='Commercial Office',
        expected_roi_percentage='11.80',
        projected_rental_yield='7.50',
        min_investment_amount=10000000,   # 1Cr
        lock_in_period_min_months=36,
        lock_in_period_max_months=60,
        is_pre_launch=False,
        payout_frequency='Monthly',
        total_fractional_units=1000,
        disclaimer_text=DISCLAIMER,
    ),
    # 3 — Warehousing (live)
    dict(
        property=get_prop(2),
        asset_class='Warehousing',
        expected_roi_percentage='12.00',
        projected_rental_yield='7.80',
        min_investment_amount=2500000,    # 25L
        lock_in_period_min_months=18,
        lock_in_period_max_months=24,
        is_pre_launch=False,
        payout_frequency='Quarterly',
        disclaimer_text=DISCLAIMER,
    ),
    # 4 — Warehousing (live, lower ticket)
    dict(
        property=get_prop(3),
        asset_class='Warehousing',
        expected_roi_percentage='10.50',
        projected_rental_yield='6.90',
        min_investment_amount=1000000,    # 10L
        lock_in_period_min_months=12,
        lock_in_period_max_months=24,
        is_pre_launch=False,
        payout_frequency='Monthly',
        disclaimer_text=DISCLAIMER,
    ),
    # 5 — Pre-Launch Residential (countdown: 7 days)
    dict(
        property=get_prop(4),
        asset_class='Pre-Launch Residential',
        expected_roi_percentage='18.00',
        projected_rental_yield='9.50',
        min_investment_amount=2500000,    # 25L
        lock_in_period_min_months=18,
        lock_in_period_max_months=18,
        is_pre_launch=True,
        early_access_ends_at=now + timedelta(days=7),
        payout_frequency='Quarterly',
        total_fractional_units=500,
        disclaimer_text=DISCLAIMER,
    ),
    # 6 — Pre-Launch Residential (countdown: 2 days — urgent)
    dict(
        property=get_prop(5),
        asset_class='Pre-Launch Residential',
        expected_roi_percentage='22.00',
        projected_rental_yield='11.00',
        min_investment_amount=5000000,    # 50L
        lock_in_period_min_months=24,
        lock_in_period_max_months=36,
        is_pre_launch=True,
        early_access_ends_at=now + timedelta(days=2, hours=3),
        payout_frequency='Monthly',
        total_fractional_units=200,
        disclaimer_text=DISCLAIMER,
    ),
    # 7 — Retail (live)
    dict(
        property=get_prop(6),
        asset_class='Retail',
        expected_roi_percentage='9.80',
        projected_rental_yield='6.20',
        min_investment_amount=1000000,    # 10L
        lock_in_period_min_months=12,
        lock_in_period_max_months=12,
        is_pre_launch=False,
        payout_frequency='Monthly',
        disclaimer_text=DISCLAIMER,
    ),
    # 8 — Pre-Launch Retail (countdown: 4 days)
    dict(
        property=get_prop(7),
        asset_class='Retail',
        expected_roi_percentage='14.50',
        projected_rental_yield='8.80',
        min_investment_amount=2500000,    # 25L
        lock_in_period_min_months=18,
        lock_in_period_max_months=24,
        is_pre_launch=True,
        early_access_ends_at=now + timedelta(days=4, hours=12),
        payout_frequency='Quarterly',
        disclaimer_text=DISCLAIMER,
    ),
]

created = 0
for data in listings_data:
    listing, was_created = InvestmentListing.objects.get_or_create(
        property=data['property'],
        asset_class=data['asset_class'],
        defaults=data
    )
    if was_created:
        created += 1
        print(f"  Created: [{listing.asset_class}] {listing.property.title} "
              f"— ROI {listing.expected_roi_percentage}% "
              f"{'[PRE-LAUNCH]' if listing.is_pre_launch else ''}")
    else:
        print(f"  Skipped (already exists): {listing}")

print(f"\nDone. {created}/{len(listings_data)} listings created.")
print("\nVerification:")
print(f"  Total InvestmentListing records: {InvestmentListing.objects.count()}")
print(f"  Pre-launch listings: {InvestmentListing.objects.filter(is_pre_launch=True).count()}")
print(f"  By asset class:")
for cls, _ in [('Commercial Office',''), ('Warehousing',''), ('Pre-Launch Residential',''), ('Retail','')]:
    count = InvestmentListing.objects.filter(asset_class=cls).count()
    print(f"    {cls}: {count}")
