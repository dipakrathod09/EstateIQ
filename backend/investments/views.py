from rest_framework import viewsets, generics, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter

from .models import InvestmentListing, InvestmentInquiry
from .serializers import InvestmentListingSerializer, InvestmentInquirySerializer
from .filters import InvestmentListingFilter
# Reuse the IsListingRole permission from properties — single source of truth
from properties.views import IsListingRole


class IsInvestmentOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        owner = getattr(obj.property, 'owner', None)
        return owner == request.user or getattr(request.user, 'role', '') == 'admin'


class InvestmentListingViewSet(viewsets.ModelViewSet):
    """
    Public GET (list + detail). POST/PUT/PATCH/DELETE restricted to IsListingRole and property owner.
    """
    queryset = InvestmentListing.objects.select_related('property').all()
    serializer_class = InvestmentListingSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsListingRole, IsInvestmentOwnerOrReadOnly]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = InvestmentListingFilter
    ordering_fields = ['expected_roi_percentage', 'min_investment_amount', 'created_at']
    ordering = ['-created_at']

    def perform_create(self, serializer):
        prop = serializer.validated_data.get('property')
        user = self.request.user
        if getattr(user, 'role', '') != 'admin' and prop and prop.owner != user:
            raise permissions.exceptions.PermissionDenied("You do not own the linked property.")
        serializer.save()


class InvestmentInquireView(APIView):
    """
    POST /api/investments/<pk>/inquire/
    Open to everyone — investors may not have an account yet.
    Creates an InvestmentInquiry; links to user if authenticated.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk):
        try:
            listing = InvestmentListing.objects.get(pk=pk)
        except InvestmentListing.DoesNotExist:
            return Response({'detail': 'Investment listing not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = InvestmentInquirySerializer(data=request.data)
        if serializer.is_valid():
            inquiry = serializer.save(
                investment_listing=listing,
                user=request.user if request.user.is_authenticated else None,
            )
            return Response(
                InvestmentInquirySerializer(inquiry).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class InvestmentInquiryListView(generics.ListAPIView):
    """
    GET /api/investments/<pk>/inquiries/
    Scoped queryset — same pattern as the InquiryDetailView fix in Phase 4.5:
      - admin: all inquiries for this listing
      - agent/landlord: inquiries on listings whose property they own
      - investor/tenant: only their own submitted inquiries
      - anonymous: denied (401)
    """
    serializer_class = InvestmentInquirySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        pk = self.kwargs['pk']
        user = self.request.user

        try:
            listing = InvestmentListing.objects.get(pk=pk)
        except InvestmentListing.DoesNotExist:
            return InvestmentInquiry.objects.none()

        if getattr(user, 'role', '') == 'admin':
            return InvestmentInquiry.objects.filter(investment_listing=listing)

        if user.role in ['agent', 'landlord']:
            # Only see inquiries on listings whose property this user owns
            return InvestmentInquiry.objects.filter(
                investment_listing=listing,
                investment_listing__property__owner=user,
            )

        # investor / tenant / any other role — only their own submissions
        return InvestmentInquiry.objects.filter(
            investment_listing=listing,
            user=user,
        )


class InvestmentInquiryDetailView(generics.RetrieveUpdateAPIView):
    """
    GET/PATCH /api/investments/inquiries/<pk>/
    Investment managers can update status; scoped by same ownership logic.
    """
    serializer_class = InvestmentInquirySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'role', '') == 'admin':
            return InvestmentInquiry.objects.all()
        if user.role in ['agent', 'landlord']:
            return InvestmentInquiry.objects.filter(
                investment_listing__property__owner=user
            )
        return InvestmentInquiry.objects.filter(user=user)
