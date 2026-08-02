from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    InvestmentListingViewSet,
    InvestmentInquireView,
    InvestmentInquiryListView,
    InvestmentInquiryDetailView,
)

router = DefaultRouter()
router.register(r'', InvestmentListingViewSet, basename='investment')

urlpatterns = [
    path('<int:pk>/inquire/', InvestmentInquireView.as_view(), name='investment-inquire'),
    path('<int:pk>/inquiries/', InvestmentInquiryListView.as_view(), name='investment-inquiries'),
    path('inquiries/<int:pk>/', InvestmentInquiryDetailView.as_view(), name='investment-inquiry-detail'),
    path('', include(router.urls)),
]
