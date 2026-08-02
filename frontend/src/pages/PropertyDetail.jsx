import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import DealBadge from '../components/DealBadge';
import PropertyCard from '../components/PropertyCard';
import { 
  MapPin, Maximize2, BedDouble, Building, Cpu, ShieldCheck, 
  Train, GraduationCap, Hospital, Briefcase, Check, Sparkles, Send, Phone, Mail, ArrowLeft, Edit, Trash2
} from 'lucide-react';

const PropertyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);

  // Live ML Prediction State
  const [prediction, setPrediction] = useState(null);
  const [predictionLoading, setPredictionLoading] = useState(true);

  // Similar Properties State
  const [similarProperties, setSimilarProperties] = useState([]);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({});
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState(null);

  // Inquiry Form State
  const [inquiryData, setInquiryData] = useState({
    name: '',
    email: '',
    phone: '',
    message: 'Hi, I am interested in viewing this property. Please contact me for a site visit.'
  });
  const [inquirySubmitting, setInquirySubmitting] = useState(false);
  const [inquirySuccess, setInquirySuccess] = useState(false);

  const fetchProperty = () => {
    setLoading(true);
    client.get(`/properties/${id}/`)
      .then(res => setProperty(res.data))
      .catch(err => console.error('Error fetching property detail', err))
      .finally(() => setLoading(false));
  };

  const fetchPrediction = () => {
    setPredictionLoading(true);
    client.get(`/properties/${id}/price-prediction/`)
      .then(res => {
        if (res.data && res.data.available !== false && res.data.predicted_price) {
          setPrediction(res.data);
        } else {
          setPrediction(null);
        }
      })
      .catch(err => {
        console.warn('ML price prediction unavailable', err);
        setPrediction(null);
      })
      .finally(() => setPredictionLoading(false));
  };

  const fetchSimilarProperties = () => {
    client.get(`/properties/${id}/similar/`)
      .then(res => setSimilarProperties(res.data || []))
      .catch(err => console.error('Error fetching similar properties', err));
  };

  useEffect(() => {
    fetchProperty();
    fetchPrediction();
    fetchSimilarProperties();
  }, [id]);

  const handleInquirySubmit = (e) => {
    e.preventDefault();
    setInquirySubmitting(true);
    client.post('/crm/inquiries/', {
      property: property.id,
      ...inquiryData
    }).then(() => {
      setInquirySuccess(true);
    }).catch(err => console.error('Inquiry submission error', err))
      .finally(() => setInquirySubmitting(false));
  };

  const handleOpenEdit = () => {
    setEditData({
      title: property.title || '',
      description: property.description || '',
      city: property.city || 'Ahmedabad',
      sub_market: property.sub_market || 'Central',
      locality: property.locality || '',
      property_type: property.property_type || 'Apartment',
      bhk: property.bhk || '',
      area_sqft: property.area_sqft || '',
      floor: property.floor || '',
      total_floors: property.total_floors || '',
      age_years: property.age_years || '',
      furnishing: property.furnishing || 'Semi-Furnished',
      facing: property.facing || 'East',
      listed_price: property.listed_price || '',
      status: property.status || 'for_sale',
      dist_metro_km: property.dist_metro_km || '',
      dist_school_km: property.dist_school_km || '',
      dist_hospital_km: property.dist_hospital_km || '',
      dist_it_hub_km: property.dist_it_hub_km || '',
      has_gym: property.has_gym || false,
      has_pool: property.has_pool || false,
      has_clubhouse: property.has_clubhouse || false,
      has_security: property.has_security || false,
      has_power_backup: property.has_power_backup || false,
      has_parking: property.has_parking || false,
      has_lift: property.has_lift || false,
      rera_approved: property.rera_approved || false
    });
    setEditError(null);
    setShowEditModal(true);
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    setSubmittingEdit(true);
    setEditError(null);

    const payload = {
      ...editData,
      bhk: editData.bhk !== '' ? parseInt(editData.bhk) : 2,
      area_sqft: editData.area_sqft !== '' ? parseFloat(editData.area_sqft) : 1000.0,
      listed_price: editData.listed_price !== '' ? parseFloat(editData.listed_price) : 5000000.0,
      floor: editData.floor !== '' ? parseInt(editData.floor) : 2,
      total_floors: editData.total_floors !== '' ? parseInt(editData.total_floors) : 10,
      age_years: editData.age_years !== '' ? parseInt(editData.age_years) : 2
    };

    client.put(`/properties/${id}/`, payload)
      .then(() => {
        setShowEditModal(false);
        fetchProperty();
        fetchPrediction();
      })
      .catch(err => {
        console.error('Update property error', err);
        setEditError('Failed to update property details.');
      })
      .finally(() => setSubmittingEdit(false));
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this property listing permanently?')) {
      client.delete(`/properties/${id}/`)
        .then(() => navigate('/properties'))
        .catch(err => console.error('Delete property error', err));
    }
  };

  const formatPrice = (price) => {
    if (!price) return 'N/A';
    if (price >= 10000000) {
      return `₹${(price / 10000000).toFixed(2)} Cr`;
    }
    return `₹${(price / 100000).toFixed(2)} Lakh`;
  };

  if (loading) {
    return <div className="text-center py-32 text-[#5C6B73]">Loading property details...</div>;
  }

  if (!property) {
    return (
      <div className="text-center py-32">
        <h2 className="font-serif text-2xl text-[#12283C]">Property Not Found</h2>
        <Link to="/properties" className="btn-primary mt-4">Back to Listings</Link>
      </div>
    );
  }

  const isOwner = user && (user.id === property.owner || user.username === property.owner_details?.username || user.role === 'admin');

  const defaultImg = "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80";
  const primaryImg = (property.images && property.images.length > 0) ? property.images[0] : defaultImg;

  return (
    <div className="bg-[#F7F5F0] min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Back Link & Owner Tools */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <Link to="/properties" className="inline-flex items-center gap-2 text-sm text-[#5C6B73] hover:text-[#12283C] font-semibold">
            <ArrowLeft className="w-4 h-4" /> Back to Property Search
          </Link>

          {isOwner && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenEdit}
                className="btn-secondary py-2 px-4 text-xs"
              >
                <Edit className="w-4 h-4" /> Edit Listing
              </button>
              <button
                onClick={handleDelete}
                className="btn-primary py-2 px-4 text-xs bg-[#E2574C] hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4" /> Delete Listing
              </button>
            </div>
          )}
        </div>

        {/* Hero Title Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <DealBadge dealTag={property.deal_tag || (prediction && prediction.deal_tag)} />
              <span className="text-xs font-semibold text-[#5C6B73] uppercase tracking-wider">
                ID #{property.id} • {property.status?.replace('_', ' ')}
              </span>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-[#12283C]">
              {property.title}
            </h1>
            
            <p className="text-sm text-[#5C6B73] flex items-center gap-1.5 mt-2">
              <MapPin className="w-4 h-4 text-[#B98B4E]" /> {property.locality}, {property.sub_market}, {property.city}
            </p>
          </div>

          <div className="text-left lg:text-right bg-white p-4 rounded-2xl border border-[#12283C]/10 shadow-sm">
            <span className="text-xs font-semibold text-[#5C6B73] uppercase tracking-wider block">Asking Price</span>
            <span className="data-mono text-3xl font-bold text-[#12283C]">
              {formatPrice(property.listed_price)}
            </span>
          </div>
        </div>

        {/* Image Gallery */}
        <div className="relative aspect-[21/9] rounded-3xl overflow-hidden mb-10 bg-[#12283C] shadow-xl">
          <img
            src={primaryImg}
            alt={property.title}
            className="w-full h-full object-cover"
            onError={(e) => { e.target.src = defaultImg; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#12283C]/70 via-transparent to-transparent"></div>
          <div className="absolute bottom-6 left-6 text-white bg-[#12283C]/80 backdrop-blur-md px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#B98B4E]" /> Verified Property Visuals
          </div>
        </div>

        {/* Main Content & Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          {/* Left Specs Column */}
          <div className="lg:col-span-2 space-y-10">
            
            {/* Quick Specs Grid */}
            <div className="glass-card p-6 bg-white border border-[#12283C]/10 rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <span className="text-xs text-[#5C6B73] font-medium block">Bedrooms</span>
                <span className="text-lg font-bold text-[#12283C] flex items-center gap-1.5 mt-0.5">
                  <BedDouble className="w-5 h-5 text-[#B98B4E]" /> {property.bhk} BHK
                </span>
              </div>
              <div>
                <span className="text-xs text-[#5C6B73] font-medium block">Carpet Area</span>
                <span className="data-mono text-lg font-bold text-[#12283C] flex items-center gap-1.5 mt-0.5">
                  <Maximize2 className="w-4 h-4 text-[#1F7A6C]" /> {property.area_sqft} sqft
                </span>
              </div>
              <div>
                <span className="text-xs text-[#5C6B73] font-medium block">Floor Level</span>
                <span className="text-lg font-bold text-[#12283C] flex items-center gap-1.5 mt-0.5">
                  <Building className="w-4 h-4 text-[#5C6B73]" /> {property.floor} / {property.total_floors}
                </span>
              </div>
              <div>
                <span className="text-xs text-[#5C6B73] font-medium block">Property Age</span>
                <span className="text-lg font-bold text-[#12283C] mt-0.5 block">
                  {property.age_years} Years
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="glass-card p-8 bg-white border border-[#12283C]/10 rounded-3xl">
              <h2 className="font-serif text-2xl font-semibold text-[#12283C] mb-4">Property Description</h2>
              <p className="text-sm text-[#5C6B73] leading-relaxed whitespace-pre-line">
                {property.description || 'No additional description provided.'}
              </p>
            </div>

            {/* Proximity Details */}
            <div className="glass-card p-8 bg-white border border-[#12283C]/10 rounded-3xl">
              <h2 className="font-serif text-2xl font-semibold text-[#12283C] mb-6">Location & Connectivity</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-semibold text-[#12283C]">
                <div className="p-4 rounded-2xl bg-[#F7F5F0]">
                  <Train className="w-5 h-5 text-[#B98B4E] mb-2" />
                  <span className="text-[#5C6B73] block text-[11px]">Metro Station</span>
                  <span className="data-mono font-bold text-sm">{property.dist_metro_km} km</span>
                </div>
                <div className="p-4 rounded-2xl bg-[#F7F5F0]">
                  <GraduationCap className="w-5 h-5 text-[#1F7A6C] mb-2" />
                  <span className="text-[#5C6B73] block text-[11px]">Top Schools</span>
                  <span className="data-mono font-bold text-sm">{property.dist_school_km} km</span>
                </div>
                <div className="p-4 rounded-2xl bg-[#F7F5F0]">
                  <Hospital className="w-5 h-5 text-[#E2574C] mb-2" />
                  <span className="text-[#5C6B73] block text-[11px]">Multi-Specialty Hosp.</span>
                  <span className="data-mono font-bold text-sm">{property.dist_hospital_km} km</span>
                </div>
                <div className="p-4 rounded-2xl bg-[#F7F5F0]">
                  <Briefcase className="w-5 h-5 text-[#12283C] mb-2" />
                  <span className="text-[#5C6B73] block text-[11px]">Major IT Park / Hub</span>
                  <span className="data-mono font-bold text-sm">{property.dist_it_hub_km} km</span>
                </div>
              </div>
            </div>

          </div>

          {/* Right ML Valuation & Contact Card */}
          <div className="lg:col-span-1 space-y-8">
            
            {/* Live XGBoost ML Valuation Card (Gracefully hidden if ML service is down) */}
            {prediction && prediction.available !== false && (
              <div className="glass-card-dark p-8 rounded-3xl shadow-2xl border border-white/10">
                <div className="flex items-center gap-2 text-xs font-mono text-[#1F7A6C] mb-3">
                  <Cpu className="w-4 h-4 text-[#1F7A6C]" /> Live ML Price Engine
                </div>

                <h3 className="font-serif text-2xl text-white font-semibold mb-1">Estimated Market Value</h3>
                <p className="text-xs text-[#F7F5F0]/60 mb-4">Calculated in real-time via ml-service</p>
                
                <div className="data-mono text-3xl font-bold text-[#B98B4E] mb-6">
                  {formatPrice(prediction.predicted_price)}
                </div>

                <div className="space-y-3 text-xs text-[#F7F5F0]/80 pt-4 border-t border-white/10 mb-4">
                  <div className="flex justify-between items-center">
                    <span>Model Confidence</span>
                    <span className="font-mono text-[#1F7A6C] font-bold">
                      {prediction.confidence_score ? `${(prediction.confidence_score * 100).toFixed(0)}%` : '95%'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Evaluated Deal Rating</span>
                    <DealBadge dealTag={prediction.deal_tag} />
                  </div>
                </div>
              </div>
            )}

            {/* Contact Agent Form */}
            <div className="glass-card p-8 bg-white border border-[#12283C]/10 rounded-3xl">
              <h3 className="font-serif text-2xl font-semibold text-[#12283C] mb-2">Schedule Site Visit</h3>
              <p className="text-xs text-[#5C6B73] mb-6">Contact listing agent for private viewing.</p>

              {inquirySuccess ? (
                <div className="p-4 rounded-2xl bg-[#1F7A6C]/10 border border-[#1F7A6C]/30 text-center">
                  <Check className="w-8 h-8 text-[#1F7A6C] mx-auto mb-2" />
                  <h4 className="font-serif text-lg font-semibold text-[#12283C]">Inquiry Sent!</h4>
                  <p className="text-xs text-[#5C6B73] mt-1">The agent will contact you shortly.</p>
                </div>
              ) : (
                <form onSubmit={handleInquirySubmit} className="space-y-4">
                  <div>
                    <label className="form-label">Full Name</label>
                    <input
                      type="text"
                      placeholder="Your Name"
                      value={inquiryData.name}
                      onChange={(e) => setInquiryData({ ...inquiryData, name: e.target.value })}
                      className="form-input text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Phone Number</label>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={inquiryData.phone}
                      onChange={(e) => setInquiryData({ ...inquiryData, phone: e.target.value })}
                      className="form-input text-sm"
                      required
                    />
                  </div>
                  <button type="submit" disabled={inquirySubmitting} className="btn-brass w-full justify-center py-3 text-sm">
                    <Send className="w-4 h-4" /> {inquirySubmitting ? 'Sending Request...' : 'Request Site Visit'}
                  </button>
                </form>
              )}
            </div>

          </div>

        </div>

        {/* Similar Properties Section */}
        {similarProperties.length > 0 && (
          <div className="mt-16 pt-12 border-t border-[#12283C]/10">
            <div className="flex items-center justify-between mb-8">
              <div>
                <span className="text-xs font-bold text-[#1F7A6C] uppercase tracking-wider block mb-1">
                  Market Recommendations
                </span>
                <h2 className="font-serif text-3xl font-semibold text-[#12283C]">
                  Similar Properties in {property.city}
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {similarProperties.map(simProp => (
                <PropertyCard key={simProp.id} property={simProp} />
              ))}
            </div>
          </div>
        )}

        {/* Edit Property Modal */}
        {showEditModal && (
          <div className="fixed inset-0 z-50 bg-[#12283C]/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="glass-card max-w-xl w-full max-h-[90vh] overflow-y-auto p-8 bg-white rounded-3xl">
              <h2 className="font-serif text-2xl font-semibold text-[#12283C] mb-4">Edit Property Listing</h2>

              {editError && (
                <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 text-xs font-semibold">
                  {editError}
                </div>
              )}

              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label className="form-label">Property Title</label>
                  <input
                    type="text"
                    value={editData.title}
                    onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                    className="form-input text-sm"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">City</label>
                    <select
                      value={editData.city}
                      onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                      className="form-select text-sm"
                    >
                      <option value="Ahmedabad">Ahmedabad</option>
                      <option value="Bangalore">Bangalore</option>
                      <option value="Delhi NCR">Delhi NCR</option>
                      <option value="Hyderabad">Hyderabad</option>
                      <option value="Mumbai">Mumbai</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label">Locality</label>
                    <input
                      type="text"
                      value={editData.locality}
                      onChange={(e) => setEditData({ ...editData, locality: e.target.value })}
                      className="form-input text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="form-label">BHK</label>
                    <input
                      type="number"
                      value={editData.bhk}
                      onChange={(e) => setEditData({ ...editData, bhk: e.target.value })}
                      className="form-input text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Area (sqft)</label>
                    <input
                      type="number"
                      value={editData.area_sqft}
                      onChange={(e) => setEditData({ ...editData, area_sqft: e.target.value })}
                      className="form-input text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Asking Price (₹)</label>
                    <input
                      type="number"
                      value={editData.listed_price}
                      onChange={(e) => setEditData({ ...editData, listed_price: e.target.value })}
                      className="form-input text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="submit" disabled={submittingEdit} className="btn-brass flex-1 justify-center py-3 text-sm">
                    {submittingEdit ? 'Recalculating ML Pricing...' : 'Save Changes'}
                  </button>
                  <button type="button" onClick={() => setShowEditModal(false)} className="btn-secondary py-3 text-sm">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default PropertyDetail;
