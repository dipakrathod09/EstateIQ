import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, TrendingUp, Percent, Lock, Banknote, Clock, Calendar,
  Building2, MapPin, AlertTriangle, ChevronRight, Users, FileText,
} from 'lucide-react';
import { getInvestmentListing } from '../api/investments';
import InvestmentInquiryModal from '../components/InvestmentInquiryModal';

const ASSET_CLASS_CONFIG = {
  'Commercial Office':      { color: '#1F7A6C', bg: 'rgba(31,122,108,0.1)', icon: '🏢' },
  'Warehousing':            { color: '#5C6B73', bg: 'rgba(92,107,115,0.1)', icon: '🏭' },
  'Pre-Launch Residential': { color: '#B98B4E', bg: 'rgba(185,139,78,0.1)', icon: '🏗️' },
  'Retail':                 { color: '#12283C', bg: 'rgba(18,40,60,0.08)', icon: '🏪' },
};

function useCountdown(targetIso) {
  const [timeLeft, setTimeLeft] = useState(null);
  const ref = useRef(null);
  useEffect(() => {
    if (!targetIso) return;
    const target = new Date(targetIso).getTime();
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
        clearInterval(ref.current);
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
        expired: false,
      });
    };
    tick();
    ref.current = setInterval(tick, 1000);
    return () => clearInterval(ref.current);
  }, [targetIso]);
  return timeLeft;
}

const MetricTile = ({ icon: Icon, label, value, accent }) => (
  <div className="glass-card p-5 flex flex-col">
    <div className="flex items-center gap-2 mb-2">
      <Icon className="w-4 h-4" style={{ color: accent || '#B98B4E' }} />
      <span className="text-[10px] font-bold uppercase tracking-widest text-[#5C6B73]">{label}</span>
    </div>
    <span className="data-mono text-2xl font-bold text-[#12283C]">{value}</span>
  </div>
);

const InvestmentYieldCalculator = ({ minAmount, roiPct, yieldPct }) => {
  const defaultAmt = minAmount || 1500000;
  const [calcAmt, setCalcAmt] = useState(defaultAmt);

  const annualRental = (calcAmt * (yieldPct || 5.0)) / 100;
  const monthlyRental = annualRental / 12;
  const annualTotalReturn = (calcAmt * (roiPct || 12.0)) / 100;
  const projected3YearValue = calcAmt * Math.pow(1 + (roiPct || 12.0) / 100, 3);

  const formatLakhs = (val) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
    return `₹${Math.round(val).toLocaleString('en-IN')}`;
  };

  return (
    <div className="glass-card p-6 bg-white border border-[#12283C]/10 rounded-2xl shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#B98B4E] block mb-0.5">Interactive Estimator</span>
          <h3 className="font-serif text-lg font-semibold text-[#12283C]">Investment Return Calculator</h3>
        </div>
        <span className="text-xs font-mono font-bold text-[#1F7A6C] bg-[#1F7A6C]/10 px-2.5 py-1 rounded-full">
          {roiPct}% Projected ROI
        </span>
      </div>

      <div>
        <div className="flex justify-between items-center text-xs font-medium text-[#5C6B73] mb-2">
          <span>Selected Ticket Size:</span>
          <span className="font-mono font-bold text-[#12283C] text-sm">{formatLakhs(calcAmt)}</span>
        </div>
        <input
          type="range"
          min={defaultAmt}
          max={defaultAmt * 10}
          step={50000}
          value={calcAmt}
          onChange={(e) => setCalcAmt(Number(e.target.value))}
          className="w-full h-2 bg-[#F7F5F0] rounded-lg appearance-none cursor-pointer accent-[#B98B4E]"
        />
        <div className="flex justify-between text-[10px] text-[#5C6B73] mt-1">
          <span>Min Ticket: {formatLakhs(defaultAmt)}</span>
          <span>Max Target: {formatLakhs(defaultAmt * 10)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#12283C]/08 text-center">
        <div className="p-3 bg-[#F7F5F0] rounded-xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#5C6B73] block mb-1">Est. Monthly Payout</span>
          <span className="data-mono text-base font-bold text-[#1F7A6C]">{formatLakhs(monthlyRental)}</span>
        </div>
        <div className="p-3 bg-[#F7F5F0] rounded-xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#5C6B73] block mb-1">Est. Annual Return</span>
          <span className="data-mono text-base font-bold text-[#B98B4E]">{formatLakhs(annualTotalReturn)}</span>
        </div>
        <div className="p-3 bg-[#F7F5F0] rounded-xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#5C6B73] block mb-1">Projected 3-Yr Value</span>
          <span className="data-mono text-base font-bold text-[#12283C]">{formatLakhs(projected3YearValue)}</span>
        </div>
      </div>
    </div>
  );
};

const InvestmentDetail = () => {
  const { id } = useParams();
  const [listing, setListing]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [modalOpen, setModalOpen]       = useState(false);
  const [pitchDeck, setPitchDeck]       = useState(false);

  const countdown = useCountdown(
    listing?.is_pre_launch ? listing.early_access_ends_at : null
  );

  useEffect(() => {
    setLoading(true);
    getInvestmentListing(id)
      .then(r => setListing(r.data))
      .catch(() => setError('Investment listing not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  const openModal = (isPitchDeck) => {
    setPitchDeck(isPitchDeck);
    setModalOpen(true);
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="glass-card h-96 animate-pulse" />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-24 text-center">
        <p className="text-[#E2574C] font-medium mb-4">{error || 'Listing not found.'}</p>
        <Link to="/investments" className="btn-primary">Back to Investments</Link>
      </div>
    );
  }

  const config = ASSET_CLASS_CONFIG[listing.asset_class] || ASSET_CLASS_CONFIG['Retail'];
  const prop = listing.property_details;
  const defaultImage = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80';
  const heroImage = prop?.images?.[0] || prop?.gallery?.[0]?.image || defaultImage;

  return (
    <>
      <div className="min-h-screen" style={{ background: '#F7F5F0' }}>

        {/* Back Nav */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
          <Link to="/investments" className="inline-flex items-center gap-2 text-sm font-medium text-[#5C6B73] hover:text-[#12283C] transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Investments
          </Link>
        </div>

        {/* Hero */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <div className="relative rounded-2xl overflow-hidden aspect-[21/9] shadow-xl">
            <img src={heroImage} alt={prop?.title} className="w-full h-full object-cover" onError={e => { e.target.src = defaultImage; }} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#12283C]/90 via-[#12283C]/30 to-transparent" />

            {/* Pre-launch countdown overlay */}
            {listing.is_pre_launch && countdown && !countdown.expired && (
              <div className="absolute top-4 right-4 bg-[#E2574C]/90 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-xl">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1 opacity-80 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" /> Early Access Closes In
                </p>
                <div className="flex items-center gap-2 data-mono">
                  {countdown.days > 0 && (
                    <div className="text-center"><div className="text-2xl font-bold">{countdown.days}</div><div className="text-[9px] uppercase opacity-70">days</div></div>
                  )}
                  <div className="text-center"><div className="text-2xl font-bold">{String(countdown.hours).padStart(2,'0')}</div><div className="text-[9px] uppercase opacity-70">hrs</div></div>
                  <div className="text-lg font-bold opacity-50">:</div>
                  <div className="text-center"><div className="text-2xl font-bold">{String(countdown.minutes).padStart(2,'0')}</div><div className="text-[9px] uppercase opacity-70">min</div></div>
                  <div className="text-lg font-bold opacity-50">:</div>
                  <div className="text-center"><div className="text-2xl font-bold tabular-nums">{String(countdown.seconds).padStart(2,'0')}</div><div className="text-[9px] uppercase opacity-70">sec</div></div>
                </div>
              </div>
            )}

            {/* Bottom left overlay */}
            <div className="absolute bottom-6 left-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold px-3 py-1.5 rounded-xl" style={{ background: config.bg, color: config.color, border: `1px solid ${config.color}40` }}>
                  {config.icon} {listing.asset_class}
                </span>
                {listing.is_pre_launch && (
                  <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-[#E2574C]/80 text-white">
                    Pre-Launch
                  </span>
                )}
              </div>
              <h1 className="font-serif text-3xl md:text-4xl font-bold text-white mb-1 drop-shadow">
                {prop?.title || listing.asset_class}
              </h1>
              {prop && (
                <p className="text-white/70 flex items-center gap-1.5 text-sm">
                  <MapPin className="w-3.5 h-3.5 text-[#B98B4E]" />
                  {prop.locality && `${prop.locality}, `}{prop.city}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── 2-column layout ── */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
          <div className="flex flex-col lg:flex-row gap-8">

            {/* LEFT: Metrics + Details */}
            <div className="flex-1 min-w-0 space-y-6">

              {/* 4 Metric Tiles */}
              <div className="grid grid-cols-2 gap-4">
                <MetricTile icon={TrendingUp} label="Expected ROI" value={`${listing.expected_roi_percentage}%`} accent="#1F7A6C" />
                <MetricTile icon={Percent}    label="Rental Yield" value={`${listing.projected_rental_yield}%`} accent="#B98B4E" />
                <MetricTile icon={Banknote}   label="Min Ticket"   value={listing.min_investment_display}       accent="#12283C" />
                <MetricTile icon={Lock}       label="Lock-In"      value={listing.lock_in_display}              accent="#5C6B73" />
              </div>

              {/* Interactive Yield Estimator */}
              <InvestmentYieldCalculator
                minAmount={listing.min_investment_amount}
                roiPct={parseFloat(listing.expected_roi_percentage)}
                yieldPct={parseFloat(listing.projected_rental_yield)}
              />

              {/* Additional details */}
              <div className="glass-card p-5">
                <h2 className="font-serif text-lg font-semibold text-[#12283C] mb-4">Offering Details</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {[
                    { label: 'Payout Frequency', value: listing.payout_frequency, icon: Calendar },
                    { label: 'Asset Class',       value: listing.asset_class,       icon: Building2 },
                    { label: 'Property Type',     value: prop?.property_type || '—', icon: Building2 },
                    { label: 'Total Units',       value: listing.total_fractional_units ? listing.total_fractional_units.toLocaleString() : 'TBD', icon: Users },
                  ].map(row => (
                    <div key={row.label} className="flex items-start gap-3">
                      <row.icon className="w-4 h-4 text-[#B98B4E] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#5C6B73]">{row.label}</p>
                        <p className="font-semibold text-[#12283C] mt-0.5">{row.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Disclaimer — Prominent, not buried */}
              <div
                id="disclaimer-block"
                className="rounded-2xl p-5"
                style={{
                  background: 'rgba(185,139,78,0.06)',
                  borderLeft: '4px solid #B98B4E',
                  border: '1px solid rgba(185,139,78,0.2)',
                  borderLeftWidth: '4px',
                }}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-[#B98B4E] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-[#B98B4E] mb-2">
                      Important Disclaimer
                    </p>
                    <p className="text-sm text-[#12283C]/80 leading-relaxed">
                      {listing.disclaimer_text}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: Sticky CTA Panel */}
            <div className="lg:w-80 flex-shrink-0">
              <div className="glass-card-dark p-6 lg:sticky lg:top-28 rounded-2xl">
                <h2 className="font-serif text-xl font-semibold text-white mb-1">Interested?</h2>
                <p className="text-white/60 text-sm mb-5">
                  Connect with our investment team. No funds are committed at this stage.
                </p>

                {/* ROI highlight */}
                <div className="bg-white/05 border border-white/10 rounded-xl p-4 mb-5">
                  <p className="text-[10px] text-white/50 uppercase tracking-widest mb-1">Expected Annual ROI</p>
                  <p className="data-mono text-3xl font-bold text-[#B98B4E]">{listing.expected_roi_percentage}%</p>
                  <p className="text-xs text-white/40 mt-1">Rental yield: {listing.projected_rental_yield}%</p>
                </div>

                <div className="space-y-3">
                  <button
                    id="express-interest-btn"
                    className="btn-brass w-full justify-center"
                    onClick={() => openModal(false)}
                  >
                    <TrendingUp className="w-4 h-4" />
                    Express Interest
                  </button>
                  <button
                    id="request-pitch-deck-btn"
                    className="btn-secondary w-full justify-center text-white border-white/20 hover:bg-white/10"
                    style={{ background: 'rgba(255,255,255,0.08)' }}
                    onClick={() => openModal(true)}
                  >
                    <FileText className="w-4 h-4" />
                    Request Pitch Deck
                  </button>
                </div>

                <div className="mt-5 pt-4 border-t border-white/10">
                  <p className="text-[10px] text-white/30 text-center leading-relaxed">
                    Min. ticket: <span className="text-white/50 font-semibold">{listing.min_investment_display}</span> · 
                    Lock-in: <span className="text-white/50 font-semibold">{listing.lock_in_display}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {modalOpen && (
        <InvestmentInquiryModal
          listing={listing}
          requestingPitchDeck={pitchDeck}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
};

export default InvestmentDetail;
