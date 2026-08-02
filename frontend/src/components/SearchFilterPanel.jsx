/**
 * SearchFilterPanel — Multi-parametric property search filter sidebar.
 *
 * Implements:
 *  - City selector (5 fixed ML-trained metros)
 *  - Locality autocomplete (debounced call to GET /api/properties/localities/)
 *  - Property type pills (Apartment / Independent House / Villa)
 *  - BHK pills (1 / 2 / 3 / 4+)
 *  - Price range (min + max with Indian number formatting ₹X,XX,XXX)
 *  - Listing type toggle (Buy / Rent)
 *  - RERA Verified toggle
 *  - Reset All
 *
 * All state is owned by the parent (Properties.jsx) and passed via props,
 * so URL query params can be synced in the parent.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SlidersHorizontal, RotateCcw, Search, MapPin, CheckCircle2, X, ChevronDown } from 'lucide-react';
import client from '../api/client';

const CITIES = [
  { name: 'Mumbai', active: true },
  { name: 'Delhi NCR', active: true },
  { name: 'Bangalore', active: true },
  { name: 'Hyderabad', active: true },
  { name: 'Ahmedabad', active: true },
];

const PROPERTY_TYPES = ['Apartment', 'Independent House', 'Villa'];
const BHK_OPTIONS = [
  { label: '1', value: '1' },
  { label: '2', value: '2' },
  { label: '3', value: '3' },
  { label: '4+', value: '4+' },
];

// ── Indian number formatting ─────────────────────────────────────────────────
// Formats a raw numeric string into Indian comma style: 8500000 → "85,00,000"
// Mirrors the logic used for ₹ display in PropertyCard.
export const formatIndianNumber = (raw) => {
  const digits = String(raw).replace(/[^\d]/g, '');
  if (!digits) return '';
  // Indian numbering: last 3 digits, then groups of 2
  const lastThree = digits.slice(-3);
  const rest = digits.slice(0, -3);
  const formatted = rest
    ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree
    : lastThree;
  return formatted;
};

export const parseIndianNumber = (displayStr) =>
  String(displayStr).replace(/,/g, '');

// ── Debounce hook ─────────────────────────────────────────────────────────────
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

// ── Price Input (Indian comma formatting) ─────────────────────────────────────
const PriceInput = ({ value, onChange, placeholder, id }) => {
  const [displayValue, setDisplayValue] = useState(
    value ? formatIndianNumber(value) : ''
  );

  useEffect(() => {
    const newDisplay = value ? formatIndianNumber(value) : '';
    setDisplayValue(newDisplay);
  }, [value]);

  const handleChange = (e) => {
    const raw = e.target.value.replace(/[^\d]/g, '');
    setDisplayValue(raw ? formatIndianNumber(raw) : '');
    onChange(raw);
  };

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#B98B4E]">₹</span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        placeholder={placeholder}
        value={displayValue}
        onChange={handleChange}
        className="form-input text-xs pl-7 py-2.5 font-mono"
        style={{ fontFamily: 'var(--font-mono), monospace' }}
      />
    </div>
  );
};

// ── Locality Autocomplete ─────────────────────────────────────────────────────
const LocalityAutocomplete = ({ city, value, onChange }) => {
  const [inputVal, setInputVal] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);
  const debouncedInput = useDebounce(inputVal, 300);

  // Sync parent value → local input when cleared externally
  useEffect(() => {
    if (!value) setInputVal('');
  }, [value]);

  // Fetch suggestions from GET /api/properties/localities/?city=X&q=Y
  useEffect(() => {
    if (!city || debouncedInput.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    client
      .get('/properties/localities/', { params: { city, q: debouncedInput } })
      .then((res) => {
        setSuggestions(res.data || []);
        setOpen(true);
      })
      .catch(() => setSuggestions([]))
      .finally(() => setLoading(false));
  }, [city, debouncedInput]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = (loc) => {
    setInputVal(loc);
    onChange(loc);
    setOpen(false);
    setSuggestions([]);
  };

  const clear = () => {
    setInputVal('');
    onChange('');
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-[#5C6B73] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          id="locality-search"
          type="text"
          placeholder={city ? `Search in ${city}...` : 'Select city first'}
          value={inputVal}
          onChange={(e) => {
            setInputVal(e.target.value);
            if (!e.target.value) onChange('');
          }}
          disabled={!city}
          className="form-input text-xs pl-8 pr-8 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {inputVal && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5C6B73] hover:text-[#E2574C] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-[#12283C]/12 rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto">
          {loading && (
            <li className="px-4 py-2 text-xs text-[#5C6B73] italic">Searching…</li>
          )}
          {suggestions.map((loc) => (
            <li
              key={loc}
              onMouseDown={() => select(loc)}
              className={`px-4 py-2.5 text-xs cursor-pointer hover:bg-[#F7F5F0] text-[#12283C] flex items-center gap-2 transition-colors ${
                loc === value ? 'bg-[#B98B4E]/10 font-semibold' : ''
              }`}
            >
              <MapPin className="w-3 h-3 text-[#B98B4E] flex-shrink-0" />
              {loc}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ── Toggle Button ─────────────────────────────────────────────────────────────
const ToggleButton = ({ active, onClick, children, activeClass = '' }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all duration-150 ${
      active
        ? activeClass || 'bg-[#12283C] text-white border-[#12283C] shadow-sm'
        : 'bg-white text-[#12283C] border-[#12283C]/15 hover:border-[#B98B4E] hover:text-[#B98B4E]'
    }`}
  >
    {children}
  </button>
);

// ── Main Component ─────────────────────────────────────────────────────────────
const SearchFilterPanel = ({
  // Filter values (controlled)
  city, setCity,
  locality, setLocality,
  propertyType, setPropertyType,
  bhk, setBhk,
  listingType, setListingType,
  reraVerified, setReraVerified,
  minPrice, setMinPrice,
  maxPrice, setMaxPrice,
  dealTag, setDealTag,
  onReset,
  resultCount,
}) => {
  const hasActiveFilters = city || locality || propertyType || bhk ||
    listingType || reraVerified || minPrice || maxPrice || dealTag;

  return (
    <aside className="lg:col-span-1">
      <div className="bg-white border border-[#12283C]/10 rounded-2xl shadow-sm sticky top-24 overflow-hidden">
        {/* Panel Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#12283C]/08">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[#B98B4E]" />
            <span className="font-serif font-semibold text-sm text-[#12283C]">Filter Listings</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-[#B98B4E] flex-shrink-0" />
            )}
          </div>
          <button
            id="filter-reset-btn"
            onClick={onReset}
            className="text-xs text-[#5C6B73] hover:text-[#E2574C] flex items-center gap-1 font-medium transition-colors"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* 1 ── Listing Type Toggle (Buy / Rent) */}
          <div>
            <label className="form-label text-[10px]">Listing Type</label>
            <div className="flex gap-2">
              <button
                id="listing-type-buy"
                type="button"
                onClick={() => setListingType(listingType === 'Buy' ? '' : 'Buy')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
                  listingType === 'Buy'
                    ? 'bg-[#12283C] text-white border-[#12283C] shadow-sm'
                    : 'bg-[#F7F5F0] text-[#12283C] border-[#12283C]/12 hover:border-[#12283C]/30'
                }`}
              >
                🏠 Buy
              </button>
              <button
                id="listing-type-rent"
                type="button"
                onClick={() => setListingType(listingType === 'Rent' ? '' : 'Rent')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
                  listingType === 'Rent'
                    ? 'bg-[#1F7A6C] text-white border-[#1F7A6C] shadow-sm'
                    : 'bg-[#F7F5F0] text-[#12283C] border-[#12283C]/12 hover:border-[#1F7A6C]/40'
                }`}
              >
                🔑 Rent
              </button>
            </div>
          </div>

          {/* 2 ── City Selector */}
          <div>
            <label className="form-label text-[10px]">Metro City</label>
            <div className="flex items-center justify-between px-3 py-2 bg-[#F7F5F0] border border-[#12283C]/12 rounded-xl text-xs font-semibold text-[#12283C]">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#B98B4E]" /> Mumbai
              </span>
              <span className="text-[9px] bg-[#1F7A6C]/15 text-[#155E52] px-2 py-0.5 rounded-full font-bold uppercase">Active Market</span>
            </div>
          </div>

          {/* 3 ── Locality Autocomplete */}
          <div>
            <label className="form-label text-[10px]">Locality</label>
            <LocalityAutocomplete
              city={city}
              value={locality}
              onChange={setLocality}
            />
            {!city && (
              <p className="text-[10px] text-[#5C6B73] mt-1 italic">
                Select a city to enable locality search
              </p>
            )}
          </div>

          {/* 4 ── Property Type Pills */}
          <div>
            <label className="form-label text-[10px]">Property Type</label>
            <div className="flex flex-col gap-1.5">
              {PROPERTY_TYPES.map((pt) => (
                <button
                  key={pt}
                  id={`prop-type-${pt.toLowerCase().replace(/\s+/g, '-')}`}
                  type="button"
                  onClick={() => setPropertyType(propertyType === pt ? '' : pt)}
                  className={`text-left px-3 py-2 text-xs font-medium rounded-lg border transition-all ${
                    propertyType === pt
                      ? 'bg-[#12283C] text-white border-[#12283C]'
                      : 'bg-white text-[#12283C] border-[#12283C]/12 hover:border-[#B98B4E] hover:bg-[#F7F5F0]'
                  }`}
                >
                  {pt === 'Apartment' && '🏢'} {pt === 'Independent House' && '🏡'} {pt === 'Villa' && '🏰'} {pt}
                </button>
              ))}
            </div>
          </div>

          {/* 5 ── BHK Pills (Multi-Select) */}
          <div>
            <label className="form-label text-[10px]">BHK</label>
            <div className="grid grid-cols-4 gap-1.5">
              {BHK_OPTIONS.map(({ label, value: val }) => {
                const selectedList = bhk ? String(bhk).split(',').map((s) => s.trim()) : [];
                const isActive = selectedList.includes(val);
                const handleToggle = () => {
                  let updated;
                  if (isActive) {
                    updated = selectedList.filter((item) => item !== val);
                  } else {
                    updated = [...selectedList, val];
                  }
                  setBhk(updated.join(','));
                };
                return (
                  <button
                    key={val}
                    id={`bhk-${val}`}
                    type="button"
                    onClick={handleToggle}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      isActive
                        ? 'bg-[#B98B4E] text-white border-[#B98B4E] shadow-sm'
                        : 'bg-[#F7F5F0] text-[#12283C] border-[#12283C]/12 hover:border-[#B98B4E]'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 6 ── Price Range */}
          <div>
            <label className="form-label text-[10px]">Price Range (₹)</label>
            <div className="space-y-2">
              <PriceInput
                id="min-price-input"
                value={minPrice}
                onChange={setMinPrice}
                placeholder="Min (e.g. 50,00,000)"
              />
              <PriceInput
                id="max-price-input"
                value={maxPrice}
                onChange={setMaxPrice}
                placeholder="Max (e.g. 2,00,00,000)"
              />
            </div>
            {/* Quick preset buttons */}
            <div className="flex flex-wrap gap-1 mt-2">
              {[
                { label: '≤1 Cr', max: '10000000' },
                { label: '≤2 Cr', max: '20000000' },
                { label: '≤5 Cr', max: '50000000' },
              ].map(({ label, max }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => { setMinPrice(''); setMaxPrice(max); }}
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border transition-all ${
                    maxPrice === max
                      ? 'bg-[#12283C] text-white border-[#12283C]'
                      : 'bg-white text-[#5C6B73] border-[#12283C]/15 hover:border-[#B98B4E]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 7 ── RERA Verified Toggle */}
          <div>
            <button
              id="rera-verified-toggle"
              type="button"
              onClick={() => setReraVerified(!reraVerified)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border font-semibold text-xs transition-all ${
                reraVerified
                  ? 'bg-[#1F7A6C]/10 border-[#1F7A6C]/40 text-[#155E52]'
                  : 'bg-white border-[#12283C]/12 text-[#12283C] hover:border-[#1F7A6C]/40'
              }`}
            >
              <span className="flex items-center gap-2">
                <CheckCircle2 className={`w-4 h-4 ${reraVerified ? 'text-[#1F7A6C]' : 'text-[#5C6B73]'}`} />
                RERA Verified Only
              </span>
              <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                reraVerified ? 'bg-[#1F7A6C] border-[#1F7A6C]' : 'border-[#5C6B73]'
              }`}>
                {reraVerified && <span className="w-2 h-2 rounded-full bg-white" />}
              </span>
            </button>
          </div>
        </div>

        {/* Result count footer */}
        {resultCount !== undefined && (
          <div className="px-5 py-3 bg-[#F7F5F0] border-t border-[#12283C]/08">
            <span className="text-xs text-[#5C6B73]">
              <strong className="text-[#12283C]">{resultCount.toLocaleString('en-IN')}</strong> properties match
            </span>
          </div>
        )}
      </div>
    </aside>
  );
};

export default SearchFilterPanel;
