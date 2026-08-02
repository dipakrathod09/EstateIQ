import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import PropertyCard from '../components/PropertyCard';
import DealBadge from '../components/DealBadge';
import { 
  PlusCircle, Building2, MessageSquare, Bookmark, FileText, Wrench, Shield, 
  TrendingDown, CheckCircle, LogIn, CreditCard, AlertCircle, Clock, Check, Send, Sparkles,
  X, Image, ArrowRight, ArrowLeft, Home, Ruler, Layers, Star
} from 'lucide-react';

const Dashboard = ({ forcedRole }) => {
  const { user, login, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const userRole = forcedRole || user?.role || '';
  const roleLower = userRole.toLowerCase();

  const [activeTab, setActiveTab] = useState('listings');
  const [myListings, setMyListings] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [savedProps, setSavedProps] = useState([]);
  const [leases, setLeases] = useState([]);
  const [payments, setPayments] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [goodDeals, setGoodDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Listing Modal State
  const initialPropState = {
    // Step 1 — Basic Info
    title: '',
    description: '',
    property_type: 'Apartment',
    status: 'for_sale',
    possession_status: 'Ready to Move',
    project_name: '',
    developer: '',
    // Step 2 — Location
    city: 'Mumbai',
    sub_market: 'Central',
    locality: '',
    // Step 3 — Property Details
    bhk: '',
    bathroom: '',
    area_sqft: '',
    floor: '',
    total_floors: '',
    age_years: '',
    furnishing: 'Semi-Furnished',
    facing: 'East',
    listed_price: '',
    // Step 4 — Distances
    dist_metro_km: '',
    dist_school_km: '',
    dist_hospital_km: '',
    dist_it_hub_km: '',
    // Step 5 — Amenities & Images
    has_gym: false,
    has_pool: false,
    has_clubhouse: false,
    has_security: true,
    has_power_backup: true,
    has_parking: true,
    has_lift: true,
    rera_approved: true,
    images: []
  };

  // Multi-step form state
  const [formStep, setFormStep] = useState(1);
  const FORM_STEPS = 5;
  // Image URL input state
  const [imageUrlInput, setImageUrlInput] = useState('');
  // Device image upload ref
  const fileInputRef = useRef(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newProp, setNewProp] = useState(initialPropState);
  const [submittingProp, setSubmittingProp] = useState(false);
  const [createError, setCreateError] = useState(null);

  // Handle device image file selection — convert to base64 data URLs
  const handleDeviceImageSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const MAX_SIZE_MB = 5;
    const readers = files.map(file => new Promise((resolve, reject) => {
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        reject(`"${file.name}" exceeds ${MAX_SIZE_MB}MB limit.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => resolve(ev.target.result);
      reader.onerror = () => reject(`Failed to read "${file.name}".`);
      reader.readAsDataURL(file);
    }));
    Promise.allSettled(readers).then(results => {
      const successful = results.filter(r => r.status === 'fulfilled').map(r => r.value);
      const failed = results.filter(r => r.status === 'rejected').map(r => r.reason);
      if (failed.length) setCreateError(failed.join(' '));
      else setCreateError(null);
      if (successful.length) {
        setNewProp(prev => ({ ...prev, images: [...(prev.images || []), ...successful] }));
      }
    });
    // Reset file input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Maintenance Modal State
  const [showMaintModal, setShowMaintModal] = useState(false);
  const [newMaint, setNewMaint] = useState({
    property: '',
    title: '',
    description: '',
    priority: 'medium'
  });
  const [submittingMaint, setSubmittingMaint] = useState(false);

  // City-Locality Sync State
  const [cityLocalities, setCityLocalities] = useState([]);

  useEffect(() => {
    if (newProp.city) {
      client.get(`/properties/localities/?city=${encodeURIComponent(newProp.city)}`)
        .then(res => {
          const list = res.data || [];
          setCityLocalities(list);
          if (list.length > 0 && !list.includes(newProp.locality)) {
            setNewProp(prev => ({ ...prev, locality: list[0] }));
          }
        })
        .catch(err => console.error('Error fetching localities:', err));
    }
  }, [newProp.city]);

  // Investment Listing Modal State
  const [showAddInvestmentModal, setShowAddInvestmentModal] = useState(false);
  const [newInvestment, setNewInvestment] = useState({
    property: '',
    asset_class: 'Commercial Office',
    expected_roi_percentage: '14.50',
    projected_rental_yield: '8.20',
    min_investment_amount: '2500000',
    lock_in_period_min_months: '36',
    lock_in_period_max_months: '36',
    is_pre_launch: false,
    payout_frequency: 'Quarterly',
    disclaimer_text: 'Projected returns are illustrative estimates, not guaranteed. Past performance is not indicative of future results.',
    is_sample_data: true
  });
  const [submittingInvestment, setSubmittingInvestment] = useState(false);
  const [investmentError, setInvestmentError] = useState(null);
  const [investmentSuccess, setInvestmentSuccess] = useState(false);

  useEffect(() => {
    if (roleLower === 'tenant') {
      setActiveTab('leases');
    } else if (roleLower === 'investor') {
      setActiveTab('deals');
    } else {
      setActiveTab('listings');
    }
  }, [roleLower]);

  const loadDashboardData = () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    if (roleLower === 'agent' || roleLower === 'landlord' || roleLower === 'admin') {
      Promise.allSettled([
        client.get('/properties/my-listings/'),
        client.get('/crm/inquiries/'),
        client.get('/management/leases/'),
        client.get('/management/payments/'),
        client.get('/management/maintenance/')
      ]).then(([resListings, resInquiries, resLeases, resPayments, resMaint]) => {
        if (resListings.status === 'fulfilled') setMyListings(resListings.value.data || []);
        if (resInquiries.status === 'fulfilled') setInquiries(resInquiries.value.data || []);
        if (resLeases.status === 'fulfilled') setLeases(resLeases.value.data || []);
        if (resPayments.status === 'fulfilled') setPayments(resPayments.value.data || []);
        if (resMaint.status === 'fulfilled') setMaintenance(resMaint.value.data || []);
      }).finally(() => setLoading(false));
    } else if (roleLower === 'tenant') {
      Promise.allSettled([
        client.get('/crm/saved/'),
        client.get('/crm/inquiries/'),
        client.get('/management/leases/'),
        client.get('/management/payments/'),
        client.get('/management/maintenance/')
      ]).then(([resSaved, resInquiries, resLeases, resPayments, resMaint]) => {
        if (resSaved.status === 'fulfilled') setSavedProps(resSaved.value.data || []);
        if (resInquiries.status === 'fulfilled') setInquiries(resInquiries.value.data || []);
        if (resLeases.status === 'fulfilled') setLeases(resLeases.value.data || []);
        if (resPayments.status === 'fulfilled') setPayments(resPayments.value.data || []);
        if (resMaint.status === 'fulfilled') setMaintenance(resMaint.value.data || []);
      }).finally(() => setLoading(false));
    } else if (roleLower === 'investor') {
      client.get('/properties/?deal_tag=Good Deal')
        .then(res => {
          const data = res.data;
          const deals = Array.isArray(data) ? data : (data.results ?? []);
          setGoodDeals(deals);
        })
        .catch(err => console.error('Investor deals load error', err))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user, roleLower]);

  const handleCreateProperty = (e) => {
    e.preventDefault();
    setCreateError(null);

    const title = (newProp.title || '').trim();
    const locality = (newProp.locality || '').trim();
    const price = parseFloat(newProp.listed_price);
    const area = parseFloat(newProp.area_sqft);
    const bhk = parseInt(newProp.bhk, 10);
    const floor = parseInt(newProp.floor, 10);
    const totalFloors = parseInt(newProp.total_floors, 10);
    const bathroom = parseInt(newProp.bathroom, 10);

    if (!title || title.length < 5) { setCreateError('Property title must be at least 5 characters long.'); return; }
    if (!locality) { setCreateError('Locality is required.'); return; }
    if (isNaN(price) || price < 100000) { setCreateError('Please enter a realistic asking price (at least ₹1,00,000 / 1 Lakh).'); return; }
    if (isNaN(area) || area < 100 || area > 50000) { setCreateError('Please enter a realistic carpet area (between 100 sqft and 50,000 sqft).'); return; }
    if (isNaN(bhk) || bhk < 1 || bhk > 20) { setCreateError('Please enter a valid BHK count between 1 and 20.'); return; }
    if (!isNaN(floor) && !isNaN(totalFloors) && floor > totalFloors) {
      setCreateError('Floor level cannot exceed total floors in building.');
      return;
    }

    setSubmittingProp(true);
    const payload = {
      ...newProp,
      title,
      description: (newProp.description || '').trim(),
      locality,
      sub_market: newProp.sub_market || newProp.city || 'Central',
      project_name: newProp.project_name || null,
      developer: newProp.developer || null,
      possession_status: newProp.possession_status || 'Ready to Move',
      status: newProp.status || 'for_sale',
      bhk,
      bathroom: !isNaN(bathroom) && bathroom > 0 ? bathroom : null,
      area_sqft: area,
      listed_price: price,
      floor: isNaN(floor) ? 1 : floor,
      total_floors: isNaN(totalFloors) ? 1 : totalFloors,
      age_years: newProp.age_years !== '' ? parseInt(newProp.age_years, 10) : 2,
      dist_metro_km: newProp.dist_metro_km !== '' ? parseFloat(newProp.dist_metro_km) : 1.5,
      dist_school_km: newProp.dist_school_km !== '' ? parseFloat(newProp.dist_school_km) : 1.0,
      dist_hospital_km: newProp.dist_hospital_km !== '' ? parseFloat(newProp.dist_hospital_km) : 1.5,
      dist_it_hub_km: newProp.dist_it_hub_km !== '' ? parseFloat(newProp.dist_it_hub_km) : 3.0,
      images: newProp.images && newProp.images.length > 0 ? newProp.images : ["https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80"]
    };

    client.post('/properties/', payload)
      .then(() => {
        setShowAddModal(false);
        setCreateError(null);
        setNewProp(initialPropState);
        setFormStep(1);
        setImageUrlInput('');
        loadDashboardData();
      })
      .catch(err => {
        console.error('Property creation error', err);
        setCreateError('Failed to create listing. Please check input parameters.');
      })
      .finally(() => setSubmittingProp(false));
  };

  const [editingPropId, setEditingPropId] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const handleOpenEdit = (prop) => {
    setEditingPropId(prop.id);
    setNewProp({
      title: prop.title || '',
      description: prop.description || '',
      city: prop.city || 'Mumbai',
      sub_market: prop.sub_market || 'Central',
      locality: prop.locality || '',
      property_type: prop.property_type || 'Apartment',
      bhk: prop.bhk || '',
      area_sqft: prop.area_sqft || '',
      floor: prop.floor || '',
      total_floors: prop.total_floors || '',
      age_years: prop.age_years || '',
      furnishing: prop.furnishing || 'Semi-Furnished',
      facing: prop.facing || 'East',
      listed_price: prop.listed_price || '',
      dist_metro_km: prop.dist_metro_km || '',
      dist_school_km: prop.dist_school_km || '',
      dist_hospital_km: prop.dist_hospital_km || '',
      dist_it_hub_km: prop.dist_it_hub_km || '',
      has_gym: prop.has_gym || false,
      has_pool: prop.has_pool || false,
      has_clubhouse: prop.has_clubhouse || false,
      has_security: prop.has_security || false,
      has_power_backup: prop.has_power_backup || false,
      has_parking: prop.has_parking || false,
      has_lift: prop.has_lift || false,
      rera_approved: prop.rera_approved || false
    });
    setCreateError(null);
    setShowEditModal(true);
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    setCreateError(null);
    setSubmittingProp(true);
    const payload = {
      ...newProp,
      title: newProp.title || 'Property Listing',
      sub_market: newProp.sub_market || newProp.city || 'Central',
      locality: newProp.locality || 'Central Area',
      bhk: newProp.bhk !== '' ? parseInt(newProp.bhk) : 2,
      area_sqft: newProp.area_sqft !== '' ? parseFloat(newProp.area_sqft) : 1000.0,
      listed_price: newProp.listed_price !== '' ? parseFloat(newProp.listed_price) : 5000000.0,
      floor: newProp.floor !== '' ? parseInt(newProp.floor) : 2,
      total_floors: newProp.total_floors !== '' ? parseInt(newProp.total_floors) : 10,
      age_years: newProp.age_years !== '' ? parseInt(newProp.age_years) : 2,
      dist_metro_km: newProp.dist_metro_km !== '' ? parseFloat(newProp.dist_metro_km) : 1.5,
      dist_school_km: newProp.dist_school_km !== '' ? parseFloat(newProp.dist_school_km) : 1.0,
      dist_hospital_km: newProp.dist_hospital_km !== '' ? parseFloat(newProp.dist_hospital_km) : 1.5,
      dist_it_hub_km: newProp.dist_it_hub_km !== '' ? parseFloat(newProp.dist_it_hub_km) : 3.0,
      images: newProp.images && newProp.images.length > 0 ? newProp.images : ["https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80"]
    };

    client.put(`/properties/${editingPropId}/`, payload)
      .then(() => {
        setShowEditModal(false);
        setEditingPropId(null);
        setCreateError(null);
        setNewProp(initialPropState);
        loadDashboardData();
      })
      .catch(err => {
        console.error('Property edit error', err);
        setCreateError('Failed to update listing. Please check input parameters.');
      })
      .finally(() => setSubmittingProp(false));
  };

  const handleDeleteProperty = (propId) => {
    if (window.confirm('Are you sure you want to delete this property listing?')) {
      client.delete(`/properties/${propId}/`)
        .then(() => loadDashboardData())
        .catch(err => console.error('Property delete error', err));
    }
  };

  const handlePayBill = (paymentId) => {
    client.post(`/management/payments/${paymentId}/mark_paid/`)
      .then(() => loadDashboardData())
      .catch(err => console.error('Payment error', err));
  };

  const handleCreateMaintenance = (e) => {
    e.preventDefault();
    setSubmittingMaint(true);
    const propId = newMaint.property || (leases.length > 0 ? leases[0].property : null);
    client.post('/management/maintenance/', {
      ...newMaint,
      property: propId,
      lease: leases.length > 0 ? leases[0].id : null
    }).then(() => {
      setShowMaintModal(false);
      setNewMaint({ property: '', title: '', description: '', priority: 'medium' });
      loadDashboardData();
    }).catch(err => console.error('Maintenance creation error', err))
      .finally(() => setSubmittingMaint(false));
  };

  const handleCreateInvestment = async (e) => {
    e.preventDefault();
    setInvestmentError(null);

    if (!newInvestment.property) {
      setInvestmentError('Please select an owned property to list for investment.');
      return;
    }

    const roi = parseFloat(newInvestment.expected_roi_percentage);
    const yieldPct = parseFloat(newInvestment.projected_rental_yield);
    const minAmt = parseInt(newInvestment.min_investment_amount, 10);
    const lockInMin = parseInt(newInvestment.lock_in_period_min_months, 10);
    const lockInMax = parseInt(newInvestment.lock_in_period_max_months, 10);
    const disclaimer = (newInvestment.disclaimer_text || '').trim();

    if (isNaN(roi) || roi <= 0 || roi > 100) {
      setInvestmentError('Please enter a valid expected ROI percentage (between 0.1% and 100%).');
      return;
    }
    if (isNaN(yieldPct) || yieldPct <= 0 || yieldPct > 100) {
      setInvestmentError('Please enter a valid projected rental yield percentage (between 0.1% and 100%).');
      return;
    }
    if (isNaN(minAmt) || minAmt < 100000) {
      setInvestmentError('Minimum ticket size must be at least ₹1,00,000 (100,000 INR).');
      return;
    }
    if (isNaN(lockInMin) || lockInMin < 1) {
      setInvestmentError('Lock-in period must be at least 1 month.');
      return;
    }
    if (!disclaimer || disclaimer.length < 20) {
      setInvestmentError('Regulatory disclaimer text must be at least 20 characters long.');
      return;
    }

    setSubmittingInvestment(true);
    try {
      const payload = {
        ...newInvestment,
        property: parseInt(newInvestment.property, 10),
        expected_roi_percentage: roi,
        projected_rental_yield: yieldPct,
        min_investment_amount: minAmt,
        lock_in_period_min_months: lockInMin,
        lock_in_period_max_months: isNaN(lockInMax) ? lockInMin : lockInMax,
        disclaimer_text: disclaimer,
      };
      await client.post('/investments/', payload);
      setInvestmentSuccess(true);
      setTimeout(() => {
        setShowAddInvestmentModal(false);
        setInvestmentSuccess(false);
        navigate('/investments');
      }, 1500);
    } catch (err) {
      console.error('Failed to create investment listing:', err);
      const detail = err.response?.data?.detail || err.response?.data?.disclaimer_text?.[0] || 'Failed to create investment listing.';
      setInvestmentError(detail);
    } finally {
      setSubmittingInvestment(false);
    }
  };

  const handleUpdateMaintStatus = (id, newStatus) => {
    client.patch(`/management/maintenance/${id}/`, { status: newStatus })
      .then(() => loadDashboardData())
      .catch(err => console.error('Status update error', err));
  };

  const handleQuickDemoLogin = async (username) => {
    try {
      await login(username, 'password123');
    } catch (err) {
      console.error('Demo login error', err);
    }
  };

  const renderPaymentBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'paid') {
      return (
        <span className="badge-good-deal text-xs">
          <Check className="w-3.5 h-3.5" /> Paid
        </span>
      );
    }
    if (s === 'late') {
      return (
        <span className="badge-overpriced text-xs">
          <AlertCircle className="w-3.5 h-3.5" /> Late Overdue
        </span>
      );
    }
    return (
      <span className="badge-fair-price text-xs">
        <Clock className="w-3.5 h-3.5 text-[#B98B4E]" /> Pending
      </span>
    );
  };

  if (authLoading) {
    return <div className="text-center py-32 text-[#5C6B73]">Loading dashboard session...</div>;
  }

  // Unauthenticated Call-to-Action View
  if (!user) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
        <div className="glass-card max-w-lg w-full p-8 bg-white text-center border border-[#12283C]/10 rounded-3xl shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-[#12283C]/08 text-[#12283C] flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-7 h-7 text-[#B98B4E]" />
          </div>
          <h2 className="font-serif text-3xl font-semibold text-[#12283C] mb-2">Portal Access Required</h2>
          <p className="text-sm text-[#5C6B73] leading-relaxed mb-6">
            Sign in to view your personalized Landlord occupancy tracker or Tenant lease & maintenance portal.
          </p>

          <Link to="/login" className="btn-primary w-full justify-center py-3.5 mb-6 text-sm">
            <LogIn className="w-4 h-4" /> Sign In to Your Account
          </Link>

          <div className="pt-6 border-t border-[#12283C]/10">
            <span className="text-[11px] font-bold text-[#5C6B73] uppercase tracking-wider block mb-3">
              1-Click Demo Persona Login
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => handleQuickDemoLogin('agent_rohit')} className="btn-secondary py-2 text-xs justify-center">
                Agent Rohit
              </button>
              <button onClick={() => handleQuickDemoLogin('landlord_ananya')} className="btn-secondary py-2 text-xs justify-center">
                Landlord Ananya
              </button>
              <button onClick={() => handleQuickDemoLogin('tenant_vikram')} className="btn-secondary py-2 text-xs justify-center">
                Tenant Vikram
              </button>
              <button onClick={() => handleQuickDemoLogin('investor_prior')} className="btn-secondary py-2 text-xs justify-center">
                Investor Priya
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F7F5F0] min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Dashboard Banner */}
        <div className="glass-card-dark p-8 rounded-3xl mb-8 relative overflow-hidden shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#B98B4E] block mb-1">
                {user.role} Management Portal
              </span>
              <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-white">
                Welcome back, {user.first_name || user.username}!
              </h1>
              <p className="text-xs text-[#F7F5F0]/70 mt-1">
                {user.email} {user.company_name ? `• ${user.company_name}` : ''}
              </p>
            </div>

            {(roleLower === 'agent' || roleLower === 'landlord' || roleLower === 'admin') && (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="btn-brass"
                >
                  <PlusCircle className="w-5 h-5" /> Add Property Listing
                </button>
                <button
                  onClick={() => setShowAddInvestmentModal(true)}
                  className="btn-primary bg-[#1F7A6C] hover:bg-[#155E52] border border-[#1F7A6C]"
                >
                  <Sparkles className="w-5 h-5" /> List for Investment
                </button>
              </div>
            )}

            {roleLower === 'tenant' && (
              <button
                onClick={() => setShowMaintModal(true)}
                className="btn-brass"
              >
                <Wrench className="w-5 h-5" /> Submit Maintenance Request
              </button>
            )}
          </div>
        </div>

        {/* Landlord Occupancy & Revenue Stats (Phase 3 Requirement) */}
        {(roleLower === 'landlord' || roleLower === 'agent' || roleLower === 'admin') && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="glass-card p-5 bg-white border border-[#12283C]/10 rounded-2xl">
              <span className="text-xs font-semibold text-[#5C6B73] uppercase tracking-wider block mb-1">Owned Properties</span>
              <span className="data-mono text-2xl font-bold text-[#12283C]">{myListings.length}</span>
            </div>
            <div className="glass-card p-5 bg-white border border-[#12283C]/10 rounded-2xl">
              <span className="text-xs font-semibold text-[#1F7A6C] uppercase tracking-wider block mb-1">Active Occupied Leases</span>
              <span className="data-mono text-2xl font-bold text-[#1F7A6C]">{leases.length}</span>
            </div>
            <div className="glass-card p-5 bg-white border border-[#12283C]/10 rounded-2xl">
              <span className="text-xs font-semibold text-[#B98B4E] uppercase tracking-wider block mb-1">Pending Maintenance</span>
              <span className="data-mono text-2xl font-bold text-[#B98B4E]">
                {maintenance.filter(m => m.status !== 'resolved').length}
              </span>
            </div>
            <div className="glass-card p-5 bg-white border border-[#12283C]/10 rounded-2xl">
              <span className="text-xs font-semibold text-[#5C6B73] uppercase tracking-wider block mb-1">Monthly Rent Collection</span>
              <span className="data-mono text-2xl font-bold text-[#12283C]">
                ₹{(leases.reduce((acc, l) => acc + (l.monthly_rent || 0), 0) / 1000).toFixed(0)}k/mo
              </span>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-3 border-b border-[#12283C]/10 pb-3 mb-8 overflow-x-auto">
          {(roleLower === 'agent' || roleLower === 'landlord' || roleLower === 'admin') && (
            <>
              <button
                onClick={() => setActiveTab('listings')}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                  activeTab === 'listings' ? 'bg-[#12283C] text-white shadow-md' : 'text-[#5C6B73] hover:text-[#12283C]'
                }`}
              >
                <Building2 className="w-4 h-4 text-[#B98B4E]" /> Properties ({myListings.length})
              </button>

              <button
                onClick={() => setActiveTab('leases')}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                  activeTab === 'leases' ? 'bg-[#12283C] text-white shadow-md' : 'text-[#5C6B73] hover:text-[#12283C]'
                }`}
              >
                <FileText className="w-4 h-4 text-[#1F7A6C]" /> Tenant Leases ({leases.length})
              </button>

              <button
                onClick={() => setActiveTab('payments')}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                  activeTab === 'payments' ? 'bg-[#12283C] text-white shadow-md' : 'text-[#5C6B73] hover:text-[#12283C]'
                }`}
              >
                <CreditCard className="w-4 h-4 text-[#B98B4E]" /> Rent Payments ({payments.length})
              </button>

              <button
                onClick={() => setActiveTab('maintenance')}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                  activeTab === 'maintenance' ? 'bg-[#12283C] text-white shadow-md' : 'text-[#5C6B73] hover:text-[#12283C]'
                }`}
              >
                <Wrench className="w-4 h-4 text-[#E2574C]" /> Maintenance Inbox ({maintenance.length})
              </button>

              <button
                onClick={() => setActiveTab('inquiries')}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                  activeTab === 'inquiries' ? 'bg-[#12283C] text-white shadow-md' : 'text-[#5C6B73] hover:text-[#12283C]'
                }`}
              >
                <MessageSquare className="w-4 h-4" /> Client Inquiries ({inquiries.length})
              </button>
            </>
          )}

          {roleLower === 'tenant' && (
            <>
              <button
                onClick={() => setActiveTab('leases')}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                  activeTab === 'leases' ? 'bg-[#12283C] text-white shadow-md' : 'text-[#5C6B73] hover:text-[#12283C]'
                }`}
              >
                <FileText className="w-4 h-4 text-[#B98B4E]" /> My Active Lease ({leases.length})
              </button>

              <button
                onClick={() => setActiveTab('payments')}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                  activeTab === 'payments' ? 'bg-[#12283C] text-white shadow-md' : 'text-[#5C6B73] hover:text-[#12283C]'
                }`}
              >
                <CreditCard className="w-4 h-4 text-[#1F7A6C]" /> Rent Payments Schedule ({payments.length})
              </button>

              <button
                onClick={() => setActiveTab('maintenance')}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                  activeTab === 'maintenance' ? 'bg-[#12283C] text-white shadow-md' : 'text-[#5C6B73] hover:text-[#12283C]'
                }`}
              >
                <Wrench className="w-4 h-4 text-[#E2574C]" /> Maintenance Requests ({maintenance.length})
              </button>

              <button
                onClick={() => setActiveTab('saved')}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                  activeTab === 'saved' ? 'bg-[#12283C] text-white shadow-md' : 'text-[#5C6B73] hover:text-[#12283C]'
                }`}
              >
                <Bookmark className="w-4 h-4" /> Saved Properties ({savedProps.length})
              </button>
            </>
          )}

          {roleLower === 'investor' && (
            <button
              onClick={() => setActiveTab('deals')}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#1F7A6C] text-white shadow-md flex items-center gap-2"
            >
              <TrendingDown className="w-4 h-4" /> Curated Good Deals (High ROI)
            </button>
          )}
        </div>

        {/* Tab Contents */}
        {loading ? (
          <div className="text-center py-24 text-[#5C6B73]">Loading management records...</div>
        ) : (
          <div>
            
            {/* My Listings */}
            {activeTab === 'listings' && (
              <div>
                {myListings.length === 0 ? (
                  <div className="glass-card p-12 bg-white text-center rounded-3xl">
                    <Building2 className="w-12 h-12 text-[#5C6B73] mx-auto mb-3" />
                    <h3 className="font-serif text-2xl font-semibold text-[#12283C]">No Properties Listed Yet</h3>
                    <p className="text-sm text-[#5C6B73] mt-1 mb-6">Click "Add New Property Listing" to list your property.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {myListings.map(prop => (
                      <PropertyCard 
                        key={prop.id} 
                        property={prop} 
                        onEdit={handleOpenEdit}
                        onDelete={handleDeleteProperty}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Leases Table */}
            {activeTab === 'leases' && (
              <div className="space-y-6">
                {leases.length === 0 ? (
                  <div className="glass-card p-12 bg-white text-center rounded-3xl">
                    <FileText className="w-12 h-12 text-[#5C6B73] mx-auto mb-3" />
                    <h3 className="font-serif text-2xl font-semibold text-[#12283C]">No Active Leases</h3>
                    <p className="text-sm text-[#5C6B73] mt-1">No lease agreements currently on record.</p>
                  </div>
                ) : (
                  leases.map(lease => (
                    <div key={lease.id} className="glass-card p-6 bg-white border border-[#12283C]/10 rounded-2xl shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#12283C]/10 pb-4 mb-4">
                        <div>
                          <span className="text-xs font-bold text-[#1F7A6C] uppercase tracking-wider block">
                            Lease ID #{lease.id} • {lease.status.toUpperCase()}
                          </span>
                          <h3 className="font-serif text-2xl font-semibold text-[#12283C] mt-1">
                            {lease.property_details?.title || 'Leased Property'}
                          </h3>
                        </div>

                        <div className="text-left sm:text-right">
                          <span className="text-xs text-[#5C6B73] font-medium block">Monthly Rent</span>
                          <span className="data-mono text-2xl font-bold text-[#12283C]">
                            ₹{(lease.monthly_rent || lease.rent_amount)?.toLocaleString('en-IN')}/mo
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                        <div><span className="text-[#5C6B73] block">Tenant:</span> <strong>{lease.tenant_details?.first_name || lease.tenant_details?.username}</strong> ({lease.tenant_details?.email})</div>
                        <div><span className="text-[#5C6B73] block">Landlord:</span> <strong>{lease.landlord_details?.first_name || lease.landlord_details?.username}</strong></div>
                        <div><span className="text-[#5C6B73] block">Start Date:</span> <strong className="data-mono">{lease.start_date}</strong></div>
                        <div><span className="text-[#5C6B73] block">End Date:</span> <strong className="data-mono">{lease.end_date}</strong></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Payments Schedule Table */}
            {activeTab === 'payments' && (
              <div className="glass-card p-6 bg-white border border-[#12283C]/10 rounded-2xl shadow-sm overflow-x-auto">
                <h3 className="font-serif text-xl font-semibold text-[#12283C] mb-4">Rent Payment Schedule</h3>

                {payments.length === 0 ? (
                  <p className="text-sm text-[#5C6B73] py-8 text-center">No payment schedule records found.</p>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#12283C]/10 text-[#5C6B73] uppercase tracking-wider font-semibold">
                        <th className="py-3 px-4">Due Date</th>
                        <th className="py-3 px-4">Property</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Paid Date</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#12283C]/05 font-medium">
                      {payments.map(pay => (
                        <tr key={pay.id} className="hover:bg-[#F7F5F0]/50 transition-colors">
                          <td className="py-3.5 px-4 data-mono font-bold text-[#12283C]">{pay.due_date}</td>
                          <td className="py-3.5 px-4 font-semibold text-[#12283C]">{pay.property_title}</td>
                          <td className="py-3.5 px-4 data-mono font-bold text-[#12283C]">₹{pay.amount?.toLocaleString('en-IN')}</td>
                          <td className="py-3.5 px-4 data-mono text-[#5C6B73]">{pay.paid_date || '-'}</td>
                          <td className="py-3.5 px-4">{renderPaymentBadge(pay.status)}</td>
                          <td className="py-3.5 px-4 text-right">
                            {pay.status !== 'paid' && (
                              <button
                                onClick={() => handlePayBill(pay.id)}
                                className="btn-brass py-1 px-3 text-xs"
                              >
                                Pay Now
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Maintenance Requests Inbox */}
            {activeTab === 'maintenance' && (
              <div className="space-y-4">
                {maintenance.length === 0 ? (
                  <div className="glass-card p-12 bg-white text-center rounded-3xl">
                    <Wrench className="w-12 h-12 text-[#5C6B73] mx-auto mb-3" />
                    <h3 className="font-serif text-2xl font-semibold text-[#12283C]">No Maintenance Tickets</h3>
                    <p className="text-sm text-[#5C6B73] mt-1">No maintenance requests currently filed.</p>
                  </div>
                ) : (
                  maintenance.map(maint => (
                    <div key={maint.id} className="glass-card p-6 bg-white border border-[#12283C]/10 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-[#E2574C] uppercase tracking-wider">
                            Priority: {maint.priority}
                          </span>
                          <span className="text-xs text-[#5C6B73]">• {maint.property_title}</span>
                        </div>

                        <h4 className="font-serif text-xl font-semibold text-[#12283C]">{maint.title}</h4>
                        <p className="text-xs text-[#5C6B73] mt-1 max-w-xl">{maint.description}</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-[#12283C] bg-[#F7F5F0] px-3 py-1.5 rounded-lg border border-[#12283C]/10">
                          Status: {maint.status}
                        </span>

                        {(roleLower === 'landlord' || roleLower === 'agent' || roleLower === 'admin') && maint.status !== 'resolved' && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleUpdateMaintStatus(maint.id, 'in_progress')}
                              className="btn-secondary py-1.5 px-3 text-xs"
                            >
                              In Progress
                            </button>
                            <button
                              onClick={() => handleUpdateMaintStatus(maint.id, 'resolved')}
                              className="btn-primary py-1.5 px-3 text-xs"
                            >
                              Resolve
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Investor Good Deals */}
            {activeTab === 'deals' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {goodDeals.map(prop => (
                  <PropertyCard key={prop.id} property={prop} />
                ))}
              </div>
            )}

            {/* Saved Properties */}
            {activeTab === 'saved' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {savedProps.map(item => (
                  <PropertyCard key={item.id} property={item.property_details} />
                ))}
              </div>
            )}

          </div>
        )}

        {/* ═══════════════ ADD PROPERTY MODAL — 5-Step Wizard ═══════════════ */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-[#12283C]/85 backdrop-blur-md flex items-start justify-center p-4 overflow-y-auto">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl my-8 overflow-hidden">
              <div className="bg-[#12283C] px-8 py-6 flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#B98B4E] mb-1">New Property Listing</p>
                  <h2 className="font-serif text-2xl font-semibold text-white">Add Property — Step {formStep} of {FORM_STEPS}</h2>
                </div>
                <button type="button" onClick={() => { setShowAddModal(false); setFormStep(1); setCreateError(null); setImageUrlInput(''); }}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex h-1.5 bg-[#F7F5F0]">
                {[1,2,3,4,5].map(s => (
                  <div key={s} className={`flex-1 transition-all ${s <= formStep ? 'bg-[#B98B4E]' : 'bg-transparent'}`} />
                ))}
              </div>
              {createError && (
                <div className="mx-8 mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {createError}
                </div>
              )}
              <form onSubmit={handleCreateProperty}>
                <div className="px-8 py-6 space-y-5 max-h-[60vh] overflow-y-auto">

                  {formStep === 1 && (
                    <>
                      <div>
                        <label className="form-label">Property Title <span className="text-red-500">*</span></label>
                        <input type="text" placeholder="e.g. Luxury 3 BHK Flat with Sea View in Worli"
                          value={newProp.title} onChange={e => setNewProp({ ...newProp, title: e.target.value })}
                          className="form-input text-sm" />
                        <p className="text-[10px] text-[#5C6B73] mt-1">Min 5 characters. Be descriptive.</p>
                      </div>
                      <div>
                        <label className="form-label">Property Description</label>
                        <textarea rows="3" placeholder="Describe the property, highlights, nearby conveniences, society features..."
                          value={newProp.description} onChange={e => setNewProp({ ...newProp, description: e.target.value })}
                          className="form-input text-sm resize-none" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="form-label">Property Type</label>
                          <select value={newProp.property_type} onChange={e => setNewProp({ ...newProp, property_type: e.target.value })} className="form-select text-sm">
                            <option value="Apartment">Apartment</option>
                            <option value="Independent House">Independent House</option>
                            <option value="Villa">Villa</option>
                            <option value="Penthouse">Penthouse</option>
                            <option value="Studio">Studio</option>
                          </select>
                        </div>
                        <div>
                          <label className="form-label">Listing Status</label>
                          <select value={newProp.status} onChange={e => setNewProp({ ...newProp, status: e.target.value })} className="form-select text-sm">
                            <option value="for_sale">For Sale</option>
                            <option value="for_rent">For Rent</option>
                            <option value="available">Available</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="form-label">Possession Status</label>
                          <select value={newProp.possession_status} onChange={e => setNewProp({ ...newProp, possession_status: e.target.value })} className="form-select text-sm">
                            <option value="Ready to Move">Ready to Move</option>
                            <option value="Under Construction">Under Construction</option>
                          </select>
                        </div>
                        <div>
                          <label className="form-label">Furnishing Status</label>
                          <select value={newProp.furnishing} onChange={e => setNewProp({ ...newProp, furnishing: e.target.value })} className="form-select text-sm">
                            <option value="Unfurnished">Unfurnished</option>
                            <option value="Semi-Furnished">Semi-Furnished</option>
                            <option value="Fully-Furnished">Fully-Furnished</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="form-label">Project / Society Name</label>
                          <input type="text" placeholder="e.g. Lodha Altamount, Hiranandani Gardens"
                            value={newProp.project_name} onChange={e => setNewProp({ ...newProp, project_name: e.target.value })}
                            className="form-input text-sm" />
                        </div>
                        <div>
                          <label className="form-label">Builder / Developer</label>
                          <input type="text" placeholder="e.g. Lodha Group, Godrej Properties"
                            value={newProp.developer} onChange={e => setNewProp({ ...newProp, developer: e.target.value })}
                            className="form-input text-sm" />
                        </div>
                      </div>
                    </>
                  )}

                  {formStep === 2 && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="form-label">City <span className="text-red-500">*</span></label>
                          <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#F7F5F0] border border-[#12283C]/12 rounded-xl text-sm font-semibold text-[#12283C]">
                            <span className="flex items-center gap-1.5">
                              <MapPin className="w-4 h-4 text-[#B98B4E]" /> Mumbai
                            </span>
                            <span className="text-[10px] bg-[#1F7A6C]/15 text-[#155E52] px-2 py-0.5 rounded-full font-bold uppercase">Active</span>
                          </div>
                        </div>
                        <div>
                          <label className="form-label">Sub-Market / Zone</label>
                          <select value={newProp.sub_market} onChange={e => setNewProp({ ...newProp, sub_market: e.target.value })} className="form-select text-sm">
                            <option value="Central">Central Mumbai</option>
                            <option value="Western Suburbs">Western Suburbs</option>
                            <option value="Eastern Suburbs">Eastern Suburbs</option>
                            <option value="South Mumbai">South Mumbai</option>
                            <option value="Navi Mumbai">Navi Mumbai</option>
                            <option value="Thane">Thane</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="form-label">Locality / Area <span className="text-red-500">*</span></label>
                        <select value={newProp.locality} onChange={e => setNewProp({ ...newProp, locality: e.target.value })} className="form-select text-sm font-medium">
                          <option value="">-- Select Locality in {newProp.city} --</option>
                          {cityLocalities.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                        </select>
                        <p className="text-[10px] text-[#5C6B73] mt-1">Only valid localities for the selected city are shown.</p>
                      </div>
                      <div>
                        <label className="form-label">Facing Direction</label>
                        <div className="grid grid-cols-4 gap-2">
                          {['North','South','East','West','North-East','North-West','South-East','South-West'].map(dir => (
                            <button type="button" key={dir}
                              onClick={() => setNewProp({ ...newProp, facing: dir })}
                              className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${newProp.facing === dir ? 'bg-[#12283C] text-white border-[#12283C]' : 'bg-[#F7F5F0] text-[#12283C] border-[#12283C]/20 hover:border-[#12283C]/50'}`}>
                              {dir}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {formStep === 3 && (
                    <>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="form-label">BHK <span className="text-red-500">*</span></label>
                          <input type="number" placeholder="3" min="1" max="20"
                            value={newProp.bhk} onChange={e => setNewProp({ ...newProp, bhk: e.target.value })}
                            className="form-input text-sm" />
                        </div>
                        <div>
                          <label className="form-label">Bathrooms</label>
                          <input type="number" placeholder="2" min="1" max="20"
                            value={newProp.bathroom} onChange={e => setNewProp({ ...newProp, bathroom: e.target.value })}
                            className="form-input text-sm" />
                        </div>
                        <div>
                          <label className="form-label">Carpet Area (sqft) <span className="text-red-500">*</span></label>
                          <input type="number" placeholder="1500" min="100" max="50000"
                            value={newProp.area_sqft} onChange={e => setNewProp({ ...newProp, area_sqft: e.target.value })}
                            className="form-input text-sm" />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="form-label">Floor No.</label>
                          <input type="number" placeholder="5" min="0"
                            value={newProp.floor} onChange={e => setNewProp({ ...newProp, floor: e.target.value })}
                            className="form-input text-sm" />
                        </div>
                        <div>
                          <label className="form-label">Total Floors</label>
                          <input type="number" placeholder="12" min="1" max="200"
                            value={newProp.total_floors} onChange={e => setNewProp({ ...newProp, total_floors: e.target.value })}
                            className="form-input text-sm" />
                        </div>
                        <div>
                          <label className="form-label">Property Age (Yrs)</label>
                          <input type="number" placeholder="3" min="0" max="150"
                            value={newProp.age_years} onChange={e => setNewProp({ ...newProp, age_years: e.target.value })}
                            className="form-input text-sm" />
                        </div>
                      </div>
                      <div>
                        <label className="form-label">Asking Price (₹) <span className="text-red-500">*</span></label>
                        <input type="number" placeholder="12500000" min="100000"
                          value={newProp.listed_price} onChange={e => setNewProp({ ...newProp, listed_price: e.target.value })}
                          className="form-input text-sm" />
                        {newProp.listed_price && !isNaN(parseFloat(newProp.listed_price)) && (
                          <p className="text-[10px] text-[#1F7A6C] font-semibold mt-1">
                            {parseFloat(newProp.listed_price) >= 10000000
                              ? `₹${(parseFloat(newProp.listed_price)/10000000).toFixed(2)} Crore`
                              : `₹${(parseFloat(newProp.listed_price)/100000).toFixed(2)} Lakh`}
                          </p>
                        )}
                      </div>
                    </>
                  )}

                  {formStep === 4 && (
                    <>
                      <div className="p-4 rounded-xl bg-[#1F7A6C]/05 border border-[#1F7A6C]/20 text-xs text-[#5C6B73] mb-2">
                        💡 Proximity data significantly improves ML valuation accuracy. Leave blank to use smart city defaults.
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="form-label">🚇 Distance to Metro (km)</label>
                          <input type="number" placeholder="1.5" step="0.1" min="0" max="100"
                            value={newProp.dist_metro_km} onChange={e => setNewProp({ ...newProp, dist_metro_km: e.target.value })}
                            className="form-input text-sm" />
                        </div>
                        <div>
                          <label className="form-label">🏫 Distance to School (km)</label>
                          <input type="number" placeholder="1.0" step="0.1" min="0" max="100"
                            value={newProp.dist_school_km} onChange={e => setNewProp({ ...newProp, dist_school_km: e.target.value })}
                            className="form-input text-sm" />
                        </div>
                        <div>
                          <label className="form-label">🏥 Distance to Hospital (km)</label>
                          <input type="number" placeholder="1.5" step="0.1" min="0" max="100"
                            value={newProp.dist_hospital_km} onChange={e => setNewProp({ ...newProp, dist_hospital_km: e.target.value })}
                            className="form-input text-sm" />
                        </div>
                        <div>
                          <label className="form-label">💻 Distance to IT Hub (km)</label>
                          <input type="number" placeholder="3.0" step="0.1" min="0" max="100"
                            value={newProp.dist_it_hub_km} onChange={e => setNewProp({ ...newProp, dist_it_hub_km: e.target.value })}
                            className="form-input text-sm" />
                        </div>
                      </div>
                    </>
                  )}

                  {formStep === 5 && (
                    <>
                      <div>
                        <label className="form-label mb-3">Society Amenities</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { key: 'has_gym', label: '🏋️ Gymnasium' },
                            { key: 'has_pool', label: '🏊 Swimming Pool' },
                            { key: 'has_clubhouse', label: '🏠 Clubhouse' },
                            { key: 'has_security', label: '🛡️ 24/7 Security' },
                            { key: 'has_power_backup', label: '⚡ Power Backup' },
                            { key: 'has_parking', label: '🚗 Reserved Parking' },
                            { key: 'has_lift', label: '🛗 Elevator / Lift' },
                            { key: 'rera_approved', label: '✅ RERA Verified' },
                          ].map(am => (
                            <label key={am.key}
                              className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all text-xs font-semibold ${newProp[am.key] ? 'bg-[#1F7A6C]/10 border-[#1F7A6C]/40 text-[#155E52]' : 'bg-[#F7F5F0] border-[#12283C]/10 text-[#5C6B73]'}`}>
                              <input type="checkbox" checked={newProp[am.key]} onChange={e => setNewProp({ ...newProp, [am.key]: e.target.checked })} className="accent-[#1F7A6C] w-4 h-4" />
                              {am.label}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="border-t border-[#12283C]/10 pt-5">
                        <label className="form-label mb-1">Property Photos</label>
                        {/* Hidden file input */}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={handleDeviceImageSelect}
                        />

                        <p className="text-[10px] text-[#5C6B73] mb-2 font-semibold uppercase tracking-wide">Quick Add Sample Photos:</p>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {[
                            { label: 'Apartment', url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80' },
                            { label: 'Living Room', url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80' },
                            { label: 'Villa', url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80' },
                            { label: 'Interior', url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=800&q=80' },
                            { label: 'Kitchen', url: 'https://images.unsplash.com/photo-1556909172-54557c7e4fb7?auto=format&fit=crop&w=800&q=80' },
                          ].map(sample => (
                            <button
                              key={sample.label}
                              type="button"
                              onClick={() => {
                                if (!newProp.images.includes(sample.url)) {
                                  setCreateError(null);
                                  setNewProp(prev => ({ ...prev, images: [...(prev.images || []), sample.url] }));
                                }
                              }}
                              disabled={newProp.images.includes(sample.url)}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${newProp.images.includes(sample.url) ? 'bg-[#1F7A6C]/10 border-[#1F7A6C]/30 text-[#1F7A6C] cursor-default' : 'bg-[#F7F5F0] border-[#12283C]/20 text-[#12283C] hover:border-[#B98B4E] hover:text-[#B98B4E]'}`}
                            >
                              {newProp.images.includes(sample.url) ? '✓ ' : '+ '}{sample.label}
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-[#5C6B73] mb-3">Or paste your own image URL below:</p>
                        <div className="flex gap-2 mb-3">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#12283C] hover:bg-[#1a3650] text-white text-xs font-bold border border-[#12283C] transition-all shadow-md w-full justify-center"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            📱 Upload from Device (JPG, PNG, WEBP — up to 5MB each)
                          </button>
                        </div>
                        <div className="flex gap-2 mb-4">
                          <input type="text" placeholder="https://images.unsplash.com/photo-..."
                            value={imageUrlInput} onChange={e => setImageUrlInput(e.target.value)}
                            className="form-input text-sm flex-1"
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const url = imageUrlInput.trim();
                                if (!url) return;
                                if (newProp.images.includes(url)) { setCreateError('This image URL is already added.'); return; }
                                setCreateError(null);
                                setNewProp(prev => ({ ...prev, images: [...(prev.images || []), url] }));
                                setImageUrlInput('');
                              }
                            }}
                          />
                          <button type="button"
                            onClick={() => {
                              const url = imageUrlInput.trim();
                              if (!url) { setCreateError('Please paste an image URL first.'); return; }
                              if (newProp.images.includes(url)) { setCreateError('This image URL is already added.'); return; }
                              setCreateError(null);
                              setNewProp(prev => ({ ...prev, images: [...(prev.images || []), url] }));
                              setImageUrlInput('');
                            }}
                            className="btn-primary px-4 py-2 text-xs whitespace-nowrap">
                            + Add Photo
                          </button>
                        </div>
                        {newProp.images.length > 0 ? (
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                            {newProp.images.map((url, idx) => (
                              <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-[#12283C]/10 shadow-sm">
                                <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover"
                                  onError={e => { e.target.src = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=200&q=60'; }} />
                                {/* Cover badge on first image */}
                                {idx === 0 && <span className="absolute top-1 left-1 bg-[#B98B4E] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">Cover</span>}
                                {/* Device badge on base64 images */}
                                {url.startsWith('data:') && <span className="absolute bottom-1 left-1 bg-[#1F7A6C] text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md">📱 Device</span>}
                                <button type="button"
                                  onClick={() => setNewProp(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }))}
                                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500/90 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-[#12283C]/15 rounded-xl p-6 text-center text-[#5C6B73]">
                            <Image className="w-8 h-8 mx-auto mb-2 text-[#12283C]/20" />
                            <p className="text-xs font-medium">No photos added yet.</p>
                            <p className="text-[10px] mt-1">A default property image will be applied automatically.</p>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                </div>
                <div className="px-8 py-5 bg-[#F7F5F0] border-t border-[#12283C]/10 flex items-center justify-between gap-3">
                  {formStep > 1 ? (
                    <button type="button" onClick={() => { setCreateError(null); setFormStep(formStep - 1); }}
                      className="btn-secondary py-2.5 px-5 text-sm flex items-center gap-2">
                      <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                  ) : (
                    <button type="button" onClick={() => { setShowAddModal(false); setFormStep(1); setCreateError(null); setImageUrlInput(''); }}
                      className="btn-secondary py-2.5 px-5 text-sm">Cancel</button>
                  )}
                  {formStep < FORM_STEPS ? (
                    <button type="button"
                      onClick={() => {
                        setCreateError(null);
                        if (formStep === 1 && (!newProp.title || newProp.title.trim().length < 5)) {
                          setCreateError('Property title must be at least 5 characters.'); return;
                        }
                        if (formStep === 2 && !newProp.locality) {
                          setCreateError('Please select a locality before proceeding.'); return;
                        }
                        setFormStep(formStep + 1);
                      }}
                      className="btn-primary py-2.5 px-6 text-sm flex items-center gap-2 ml-auto">
                      Next Step <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button type="submit" disabled={submittingProp}
                      className="btn-brass py-2.5 px-6 text-sm flex items-center gap-2 ml-auto">
                      {submittingProp
                        ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Publishing...</>
                        : <><CheckCircle className="w-4 h-4" /> Publish &amp; Calculate ML Price</>}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ═══════════════ EDIT PROPERTY MODAL — Full Field Form ═══════════════ */}
        {showEditModal && (
          <div className="fixed inset-0 z-50 bg-[#12283C]/85 backdrop-blur-md flex items-start justify-center p-4 overflow-y-auto">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl my-8 overflow-hidden">
              <div className="bg-[#12283C] px-8 py-6 flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#B98B4E] mb-1">Editing Listing</p>
                  <h2 className="font-serif text-2xl font-semibold text-white">Update Property Details</h2>
                </div>
                <button type="button" onClick={() => { setShowEditModal(false); setCreateError(null); }}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {createError && (
                <div className="mx-8 mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {createError}
                </div>
              )}
              <form onSubmit={handleSaveEdit}>
                <div className="px-8 py-6 space-y-5 max-h-[70vh] overflow-y-auto">
                  <div>
                    <label className="form-label">Property Title <span className="text-red-500">*</span></label>
                    <input type="text" value={newProp.title} onChange={e => setNewProp({ ...newProp, title: e.target.value })} className="form-input text-sm" required />
                  </div>
                  <div>
                    <label className="form-label">Description</label>
                    <textarea rows="2" value={newProp.description || ''} onChange={e => setNewProp({ ...newProp, description: e.target.value })} className="form-input text-sm resize-none" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="form-label">Property Type</label>
                      <select value={newProp.property_type} onChange={e => setNewProp({ ...newProp, property_type: e.target.value })} className="form-select text-sm">
                        <option value="Apartment">Apartment</option>
                        <option value="Independent House">Independent House</option>
                        <option value="Villa">Villa</option>
                        <option value="Penthouse">Penthouse</option>
                        <option value="Studio">Studio</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Status</label>
                      <select value={newProp.status || 'for_sale'} onChange={e => setNewProp({ ...newProp, status: e.target.value })} className="form-select text-sm">
                        <option value="for_sale">For Sale</option>
                        <option value="for_rent">For Rent</option>
                        <option value="available">Available</option>
                        <option value="sold">Sold</option>
                        <option value="rented">Rented</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Furnishing</label>
                      <select value={newProp.furnishing} onChange={e => setNewProp({ ...newProp, furnishing: e.target.value })} className="form-select text-sm">
                        <option value="Unfurnished">Unfurnished</option>
                        <option value="Semi-Furnished">Semi-Furnished</option>
                        <option value="Fully-Furnished">Fully-Furnished</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Project / Society Name</label>
                      <input type="text" placeholder="e.g. Lodha Altamount" value={newProp.project_name || ''} onChange={e => setNewProp({ ...newProp, project_name: e.target.value })} className="form-input text-sm" />
                    </div>
                    <div>
                      <label className="form-label">Developer / Builder</label>
                      <input type="text" placeholder="e.g. Lodha Group" value={newProp.developer || ''} onChange={e => setNewProp({ ...newProp, developer: e.target.value })} className="form-input text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">City</label>
                      <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#F7F5F0] border border-[#12283C]/12 rounded-xl text-sm font-semibold text-[#12283C]">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-[#B98B4E]" /> Mumbai
                        </span>
                        <span className="text-[10px] bg-[#1F7A6C]/15 text-[#155E52] px-2 py-0.5 rounded-full font-bold uppercase">Active</span>
                      </div>
                    </div>
                    <div>
                      <label className="form-label">Locality <span className="text-red-500">*</span></label>
                      <input type="text" placeholder="Worli / Bandra / Andheri" value={newProp.locality} onChange={e => setNewProp({ ...newProp, locality: e.target.value })} className="form-input text-sm" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className="form-label">BHK <span className="text-red-500">*</span></label>
                      <input type="number" min="1" max="20" value={newProp.bhk} onChange={e => setNewProp({ ...newProp, bhk: e.target.value })} className="form-input text-sm" required />
                    </div>
                    <div>
                      <label className="form-label">Bathrooms</label>
                      <input type="number" min="1" max="20" value={newProp.bathroom || ''} onChange={e => setNewProp({ ...newProp, bathroom: e.target.value })} className="form-input text-sm" />
                    </div>
                    <div>
                      <label className="form-label">Area (sqft)</label>
                      <input type="number" min="100" max="50000" value={newProp.area_sqft} onChange={e => setNewProp({ ...newProp, area_sqft: e.target.value })} className="form-input text-sm" required />
                    </div>
                    <div>
                      <label className="form-label">Price (₹)</label>
                      <input type="number" min="100000" value={newProp.listed_price} onChange={e => setNewProp({ ...newProp, listed_price: e.target.value })} className="form-input text-sm" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="form-label">Floor No.</label>
                      <input type="number" min="0" value={newProp.floor} onChange={e => setNewProp({ ...newProp, floor: e.target.value })} className="form-input text-sm" />
                    </div>
                    <div>
                      <label className="form-label">Total Floors</label>
                      <input type="number" min="1" max="200" value={newProp.total_floors} onChange={e => setNewProp({ ...newProp, total_floors: e.target.value })} className="form-input text-sm" />
                    </div>
                    <div>
                      <label className="form-label">Age (Yrs)</label>
                      <input type="number" min="0" max="150" value={newProp.age_years} onChange={e => setNewProp({ ...newProp, age_years: e.target.value })} className="form-input text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="form-label mb-2">Amenities</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { key: 'has_gym', label: '🏋️ Gym' },
                        { key: 'has_pool', label: '🏊 Pool' },
                        { key: 'has_clubhouse', label: '🏠 Clubhouse' },
                        { key: 'has_security', label: '🛡️ Security' },
                        { key: 'has_power_backup', label: '⚡ Power Backup' },
                        { key: 'has_parking', label: '🚗 Parking' },
                        { key: 'has_lift', label: '🛗 Lift' },
                        { key: 'rera_approved', label: '✅ RERA' },
                      ].map(am => (
                        <label key={am.key}
                          className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-all text-xs font-semibold ${newProp[am.key] ? 'bg-[#1F7A6C]/10 border-[#1F7A6C]/40 text-[#155E52]' : 'bg-[#F7F5F0] border-[#12283C]/10 text-[#5C6B73]'}`}>
                          <input type="checkbox" checked={!!newProp[am.key]} onChange={e => setNewProp({ ...newProp, [am.key]: e.target.checked })} className="accent-[#1F7A6C] w-4 h-4" />
                          {am.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="px-8 py-5 bg-[#F7F5F0] border-t border-[#12283C]/10 flex gap-3 justify-end">
                  <button type="button" onClick={() => { setShowEditModal(false); setCreateError(null); }} className="btn-secondary py-2.5 px-5 text-sm">Cancel</button>
                  <button type="submit" disabled={submittingProp} className="btn-brass py-2.5 px-6 text-sm flex items-center gap-2">
                    {submittingProp
                      ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Updating...</>
                      : <><Check className="w-4 h-4" /> Save &amp; Update Listing</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}




        {/* Maintenance Request Modal */}
        {showMaintModal && (
          <div className="fixed inset-0 z-50 bg-[#12283C]/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="glass-card max-w-md w-full p-8 bg-white rounded-3xl">
              <h2 className="font-serif text-2xl font-semibold text-[#12283C] mb-4">Submit Maintenance Request</h2>

              <form onSubmit={handleCreateMaintenance} className="space-y-4">
                <div>
                  <label className="form-label">Issue Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Master Bedroom AC Servicing"
                    value={newMaint.title}
                    onChange={(e) => setNewMaint({ ...newMaint, title: e.target.value })}
                    className="form-input text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Priority Level</label>
                  <select
                    value={newMaint.priority}
                    onChange={(e) => setNewMaint({ ...newMaint, priority: e.target.value })}
                    className="form-select text-sm"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Detailed Description</label>
                  <textarea
                    rows="3"
                    placeholder="Describe the maintenance issue..."
                    value={newMaint.description}
                    onChange={(e) => setNewMaint({ ...newMaint, description: e.target.value })}
                    className="form-input text-sm"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="submit" disabled={submittingMaint} className="btn-brass flex-1 justify-center py-3 text-sm">
                    <Send className="w-4 h-4" /> {submittingMaint ? 'Submitting Request...' : 'Submit Request'}
                  </button>
                  <button type="button" onClick={() => setShowMaintModal(false)} className="btn-secondary py-3 text-sm">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Investment Creation Modal */}
        {showAddInvestmentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <div className="glass-card max-w-lg w-full p-6 bg-white rounded-3xl my-8 shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#12283C]/10 pb-4 mb-6">
                <div>
                  <h2 className="font-serif text-2xl font-semibold text-[#12283C]">List Property for Investment</h2>
                  <p className="text-xs text-[#5C6B73] mt-0.5">Register fractional / commercial investment metrics</p>
                </div>
                <button onClick={() => setShowAddInvestmentModal(false)} className="p-2 rounded-xl text-[#5C6B73] hover:bg-[#F7F5F0]">
                  ✕
                </button>
              </div>

              {investmentSuccess ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-[#1F7A6C] mx-auto mb-3" />
                  <h3 className="font-serif text-xl font-bold text-[#12283C]">Investment Listing Created!</h3>
                  <p className="text-xs text-[#5C6B73] mt-1">Redirecting to investment directory...</p>
                </div>
              ) : (
                <form onSubmit={handleCreateInvestment} className="space-y-4">
                  {investmentError && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 text-xs font-semibold">
                      {investmentError}
                    </div>
                  )}

                  <div>
                    <label className="form-label">Select Owned Property</label>
                    <select
                      value={newInvestment.property}
                      onChange={(e) => setNewInvestment({ ...newInvestment, property: e.target.value })}
                      className="form-select text-sm"
                      required
                    >
                      <option value="">-- Choose a Listed Property --</option>
                      {myListings.map((p) => (
                        <option key={p.id} value={p.id}>
                          #{p.id} - {p.title} ({p.city})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Asset Class</label>
                      <select
                        value={newInvestment.asset_class}
                        onChange={(e) => setNewInvestment({ ...newInvestment, asset_class: e.target.value })}
                        className="form-select text-sm"
                      >
                        <option value="Commercial Office">Commercial Office</option>
                        <option value="Warehousing">Warehousing</option>
                        <option value="Pre-Launch Residential">Pre-Launch Residential</option>
                        <option value="Retail">Retail</option>
                      </select>
                    </div>

                    <div>
                      <label className="form-label">Payout Frequency</label>
                      <select
                        value={newInvestment.payout_frequency}
                        onChange={(e) => setNewInvestment({ ...newInvestment, payout_frequency: e.target.value })}
                        className="form-select text-sm"
                      >
                        <option value="Monthly">Monthly</option>
                        <option value="Quarterly">Quarterly</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Expected ROI (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="e.g. 14.50"
                        value={newInvestment.expected_roi_percentage}
                        onChange={(e) => setNewInvestment({ ...newInvestment, expected_roi_percentage: e.target.value })}
                        className="form-input text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label className="form-label">Projected Yield (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="e.g. 8.20"
                        value={newInvestment.projected_rental_yield}
                        onChange={(e) => setNewInvestment({ ...newInvestment, projected_rental_yield: e.target.value })}
                        className="form-input text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Min Ticket Size (₹)</label>
                      <input
                        type="number"
                        placeholder="e.g. 2500000 (₹25L)"
                        value={newInvestment.min_investment_amount}
                        onChange={(e) => setNewInvestment({ ...newInvestment, min_investment_amount: e.target.value })}
                        className="form-input text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label className="form-label">Lock-in Period (Months)</label>
                      <input
                        type="number"
                        placeholder="e.g. 36"
                        value={newInvestment.lock_in_period_min_months}
                        onChange={(e) => setNewInvestment({
                          ...newInvestment,
                          lock_in_period_min_months: e.target.value,
                          lock_in_period_max_months: e.target.value
                        })}
                        className="form-input text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="form-label">Regulatory Disclaimer</label>
                    <textarea
                      rows="2"
                      value={newInvestment.disclaimer_text}
                      onChange={(e) => setNewInvestment({ ...newInvestment, disclaimer_text: e.target.value })}
                      className="form-input text-xs"
                      required
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button type="submit" disabled={submittingInvestment} className="btn-brass flex-1 justify-center py-3 text-sm">
                      <Send className="w-4 h-4" /> {submittingInvestment ? 'Creating Listing...' : 'Publish Investment Listing'}
                    </button>
                    <button type="button" onClick={() => setShowAddInvestmentModal(false)} className="btn-secondary py-3 text-sm">
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Dashboard;
