from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/properties/', include('properties.urls')),
    path('api/crm/', include('crm.urls')),
    path('api/management/', include('management_app.urls')),
    path('api/investments/', include('investments.urls')),
]
