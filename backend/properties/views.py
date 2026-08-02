import django_filters
from rest_framework import viewsets, generics, permissions, status
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, F, Func
from .models import Property, PropertyImage
from .serializers import PropertySerializer, PropertyImageSerializer, ValuationInputSerializer
from .ml_client import get_price_prediction, get_ml_price_prediction
from .geocoding_service import geocode_locality
from rest_framework import filters as drf_filters

class PropertyFilter(django_filters.FilterSet):
    city = django_filters.CharFilter(field_name='city', lookup_expr='iexact')
    locality = django_filters.CharFilter(field_name='locality', lookup_expr='icontains')
    property_type = django_filters.CharFilter(field_name='property_type', lookup_expr='iexact')
    status = django_filters.CharFilter(field_name='status', lookup_expr='iexact')

    # Multi-value BHK filter: supports ?bhk=1,2,3 and ?bhk=1,2,4+ (OR query)
    bhk = django_filters.CharFilter(method='filter_bhk', label='BHK Multi-select')
    bhk_gte4 = django_filters.BooleanFilter(method='filter_bhk_gte4', label='BHK 4+')

    # listing_type is a frontend-friendly alias for the status field:
    #   listing_type=Buy   -> status=for_sale
    #   listing_type=Rent  -> status=for_rent
    listing_type = django_filters.CharFilter(method='filter_listing_type', label='Listing Type (Buy/Rent)')

    # rera_verified is a frontend-friendly alias for rera_approved.
    # TODO Phase 7: switch this to filter on verification_status='verified' once the
    # RERA document pipeline ships -- that will be a one-line change here, not a rewrite.
    rera_verified = django_filters.BooleanFilter(field_name='rera_approved', label='RERA Verified')

    min_price = django_filters.NumberFilter(field_name='listed_price', lookup_expr='gte')
    max_price = django_filters.NumberFilter(field_name='listed_price', lookup_expr='lte')
    min_area = django_filters.NumberFilter(field_name='area_sqft', lookup_expr='gte')
    max_area = django_filters.NumberFilter(field_name='area_sqft', lookup_expr='lte')
    deal_tag = django_filters.CharFilter(field_name='deal_tag', lookup_expr='iexact')
    possession_status = django_filters.CharFilter(field_name='possession_status', lookup_expr='iexact')
    developer = django_filters.CharFilter(field_name='developer', lookup_expr='icontains')
    project_name = django_filters.CharFilter(field_name='project_name', lookup_expr='icontains')
    bathroom = django_filters.NumberFilter(field_name='bathroom')

    # GIS Spatial Bounding Box Filters
    min_lat = django_filters.NumberFilter(field_name='latitude', lookup_expr='gte')
    max_lat = django_filters.NumberFilter(field_name='latitude', lookup_expr='lte')
    min_lng = django_filters.NumberFilter(field_name='longitude', lookup_expr='gte')
    max_lng = django_filters.NumberFilter(field_name='longitude', lookup_expr='lte')

    # Amenities Filters
    has_gym = django_filters.BooleanFilter(field_name='has_gym')
    has_pool = django_filters.BooleanFilter(field_name='has_pool')
    has_parking = django_filters.BooleanFilter(field_name='has_parking')
    has_clubhouse = django_filters.BooleanFilter(field_name='has_clubhouse')
    rera_approved = django_filters.BooleanFilter(field_name='rera_approved')

    def filter_bhk(self, queryset, name, value):
        if not value:
            return queryset
        parts = [p.strip() for p in str(value).split(',') if p.strip()]
        nums = []
        has_gte4 = False
        for p in parts:
            if p in ('4+', '4'):
                # Note: if "4+" is passed, include 4+
                has_gte4 = True
            elif p.isdigit():
                nums.append(int(p))

        if nums and has_gte4:
            return queryset.filter(Q(bhk__in=nums) | Q(bhk__gte=4))
        elif nums:
            return queryset.filter(bhk__in=nums)
        elif has_gte4:
            return queryset.filter(bhk__gte=4)
        return queryset

    def filter_bhk_gte4(self, queryset, name, value):
        if value:
            return queryset.filter(bhk__gte=4)
        return queryset

    def filter_listing_type(self, queryset, name, value):
        mapping = {'buy': 'for_sale', 'rent': 'for_rent'}
        mapped = mapping.get(value.lower().strip())
        if mapped:
            return queryset.filter(status=mapped)
        return queryset

    class Meta:
        model = Property
        fields = [
            'city', 'locality', 'property_type', 'status', 'bhk', 'bhk_gte4',
            'listing_type', 'rera_verified', 'bathroom',
            'min_price', 'max_price', 'min_area', 'max_area', 'deal_tag',
            'possession_status', 'developer', 'project_name',
            'min_lat', 'max_lat', 'min_lng', 'max_lng',
            'has_gym', 'has_pool', 'has_parking', 'has_clubhouse', 'rera_approved'
        ]


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

SUPPORTED_CITIES = {'delhi ncr', 'mumbai', 'bangalore', 'hyderabad', 'ahmedabad'}

class PropertyViewSet(viewsets.ModelViewSet):
    queryset = Property.objects.all()
    serializer_class = PropertySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly, IsListingRole]
    filterset_class = PropertyFilter
    filter_backends = [django_filters.rest_framework.DjangoFilterBackend, drf_filters.SearchFilter, drf_filters.OrderingFilter]
    search_fields = ['title', 'locality', 'description', 'city']
    ordering_fields = ['listed_price', 'created_at', 'bhk', 'area_sqft']

    def get_queryset(self):
        # select_related('owner', 'owner__preference') collapses owner and owner's preferences into the same SQL query JOIN.
        # prefetch_related('gallery') fetches all PropertyImage rows for the result set in a single second query.
        qs = Property.objects.select_related('owner', 'owner__preference').prefetch_related('gallery')
        city_param = self.request.query_params.get('city')
        if city_param:
            cleaned_city = city_param.strip().lower()
            if cleaned_city not in SUPPORTED_CITIES:
                return Property.objects.none()
        return qs

    @action(detail=False, methods=['get'], url_path='localities', permission_classes=[permissions.AllowAny])
    def localities(self, request):
        """
        GET /api/properties/localities/?city=Mumbai&q=Andheri
        Returns a list of distinct locality names matching the query string for the given city.
        Used by frontend autocomplete dropdowns -- returns locality strings directly,
        not full property records, so this is cheap even against 12k+ rows.
        """
        city = request.query_params.get('city', '').strip()
        q = request.query_params.get('q', '').strip()

        if not city:
            return Response({'error': 'city parameter is required'}, status=status.HTTP_400_BAD_REQUEST)

        if city.lower() not in SUPPORTED_CITIES:
            return Response({'error': f'{city!r} is not a supported city. Supported: Delhi NCR, Mumbai, Bangalore, Hyderabad, Ahmedabad'}, status=status.HTTP_400_BAD_REQUEST)

        from .models import LocalityCoordinateCache

        prop_qs = Property.objects.filter(city__iexact=city)
        cache_qs = LocalityCoordinateCache.objects.filter(city__iexact=city)

        if q:
            prop_qs = prop_qs.filter(locality__icontains=q)
            cache_qs = cache_qs.filter(locality__icontains=q)

        prop_localities = set(prop_qs.values_list('locality', flat=True).distinct())
        cache_localities = set(cache_qs.values_list('locality', flat=True).distinct())
        all_localities = sorted([l for l in (prop_localities | cache_localities) if l])[:500]

        return Response(all_localities, status=status.HTTP_200_OK)


    def perform_create(self, serializer):
        data = serializer.validated_data.copy()
        data['listed_price'] = data.get('listed_price', 5000000.0)
        
        ml_result = get_price_prediction(data) or {}

        # Synchronous Geocoding for new listings if coordinates missing
        lat = data.get('latitude')
        lng = data.get('longitude')
        if lat is None or lng is None:
            g_lat, g_lng = geocode_locality(data.get('locality'), data.get('city'))
            if g_lat is not None and g_lng is not None:
                lat = g_lat
                lng = g_lng

        serializer.save(
            owner=self.request.user,
            latitude=lat,
            longitude=lng,
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
