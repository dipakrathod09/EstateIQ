import React from 'react';
import { TrendingDown, CheckCircle, AlertTriangle, Sparkles } from 'lucide-react';

const DealBadge = ({ dealTag }) => {
  if (!dealTag) return null;

  const tag = dealTag.toLowerCase();

  if (tag.includes('good') || tag.includes('undervalued')) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#1F7A6C]/15 text-[#155E52] border border-[#1F7A6C]/30 backdrop-blur-md shadow-sm">
        <TrendingDown className="w-3.5 h-3.5 text-[#1F7A6C]" /> Good Deal (Undervalued)
      </span>
    );
  }

  if (tag.includes('overpriced')) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E2574C]/15 text-[#B9382E] border border-[#E2574C]/30 backdrop-blur-md shadow-sm">
        <AlertTriangle className="w-3.5 h-3.5 text-[#E2574C]" /> Overpriced Market
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#12283C]/10 text-[#12283C] border border-[#12283C]/20 backdrop-blur-md shadow-sm">
      <CheckCircle className="w-3.5 h-3.5 text-[#12283C]" /> Fair Market Price
    </span>
  );
};

export default DealBadge;
