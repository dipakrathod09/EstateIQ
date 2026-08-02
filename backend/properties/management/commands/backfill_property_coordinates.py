import time
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.db.models import Q
from properties.models import Property, LocalityCoordinateCache
from properties.geocoding_service import geocode_locality

class Command(BaseCommand):
    help = 'Geocode and backfill missing latitude/longitude coordinates for Property listings using distinct locality caching & bulk updates.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Re-geocode all distinct localities even if coordinates already exist in Property rows.',
        )

    def handle(self, *args, **options):
        start_time = time.time()
        force = options['force']

        if force:
            self.stdout.write(self.style.WARNING("Running backfill in FORCE mode..."))
            distinct_pairs = list(Property.objects.order_by().values_list('city', 'locality').distinct())
        else:
            distinct_pairs = list(
                Property.objects.filter(Q(latitude__isnull=True) | Q(longitude__isnull=True))
                .order_by()
                .values_list('city', 'locality')
                .distinct()
            )


        distinct_count = len(distinct_pairs)
        total_properties_needing = Property.objects.filter(Q(latitude__isnull=True) | Q(longitude__isnull=True)).count()

        self.stdout.write(self.style.MIGRATE_HEADING(f"\n======================================================="))
        self.stdout.write(self.style.MIGRATE_HEADING("   CACHED BULK GEOCODING BACKFILL ENGINE STARTED       "))
        self.stdout.write(self.style.MIGRATE_HEADING("======================================================="))
        self.stdout.write(f" Total Property Rows Missing Lat/Lng: {total_properties_needing:,}")
        self.stdout.write(self.style.SUCCESS(f" Distinct (City, Locality) Pairs Needing Geocoding: {distinct_count:,}\n"))

        if distinct_count == 0 and not force:
            self.stdout.write(self.style.SUCCESS("All properties already have latitude/longitude assigned. Nothing to backfill!"))
            return

        cache_hits = 0
        network_calls = 0
        successful_localities = 0
        failed_localities = []

        # -------------------------------------------------------------------
        # PASS 1: Distinct Locality Geocoding & Caching
        # -------------------------------------------------------------------
        self.stdout.write(self.style.MIGRATE_HEADING("[PASS 1/2] Resolving Coordinates for Distinct Localities...\n"))

        resolved_coords = {} # (city, locality) -> (lat, lon)

        for idx, (city_val, locality_val) in enumerate(distinct_pairs, start=1):
            clean_city = (city_val or '').strip()
            clean_locality = (locality_val or '').strip()

            if not clean_locality or not clean_city:
                failed_localities.append({
                    'city': clean_city,
                    'locality': clean_locality,
                    'reason': 'Empty or invalid city/locality string',
                    'count': Property.objects.filter(city=city_val, locality=locality_val).count()
                })
                resolved_coords[(city_val, locality_val)] = (None, None)
                continue

            # Check if already in DB Cache before call to measure hits vs network calls
            was_cached = LocalityCoordinateCache.objects.filter(
                city__iexact=clean_city,
                locality__iexact=clean_locality
            ).exists()

            if was_cached and not force:
                cache_hits += 1
            else:
                network_calls += 1

            lat, lon = geocode_locality(clean_locality, clean_city)
            resolved_coords[(city_val, locality_val)] = (lat, lon)

            prop_count = Property.objects.filter(city=city_val, locality=locality_val).count()

            if lat is not None and lon is not None:
                successful_localities += 1
                status_str = f"SUCCESS (lat={lat:.6f}, lon={lon:.6f})"
                hit_type = "CACHE" if (was_cached and not force) else "NOMINATIM API"
                self.stdout.write(f" [{idx}/{distinct_count}] '{clean_locality}, {clean_city}' ({prop_count} props) -> [{hit_type}] {status_str}")
            else:
                reason = f"No OSM match found for '{clean_locality}, {clean_city}, India'"
                failed_localities.append({
                    'city': clean_city,
                    'locality': clean_locality,
                    'reason': reason,
                    'count': prop_count
                })
                self.stdout.write(self.style.ERROR(f" [{idx}/{distinct_count}] '{clean_locality}, {clean_city}' ({prop_count} props) -> FAILED"))

            # Only enforce 1.0s rate limit delay on actual network calls
            if not was_cached or force:
                time.sleep(1.0)

        # -------------------------------------------------------------------
        # PASS 2: Bulk Database Update Across All Property Rows
        # -------------------------------------------------------------------
        self.stdout.write(self.style.MIGRATE_HEADING("\n[PASS 2/2] Applying Cached Coordinates to Property Rows in Bulk...\n"))

        total_properties_updated = 0
        total_properties_failed = 0

        for (city_val, locality_val), (lat, lon) in resolved_coords.items():
            if lat is not None and lon is not None:
                if force:
                    updated = Property.objects.filter(city=city_val, locality=locality_val).update(latitude=lat, longitude=lon)
                else:
                    updated = Property.objects.filter(
                        city=city_val, locality=locality_val, latitude__isnull=True
                    ).update(latitude=lat, longitude=lon)
                total_properties_updated += updated
            else:
                unmatched = Property.objects.filter(city=city_val, locality=locality_val, latitude__isnull=True).count()
                total_properties_failed += unmatched

        elapsed_time = time.time() - start_time
        total_db_properties = Property.objects.count()
        total_geocoded_in_db = Property.objects.filter(latitude__isnull=False, longitude__isnull=False).count()
        overall_success_pct = (total_geocoded_in_db / total_db_properties * 100) if total_db_properties > 0 else 0.0

        # -------------------------------------------------------------------
        # FINAL REPORT DELIVERABLE
        # -------------------------------------------------------------------
        self.stdout.write(self.style.MIGRATE_HEADING("\n======================================================="))
        self.stdout.write(self.style.MIGRATE_HEADING("      GEOCODING BACKFILL FINAL DELIVERABLE REPORT      "))
        self.stdout.write(self.style.MIGRATE_HEADING("======================================================="))
        self.stdout.write(f" Distinct (City, Locality) Pairs Processed : {distinct_count:,}")
        self.stdout.write(f"  • Locality Cache Hits                  : {cache_hits:,}")
        self.stdout.write(f"  • Live Nominatim API Calls             : {network_calls:,}")
        self.stdout.write(f" Distinct Localities Successfully Matched : {successful_localities:,} ({(successful_localities/distinct_count*100 if distinct_count > 0 else 0):.1f}%)")
        self.stdout.write(f" Distinct Localities Failed              : {len(failed_localities):,}")
        self.stdout.write("-------------------------------------------------------")
        self.stdout.write(f" Total Properties Updated in Bulk        : {total_properties_updated:,}")
        self.stdout.write(f" Total Properties Currently Geocoded DB   : {total_geocoded_in_db:,} / {total_db_properties:,}")
        self.stdout.write(self.style.SUCCESS(f" Real Dataset Geocoding Coverage         : {overall_success_pct:.2f}%"))
        self.stdout.write(self.style.SUCCESS(f" Total Backfill Time Elapsed            : {elapsed_time:.2f} seconds ({elapsed_time/60:.2f} mins)"))
        self.stdout.write("=======================================================\n")

        if failed_localities:
            self.stdout.write(self.style.ERROR("UNMATCHED LOCALITIES DIAGNOSTIC FAILURE LOG FOR MANUAL REVIEW:"))
            self.stdout.write("-" * 90)
            self.stdout.write(f"{'CITY':<12} | {'LOCALITY':<25} | {'AFFECTED PROPS':<14} | {'DIAGNOSTIC REASON'}")
            self.stdout.write("-" * 90)
            for f in failed_localities:
                self.stdout.write(f"{f['city']:<12} | {f['locality']:<25} | {f['count']:<14} | {f['reason']}")
            self.stdout.write("-" * 90 + "\n")
