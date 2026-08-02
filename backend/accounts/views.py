from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from .serializers import RegisterSerializer, UserSerializer, CustomTokenObtainPairSerializer

User = get_user_model()

from .models import UserPreference
from .serializers import RegisterSerializer, UserSerializer, CustomTokenObtainPairSerializer, UserPreferenceSerializer

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Create empty preference object for user
        UserPreference.objects.get_or_create(user=user)
        
        # Auto generate JWT tokens on registration
        refresh = RefreshToken.for_user(user)
        refresh['username'] = user.username
        refresh['email'] = user.email
        refresh['role'] = user.role

        return Response({
            'user': UserSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }, status=status.HTTP_201_CREATED)

class UserProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserSerializer

    def get_object(self):
        user = self.request.user
        UserPreference.objects.get_or_create(user=user)
        return user

class UserPreferenceView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserPreferenceSerializer

    def get_object(self):
        pref, _ = UserPreference.objects.get_or_create(user=self.request.user)
        return pref

