from rest_framework import serializers
from .models import SavedProperty, Inquiry
from properties.serializers import PropertySerializer

class SavedPropertySerializer(serializers.ModelSerializer):
    property_details = PropertySerializer(source='property', read_only=True)

    class Meta:
        model = SavedProperty
        fields = ['id', 'user', 'property', 'property_details', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']

import re

class InquirySerializer(serializers.ModelSerializer):
    property_title = serializers.CharField(source='property.title', read_only=True)

    class Meta:
        model = Inquiry
        fields = ['id', 'property', 'property_title', 'user', 'name', 'email', 'phone', 'message', 'status', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']

    def validate_name(self, value):
        val = (value or '').strip()
        if not val or len(val) < 2:
            raise serializers.ValidationError('Name must be at least 2 characters long.')
        return val

    def validate_email(self, value):
        val = (value or '').strip().lower()
        if not val or not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', val):
            raise serializers.ValidationError('Please enter a valid email address.')
        return val

    def validate_phone(self, value):
        val = (value or '').strip()
        if not val or not re.match(r'^\+?[\d\s\-()]{10,15}$', val):
            raise serializers.ValidationError('Please enter a valid phone number (10 to 15 digits).')
        return val

    def validate_message(self, value):
        val = (value or '').strip()
        if not val or len(val) < 5:
            raise serializers.ValidationError('Inquiry message must be at least 5 characters long.')
        return val
