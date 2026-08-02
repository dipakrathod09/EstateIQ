from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import SavedProperty, Inquiry
from .serializers import SavedPropertySerializer, InquirySerializer

class SavedPropertyToggleView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        property_id = request.data.get('property_id')
        if not property_id:
            return Response({'error': 'property_id is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        saved_item = SavedProperty.objects.filter(user=request.user, property_id=property_id).first()
        if saved_item:
            saved_item.delete()
            return Response({'saved': False, 'message': 'Property removed from saved list'})
        else:
            new_item = SavedProperty.objects.create(user=request.user, property_id=property_id)
            return Response({'saved': True, 'item': SavedPropertySerializer(new_item).data})

class SavedPropertyListView(generics.ListAPIView):
    serializer_class = SavedPropertySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SavedProperty.objects.filter(user=self.request.user)

class InquiryListCreateView(generics.ListCreateAPIView):
    serializer_class = InquirySerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Inquiry.objects.none()
        
        if user.role in ['agent', 'landlord', 'admin']:
            # Inquiries received for properties listed by this agent/landlord
            return Inquiry.objects.filter(property__owner=user)
        else:
            # Inquiries sent by this user
            return Inquiry.objects.filter(user=user)

    def perform_create(self, serializer):
        if self.request.user.is_authenticated:
            serializer.save(user=self.request.user)
        else:
            serializer.save()

class InquiryDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = InquirySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Scope the detail queryset identically to InquiryListCreateView so that
        a user can only access inquiries they're allowed to see.
        Any attempt to GET/PATCH/DELETE an inquiry outside this scope returns 404.
        """
        user = self.request.user
        if getattr(user, 'role', '') == 'admin':
            return Inquiry.objects.all()
        if user.role in ['agent', 'landlord']:
            # Inquiries received on properties this user owns
            return Inquiry.objects.filter(property__owner=user)
        # tenant / investor / any other role: only inquiries they submitted
        return Inquiry.objects.filter(user=user)
