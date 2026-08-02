from rest_framework import serializers
from .models import SavedProperty, Inquiry
from properties.serializers import PropertySerializer

class SavedPropertySerializer(serializers.ModelSerializer):
    property_details = PropertySerializer(source='property', read_only=True)

    class Meta:
        model = SavedProperty
        fields = ['id', 'user', 'property', 'property_details', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']

class InquirySerializer(serializers.ModelSerializer):
    property_title = serializers.CharField(source='property.title', read_only=True)

    class Meta:
        model = Inquiry
        fields = ['id', 'property', 'property_title', 'user', 'name', 'email', 'phone', 'message', 'status', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']
