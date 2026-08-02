from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LeaseViewSet, PaymentViewSet, MaintenanceRequestViewSet

router = DefaultRouter()
router.register(r'leases', LeaseViewSet, basename='lease')
router.register(r'payments', PaymentViewSet, basename='payment')
router.register(r'maintenance', MaintenanceRequestViewSet, basename='maintenance')

urlpatterns = [
    path('', include(router.urls)),
]
