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

class MaintenanceRequestSerializer(serializers.ModelSerializer):
    property_title = serializers.CharField(source='property.title', read_only=True)
    tenant_name = serializers.CharField(source='tenant.username', read_only=True)

    class Meta:
        model = MaintenanceRequest
        fields = '__all__'
        read_only_fields = ['id', 'tenant', 'created_at', 'updated_at']
