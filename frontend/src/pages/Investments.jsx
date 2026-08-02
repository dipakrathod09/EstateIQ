import React, { useState, useEffect } from 'react';
import { SlidersHorizontal, TrendingUp, Clock, X, RotateCcw } from 'lucide-react';
import InvestmentCard from '../components/InvestmentCard';
import { getInvestmentListings } from '../api/investments';

const ASSET_CLASSES = ['Commercial Office', 'Warehousing', 'Pre-Launch Residential', 'Retail'];

const ASSET_COLORS = {
  'Commercial Office':      { bg: 'rgba(31,122,108,0.15)', color: '#155E52', border: 'rgba(31,122,108,0.35)' },
  'Warehousing':            { bg: 'rgba(92,107,115,0.15)', color: '#3D4F57', border: 'rgba(92,107,115,0.35)' },
  'Pre-Launch Residential': { bg: 'rgba(185,139,78,0.15)', color: '#7A5A28', border: 'rgba(185,139,78,0.35)' },
  'Retail':                 { bg: 'rgba(18,40,60,0.12)',   color: '#12283C', border: 'rgba(18,40,60,0.3)'  },
};

const Investments = () => {
  const [listings, setListings]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [filters, setFilters]     = useState({
    asset_class: '',
    is_pre_launch: null,
    min_roi: '',
    max_roi: '',
    ordering: '-created_at',
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchListings = async (f = filters) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await getInvestmentListings(f);
      setListings(resp.data);
    } catch {
      setError('Unable to load investment listings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchListings(); }, []);

  const applyFilters = (overrides = {}) => {
    const newFilters = { ...filters, ...overrides };
    setFilters(newFilters);
    fetchListings(newFilters);
  };

  const resetFilters = () => {
    const defaults = { asset_class: '', is_pre_launch: null, min_roi: '', max_roi: '', ordering: '-created_at' };
    setFilters(defaults);
    fetchListings(defaults);
  };

  const activeFilterCount = [
    filters.asset_class,
    filters.is_pre_launch !== null,
    filters.min_roi,
    filters.max_roi,
  ].filter(Boolean).length;

  const prelaunchCount = listings.filter(l => l.is_pre_launch).length;

  return (
    <div className="min-h-screen" style={{ background: '#F7F5F0' }}>

      {/* ── Hero Banner ── */}
      <section
        style={{
          background: 'linear-gradient(135deg, #12283C 0%, #1E3A52 50%, #12283C 100%)',
          position: 'relative', overflow: 'hidden',
        }}
      >
        {/* Decorative grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,0.03) 39px,rgba(255,255,255,0.03) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,0.03) 39px,rgba(255,255,255,0.03) 40px)',
        }} />
        <div style={{
          position: 'absolute', top: '-80px', right: '-80px',
          width: '360px', height: '360px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(185,139,78,0.15) 0%, transparent 70%)',
        }} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#B98B4E]/20 border border-[#B98B4E]/40 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[#B98B4E]" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#B98B4E]">Fractional Investment Directory</span>
          </div>
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            Institutional-Grade<br />
            <span style={{ color: '#B98B4E' }}>Real Estate Returns</span>
          </h1>
          <p className="text-white/60 text-lg max-w-xl leading-relaxed mb-8">
            Curated commercial, warehousing, and residential investment opportunities. 
            Browse, filter, and connect with our investment team — no commitments at this stage.
          </p>

          {/* Stats Row */}
          <div className="flex flex-wrap gap-6">
            {[
              { label: 'Avg. Expected ROI', value: listings.length ? `${(listings.reduce((s, l) => s + parseFloat(l.expected_roi_percentage), 0) / listings.length).toFixed(1)}%` : '—' },
              { label: 'Active Listings', value: listings.length },
              { label: 'Pre-Launch Deals', value: prelaunchCount },
              { label: 'Asset Classes', value: 4 },
            ].map(stat => (
              <div key={stat.label} className="flex flex-col">
                <span className="data-mono text-2xl font-bold text-white">{stat.value}</span>
                <span className="text-xs text-white/50 uppercase tracking-wider font-medium mt-0.5">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Main Content ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex gap-8">

          {/* ── Sidebar Filter ── */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="glass-card p-5 sticky top-28">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#B98B4E]" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-[#12283C]">Filters</h2>
                  {activeFilterCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-[#B98B4E] text-white text-[10px] font-bold flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </div>
                {activeFilterCount > 0 && (
                  <button onClick={resetFilters} className="text-xs text-[#5C6B73] hover:text-[#E2574C] flex items-center gap-1 transition-colors">
                    <RotateCcw className="w-3 h-3" /> Reset
                  </button>
                )}
              </div>

              {/* Asset Class */}
              <div className="mb-5">
                <p className="form-label mb-2">Asset Class</p>
                <div className="space-y-1.5">
                  {['', ...ASSET_CLASSES].map(cls => (
                    <button
                      key={cls}
                      onClick={() => applyFilters({ asset_class: cls })}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                        filters.asset_class === cls
                          ? 'bg-[#12283C] text-white font-semibold'
                          : 'text-[#5C6B73] hover:bg-[#12283C]/05 hover:text-[#12283C]'
                      }`}
                    >
                      {cls || 'All Classes'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pre-Launch Toggle */}
              <div className="mb-5 pb-5 border-b border-[#12283C]/08">
                <p className="form-label mb-2">Timing</p>
                <button
                  onClick={() => applyFilters({ is_pre_launch: filters.is_pre_launch === true ? null : true })}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all ${
                    filters.is_pre_launch === true
                      ? 'bg-[#E2574C]/10 border-[#E2574C]/30 text-[#B9382E]'
                      : 'border-[#12283C]/12 text-[#5C6B73] hover:bg-[#12283C]/05'
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <Clock className="w-3.5 h-3.5" /> Pre-Launch Only
                  </span>
                  {filters.is_pre_launch === true && <X className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* ROI Range */}
              <div className="mb-5">
                <p className="form-label mb-2">Expected ROI</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <input
                      type="number"
                      placeholder="Min %"
                      value={filters.min_roi}
                      onChange={e => setFilters(f => ({ ...f, min_roi: e.target.value }))}
                      onBlur={() => applyFilters()}
                      className="form-input text-sm py-2 px-3"
                    />
                  </div>
                  <span className="text-[#5C6B73] text-sm">–</span>
                  <div className="flex-1">
                    <input
                      type="number"
                      placeholder="Max %"
                      value={filters.max_roi}
                      onChange={e => setFilters(f => ({ ...f, max_roi: e.target.value }))}
                      onBlur={() => applyFilters()}
                      className="form-input text-sm py-2 px-3"
                    />
                  </div>
                </div>
              </div>

              {/* Sort */}
              <div>
                <p className="form-label mb-2">Sort By</p>
                <select
                  value={filters.ordering}
                  onChange={e => applyFilters({ ordering: e.target.value })}
                  className="form-select text-sm"
                >
                  <option value="-created_at">Newest First</option>
                  <option value="expected_roi_percentage">ROI: Low → High</option>
                  <option value="-expected_roi_percentage">ROI: High → Low</option>
                  <option value="min_investment_amount">Min Ticket: Low → High</option>
                  <option value="-min_investment_amount">Min Ticket: High → Low</option>
                </select>
              </div>
            </div>
          </aside>

          {/* ── Listings Grid ── */}
          <div className="flex-1 min-w-0">
            {/* Mobile filter bar */}
            <div className="lg:hidden flex items-center justify-between mb-5">
              <p className="text-sm font-medium text-[#5C6B73]">{listings.length} listings</p>
              <button
                onClick={() => setSidebarOpen(true)}
                className="btn-secondary text-sm py-2 px-4"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
              </button>
            </div>

            {/* Count bar */}
            <div className="hidden lg:flex items-center justify-between mb-6">
              <p className="text-sm font-medium text-[#5C6B73]">
                <span className="data-mono font-bold text-[#12283C]">{listings.length}</span> investment {listings.length === 1 ? 'opportunity' : 'opportunities'}
                {filters.asset_class && ` in ${filters.asset_class}`}
              </p>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="glass-card h-72 animate-pulse" style={{ background: 'rgba(18,40,60,0.05)' }} />
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-20">
                <p className="text-[#E2574C] font-medium mb-4">{error}</p>
                <button onClick={() => fetchListings()} className="btn-primary">Retry</button>
              </div>
            ) : listings.length === 0 ? (
              <div className="text-center py-20">
                <TrendingUp className="w-12 h-12 text-[#5C6B73]/30 mx-auto mb-4" />
                <h3 className="font-serif text-xl text-[#12283C] mb-2">No listings found</h3>
                <p className="text-[#5C6B73] text-sm mb-4">Try adjusting your filters</p>
                <button onClick={resetFilters} className="btn-secondary">Clear Filters</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {listings.map(listing => (
                  <InvestmentCard key={listing.id} listing={listing} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Investments;
