from django.urls import path
from .views import SavedPropertyListView, SavedPropertyToggleView, InquiryListCreateView, InquiryDetailView

urlpatterns = [
    path('saved/', SavedPropertyListView.as_view(), name='saved_properties'),
    path('saved/toggle/', SavedPropertyToggleView.as_view(), name='saved_property_toggle'),
    path('inquiries/', InquiryListCreateView.as_view(), name='inquiries'),
    path('inquiries/<int:pk>/', InquiryDetailView.as_view(), name='inquiry_detail'),
]
