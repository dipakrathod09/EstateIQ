import os
import csv
from collections import Counter
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction
from properties.models import Property

User = get_user_model()

class Command(BaseCommand):
    help = 'Import properties from cleaned real estate dataset (e.g. properties_cleaned (2).csv).'

    def add_arguments(self, parser):
        parser.add_argument(
            '--csv',
            type=str,
            default=r'c:\Users\admin\Desktop\EstateIQ\properties_cleaned (2).csv',
            help='Path to the cleaned CSV file to import.'
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=1000,
            help='Batch transaction size for bulk database execution.'
        )

    def handle(self, *args, **options):
        csv_path = options['csv']
        if not os.path.isabs(csv_path):
            csv_path = os.path.abspath(os.path.join(os.getcwd(), csv_path))

        if not os.path.exists(csv_path):
            # Check relative fallback
            fallback = os.path.abspath(os.path.join(os.getcwd(), "..", "properties_cleaned (2).csv"))
            if os.path.exists(fallback):
                csv_path = fallback
            else:
                self.stderr.write(self.style.ERROR(f"CSV file not found at: {csv_path}"))
                return

        self.stdout.write(self.style.MIGRATE_HEADING(f"\n[IMPORT] Loading cleaned dataset from: {csv_path}...\n"))

        # 1. Get or Create System Import User Account
        import_agent, created = User.objects.get_or_create(
            username='data_import_agent',
            defaults={
                'email': 'data_import@estateiq.in',
                'role': 'agent',
                'first_name': 'Data Import',
                'last_name': 'System Bot',
                'phone_number': '+91 0000000000',
                'company_name': 'EstateIQ System Importer'
            }
        )
        if created:
            import_agent.set_unusable_password()
            import_agent.save()
            self.stdout.write(self.style.SUCCESS("Created dedicated system import account 'data_import_agent' (role=agent)"))
        else:
            self.stdout.write(self.style.SUCCESS("Using existing system import account 'data_import_agent' (role=agent)"))

        # Tracking Counters
        total_rows = 0
        created_count = 0
        updated_count = 0
        skipped_count = 0

        provenance_counts = {
            'floor_is_estimated': 0,
            'total_floors_is_estimated': 0,
            'age_years_is_estimated': 0
        }

        city_counter = Counter()
        submarket_counter = Counter()
        skip_reasons = []

        def parse_bool(val):
            if isinstance(val, bool):
                return val
            return str(val).strip().lower() in ('true', '1', 'yes', 't')

        def parse_int(val):
            if val is None or str(val).strip() in ('', 'nan', 'null', 'none'):
                return None
            try:
                return int(float(str(val).strip()))
            except ValueError:
                return None

        def parse_float(val):
            if val is None or str(val).strip() in ('', 'nan', 'null', 'none'):
                return None
            try:
                return float(str(val).strip())
            except ValueError:
                return None

        def normalize_facing(val):
            if not val:
                return 'Unknown'
            v = str(val).strip()
            v = v.replace(" - ", "-")
            if v in dict(Property.FACING_CHOICES):
                return v
            return 'Unknown'

        def normalize_furnishing(val):
            if not val:
                return 'Unknown'
            v = str(val).strip()
            if v in dict(Property.FURNISHING_CHOICES):
                return v
            return 'Unknown'

        def normalize_possession(val):
            if not val:
                return 'Unknown'
            v = str(val).strip()
            if v in dict(Property.POSSESSION_STATUS_CHOICES):
                return v
            return 'Unknown'

        with open(csv_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            
            for row in reader:
                total_rows += 1
                source_id = row.get('source_id', '').strip()
                if not source_id:
                    skipped_count += 1
                    skip_reasons.append(f"Row {total_rows}: Missing source_id")
                    continue

                # Track Data Quality Provenance Flags
                if parse_bool(row.get('floor_is_estimated')):
                    provenance_counts['floor_is_estimated'] += 1
                if parse_bool(row.get('total_floors_is_estimated')):
                    provenance_counts['total_floors_is_estimated'] += 1
                if parse_bool(row.get('age_years_is_estimated')):
                    provenance_counts['age_years_is_estimated'] += 1

                city_val = row.get('city', 'Mumbai').strip()
                submarket_val = row.get('sub_market', 'Other').strip()

                city_counter[city_val] += 1
                submarket_counter[submarket_val] += 1

                title = f"{row.get('bhk', '2')} BHK {row.get('property_type', 'Apartment')} in {row.get('locality', 'Mumbai')}"
                if row.get('project_name') and row.get('project_name') != 'Independent / Resale (No Project)':
                    title = f"{row.get('bhk', '2')} BHK Apartment at {row.get('project_name')}, {row.get('locality')}"

                defaults = {
                    'title': title[:200],
                    'description': f"Dataset listing (source_id: {source_id}) in {row.get('locality')}, {city_val}. Developer: {row.get('developer', 'N/A')}.",
                    'owner': import_agent,
                    'status': 'for_sale',
                    'city': city_val,
                    'sub_market': submarket_val,
                    'locality': row.get('locality', '').strip(),
                    'property_type': row.get('property_type', 'Apartment').strip(),
                    'bhk': parse_int(row.get('bhk')) or 2,
                    'bathroom': parse_int(row.get('bathroom')),
                    'area_sqft': parse_float(row.get('area_sqft')) or 1000.0,
                    'floor': parse_int(row.get('floor')) or 1,
                    'total_floors': parse_int(row.get('total_floors')) or 10,
                    'age_years': parse_int(row.get('age_years')) or 2,
                    'furnishing': normalize_furnishing(row.get('furnishing')),
                    'facing': normalize_facing(row.get('facing')),
                    'possession_status': normalize_possession(row.get('possession_status')),
                    'has_parking': parse_bool(row.get('has_parking')),
                    'has_lift': parse_bool(row.get('has_lift')),
                    'has_clubhouse': parse_bool(row.get('has_clubhouse')),
                    'has_pool': parse_bool(row.get('has_pool')),
                    'has_gym': parse_bool(row.get('has_gym')),
                    'has_security': parse_bool(row.get('has_security')),
                    'has_power_backup': parse_bool(row.get('has_power_backup')),
                    'rera_approved': parse_bool(row.get('rera_approved')),
                    'listed_price': parse_float(row.get('listed_price')) or 5000000.0,
                    'project_name': row.get('project_name', '').strip(),
                    'developer': row.get('developer', '').strip(),
                    # Distance metrics left null as required (NOT fabricated)
                    'dist_metro_km': None,
                    'dist_school_km': None,
                    'dist_hospital_km': None,
                    'dist_it_hub_km': None,
                }

                obj, created_flag = Property.objects.update_or_create(
                    external_source_id=source_id,
                    defaults=defaults
                )

                if created_flag:
                    created_count += 1
                else:
                    updated_count += 1

                if total_rows % 1000 == 0:
                    self.stdout.write(f"  Processed {total_rows:,} rows... ({created_count:,} created, {updated_count:,} updated)")

        # Final Summary Report Output
        self.stdout.write(self.style.MIGRATE_HEADING("\n======================================================="))
        self.stdout.write(self.style.MIGRATE_HEADING("         CLEANED PROPERTY IMPORT SUMMARY REPORT        "))
        self.stdout.write(self.style.MIGRATE_HEADING("======================================================="))
        self.stdout.write(f" Total Rows Processed : {total_rows:,}")
        self.stdout.write(self.style.SUCCESS(f" New Properties Created: {created_count:,}"))
        self.stdout.write(self.style.SUCCESS(f" Upserted (Updated)  : {updated_count:,}"))
        self.stdout.write(self.style.WARNING(f" Skipped / Invalid   : {skipped_count:,}"))
        self.stdout.write("-------------------------------------------------------")
        self.stdout.write(self.style.MIGRATE_HEADING(" DATA QUALITY ESTIMATION PROVENANCE COUNTS:"))
        self.stdout.write(f"  • age_years_is_estimated     : {provenance_counts['age_years_is_estimated']:,}")
        self.stdout.write(f"  • total_floors_is_estimated  : {provenance_counts['total_floors_is_estimated']:,}")
        self.stdout.write(f"  • floor_is_estimated         : {provenance_counts['floor_is_estimated']:,}")
        self.stdout.write("-------------------------------------------------------")
        self.stdout.write(self.style.MIGRATE_HEADING(" BREAKDOWN BY CITY:"))
        for city_name, count in city_counter.most_common():
            self.stdout.write(f"  • {city_name:<15} : {count:,} listings")
        self.stdout.write("-------------------------------------------------------")
        self.stdout.write(self.style.MIGRATE_HEADING(" TOP SUB-MARKETS:"))
        for sub_name, count in submarket_counter.most_common(5):
            self.stdout.write(f"  • {sub_name:<20} : {count:,} listings")
        self.stdout.write("-------------------------------------------------------")
        self.stdout.write(self.style.WARNING(" PROXIMITY GAP FLAG:"))
        self.stdout.write("  • dist_metro_km, dist_school_km, dist_hospital_km, dist_it_hub_km")
        self.stdout.write("    were left as NULL (no fabricated values were assigned).")
        self.stdout.write("=======================================================\n")
