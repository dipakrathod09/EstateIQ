import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2, Search, Cpu, LayoutDashboard, LogIn, LogOut, TrendingUp, Menu, X } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path) => location.pathname === path;
  const closeMobile = () => setMobileOpen(false);

  const navLinks = [
    { to: '/', label: 'Home', exact: true },
    { to: '/properties', label: 'Search Properties', icon: <Search className="w-4 h-4 text-[#B98B4E]" /> },
    { to: '/valuation', label: 'AI Predictor', icon: <Cpu className="w-4 h-4 text-[#1F7A6C]" /> },
    { to: '/investments', label: 'Investments', icon: <TrendingUp className="w-4 h-4 text-[#B98B4E]" />, startsWith: true },
    { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  ];

  const isLinkActive = (link) => {
    if (link.startsWith) return location.pathname.startsWith(link.to);
    return location.pathname === link.to;
  };

  return (
    <header className="sticky top-0 z-50 bg-[#12283C]/95 backdrop-blur-md border-b border-white/10 text-[#F7F5F0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group" onClick={closeMobile}>
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

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                isLinkActive(link)
                  ? 'bg-white/10 text-white font-semibold shadow-inner'
                  : 'text-[#F7F5F0]/80 hover:text-white hover:bg-white/5'
              }`}
            >
              {link.icon}
              {link.label}
              {link.label === 'Dashboard' && user?.role && (
                <span className="text-[10px] bg-black/30 px-2 py-0.5 rounded-full capitalize">{user.role}</span>
              )}
            </Link>
          ))}
        </nav>

        {/* Right: User Auth + Mobile Hamburger */}
        <div className="flex items-center gap-3">
          {/* Desktop Auth */}
          <div className="hidden md:flex items-center gap-3">
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

          {/* Mobile Hamburger Button */}
          <button
            className="md:hidden p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#12283C]/98 backdrop-blur-md px-4 pb-4 pt-2">
          <nav className="flex flex-col gap-1 mb-4">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={closeMobile}
                className={`px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-3 ${
                  isLinkActive(link)
                    ? 'bg-white/10 text-white font-semibold'
                    : 'text-[#F7F5F0]/80 hover:text-white hover:bg-white/5'
                }`}
              >
                {link.icon}
                {link.label}
                {link.label === 'Dashboard' && user?.role && (
                  <span className="ml-auto text-[10px] bg-black/30 px-2 py-0.5 rounded-full capitalize">{user.role}</span>
                )}
              </Link>
            ))}
          </nav>

          {/* Mobile Auth Section */}
          <div className="border-t border-white/10 pt-3">
            {user ? (
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold text-white block">{user.first_name || user.username}</span>
                  <span className="text-[11px] text-[#B98B4E] uppercase font-bold tracking-wider">{user.role}</span>
                </div>
                <button
                  onClick={() => { logout(); closeMobile(); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-sm font-medium transition-all"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  to="/login"
                  onClick={closeMobile}
                  className="text-center px-4 py-2.5 rounded-xl text-sm font-medium text-white border border-white/10 hover:bg-white/5 transition-all"
                >
                  <LogIn className="w-4 h-4 inline mr-2" />Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={closeMobile}
                  className="text-center px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#B98B4E] hover:bg-[#9D743E] text-white transition-all"
                >
                  Get Started — It's Free
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
