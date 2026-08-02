from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from properties.models import Property


ASSET_CLASS_CHOICES = (
    ('Commercial Office', 'Commercial Office'),
    ('Warehousing', 'Warehousing'),
    ('Pre-Launch Residential', 'Pre-Launch Residential'),
    ('Retail', 'Retail'),
)

PAYOUT_FREQUENCY_CHOICES = (
    ('Monthly', 'Monthly'),
    ('Quarterly', 'Quarterly'),
)

INVESTMENT_RANGE_CHOICES = (
    ('10L-25L', '₹10L – ₹25L'),
    ('25L-50L', '₹25L – ₹50L'),
    ('50L-1Cr', '₹50L – ₹1Cr'),
    ('1Cr+', '₹1Cr+'),
)

INQUIRY_STATUS_CHOICES = (
    ('new', 'New'),
    ('contacted', 'Contacted'),
    ('qualified', 'Qualified'),
    ('converted', 'Converted'),
    ('dropped', 'Dropped'),
)


class InvestmentListing(models.Model):
    property = models.ForeignKey(
        Property, on_delete=models.CASCADE, related_name='investment_listings'
    )
    asset_class = models.CharField(max_length=50, choices=ASSET_CLASS_CHOICES)
    expected_roi_percentage = models.DecimalField(
        max_digits=5, decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text="Expected annual ROI as a percentage, e.g. 12.50 means 12.5%"
    )
    projected_rental_yield = models.DecimalField(
        max_digits=5, decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text="Projected rental yield as a percentage"
    )
    min_investment_amount = models.PositiveIntegerField(
        help_text="Minimum ticket size in INR (integer rupees, not formatted string)"
    )
    lock_in_period_min_months = models.PositiveIntegerField(
        help_text="Minimum lock-in period in months"
    )
    lock_in_period_max_months = models.PositiveIntegerField(
        help_text="Maximum lock-in period in months (same as min for fixed periods)"
    )
    is_pre_launch = models.BooleanField(default=False)
    is_sample_data = models.BooleanField(
        default=True,
        help_text="Flags listing as illustrative pilot sample data. Displays 'Sample Data' badge."
    )
    early_access_ends_at = models.DateTimeField(
        null=True, blank=True,
        help_text="Datetime when early-access / pre-launch window closes. Drives countdown timer."
    )
    payout_frequency = models.CharField(
        max_length=20, choices=PAYOUT_FREQUENCY_CHOICES, default='Quarterly'
    )
    total_fractional_units = models.PositiveIntegerField(
        null=True, blank=True,
        help_text="Reserved for future fractional ownership logic — not used in any transaction flow yet."
    )
    disclaimer_text = models.TextField(
        help_text=(
            "Regulatory disclaimer REQUIRED on every listing. "
            "Must not be blank. "
            "Example: 'Projected returns are illustrative estimates, not guaranteed. "
            "Past performance is not indicative of future results.'"
        )
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.asset_class} — {self.property.title} ({self.expected_roi_percentage}% ROI)"

    def clean(self):
        from django.core.exceptions import ValidationError
        if not self.disclaimer_text or not self.disclaimer_text.strip():
            raise ValidationError({'disclaimer_text': 'disclaimer_text is required and must not be blank.'})
        if self.lock_in_period_max_months < self.lock_in_period_min_months:
            raise ValidationError({
                'lock_in_period_max_months': 'Max lock-in period cannot be less than min lock-in period.'
            })


class InvestmentInquiry(models.Model):
    investment_listing = models.ForeignKey(
        InvestmentListing, on_delete=models.CASCADE, related_name='inquiries'
    )
    # Nullable FK — populated if the submitting user has an account, anonymous otherwise
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='investment_inquiries'
    )
    investor_name = models.CharField(max_length=200)
    phone = models.CharField(max_length=20)
    email = models.EmailField()
    preferred_investment_range = models.CharField(
        max_length=20, choices=INVESTMENT_RANGE_CHOICES
    )
    pan_number = models.CharField(
        max_length=10, null=True, blank=True,
        help_text="Collecting early for future KYC; nullable now."
    )
    requested_pitch_deck = models.BooleanField(default=False)
    status = models.CharField(
        max_length=20, choices=INQUIRY_STATUS_CHOICES, default='new'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Inquiry from {self.investor_name} — {self.investment_listing}"
