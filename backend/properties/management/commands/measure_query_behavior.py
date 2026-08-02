"""
Django management command to measure real query counts and payload omission.
Run with: python manage.py measure_query_behavior
"""
from django.core.management.base import BaseCommand
from django.db import connection, reset_queries
from django.conf import settings
import unittest.mock as mock


class Command(BaseCommand):
    help = 'Measure real query counts and ml_client payload omission behavior'

    def handle(self, *args, **options):
        settings.DEBUG = True

        from properties.models import Property

        # -------------------------------------------------------
        # 1. Real N+1 query count against live 12k+ row dataset
        # -------------------------------------------------------
        self.stdout.write("\n=== REAL-DATA QUERY COUNT MEASUREMENT ===")
        reset_queries()

        qs = Property.objects.select_related('owner').prefetch_related('gallery').filter(city__iexact='Mumbai')
        total_count = qs.count()

        reset_queries()  # reset after count query -- only measure page load
        page = list(qs.order_by('-created_at')[:20])

        # Force-evaluate prefetch cache (simulates serializer access pattern)
        _ = [list(p.gallery.all()) for p in page]
        _ = [p.owner for p in page]

        q_count = len(connection.queries)
        self.stdout.write(f"Total Mumbai rows in DB: {total_count}")
        self.stdout.write(f"Queries to load 20 results (with owner+gallery): {q_count}")
        for i, q in enumerate(connection.queries):
            sql_preview = q['sql'][:100]
            self.stdout.write(f"  Q{i+1} ({q['time']}s): {sql_preview}")

        if q_count <= 3:
            self.stdout.write(self.style.SUCCESS(f"PASS: {q_count} queries (N+1 fix is working)"))
        else:
            self.stdout.write(self.style.ERROR(f"FAIL: {q_count} queries -- N+1 bug still present"))

        # -------------------------------------------------------
        # 2. Payload omission check: real imported Mumbai property
        #    with null distance fields
        # -------------------------------------------------------
        self.stdout.write("\n=== ML PAYLOAD OMISSION CHECK (REAL IMPORTED PROPERTY) ===")
        from properties.ml_client import get_price_prediction

        null_dist_prop = Property.objects.filter(
            city='Mumbai',
            dist_metro_km__isnull=True
        ).first()

        if not null_dist_prop:
            self.stdout.write(self.style.WARNING("No imported property with null dist_metro_km found -- cannot verify."))
            return

        self.stdout.write(f"Property: '{null_dist_prop.title[:60]}' (id={null_dist_prop.id})")
        self.stdout.write(f"  dist_metro_km DB value   : {null_dist_prop.dist_metro_km!r}")
        self.stdout.write(f"  dist_school_km DB value  : {null_dist_prop.dist_school_km!r}")
        self.stdout.write(f"  dist_hospital_km DB value: {null_dist_prop.dist_hospital_km!r}")
        self.stdout.write(f"  dist_it_hub_km DB value  : {null_dist_prop.dist_it_hub_km!r}")

        captured = {}

        def fake_post(url, json=None, timeout=None):
            captured.update(json or {})
            m = mock.MagicMock()
            m.status_code = 200
            m.json.return_value = {"predicted_price": 9000000.0, "deal_tag": "Fair Price", "confidence_score": 0.88}
            return m

        with mock.patch('properties.ml_client.requests.post', side_effect=fake_post):
            result = get_price_prediction(null_dist_prop)

        self.stdout.write("\nPayload fields sent to ML service:")
        all_pass = True
        for f in ('dist_metro_km', 'dist_school_km', 'dist_hospital_km', 'dist_it_hub_km'):
            if f in captured:
                self.stdout.write(self.style.ERROR(f"  FAIL: '{f}' was present as {captured[f]!r} (should be ABSENT)"))
                all_pass = False
            else:
                self.stdout.write(self.style.SUCCESS(f"  PASS: '{f}' absent from payload (Pydantic default will apply)"))

        if all_pass:
            self.stdout.write(self.style.SUCCESS("\nREAL IMPORTED PROPERTY: payload omission check PASSED"))
            self.stdout.write(f"ML result returned: {result}")
        else:
            self.stdout.write(self.style.ERROR("\nREAL IMPORTED PROPERTY: payload contains null distance fields -- Pydantic 422 risk"))
