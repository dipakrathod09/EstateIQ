import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2, LogIn, Sparkles, UserCheck } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setError('Please enter your username.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      await login(cleanUsername, password);
      navigate('/dashboard');
    } catch (err) {
      console.error('Login failed', err);
      setError(err.response?.data?.detail || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (demoUsername) => {
    setError(null);
    setLoading(true);
    try {
      await login(demoUsername, 'password123');
      navigate('/dashboard');
    } catch (err) {
      console.error('Demo login failed', err);
      setError('Demo login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#F7F5F0] min-h-screen py-16 flex items-center justify-center px-4">
      <div className="max-w-md w-full glass-card p-8 bg-white border border-[#12283C]/10 rounded-3xl shadow-xl">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-[#12283C] text-white flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Building2 className="w-6 h-6 text-[#B98B4E]" />
          </div>
          <h2 className="font-serif text-3xl font-semibold text-[#12283C]">Welcome Back</h2>
          <p className="text-xs text-[#5C6B73] mt-1">Sign in to your EstateIQ account</p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 text-xs font-semibold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="form-label">Username</label>
            <input
              type="text"
              placeholder="e.g. agent_rohit"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="form-input text-sm"
              required
            />
          </div>

          <div>
            <label className="form-label">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input text-sm"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full justify-center py-3 text-sm rounded-xl"
          >
            <LogIn className="w-4 h-4" /> {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        {/* Quick Demo Persona Section */}
        <div className="mt-8 pt-6 border-t border-[#12283C]/10 text-center">
          <span className="text-[11px] uppercase font-bold text-[#5C6B73] tracking-wider block mb-3">
            1-Click Demo Persona Login
          </span>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleQuickDemo('agent_rohit')}
              className="btn-secondary py-2 text-xs justify-center"
            >
              Agent Rohit
            </button>
            <button
              onClick={() => handleQuickDemo('landlord_ananya')}
              className="btn-secondary py-2 text-xs justify-center"
            >
              Landlord Ananya
            </button>
            <button
              onClick={() => handleQuickDemo('tenant_vikram')}
              className="btn-secondary py-2 text-xs justify-center"
            >
              Tenant Vikram
            </button>
            <button
              onClick={() => handleQuickDemo('investor_prior')}
              className="btn-secondary py-2 text-xs justify-center"
            >
              Investor Priya
            </button>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-[#5C6B73]">
          Don't have an account?{' '}
          <Link to="/register" className="text-[#B98B4E] font-bold hover:underline">
            Register Account
          </Link>
        </div>

      </div>
    </div>
  );
};

export default Login;
