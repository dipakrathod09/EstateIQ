import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import client from '../api/client';
import PropertyCard from '../components/PropertyCard';
import { Search, MapPin, Cpu, TrendingDown, ArrowRight, ShieldCheck, Sparkles, Building2 } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();
  const [featuredProperties, setFeaturedProperties] = useState([]);
  const [goodDeals, setGoodDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchCity, setSearchCity] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      client.get('/properties/'),
      client.get('/properties/?deal_tag=Good Deal')
    ]).then(([resAll, resDeals]) => {
      const allProps = Array.isArray(resAll.data) ? resAll.data : (resAll.data?.results ?? []);
      const dealProps = Array.isArray(resDeals.data) ? resDeals.data : (resDeals.data?.results ?? []);
      setFeaturedProperties(allProps.slice(0, 6));
      setGoodDeals(dealProps.slice(0, 3));
    }).catch(err => console.error('Home load error', err))
      .finally(() => setLoading(false));
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const query = new URLSearchParams();
    if (searchCity) query.append('city', searchCity);
    if (searchKeyword) query.append('locality', searchKeyword);
    navigate(`/properties?${query.toString()}`);
  };

  return (
    <div className="bg-[#F7F5F0] text-[#12283C]">
      
      {/* Hero Section */}
      <section className="relative bg-[#12283C] text-[#F7F5F0] py-20 lg:py-28 overflow-hidden">
        {/* Subtle Background Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#B98B4E]/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#1F7A6C]/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#B98B4E]/20 text-[#B98B4E] border border-[#B98B4E]/30 mb-6">
              <Sparkles className="w-4 h-4 text-[#B98B4E]" /> AI-Powered Real Estate Platform
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-tight text-white mb-6">
              Find your next address, <br className="hidden sm:inline" />
              <span className="text-[#B98B4E]">priced by Machine Learning.</span>
            </h1>

            <p className="text-lg text-[#F7F5F0]/80 leading-relaxed mb-8 max-w-2xl font-sans">
              Discover verified homes across Mumbai with instant AI price estimates, transparent market analytics, and direct owner listings.
            </p>

            {/* Quick Hero Search Box */}
            <form onSubmit={handleSearchSubmit} className="glass-card-dark p-3 rounded-2xl flex flex-col sm:flex-row gap-3 max-w-2xl shadow-2xl mb-8">
              <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-white/05 rounded-xl border border-white/10">
                <MapPin className="w-5 h-5 text-[#B98B4E]" />
                <div className="text-white text-sm font-semibold flex items-center gap-2">
                  <span>Mumbai</span>
                  <span className="text-[10px] bg-[#B98B4E]/30 text-[#B98B4E] px-2 py-0.5 rounded-full font-bold uppercase">Active</span>
                </div>
              </div>

              <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-white/05 rounded-xl border border-white/10">
                <Search className="w-5 h-5 text-[#5C6B73]" />
                <input
                  type="text"
                  placeholder="Locality e.g. Worli, Bandra, Powai"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="bg-transparent text-white placeholder-[#5C6B73] w-full outline-none text-sm font-medium"
                />
              </div>

              <button type="submit" className="btn-brass justify-center py-3.5 px-6 rounded-xl font-semibold text-sm">
                Search Properties
              </button>
            </form>

            {/* Quick Locality Pills */}
            <div className="flex items-center gap-2 flex-wrap text-xs text-[#F7F5F0]/70">
              <span className="font-semibold text-white">Popular Areas:</span>
              {['Bandra', 'Worli', 'Powai', 'Lower Parel', 'Andheri', 'Juhu', 'Thane'].map((locName) => (
                <button
                  key={locName}
                  type="button"
                  onClick={() => navigate(`/properties?city=Mumbai&locality=${encodeURIComponent(locName)}`)}
                  className="px-3 py-1 rounded-full border bg-white/05 text-white/90 border-white/15 hover:bg-[#B98B4E] hover:text-white hover:border-[#B98B4E] transition-all font-medium"
                >
                  {locName}
                </button>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* Market Stats Bar */}
      <section className="border-y border-[#12283C]/10 bg-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <span className="data-mono text-3xl font-bold text-[#12283C] block mb-1">100,000+</span>
              <span className="text-xs uppercase font-bold tracking-wider text-[#5C6B73]">Market Data Points</span>
            </div>
            <div>
              <span className="data-mono text-3xl font-bold text-[#1F7A6C] block mb-1">97.4%</span>
              <span className="text-xs uppercase font-bold tracking-wider text-[#5C6B73]">Valuation Accuracy</span>
            </div>
            <div>
              <span className="data-mono text-3xl font-bold text-[#B98B4E] block mb-1">Mumbai</span>
              <span className="text-xs uppercase font-bold tracking-wider text-[#5C6B73]">Prime Market</span>
            </div>
            <div>
              <span className="data-mono text-3xl font-bold text-[#12283C] block mb-1">100%</span>
              <span className="text-xs uppercase font-bold tracking-wider text-[#5C6B73]">Verified Listings</span>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Properties Grid */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#B98B4E]">Verified Marketplace</span>
              <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#12283C] mt-1">Featured Property Listings</h2>
            </div>
            <Link to="/properties" className="btn-secondary text-sm">
              View All Properties <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-16 text-[#5C6B73]">Loading properties...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredProperties.map(prop => (
                <PropertyCard key={prop.id} property={prop} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Undervalued Investment Deals Highlight */}
      {goodDeals.length > 0 && (
        <section className="py-16 bg-[#12283C] text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-[#1F7A6C]/20 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-[#1F7A6C]" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#1F7A6C]">Investor Spotlights</span>
            </div>
            
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold mb-4">Undervalued Properties (Good Deals)</h2>
            <p className="text-[#F7F5F0]/70 max-w-2xl mb-10 text-sm leading-relaxed">
              Properties verified by machine learning models to be listed below current estimated market value.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {goodDeals.map(prop => (
                <PropertyCard key={prop.id} property={prop} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Valuation Methodology CTA */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-card p-10 lg:p-14 bg-gradient-to-br from-white to-[#F3F0EA] border border-[#12283C]/10 rounded-3xl flex flex-col lg:flex-row items-center justify-between gap-10">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-[#1F7A6C] bg-[#1F7A6C]/10 px-3 py-1 rounded-full mb-4">
              <Cpu className="w-4 h-4" /> AI Price Estimator
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#12283C] mb-4">
              Instant AI Property Valuation
            </h2>
            <p className="text-[#5C6B73] leading-relaxed mb-6">
              Calculate instant price estimates for any home in Mumbai based on location, area, floor level, building age, and amenities.
            </p>
            <Link to="/valuation" className="btn-primary">
              Launch Valuation Calculator <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="w-full lg:w-96 bg-[#12283C] text-white p-8 rounded-2xl shadow-xl border border-white/10">
            <h4 className="font-serif text-xl font-semibold mb-4 text-[#B98B4E]">Valuation Engine Specs</h4>
            <ul className="space-y-3 text-xs text-[#F7F5F0]/80">
              <li className="flex justify-between border-b border-white/10 pb-2">
                <span>Model Architecture</span>
                <span className="font-mono text-white font-semibold">XGBoost Regressor</span>
              </li>
              <li className="flex justify-between border-b border-white/10 pb-2">
                <span>Target Metric</span>
                <span className="font-mono text-white font-semibold">Property Price (INR)</span>
              </li>
              <li className="flex justify-between border-b border-white/10 pb-2">
                <span>Model Precision</span>
                <span className="font-mono text-white font-semibold">97.4% R² Score</span>
              </li>
              <li className="flex justify-between">
                <span>Response Time</span>
                <span className="font-mono text-[#1F7A6C] font-bold">&lt; 50ms Real-Time</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Home;
