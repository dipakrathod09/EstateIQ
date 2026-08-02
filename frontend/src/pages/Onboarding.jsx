/**
 * Onboarding.jsx — Onboarding Preference Wizard
 *
 * Implements the skippable onboarding step post-registration:
 * Asks preferred city, intent (Buy/Rent/Invest), and BHK configuration.
 * Saves to backend PATCH /api/auth/preferences/.
 */
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sparkles, MapPin, Building, ArrowRight, CheckCircle2 } from 'lucide-react';

const CITIES = [
  { name: 'Mumbai', active: true },
  { name: 'Delhi NCR', active: false },
  { name: 'Bangalore', active: false },
  { name: 'Hyderabad', active: false },
  { name: 'Ahmedabad', active: false },
];
const INTENTS = [
  { id: 'Buy', label: '🏠 Buy a Home', desc: 'Looking to purchase residential property' },
  { id: 'Rent', label: '🔑 Rent a Home', desc: 'Looking for rental apartments or villas' },
  { id: 'Invest', label: '📈 Invest & Earn', desc: 'Looking for high-yield real estate assets' },
];
const BHK_OPTIONS = ['1', '2', '3', '4+'];

const Onboarding = () => {
  const { user, updatePreferences } = useAuth();
  const navigate = useNavigate();

  const [preferredCity, setPreferredCity] = useState('Mumbai');
  const [intent, setIntent] = useState(user?.preference?.intent || 'Buy');
  const [preferredBhk, setPreferredBhk] = useState(user?.preference?.preferred_bhk || '2');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (updatePreferences) {
        await updatePreferences({
          preferred_city: preferredCity,
          intent: intent,
          preferred_bhk: preferredBhk,
        });
      }
      navigate('/properties');
    } catch (err) {
      console.error('Failed to save preferences', err);
      // Navigate anyway so flow is non-blocking
      navigate('/properties');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    navigate('/properties');
  };

  return (
    <div className="bg-[#F7F5F0] min-h-screen py-12 flex items-center justify-center px-4">
      <div className="max-w-xl w-full glass-card p-8 bg-white border border-[#12283C]/10 rounded-3xl shadow-xl">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#B98B4E]/15 text-[#B98B4E] mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Personalized Experience
          </div>
          <h1 className="font-serif text-3xl font-semibold text-[#12283C]">
            Set Your Property Preferences
          </h1>
          <p className="text-xs text-[#5C6B73] mt-1.5">
            We will customize your default search filters based on your goals. You can change these anytime.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* 1. Preferred City */}
          <div>
            <label className="form-label text-xs">Preferred Metro City</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CITIES.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => c.active && setPreferredCity(c.name)}
                  disabled={!c.active}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    preferredCity === c.name
                      ? 'bg-[#12283C] text-white border-[#12283C] shadow-sm'
                      : c.active
                      ? 'bg-[#F7F5F0] text-[#12283C] border-[#12283C]/12 hover:border-[#B98B4E]'
                      : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60'
                  }`}
                >
                  <MapPin className={`w-3.5 h-3.5 ${preferredCity === c.name ? 'text-[#B98B4E]' : 'text-[#5C6B73]'}`} />
                  {c.name}{!c.active ? ' (Soon)' : ''}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Primary Intent */}
          <div>
            <label className="form-label text-xs">Primary Property Goal</label>
            <div className="space-y-2">
              {INTENTS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setIntent(item.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                    intent === item.id
                      ? 'bg-[#12283C] text-white border-[#12283C] shadow-sm'
                      : 'bg-white text-[#12283C] border-[#12283C]/12 hover:border-[#B98B4E]'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold">{item.label}</div>
                    <div className={`text-[11px] mt-0.5 ${intent === item.id ? 'text-[#F7F5F0]/80' : 'text-[#5C6B73]'}`}>
                      {item.desc}
                    </div>
                  </div>
                  {intent === item.id && (
                    <CheckCircle2 className="w-4 h-4 text-[#B98B4E] shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Preferred BHK */}
          <div>
            <label className="form-label text-xs">Preferred BHK Layout</label>
            <div className="grid grid-cols-4 gap-2">
              {BHK_OPTIONS.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setPreferredBhk(val)}
                  className={`py-2.5 text-xs font-bold rounded-xl border transition-all ${
                    preferredBhk === val
                      ? 'bg-[#B98B4E] text-white border-[#B98B4E] shadow-sm'
                      : 'bg-[#F7F5F0] text-[#12283C] border-[#12283C]/12 hover:border-[#B98B4E]'
                  }`}
                >
                  {val} BHK
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-[#12283C]/10 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={handleSkip}
              className="text-xs text-[#5C6B73] font-semibold hover:text-[#12283C] transition-colors"
            >
              Skip for now
            </button>

            <button
              type="submit"
              disabled={saving}
              className="btn-brass py-3 px-6 text-xs rounded-xl"
            >
              {saving ? 'Saving...' : 'Save & View Properties'} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Onboarding;
