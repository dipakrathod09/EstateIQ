from django.contrib import admin
from .models import InvestmentListing, InvestmentInquiry


@admin.register(InvestmentListing)
class InvestmentListingAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'asset_class', 'property', 'expected_roi_percentage',
        'projected_rental_yield', 'min_investment_amount',
        'lock_in_period_min_months', 'lock_in_period_max_months',
        'is_pre_launch', 'payout_frequency', 'created_at',
    ]
    list_filter = ['asset_class', 'is_pre_launch', 'payout_frequency']
    search_fields = ['property__title', 'property__city', 'asset_class']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(InvestmentInquiry)
class InvestmentInquiryAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'investor_name', 'phone', 'email',
        'investment_listing', 'preferred_investment_range',
        'requested_pitch_deck', 'status', 'created_at',
    ]
    list_filter = ['status', 'requested_pitch_deck', 'preferred_investment_range']
    search_fields = ['investor_name', 'email', 'phone', 'pan_number']
    readonly_fields = ['created_at', 'user']
    list_editable = ['status']
    ordering = ['-created_at']
