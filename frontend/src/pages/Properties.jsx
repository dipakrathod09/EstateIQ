/**
 * Properties.jsx — Search, Discovery & GIS Map page.
 *
 * View modes:
 *  - 'split' (desktop >=1024px): Side-by-side scrollable grid + sticky live GIS map.
 *  - 'grid': Standard 3-column grid card view.
 *  - 'map': Full-width interactive Leaflet map view.
 *
 * Responsive Breakpoint Behavior (Deliverable requirement):
 *  - On desktop (>=1024px): 'split' mode is default and fully functional.
 *  - On mobile/narrow (<1024px): 'split' mode automatically falls back to 'grid'
 *    mode, and the View Mode switcher hides the 'Split' option to prevent UI crowding.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import client from '../api/client';
import PropertyCard from '../components/PropertyCard';
import PropertyMap from '../components/PropertyMap';
import SearchFilterPanel from '../components/SearchFilterPanel';
import {
  Sparkles, Building, LayoutGrid, Map as MapIcon, Columns, X
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';

// ── Active Filter Chip ────────────────────────────────────────────────────────
const FilterChip = ({ label, onRemove }) => (
  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#12283C] text-white text-[11px] font-semibold">
    {label}
    <button type="button" onClick={onRemove} className="hover:text-[#B98B4E] transition-colors ml-0.5">
      <X className="w-3 h-3" />
    </button>
  </span>
);

// ── Helpers ───────────────────────────────────────────────────────────────────
const boolFromParam = (param) => param === 'true';

const DISABLED_CITIES = ['Delhi NCR', 'Bangalore', 'Hyderabad', 'Ahmedabad'];

const buildApiParams = ({ city, locality, propertyType, bhk, listingType, reraVerified, minPrice, maxPrice, dealTag }) => {
  const params = {};
  if (city) params.city = city;
  if (locality) params.locality = locality;
  if (propertyType) params.property_type = propertyType;
  if (bhk) params.bhk = bhk;
  if (listingType) params.listing_type = listingType;
  if (reraVerified) params.rera_verified = 'true';
  if (minPrice) params.min_price = minPrice;
  if (maxPrice) params.max_price = maxPrice;
  if (dealTag) params.deal_tag = dealTag;
  return params;
};

// ── Main Component ────────────────────────────────────────────────────────────
const Properties = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const userPref = user?.preference || {};

  const rawUrlCity = searchParams.get('city');
  const isCityDisabled = rawUrlCity && DISABLED_CITIES.includes(rawUrlCity);

  // PRECEDENCE RULE:
  // URL query parameter ALWAYS wins over saved UserPreference.
  // Saved preferences only pre-fill filter values if the URL parameter is ABSENT.
  const [city, setCity] = useState(() => {
    const initial = rawUrlCity || userPref.preferred_city || 'Mumbai';
    return DISABLED_CITIES.includes(initial) ? 'Mumbai' : initial;
  });
  const [locality, setLocality] = useState(() => searchParams.get('locality') || '');
  const [propertyType, setPropertyType] = useState(() => searchParams.get('property_type') || '');
  const [bhk, setBhk] = useState(() => searchParams.get('bhk') || userPref.preferred_bhk || '');
  const [listingType, setListingType] = useState(() => {
    if (searchParams.get('listing_type')) return searchParams.get('listing_type');
    if (userPref.intent === 'Buy' || userPref.intent === 'Rent') return userPref.intent;
    return '';
  });
  const [reraVerified, setReraVerified] = useState(() => boolFromParam(searchParams.get('rera_verified')));
  const [minPrice, setMinPrice] = useState(() => searchParams.get('min_price') || '');
  const [maxPrice, setMaxPrice] = useState(() => searchParams.get('max_price') || '');
  const [dealTag, setDealTag] = useState(() => searchParams.get('deal_tag') || '');

  // Desktop viewport check (>= 1024px)
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );

  // View mode: default 'split' on desktop, 'grid' on mobile
  const [viewMode, setViewMode] = useState(isDesktop ? 'split' : 'grid');
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);

  // Data
  const [properties, setProperties] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [nextPage, setNextPage] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);

  // ── Responsive Window Resize Listener ────────────────────────────────────
  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      // Fallback from 'split' mode to 'grid' mode if screen shrinks below 1024px
      if (!desktop && viewMode === 'split') {
        setViewMode('grid');
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [viewMode]);

  // ── Sync URL search params → State whenever URL changes (e.g. clicking Footer/Navbar links) ──
  const searchString = searchParams.toString();
  useEffect(() => {
    const rawCity = searchParams.get('city');
    const targetCity = (rawCity && !DISABLED_CITIES.includes(rawCity)) ? rawCity : 'Mumbai';
    setCity(targetCity);
    setLocality(searchParams.get('locality') || '');
    setPropertyType(searchParams.get('property_type') || '');
    setBhk(searchParams.get('bhk') || '');
    setListingType(searchParams.get('listing_type') || '');
    setReraVerified(searchParams.get('rera_verified') === 'true');
    setMinPrice(searchParams.get('min_price') || '');
    setMaxPrice(searchParams.get('max_price') || '');
    setDealTag(searchParams.get('deal_tag') || '');
  }, [searchString]);

  // ── Sync filter state → URL query string ─────────────────────────────────
  const syncUrlParams = useCallback(() => {
    const params = {};
    if (city) params.city = city;
    if (locality) params.locality = locality;
    if (propertyType) params.property_type = propertyType;
    if (bhk) params.bhk = bhk;
    if (listingType) params.listing_type = listingType;
    if (reraVerified) params.rera_verified = 'true';
    if (minPrice) params.min_price = minPrice;
    if (maxPrice) params.max_price = maxPrice;
    if (dealTag) params.deal_tag = dealTag;
    setSearchParams(params, { replace: true });
  }, [city, locality, propertyType, bhk, listingType, reraVerified, minPrice, maxPrice, dealTag, setSearchParams]);

  // ── Fetch properties from API ─────────────────────────────────────────────
  const fetchProperties = useCallback(() => {
    setLoading(true);
    const params = buildApiParams({ city, locality, propertyType, bhk, listingType, reraVerified, minPrice, maxPrice, dealTag });
    client
      .get('/properties/', { params })
      .then((res) => {
        const data = res.data;
        if (Array.isArray(data)) {
          setProperties(data);
          setTotalCount(data.length);
          setNextPage(null);
        } else {
          setProperties(data.results ?? []);
          setTotalCount(data.count ?? 0);
          setNextPage(data.next ?? null);
        }
      })
      .catch((err) => console.error('Error loading properties', err))
      .finally(() => setLoading(false));
  }, [city, locality, propertyType, bhk, listingType, reraVerified, minPrice, maxPrice, dealTag]);

  const handleLoadMore = () => {
    if (!nextPage || loadingMore) return;
    setLoadingMore(true);
    client.get(nextPage)
      .then((res) => {
        const data = res.data;
        const newProps = Array.isArray(data) ? data : (data.results ?? []);
        setProperties(prev => [...prev, ...newProps]);
        setNextPage(Array.isArray(data) ? null : (data.next ?? null));
      })
      .catch(err => console.error('Load more error', err))
      .finally(() => setLoadingMore(false));
  };

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    syncUrlParams();
    fetchProperties();
  }, [city, locality, propertyType, bhk, listingType, reraVerified, minPrice, maxPrice, dealTag]);

  // ── Reset all filters ─────────────────────────────────────────────────────
  const handleReset = () => {
    setCity('Mumbai'); setLocality(''); setPropertyType('');
    setBhk(''); setListingType(''); setReraVerified(false);
    setMinPrice(''); setMaxPrice(''); setDealTag('');
    setSelectedPropertyId(null);
    setSearchParams({}, { replace: true });
  };

  // ── Active filter chips for results bar ──────────────────────────────────
  const activeChips = [
    city && { key: 'city', label: `📍 ${city}`, remove: () => setCity('Mumbai') },
    locality && { key: 'locality', label: `🏘 ${locality}`, remove: () => setLocality('') },
    propertyType && { key: 'propertyType', label: propertyType, remove: () => setPropertyType('') },
    bhk && { key: 'bhk', label: `${bhk} BHK`, remove: () => setBhk('') },
    listingType && { key: 'listingType', label: listingType === 'Buy' ? '🏠 Buy' : '🔑 Rent', remove: () => setListingType('') },
    reraVerified && { key: 'rera', label: '✓ RERA', remove: () => setReraVerified(false) },
    dealTag && { key: 'dealTag', label: `🏷️ ${dealTag}`, remove: () => setDealTag('') },
    (minPrice || maxPrice) && {
      key: 'price',
      label: `₹${minPrice ? Number(minPrice).toLocaleString('en-IN') + '+' : ''}${minPrice && maxPrice ? ' – ' : ''}${maxPrice ? '≤₹' + Number(maxPrice).toLocaleString('en-IN') : ''}`,
      remove: () => { setMinPrice(''); setMaxPrice(''); },
    },
  ].filter(Boolean);

  // Available view modes based on screen width
  const viewModeOptions = [
    ...(isDesktop ? [{ mode: 'split', icon: <Columns className="w-4 h-4" />, label: 'Split' }] : []),
    { mode: 'grid', icon: <LayoutGrid className="w-4 h-4" />, label: 'Grid' },
    { mode: 'map', icon: <MapIcon className="w-4 h-4" />, label: 'Map' },
  ];

  return (
    <div className="bg-[#F7F5F0] min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Page Header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-[#B98B4E]/15 text-[#B98B4E] mb-2">
              <Sparkles className="w-3.5 h-3.5" /> Verified Marketplace
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#12283C]">
              Explore Property Listings
            </h1>
            <p className="text-[#5C6B73] text-sm mt-1">
              Filter by location, property type, BHK, and price · <span className="font-semibold text-[#12283C]">{totalCount.toLocaleString('en-IN')}</span> results
            </p>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-white p-1 rounded-xl border border-[#12283C]/10 shadow-sm self-start md:self-auto">
            {viewModeOptions.map(({ mode, icon, label }) => (
              <button
                key={mode}
                id={`view-mode-${mode}`}
                onClick={() => setViewMode(mode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === mode
                    ? 'bg-[#12283C] text-white shadow-sm'
                    : 'text-[#5C6B73] hover:text-[#12283C]'
                }`}
              >
                {icon} {label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* Filter Sidebar */}
          <SearchFilterPanel
            city={city} setCity={setCity}
            locality={locality} setLocality={setLocality}
            propertyType={propertyType} setPropertyType={setPropertyType}
            bhk={bhk} setBhk={setBhk}
            listingType={listingType} setListingType={setListingType}
            reraVerified={reraVerified} setReraVerified={setReraVerified}
            minPrice={minPrice} setMinPrice={setMinPrice}
            maxPrice={maxPrice} setMaxPrice={setMaxPrice}
            dealTag={dealTag} setDealTag={setDealTag}
            onReset={handleReset}
            resultCount={properties.length}
          />

          {/* Results Area */}
          <main className="lg:col-span-3">
            {/* Results Bar: count + active filter chips */}
            <div className="flex items-start justify-between gap-3 mb-4 pb-3 border-b border-[#12283C]/10 flex-wrap">
              <span className="text-xs font-semibold text-[#5C6B73] shrink-0 pt-1">
                {loading ? 'Loading…' : (
                  <>Showing <strong className="text-[#12283C]">{properties.length.toLocaleString('en-IN')}</strong>{totalCount > properties.length ? ` of ${totalCount.toLocaleString('en-IN')}` : ''} properties</>
                )}
              </span>

              {activeChips.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {activeChips.map((chip) => (
                    <FilterChip key={chip.key} label={chip.label} onRemove={chip.remove} />
                  ))}
                </div>
              )}
            </div>

            {/* Content */}
            {loading ? (
              <div className="text-center py-20">
                <div className="inline-flex flex-col items-center gap-3 text-[#5C6B73]">
                  <div className="w-8 h-8 border-2 border-[#B98B4E] border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Searching listings…</span>
                </div>
              </div>
            ) : properties.length === 0 ? (
              <div className="glass-card p-12 text-center bg-white rounded-2xl">
                <Building className="w-12 h-12 text-[#5C6B73] mx-auto mb-4" />
                <h3 className="font-serif text-2xl font-semibold text-[#12283C] mb-2">No Matching Properties</h3>
                <p className="text-sm text-[#5C6B73] max-w-md mx-auto mb-6">
                  Try broadening your search parameters or clearing active filters.
                </p>
                <button onClick={handleReset} className="btn-primary text-xs py-2 px-4">
                  Clear All Filters
                </button>
              </div>
            ) : (
              <>
                {/* MAP VIEW */}
                {viewMode === 'map' && (
                  <PropertyMap
                    properties={properties}
                    selectedCity={city}
                    selectedPropertyId={selectedPropertyId}
                    onMarkerClick={(id) => setSelectedPropertyId(id)}
                    height="680px"
                  />
                )}

                {/* GRID VIEW */}
                {viewMode === 'grid' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {properties.map((prop) => (
                      <div key={prop.id} onMouseEnter={() => setSelectedPropertyId(prop.id)}>
                        <PropertyCard property={prop} />
                      </div>
                    ))}
                  </div>
                )}

                {/* SPLIT VIEW (Desktop Only) */}
                {viewMode === 'split' && isDesktop && (
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    {/* Cards (scrollable) */}
                    <div className="xl:col-span-6 space-y-4 max-h-[720px] overflow-y-auto pr-1 scrollbar-thin">
                      {properties.map((prop) => (
                        <div
                          key={prop.id}
                          onMouseEnter={() => setSelectedPropertyId(prop.id)}
                          className={`transition-all duration-150 ${
                            selectedPropertyId === prop.id ? 'ring-2 ring-[#B98B4E] rounded-2xl scale-[1.01]' : ''
                          }`}
                        >
                          <PropertyCard property={prop} />
                        </div>
                      ))}
                    </div>

                    {/* GIS Map (sticky) */}
                    <div className="xl:col-span-6 sticky top-24">
                      <PropertyMap
                        properties={properties}
                        selectedCity={city}
                        selectedPropertyId={selectedPropertyId}
                        onMarkerClick={(id) => setSelectedPropertyId(id)}
                        height="720px"
                      />
                    </div>
                  </div>
                )}
              </>
            )}
            {/* Load More Button */}
            {nextPage && !loading && (
              <div className="mt-8 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="btn-secondary px-8 py-3 text-sm font-semibold"
                >
                  {loadingMore ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-[#12283C] border-t-transparent rounded-full animate-spin" />
                      Loading more…
                    </span>
                  ) : (
                    `Load More (${totalCount - properties.length} remaining)`
                  )}
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Properties;
