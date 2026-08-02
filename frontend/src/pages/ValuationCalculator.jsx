import React, { useState, useEffect } from 'react';
import client from '../api/client';
import DealBadge from '../components/DealBadge';
import { Cpu, Calculator, Sparkles, TrendingDown, CheckCircle, ShieldCheck, MapPin, Building } from 'lucide-react';

const ValuationCalculator = () => {
  const initialInputs = {
    city: 'Mumbai',
    sub_market: 'Central',
    locality: '',
    property_type: 'Apartment',
    bhk: '',
    area_sqft: '',
    floor: '',
    total_floors: '',
    age_years: '',
    furnishing: 'Semi-Furnished',
    facing: 'East',
    dist_metro_km: '',
    dist_school_km: '',
    dist_hospital_km: '',
    dist_it_hub_km: '',
    has_gym: false,
    has_pool: false,
    has_clubhouse: false,
    has_security: true,
    has_power_backup: true,
    has_parking: true,
    has_lift: true,
    rera_approved: true,
    listed_price: ''
  };

  const [inputs, setInputs] = useState(initialInputs);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // City-Locality Sync State
  const [cityLocalities, setCityLocalities] = useState([]);

  useEffect(() => {
    const activeCity = inputs.city || 'Mumbai';
    client.get(`/properties/localities/?city=${encodeURIComponent(activeCity)}`)
      .then(res => {
        const list = res.data || [];
        setCityLocalities(list);
        if (list.length > 0 && !list.includes(inputs.locality)) {
          setInputs(prev => ({ ...prev, locality: list[0] }));
        }
      })
      .catch(err => console.error('Failed to load localities for city:', err));
  }, [inputs.city]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    const locality = (inputs.locality || '').trim();
    const area = parseFloat(inputs.area_sqft);
    const bhk = parseInt(inputs.bhk, 10);
    const floor = parseInt(inputs.floor, 10);
    const totalFloors = parseInt(inputs.total_floors, 10);

    if (!locality) {
      setError('Locality name is required.');
      setLoading(false);
      return;
    }
    if (isNaN(bhk) || bhk < 1 || bhk > 20) {
      setError('Please enter a valid BHK count between 1 and 20.');
      setLoading(false);
      return;
    }
    if (isNaN(area) || area < 100 || area > 50000) {
      setError('Please enter a realistic carpet area (between 100 sqft and 50,000 sqft).');
      setLoading(false);
      return;
    }
    if (!isNaN(floor) && !isNaN(totalFloors) && floor > totalFloors) {
      setError('Floor level cannot exceed total building floors.');
      setLoading(false);
      return;
    }

    const payload = {
      city: inputs.city || 'Mumbai',
      sub_market: inputs.sub_market || 'Central',
      locality,
      property_type: inputs.property_type || 'Apartment',
      bhk,
      area_sqft: area,
      floor: isNaN(floor) ? 2 : floor,
      total_floors: isNaN(totalFloors) ? 10 : totalFloors,
      age_years: inputs.age_years !== '' ? parseInt(inputs.age_years, 10) : 3,
      dist_metro_km: inputs.dist_metro_km !== '' ? parseFloat(inputs.dist_metro_km) : 1.5,
      dist_school_km: inputs.dist_school_km !== '' ? parseFloat(inputs.dist_school_km) : 1.0,
      dist_hospital_km: inputs.dist_hospital_km !== '' ? parseFloat(inputs.dist_hospital_km) : 1.5,
      dist_it_hub_km: inputs.dist_it_hub_km !== '' ? parseFloat(inputs.dist_it_hub_km) : 3.0,
      listed_price: inputs.listed_price !== '' ? parseFloat(inputs.listed_price) : 5000000.0,
      has_gym: inputs.has_gym,
      has_pool: inputs.has_pool,
      has_clubhouse: inputs.has_clubhouse,
      has_security: inputs.has_security,
      has_power_backup: inputs.has_power_backup,
      has_parking: inputs.has_parking,
      has_lift: inputs.has_lift,
      rera_approved: inputs.rera_approved,
      furnishing: inputs.furnishing,
      facing: inputs.facing
    };

    client.post('/properties/estimate-price/', payload)
      .then(res => setResult(res.data))
      .catch(err => {
        console.error('Valuation calculation error', err);
        const data = err.response?.data;
        let msg = 'Failed to compute valuation. Please check input parameters.';
        if (data && typeof data === 'object') {
          const firstKey = Object.keys(data)[0];
          const val = Array.isArray(data[firstKey]) ? data[firstKey][0] : data[firstKey];
          msg = `${firstKey}: ${val}`;
        }
        setError(msg);
      })
      .finally(() => setLoading(false));
  };

  const formatPrice = (price) => {
    if (!price) return 'N/A';
    if (price >= 10000000) {
      return `₹${(price / 10000000).toFixed(2)} Cr`;
    }
    return `₹${(price / 100000).toFixed(2)} Lakh`;
  };

  return (
    <div className="bg-[#F7F5F0] min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#1F7A6C]/10 text-[#1F7A6C] border border-[#1F7A6C]/30 mb-4">
            <Cpu className="w-4 h-4" /> AI Valuation Engine
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl font-semibold text-[#12283C] mb-4">
            Instant AI Property Valuation
          </h1>
          <p className="text-[#5C6B73] text-sm sm:text-base leading-relaxed">
            Calculate estimated market value for any property in Mumbai based on area, BHK, floor level, building age, and key amenities.
          </p>
        </div>

        {/* Calculator Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          {/* Inputs Form */}
          <div className="lg:col-span-2">
            <div className="glass-card p-8 bg-white border border-[#12283C]/10 rounded-3xl shadow-lg">
              <h2 className="font-serif text-2xl font-semibold text-[#12283C] mb-6 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-[#B98B4E]" /> Enter Property Attributes
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Metro City</label>
                    <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#F7F5F0] border border-[#12283C]/12 rounded-xl text-sm font-semibold text-[#12283C]">
                      <span className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#B98B4E]" /> Mumbai
                      </span>
                      <span className="text-[10px] bg-[#1F7A6C]/15 text-[#155E52] px-2 py-0.5 rounded-full font-bold uppercase">Active Market</span>
                    </div>
                  </div>

                  <div>
                    <label className="form-label">Locality / Area ({inputs.city || 'Mumbai'})</label>
                    <select
                      value={inputs.locality}
                      onChange={(e) => setInputs({ ...inputs, locality: e.target.value })}
                      className="form-select text-sm font-medium"
                      required
                    >
                      <option value="">-- Select Locality in {inputs.city || 'Mumbai'} --</option>
                      {cityLocalities.map((loc) => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="form-label">Property Type</label>
                    <select
                      value={inputs.property_type}
                      onChange={(e) => setInputs({ ...inputs, property_type: e.target.value })}
                      className="form-select text-sm"
                    >
                      <option value="Apartment">Apartment</option>
                      <option value="Independent House">Independent House</option>
                      <option value="Villa">Villa</option>
                      <option value="Penthouse">Penthouse</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label">BHK Count</label>
                    <input
                      type="number"
                      placeholder="e.g. 3"
                      value={inputs.bhk}
                      onChange={(e) => setInputs({ ...inputs, bhk: e.target.value })}
                      className="form-input text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">Area (sqft)</label>
                    <input
                      type="number"
                      placeholder="e.g. 1500"
                      value={inputs.area_sqft}
                      onChange={(e) => setInputs({ ...inputs, area_sqft: e.target.value })}
                      className="form-input text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="form-label">Floor Level</label>
                    <input
                      type="number"
                      placeholder="e.g. 5"
                      value={inputs.floor}
                      onChange={(e) => setInputs({ ...inputs, floor: e.target.value })}
                      className="form-input text-sm"
                    />
                  </div>

                  <div>
                    <label className="form-label">Total Floors</label>
                    <input
                      type="number"
                      placeholder="e.g. 12"
                      value={inputs.total_floors}
                      onChange={(e) => setInputs({ ...inputs, total_floors: e.target.value })}
                      className="form-input text-sm"
                    />
                  </div>

                  <div>
                    <label className="form-label">Property Age (Yrs)</label>
                    <input
                      type="number"
                      placeholder="e.g. 2"
                      value={inputs.age_years}
                      onChange={(e) => setInputs({ ...inputs, age_years: e.target.value })}
                      className="form-input text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="form-label">Furnishing</label>
                    <select
                      value={inputs.furnishing}
                      onChange={(e) => setInputs({ ...inputs, furnishing: e.target.value })}
                      className="form-select text-sm"
                    >
                      <option value="Unfurnished">Unfurnished</option>
                      <option value="Semi-Furnished">Semi-Furnished</option>
                      <option value="Fully-Furnished">Fully-Furnished</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label">Facing</label>
                    <select
                      value={inputs.facing}
                      onChange={(e) => setInputs({ ...inputs, facing: e.target.value })}
                      className="form-select text-sm"
                    >
                      <option value="East">East</option>
                      <option value="West">West</option>
                      <option value="North">North</option>
                      <option value="South">South</option>
                      <option value="North-East">North-East</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label">Asking Price (₹ Optional)</label>
                    <input
                      type="number"
                      placeholder="e.g. 12500000"
                      value={inputs.listed_price}
                      onChange={(e) => setInputs({ ...inputs, listed_price: e.target.value })}
                      className="form-input text-sm"
                    />
                  </div>
                </div>

                {/* Amenities Checkboxes */}
                <div className="pt-4 border-t border-[#12283C]/10">
                  <label className="form-label mb-3">Society Amenities</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-semibold text-[#12283C]">
                    {[
                      { key: 'has_gym', label: 'Gymnasium' },
                      { key: 'has_pool', label: 'Swimming Pool' },
                      { key: 'has_clubhouse', label: 'Clubhouse' },
                      { key: 'has_security', label: 'Security' },
                      { key: 'has_power_backup', label: 'Power Backup' },
                      { key: 'has_parking', label: 'Reserved Parking' },
                      { key: 'has_lift', label: 'Elevators' },
                      { key: 'rera_approved', label: 'RERA Verified' }
                    ].map(item => (
                      <label key={item.key} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-[#F7F5F0]">
                        <input
                          type="checkbox"
                          checked={inputs[item.key]}
                          onChange={(e) => setInputs({ ...inputs, [item.key]: e.target.checked })}
                          className="accent-[#B98B4E] w-4 h-4"
                        />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-brass w-full justify-center py-4 text-base rounded-xl shadow-lg"
                >
                  <Cpu className="w-5 h-5" /> {loading ? 'Calculating XGBoost Model Valuation...' : 'Calculate Fair Market Value'}
                </button>

              </form>

            </div>
          </div>

          {/* Result Column */}
          <div className="lg:col-span-1">
            {result ? (
              <div className="glass-card-dark p-8 rounded-3xl sticky top-28 shadow-2xl border border-white/10">
                <div className="flex items-center gap-2 text-xs font-mono text-[#1F7A6C] mb-4">
                  <Sparkles className="w-4 h-4 text-[#1F7A6C]" /> Calculation Completed
                </div>

                <h3 className="font-serif text-2xl text-white font-semibold mb-2">Estimated Fair Value</h3>
                <span className="data-mono text-3xl font-bold text-[#B98B4E] block mb-6">
                  {formatPrice(result.predicted_price)}
                </span>

                <div className="space-y-4 text-xs text-[#F7F5F0]/80 pt-4 border-t border-white/10 mb-6">
                  <div className="flex justify-between items-center">
                    <span>Model Confidence</span>
                    <span className="font-mono text-[#1F7A6C] font-bold">{(result.confidence_score * 100).toFixed(0)}%</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span>Evaluated Deal Rating</span>
                    <DealBadge dealTag={result.deal_tag} />
                  </div>

                  <div className="flex justify-between items-center">
                    <span>Engine Reference</span>
                    <span className="font-mono text-white">{result.based_on || 'XGBoost 100k Model'}</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white/05 border border-white/10 text-xs text-[#F7F5F0]/80 leading-relaxed">
                  Calculated based on XGBoost feature weights for {inputs.city} ({inputs.locality || 'Selected locality'}).
                </div>
              </div>
            ) : (
              <div className="glass-card p-8 bg-white border border-[#12283C]/10 rounded-3xl sticky top-28 text-center">
                <div className="w-12 h-12 rounded-full bg-[#12283C]/05 text-[#12283C] flex items-center justify-center mx-auto mb-4">
                  <Cpu className="w-6 h-6 text-[#B98B4E]" />
                </div>
                <h3 className="font-serif text-xl font-semibold text-[#12283C] mb-2">Ready for ML Valuation</h3>
                <p className="text-xs text-[#5C6B73] leading-relaxed">
                  Fill in the property specifications on the left and click "Calculate Fair Market Value" to compute your instant XGBoost ML prediction.
                </p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

export default ValuationCalculator;
