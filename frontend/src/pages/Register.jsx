import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building, Lock, Mail, User, Percent, DollarSign, Loader2 } from 'lucide-react';

const CURRENCIES = [
  { code: 'USD', symbol: '$',  label: 'USD ($)' },
  { code: 'EUR', symbol: '€',  label: 'EUR (€)' },
  { code: 'GBP', symbol: '£',  label: 'GBP (£)' },
  { code: 'CAD', symbol: 'C$', label: 'CAD (C$)' },
  { code: 'AUD', symbol: 'A$', label: 'AUD (A$)' },
];

const inputStyle = {
  backgroundColor: '#0d0d0d',
  border: '1px solid #0f5480',
  color: '#ffffff',
  borderRadius: '0.75rem',
  paddingLeft: '2.75rem',
  paddingRight: '1rem',
  paddingTop: '0.625rem',
  paddingBottom: '0.625rem',
  fontSize: '0.875rem',
  width: '100%',
  outline: 'none',
  transition: 'all 0.15s',
};

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '', password: '', fullName: '', companyName: '', currency: 'USD', taxRate: '0'
  });
  const [error, setError]       = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password || !formData.fullName || !formData.companyName) {
      setError("Please fill out all required fields.");
      return;
    }
    setIsLoading(true);
    setError('');
    const res = await register(formData.email, formData.password, formData.fullName, formData.companyName, formData.currency, formData.taxRate);
    if (res.success) {
      navigate('/');
    } else {
      setError(res.error || "Failed to create your account.");
      setIsLoading(false);
    }
  };

  const iconStyle = { color: '#2fa1da' };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12 overflow-hidden" style={{ backgroundColor: '#000000' }}>

      {/* Baby Blue glow spheres */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[120px] animate-pulse" style={{ backgroundColor: 'rgba(137,207,240,0.12)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-[100px] animate-pulse" style={{ backgroundColor: 'rgba(26,135,192,0.08)', animationDelay: '2s' }} />

      <div className="relative w-full max-w-lg backdrop-blur-xl rounded-2xl shadow-premium p-8 animate-fade-in z-10"
        style={{ backgroundColor: 'rgba(0,0,0,0.80)', border: '1px solid rgba(137,207,240,0.15)' }}>

        {/* Title */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-xl text-black shadow-premium-blue mb-3" style={{ backgroundColor: '#89cff0' }}>
            <Building size={24} />
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Create Account</h2>
          <p className="text-sm mt-1.5" style={{ color: '#5ab8e8' }}>Sign up your business in minutes</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-950/20 text-rose-400 border border-rose-900/40 rounded-xl text-xs text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold uppercase mb-1.5" style={{ color: '#5ab8e8' }}>Full Name *</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3" size={16} style={iconStyle} />
                <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required placeholder="John Doe" style={inputStyle}
                  onFocus={e => e.target.style.boxShadow = '0 0 0 2px #89cff0'}
                  onBlur={e => e.target.style.boxShadow = 'none'} />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold uppercase mb-1.5" style={{ color: '#5ab8e8' }}>Email Address *</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3" size={16} style={iconStyle} />
                <input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="john@company.com" style={inputStyle}
                  onFocus={e => e.target.style.boxShadow = '0 0 0 2px #89cff0'}
                  onBlur={e => e.target.style.boxShadow = 'none'} />
              </div>
            </div>

            {/* Company Name */}
            <div>
              <label className="block text-xs font-semibold uppercase mb-1.5" style={{ color: '#5ab8e8' }}>Company Name *</label>
              <div className="relative">
                <Building className="absolute left-3.5 top-3" size={16} style={iconStyle} />
                <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} required placeholder="Acme Corporation" style={inputStyle}
                  onFocus={e => e.target.style.boxShadow = '0 0 0 2px #89cff0'}
                  onBlur={e => e.target.style.boxShadow = 'none'} />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold uppercase mb-1.5" style={{ color: '#5ab8e8' }}>Password *</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3" size={16} style={iconStyle} />
                <input type="password" name="password" value={formData.password} onChange={handleChange} required placeholder="Min 6 characters" style={inputStyle}
                  onFocus={e => e.target.style.boxShadow = '0 0 0 2px #89cff0'}
                  onBlur={e => e.target.style.boxShadow = 'none'} />
              </div>
            </div>

            {/* Currency */}
            <div>
              <label className="block text-xs font-semibold uppercase mb-1.5" style={{ color: '#5ab8e8' }}>Reporting Currency</label>
              <div className="relative">
                <DollarSign className="absolute left-3.5 top-3" size={16} style={iconStyle} />
                <select name="currency" value={formData.currency} onChange={handleChange} style={{ ...inputStyle, appearance: 'none' }}
                  onFocus={e => e.target.style.boxShadow = '0 0 0 2px #89cff0'}
                  onBlur={e => e.target.style.boxShadow = 'none'}>
                  {CURRENCIES.map(cur => <option key={cur.code} value={cur.code}>{cur.label}</option>)}
                </select>
              </div>
            </div>

            {/* Tax Rate */}
            <div>
              <label className="block text-xs font-semibold uppercase mb-1.5" style={{ color: '#5ab8e8' }}>Corporate Tax Rate (%)</label>
              <div className="relative">
                <Percent className="absolute left-3.5 top-3" size={16} style={iconStyle} />
                <input type="number" name="taxRate" value={formData.taxRate} onChange={handleChange} placeholder="0.0" min="0" max="100" style={inputStyle}
                  onFocus={e => e.target.style.boxShadow = '0 0 0 2px #89cff0'}
                  onBlur={e => e.target.style.boxShadow = 'none'} />
              </div>
            </div>

          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-4 py-2.5 font-bold rounded-xl text-sm transition-all shadow-premium-blue flex justify-center items-center disabled:opacity-50"
            style={{ backgroundColor: '#1a87c0', color: '#ffffff' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#2fa1da'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#1a87c0'}
          >
            {isLoading ? (
              <><Loader2 size={16} className="animate-spin mr-2" />Registering...</>
            ) : 'Register Account'}
          </button>
        </form>

        <div className="mt-8 text-center text-xs" style={{ color: '#2fa1da' }}>
          Already registered?{' '}
          <Link to="/login" className="font-bold hover:underline" style={{ color: '#89cff0' }}>
            Sign In Here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
