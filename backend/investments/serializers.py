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

    def validate_disclaimer_text(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError(
                'disclaimer_text is required and must not be blank.'
            )
        return value

    def validate(self, data):
        min_m = data.get('lock_in_period_min_months',
                         getattr(self.instance, 'lock_in_period_min_months', 0))
        max_m = data.get('lock_in_period_max_months',
                         getattr(self.instance, 'lock_in_period_max_months', 0))
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

    def validate_phone(self, value):
        cleaned = re.sub(r'[\s\-\(\)\+]', '', value)
        if not re.match(r'^\d{10,13}$', cleaned):
            raise serializers.ValidationError(
                'Enter a valid phone number (10–13 digits).'
            )
        return value

    def validate_email(self, value):
        # EmailField already validates format; add a domain check
        if '@' not in value or '.' not in value.split('@')[-1]:
            raise serializers.ValidationError('Enter a valid email address.')
        return value
