import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2, Search, Cpu, LayoutDashboard, LogIn, LogOut, User, TrendingUp } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-[#12283C]/95 backdrop-blur-md border-b border-white/10 text-[#F7F5F0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#B98B4E] to-[#1F7A6C] flex items-center justify-center shadow-lg shadow-[#B98B4E]/20 group-hover:scale-105 transition-transform">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-serif text-2xl font-semibold tracking-tight text-white flex items-center gap-1">
              EstateIQ <span className="w-2 h-2 rounded-full bg-[#B98B4E] inline-block"></span>
            </span>
            <span className="text-[10px] uppercase tracking-widest text-[#B98B4E] font-sans font-bold block -mt-1">
              AI Market Valuation
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          <Link
            to="/"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              isActive('/') 
                ? 'bg-white/10 text-white font-semibold shadow-inner' 
                : 'text-[#F7F5F0]/80 hover:text-white hover:bg-white/5'
            }`}
          >
            Home
          </Link>

          <Link
            to="/properties"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              isActive('/properties') 
                ? 'bg-white/10 text-white font-semibold shadow-inner' 
                : 'text-[#F7F5F0]/80 hover:text-white hover:bg-white/5'
            }`}
          >
            <Search className="w-4 h-4 text-[#B98B4E]" />
            Search Properties
          </Link>

          <Link
            to="/valuation"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              isActive('/valuation') 
                ? 'bg-white/10 text-white font-semibold shadow-inner' 
                : 'text-[#F7F5F0]/80 hover:text-white hover:bg-white/5'
            }`}
          >
            <Cpu className="w-4 h-4 text-[#1F7A6C]" />
            AI Predictor
          </Link>

          <Link
            to="/investments"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              location.pathname.startsWith('/investments')
                ? 'bg-white/10 text-white font-semibold shadow-inner'
                : 'text-[#F7F5F0]/80 hover:text-white hover:bg-white/5'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-[#B98B4E]" />
            Investments
          </Link>

          <Link
            to="/dashboard"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              isActive('/dashboard') 
                ? 'bg-[#B98B4E] text-white font-semibold shadow-md' 
                : 'text-[#F7F5F0]/80 hover:text-white hover:bg-white/5'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard {user?.role && <span className="text-[10px] bg-black/30 px-2 py-0.5 rounded-full capitalize">{user.role}</span>}
          </Link>
        </nav>

        {/* User Auth Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-sm font-semibold text-white">{user.first_name || user.username}</span>
                <span className="text-[11px] text-[#B98B4E] uppercase font-bold tracking-wider">{user.role}</span>
              </div>
              <button
                onClick={logout}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-white/80 hover:text-red-400 border border-white/10 transition-all"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-white hover:text-[#B98B4E] transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 text-sm font-semibold bg-[#B98B4E] hover:bg-[#9D743E] text-white rounded-xl shadow-md transition-all"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};

export default Navbar;
