import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import client from '../api/client';
import PropertyCard from '../components/PropertyCard';
import { Search, Filter, SlidersHorizontal, MapPin, Building, RotateCcw, Sparkles } from 'lucide-react';

const Properties = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Filters State
  const [city, setCity] = useState(searchParams.get('city') || '');
  const [locality, setLocality] = useState(searchParams.get('locality') || '');
  const [bhk, setBhk] = useState(searchParams.get('bhk') || '');
  const [propertyType, setPropertyType] = useState(searchParams.get('property_type') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [dealTag, setDealTag] = useState(searchParams.get('deal_tag') || '');
  const [minPrice, setMinPrice] = useState(searchParams.get('min_price') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max_price') || '');

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProperties = () => {
    setLoading(true);
    const params = {};
    if (city) params.city = city;
    if (locality) params.locality = locality;
    if (bhk) params.bhk = bhk;
    if (propertyType) params.property_type = propertyType;
    if (status) params.status = status;
    if (dealTag) params.deal_tag = dealTag;
    if (minPrice) params.min_price = minPrice;
    if (maxPrice) params.max_price = maxPrice;

    client.get('/properties/', { params })
      .then(res => setProperties(res.data))
      .catch(err => console.error('Error loading properties', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProperties();
  }, [city, locality, bhk, propertyType, status, dealTag, minPrice, maxPrice]);

  const handleResetFilters = () => {
    setCity('');
    setLocality('');
    setBhk('');
    setPropertyType('');
    setStatus('');
    setDealTag('');
    setMinPrice('');
    setMaxPrice('');
    setSearchParams({});
  };

  return (
    <div className="bg-[#F7F5F0] min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Page Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-[#B98B4E]/15 text-[#B98B4E] mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Blueprint Skyline Directory
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#12283C]">
            Explore Property Listings
          </h1>
          <p className="text-[#5C6B73] text-sm mt-1">
            Real estate listings with live XGBoost machine learning price valuations.
          </p>
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar Filter Controls */}
          <aside className="lg:col-span-1">
            <div className="glass-card p-6 bg-white border border-[#12283C]/10 rounded-2xl sticky top-28">
              <div className="flex items-center justify-between pb-4 border-b border-[#12283C]/10 mb-6">
                <div className="flex items-center gap-2 font-serif font-semibold text-lg text-[#12283C]">
                  <SlidersHorizontal className="w-5 h-5 text-[#B98B4E]" /> Filter Listings
                </div>
                <button
                  onClick={handleResetFilters}
                  className="text-xs text-[#5C6B73] hover:text-[#B98B4E] flex items-center gap-1 font-medium transition-colors"
                >
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
              </div>

              <div className="space-y-5">
                {/* City Select */}
                <div>
                  <label className="form-label">Metro City</label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="form-select text-sm"
                  >
                    <option value="">All Metros</option>
                    <option value="Mumbai">Mumbai</option>
                    <option value="Delhi NCR">Delhi NCR</option>
                    <option value="Bangalore">Bangalore</option>
                    <option value="Hyderabad">Hyderabad</option>
                    <option value="Ahmedabad">Ahmedabad</option>
                  </select>
                </div>

                {/* Locality Search */}
                <div>
                  <label className="form-label">Locality Search</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. Worli, Bandra, Saket"
                      value={locality}
                      onChange={(e) => setLocality(e.target.value)}
                      className="form-input text-sm pl-9"
                    />
                    <Search className="w-4 h-4 text-[#5C6B73] absolute left-3 top-3.5" />
                  </div>
                </div>

                {/* BHK Config */}
                <div>
                  <label className="form-label">BHK Configuration</label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {['1', '2', '3', '4', '5'].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setBhk(bhk === val ? '' : val)}
                        className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                          bhk === val
                            ? 'bg-[#12283C] text-white border-[#12283C]'
                            : 'bg-[#F7F5F0] text-[#12283C] border-[#12283C]/10 hover:border-[#B98B4E]'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Property Type */}
                <div>
                  <label className="form-label">Property Type</label>
                  <select
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value)}
                    className="form-select text-sm"
                  >
                    <option value="">All Types</option>
                    <option value="Apartment">Apartment</option>
                    <option value="Independent House">Independent House</option>
                    <option value="Villa">Villa</option>
                    <option value="Penthouse">Penthouse</option>
                  </select>
                </div>

                {/* Deal Rating Filter */}
                <div>
                  <label className="form-label">ML Deal Rating</label>
                  <select
                    value={dealTag}
                    onChange={(e) => setDealTag(e.target.value)}
                    className="form-select text-sm font-medium"
                  >
                    <option value="">All Ratings</option>
                    <option value="Good Deal">Good Deal (Undervalued)</option>
                    <option value="Fair Price">Fair Market Price</option>
                    <option value="Overpriced">Overpriced</option>
                  </select>
                </div>

                {/* Price Range Filter */}
                <div>
                  <label className="form-label">Max Asking Price (₹)</label>
                  <select
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="form-select text-sm data-mono"
                  >
                    <option value="">Any Price</option>
                    <option value="10000000">Up to ₹1.00 Cr</option>
                    <option value="20000000">Up to ₹2.00 Cr</option>
                    <option value="50000000">Up to ₹5.00 Cr</option>
                    <option value="100000000">Up to ₹10.00 Cr</option>
                  </select>
                </div>

              </div>
            </div>
          </aside>

          {/* Results Grid Area */}
          <main className="lg:col-span-3">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#12283C]/10">
              <span className="text-sm font-semibold text-[#5C6B73]">
                Showing <strong className="text-[#12283C]">{properties.length}</strong> matching properties
              </span>

              {(city || locality || bhk || propertyType || dealTag) && (
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  {city && <span className="px-2.5 py-1 rounded-full bg-[#12283C] text-white">City: {city}</span>}
                  {locality && <span className="px-2.5 py-1 rounded-full bg-[#12283C] text-white">Locality: {locality}</span>}
                  {bhk && <span className="px-2.5 py-1 rounded-full bg-[#12283C] text-white">{bhk} BHK</span>}
                  {dealTag && <span className="px-2.5 py-1 rounded-full bg-[#1F7A6C] text-white">{dealTag}</span>}
                </div>
              )}
            </div>

            {loading ? (
              <div className="text-center py-24 text-[#5C6B73]">Loading matching property listings...</div>
            ) : properties.length === 0 ? (
              <div className="glass-card p-12 text-center bg-white rounded-2xl">
                <Building className="w-12 h-12 text-[#5C6B73] mx-auto mb-4" />
                <h3 className="font-serif text-2xl font-semibold text-[#12283C] mb-2">No Matching Properties Found</h3>
                <p className="text-sm text-[#5C6B73] max-w-md mx-auto mb-6">
                  Try broadening your search parameters or clearing active filters.
                </p>
                <button onClick={handleResetFilters} className="btn-primary">
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties.map(prop => (
                  <PropertyCard key={prop.id} property={prop} />
                ))}
              </div>
            )}
          </main>

        </div>

      </div>
    </div>
  );
};

export default Properties;
