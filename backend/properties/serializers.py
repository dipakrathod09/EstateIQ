from rest_framework import serializers
from .models import Property, PropertyImage
from accounts.serializers import UserSerializer

class PropertyImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PropertyImage
        fields = ['id', 'image', 'is_primary', 'created_at']

class PropertySerializer(serializers.ModelSerializer):
    owner_details = UserSerializer(source='owner', read_only=True)
    gallery = PropertyImageSerializer(many=True, read_only=True)

    class Meta:
        model = Property
        fields = '__all__'
        read_only_fields = ['id', 'owner', 'predicted_price', 'confidence_score', 'based_on', 'deal_tag', 'created_at', 'updated_at']

    def to_internal_value(self, data):
        data = data.copy()
        # NOTE: dist_*_km fields are intentionally NOT listed here -- they are nullable
        # (imported properties from CSV legitimately have None for these fields).
        # Coercing None to a default float would silently overwrite valid null values on update.
        # The ML payload builder (ml_client.py) handles absent/null distance fields correctly.
        numeric_defaults = {
            'bhk': 2,
            'area_sqft': 1200.0,
            'floor': 2,
            'total_floors': 10,
            'age_years': 3,
            'listed_price': 5000000.0,
        }
        for k, default_val in numeric_defaults.items():
            if k in data and (data[k] == '' or data[k] is None):
                data[k] = default_val
        return super().to_internal_value(data)

    def validate_area_sqft(self, value):
        if value < 100.0:
            raise serializers.ValidationError('Carpet area sqft must be at least 100 sqft.')
        if value > 50000.0:
            raise serializers.ValidationError('Carpet area sqft cannot exceed 50,000 sqft.')
        return value

    def validate_listed_price(self, value):
        if value < 100000.0:
            raise serializers.ValidationError('Asking price must be at least ₹1,00,000 (1 Lakh).')
        if value > 1000000000.0:
            raise serializers.ValidationError('Asking price cannot exceed ₹100 Crore.')
        return value

    def validate_bhk(self, value):
        if value < 1 or value > 20:
            raise serializers.ValidationError('BHK count must be between 1 and 20.')
        return value

    def validate_age_years(self, value):
        if value is not None and (value < 0 or value > 150):
            raise serializers.ValidationError('Property age must be between 0 and 150 years.')
        return value

    def validate_total_floors(self, value):
        if value is not None and (value < 1 or value > 200):
            raise serializers.ValidationError('Total floors must be between 1 and 200.')
        return value

    def validate(self, data):
        floor = data.get('floor')
        total_floors = data.get('total_floors')
        if floor is not None and floor < 0:
            raise serializers.ValidationError({'floor': 'Floor level cannot be negative.'})
        if floor is not None and total_floors is not None and floor > total_floors:
            raise serializers.ValidationError({'floor': 'Floor level cannot exceed total floors in the building.'})
        
        for dist_field in ['dist_metro_km', 'dist_school_km', 'dist_hospital_km', 'dist_it_hub_km']:
            val = data.get(dist_field)
            if val is not None and (val < 0.0 or val > 100.0):
                raise serializers.ValidationError({dist_field: f'{dist_field} must be between 0.0 and 100.0 km.'})

        city = data.get('city') or getattr(self.instance, 'city', None)
        locality = data.get('locality') or getattr(self.instance, 'locality', None)
        if city and locality:
            from .models import LocalityCoordinateCache
            city_str = str(city).strip()
            loc_str = str(locality).strip()
            city_qs = Property.objects.filter(city__iexact=city_str)
            if city_qs.exists():
                has_locality = city_qs.filter(locality__iexact=loc_str).exists() or \
                               LocalityCoordinateCache.objects.filter(city__iexact=city_str, locality__iexact=loc_str).exists()
                if not has_locality:
                    raise serializers.ValidationError({
                        'locality': f"Locality '{loc_str}' is not a recognized area in {city_str}. Please select a valid locality for {city_str}."
                    })
        return data

class ValuationInputSerializer(serializers.Serializer):
    city = serializers.ChoiceField(choices=Property.CITY_CHOICES, default='Ahmedabad')
    sub_market = serializers.CharField(default='Central', required=False)
    locality = serializers.CharField(default='Bodakdev')
    property_type = serializers.ChoiceField(choices=Property.PROPERTY_TYPE_CHOICES, default='Apartment')
    bhk = serializers.IntegerField(default=2)
    bathroom = serializers.IntegerField(required=False, allow_null=True)
    project_name = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    developer = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    possession_status = serializers.ChoiceField(choices=Property.POSSESSION_STATUS_CHOICES, default='Ready to Move', required=False)
    area_sqft = serializers.FloatField(default=1200.0)
    floor = serializers.IntegerField(default=2)
    total_floors = serializers.IntegerField(default=10)
    age_years = serializers.IntegerField(default=3)
    furnishing = serializers.ChoiceField(choices=Property.FURNISHING_CHOICES, default='Semi-Furnished')
    facing = serializers.ChoiceField(choices=Property.FACING_CHOICES, default='East')

    
    dist_metro_km = serializers.FloatField(default=1.5)
    dist_school_km = serializers.FloatField(default=1.0)
    dist_hospital_km = serializers.FloatField(default=1.5)
    dist_it_hub_km = serializers.FloatField(default=3.0)
    
    has_gym = serializers.BooleanField(default=False)
    has_pool = serializers.BooleanField(default=False)
    has_clubhouse = serializers.BooleanField(default=False)
    has_security = serializers.BooleanField(default=True)
    has_power_backup = serializers.BooleanField(default=True)
    has_parking = serializers.BooleanField(default=True)
    has_lift = serializers.BooleanField(default=True)
    rera_approved = serializers.BooleanField(default=True)
    
    latitude = serializers.FloatField(required=False, allow_null=True)
    longitude = serializers.FloatField(required=False, allow_null=True)
    listed_price = serializers.FloatField(required=False, allow_null=True, default=5000000.0)

    def validate_area_sqft(self, value):
        if value < 100.0:
            raise serializers.ValidationError('Carpet area sqft must be at least 100 sqft.')
        if value > 50000.0:
            raise serializers.ValidationError('Carpet area sqft cannot exceed 50,000 sqft.')
        return value

    def validate_bhk(self, value):
        if value < 1 or value > 20:
            raise serializers.ValidationError('BHK count must be between 1 and 20.')
        return value

    def validate(self, data):
        city = data.get('city')
        locality = data.get('locality')
        if city and locality:
            from .models import LocalityCoordinateCache
            city_str = str(city).strip()
            loc_str = str(locality).strip()
            city_qs = Property.objects.filter(city__iexact=city_str)
            if city_qs.exists():
                has_locality = city_qs.filter(locality__iexact=loc_str).exists() or \
                               LocalityCoordinateCache.objects.filter(city__iexact=city_str, locality__iexact=loc_str).exists()
                if not has_locality:
                    raise serializers.ValidationError({
                        'locality': f"Locality '{loc_str}' is not a recognized area in {city_str}. Please select a valid locality for {city_str}."
                    })
        return data
