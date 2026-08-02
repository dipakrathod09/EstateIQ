import django_filters
from .models import InvestmentListing


class InvestmentListingFilter(django_filters.FilterSet):
    asset_class = django_filters.CharFilter(
        field_name='asset_class', lookup_expr='iexact'
    )
    is_pre_launch = django_filters.BooleanFilter(field_name='is_pre_launch')
    min_roi = django_filters.NumberFilter(
        field_name='expected_roi_percentage', lookup_expr='gte'
    )
    max_roi = django_filters.NumberFilter(
        field_name='expected_roi_percentage', lookup_expr='lte'
    )
    payout_frequency = django_filters.CharFilter(
        field_name='payout_frequency', lookup_expr='iexact'
    )
    min_ticket = django_filters.NumberFilter(
        field_name='min_investment_amount', lookup_expr='lte',
        help_text='Filter listings where min_investment_amount <= this value'
    )

    class Meta:
        model = InvestmentListing
        fields = ['asset_class', 'is_pre_launch', 'min_roi', 'max_roi', 'payout_frequency']
