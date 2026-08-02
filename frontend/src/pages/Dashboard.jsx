import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import PropertyCard from '../components/PropertyCard';
import DealBadge from '../components/DealBadge';
import { 
  PlusCircle, Building2, MessageSquare, Bookmark, FileText, Wrench, Shield, 
  TrendingDown, CheckCircle, LogIn, CreditCard, AlertCircle, Clock, Check, Send, Sparkles
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
    title: '',
    description: '',
    city: 'Ahmedabad',
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
    listed_price: '',
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
    rera_approved: true
  };

  const [showAddModal, setShowAddModal] = useState(false);
  const [newProp, setNewProp] = useState(initialPropState);
  const [submittingProp, setSubmittingProp] = useState(false);
  const [createError, setCreateError] = useState(null);

  // Maintenance Modal State
  const [showMaintModal, setShowMaintModal] = useState(false);
  const [newMaint, setNewMaint] = useState({
    property: '',
    title: '',
    description: '',
    priority: 'medium'
  });
  const [submittingMaint, setSubmittingMaint] = useState(false);

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
        .then(res => setGoodDeals(res.data || []))
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

    client.post('/properties/', payload)
      .then(() => {
        setShowAddModal(false);
        setCreateError(null);
        setNewProp(initialPropState);
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
      city: prop.city || 'Ahmedabad',
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
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-brass"
              >
                <PlusCircle className="w-5 h-5" /> Add New Property Listing
              </button>
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

        {/* Add Property Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-[#12283C]/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="glass-card max-w-xl w-full max-h-[90vh] overflow-y-auto p-8 bg-white rounded-3xl">
              <h2 className="font-serif text-2xl font-semibold text-[#12283C] mb-4">Add New Property Listing</h2>

              {createError && (
                <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 text-xs font-semibold">
                  {createError}
                </div>
              )}

              <form onSubmit={handleCreateProperty} className="space-y-4">
                <div>
                  <label className="form-label">Property Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Luxury 3 BHK Flat in Bodakdev"
                    value={newProp.title}
                    onChange={(e) => setNewProp({ ...newProp, title: e.target.value })}
                    className="form-input text-sm"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">City</label>
                    <select
                      value={newProp.city}
                      onChange={(e) => setNewProp({ ...newProp, city: e.target.value })}
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
                      placeholder="Bodakdev / Worli"
                      value={newProp.locality}
                      onChange={(e) => setNewProp({ ...newProp, locality: e.target.value })}
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
                      placeholder="3"
                      value={newProp.bhk}
                      onChange={(e) => setNewProp({ ...newProp, bhk: e.target.value })}
                      className="form-input text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Area (sqft)</label>
                    <input
                      type="number"
                      placeholder="1500"
                      value={newProp.area_sqft}
                      onChange={(e) => setNewProp({ ...newProp, area_sqft: e.target.value })}
                      className="form-input text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Price (₹)</label>
                    <input
                      type="number"
                      placeholder="12500000"
                      value={newProp.listed_price}
                      onChange={(e) => setNewProp({ ...newProp, listed_price: e.target.value })}
                      className="form-input text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="submit" disabled={submittingProp} className="btn-primary flex-1 justify-center py-3 text-sm">
                    {submittingProp ? 'Calculating ML Pricing...' : 'Publish Listing & Calculate ML Price'}
                  </button>
                  <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary py-3 text-sm">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Property Modal */}
        {showEditModal && (
          <div className="fixed inset-0 z-50 bg-[#12283C]/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="glass-card max-w-xl w-full max-h-[90vh] overflow-y-auto p-8 bg-white rounded-3xl">
              <h2 className="font-serif text-2xl font-semibold text-[#12283C] mb-4">Edit Property Listing</h2>

              {createError && (
                <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 text-xs font-semibold">
                  {createError}
                </div>
              )}

              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label className="form-label">Property Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Luxury 3 BHK Flat in Bodakdev"
                    value={newProp.title}
                    onChange={(e) => setNewProp({ ...newProp, title: e.target.value })}
                    className="form-input text-sm"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">City</label>
                    <select
                      value={newProp.city}
                      onChange={(e) => setNewProp({ ...newProp, city: e.target.value })}
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
                      placeholder="Bodakdev / Worli"
                      value={newProp.locality}
                      onChange={(e) => setNewProp({ ...newProp, locality: e.target.value })}
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
                      placeholder="3"
                      value={newProp.bhk}
                      onChange={(e) => setNewProp({ ...newProp, bhk: e.target.value })}
                      className="form-input text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Area (sqft)</label>
                    <input
                      type="number"
                      placeholder="1500"
                      value={newProp.area_sqft}
                      onChange={(e) => setNewProp({ ...newProp, area_sqft: e.target.value })}
                      className="form-input text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Asking Price (₹)</label>
                    <input
                      type="number"
                      placeholder="12500000"
                      value={newProp.listed_price}
                      onChange={(e) => setNewProp({ ...newProp, listed_price: e.target.value })}
                      className="form-input text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="submit" disabled={submittingProp} className="btn-brass flex-1 justify-center py-3 text-sm">
                    {submittingProp ? 'Recalculating ML Pricing...' : 'Save & Update Listing'}
                  </button>
                  <button type="button" onClick={() => setShowEditModal(false)} className="btn-secondary py-3 text-sm">
                    Cancel
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

      </div>
    </div>
  );
};

export default Dashboard;
