from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone

class User(AbstractUser):
    ROLE_CHOICES = (
        ('agent', 'Agent'),
        ('tenant', 'Tenant'),
        ('landlord', 'Landlord'),
        ('investor', 'Investor'),
        ('admin', 'Admin'),
    )
    
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='tenant')
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    company_name = models.CharField(max_length=100, blank=True, null=True)
    avatar = models.CharField(max_length=500, blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"

class UserPreference(models.Model):
    INTENT_CHOICES = (
        ('Buy', 'Buy'),
        ('Rent', 'Rent'),
        ('Invest', 'Invest'),
    )

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='preference')
    preferred_city = models.CharField(max_length=100, blank=True, null=True)
    intent = models.CharField(max_length=20, choices=INTENT_CHOICES, blank=True, null=True)
    preferred_bhk = models.CharField(max_length=20, blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Preferences for {self.user.username}"

