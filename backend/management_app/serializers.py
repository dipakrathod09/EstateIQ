from rest_framework import serializers
from .models import LeaseAgreement, Payment, MaintenanceRequest
from properties.serializers import PropertySerializer
from accounts.serializers import UserSerializer

class PaymentSerializer(serializers.ModelSerializer):
    property_title = serializers.CharField(source='lease.property.title', read_only=True)
    tenant_name = serializers.CharField(source='lease.tenant.username', read_only=True)

    class Meta:
        model = Payment
        fields = '__all__'

class LeaseAgreementSerializer(serializers.ModelSerializer):
    property_details = PropertySerializer(source='property', read_only=True)
    tenant_details = UserSerializer(source='tenant', read_only=True)
    landlord_details = UserSerializer(source='landlord', read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)

    class Meta:
        model = LeaseAgreement
        fields = '__all__'
        read_only_fields = ['id', 'created_at']

    def validate_monthly_rent(self, value):
        if value <= 0:
            raise serializers.ValidationError('Monthly rent must be greater than 0.')
        return value

    def validate_security_deposit(self, value):
        if value < 0:
            raise serializers.ValidationError('Security deposit cannot be negative.')
        return value

class MaintenanceRequestSerializer(serializers.ModelSerializer):
    property_title = serializers.CharField(source='property.title', read_only=True)
    tenant_name = serializers.CharField(source='tenant.username', read_only=True)

    class Meta:
        model = MaintenanceRequest
        fields = '__all__'
        read_only_fields = ['id', 'tenant', 'created_at', 'updated_at']

    def validate_title(self, value):
        val = (value or '').strip()
        if not val or len(val) < 5:
            raise serializers.ValidationError('Maintenance request title must be at least 5 characters long.')
        return val

    def validate_description(self, value):
        val = (value or '').strip()
        if not val or len(val) < 10:
            raise serializers.ValidationError('Detailed description must be at least 10 characters long.')
        return val
