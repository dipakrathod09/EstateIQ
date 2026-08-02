import React, { useState } from 'react';
import { X, Send, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';
import { submitInvestmentInquiry } from '../api/investments';
import { useAuth } from '../context/AuthContext';

const RANGE_OPTIONS = [
  { value: '10L-25L', label: '₹10L – ₹25L' },
  { value: '25L-50L', label: '₹25L – ₹50L' },
  { value: '50L-1Cr', label: '₹50L – ₹1Cr' },
  { value: '1Cr+',   label: '₹1Cr+' },
];

const InvestmentInquiryModal = ({ listing, requestingPitchDeck = false, onClose }) => {
  const { user } = useAuth();
  const [form, setForm] = useState({
    investor_name: user ? (user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user.username) : '',
    phone: '',
    email: user?.email || '',
    preferred_investment_range: '25L-50L',
    requested_pitch_deck: requestingPitchDeck,
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.investor_name.trim()) e.investor_name = 'Name is required';
    if (!form.phone.trim()) e.phone = 'Phone is required';
    else if (!/^\+?[\d\s\-()]{10,15}$/.test(form.phone.trim())) e.phone = 'Enter a valid phone number';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.preferred_investment_range) e.preferred_investment_range = 'Please select a range';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setSubmitting(true);
    setErrors({});
    try {
      const payload = {
        ...form,
        investor_name: form.investor_name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
      };
      await submitInvestmentInquiry(listing.id, payload);
      setSuccess(true);
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === 'object') setErrors(data);
      else setErrors({ __all__: 'Something went wrong. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => { const n = { ...e }; delete n[field]; return n; });
  };

  // Prevent background scroll while modal open
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(18,40,60,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="glass-card-dark w-full max-w-lg mx-auto rounded-2xl overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/10">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-[#B98B4E]" />
                <span className="text-xs font-bold uppercase tracking-widest text-[#B98B4E]">
                  {requestingPitchDeck ? 'Request Pitch Deck' : 'Express Interest'}
                </span>
              </div>
              <h2 className="font-serif text-xl font-semibold text-white">
                {listing.property_details?.title || listing.asset_class}
              </h2>
              <p className="text-sm text-white/60 mt-0.5">{listing.asset_class} • {listing.expected_roi_percentage}% Expected ROI</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 hover:text-white flex items-center justify-center transition-all flex-shrink-0 ml-4"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-[#1F7A6C]/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-[#1F7A6C]" />
              </div>
              <h3 className="font-serif text-xl font-semibold text-white mb-2">Inquiry Received</h3>
              <p className="text-white/70 text-sm leading-relaxed max-w-sm mx-auto">
                {listing.is_sample_data !== false ? (
                  <>Thanks for your interest — we&apos;ll notify you when real opportunities matching your preferences become available.</>
                ) : (
                  <>An investment manager will review your inquiry and contact you within <strong className="text-white">2 business days</strong> to discuss this opportunity in detail.</>
                )}
              </p>
              <button onClick={onClose} className="btn-brass mt-6 mx-auto">
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              {errors.__all__ && (
                <div className="flex items-center gap-2 bg-[#E2574C]/20 border border-[#E2574C]/40 text-[#E2574C] text-sm px-4 py-3 rounded-xl mb-4">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {errors.__all__}
                </div>
              )}

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="form-label text-white/60">Full Name</label>
                  <input
                    id="inquiry-name"
                    type="text"
                    value={form.investor_name}
                    onChange={e => handleChange('investor_name', e.target.value)}
                    placeholder="Rahul Mehta"
                    className={`form-input bg-white/10 border-white/20 text-white placeholder-white/30 focus:border-[#B98B4E] ${errors.investor_name ? 'border-[#E2574C]' : ''}`}
                  />
                  {errors.investor_name && <p className="text-[#E2574C] text-xs mt-1">{errors.investor_name}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Phone */}
                  <div>
                    <label className="form-label text-white/60">Phone</label>
                    <input
                      id="inquiry-phone"
                      type="tel"
                      value={form.phone}
                      onChange={e => handleChange('phone', e.target.value)}
                      placeholder="98765 43210"
                      className={`form-input bg-white/10 border-white/20 text-white placeholder-white/30 focus:border-[#B98B4E] ${errors.phone ? 'border-[#E2574C]' : ''}`}
                    />
                    {errors.phone && <p className="text-[#E2574C] text-xs mt-1">{errors.phone}</p>}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="form-label text-white/60">Email</label>
                    <input
                      id="inquiry-email"
                      type="email"
                      value={form.email}
                      onChange={e => handleChange('email', e.target.value)}
                      placeholder="you@email.com"
                      className={`form-input bg-white/10 border-white/20 text-white placeholder-white/30 focus:border-[#B98B4E] ${errors.email ? 'border-[#E2574C]' : ''}`}
                    />
                    {errors.email && <p className="text-[#E2574C] text-xs mt-1">{errors.email}</p>}
                  </div>
                </div>

                {/* Investment Range */}
                <div>
                  <label className="form-label text-white/60">Preferred Investment Range</label>
                  <div className="grid grid-cols-2 gap-2">
                    {RANGE_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleChange('preferred_investment_range', opt.value)}
                        className={`py-2.5 px-3 rounded-xl text-sm font-semibold border transition-all ${
                          form.preferred_investment_range === opt.value
                            ? 'bg-[#B98B4E] border-[#B98B4E] text-white'
                            : 'bg-white/10 border-white/20 text-white/70 hover:bg-white/20'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {errors.preferred_investment_range && (
                    <p className="text-[#E2574C] text-xs mt-1">{errors.preferred_investment_range}</p>
                  )}
                </div>
              </div>

              <p className="text-white/40 text-[11px] mt-4 leading-relaxed">
                By submitting, you consent to being contacted by an investment manager. 
                This is a lead-generation inquiry only — no funds are committed at this stage.
              </p>

              <button
                id="inquiry-submit"
                type="submit"
                disabled={submitting}
                className="btn-brass w-full mt-4 justify-center"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Submitting...
                  </span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    {requestingPitchDeck ? 'Request Pitch Deck' : 'Express Interest'}
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvestmentInquiryModal;
