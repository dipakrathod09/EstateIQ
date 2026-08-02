import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2, UserPlus, Sparkles } from 'lucide-react';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'agent',
    phone_number: '',
    company_name: ''
  });

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    if (!formData.username.trim() || formData.username.trim().length < 3) {
      return 'Username must be at least 3 characters long.';
    }
    if (!/^[a-zA-Z0-9_]+$/.test(formData.username.trim())) {
      return 'Username can only contain letters, numbers, and underscores.';
    }
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      return 'Please enter a valid email address.';
    }
    if (!formData.password || formData.password.length < 6) {
      return 'Password must be at least 6 characters long.';
    }
    if (formData.phone_number.trim() && !/^\+?[\d\s\-()]{10,15}$/.test(formData.phone_number.trim())) {
      return 'Please enter a valid phone number (10 to 15 digits).';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      await register({
        ...formData,
        username: formData.username.trim(),
        email: formData.email.trim().toLowerCase(),
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        phone_number: formData.phone_number.trim(),
        company_name: formData.company_name.trim()
      });
      navigate('/onboarding');
    } catch (err) {
      console.error('Registration failed', err);
      const data = err.response?.data;
      if (data && typeof data === 'object') {
        const firstKey = Object.keys(data)[0];
        const msg = Array.isArray(data[firstKey]) ? data[firstKey][0] : data[firstKey];
        setError(`${firstKey}: ${msg}`);
      } else {
        setError('Registration failed. Please check your details and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#F7F5F0] min-h-screen py-16 flex items-center justify-center px-4">
      <div className="max-w-xl w-full glass-card p-8 bg-white border border-[#12283C]/10 rounded-3xl shadow-xl">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-[#12283C] text-white flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Building2 className="w-6 h-6 text-[#B98B4E]" />
          </div>
          <h2 className="font-serif text-3xl font-semibold text-[#12283C]">Create EstateIQ Account</h2>
          <p className="text-xs text-[#5C6B73] mt-1">Join as an Agent, Landlord, Tenant, or Investor</p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 text-xs font-semibold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Username</label>
              <input
                type="text"
                placeholder="e.g. rohit_agent"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="form-input text-sm"
                required
              />
            </div>

            <div>
              <label className="form-label">Email Address</label>
              <input
                type="email"
                placeholder="name@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="form-input text-sm"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">First Name</label>
              <input
                type="text"
                placeholder="Rohit"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="form-input text-sm"
              />
            </div>

            <div>
              <label className="form-label">Last Name</label>
              <input
                type="text"
                placeholder="Sharma"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="form-input text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Select Account Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="form-select text-sm font-semibold text-[#12283C]"
              >
                <option value="agent">Agent</option>
                <option value="landlord">Landlord</option>
                <option value="tenant">Tenant</option>
                <option value="investor">Investor</option>
              </select>
            </div>

            <div>
              <label className="form-label">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="form-input text-sm"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Phone Number</label>
              <input
                type="tel"
                placeholder="+91 98765 43210"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                className="form-input text-sm"
              />
            </div>

            <div>
              <label className="form-label">Company Name (Optional)</label>
              <input
                type="text"
                placeholder="Apex Realty Solutions"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="form-input text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-brass w-full justify-center py-3.5 text-sm rounded-xl mt-4"
          >
            <UserPlus className="w-4 h-4" /> {loading ? 'Registering Account...' : 'Complete Registration'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-[#5C6B73]">
          Already have an account?{' '}
          <Link to="/login" className="text-[#B98B4E] font-bold hover:underline">
            Sign In Here
          </Link>
        </div>

      </div>
    </div>
  );
};

export default Register;
