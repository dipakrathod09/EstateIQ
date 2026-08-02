import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, Search, Cpu, ArrowLeft, Building2 } from 'lucide-react';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[80vh] bg-[#F7F5F0] flex items-center justify-center px-4 py-20">
      <div className="max-w-2xl w-full text-center">
        
        {/* Decorative 404 */}
        <div className="relative mb-8">
          <div className="text-[180px] font-serif font-bold text-[#12283C]/05 leading-none select-none">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#B98B4E] to-[#1F7A6C] flex items-center justify-center shadow-2xl shadow-[#B98B4E]/30">
              <Building2 className="w-12 h-12 text-white" />
            </div>
          </div>
        </div>

        {/* Message */}
        <div className="mb-2 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#E2574C]/10 text-[#E2574C] border border-[#E2574C]/20">
          Page Not Found
        </div>

        <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-[#12283C] mt-4 mb-4">
          This page doesn't exist.
        </h1>

        <p className="text-[#5C6B73] text-base leading-relaxed mb-10 max-w-md mx-auto">
          The URL you visited doesn't match any page in EstateIQ. 
          It may have been moved, deleted, or you may have followed a broken link.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
          <button
            onClick={() => navigate(-1)}
            className="btn-secondary flex items-center gap-2 px-6 py-3 text-sm font-semibold"
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>

          <Link
            to="/"
            className="btn-primary flex items-center gap-2 px-6 py-3 text-sm font-semibold"
          >
            <Home className="w-4 h-4" /> Back to Home
          </Link>
        </div>

        {/* Quick Links */}
        <div className="glass-card bg-white border border-[#12283C]/10 rounded-2xl p-6 max-w-md mx-auto">
          <p className="text-xs font-bold text-[#5C6B73] uppercase tracking-wider mb-4">
            Popular Destinations
          </p>
          <div className="grid grid-cols-3 gap-3">
            <Link
              to="/properties"
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-[#F7F5F0] hover:bg-[#B98B4E]/10 text-[#12283C] hover:text-[#B98B4E] transition-all text-xs font-semibold"
            >
              <Search className="w-5 h-5" />
              Search
            </Link>
            <Link
              to="/valuation"
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-[#F7F5F0] hover:bg-[#1F7A6C]/10 text-[#12283C] hover:text-[#1F7A6C] transition-all text-xs font-semibold"
            >
              <Cpu className="w-5 h-5" />
              AI Valuation
            </Link>
            <Link
              to="/dashboard"
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-[#F7F5F0] hover:bg-[#B98B4E]/10 text-[#12283C] hover:text-[#B98B4E] transition-all text-xs font-semibold"
            >
              <Building2 className="w-5 h-5" />
              Dashboard
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default NotFound;
