from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from datetime import date
from .models import LeaseAgreement, Payment, MaintenanceRequest
from .serializers import LeaseAgreementSerializer, PaymentSerializer, MaintenanceRequestSerializer
from .services import generate_payment_schedule

class LeaseViewSet(viewsets.ModelViewSet):
    serializer_class = LeaseAgreementSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        role_lower = (user.role or '').lower()
        if role_lower in ['landlord', 'admin']:
            return LeaseAgreement.objects.filter(landlord=user)
        return LeaseAgreement.objects.filter(tenant=user)

    def perform_create(self, serializer):
        lease = serializer.save()
        generate_payment_schedule(lease, months=12)

    @action(detail=True, methods=['post'])
    def generate_payments(self, request, pk=None):
        lease = self.get_object()
        months = int(request.data.get('months', 12))
        payments = generate_payment_schedule(lease, months=months)
        serializer = PaymentSerializer(payments, many=True)
        return Response({'status': 'Payment schedule generated', 'payments': serializer.data}, status=status.HTTP_201_CREATED)

class PaymentViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        role_lower = (user.role or '').lower()
        if role_lower in ['landlord', 'agent', 'admin']:
            return Payment.objects.filter(lease__landlord=user)
        return Payment.objects.filter(lease__tenant=user)

    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        payment = self.get_object()
        payment.status = 'paid'
        payment.paid_date = date.today()
        payment.save()
        return Response(PaymentSerializer(payment).data, status=status.HTTP_200_OK)

class MaintenanceRequestViewSet(viewsets.ModelViewSet):
    serializer_class = MaintenanceRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        role_lower = (user.role or '').lower()
        if role_lower in ['landlord', 'agent', 'admin']:
            return MaintenanceRequest.objects.filter(property__owner=user)
        return MaintenanceRequest.objects.filter(tenant=user)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.user)

    def perform_update(self, serializer):
        instance = serializer.save()
        if instance.status == 'resolved' and not instance.resolved_at:
            instance.resolved_at = date.today()
            instance.save()
