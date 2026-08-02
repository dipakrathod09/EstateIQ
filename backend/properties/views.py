import django_filters
from rest_framework import viewsets, generics, permissions, status
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, F, Func
from .models import Property, PropertyImage
from .serializers import PropertySerializer, PropertyImageSerializer, ValuationInputSerializer
from .ml_client import get_price_prediction, get_ml_price_prediction

class PropertyFilter(django_filters.FilterSet):
    city = django_filters.CharFilter(field_name='city', lookup_expr='iexact')
    locality = django_filters.CharFilter(field_name='locality', lookup_expr='icontains')
    property_type = django_filters.CharFilter(field_name='property_type', lookup_expr='iexact')
    status = django_filters.CharFilter(field_name='status', lookup_expr='iexact')
    bhk = django_filters.NumberFilter(field_name='bhk')
    min_price = django_filters.NumberFilter(field_name='listed_price', lookup_expr='gte')
    max_price = django_filters.NumberFilter(field_name='listed_price', lookup_expr='lte')
    deal_tag = django_filters.CharFilter(field_name='deal_tag', lookup_expr='iexact')

    class Meta:
        model = Property
        fields = ['city', 'locality', 'property_type', 'status', 'bhk', 'min_price', 'max_price', 'deal_tag']

class IsOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.owner == request.user or getattr(request.user, 'role', '') == 'admin'

class IsListingRole(permissions.BasePermission):
    """
    Allows creation only for users whose role permits listing properties.
    Read operations (GET/HEAD/OPTIONS) are always allowed.
    """
    ALLOWED_CREATE_ROLES = {'agent', 'landlord', 'admin'}
    message = 'Only agents, landlords, and admins may create property listings.'

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        if not request.user or not request.user.is_authenticated:
            return False
        return getattr(request.user, 'role', '') in self.ALLOWED_CREATE_ROLES

class PropertyViewSet(viewsets.ModelViewSet):
    queryset = Property.objects.all()
    serializer_class = PropertySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly, IsListingRole]
    filterset_class = PropertyFilter
    search_fields = ['title', 'locality', 'description', 'city']
    ordering_fields = ['listed_price', 'created_at', 'bhk', 'area_sqft']

    def perform_create(self, serializer):
        data = serializer.validated_data.copy()
        data['listed_price'] = data.get('listed_price', 5000000.0)
        
        ml_result = get_price_prediction(data) or {}

        serializer.save(
            owner=self.request.user,
            predicted_price=ml_result.get('predicted_price'),
            confidence_score=ml_result.get('confidence_score'),
            based_on=ml_result.get('based_on'),
            deal_tag=ml_result.get('deal_tag', 'Fair Price')
        )

    def perform_update(self, serializer):
        data = serializer.validated_data.copy()
        current_data = PropertySerializer(serializer.instance).data
        current_data.update(data)
        ml_result = get_price_prediction(current_data) or {}
        serializer.save(
            predicted_price=ml_result.get('predicted_price'),
            confidence_score=ml_result.get('confidence_score'),
            based_on=ml_result.get('based_on'),
            deal_tag=ml_result.get('deal_tag', 'Fair Price')
        )

    @action(detail=True, methods=['get'], url_path='price-prediction', permission_classes=[permissions.AllowAny])
    def price_prediction(self, request, pk=None):
        prop = self.get_object()
        prediction = get_price_prediction(prop)
        if prediction is None:
            return Response(
                {"available": False, "message": "Prediction service unavailable"},
                status=status.HTTP_200_OK
            )
        prediction["available"] = True
        return Response(prediction, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='similar', permission_classes=[permissions.AllowAny])
    def similar(self, request, pk=None):
        prop = self.get_object()
        
        # Simple similarity query: same city + same bhk, ordered by area_sqft & price
        similar_qs = Property.objects.filter(
            city__iexact=prop.city,
            bhk=prop.bhk
        ).exclude(id=prop.id)
        
        # Sort in memory by abs area and price diff to guarantee compatibility across DB types
        similar_list = list(similar_qs)
        similar_list.sort(key=lambda x: (abs((x.area_sqft or 0) - (prop.area_sqft or 0)), abs((x.listed_price or 0) - (prop.listed_price or 0))))
        similar_list = similar_list[:5]

        # Fallback if fewer than 5 match exact bhk
        if len(similar_list) < 5:
            existing_ids = {p.id for p in similar_list}
            existing_ids.add(prop.id)
            extra_qs = list(Property.objects.filter(city__iexact=prop.city).exclude(id__in=existing_ids))
            extra_qs.sort(key=lambda x: abs((x.area_sqft or 0) - (prop.area_sqft or 0)))
            similar_list.extend(extra_qs[:(5 - len(similar_list))])

        serializer = PropertySerializer(similar_list, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class PropertyPricePredictionView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk=None):
        try:
            prop = Property.objects.get(pk=pk)
        except Property.DoesNotExist:
            return Response({"available": False, "message": "Property not found"}, status=status.HTTP_404_NOT_FOUND)

        prediction = get_price_prediction(prop)
        if prediction is None:
            return Response(
                {"available": False, "message": "Prediction service unavailable"},
                status=status.HTTP_200_OK
            )
        prediction["available"] = True
        return Response(prediction, status=status.HTTP_200_OK)

class PropertySimilarView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk=None):
        try:
            prop = Property.objects.get(pk=pk)
        except Property.DoesNotExist:
            return Response({'detail': 'Property not found'}, status=status.HTTP_404_NOT_FOUND)

        similar_qs = Property.objects.filter(
            city__iexact=prop.city,
            bhk=prop.bhk
        ).exclude(id=prop.id)
        
        similar_list = list(similar_qs)
        similar_list.sort(key=lambda x: (abs((x.area_sqft or 0) - (prop.area_sqft or 0)), abs((x.listed_price or 0) - (prop.listed_price or 0))))
        similar_list = similar_list[:5]

        if len(similar_list) < 5:
            existing_ids = {p.id for p in similar_list}
            existing_ids.add(prop.id)
            extra_qs = list(Property.objects.filter(city__iexact=prop.city).exclude(id__in=existing_ids))
            extra_qs.sort(key=lambda x: abs((x.area_sqft or 0) - (prop.area_sqft or 0)))
            similar_list.extend(extra_qs[:(5 - len(similar_list))])

        serializer = PropertySerializer(similar_list, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class PropertyImageViewSet(viewsets.ModelViewSet):
    queryset = PropertyImage.objects.all()
    serializer_class = PropertyImageSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

class MyListingsView(generics.ListAPIView):
    serializer_class = PropertySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Property.objects.filter(owner=self.request.user)

class EstimatePriceView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ValuationInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        ml_response = get_price_prediction(serializer.validated_data)
        if ml_response is None:
            return Response({"available": False, "message": "Prediction service unavailable"}, status=status.HTTP_200_OK)
        return Response(ml_response, status=status.HTTP_200_OK)
