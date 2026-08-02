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
        ('Unknown', 'Unknown'),
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
        ('Unknown', 'Unknown'),
    )

    STATUS_CHOICES = (
        ('for_sale', 'For Sale'),
        ('for_rent', 'For Rent'),
        ('available', 'Available'),
        ('sold', 'Sold'),
        ('rented', 'Rented'),
    )

    POSSESSION_STATUS_CHOICES = (
        ('Ready to Move', 'Ready to Move'),
        ('Under Construction', 'Under Construction'),
        ('Unknown', 'Unknown'),
    )

    # General Info & Ownership
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='properties')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='for_sale')
    images = models.JSONField(default=list, blank=True)

    # Project & Developer Details
    project_name = models.CharField(max_length=200, null=True, blank=True)
    developer = models.CharField(max_length=200, null=True, blank=True)
    possession_status = models.CharField(max_length=50, choices=POSSESSION_STATUS_CHOICES, default='Ready to Move', null=True, blank=True)

    # ML Microservice Input Fields (100% exact matching key names)
    city = models.CharField(max_length=100, choices=CITY_CHOICES, default='Ahmedabad')
    sub_market = models.CharField(max_length=100, default='Central', blank=True)
    locality = models.CharField(max_length=100, default='Bodakdev')
    property_type = models.CharField(max_length=50, choices=PROPERTY_TYPE_CHOICES, default='Apartment')
    bhk = models.IntegerField(default=2)
    bathroom = models.IntegerField(null=True, blank=True)
    area_sqft = models.FloatField(default=1200.0)
    floor = models.IntegerField(default=2)
    total_floors = models.IntegerField(default=10)
    age_years = models.IntegerField(default=3)
    furnishing = models.CharField(max_length=50, choices=FURNISHING_CHOICES, default='Semi-Furnished')
    facing = models.CharField(max_length=50, choices=FACING_CHOICES, default='East')

    # Data Quality Provenance & Import External Key
    external_source_id = models.CharField(max_length=100, null=True, blank=True, unique=True, db_index=True)

    # Distance to Amenities (km) -- Nullable for imported datasets lacking proximity data
    dist_metro_km = models.FloatField(null=True, blank=True, default=None)
    dist_school_km = models.FloatField(null=True, blank=True, default=None)
    dist_hospital_km = models.FloatField(null=True, blank=True, default=None)
    dist_it_hub_km = models.FloatField(null=True, blank=True, default=None)


    # Amenities Booleans
    has_gym = models.BooleanField(default=False)
    has_pool = models.BooleanField(default=False)
    has_clubhouse = models.BooleanField(default=False)
    has_security = models.BooleanField(default=True)
    has_power_backup = models.BooleanField(default=True)
    has_parking = models.BooleanField(default=True)
    has_lift = models.BooleanField(default=True)
    rera_approved = models.BooleanField(default=True)

    # GIS Spatial Location
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

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
        indexes = [
            models.Index(fields=['city', 'property_type', 'listed_price'], name='prop_city_type_price_idx'),
            models.Index(fields=['locality', 'bhk'], name='prop_locality_bhk_idx'),
        ]


    def __str__(self):
        return f"{self.title} - {self.city} ({self.bhk} BHK)"

class PropertyImage(models.Model):
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name='gallery')
    image = models.CharField(max_length=500)
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Image for {self.property.title}"

class LocalityCoordinateCache(models.Model):
    city = models.CharField(max_length=100)
    locality = models.CharField(max_length=100)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    geocoded_at = models.DateTimeField(auto_now=True)
    source = models.CharField(max_length=50, default='nominatim')

    class Meta:
        unique_together = ('city', 'locality')
        indexes = [
            models.Index(fields=['city', 'locality'], name='loc_coord_cache_idx'),
        ]

    def __str__(self):
        return f"{self.locality}, {self.city} -> ({self.latitude}, {self.longitude}) [{self.source}]"

