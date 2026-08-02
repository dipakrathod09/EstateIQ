from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PropertyViewSet, PropertyImageViewSet, MyListingsView, EstimatePriceView,
    PropertyPricePredictionView, PropertySimilarView
)

router = DefaultRouter()
router.register(r'images', PropertyImageViewSet, basename='property_image')
router.register(r'', PropertyViewSet, basename='property')

urlpatterns = [
    path('my-listings/', MyListingsView.as_view(), name='my_listings'),
    path('estimate-price/', EstimatePriceView.as_view(), name='estimate_price'),
    path('<int:pk>/price-prediction/', PropertyPricePredictionView.as_view(), name='property_price_prediction'),
    path('<int:pk>/similar/', PropertySimilarView.as_view(), name='property_similar'),
    path('', include(router.urls)),
]
