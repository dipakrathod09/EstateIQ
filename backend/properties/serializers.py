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
        numeric_defaults = {
            'bhk': 2,
            'area_sqft': 1200.0,
            'floor': 2,
            'total_floors': 10,
            'age_years': 3,
            'listed_price': 5000000.0,
            'dist_metro_km': 1.5,
            'dist_school_km': 1.0,
            'dist_hospital_km': 1.5,
            'dist_it_hub_km': 3.0,
        }
        for k, default_val in numeric_defaults.items():
            if k in data and (data[k] == '' or data[k] is None):
                data[k] = default_val
        return super().to_internal_value(data)

class ValuationInputSerializer(serializers.Serializer):
    city = serializers.ChoiceField(choices=Property.CITY_CHOICES, default='Ahmedabad')
    sub_market = serializers.CharField(default='Central', required=False)
    locality = serializers.CharField(default='Bodakdev')
    property_type = serializers.ChoiceField(choices=Property.PROPERTY_TYPE_CHOICES, default='Apartment')
    bhk = serializers.IntegerField(default=2)
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
    
    listed_price = serializers.FloatField(required=False, allow_null=True, default=5000000.0)
