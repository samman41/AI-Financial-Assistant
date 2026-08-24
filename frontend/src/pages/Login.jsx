import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building, Lock, Mail, Loader2 } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isExpired = searchParams.get('expired') === 'true';

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError("Please input your email and password."); return; }
    setIsLoading(true);
    setError('');
    const res = await login(email, password);
    if (res.success) {
      navigate('/');
    } else {
      setError(res.error || "Invalid email or password.");
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden" style={{ backgroundColor: '#000000' }}>

      {/* Baby Blue decorative glow spheres */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[120px] animate-pulse" style={{ backgroundColor: 'rgba(137,207,240,0.12)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-[100px] animate-pulse" style={{ backgroundColor: 'rgba(26,135,192,0.08)', animationDelay: '2s' }} />

      <div className="relative w-full max-w-md backdrop-blur-xl rounded-2xl shadow-premium p-8 animate-fade-in z-10"
        style={{ backgroundColor: 'rgba(0,0,0,0.80)', border: '1px solid rgba(137,207,240,0.15)' }}>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-xl text-black shadow-premium-blue mb-3" style={{ backgroundColor: '#89cff0' }}>
            <Building size={24} />
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Financial Assistant</h2>
          <p className="text-sm mt-1.5" style={{ color: '#5ab8e8' }}>AI Financial Assistant for SMBs</p>
        </div>

        {isExpired && (
          <div className="mb-4 p-3 rounded-xl text-xs text-center font-medium" style={{ backgroundColor: 'rgba(9,60,94,0.4)', color: '#89cff0', border: '1px solid rgba(15,84,128,0.5)' }}>
            Your login session has expired. Please sign in again.
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-rose-950/20 text-rose-400 border border-rose-900/40 rounded-xl text-xs text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-xs font-semibold uppercase mb-1.5" style={{ color: '#5ab8e8' }}>Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3" size={16} style={{ color: '#2fa1da' }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
                className="w-full rounded-xl pl-11 pr-4 py-2.5 text-white text-sm transition-all outline-none"
                style={{ backgroundColor: '#0d0d0d', border: '1px solid #0f5480' }}
                onFocus={e => e.target.style.boxShadow = '0 0 0 2px #89cff0'}
                onBlur={e => e.target.style.boxShadow = 'none'}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-semibold uppercase" style={{ color: '#5ab8e8' }}>Password</label>
              <Link to="/forgot-password" className="text-xs font-bold transition-colors" style={{ color: '#89cff0' }}>Forgot?</Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3" size={16} style={{ color: '#2fa1da' }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full rounded-xl pl-11 pr-4 py-2.5 text-white text-sm transition-all outline-none"
                style={{ backgroundColor: '#0d0d0d', border: '1px solid #0f5480' }}
                onFocus={e => e.target.style.boxShadow = '0 0 0 2px #89cff0'}
                onBlur={e => e.target.style.boxShadow = 'none'}
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 font-bold rounded-xl text-sm transition-all shadow-premium-blue flex justify-center items-center disabled:opacity-50"
            style={{ backgroundColor: '#1a87c0', color: '#ffffff' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#2fa1da'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#1a87c0'}
          >
            {isLoading ? (
              <><Loader2 size={16} className="animate-spin mr-2" />Signing In...</>
            ) : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 text-center text-xs" style={{ color: '#2fa1da' }}>
          New to the platform?{' '}
          <Link to="/register" className="font-bold hover:underline" style={{ color: '#89cff0' }}>
            Create an Account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
