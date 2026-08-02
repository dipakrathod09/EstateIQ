from django.db import models
from django.conf import settings

class Property(models.Model):
    CITY_CHOICES = (
        ('Delhi NCR', 'Delhi NCR'),
        ('Mumbai', 'Mumbai'),
        ('Bangalore', 'Bangalore'),
        ('Hyderabad', 'Hyderabad'),
        ('Ahmedabad', 'Ahmedabad'),
    )

    PROPERTY_TYPE_CHOICES = (
        ('Apartment', 'Apartment'),
        ('Independent House', 'Independent House'),
        ('Villa', 'Villa'),
        ('Penthouse', 'Penthouse'),
        ('Studio', 'Studio'),
    )

    FURNISHING_CHOICES = (
        ('Unfurnished', 'Unfurnished'),
        ('Semi-Furnished', 'Semi-Furnished'),
        ('Fully-Furnished', 'Fully-Furnished'),
        ('Fully Furnished', 'Fully Furnished'),
    )

    FACING_CHOICES = (
        ('North', 'North'),
        ('South', 'South'),
        ('East', 'East'),
        ('West', 'West'),
        ('North-East', 'North-East'),
        ('North-West', 'North-West'),
        ('South-East', 'South-East'),
        ('South-West', 'South-West'),
    )

    STATUS_CHOICES = (
        ('for_sale', 'For Sale'),
        ('for_rent', 'For Rent'),
        ('available', 'Available'),
        ('sold', 'Sold'),
        ('rented', 'Rented'),
    )

    # General Info & Ownership
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='properties')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='for_sale')
    images = models.JSONField(default=list, blank=True)

    # ML Microservice Input Fields (100% exact matching key names)
    city = models.CharField(max_length=100, choices=CITY_CHOICES, default='Ahmedabad')
    sub_market = models.CharField(max_length=100, default='Central', blank=True)
    locality = models.CharField(max_length=100, default='Bodakdev')
    property_type = models.CharField(max_length=50, choices=PROPERTY_TYPE_CHOICES, default='Apartment')
    bhk = models.IntegerField(default=2)
    area_sqft = models.FloatField(default=1200.0)
    floor = models.IntegerField(default=2)
    total_floors = models.IntegerField(default=10)
    age_years = models.IntegerField(default=3)
    furnishing = models.CharField(max_length=50, choices=FURNISHING_CHOICES, default='Semi-Furnished')
    facing = models.CharField(max_length=50, choices=FACING_CHOICES, default='East')

    # Distance to Amenities (km)
    dist_metro_km = models.FloatField(default=1.5)
    dist_school_km = models.FloatField(default=1.0)
    dist_hospital_km = models.FloatField(default=1.5)
    dist_it_hub_km = models.FloatField(default=3.0)

    # Amenities Booleans
    has_gym = models.BooleanField(default=False)
    has_pool = models.BooleanField(default=False)
    has_clubhouse = models.BooleanField(default=False)
    has_security = models.BooleanField(default=True)
    has_power_backup = models.BooleanField(default=True)
    has_parking = models.BooleanField(default=True)
    has_lift = models.BooleanField(default=True)
    rera_approved = models.BooleanField(default=True)

    # Pricing & ML Output Fields
    listed_price = models.FloatField(default=5000000.0)
    predicted_price = models.FloatField(null=True, blank=True)
    confidence_score = models.FloatField(null=True, blank=True)
    based_on = models.CharField(max_length=100, null=True, blank=True)
    deal_tag = models.CharField(max_length=50, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.city} ({self.bhk} BHK)"

class PropertyImage(models.Model):
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name='gallery')
    image = models.CharField(max_length=500)
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Image for {self.property.title}"
