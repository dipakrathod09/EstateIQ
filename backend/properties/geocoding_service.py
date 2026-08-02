import requests
import logging
from decimal import Decimal
from properties.models import LocalityCoordinateCache

logger = logging.getLogger(__name__)

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "EstateIQ-Geocoder/1.0 (contact@estateiq.in)"

def geocode_locality(locality: str, city: str, source: str = 'nominatim'):
    """
    Geocodes a property locality + city + 'India'.
    Checks LocalityCoordinateCache first. Only calls Nominatim on cache miss.
    Returns (latitude_decimal, longitude_decimal) or (None, None).
    """
    if not locality or not city:
        return None, None

    clean_locality = locality.strip()
    clean_city = city.strip()

    # 1. Check LocalityCoordinateCache First
    cached = LocalityCoordinateCache.objects.filter(
        city__iexact=clean_city,
        locality__iexact=clean_locality
    ).first()

    if cached:
        # Cache Hit
        return cached.latitude, cached.longitude

    # 2. Cache Miss -> Query Nominatim API
    query_str = f"{clean_locality}, {clean_city}, India"
    headers = {
        "User-Agent": USER_AGENT,
        "Accept-Language": "en"
    }
    params = {
        "q": query_str,
        "format": "json",
        "limit": 1
    }

    lat_val, lon_val = None, None

    try:
        response = requests.get(NOMINATIM_URL, params=params, headers=headers, timeout=6)
        if response.status_code == 200:
            data = response.json()
            if data and len(data) > 0:
                lat_val = Decimal(str(data[0]['lat']))
                lon_val = Decimal(str(data[0]['lon']))
            else:
                # Fallback query: City level lookup
                fallback_params = {
                    "q": f"{clean_city}, India",
                    "format": "json",
                    "limit": 1
                }
                fb_resp = requests.get(NOMINATIM_URL, params=fallback_params, headers=headers, timeout=6)
                if fb_resp.status_code == 200:
                    fb_data = fb_resp.json()
                    if fb_data and len(fb_data) > 0:
                        lat_val = Decimal(str(fb_data[0]['lat']))
                        lon_val = Decimal(str(fb_data[0]['lon']))
    except Exception as e:
        logger.warning(f"[GEOCODE] Failed to geocode query '{query_str}': {e}")

    # 3. Store result (or negative lookup) in LocalityCoordinateCache
    LocalityCoordinateCache.objects.update_or_create(
        city=clean_city,
        locality=clean_locality,
        defaults={
            'latitude': lat_val,
            'longitude': lon_val,
            'source': source
        }
    )

    return lat_val, lon_val
