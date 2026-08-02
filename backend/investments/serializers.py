import re
from rest_framework import serializers
from .models import InvestmentListing, InvestmentInquiry
from properties.serializers import PropertySerializer


class InvestmentListingSerializer(serializers.ModelSerializer):
    property_details = PropertySerializer(source='property', read_only=True)
    # Computed display helpers — frontend should use these for display,
    # raw integers are available for any computation needs
    min_investment_display = serializers.SerializerMethodField()
    lock_in_display = serializers.SerializerMethodField()
    inquiry_count = serializers.SerializerMethodField()

    class Meta:
        model = InvestmentListing
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_expected_roi_percentage(self, value):
        if value <= 0.0 or value > 100.0:
            raise serializers.ValidationError('Expected ROI percentage must be between 0.1% and 100%.')
        return value

    def validate_projected_rental_yield(self, value):
        if value <= 0.0 or value > 100.0:
            raise serializers.ValidationError('Projected rental yield percentage must be between 0.1% and 100%.')
        return value

    def validate_min_investment_amount(self, value):
        if value < 100000:
            raise serializers.ValidationError('Minimum investment amount must be at least ₹1,00,000 (1 Lakh).')
        return value

    def validate_disclaimer_text(self, value):
        val = (value or '').strip()
        if not val or len(val) < 20:
            raise serializers.ValidationError(
                'disclaimer_text is required and must be at least 20 characters long.'
            )
        return val

    def validate(self, data):
        min_m = data.get('lock_in_period_min_months',
                         getattr(self.instance, 'lock_in_period_min_months', 0))
        max_m = data.get('lock_in_period_max_months',
                         getattr(self.instance, 'lock_in_period_max_months', 0))
        if min_m < 1:
            raise serializers.ValidationError({'lock_in_period_min_months': 'Lock-in period must be at least 1 month.'})
        if max_m < min_m:
            raise serializers.ValidationError({
                'lock_in_period_max_months': 'Max lock-in must be >= min lock-in.'
            })
        return data

    def get_min_investment_display(self, obj):
        """Format rupee integer for display: 2500000 → '25L', 10000000 → '1Cr'."""
        amt = obj.min_investment_amount
        if amt >= 10_000_000:
            cr = amt / 10_000_000
            return f"₹{cr:.1f} Cr" if cr % 1 else f"₹{int(cr)} Cr"
        if amt >= 100_000:
            lakh = amt / 100_000
            return f"₹{lakh:.0f}L"
        return f"₹{amt:,}"

    def get_lock_in_display(self, obj):
        lo, hi = obj.lock_in_period_min_months, obj.lock_in_period_max_months
        if lo == hi:
            return f"{lo} months"
        return f"{lo}–{hi} months"

    def get_inquiry_count(self, obj):
        return obj.inquiries.count()


class InvestmentInquirySerializer(serializers.ModelSerializer):
    listing_title = serializers.CharField(
        source='investment_listing.property.title', read_only=True
    )

    class Meta:
        model = InvestmentInquiry
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'user', 'investment_listing']

    def validate_investor_name(self, value):
        val = (value or '').strip()
        if not val or len(val) < 2:
            raise serializers.ValidationError('Investor name must be at least 2 characters long.')
        return val

    def validate_phone(self, value):
        cleaned = re.sub(r'[\s\-\(\)\+]', '', value or '')
        if not re.match(r'^\d{10,15}$', cleaned):
            raise serializers.ValidationError(
                'Enter a valid phone number (10 to 15 digits).'
            )
        return value

    def validate_email(self, value):
        val = (value or '').strip().lower()
        if '@' not in val or '.' not in val.split('@')[-1]:
            raise serializers.ValidationError('Enter a valid email address.')
        return val

    def validate_pan_number(self, value):
        if value:
            val = value.strip().upper()
            if not re.match(r'^[A-Z]{5}[0-9]{4}[A-Z]{1}$', val):
                raise serializers.ValidationError('Enter a valid 10-character Indian PAN number (e.g. ABCDE1234F).')
            return val
        return value
