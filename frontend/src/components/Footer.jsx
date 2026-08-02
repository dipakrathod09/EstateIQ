import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, ShieldCheck, Cpu, ArrowUpRight } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-[#12283C] text-[#F7F5F0] border-t border-white/10 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          
          {/* Brand Info */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-[#B98B4E] flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <span className="font-serif text-2xl font-semibold text-white">EstateIQ</span>
            </Link>
            <p className="text-sm text-[#5C6B73] leading-relaxed mb-4">
              Mumbai's AI property portal for verified home listings, fair market valuations, and real estate investments.
            </p>
            <div className="inline-flex items-center gap-2 text-xs font-mono text-[#1F7A6C] bg-[#1F7A6C]/10 border border-[#1F7A6C]/30 px-3 py-1.5 rounded-full">
              <Cpu className="w-3.5 h-3.5" /> AI Valuation Engine Active
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-serif text-lg font-semibold text-white mb-4">Explore Platform</h4>
            <ul className="space-y-2.5 text-sm text-[#F7F5F0]/70">
              <li><Link to="/properties" className="hover:text-[#B98B4E] transition-colors">Property Listings</Link></li>
              <li><Link to="/properties?deal_tag=Good Deal" className="hover:text-[#B98B4E] transition-colors">Good Value Investments</Link></li>
              <li><Link to="/valuation" className="hover:text-[#B98B4E] transition-colors">AI Valuation Calculator</Link></li>
              <li><Link to="/dashboard" className="hover:text-[#B98B4E] transition-colors">Owner & Agent Portal</Link></li>
            </ul>
          </div>

          {/* Markets Covered */}
          <div>
            <h4 className="font-serif text-lg font-semibold text-white mb-4">Popular Areas</h4>
            <ul className="space-y-2.5 text-sm text-[#F7F5F0]/70">
              <li><Link to="/properties?city=Mumbai&locality=Bandra" className="hover:text-[#B98B4E] transition-colors">Bandra & Khar</Link></li>
              <li><Link to="/properties?city=Mumbai&locality=Worli" className="hover:text-[#B98B4E] transition-colors">Worli & Lower Parel</Link></li>
              <li><Link to="/properties?city=Mumbai&locality=Powai" className="hover:text-[#B98B4E] transition-colors">Powai & Hiranandani</Link></li>
              <li><Link to="/properties?city=Mumbai&locality=Andheri" className="hover:text-[#B98B4E] transition-colors">Andheri & Versova</Link></li>
              <li><Link to="/properties?city=Mumbai&locality=Thane" className="hover:text-[#B98B4E] transition-colors">Thane & Navi Mumbai</Link></li>
            </ul>
          </div>

          {/* Intelligence & RERA */}
          <div>
            <h4 className="font-serif text-lg font-semibold text-white mb-4">Market Intelligence</h4>
            <p className="text-sm text-[#5C6B73] leading-relaxed mb-4">
              Smart valuation engine evaluating location, property size, building age, and neighborhood amenities across Mumbai.
            </p>
            <div className="flex items-center gap-2 text-xs text-[#B98B4E] font-semibold">
              <ShieldCheck className="w-4 h-4" /> 100% RERA Verified Listings
            </div>
          </div>

        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#5C6B73]">
          <p>© 2026 EstateIQ Technologies. All rights reserved.</p>
          <div className="flex gap-6">
            <span className="hover:text-white transition-colors cursor-pointer">Privacy Policy</span>
            <span className="hover:text-white transition-colors cursor-pointer">Terms of Service</span>
            <span className="hover:text-white transition-colors cursor-pointer">Valuation Methodology</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
