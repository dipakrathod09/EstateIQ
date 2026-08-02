import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, TrendingUp, Percent, Lock, Banknote, AlertTriangle } from 'lucide-react';

const ASSET_CLASS_CONFIG = {
  'Commercial Office': { color: '#1F7A6C', bg: 'rgba(31,122,108,0.12)', border: 'rgba(31,122,108,0.3)', icon: '🏢' },
  'Warehousing':        { color: '#5C6B73', bg: 'rgba(92,107,115,0.12)', border: 'rgba(92,107,115,0.3)', icon: '🏭' },
  'Pre-Launch Residential': { color: '#B98B4E', bg: 'rgba(185,139,78,0.12)', border: 'rgba(185,139,78,0.3)', icon: '🏗️' },
  'Retail':             { color: '#12283C', bg: 'rgba(18,40,60,0.10)', border: 'rgba(18,40,60,0.25)', icon: '🏪' },
};

function useCountdown(targetIso) {
  const [timeLeft, setTimeLeft] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!targetIso) return;
    const target = new Date(targetIso).getTime();

    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
        clearInterval(timerRef.current);
        return;
      }
      const days    = Math.floor(diff / 86400000);
      const hours   = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft({ days, hours, minutes, seconds, expired: false });
    };

    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, [targetIso]);

  return timeLeft;
}

const InvestmentCard = ({ listing }) => {
  const config = ASSET_CLASS_CONFIG[listing.asset_class] || ASSET_CLASS_CONFIG['Retail'];
  const countdown = useCountdown(listing.is_pre_launch ? listing.early_access_ends_at : null);

  const defaultImage = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80';
  const image = listing.property_details?.images?.[0]
    || listing.property_details?.gallery?.[0]?.image
    || defaultImage;

  return (
    <Link to={`/investments/${listing.id}`} className="block group">
      <div className="glass-card overflow-hidden flex flex-col h-full hover:shadow-2xl transition-all duration-300">

        {/* Image Header */}
        <div className="relative aspect-[16/9] overflow-hidden bg-[#12283C]">
          <img
            src={image}
            alt={listing.property_details?.title || listing.asset_class}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={e => { e.target.src = defaultImage; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#12283C]/80 via-[#12283C]/20 to-transparent" />

          {/* Asset Class Badge */}
          <div className="absolute top-3 left-3 z-10">
            <span className="text-xs font-bold px-2.5 py-1.5 rounded-xl backdrop-blur-md flex items-center gap-1.5"
              style={{ background: config.bg, color: config.color, border: `1px solid ${config.border}` }}>
              {config.icon} {listing.asset_class}
            </span>
          </div>

          {/* Pre-launch badge + countdown */}
          {listing.is_pre_launch && (
            <div className="absolute top-3 right-3 z-10">
              <div className="bg-[#E2574C]/90 backdrop-blur-md text-white px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                {countdown && !countdown.expired ? (
                  <span className="font-mono tabular-nums">
                    {countdown.days > 0 && `${countdown.days}d `}
                    {String(countdown.hours).padStart(2,'0')}:{String(countdown.minutes).padStart(2,'0')}:{String(countdown.seconds).padStart(2,'0')}
                  </span>
                ) : (
                  <span>Pre-Launch</span>
                )}
              </div>
            </div>
          )}



          {/* Location */}
          <div className="absolute bottom-3 left-3 z-10 text-white text-xs font-medium">
            {listing.property_details?.city && (
              <span className="bg-black/50 backdrop-blur-sm px-2 py-1 rounded-md">
                📍 {listing.property_details.city}
              </span>
            )}
          </div>

          {/* Payout frequency pill */}
          <div className="absolute bottom-3 right-3 z-10">
            <span className="bg-[#B98B4E]/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">
              {listing.payout_frequency} Payouts
            </span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-5 flex-1 flex flex-col">
          <h3 className="font-serif text-lg font-semibold text-[#12283C] line-clamp-1 group-hover:text-[#B98B4E] transition-colors mb-1">
            {listing.property_details?.title || 'Investment Opportunity'}
          </h3>
          <p className="text-xs text-[#5C6B73] mb-4">
            {listing.property_details?.locality && `${listing.property_details.locality}, `}
            {listing.property_details?.city}
          </p>

          {/* 4 Metrics Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-[#F7F5F0] rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-[#1F7A6C]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#5C6B73]">Exp. ROI</span>
              </div>
              <span className="data-mono text-xl font-bold text-[#1F7A6C]">{listing.expected_roi_percentage}%</span>
            </div>
            <div className="bg-[#F7F5F0] rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Percent className="w-3.5 h-3.5 text-[#B98B4E]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#5C6B73]">Rental Yield</span>
              </div>
              <span className="data-mono text-xl font-bold text-[#12283C]">{listing.projected_rental_yield}%</span>
            </div>
            <div className="bg-[#F7F5F0] rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Banknote className="w-3.5 h-3.5 text-[#12283C]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#5C6B73]">Min Ticket</span>
              </div>
              <span className="data-mono text-base font-bold text-[#12283C]">{listing.min_investment_display}</span>
            </div>
            <div className="bg-[#F7F5F0] rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Lock className="w-3.5 h-3.5 text-[#5C6B73]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#5C6B73]">Lock-In</span>
              </div>
              <span className="data-mono text-base font-bold text-[#12283C]">{listing.lock_in_display}</span>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-auto flex items-center justify-between pt-3 border-t border-[#12283C]/08">
            <span className="text-xs text-[#5C6B73] font-medium">View opportunity →</span>
            <div className="w-9 h-9 rounded-xl bg-[#12283C] group-hover:bg-[#B98B4E] text-white flex items-center justify-center transition-colors shadow-md">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default InvestmentCard;
